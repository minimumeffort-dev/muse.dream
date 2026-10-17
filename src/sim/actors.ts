import {walkingHeight} from '../scene/interiors';
import {objectContacts} from "../scene/contacts";
import type { Scene,SceneObject } from "../scene/schema";
import { routePose,routePath,type Route } from "../scene/routes";
import { drivingHeight,waterAt,terrainHeight } from "../scene/terrain";
import { pointInPolygon } from "./mask";
import { objectRadius,objectHeight,archetypeOf } from "./archetypes";
import { controlOf } from "../scene/object-dsl";
import {controlFor,isResidentActor,isParkedVehicle,behaviorFor} from '../scene/agents';
import {initialNpcState} from './npcs';
import {objectPlacement} from '../scene/placement';
import { playerHeight,playerRadius } from "../scene/measure";
import {aircraftFloor} from '../scene/aircraft-support';
import type {CarState} from "./car";
import {parkingDefinitions} from './parking';

export interface ActorPose {id:string;x:number;y:number;elevation:number;headingRad:number;speed:number;distance:number;travelled:number;kind:"rail"|"path"|"water"|"air";vx?:number;vy?:number;pitch?:number;bank?:number;activity?:'idle'|'patrol'|'perform';animationTimeS?:number;stateId?:string}
const actors=new WeakMap<Scene,SceneObject[]>();
export function routeObjects(scene:Scene) {let objects=actors.get(scene);if(!objects){objects=scene.objects.filter(isResidentActor);actors.set(scene,objects);}return objects;}
const bases=new WeakMap<Scene,Map<string,number>>();
const journeyOwners=new WeakMap<Scene,Map<string,string>>();
export function workJourneyForActor(state:CarState|undefined,scene:Scene,id:string){let owners=journeyOwners.get(scene);if(!owners){owners=new Map(scene.economy?.accounts.filter(a=>a.repair || a.repairs?.length || a.deliveries?.length).map(a=>[a.actor,a.id]));journeyOwners.set(scene,owners);}const account=owners.get(id);const a=account ? state?.economy?.accounts.find(a=>a.id===account) : undefined;return a?.repair??a?.courier;}
export function actorPose(scene:Scene,object:SceneObject,timeS:number,state?:CarState):ActorPose {
  const control=controlFor(object),route=object.route && scene.routes.find(r=>r.id===object.route!.id)!,program=behaviorFor(scene,object);
  const profile=controlOf(object.spec);
  const kind=profile==="boat" ? "water" : profile==="plane" ? "air" : route?.kind==="ambient" ? route.altitude ? "air" : "path" : route?.kind==="walk" || route?.kind==="street" ? "path" : route?.kind==="tram" ? "rail" : route?.kind??"path";
  if(state?.control.kind==="vehicle" && state.control.id===object.id)
    return {id:object.id,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,kind,speed:Math.hypot(state.vx,state.vy),distance:state.distance,travelled:state.distance,vx:state.vx,vy:state.vy,pitch:state.pitch,bank:state.bank};
  const parked=state?.vehicles.find(v=>v.id===object.id);
  if(parked)return {...parked,id:object.id,kind,speed:0,travelled:parked.distance,vx:0,vy:0};
  if(control){
    let heights=bases.get(scene);if(!heights){heights=new Map();bases.set(scene,heights);}
    let elevation=heights.get(object.id);
    if(elevation===undefined){elevation=control==='plane' ? aircraftFloor(scene,object,{x:object.x,y:object.y,headingRad:object.headingRad??0,pitch:0,bank:0}) : control==='boat' ? terrainHeight(scene.terrain,object.x,object.y) : object.parked ? objectPlacement(scene,object).base : drivingHeight(scene.terrain,object.x,object.y);heights.set(object.id,elevation);}
    const water=control==="boat" ? waterAt(scene.terrain,object.x,object.y,elevation) : undefined;
    return {id:object.id,x:object.x,y:object.y,elevation:water ? water.level-2 : elevation,headingRad:object.headingRad??0,kind,speed:0,distance:0,travelled:0,vx:0,vy:0};
  }
  const maintenance=workJourneyForActor(state,scene,object.id);
  if(maintenance)return {id:object.id,x:maintenance.x,y:maintenance.y,elevation:walkingHeight(scene,maintenance.x,maintenance.y),headingRad:maintenance.headingRad,speed:maintenance.speed,distance:maintenance.distance,travelled:maintenance.distance,kind,activity:maintenance.phase==='work' ? 'perform' : 'patrol',animationTimeS:timeS,vx:0,vy:0};
  if(program){
    const clock=state?.npcs?.find(n=>n.id===object.id)??initialNpcState(scene,object),active=program.states.find(s=>s.id===clock.stateId)!;
    const point=route ? routePose(route,clock.routeTimeS+(object.route!.phaseS??0),object.route!.offset) : {x:object.x,y:object.y,distance:0,travelled:0};
    let heights=bases.get(scene);if(!heights){heights=new Map();bases.set(scene,heights);}let base=heights.get(object.id);if(base===undefined){base=objectPlacement(scene,object).base;heights.set(object.id,base);}
    const speed=active.action==='patrol' && 'speed' in point ? point.speed : 0;
    return {id:object.id,...point,elevation:route ? routeElevation(scene,route,point,point.distance) : base,headingRad:clock.headingRad,speed,kind,activity:active.action,animationTimeS:clock.animationTimeS,stateId:clock.stateId,vx:Math.cos(clock.headingRad)*speed,vy:Math.sin(clock.headingRad)*speed};
  }
  const point=routePose(route!,timeS+(object.route!.phaseS??0),object.route!.offset);
  return {id:object.id,...point,elevation:routeElevation(scene,route!,point,point.distance),kind,vx:Math.cos(point.headingRad)*point.speed,vy:Math.sin(point.headingRad)*point.speed};
}
export function routeElevation(scene:Scene,route:Route,point:{x:number;y:number},distance:number) {
  let elevation=route.kind==='walk' ? walkingHeight(scene,point.x,point.y) : drivingHeight(scene.terrain,point.x,point.y);
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
export function actorPoses(scene:Scene,timeS:number,state?:CarState) {const active=state?.control.kind==='vehicle' ? parkingDefinitions(scene).byId.get(state.control.id) : undefined;return [...routeObjects(scene),...(isParkedVehicle(active) ? [active!] : [])].map(o=>actorPose(scene,o,timeS,state));}
export function actorContacts(scene:Scene,timeS:number,state?:CarState) {
  const contacts=routeObjects(scene).filter(o=>archetypeOf(o).interaction!=="decor" && !(state?.control.kind==="vehicle" && state.control.id===o.id)).flatMap(object=>{
    const p=actorPose(scene,object,timeS,state);return objectContacts(scene,object,p).map(c=>({...p,...c,id:object.id,vx:p.vx??0,vy:p.vy??0}));
  });
  const parked=state?.vehicles.find(v=>v.id===null);
  if(parked && state?.control.kind!=="car")contacts.push({...parked,id:"@player",kind:"path",speed:0,travelled:parked.distance,r:playerRadius(scene),bottom:parked.elevation,top:parked.elevation+playerHeight(scene),vx:0,vy:0});
  return contacts;
}
