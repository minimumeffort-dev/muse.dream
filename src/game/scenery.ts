import {occupiedInterior} from '../scene/interiors';
import {pooledImpact} from '../scene/damage-pool';
import {indexedGeometry} from './indexed-geometry';
import {isResidentActor} from '../scene/agents';
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
  const batches = new Map<string, { geometries: THREE.BufferGeometry[]; material: THREE.Material; motion: ObjectPart["animation"];cutaway?:string }>();
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
    const key = JSON.stringify([child.userData.cutaway,child.userData.materialKey ? JSON.stringify([child.userData.materialKey, motion]) : JSON.stringify([material.type, material.color?.getHex(), (material as unknown as THREE.MeshStandardMaterial).emissive?.getHex(), material.customProgramCacheKey(), motion])]);
    const geometry = (child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()).applyMatrix4(child.matrixWorld), count = geometry.getAttribute("position").count;
    const pivot = new Float32Array(count * 3), axes = new Float32Array(count * 3);
    const axis = motion?.kind === "spin" ? new THREE.Vector3(Number(motion.axis === "x"), Number(motion.axis === "y"), Number(motion.axis === "z")) : new THREE.Vector3(0, 0, 1);
    const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();child.matrixWorld.decompose(position,rotation,scale);
    axis.applyQuaternion(rotation);
    for (let i = 0;i < count;i++) { position.toArray(pivot, i * 3); axis.toArray(axes, i * 3); }
    geometry.setAttribute("pivot", new THREE.BufferAttribute(pivot, 3)); geometry.setAttribute("spinAxis", new THREE.BufferAttribute(axes, 3));
    const batch = batches.get(key) ?? { geometries: [], material, motion,cutaway:child.userData.cutaway as string|undefined }; batch.geometries.push(geometry); batches.set(key, batch);
  });
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries, false);
    if (!geometry) throw new Error("scenery parts could not be combined");
    const mesh = new THREE.Mesh(indexedGeometry(geometry), batch.material); mesh.userData.rest = { animation: batch.motion };mesh.userData.cutaway=batch.cutaway; group.add(mesh);
    batch.geometries.forEach(g => g.dispose());
  }
  source.traverse(node => { if (node instanceof THREE.Mesh) node.geometry.dispose(); });
  return group;
}

type Fade = { attribute: THREE.InstancedBufferAttribute; index: number;cutaway?:string };
type Entry = { id:number;objectId?:string;x: number; y: number; box: THREE.Box3; opacity: number; instances: Fade[];transforms:{mesh:THREE.InstancedMesh;index:number;original?:THREE.Matrix4}[];hidden?:boolean;growthScale?:number;growthPivot?:THREE.Vector3;originalBox?:THREE.Box3 };

/** Static scenery is instanced by assembly and local tile. Only knockables need scene nodes. */
export class WorldScenery {
  readonly group = new THREE.Group();
  private grid!: SpatialGrid<Entry>;
  private fading = new Set<Entry>();
  private ray = new THREE.Raycaster();
  obscuredCount = 0;
  private count=0;
  private entries:Entry[]=[];
  private hidden:ReadonlySet<string>|undefined;
  private growth:ReadonlyMap<string,number>|undefined;
  get objectCount():number{return this.count;}

