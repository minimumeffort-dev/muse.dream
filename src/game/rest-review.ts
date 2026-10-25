import {homeReviewStart,homeReviewInput} from './home-review';
import {worldSeats} from '../scene/seating';
import {walkingHeight} from '../scene/interiors';
import {carFootprintClear,type CarState,type World} from '../sim/car';
import {stepInteractive,bodyWorld} from '../sim/interaction';

/** Only seed the player's initial approach; resident food, energy and travel remain ordinary. */
export function* restReviewSteps(state:CarState,world:World):Generator<void,CarState>{
 const entrance=homeReviewStart(state,world);
 let next={...entrance,x:entrance.x+24,elevation:walkingHeight(world.scene,entrance.x+24,entrance.y)};
 if(!carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))throw Error('Rest review approach is blocked');
 // Seated meals recover energy too, so ordinary tiredness can begin after five minutes.
 for(let i=0;i<120*360;i++){
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);
  const regular=next.economy!.accounts.find(a=>a.id==='regular')!;
  if(regular.resting?.phase==='sit'){
   const seat=worldSeats(world.scene).find(s=>s.objectId==='home_settee' && s.seatId!==regular.resting!.seat!.seatId)!,angle=Math.atan2(180,480);
   for(let j=0;j<120*3;j++){
    const dx=entrance.x-next.x,dy=entrance.y-next.y,d=Math.hypot(dx,dy);if(d<1.5)break;
    next=stepInteractive(next,{steer:(dx*Math.cos(angle)-dy*Math.sin(angle))/d,throttle:(-dx*Math.sin(angle)-dy*Math.cos(angle))/d},1/120,world);if(j%30===0)yield;
   }
   for(let frame=0;frame<225;frame++){for(let j=0;j<4;j++)next=stepInteractive(next,homeReviewInput(next,world,frame,0,seat.seatId),1/120,world);if(frame%8===0)yield;}
   if(Math.hypot(next.x-seat.approach.x,next.y-seat.approach.y)>2)throw Error('Player could not walk to the adjacent free rest seat');
   return next;
  }
  if(i%30===0)yield;
 }
 throw Error('Resident did not reach a home seat to rest: '+JSON.stringify(next.economy!.accounts.find(a=>a.id==='regular')));
}
