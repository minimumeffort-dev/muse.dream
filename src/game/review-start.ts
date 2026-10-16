import {carFootprintClear,type CarState,type World} from "../sim/car";
import {drivingHeight} from "../scene/terrain";
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

/** Known clear mock-world poses for checking neutral coasting and cross-slope grip. */
export function drivingReviewStart(state:CarState,world:World,scenario:string|null):CarState {
  const district=scenario==='town' ? [6650,1500,Math.PI/2] : scenario==='suburbs' ? [1700,5750,Math.PI/2] : scenario==='sports' ? [5600,4800,Math.PI/2] : undefined;
  if(district){const [x,y,headingRad]=district as [number,number,number],elevation=drivingHeight(world.scene.terrain,x,y);
    if(carFootprintClear(world,x,y,elevation,state.timeS,state))return {...state,x,y,headingRad,elevation,vx:0,vy:0};
  }
  if(scenario!=="sidehill" && scenario!=="coast")return state;
  const hill=scenario==="sidehill",x=hill ? 1290 : state.x,y=hill ? 1360 : state.y,elevation=drivingHeight(world.scene.terrain,x,y);
  if(!carFootprintClear(world,x,y,elevation,state.timeS,state))return state;
  return {...state,x,y,elevation,headingRad:hill ? Math.PI/2 : Math.PI,vx:hill ? 0 : -80,vy:0};
}
