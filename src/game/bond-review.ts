import {workstation} from '../scene/workstations';
import type {CarState,World} from '../sim/car';
import {stepInteractive,toggleRide} from '../sim/interaction';
import {socialArea} from '../sim/social';
import {marketIsOpen,marketIsStaffed} from '../sim/market-hours';
import {commerceReason,workQualified} from '../sim/commerce';
import {courierApproach} from '../sim/courier';
import {sharedMealReviewSteps} from './review-start';
import {walkReviewSteps} from './walk-review';

/** No history, food, income or qualification is seeded; only the initial player observation pose. */
export function* bondReviewSteps(state:CarState,world:World,stage:'meal'|'ready'|'paid'='ready'):Generator<void,CarState>{
 let next=yield* sharedMealReviewSteps(state,world),seen=false;
 const scene=world.scene,job=scene.economy!.jobs.find(j=>j.id==='large_bake')!,market=scene.economy!.markets.find(m=>m.id===job.market)!;
 const player=()=>next.economy!.accounts.find(a=>a.id==='pocket')!;
 if(workQualified(next,scene,'pocket',job) || player().completed.work.bake)throw Error('Recipe review needs an unqualified player');
 next=stepInteractive(next,{steer:0,throttle:0,commerce:{kind:'share',partner:'baker'}},1/120,world);
 if(!next.economy!.shared)throw Error('Recipe review could not start its real shared meal');
 for(let i=0;i<120*300;i++){
  const meal=next.economy!.shared;seen ||= meal?.phase==='eat';
  if(stage==='meal' && seen && meal?.phase==='eat')return next;
  if(!meal && seen && marketIsOpen(scene,market,next.timeS) && marketIsStaffed(scene,market,next.economy!))break;
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;
 }
 if(!seen || next.economy!.shared || !workQualified(next,scene,'pocket',job) || player().completed.work.bake)throw Error('Recipe review did not earn its relationship qualification');
 next=toggleRide(next,world);
 const social=scene.economy!.socials.find(p=>p.id==='hall_break')!,area=socialArea(scene,'baker'),approach=courierApproach(scene,social,market.id,next,next,area);
 if(!approach)throw Error('Recipe review needs a connected counter approach');
 next=yield* walkReviewSteps(next,world,area,workstation(scene,job.station)??approach.end);
 for(let i=0;i<120*30 && commerceReason(next,scene,'pocket',{kind:'work',job:job.id})==='busy';i++){next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;}
 const reason=commerceReason(next,scene,'pocket',{kind:'work',job:job.id});if(reason)throw Error('Recipe review cannot take the earned job: '+reason);
 if(stage==='ready')return next;
 const credits=player().credits;next=stepInteractive(next,{steer:0,throttle:0,commerce:{kind:'work',job:job.id}},1/120,world);
 for(let i=0;i<120*20 && player().work;i++){next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;}
 if(player().completed.work.large_bake!==1 || player().credits!==credits+job.pay || player().completed.work.bake)throw Error('Recipe review needs exactly one paid larger batch');
 return next;
}
