import {sceneInteriors,portalPoints} from '../scene/interiors';
import type {CarInput,CarState,World} from '../sim/car';
import {stepInteractive} from '../sim/interaction';
import {homeReviewStart} from './home-review';
function targetInput(state:CarState,x:number,y:number,viewAngle=0):CarInput{
 const dx=x-state.x,dy=y-state.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480)+viewAngle;
 return {steer:d>1 ? (dx*Math.cos(a)-dy*Math.sin(a))/d : 0,throttle:d>1 ? (-dx*Math.sin(a)-dy*Math.cos(a))/d : 0};
}
/** Only the outside review pose is seeded; all doors, steps and landings use ordinary fixed ticks. */
export function* stairsReviewSteps(state:CarState,world:World,upstairs=true):Generator<void,CarState>{
 let next=homeReviewStart(state,world);const room=sceneInteriors(world.scene).find(r=>r.object.id==='oldtown_044')!;
 const points=[portalPoints(room,room.room.portals[0]!,14).inside,room.toWorld(0,-13),room.toWorld(6,-13),...(upstairs ? [room.toWorld(6,13.5),room.toWorld(0,13.5),room.toWorld(0,0)] : [])];
 for(const p of points){let i=0;for(;i<120*15 && Math.hypot(next.x-p.x,next.y-p.y)>1.1;i++){next=stepInteractive(next,targetInput(next,p.x,p.y),1/120,world);if(i%16===0)yield;}if(i===120*15)throw Error('Stair review path was blocked');}
 return next;
}
export function stairsReviewInput(state:CarState,world:World,frame:number,viewAngle=0):CarInput{
 const room=sceneInteriors(world.scene).find(r=>r.object.id==='oldtown_044')!,p=frame<120 ? room.toWorld(6,13.5) : frame<165 ? room.toWorld(0,13.5) : frame<210 ? room.toWorld(6,13.5) : room.toWorld(6,-13);
 return targetInput(state,p.x,p.y,viewAngle);
}
