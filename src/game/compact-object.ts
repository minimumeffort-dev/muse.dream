import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ObjectPart } from "../scene/object-dsl";

/** Merge rigid siblings by material; wheels retain their own pivots and distance animation. */
export function compactObject(group:THREE.Group):THREE.Group {
  for(const child of group.children)if(child instanceof THREE.Group)compactObject(child);
  group.updateMatrix();
  const batches=new Map<string,{items:THREE.Mesh[];frame:THREE.Matrix4;motion?:ObjectPart["animation"]}>();
  for(const child of group.children){
    if(!(child instanceof THREE.Mesh) || ["cloth","stripes"].includes(child.userData.materialStyle))continue;
    child.updateMatrix();const motion=child.userData.rest?.animation as ObjectPart["animation"];
    // Sway includes position-dependent phase; preserve its original local coordinate frame.
    if(motion?.kind==="sway")continue;
    const axis=motion?.kind==="spin" || motion?.kind==="roll" ? motion.axis ?? "y" : "y";
    const vector=new THREE.Vector3(Number(axis==="x"),Number(axis==="y"),Number(axis==="z")).applyQuaternion(child.quaternion);
    const rounded=(values:number[])=>values.map(v=>Math.round(v*1e6)/1e6);
    const materialKey=child.userData.materialKey ?? (Array.isArray(child.material) ? child.material.map(m=>m.uuid) : child.material.uuid);
    const key=JSON.stringify([materialKey,motion ? {...motion,axis:rounded(vector.toArray())} : null,motion ? rounded(child.position.toArray()) : null]);
    const frame=motion ? new THREE.Matrix4().compose(child.position,child.quaternion,new THREE.Vector3(1,1,1)) : new THREE.Matrix4();
    const batch=batches.get(key)??{items:[],frame,motion};batch.items.push(child);batches.set(key,batch);
  }
  for(const {items,frame,motion} of batches.values()){
    if(items.length<2)continue;
    const inverse=frame.clone().invert();
    const geometries=items.map(child=>(child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()).applyMatrix4(inverse.clone().multiply(child.matrix)));
    const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
    if(!geometry)throw new Error("actor parts could not be combined");
    const first=items[0]!,mesh=new THREE.Mesh(geometry,first.material);
    frame.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.castShadow=mesh.receiveShadow=true;
    mesh.userData.rest={y:mesh.position.y,rotation:mesh.quaternion.clone(),animation:motion};
    mesh.name=`batch-${first.name}`;
    for(const child of items){group.remove(child);child.geometry.dispose();}
    group.add(mesh);
  }
  return group;
}
