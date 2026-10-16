import type {CarState,World} from "../sim/car";
import {actorPose,routeObjects} from "../sim/actors";
import {toggleRide} from "../sim/interaction";
import {controlOf} from "../scene/object-dsl";

/** Development inspection links start beside a vehicle using the real exit rules. */
export function vehicleReviewStart(state:CarState,world:World,id:string|null):CarState {
  const object=routeObjects(world.scene).find(o=>o.id===id && controlOf(o.spec));if(!object)return state;
  const pose=actorPose(world.scene,object,0);
  return toggleRide({...state,x:pose.x,y:pose.y,elevation:pose.elevation,headingRad:pose.headingRad,control:{kind:"vehicle",id:object.id},
    vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]},world);
}
