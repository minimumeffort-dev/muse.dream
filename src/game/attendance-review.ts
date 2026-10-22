import {npcReviewStart} from './review-start';
import {attendanceEnd} from '../sim/attendance';
import {stepInteractive,bodyWorld} from '../sim/interaction';
import {carFootprintClear,type CarState,type World,type CarInput} from '../sim/car';
import {walkingHeight} from '../scene/interiors';
/** Only the player's counter approach is seeded; resident travel, rest, demand and wages use ordinary ticks. */
export function* attendanceReviewSteps(state:CarState,world:World,stage:'idle'|'work'|'closing'|'home'='work'):Generator<void,CarState>{
 let next=npcReviewStart(state,world,'vendor');const vendor=world.scene.objects.find(o=>o.id==='vendor')!;
 next={...next,x:vendor.x-36,y:vendor.y,elevation:walkingHeight(world.scene,vendor.x-36,vendor.y)};
 if(!carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))throw Error('Attendance review counter is blocked');
 let bought=false,worked=false,closingAtS:number|undefined;
 for(let i=0;i<120*600;i++){
  const regular=next.economy!.accounts.find(a=>a.id==='regular')!,baker=next.economy!.accounts.find(a=>a.id==='baker')!,pocket=next.economy!.accounts.find(a=>a.id==='pocket')!,market=next.economy!.markets.find(m=>m.id==='market_stall')!,trip=regular.commute;
  if(trip?.phase==='idle' && trip.dutyAtS!==undefined){
   if(stage==='idle')return next;
   closingAtS??=attendanceEnd(world.scene,world.scene.economy!.accounts.find(a=>a.id==='regular')!.attendance!,trip.dutyAtS);
  }
  if(stage==='home' && worked && !trip)return next;
  if(trip?.phase==='work'){
   worked=true;
   if(stage==='closing' && regular.work!.doneAtS<=closingAtS!)throw Error('Review batch needs to finish after the attendance window');
   if(stage!=='home')return next;
  }
  let input:CarInput={steer:0,throttle:0};
  if(trip?.phase==='idle' && (stage!=='closing' || next.timeS>=closingAtS!-4)){
   if(!bought){input.commerce={kind:'buy',market:'market_stall',good:'lunch'};bought=true;}
   else if(baker.work?.id==='pack_lunch' && market.stock.bread!>=3 && pocket.credits>=5)input.commerce={kind:'buy',market:'market_stall',good:'bread'};
  }
  next=stepInteractive(next,input,1/120,world);if(i%30===0)yield;
 }
 throw Error('Resident did not reach its scheduled work: '+JSON.stringify({time:next.timeS,regular:next.economy!.accounts.find(a=>a.id==='regular')}));
}
