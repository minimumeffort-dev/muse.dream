import type {CarState,World} from '../sim/car';
import {carFootprintClear} from '../sim/car';
import {stepInteractive,bodyWorld,toggleRide} from '../sim/interaction';
import {sceneInteriors,portalPoints,walkingHeight} from '../scene/interiors';
import {sceneFloors} from '../scene/floors';
import {worldSeats} from '../scene/seating';
import {upstairsInput} from './upstairs-review';

/** Only an exterior observer pose is seeded; feet, stairs and seating use ordinary controls. */
export function residentialRoomReviewStart(state:CarState,world:World):CarState{
 const room=sceneInteriors(world.scene).find(r=>r.object.id==='station_quarter_residences');
 if(!room)throw Error('The residential review needs Copper Court');
 const at=portalPoints(room,room.room.portals[0]!,30).outside;
 const next:CarState={...state,...at,elevation:walkingHeight(world.scene,at.x,at.y),control:{kind:'foot'},vx:0,vy:0,vz:0,grounded:true,vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:state.distance}]};
 if(!carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))throw Error('The residential review start is obstructed');return next;
}
export function residentialRoomReviewPath(world:World,returning=false){
 const room=sceneInteriors(world.scene).find(r=>r.object.id==='station_quarter_residences')!,seat=worldSeats(world.scene).find(s=>s.objectId==='station_quarter_lounge_seat')!;
 const landing=([[-20,16],[-31,16],[-31,-24],[0,-24]] as const).map(([x,z])=>room.toWorld(x,z)),side={x:seat.approach.x+24,y:seat.approach.y};
 return returning ? [side,...landing,portalPoints(room,room.room.portals[0]!,30).outside] : [...landing.reverse(),side,seat.approach];
}
export function* residentialRoomReviewSteps(state:CarState,world:World,stage:'seat'|'return'='seat'):Generator<CarState,CarState>{
 let next=residentialRoomReviewStart(state,world);
 function* walk(points:{x:number;y:number}[]):Generator<CarState,void>{
  for(const p of points){let i=0;for(;i<120*20 && Math.hypot(next.x-p.x,next.y-p.y)>1.1;i++){
   next=stepInteractive(next,upstairsInput(next,p.x,p.y),1/120,world);if(i%4===0)yield next;
  }if(i===120*20)throw Error('Residential path blocked: '+JSON.stringify({target:p,x:next.x,y:next.y,elevation:next.elevation}));}
 }
 yield* walk(residentialRoomReviewPath(world));
 const floor=sceneFloors(world.scene).find(f=>f.id==='home_lounge')!;
 if(Math.abs(next.elevation-floor.elevation)>.1)throw Error('The player did not climb the residential stairs');
 for(let i=0;i<24;i++)next=stepInteractive(next,{steer:0,throttle:0},1/120,world);
 next=toggleRide(next,world);if(next.seated?.objectId!=='station_quarter_lounge_seat')throw Error('The residential lounge bench is not usable');
 if(stage==='seat')return next;
 next=toggleRide(next,world);yield* walk(residentialRoomReviewPath(world,true));return next;
}
