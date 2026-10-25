import {sceneInteriors,portalPoints,walkingHeight} from '../scene/interiors';
import {worldSeats} from '../scene/seating';
import {carFootprintClear,type CarState,type CarInput,type World} from '../sim/car';
import {stepInteractive,toggleRide,bodyWorld} from '../sim/interaction';
import {npcReviewStart} from './review-start';

/** Mock review pose only; meeting, purchased food, staff travel and seating use ordinary mechanics. */
export function* schoolReviewSteps(state:CarState,world:World,seated=true):Generator<void,CarState>{
 let next=npcReviewStart(state,world,'vendor');
 const tick=(input:CarInput={steer:0,throttle:0})=>{next=stepInteractive(next,input,1/120,world);};
 for(let i=0;i<2;i++)tick({steer:0,throttle:0,commerce:{kind:'buy',market:'market_stall',good:'bread'}});
 const parked=next.vehicles;next={...npcReviewStart(next,world,'teacher'),vehicles:parked};tick({steer:0,throttle:0,talkPressed:true});
 if(next.economy!.accounts.find(a=>a.id==='pocket')!.inventory.bread!==2 || !next.npcs.find(n=>n.id==='teacher')!.known)throw Error('School review needs paid food and an actual meeting');
 const config=world.scene.daylight!,close=((17-config.startHour+24)%24)/24*config.cycleSeconds;
 for(let i=0;next.timeS<close+1 || next.economy!.accounts.find(a=>a.id==='school_staff')!.shift?.phase!=='rest';i++){
  if(i>120*360)throw Error('Teacher could not reach the common room');tick();if(i%30===0)yield;
 }
 const room=sceneInteriors(world.scene).find(f=>f.object.id==='garden_school')!,door=portalPoints(room,room.room.portals[0]!,28),seat=worldSeats(world.scene).find(s=>s.objectId==='school_common_bench' && s.seatId==='left')!;
 next={...next,...door.outside,elevation:walkingHeight(world.scene,door.outside.x,door.outside.y),vx:0,vy:0,vz:0,headingRad:Math.PI/2};
 if(!carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))throw Error('School entrance review is blocked');
 if(!seated)return next;
 for(const target of [door.inside,seat.approach])for(let i=0;Math.hypot(next.x-target.x,next.y-target.y)>1.5;i++){
  if(i>=120*20)throw Error('School review could not walk through the doorway');
  const dx=target.x-next.x,dy=target.y-next.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480);
  tick({steer:(dx*Math.cos(a)-dy*Math.sin(a))/d,throttle:(-dx*Math.sin(a)-dy*Math.cos(a))/d});if(i%30===0)yield;
 }
 next=toggleRide(next,world);if(next.seated?.objectId!=='school_common_bench')throw Error('School review could not sit indoors');
 return next;
}
