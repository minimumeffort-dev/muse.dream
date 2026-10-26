import type {Scene} from '../scene/schema';
import type {CarState} from './car';
import {actorPose} from './actors';
import {findSeat,sameSeat,seatAccessClear,worldSeats} from '../scene/seating';
import {seatAvailable} from './seating';
import {commuteArea,deliveryArea} from './courier';
import {advanceWorkJourney} from './work-journey';
import {walkingDistance} from '../scene/floors';
import {workPath,workSegment} from './work-navigation';
import {workstation} from '../scene/workstations';
import {commerceReason,type CommerceAction} from './commerce';
type Account=NonNullable<CarState['economy']>['accounts'][number];
type Spec=NonNullable<Scene['economy']>['accounts'][number];
export function visitArea(scene:Scene,spec:Spec){const plan=scene.economy!.visits!.find(v=>v.id===spec.visit)!;const area=commuteArea(scene,{actor:spec.actor,on:plan.on,grounds:plan.grounds});return {...area,radius:area.radius!,height:area.height!};}
export function visitAreas(scene:Scene){return [...new Map((scene.economy?.accounts??[]).filter(a=>a.visit).map(a=>{const area=visitArea(scene,a);return [area.id,area];})).values()];}
export function returnFromVisit(a:Account){if(a.visiting){const t=a.visiting;t.phase='home';t.at={...t.home};t.path=[];t.routeAtS=0;t.speed=0;t.seat=undefined;t.arrivedAtS=undefined;}}
export function serviceSeat(state:CarState,scene:Scene,a:Account){const spec=scene.economy!.accounts.find(s=>s.id===a.id)!;return findSeat(scene,spec.actor==='player' ? state.control.kind==='foot' && state.grounded && state.surface!=='water' ? state.seated : undefined : a.visiting?.phase==='wait' ? a.visiting.seat : undefined);}
export function servicesAtSeat(state:CarState,scene:Scene){return state.seated && state.control.kind==='foot' ? (scene.economy?.jobs??[]).filter(j=>j.fee!==undefined && j.waiting?.includes(state.seated!.objectId)) : [];}
export function startVisit(state:CarState,scene:Scene,a:Account):boolean{
 const spec=scene.economy!.accounts.find(s=>s.id===a.id)!;if(!spec.visit)return false;
 const plan=scene.economy!.visits!.find(v=>v.id===spec.visit)!,job=scene.economy!.jobs.find(j=>j.id===plan.work)!;
 if(a.visits![job.id]!.nextAtS>state.timeS+1e-8 || a.credits<job.fee! || a.visits![job.id]!.completed>=1e9)return false;
 const object=scene.objects.find(o=>o.id===spec.actor)!,home=actorPose(scene,object,state.timeS,state),area=visitArea(scene,spec);
 for(const id of job.waiting!)for(const seat of worldSeats(scene).filter(s=>s.objectId===id)){
  if(!seatAvailable(scene,state,seat,a.id) || !seatAccessClear(scene,seat,state.broken,area))continue;
  const path=workPath(scene,area,home,seat.approach,state);if(!path || !workPath(scene,area,seat.approach,home,state))continue;
  a.visiting={id:plan.id,phase:'out',home:{x:home.x,y:home.y,...(scene.floors ? {elevation:home.elevation} : {})},at:{...seat.approach},seat:{objectId:seat.objectId,seatId:seat.seatId},x:home.x,y:home.y,...(scene.floors ? {elevation:home.elevation} : {}),headingRad:home.headingRad,distance:0,speed:0,path,routeAtS:state.timeS};return true;
 }
 return false;
}
export function stepVisits(state:CarState,scene:Scene,dt:number,perform:(a:Account,action:CommerceAction)=>void){
 for(const a of state.economy!.accounts)if(a.visiting){
  const t=a.visiting,spec=scene.economy!.accounts.find(s=>s.id===a.id)!,plan=scene.economy!.visits!.find(v=>v.id===t.id)!,job=scene.economy!.jobs.find(j=>j.id===plan.work)!,area=visitArea(scene,spec),seat=findSeat(scene,t.seat);
  if(t.phase!=='home' && (!seat || !seatAccessClear(scene,seat,state.broken,area))){if(a.request)perform(a,{kind:'cancel'});returnFromVisit(a);}
  if(t.phase==='out' && walkingDistance(scene,t,t.at)<=80){
   t.arrivedAtS??=state.timeS;
   if(state.timeS-t.arrivedAtS>=(job.wait_s??120)){a.visits![job.id]!.nextAtS=state.timeS+(job.cooldown_s??600);returnFromVisit(a);continue;}
   if(seat && !seatAvailable(scene,state,seat,a.id) && state.timeS>=t.routeAtS){
    t.routeAtS=state.timeS+1;
    for(const alternative of worldSeats(scene).filter(s=>job.waiting!.includes(s.objectId) && !sameSeat(s,seat) && seatAvailable(scene,state,s,a.id) && seatAccessClear(scene,s,state.broken,area))){
     const path=workPath(scene,area,t,alternative.approach,state);if(!path)continue;
     t.seat={objectId:alternative.objectId,seatId:alternative.seatId};t.at={...alternative.approach};t.path=path;break;
    }
   }
  }
  if(t.phase==='wait'){
   t.speed=0;if(a.request)continue;
   if(state.timeS-t.arrivedAtS!>= (job.wait_s??120)){a.visits![job.id]!.nextAtS=state.timeS+(job.cooldown_s??600);returnFromVisit(a);continue;}
   if(!commerceReason(state,scene,a.id,{kind:'request',job:job.id}))perform(a,{kind:'request',job:job.id});continue;
  }
  advanceWorkJourney(t,t.at,area,state,dt,scene);if(walkingDistance(scene,t,t.at)>.1)continue;
  if(t.phase==='home'){a.visits![job.id]!.nextAtS=Math.max(a.visits![job.id]!.nextAtS,state.timeS+(job.cooldown_s??600));a.visiting=undefined;state.npcs=state.npcs.map(n=>n.id===spec.actor ? {...n,headingRad:t.headingRad} : n);continue;}
  const arrived=findSeat(scene,t.seat)!;if(!seatAvailable(scene,state,arrived,a.id)){t.speed=0;continue;}
  t.phase='wait';t.speed=0;t.path=[];t.arrivedAtS??=state.timeS;
 }
}
export function visitAccessProblems(scene:Scene):string[]{
 const e=scene.economy;if(!e)return [];const problems:string[]=[];
 for(const job of e.jobs.filter(j=>j.fee!==undefined)){
  const station=workstation(scene,job.station)!,plan=e.stations!.find(s=>s.id===job.station)!,area={...deliveryArea(plan),radius:4.1,height:18};
  for(const id of job.waiting!){const seats=worldSeats(scene).filter(s=>s.objectId===id);
   if(!seats.length || !seats.some(s=>Math.abs(s.elevation-station.elevation)<4 && Math.hypot(s.x-station.x,s.y-station.y)<=80 && seatAccessClear(scene,s,[],area) && workPath(scene,area,station,s.approach)))problems.push(`${job.id}: waiting furniture ${id} needs same-floor body-clear access within 80 units of its station`);
  }
 }
 for(const a of e.accounts.filter(a=>a.visit)){
  const plan=e.visits!.find(v=>v.id===a.visit)!,job=e.jobs.find(j=>j.id===plan.work)!,home=scene.objects.find(o=>o.id===a.actor)!;if(!home)continue;
  try{const area=visitArea(scene,a);for(const id of job.waiting!)if(!worldSeats(scene).filter(s=>s.objectId===id).some(s=>seatAccessClear(scene,s,[],area) && workPath(scene,area,home,s.approach) && workPath(scene,area,s.approach,home)))problems.push(`${a.id}: ${id} needs supported outward and return visit paths`);}catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 }
 return problems;
}
export function checkVisitJourneys(state:CarState,scene:Scene){
 for(const a of state.economy!.accounts)if(a.visiting){
  const t=a.visiting,spec=scene.economy!.accounts.find(s=>s.id===a.id)!,plan=scene.economy!.visits?.find(v=>v.id===t.id),job=scene.economy!.jobs.find(j=>j.id===plan?.work),object=scene.objects.find(o=>o.id===spec.actor);
  if(!plan || spec.visit!==t.id || !job?.fee || !object || spec.actor==='player' || a.work || a.delivery || a.repair || a.courier || a.meal || a.commute || a.resting || a.shift || t.routeAtS>state.timeS+1.01)throw Error('Invalid saved service visit owner');
  const area=visitArea(scene,spec),home=actorPose(scene,object,state.timeS,{...state,economy:undefined}),seat=findSeat(scene,t.seat);
  if(walkingDistance(scene,t.home,home)>.01 || (t.phase==='home' ? !!t.seat || walkingDistance(scene,t.at,t.home)>.01 : !seat || !job.waiting!.includes(seat.objectId) || t.phase==='wait' && !seatAvailable(scene,state,seat,a.id) || !seatAccessClear(scene,seat,state.broken,area) || walkingDistance(scene,t.at,seat.approach)>.01))throw Error('Invalid saved service visit destination');
  if(t.phase==='wait' ? t.arrivedAtS===undefined || t.arrivedAtS>state.timeS || t.speed!==0 || t.path.length>0 || walkingDistance(scene,t,t.at)>.1 : t.phase==='home' && t.arrivedAtS!==undefined || t.arrivedAtS!==undefined && t.arrivedAtS>state.timeS)throw Error('Invalid saved service visit wait');
  for(const p of [t,t.at,t.home])if(!workSegment(scene,area,p,p,state,true))throw Error('Invalid saved service visit support');
  let previous=t as import('../scene/floors').WalkingPoint;for(const p of t.path){if(!workSegment(scene,area,previous,p,state,true))throw Error('Invalid saved service visit path');previous=p;}if(t.path.length && walkingDistance(scene,previous,t.at)>.01)throw Error('Invalid saved service visit path destination');
 }
}
