import type {CarState,World} from '../sim/car';
import {stepInteractive} from '../sim/interaction';
import {commerceReason,serviceProgress} from '../sim/commerce';
import {officeWorkReviewSteps} from './office-work-review';
/** Walk, earn every task and wait using actual fixed ticks; no quota, pay or clock is seeded. */
export function* recurringWorkReviewSteps(state:CarState,world:World):Generator<void,CarState>{
 let next=yield* officeWorkReviewSteps(state,world);const job=world.scene.economy!.jobs.find(j=>j.id==='check_records')!,until=serviceProgress(next.economy!,job).nextAtS!-4;
 for(let i=0;i<120*1200;i++){
  const progress=serviceProgress(next.economy!,job),player=next.economy!.accounts.find(a=>a.id==='pocket')!;
  if(next.timeS>=until){if(progress.remaining || player.work || progress.completed!==job.target)throw Error('Recurring work review did not exhaust the shared period');return next;}
  const action=progress.remaining>0 && !player.work && !commerceReason(next,world.scene,player.id,{kind:'work',job:job.id}) ? {kind:'work' as const,job:job.id} : undefined;
  next=stepInteractive(next,{steer:0,throttle:0,...(action ? {commerce:action} : {})},1/120,world);if(i%30===0)yield;
 }
 throw Error('Recurring work review did not reach its boundary');
}
