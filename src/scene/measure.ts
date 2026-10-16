import { Box3, Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { ObjectDsl } from "./object-dsl";
import { partGeometry } from "./object-geometry";

// Game proportions, not a simulation of every real-world species or vehicle model.
export const UNITS_PER_METER=10;
export const CAR_PROPORTION_RULES=Object.freeze({tree:"larger",plane:"larger",bicycle:"smaller",skateboard:"smaller"} as const);
export const MEASURE_PROFILES=Object.freeze({
  car:{axis:"x",min:2.5,max:6}, plane:{axis:"z",min:7,max:24},
  tree:{axis:"y",min:4,max:30}, person:{axis:"y",min:1.4,max:2.2},
  bicycle:{axis:"x",min:1.4,max:2.4}, skateboard:{axis:"x",min:.5,max:1.2},
  bench:{axis:"x",min:1.2,max:2.8}, table:{axis:"x",min:1,max:3},
  building:{axis:"y",min:3,max:40}, train:{axis:"x",min:6,max:20},
  bus:{axis:"x",min:6,max:18}, tram:{axis:"x",min:10,max:35},
  boat:{axis:"x",min:3,max:12}, food:{axis:"x",min:.1,max:.8},
  custom:{axis:null,min:.05,max:60},
} as const);
export const MEASURE_KINDS=Object.keys(MEASURE_PROFILES) as [keyof typeof MEASURE_PROFILES,...(keyof typeof MEASURE_PROFILES)[]];
export type Measure={kind:keyof typeof MEASURE_PROFILES;axis:"x"|"y"|"z";meters:number};
export function measureProblem(measure:Measure,variation=1):string|undefined {
  const profile=MEASURE_PROFILES[measure.kind],meters=measure.meters*variation;
  if(profile.axis && measure.axis!==profile.axis)return `${measure.kind} measures its ${profile.axis} axis`;
  if(!Number.isFinite(meters) || meters<profile.min-1e-7 || meters>profile.max+1e-7)
    return `${measure.kind} must measure ${profile.min}..${profile.max} meters after placement scale; use kind=custom for deliberate fantasy sizes`;
}

const boundsCache=new WeakMap<ObjectDsl,Box3>();
/** Exact primitive rest-pose bounds, including rigid group and joint transforms. */
export function assemblyBounds(spec:ObjectDsl):Box3 {
  const cached=boundsCache.get(spec);if(cached)return cached.clone();
  const joints=new Map((spec.dslVersion===2 ? spec.joints??[] : []).map(j=>[j.id,j]));
  const frames=new Map<string,Matrix4>();
  const transform=(position:readonly number[],rotation:readonly number[]=[0,0,0],size:readonly number[]=[1,1,1])=>
    new Matrix4().compose(new Vector3(...position),new Quaternion().setFromEuler(new Euler(...rotation)),new Vector3(...size));
  const frame=(id:string,depth=0):Matrix4|undefined=>{
    const joint=joints.get(id);
    // Malformed hierarchies already carry schema errors; keep nested refinements finite.
    if(!joint || depth>=4)return undefined;
    if(!frames.has(id)){
      const parent=joint.parent ? frame(joint.parent,depth+1)?.clone() : new Matrix4();
      if(!parent)return undefined;
      frames.set(id,parent.multiply(transform(joint.position,joint.rotation)));
    }
    return frames.get(id)!;
  };
  const bounds=new Box3();
  for(const part of spec.parts){
    const parent="parent" in part && part.parent ? frame(part.parent)?.clone() : new Matrix4();
    if(!parent)return new Box3();
    const geometry=partGeometry(part);
    geometry.applyMatrix4(parent.multiply(transform(part.position,part.rotation,part.size)));geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox!);geometry.dispose();
  }
  boundsCache.set(spec,bounds);return bounds.clone();
}
const scales=new WeakMap<ObjectDsl,number>();
/** Resolve once at scene compilation. SceneObject.scale already contains this factor. */
export function measuredScale(spec:ObjectDsl):number {
  if(spec.dslVersion!==2 || !spec.measure)return 1;
  let scale=scales.get(spec);
  if(scale===undefined){scale=spec.measure.meters*UNITS_PER_METER/assemblyBounds(spec).getSize(new Vector3())[spec.measure.axis];scales.set(spec,scale);}
  return scale;
}
export const playerRadius=(scene:{player?:ObjectDsl})=>scene.player ? scene.player.body.colliderRadius*measuredScale(scene.player) : 11;
export const playerHeight=(scene:{player?:ObjectDsl})=>scene.player ? (scene.player.body.colliderHeight??14)*measuredScale(scene.player) : 14;

/** Conservative horizontal support extent, separate from the authored collision cylinder. */
export function assemblyHorizontalRadius(spec:ObjectDsl,scale:number):number {
  const bounds=assemblyBounds(spec);
  return Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)))*scale;
}
