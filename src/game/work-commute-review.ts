import {attendanceReviewSteps} from './attendance-review';
import {npcReviewStart} from './review-start';
import {stepInteractive,bodyWorld} from '../sim/interaction';
import {carFootprintClear} from '../sim/car';
import {walkingHeight} from '../scene/interiors';
import type {CarInput,CarState,World} from '../sim/car';

/** Only the player's initial pose is seeded; demand, travel and pay use ordinary mechanics. */
export function* workCommuteReviewSteps(state:CarState,world:World,stage:'work'|'home'='work'):Generator<void,CarState>{
 if(world.scene.economy?.accounts.find(a=>a.id==='regular')?.attendance)return yield* attendanceReviewSteps(state,world,stage);
 let next=npcReviewStart(state,world,'vendor'),bought=false;
 const vendor=world.scene.objects.find(o=>o.id==='vendor')!;next={...next,x:vendor.x-36,y:vendor.y,elevation:walkingHeight(world.scene,vendor.x-36,vendor.y)};
 if(!carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))throw Error('Work review counter approach is blocked');
 const tick=(input:CarInput={steer:0,throttle:0})=>{next=stepInteractive(next,input,1/120,world);};
 for(let i=0;i<120*360;i++){
  const regular=next.economy!.accounts.find(a=>a.id==='regular')!,baker=next.economy!.accounts.find(a=>a.id==='baker')!,pocket=next.economy!.accounts.find(a=>a.id==='pocket')!,market=next.economy!.markets.find(m=>m.id==='market_stall')!;
  if(stage==='work' && regular.commute?.phase==='work' || stage==='home' && !regular.commute && regular.completed.work.bake!>0)return next;
  if(!bought && !regular.meal && !regular.resting && !regular.commute && next.economy!.consumed.lunch!>0){tick({steer:0,throttle:0,commerce:{kind:'buy',market:'market_stall',good:'lunch'}});bought=true;}
  // Packing holds one bread of refund room against the bake target of four.
  else if(bought && !regular.commute && baker.work?.id==='pack_lunch' && market.stock.bread!>=3 && pocket.credits>=5)tick({steer:0,throttle:0,commerce:{kind:'buy',market:'market_stall',good:'bread'}});
  else tick();
  if(i%30===0)yield;
 }
 throw Error('Commuter did not complete the requested ordinary work review: '+JSON.stringify({time:next.timeS,regular:next.economy!.accounts.find(a=>a.id==='regular'),baker:next.economy!.accounts.find(a=>a.id==='baker'),pocket:next.economy!.accounts.find(a=>a.id==='pocket'),market:next.economy!.markets.find(m=>m.id==='market_stall')}));
}
