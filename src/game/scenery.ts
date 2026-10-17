import {isActor} from '../scene/agents';
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Scene, SceneObject } from "../scene/schema";
import { hasAnimatedJoints,impactOf,zonesOf } from "../scene/object-dsl";
import type { ObjectPart } from "../scene/object-dsl";
import { archetypeOf } from "../sim/archetypes";
import { SpatialGrid } from "../sim/spatial";
import { buildObject } from "./world3d";
import { worldPosition } from "./environment";
import { sceneryMaterial, sceneryDepthMaterial, toonMaterial } from "./shaders";
import { objectPlacement } from "../scene/placement";


/** Bake parts sharing a material/motion into one draw, retaining each rigid animation pivot. */
export function batchPrototype(source: THREE.Group): THREE.Group {
  source.updateMatrixWorld(true);
  const group = new THREE.Group();
  const batches = new Map<string, { geometries: THREE.BufferGeometry[]; material: THREE.Material; motion: ObjectPart["animation"] }>();
  source.traverse(child=> {
    if (!(child instanceof THREE.Mesh)) return;
    const material = child.material as THREE.MeshToonMaterial, motion = child.userData.rest?.animation as ObjectPart["animation"];
    if (child.userData.materialStyle === "cloth") {
      const flag = child.clone(); flag.geometry = child.geometry.clone();
      child.matrixWorld.decompose(flag.position,flag.quaternion,flag.scale);
      const count = flag.geometry.getAttribute("position").count;
      flag.geometry.setAttribute("pivot", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
      flag.geometry.setAttribute("spinAxis", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
      group.add(flag); return;
    }
    const key = child.userData.materialKey ? JSON.stringify([child.userData.materialKey, motion]) : JSON.stringify([material.type, material.color?.getHex(), (material as unknown as THREE.MeshStandardMaterial).emissive?.getHex(), material.customProgramCacheKey(), motion]);
    const geometry = (child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()).applyMatrix4(child.matrixWorld), count = geometry.getAttribute("position").count;
    const pivot = new Float32Array(count * 3), axes = new Float32Array(count * 3);
    const axis = motion?.kind === "spin" ? new THREE.Vector3(Number(motion.axis === "x"), Number(motion.axis === "y"), Number(motion.axis === "z")) : new THREE.Vector3(0, 0, 1);
    const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();child.matrixWorld.decompose(position,rotation,scale);
    axis.applyQuaternion(rotation);
    for (let i = 0;i < count;i++) { position.toArray(pivot, i * 3); axis.toArray(axes, i * 3); }
    geometry.setAttribute("pivot", new THREE.BufferAttribute(pivot, 3)); geometry.setAttribute("spinAxis", new THREE.BufferAttribute(axes, 3));
    const batch = batches.get(key) ?? { geometries: [], material, motion }; batch.geometries.push(geometry); batches.set(key, batch);
  });
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries, false);
    if (!geometry) throw new Error("scenery parts could not be combined");
    const mesh = new THREE.Mesh(geometry, batch.material); mesh.userData.rest = { animation: batch.motion }; group.add(mesh);
    batch.geometries.forEach(g => g.dispose());
  }
  source.traverse(node => { if (node instanceof THREE.Mesh) node.geometry.dispose(); });
  return group;
}

type Fade = { attribute: THREE.InstancedBufferAttribute; index: number };
type Entry = { x: number; y: number; box: THREE.Box3; opacity: number; instances: Fade[] };

/** Static scenery is instanced by assembly and local tile. Only knockables need scene nodes. */
export class WorldScenery {
  readonly group = new THREE.Group();
  private grid: SpatialGrid<Entry>;
  private fading = new Set<Entry>();
  private ray = new THREE.Raycaster();
  obscuredCount = 0;
  readonly objectCount: number;

