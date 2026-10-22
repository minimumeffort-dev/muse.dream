import type {Scene} from '../scene/schema';
import type {CarState} from './car';
import {findSeat,worldSeats,seatAccessClear} from '../scene/seating';
import {seatAvailable} from './seating';
import {restArea} from './courier';
import {workPath,workSegment} from './work-navigation';
import {advanceWorkJourney} from './work-journey';
import {actorPose} from './actors';

/** Energy is an authored game need, separate from food, money and work escrow. */
export function stepRestNeeds(state:CarState,dt:number,scene:Scene):void{
 const e=state.economy!,d=scene.economy!;
 for(const a of e.accounts){const spec=d.accounts.find(s=>s.id===a.id)!,plan=d.rests?.find(r=>r.id===spec.rest);if(!plan)continue;
  const t=a.resting,seat=findSeat(scene,spec.actor==='player' ? state.seated : t?.seat),area=spec.actor==='player' ? undefined : restArea(scene,spec);
  const seated=!!seat && (spec.actor==='player' ? state.control.kind==='foot' && state.grounded && state.surface!=='water' : t?.phase==='sit' && seatAvailable(scene,state,seat,a.id)) && seatAccessClear(scene,seat,state.broken,area);
  a.energy=Math.max(0,Math.min(100,a.energy!+dt*(seated ? plan.recover_s : -plan.drainPerS)));
  if(!t)continue;
  const home=()=>{t.phase='home';t.seat=undefined;t.at={...t.home};t.path=[];t.routeAtS=0;t.speed=0;};
  if(t.phase!=='home' && (!seat || !seatAvailable(scene,state,seat,a.id) || !seatAccessClear(scene,seat,state.broken,area)))home();
  if(t.phase==='sit'){if(a.energy>=plan.until)home();else continue;}
  advanceWorkJourney(t,t.at,area!,state,dt,scene);
  if(Math.hypot(t.x-t.at.x,t.y-t.at.y)>.1)continue;
  if(t.phase==='home'){a.resting=undefined;continue;}
  t.phase='sit';t.speed=0;t.path=[];
 }
}
/** A low-energy resident first tries its ordered reachable seats, using ordinary claims. */
export function startRestTrip(state:CarState,scene:Scene,id:string):boolean{
 const e=state.economy!,d=scene.economy!,a=e.accounts.find(a=>a.id===id)!,spec=d.accounts.find(a=>a.id===id)!,plan=d.rests?.find(r=>r.id===spec.rest);
 if(!plan || spec.actor==='player' || a.energy!>plan.below)return false;
 if(a.work || a.delivery || a.repair || a.courier || a.meal || a.commute || a.shift || a.resting)return true;
 const object=scene.objects.find(o=>o.id===spec.actor)!,p=actorPose(scene,object,state.timeS,state),area=restArea(scene,spec);
 for(const id of plan.seats)for(const seat of worldSeats(scene).filter(s=>s.objectId===id)){
  if(!seatAvailable(scene,state,seat,a.id) || !seatAccessClear(scene,seat,state.broken,area))continue;
  const path=workPath(scene,area,p,seat.approach,state);if(!path || !workPath(scene,area,seat.approach,p,state))continue;
  a.resting={id:plan.id,phase:'out',home:{x:p.x,y:p.y},at:{...seat.approach},seat:{objectId:seat.objectId,seatId:seat.seatId},x:p.x,y:p.y,headingRad:p.headingRad,distance:0,speed:0,path,routeAtS:state.timeS};return true;
 }
 return true;
}
export function restAccessProblems(scene:Scene):string[]{
 const d=scene.economy;if(!d)return [];const problems:string[]=[];
 for(const a of d.accounts.filter(a=>a.rest && a.actor!=='player')){const plan=d.rests!.find(r=>r.id===a.rest)!,object=scene.objects.find(o=>o.id===a.actor)!,area=restArea(scene,a);
  for(const id of plan.seats)if(!worldSeats(scene).filter(s=>s.objectId===id).some(s=>seatAccessClear(scene,s,[],area) && workPath(scene,area,object,s.approach) && workPath(scene,area,s.approach,object)))problems.push(`${a.id}: rest furniture ${id} needs body-clear outward and return access`);
 }
 return problems;
}
export function checkRestState(state:CarState,scene:Scene):void{
 const d=scene.economy!,e=state.economy!;
 for(const a of e.accounts){const spec=d.accounts.find(s=>s.id===a.id)!,plan=d.rests?.find(r=>r.id===spec.rest),t=a.resting;
  if(plan ? a.energy===undefined : a.energy!==undefined || !!t)throw Error('Invalid saved energy owner');
  if(!t)continue;
  if(!plan || spec.actor==='player' || t.id!==plan.id || a.work || a.delivery || a.repair || a.courier || a.meal || a.commute || a.shift || t.routeAtS>state.timeS+1.01)throw Error('Invalid saved rest owner');
  const object=scene.objects.find(o=>o.id===spec.actor)!,home=actorPose(scene,object,state.timeS,{...state,economy:undefined}),area=restArea(scene,spec),seat=findSeat(scene,t.seat);
  if(Math.hypot(t.home.x-home.x,t.home.y-home.y)>.01 || (t.phase==='home' ? !!t.seat || Math.hypot(t.at.x-t.home.x,t.at.y-t.home.y)>.01 : !seat || !plan.seats.includes(seat.objectId) || !seatAvailable(scene,state,seat,a.id) || !seatAccessClear(scene,seat,state.broken,area) || Math.hypot(t.at.x-seat.approach.x,t.at.y-seat.approach.y)>.01))throw Error('Invalid saved rest destination');
  if(t.phase==='sit' && (t.path.length || t.speed!==0 || Math.hypot(t.x-t.at.x,t.y-t.at.y)>.1))throw Error('Invalid saved resting pose');
  for(const p of [t,t.at,t.home])if(!workSegment(scene,area,p,p,state,true))throw Error('Invalid saved rest support');
  let previous={x:t.x,y:t.y};for(const p of t.path){if(!workSegment(scene,area,previous,p,state,true))throw Error('Invalid saved rest path');previous=p;}if(t.path.length && Math.hypot(previous.x-t.at.x,previous.y-t.at.y)>.01)throw Error('Invalid saved rest path destination');
 }
}
