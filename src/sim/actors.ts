import type { Scene,SceneObject } from "../scene/schema";
import { routePose,routePath,type Route } from "../scene/routes";
import { drivingHeight } from "../scene/terrain";
import { pointInPolygon } from "./mask";
import { objectRadius,objectHeight } from "./archetypes";

export interface ActorPose {id:string;x:number;y:number;elevation:number;headingRad:number;speed:number;distance:number;travelled:number;kind:"rail"|"path"|"water"|"air"}
const actors=new WeakMap<Scene,SceneObject[]>();
export function routeObjects(scene:Scene) {let objects=actors.get(scene);if(!objects){objects=scene.objects.filter(o=>o.route);actors.set(scene,objects);}return objects;}
export function actorPose(scene:Scene,object:SceneObject,timeS:number):ActorPose {
  const route=scene.routes.find(r=>r.id===object.route!.id)!,point=routePose(route,timeS,object.route!.offset);
  return {id:object.id,...point,elevation:routeElevation(scene,route,point,point.distance),kind:route.kind};
}
export function routeElevation(scene:Scene,route:Route,point:{x:number;y:number},distance:number) {
  let elevation=drivingHeight(scene.terrain,point.x,point.y);
  if(route.kind==="water") elevation=scene.terrain.landscape!.waters.find(w=>pointInPolygon(point.x,point.y,w.polygon))!.level-2;
  if(route.kind==="air"){
    // A bounded takeoff/landing envelope brings the plane back to its boarding stop.
    const {length}=routePath(route);
    const ramp=Math.max(0,Math.min(1,Math.min(distance,length-distance)/180));
    elevation+=route.altitude!*ramp*ramp*(3-2*ramp);
  }
  return elevation;
}
export function actorPoses(scene:Scene,timeS:number) {return routeObjects(scene).map(o=>actorPose(scene,o,timeS));}
export function actorContacts(scene:Scene,timeS:number) {
  return routeObjects(scene).map(object=>{
    const p=actorPose(scene,object,timeS);return {...p,r:objectRadius(object),bottom:p.elevation,top:p.elevation+objectHeight(object),vx:Math.cos(p.headingRad)*p.speed,vy:Math.sin(p.headingRad)*p.speed};
  });
}
