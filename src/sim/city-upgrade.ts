import type {CarState} from './car';
import type {Scene,Point} from '../scene/schema';
import {repairArea} from './repair';
import {deliveryArea} from './courier';
import {shiftArea} from './shifts';
import {socialArea} from './social';
import {workSegment,workPath,workNetwork,type WalkingArea} from './work-navigation';

type Journey=Point & {path:Point[];speed:number};
/** Layout migration only: preserve commitments and clocks, rerouting an obsolete pavement segment. */
export function cityJourneys(state:CarState,scene:Scene):CarState{
 const e=state.economy,d=scene.economy;if(!e || !d)return state;
 const route=<T extends Journey>(task:T,area:WalkingArea,end:Point):T=>{
  let previous:Point=task;
  const valid=workSegment(scene,area,task,task,undefined,true) && task.path.every(p=>{const clear=workSegment(scene,area,previous,p,undefined,true);previous=p;return clear;});
  if(valid)return task;
  const starts=workSegment(scene,area,task,task,undefined,true) ? [task] : workNetwork(scene,area).filter(p=>p.links.length && Math.hypot(p.x-task.x,p.y-task.y)<=256).sort((a,b)=>Math.hypot(a.x-task.x,a.y-task.y)-Math.hypot(b.x-task.x,b.y-task.y)).slice(0,32);
  for(const start of starts){const path=workPath(scene,area,start,end);if(path)return {...task,x:start.x,y:start.y,path,speed:0};}
  throw Error('This update cannot preserve a saved walking journey.');
 };
 return {...state,economy:{...e,accounts:e.accounts.map(a=>{
  const spec=d.accounts.find(s=>s.id===a.id)!,home=scene.objects.find(o=>o.id===spec.actor);let next={...a};
  if(a.repair && spec.actor!=='player'){const r=d.repairs.find(r=>r.id===a.repair!.id)!;next.repair=route(a.repair,repairArea(scene,r),a.repair.phase==='home' ? home! : a.repair.at);}
  if(a.courier){const plan=d.deliveries.find(r=>r.id===a.courier!.id)!;next.courier=route(a.courier,deliveryArea(plan),a.courier.at);}
  if(a.meal){const plan=d.meals.find(r=>r.id===a.meal!.id)!;next.meal=route(a.meal,deliveryArea(plan),a.meal.at);}
  if(a.shift){const plan=d.shifts.find(r=>r.id===a.shift!.id)!;next.shift=route(a.shift,shiftArea(scene,plan),a.shift.at);}
  return next;
 }),...(e.shared ? {shared:route(e.shared,socialArea(scene,e.shared.partner),e.shared.at)} : {})}};
}
