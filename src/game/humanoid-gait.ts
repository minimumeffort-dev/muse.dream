import type {ObjectDslV2} from '../scene/object-dsl';
import {assemblyBounds} from '../scene/measure';

export const gaitRun=(speed:number)=>Math.max(0,Math.min(1,(speed-22)/30));
export const gaitStance=(run:number)=>.62-.2*run;
export const gaitReach=(run:number)=>6.8+7.2*run;
export const gaitStride=(run:number)=>2*gaitReach(run)/gaitStance(run);

/** Linear ground travel during stance; the return clears the support plane. */
export function strideFoot(phase:number,run:number):{x:number;y:number;toe:number} {
 const t=((phase%1)+1)%1,stance=gaitStance(run),reach=gaitReach(run);
 if(t<stance)return {x:reach*(1-2*t/stance),y:0,toe:0};
 const u=(t-stance)/(1-stance),ease=u*u*(3-2*u);
 return {x:reach*(2*ease-1),y:Math.sin(Math.PI*u)**1.5*(4.5+3.5*run),toe:-.25*Math.sin(Math.PI*u)};
}
export type Sole=readonly [number,number,number];
/** Cached ankle-local support bounds, including authored shoe size and rotation. */
export function humanoidSoles(spec:ObjectDslV2,joints=spec.joints!):[Sole,Sole]{
 return (['left','right'] as const).map(side=>{
  const id=joints.find(j=>j.bone===`${side}_ankle`)?.id;
  const parts=spec.parts.filter(p=>p.parent===id).map(({parent,...part})=>part);
  if(!id || !parts.length)return [-2.2,6.8,-3] as const;
  const bounds=assemblyBounds({...spec,parts,joints:[]});return [bounds.min.x,bounds.max.x,bounds.min.y] as const;
 }) as [Sole,Sole];
}
export function soleSupport(sole:Sole,toe:number):number {
 return -Math.min(sole[0]*Math.sin(toe),sole[1]*Math.sin(toe))-sole[2]*Math.cos(toe);
}
