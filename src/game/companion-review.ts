import type {CarState,World} from '../sim/car';
import {stepInteractive} from '../sim/interaction';
import {npcReviewStart} from './review-start';

/** Seed only an observation pose; residents earn, buy, meet and return through real ticks. */
export function* companionReviewSteps(state:CarState,world:World,stage:'out'|'eat'|'paid'|'returned'='out'):Generator<CarState,CarState>{
 let next=npcReviewStart(state,world,'vendor');
 for(let i=0;i<120*2400;i++){
  const e=next.economy!,t=e.gathering,paid=Object.values(e.peerHistory??{}).some(h=>h.meals>0);
  if(stage==='out' ? !!t : stage==='eat' ? t?.phase==='eat' : stage==='paid' ? paid : paid && !t)return next;
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield next;
 }
 throw Error('No resident meal reached the requested stage within forty simulation minutes');
}
