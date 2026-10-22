import {sceneInteriors,portalPoints,walkingHeight} from '../scene/interiors';
import {worldSeats} from '../scene/seating';
import {carFootprintClear,type CarState,type CarInput,type World} from '../sim/car';
import {bodyWorld} from '../sim/interaction';

/** Dev-only review pose; the walkthrough and seating use ordinary controls. */
export function homeReviewStart(state:CarState,world:World):CarState{
 const room=sceneInteriors(world.scene).find(f=>f.object.id==='oldtown_044')!,p=portalPoints(room,room.room.portals[0]!,20).outside;
 const next:CarState={...state,control:{kind:'foot'},...p,elevation:walkingHeight(world.scene,p.x,p.y),vx:0,vy:0,vz:0,grounded:true,headingRad:-Math.PI/2,vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
 if(!carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))throw Error('Home review entrance is blocked');
 return next;
}
export function homeReviewInput(state:CarState,world:World,frame:number,viewAngle=0):CarInput{
 if(state.seated)return {steer:0,throttle:0};
 const room=sceneInteriors(world.scene).find(f=>f.object.id==='oldtown_044')!,seat=worldSeats(world.scene).find(s=>s.objectId==='home_settee' && s.seatId==='left')!;
 const target=frame<60 ? portalPoints(room,room.room.portals[0]!,14).inside : frame<135 ? room.toWorld(0,0) : seat.approach;
 const dx=target.x-state.x,dy=target.y-state.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480)+viewAngle;
 return {steer:d>1.5 ? (dx*Math.cos(a)-dy*Math.sin(a))/d : 0,throttle:d>1.5 ? (-dx*Math.sin(a)-dy*Math.cos(a))/d : 0};
}
