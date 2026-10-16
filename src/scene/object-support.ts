import * as THREE from "three";
import type { Scene, SceneObject } from "./schema";
import { partGeometry } from "./object-geometry";
import { objectRadius } from "../sim/archetypes";

// Compile rest-pose geometry once per assembly, without materials, WebGL or scene nodes.
const profiles = new WeakMap<object, THREE.Vector3[]>();
const builtins = new Map<string, THREE.Vector3[]>();
const assemblies = new WeakMap<Scene, Map<string,THREE.Vector3[]>>();
export function objectSupport(scene: Scene, object: SceneObject): readonly THREE.Vector3[] {
  const spec = object.spec;
  const cached = spec ? profiles.get(spec) : builtins.get(object.kind);
  if (cached) return cached;
  let shared = assemblies.get(scene);
  if (!shared) { shared = new Map(); assemblies.set(scene,shared); }
  const key=JSON.stringify(spec ?? object.kind), equivalent=shared.get(key);
  if (equivalent) { if(spec) profiles.set(spec,equivalent); return equivalent; }
  const points = new Map<string, THREE.Vector3>();
  const add = (p: THREE.Vector3) => {
    const key = `${p.x.toFixed(4)},${p.z.toFixed(4)}`;
    if (!points.has(key) || p.y < points.get(key)!.y) points.set(key, p.clone());
  };
  const append = (geometry: THREE.BufferGeometry, matrix = new THREE.Matrix4()) => {
    geometry.applyMatrix4(matrix);
    const vertices = geometry.getAttribute("position"), index = geometry.index;
    for (let i = 0; i < vertices.count; i++) add(new THREE.Vector3().fromBufferAttribute(vertices, i));
    // Broad bottom faces need interior contacts too: a hill crest can lie between corners.
    const count = index?.count ?? vertices.count;
    for (let i = 0; i < count; i += 3) {
      const [a,b,c] = [0,1,2].map(j => new THREE.Vector3().fromBufferAttribute(vertices, index ? index.getX(i+j) : i+j));
      if (new THREE.Vector3().subVectors(b!,a!).cross(new THREE.Vector3().subVectors(c!,a!)).y >= -1e-6) continue;
      const n = Math.ceil(Math.max(a!.distanceTo(b!),b!.distanceTo(c!),c!.distanceTo(a!))/8);
      for (let u=0;u<=n;u++) for (let v=0;v<=n-u;v++)
        add(a!.clone().multiplyScalar(1-(u+v)/n).addScaledVector(b!,u/n).addScaledVector(c!,v/n));
    }
    geometry.dispose();
  };
  if (spec && "dslVersion" in spec) {
    const joints = new Map((spec.dslVersion===2 ? spec.joints ?? [] : []).map(j => [j.id,j]));
    const frames = new Map<string,THREE.Matrix4>();
    const transform = (position: readonly number[], rotation: readonly number[] = [0,0,0], size: readonly number[] = [1,1,1]) =>
      new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...size));
    const frame = (id: string): THREE.Matrix4 => {
      if (!frames.has(id)) {
        const joint=joints.get(id)!;
        frames.set(id,(joint.parent ? frame(joint.parent).clone() : new THREE.Matrix4()).multiply(transform(joint.position,joint.rotation)));
      }
      return frames.get(id)!;
    };
    for (const part of spec.parts) {
      const parent = "parent" in part && part.parent ? frame(part.parent).clone() : new THREE.Matrix4();
      append(partGeometry(part),parent.multiply(transform(part.position,part.rotation,part.size)));
    }
  } else if (object.kind === "tree") {
    append(new THREE.CylinderGeometry(2.2,3.2,11,8).translate(0,5.5,0));
    for (const [x,y,z,r] of [[0,19,0,10.5],[-6,14.5,3,7.5],[6,15,-3,7.5],[1,24,1,6.5]])
      append(new THREE.IcosahedronGeometry(r,1).translate(x!,y!,z!));
  } else if (object.kind === "cone") {
    append(new THREE.BoxGeometry(13,1.6,13).translate(0,.8,0));
  } else if (object.kind === "tire-stack") {
    append(new THREE.TorusGeometry(10.5,3.8,10,22).rotateX(Math.PI/2).translate(0,3.8,0));
  } else {
    // Legacy recipes have no part transforms; retain their physical support footprint.
    const r=objectRadius({...object,scale:1});
    append(new THREE.CylinderGeometry(r,r,1,24).translate(0,.5,0));
  }
  const result=[...points.values()];
  shared.set(key,result);
  if (spec) profiles.set(spec,result); else builtins.set(object.kind,result);
  return result;
}