  constructor(private scene: Scene,objects=scene.objects) {
    const foundations=new Map<string,{color:string;items:{entry:Entry;matrix:THREE.Matrix4}[]}>();
    const entries: Entry[] = [], prototypes = new Map<string, THREE.Group>();
    const batches = new Map<string, { prototype: THREE.Group; items: { object: SceneObject; entry: Entry }[] }>();
    for (const object of objects) {
      if(object.ambient || isResidentActor(object) || impactOf(object.spec) && !pooledImpact(scene,object))continue;
      if (archetypeOf(object).interaction === "knockable") continue;
      const placement=objectPlacement(scene,object),live=!object.parked && hasAnimatedJoints(object.spec) || zonesOf(object.spec).length>0;
      if(live && (!placement.foundation || placement.base-placement.low<=.1)) continue;
      const key = JSON.stringify(object.spec ?? object.kind);
      let prototype = prototypes.get(key);
      if (!live && !prototype) { prototype = batchPrototype(buildObject({ ...object, scale: 1 })); prototype.updateMatrixWorld(true); prototypes.set(key, prototype); }
      const position = worldPosition(scene, object.x, object.y, 1.5);position.y=placement.base+1.5;
      const transform = new THREE.Matrix4().compose(position, placement.rotation, new THREE.Vector3().setScalar(object.scale));
      const entry: Entry = {id:entries.length,objectId:object.id,x: position.x, y: position.z, box: prototype ? new THREE.Box3().setFromObject(prototype).applyMatrix4(transform) : new THREE.Box3(), opacity: 1, instances: [],transforms:[] };
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
        mesh.setMatrixAt(i, matrix.multiply(partTransform)); entry.instances.push({ attribute: visibility, index: i,cutaway:child.userData.cutaway });entry.transforms.push({mesh,index:i});
      });
      const motion=child.userData.rest?.animation as ObjectPart["animation"],cloth=child.userData.materialStyle === "cloth";
      if(motion?.kind === "sway" || motion?.kind === "spin" || cloth){
        let shadow=shadowMaterials.get(child);
        if(!shadow){shadow=sceneryDepthMaterial(motion,cloth);shadowMaterials.set(child,shadow);}
        mesh.customDepthMaterial=shadow;
      }
      mesh.userData.sceneryEntries=items.map(item=>item.entry.id);mesh.userData.cutaway=child.userData.cutaway;
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
      items.forEach(({entry,matrix},i)=>{mesh.setMatrixAt(i,matrix);entry.instances.push({attribute:visibility,index:i});entry.transforms.push({mesh,index:i});});
      mesh.userData.sceneryEntries=items.map(item=>item.entry.id);
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.group.add(mesh);
    }
    this.entries=entries;this.grid = new SpatialGrid(entries); this.count = entries.length;
    this.group.userData.occlusion=entries.map(({objectId,x,y,box})=>({objectId,x,y,min:box.min.toArray(),max:box.max.toArray()}));
  }

  /** Rebind transferred instance attributes to the same local fade entries. */
  static fromChunk(scene:Scene,group:THREE.Group,data:{objectId?:string;x:number;y:number;min:number[];max:number[]}[]=[]):WorldScenery{
    const scenery=new WorldScenery(scene,[]),entries:Entry[]=data.map((e,id)=>({id,objectId:e.objectId,x:e.x,y:e.y,box:new THREE.Box3(new THREE.Vector3().fromArray(e.min),new THREE.Vector3().fromArray(e.max)),opacity:1,instances:[],transforms:[]}));
    group.traverse(node=>{
      if(!(node instanceof THREE.Mesh) || !node.userData.sceneryEntries)return;
      const attribute=node.geometry.getAttribute('visibility') as THREE.InstancedBufferAttribute;
      (node.userData.sceneryEntries as number[]).forEach((id,index)=>{entries[id]!.instances.push({attribute,index,cutaway:node.userData.cutaway});entries[id]!.transforms.push({mesh:node as THREE.InstancedMesh,index});});
    });
    scenery.entries=entries;scenery.grid=new SpatialGrid(entries);scenery.count=entries.length;return scenery;
  }

  private transform(entry:Entry):void{
    const scale=entry.growthScale??1,zero=new THREE.Matrix4().makeScale(0,0,0);
    let change:THREE.Matrix4|undefined;
    if(scale!==1){const pivot=entry.growthPivot!;change=new THREE.Matrix4().makeTranslation(pivot.x,pivot.y,pivot.z).multiply(new THREE.Matrix4().makeScale(scale,scale,scale)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z));}
    for(const t of entry.transforms){
      if((entry.hidden || scale!==1) && !t.original){t.original=new THREE.Matrix4();t.mesh.getMatrixAt(t.index,t.original);}
      if(entry.hidden)t.mesh.setMatrixAt(t.index,zero);
      else if(t.original){const matrix=change ? new THREE.Matrix4().multiplyMatrices(change,t.original) : t.original;t.mesh.setMatrixAt(t.index,matrix);
        // A young crown lies below its mature mesh bound. Keep the original bound too.
        if(change){if(!t.mesh.geometry.boundingSphere)t.mesh.geometry.computeBoundingSphere();const sphere=t.mesh.geometry.boundingSphere!.clone().applyMatrix4(matrix);if(t.mesh.boundingSphere)t.mesh.boundingSphere.union(sphere);else t.mesh.boundingSphere=sphere;}
        else t.original=undefined;
      }
      t.mesh.instanceMatrix.needsUpdate=true;t.mesh.boundingBox=null;
      t.mesh.visible=!(t.mesh.userData.sceneryEntries as number[]).every(id=>this.entries[id]!.hidden);
    }
  }
  /** Collapse both colour and shadow geometry; ghosting still keeps ordinary shadows. */
  setHidden(ids:ReadonlySet<string>):void{
    if(this.hidden===ids)return;this.hidden=ids;
    for(const entry of this.entries){const hidden=!!entry.objectId && ids.has(entry.objectId);if(hidden===!!entry.hidden)continue;entry.hidden=hidden;this.transform(entry);}
  }
  setGrowth(scales:ReadonlyMap<string,number>):void{
    if(this.growth===scales)return;this.growth=scales;
    for(const entry of this.entries){const scale=entry.objectId ? scales.get(entry.objectId)??1 : 1;if(scale===(entry.growthScale??1))continue;entry.growthScale=scale;
      if(scale!==1){if(!entry.growthPivot){const object=this.scene.objects.find(o=>o.id===entry.objectId)!;entry.growthPivot=new THREE.Vector3(entry.x,objectPlacement(this.scene,object).base+1.5,entry.y);}entry.originalBox??=entry.box.clone();const p=entry.growthPivot;entry.box.copy(entry.originalBox);entry.box.min.sub(p).multiplyScalar(scale).add(p);entry.box.max.sub(p).multiplyScalar(scale).add(p);}
      else if(entry.originalBox){entry.box.copy(entry.originalBox);entry.originalBox=undefined;}
      this.transform(entry);
    }
  }

  update(camera: THREE.OrthographicCamera, player: THREE.Vector3, dt: number, snap = false): void {
    const screen = player.clone().project(camera);
    this.ray.setFromCamera(new THREE.Vector2(screen.x, screen.y), camera);
    const distance = this.ray.ray.origin.distanceTo(player) - 4, hit = new THREE.Vector3();
    const obscuring = new Set<Entry>();
    const interior=occupiedInterior(this.scene,player.x+this.scene.canonical.width/2,player.z+this.scene.canonical.height/2,player.y-8.5);
    const cameraLocal=interior?.toLocal(camera.position.x+this.scene.canonical.width/2,camera.position.z+this.scene.canonical.height/2);
    const hide=(side:string|undefined)=>!!interior && (side==='roof' || side==='front' && cameraLocal!.y<interior.room.position[2] || side==='back' && cameraLocal!.y>interior.room.position[2] || side==='left' && cameraLocal!.x<interior.room.position[0] || side==='right' && cameraLocal!.x>interior.room.position[0]);
    for (const entry of this.grid.query(player.x, player.z, 700)) {
      if(entry.hidden)continue;
      if(entry.objectId===interior?.object.id){this.fading.add(entry);continue;}
      if (this.ray.ray.intersectBox(entry.box, hit) && hit.distanceTo(this.ray.ray.origin) < distance) {
        obscuring.add(entry); this.fading.add(entry);
      }
    }
    this.obscuredCount = obscuring.size;
    for (const entry of this.fading) {
      const target = obscuring.has(entry) ? .22 : 1;
      entry.opacity += (target - entry.opacity) * (snap ? 1 : 1 - Math.exp(-dt * 12));
      if (Math.abs(entry.opacity - target) < .002) entry.opacity = target;
      let restored=true;
      for (const instance of entry.instances) {
        const target=entry.objectId===interior?.object.id && hide(instance.cutaway) ? 0 : entry.opacity,current=instance.attribute.getX(instance.index),value=current+(target-current)*(snap ? 1 : 1-Math.exp(-dt*12)),next=Math.abs(value-target)<.002 ? target : value;
        if(Math.abs(next-current)>1e-6){instance.attribute.setX(instance.index,next);instance.attribute.needsUpdate=true;}
        if(next!==1)restored=false;
      }
      if(restored)this.fading.delete(entry);
    }
  }
}