  constructor(scene: Scene) {
    const foundations=new Map<string,{color:string;items:{entry:Entry;matrix:THREE.Matrix4}[]}>();
    const entries: Entry[] = [], prototypes = new Map<string, THREE.Group>();
    const batches = new Map<string, { prototype: THREE.Group; items: { object: SceneObject; entry: Entry }[] }>();
    for (const object of scene.objects) {
      if(object.ambient || isActor(object) || impactOf(object.spec))continue;
      if (archetypeOf(object).interaction === "knockable") continue;
      const placement=objectPlacement(scene,object),live=hasAnimatedJoints(object.spec) || zonesOf(object.spec).length>0;
      if(live && (!placement.foundation || placement.base-placement.low<=.1)) continue;
      const key = JSON.stringify(object.spec ?? object.kind);
      let prototype = prototypes.get(key);
      if (!live && !prototype) { prototype = batchPrototype(buildObject({ ...object, scale: 1 })); prototype.updateMatrixWorld(true); prototypes.set(key, prototype); }
      const position = worldPosition(scene, object.x, object.y, 1.5);position.y=placement.base+1.5;
      const transform = new THREE.Matrix4().compose(position, placement.rotation, new THREE.Vector3().setScalar(object.scale));
      const entry: Entry = { x: position.x, y: position.z, box: prototype ? new THREE.Box3().setFromObject(prototype).applyMatrix4(transform) : new THREE.Box3(), opacity: 1, instances: [] };
      entries.push(entry);
      if(placement.foundation && placement.base-placement.low>.1){
        const {width,depth,color}=placement.foundation,height=placement.base-placement.low+4;
        const matrix=new THREE.Matrix4().compose(new THREE.Vector3(position.x,placement.low-2+height/2,position.z),new THREE.Quaternion(),new THREE.Vector3(width,height,depth));
        entry.box.union(new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(matrix));
        const key=`${color}:${Math.floor(object.x/800)},${Math.floor(object.y/800)}`;
        const batch=foundations.get(key)??{color,items:[]};batch.items.push({entry,matrix});foundations.set(key,batch);
      }
      if(!prototype) continue;
      const batchKey = `${key}:${Math.floor(object.x / 800)},${Math.floor(object.y / 800)}`;
      const batch = batches.get(batchKey) ?? { prototype, items: [] }; batch.items.push({ object, entry }); batches.set(batchKey, batch);
    }
    const materials = new Map<THREE.Mesh, THREE.Material>();
    const shadowMaterials=new Map<THREE.Mesh,THREE.MeshDepthMaterial>();
    for (const { prototype, items } of batches.values()) for (const child of prototype.children) {
      if (!(child instanceof THREE.Mesh)) continue;
      let material = materials.get(child);
      if (!material) { material = sceneryMaterial(child.material as THREE.Material, child.userData.rest?.animation as ObjectPart["animation"]); materials.set(child, material); }
      const geometry = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries((child.geometry as THREE.BufferGeometry).attributes)) geometry.setAttribute(name, attribute);
      geometry.setIndex(child.geometry.index);
      const visibility = new THREE.InstancedBufferAttribute(new Float32Array(items.length).fill(1), 1).setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("visibility", visibility);
      const mesh = new THREE.InstancedMesh(geometry, material, items.length), partTransform = new THREE.Matrix4().compose(child.position, child.quaternion, child.scale);
      items.forEach(({ object, entry }, i) => {
        const placement=objectPlacement(scene,object);
        const position=worldPosition(scene,object.x,object.y,1.5);position.y=placement.base+1.5;
        const matrix = new THREE.Matrix4().compose(position, placement.rotation, new THREE.Vector3().setScalar(object.scale));
        mesh.setMatrixAt(i, matrix.multiply(partTransform)); entry.instances.push({ attribute: visibility, index: i });
      });
      const motion=child.userData.rest?.animation as ObjectPart["animation"],cloth=child.userData.materialStyle === "cloth";
      if(motion?.kind === "sway" || motion?.kind === "spin" || cloth){
        let shadow=shadowMaterials.get(child);
        if(!shadow){shadow=sceneryDepthMaterial(motion,cloth);shadowMaterials.set(child,shadow);}
        mesh.customDepthMaterial=shadow;
      }
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); this.group.add(mesh);
    }
    for(const {color,items} of foundations.values()){
      const geometry=new THREE.BoxGeometry(1,1,1),count=geometry.getAttribute("position").count;
      geometry.setAttribute("pivot",new THREE.Float32BufferAttribute(new Float32Array(count*3),3));
      geometry.setAttribute("spinAxis",new THREE.Float32BufferAttribute(new Float32Array(count*3),3));
      const visibility=new THREE.InstancedBufferAttribute(new Float32Array(items.length).fill(1),1).setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("visibility",visibility);
      const mesh=new THREE.InstancedMesh(geometry,sceneryMaterial(toonMaterial(color)),items.length);
      mesh.name="terrain-foundations";
      items.forEach(({entry,matrix},i)=>{mesh.setMatrixAt(i,matrix);entry.instances.push({attribute:visibility,index:i});});
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.group.add(mesh);
    }
    this.grid = new SpatialGrid(entries); this.objectCount = entries.length;
  }

  update(camera: THREE.OrthographicCamera, player: THREE.Vector3, dt: number, snap = false): void {
    const screen = player.clone().project(camera);
    this.ray.setFromCamera(new THREE.Vector2(screen.x, screen.y), camera);
    const distance = this.ray.ray.origin.distanceTo(player) - 4, hit = new THREE.Vector3();
    const obscuring = new Set<Entry>();
    for (const entry of this.grid.query(player.x, player.z, 700)) {
      if (this.ray.ray.intersectBox(entry.box, hit) && hit.distanceTo(this.ray.ray.origin) < distance) {
        obscuring.add(entry); this.fading.add(entry);
      }
    }
    this.obscuredCount = obscuring.size;
    for (const entry of this.fading) {
      const target = obscuring.has(entry) ? .22 : 1;
      entry.opacity += (target - entry.opacity) * (snap ? 1 : 1 - Math.exp(-dt * 12));
      if (Math.abs(entry.opacity - target) < .002) entry.opacity = target;
      for (const instance of entry.instances) { instance.attribute.setX(instance.index, entry.opacity); instance.attribute.needsUpdate = true; }
      if (entry.opacity === 1) this.fading.delete(entry);
    }
  }
}
