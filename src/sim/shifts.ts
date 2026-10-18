import type {Scene} from '../scene/schema';
import type {CarState} from './car';
import {actorPose} from './actors';
import {deliveryArea} from './courier';
import {workClear,workPath,workSegment} from './work-navigation';
import {advanceWorkJourney} from './work-journey';
import {marketIsOpen,marketOpening} from './market-hours';
import {objectRadius,objectHeight} from './archetypes';
import type {Shift} from '../scene/commerce';

export function shiftArea(scene:Scene,plan:Shift){
 const account=scene.economy!.accounts.find(a=>a.shift===plan.id)!,object=scene.objects.find(o=>o.id===account.actor)!;
 const radius=Math.ceil(objectRadius(object)*10)/10,height=Math.ceil(objectHeight(object)*10)/10,area=deliveryArea(plan);
 return {...area,id:`shift/${radius}/${height}/${area.id}`,radius,height};
}
export function shiftAreas(scene:Scene){return [...new Map(scene.economy?.shifts.filter(s=>scene.economy!.accounts.some(a=>a.shift===s.id)).map(s=>{const a=shiftArea(scene,s);return [a.id,a];})??[]).values()];}

export function shiftAccessProblems(scene:Scene):string[]{
 const e=scene.economy;if(!e)return [];
 const problems:string[]=[];
 for(const a of e.accounts)if(a.shift){
  const plan=e.shifts.find(s=>s.id===a.shift)!,work=scene.objects.find(o=>o.id===a.actor)!;
  try{const area=shiftArea(scene,plan);if(!workClear(scene,area,plan.rest) || !workPath(scene,area,work,plan.rest) || !workPath(scene,area,plan.rest,work))problems.push(`${a.id}: shift needs a dry clear rest point and connected outward/return paths`);}catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 }
 return problems;
}

/** Commerce owns this account copy. A shift never interrupts committed production. */
export function stepStaffShifts(state:CarState,dt:number,scene:Scene):CarState{
 const e=state.economy!,definition=scene.economy!;let next=state;
 for(const a of e.accounts){
  const spec=definition.accounts.find(s=>s.id===a.id)!;if(!spec.shift || e.shared?.partner===a.id)continue;
  const plan=definition.shifts.find(s=>s.id===spec.shift)!,market=definition.markets.find(m=>m.id===plan.market)!,work=scene.objects.find(o=>o.id===spec.actor)!,area=shiftArea(scene,plan);
  const opening=marketOpening(scene,market,state.timeS),returning=marketIsOpen(scene,market,state.timeS) || !!opening && opening.seconds<=plan.lead_s;
  if(!a.shift){
   if(returning || a.work)continue;
   a.shift={id:plan.id,phase:'out',at:{...plan.rest},x:work.x,y:work.y,headingRad:actorPose(scene,work,state.timeS,next).headingRad,distance:0,speed:0,path:[],routeAtS:0};
  }
  const t=a.shift,phase=returning ? 'in' : t.phase==='in' ? 'out' : t.phase;
  if(t.phase!==phase){t.phase=phase;t.at=phase==='in' ? {x:work.x,y:work.y} : {...plan.rest};t.path=[];t.routeAtS=state.timeS;}
  if(t.phase==='rest'){t.speed=0;continue;}
  advanceWorkJourney(t,t.at,area,next,dt,scene);
  if(Math.hypot(t.x-t.at.x,t.y-t.at.y)>.1)continue;
  if(t.phase==='in'){a.shift=undefined;next={...next,npcs:next.npcs.map(n=>n.id===work.id ? {...n,headingRad:t.headingRad} : n)};}
  else{t.phase='rest';t.speed=0;t.path=[];}
 }
 return next;
}

export function checkShiftState(state:CarState,scene:Scene):void{
 const e=state.economy!,definition=scene.economy!;
 for(const a of e.accounts)if(a.shift){
  const t=a.shift,spec=definition.accounts.find(s=>s.id===a.id)!,plan=definition.shifts.find(s=>s.id===t.id),work=scene.objects.find(o=>o.id===spec.actor);
  if(!plan || spec.shift!==t.id || !work || spec.actor==='player' || a.work || a.delivery || a.courier || a.repair || a.meal || t.routeAtS>state.timeS+1.01)throw Error('Invalid saved shift');
  const end=t.phase==='in' ? work : plan.rest,area=shiftArea(scene,plan);
  if(Math.hypot(t.at.x-end.x,t.at.y-end.y)>.01 || t.phase==='rest' && (Math.hypot(t.x-end.x,t.y-end.y)>.1 || t.speed!==0 || t.path.length>0))throw Error('Invalid shift destination');
  if(!workSegment(scene,area,t,t,state,true) || !workSegment(scene,area,t.at,t.at,state,true))throw Error('Invalid shift position');
  let previous={x:t.x,y:t.y};for(const p of t.path){if(!workSegment(scene,area,previous,p,state,true))throw Error('Invalid saved shift path');previous=p;}
  if(t.path.length && Math.hypot(previous.x-t.at.x,previous.y-t.at.y)>.01)throw Error('Invalid shift path destination');
 }
}
