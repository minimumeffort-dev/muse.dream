import {playerHeight} from '../scene/measure';
import {sceneInteriors,walkingHeight} from '../scene/interiors';
import {carFootprintClear,type CarState,type World} from './car';
import {bodyWorld} from './interaction';
import {objectHeight} from './archetypes';

/** Registered r93 geometry upgrade only: the new narrow door must not trap saved vehicles. */
export function homeVehicles(state:CarState,world:World):CarState{
 const room=sceneInteriors(world.scene).find(r=>r.object.id==='oldtown_044');if(!room)return state;
 let result=state;
 const relocate=(probe:CarState,protectPlayer:boolean):CarState=>{
  const body=bodyWorld(probe,world),radius=body.carRadius,height=body.bodyHeight??playerHeight(world.scene);
  if(!probe.grounded || !room.contains(probe.x,probe.y,-radius-1) || probe.elevation>=objectHeight(room.object) || probe.elevation+height<=room.floor)return probe;
  const supported=walkingHeight(world.scene,probe.x,probe.y,radius),raised={...probe,elevation:supported};
  if(Math.abs(supported-probe.elevation)<=4.05 && room.room.portals.some(p=>p.width*room.object.scale>=radius*2+.5 && p.height*room.object.scale>=height+.5) && carFootprintClear(body,probe.x,probe.y,supported,probe.timeS,raised))return supported===probe.elevation ? probe : raised;
  const player=bodyWorld(result,world),protectedHeight=player.bodyHeight??playerHeight(world.scene);
  for(let distance=1;distance<=64;distance++)for(let side=0;side<16;side++){
   const angle=side*Math.PI/8,x=probe.x+Math.cos(angle)*distance,y=probe.y+Math.sin(angle)*distance;
   if(room.contains(x,y,-radius-1))continue;
   const elevation=walkingHeight(world.scene,x,y,radius);
   if(Math.abs(elevation-probe.elevation)>4.05 || protectPlayer && elevation<result.elevation+protectedHeight && elevation+height>result.elevation && Math.hypot(x-result.x,y-result.y)<radius+player.carRadius+1)continue;
   const next={...probe,x,y,elevation,vx:0,vy:0,vz:0};
   if(carFootprintClear(body,x,y,elevation,probe.timeS,next))return next;
  }
  throw Error('This update cannot preserve a saved vehicle near the new home.');
 };
 if(result.control.kind==='car' || result.control.kind==='vehicle')result=relocate(result,false);
 for(const parked of state.vehicles){
  const active=result.control.kind==='car' || result.control.kind==='vehicle' ? {id:result.control.kind==='car' ? null : result.control.id,x:result.x,y:result.y,elevation:result.elevation,headingRad:result.headingRad,distance:result.distance} : undefined;
  const probe={...result,...parked,grounded:true,seated:undefined,control:parked.id===null ? {kind:'car' as const} : {kind:'vehicle' as const,id:parked.id},vehicles:[...result.vehicles.filter(v=>v.id!==parked.id),...(active ? [active] : [])]};
  const next=relocate(probe,true);
  if(next!==probe)result={...result,vehicles:result.vehicles.map(v=>v.id===parked.id ? {...v,x:next.x,y:next.y,elevation:next.elevation} : v)};
 }
 return result;
}
