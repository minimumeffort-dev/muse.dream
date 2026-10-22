import {walkingDistance} from '../scene/floors';
import type {Scene} from '../scene/schema';
import type {CarState} from './car';
import {findSeat,worldSeats,seatAccessClear} from '../scene/seating';
import {seatAvailable} from './seating';
import {restArea} from './courier';
import {workPath,workSegment} from './work-navigation';
import {advanceWorkJourney} from './work-journey';
import {actorPose} from './actors';
import {sampleWeather} from '../scene/weather';
import {sheltered} from './shelter';

/** Energy is an authored game need, separate from food, money and work escrow. */
export function stepRestNeeds(state:CarState,dt:number,scene:Scene):void{
 const e=state.economy!,d=scene.economy!;
 for(const a of e.accounts){const spec=d.accounts.find(s=>s.id===a.id)!,plan=d.rests?.find(r=>r.id===spec.rest);if(!plan)continue;
  const t=a.resting,seat=findSeat(scene,spec.actor==='player' ? state.seated : t?.seat),area=spec.actor==='player' ? undefined : restArea(scene,spec);
  const seated=!!seat && (spec.actor==='player' ? state.control.kind==='foot' && state.grounded && state.surface!=='water' : t?.phase==='sit' && seatAvailable(scene,state,seat,a.id)) && seatAccessClear(scene,seat,state.broken,area);
  a.energy=Math.max(0,Math.min(100,a.energy!+dt*(seated ? plan.recover_s : -plan.drainPerS)));
  if(!t)continue;
  const home=()=>{t.phase='home';t.seat=undefined;t.at={...t.home};t.path=[];t.routeAtS=0;t.speed=0;};
  if(t.phase!=='home' && (!seat || !seatAvailable(scene,state,seat,a.id) || !seatAccessClear(scene,seat,state.broken,area) || plan.shelter && !sheltered(scene,seat,area!.radius,area!.height,state)))home();
  const rain=plan.shelter && sampleWeather(scene.weather,state.timeS).raining;
  if(t.phase==='sit'){if(a.energy>=plan.until && !rain)home();else continue;}
  if(t.phase==='out' && plan.shelter && !rain && a.energy>=plan.until)home();
  advanceWorkJourney(t,t.at,area!,state,dt,scene);
  if(walkingDistance(scene,t,t.at)>.1)continue;
  if(t.phase==='home'){a.resting=undefined;continue;}
  t.phase='sit';t.speed=0;t.path=[];
 }
}
/** A low-energy resident first tries its ordered reachable seats, using ordinary claims. */
export function startRestTrip(state:CarState,scene:Scene,id:string):boolean{
 const e=state.economy!,d=scene.economy!,a=e.accounts.find(a=>a.id===id)!,spec=d.accounts.find(a=>a.id===id)!,plan=d.rests?.find(r=>r.id===spec.rest);
 if(!plan || spec.actor==='player')return false;
 const object=scene.objects.find(o=>o.id===spec.actor)!,p=actorPose(scene,object,state.timeS,state),area=restArea(scene,spec);
 if(a.energy!>plan.below && !(plan.shelter && sampleWeather(scene.weather,state.timeS).raining && !sheltered(scene,p,area.radius,area.height,state)))return false;
 if(a.work || a.delivery || a.repair || a.courier || a.meal || a.commute || a.shift || a.resting)return true;
 for(const id of plan.seats)for(const seat of worldSeats(scene).filter(s=>s.objectId===id)){
  if(!seatAvailable(scene,state,seat,a.id) || !seatAccessClear(scene,seat,state.broken,area) || plan.shelter && !sheltered(scene,seat,area.radius,area.height,state))continue;
  const path=workPath(scene,area,p,seat.approach,state);if(!path || !workPath(scene,area,seat.approach,p,state))continue;
  a.resting={id:plan.id,phase:'out',home:{x:p.x,y:p.y,...(scene.floors ? {elevation:p.elevation} : {})},...(scene.floors ? {elevation:p.elevation} : {}),at:{...seat.approach},seat:{objectId:seat.objectId,seatId:seat.seatId},x:p.x,y:p.y,headingRad:p.headingRad,distance:0,speed:0,path,routeAtS:state.timeS};return true;
 }
 return true;
}
export function restAccessProblems(scene:Scene):string[]{
 const d=scene.economy;if(!d)return [];const problems:string[]=[];
 for(const plan of d.rests??[])if(plan.shelter){
  if(!scene.weather)problems.push(`${plan.id}: shelter requires world weather`);
  const users=d.accounts.filter(a=>a.rest===plan.id),radius=Math.max(3,...users.filter(a=>a.actor!=='player').map(a=>restArea(scene,a).radius)),height=Math.max(18,...users.filter(a=>a.actor!=='player').map(a=>restArea(scene,a).height));
  for(const id of plan.seats)if(worldSeats(scene).filter(s=>s.objectId===id).some(s=>!sheltered(scene,s,radius,height)))problems.push(`${plan.id}: shelter furniture ${id} needs a full retained interior ceiling above standing headroom`);
 }
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
  if(walkingDistance(scene,t.home,home)>.01 || (t.phase==='home' ? !!t.seat || walkingDistance(scene,t.at,t.home)>.01 : !seat || !plan.seats.includes(seat.objectId) || !seatAvailable(scene,state,seat,a.id) || !seatAccessClear(scene,seat,state.broken,area) || walkingDistance(scene,t.at,seat.approach)>.01))throw Error('Invalid saved rest destination');
  if(t.phase==='sit' && (t.path.length || t.speed!==0 || walkingDistance(scene,t,t.at)>.1))throw Error('Invalid saved resting pose');
  for(const p of [t,t.at,t.home])if(!workSegment(scene,area,p,p,state,true))throw Error('Invalid saved rest support');
  let previous:import('../scene/floors').WalkingPoint=t;for(const p of t.path){if(!workSegment(scene,area,previous,p,state,true))throw Error('Invalid saved rest path');previous=p;}if(t.path.length && Math.hypot(previous.x-t.at.x,previous.y-t.at.y)>.01)throw Error('Invalid saved rest path destination');
 }
}
