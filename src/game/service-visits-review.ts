import type {CarState,World} from '../sim/car';
import {stepInteractive} from '../sim/interaction';
import {commerceReason} from '../sim/commerce';
import {towerRoomReviewSteps} from './tower-room-review';
/** Only the observer start is seeded. Walking, seats, demand, wages and fees use ordinary fixed ticks. */
export function* serviceVisitsReviewSteps(state:CarState,world:World,stage:'ready'|'served'='ready'):Generator<void,CarState>{
 const tour=towerRoomReviewSteps(state,world);let result=tour.next();while(!result.done){yield;result=tour.next();}let next=result.value;
 const job=world.scene.economy!.jobs.find(j=>j.id==='check_records')!;if(!job.fee)throw Error('The visit review needs a paid service');
 for(let i=0;i<120*300;i++){
  const staff=next.economy!.accounts.find(a=>a.id==='office_clerk')!;
  if(staff.commute?.phase==='idle' && !commerceReason(next,world.scene,'pocket',{kind:'request',job:job.id}))break;
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;
  if(i===120*300-1)throw Error('The paid-service review did not reach an available desk');
 }
 if(stage==='ready')return next;
 next=stepInteractive(next,{steer:0,throttle:0,commerce:{kind:'request',job:job.id}},1/120,world);
 for(let i=0;i<120*150;i++){
  if(next.economy!.accounts.find(a=>a.id==='pocket')!.visits![job.id]!.completed===1)return next;
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;
 }
 throw Error('The paid-service review did not complete a real customer request');
}
