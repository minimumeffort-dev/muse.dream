import { Box3,Euler,Matrix4,Quaternion,Vector3 } from "three";
import type { ObjectDslV2 } from "./object-dsl";
import { partGeometry } from "./object-geometry";

export interface FragmentShape {id:string;parts:string[];center:Vector3;corners:Vector3[];zone?:string}
const cache=new WeakMap<ObjectDslV2,FragmentShape[]>();
/** Rest-pose fragment frames are shared by simulation and rendering. */
export function objectFragments(spec:ObjectDslV2):FragmentShape[] {
  const cached=cache.get(spec);if(cached)return cached;
  const joints=new Map((spec.joints??[]).map(j=>[j.id,j])),frames=new Map<string,Matrix4>();
  const transform=(position:number[],rotation:number[]=[0,0,0],size:number[]=[1,1,1])=>new Matrix4().compose(new Vector3(...position),new Quaternion().setFromEuler(new Euler(...rotation)),new Vector3(...size));
  const frame=(id:string):Matrix4=>{
    if(!frames.has(id)){const j=joints.get(id)!;frames.set(id,(j.parent ? frame(j.parent).clone() : new Matrix4()).multiply(transform(j.position,j.rotation)));}
    return frames.get(id)!;
  };
  const groups=new Map<string,{parts:string[];bounds:Box3;zone?:string}>();
  for(const part of spec.parts){
    if(spec.breakZones && !part.zone)continue;
    const id=part.fragment ? `group:${part.fragment}` : `part:${part.id}`,group=groups.get(id)??{parts:[],bounds:new Box3(),...(part.zone ? {zone:part.zone} : {})};
    const matrix=(part.parent ? frame(part.parent).clone() : new Matrix4()).multiply(transform(part.position,part.rotation,part.size));
    const geometry=partGeometry(part).applyMatrix4(matrix);geometry.computeBoundingBox();group.bounds.union(geometry.boundingBox!);geometry.dispose();
    group.parts.push(part.id);groups.set(id,group);
  }
  const result=[...groups].map(([id,{parts,bounds,zone}])=>{
    const center=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3()).multiplyScalar(.5);
    const corners=Array.from({length:8},(_,i)=>new Vector3(i&1 ? size.x : -size.x,i&2 ? size.y : -size.y,i&4 ? size.z : -size.z));
    return {id,parts,center,corners,...(zone ? {zone} : {})};
  });
  cache.set(spec,result);return result;
}
