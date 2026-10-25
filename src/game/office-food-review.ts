import type {CarState,World} from '../sim/car';
import {stepInteractive} from '../sim/interaction';
import {npcReviewStart} from './review-start';
/** Only the observer start is seeded; wages, food, seats and cargo use real fixed ticks. */
export function* officeFoodReviewSteps(state:CarState,world:World,stage:'meal'|'delivery'='meal'):Generator<void,CarState>{
 let next=npcReviewStart(state,world,'hospital_visitor');
 for(let i=0;i<120*2400;i++){
  const a=next.economy!.accounts.find(a=>a.id==='office_clerk')!;
  if(stage==='meal' ? a.meal?.phase==='eat' && a.inventory.bread===1 : next.economy!.delivered.station_bread!>0)return next;
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;
 }
 throw Error('Office food routine did not reach '+stage);
}
