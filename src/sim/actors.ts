import type { Scene,SceneObject } from "../scene/schema";
import { routePose,routePath,type Route } from "../scene/routes";
import { drivingHeight,waterAt } from "../scene/terrain";
import { pointInPolygon } from "./mask";
import { objectRadius,objectHeight,archetypeOf } from "./archetypes";
import { controlOf } from "../scene/object-dsl";
import { playerHeight,playerRadius } from "../scene/measure";
import type {CarState} from "./car";

export interface ActorPose {id:string;x:number;y:number;elevation:number;headingRad:number;speed:number;distance:number;travelled:number;kind:"rail"|"path"|"water"|"air";vx?:number;vy?:number;pitch?:number;bank?:number}
const actors=new WeakMap<Scene,SceneObject[]>();
export function routeObjects(scene:Scene) {let objects=actors.get(scene);if(!objects){objects=scene.objects.filter(o=>o.route || controlOf(o.spec));actors.set(scene,objects);}return objects;}
export function actorPose(scene:Scene,object:SceneObject,timeS:number,state?:CarState):ActorPose {
  const control=controlOf(object.spec),route=object.route && scene.routes.find(r=>r.id===object.route!.id)!;
  const kind=control==="boat" ? "water" : control==="plane" ? "air" : route?.kind==="ambient" ? route.altitude ? "air" : "path" : route?.kind??"path";
  if(state?.control.kind==="vehicle" && state.control.id===object.id)
    return {id:object.id,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,kind,speed:Math.hypot(state.vx,state.vy),distance:state.distance,travelled:state.distance,vx:state.vx,vy:state.vy,pitch:state.pitch,bank:state.bank};
  const parked=state?.vehicles.find(v=>v.id===object.id);
  if(parked)return {...parked,id:object.id,kind,speed:0,travelled:parked.distance,vx:0,vy:0};
  if(control){
    const elevation=drivingHeight(scene.terrain,object.x,object.y),water=control==="boat" ? waterAt(scene.terrain,object.x,object.y,elevation) : undefined;
    return {id:object.id,x:object.x,y:object.y,elevation:water ? water.level-2 : elevation,headingRad:object.headingRad??0,kind,speed:0,distance:0,travelled:0,vx:0,vy:0};
  }
  const point=routePose(route!,timeS,object.route!.offset);
  return {id:object.id,...point,elevation:routeElevation(scene,route!,point,point.distance),kind,vx:Math.cos(point.headingRad)*point.speed,vy:Math.sin(point.headingRad)*point.speed};
}
export function routeElevation(scene:Scene,route:Route,point:{x:number;y:number},distance:number) {
  let elevation=drivingHeight(scene.terrain,point.x,point.y);
  if(route.kind==="water"){
    const water=scene.terrain.landscape?.waters.find(w=>pointInPolygon(point.x,point.y,w.polygon));
    if(water)elevation=water.level-2; // Invalid proposals still reach the playability diagnostic.
  }
  if(route.kind==="air"){
    const {length}=routePath(route),ramp=Math.max(0,Math.min(1,Math.min(distance,length-distance)/180));
    elevation+=route.altitude!*ramp*ramp*(3-2*ramp);
  }
  if(route.kind==="ambient")elevation+=route.altitude??0;
  return elevation;
}
export function actorPoses(scene:Scene,timeS:number,state?:CarState) {return routeObjects(scene).map(o=>actorPose(scene,o,timeS,state));}
export function actorContacts(scene:Scene,timeS:number,state?:CarState) {
  const contacts=routeObjects(scene).filter(o=>archetypeOf(o).interaction!=="decor" && !(state?.control.kind==="vehicle" && state.control.id===o.id)).map(object=>{
    const p=actorPose(scene,object,timeS,state);return {...p,r:objectRadius(object),bottom:p.elevation,top:p.elevation+objectHeight(object),vx:p.vx??0,vy:p.vy??0};
  });
  const parked=state?.vehicles.find(v=>v.id===null);
  if(parked && state?.control.kind!=="car")contacts.push({...parked,id:"@player",kind:"path",speed:0,travelled:parked.distance,r:playerRadius(scene),bottom:parked.elevation,top:parked.elevation+playerHeight(scene),vx:0,vy:0});
  return contacts;
}
