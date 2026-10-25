import type {CarState,World} from '../sim/car';
import {stepInteractive,toggleRide} from '../sim/interaction';
import {workstation} from '../scene/workstations';
import {commerceReason} from '../sim/commerce';
import {towerRoomReviewStart,towerRoomReviewPath,towerRoomReviewSteps} from './tower-room-review';
import {walkReviewSteps} from './walk-review';
import {deliveryArea} from '../sim/courier';
import {upstairsInput} from './upstairs-review';

/** Seed the observer only; actual feet, stairs, claims, clocks and wages remain engine-owned. */
export function* officeWorkReviewSteps(state:CarState,world:World,stage:'ready'|'npc'='ready'):Generator<void,CarState>{
 let next=state;
 if(stage==='npc'){
  const tour=towerRoomReviewSteps(state,world);let r=tour.next();while(!r.done){yield;r=tour.next();}next=r.value;
  for(let i=0;i<120*300;i++){
   if(next.economy!.accounts.find(a=>a.id==='office_clerk')!.work?.id==='check_records'){
    next=toggleRide(next,world);const station=workstation(world.scene,'office_records')!,plan=world.scene.economy!.stations!.find(s=>s.id===station.id)!;
    return yield* walkReviewSteps(next,world,deliveryArea(plan),{x:station.x+14,y:station.y,elevation:station.elevation});
   }
   next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;
  }
  throw Error('Office resident did not reach paid work');
 }
 next=towerRoomReviewStart(state,world);
 const end=workstation(world.scene,'office_records')!,path=[...towerRoomReviewPath(world).slice(0,-2),end];
 for(const p of path){let i=0;for(;i<120*20&&Math.hypot(next.x-p.x,next.y-p.y)>.15;i++){
  next=stepInteractive(next,upstairsInput(next,p.x,p.y),1/120,world);if(i%30===0)yield;
 }if(i===120*20)throw Error('Office approach is blocked');}
 for(let i=0;i<24;i++)next=stepInteractive(next,{steer:0,throttle:0},1/120,world);
 const reason=commerceReason(next,world.scene,'pocket',{kind:'work',job:'check_records'});
 if(reason)throw Error('Office work unavailable: '+reason);return next;
}
