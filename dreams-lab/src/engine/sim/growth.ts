import type {CarState} from './car';
import type {Scene} from '../scene/schema';
import {repairSpaceClear} from './repair';
import {objectContacts} from '../scene/contacts';
import {GROWTH_LIMITS} from '../scene/growth';

/** Four-Hz resident growth waits for space; renderer chunks never own the clock. */
export function advanceGrowth(state:CarState,dt:number,scene:Scene):CarState{
 if(!state.growing?.length)return state;
 let changed=false;const matured=new Set<string>();
 const growing=state.growing.flatMap(p=>{
  if(state.broken.includes(p.objectId)){changed=true;return [];}
  const r=scene.economy!.repairs.find(r=>r.id===p.serviceId)!,start=r.seed_scale??GROWTH_LIMITS.seedScale,progressS=Math.min(r.regrow_s!,p.progressS+dt),scale=start+(1-start)*progressS/r.regrow_s!,object=scene.objects.find(o=>o.id===p.objectId)!;
  if(!repairSpaceClear(scene,{objectId:p.objectId,contact:objectContacts(scene,object)[0]!},state,scale))return [p];
  changed=true;if(progressS>=r.regrow_s!-1e-8){matured.add(p.objectId);return [];}return [{...p,progressS}];
 });
 return changed ? {...state,growing,...(state.economy?.recoverySpent && matured.size ? {economy:{...state.economy,recoverySpent:state.economy.recoverySpent.filter(id=>!matured.has(id))}} : {})} : state;
}
