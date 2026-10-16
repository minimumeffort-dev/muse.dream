import {carFootprintClear,type CarState,type World} from "../sim/car";
import {drivingHeight,terrainHeight,waterAt} from "../scene/terrain";
import {actorPose,routeObjects} from "../sim/actors";
import {toggleRide,bodyWorld,FOOT_HEIGHT} from "../sim/interaction";
import {controlFor} from "../scene/agents";

/** Real mock-world positions for exercising jumping, swimming and bridge navigation. */
export function movementReviewStart(state:CarState,world:World,scenario:string|null):CarState {
  if(scenario==='walk')return toggleRide(state,world);
  if(scenario!=='swim' && scenario!=='boat-bridge')return state;
  const boat=scenario==='boat-bridge',x=8750,y=boat ? 2100 : 3350,water=waterAt(world.scene.terrain,x,y,terrainHeight(world.scene.terrain,x,y));
  if(!water)return state;
  const next:CarState={...state,control:boat ? {kind:'vehicle',id:'canal_launch'} : {kind:'foot'},x,y,elevation:water.level-(boat ? 2 : FOOT_HEIGHT*.65),headingRad:Math.PI/2,vx:0,vy:0,vz:0,grounded:true,surface:'water',vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
  return carFootprintClear(bodyWorld(next,world),x,y,next.elevation,state.timeS,next) ? next : state;
}

/** Development inspection links start beside a vehicle using the real exit rules. */
export function vehicleReviewStart(state:CarState,world:World,id:string|null):CarState {
  const object=routeObjects(world.scene).find(o=>o.id===id && controlFor(o));if(!object)return state;
  const pose=actorPose(world.scene,object,0);
  return toggleRide({...state,x:pose.x,y:pose.y,elevation:pose.elevation,headingRad:pose.headingRad,control:{kind:"vehicle",id:object.id},
    vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]},world);
}

/** Inspect authored NPC reactions through the real fixed-step runtime and walking body. */
export function npcReviewStart(state:CarState,world:World,id:string|null):CarState {
  const object=world.scene.objects.find(o=>o.id===id && o.behavior);if(!object)return state;
  const pose=actorPose(world.scene,object,0,state),foot:CarState={...state,control:{kind:'foot'},vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
  for(let side=0;side<8;side++){
    const angle=side*Math.PI/4,x=pose.x+Math.cos(angle)*42,y=pose.y+Math.sin(angle)*42,elevation=drivingHeight(world.scene.terrain,x,y);
    if(carFootprintClear(bodyWorld(foot,world),x,y,elevation,0,foot))return {...foot,x,y,elevation,vx:0,vy:0};
  }
  return state;
}

/** Known clear mock-world poses for checking neutral coasting and cross-slope grip. */
export function drivingReviewStart(state:CarState,world:World,scenario:string|null):CarState {
  const district=scenario==='town' ? [6650,1500,Math.PI/2] : scenario==='suburbs' ? [1700,5750,Math.PI/2] : scenario==='sports' ? [5600,4800,Math.PI/2] : scenario==='waterfront' ? [9300,1700,Math.PI/2] : scenario==='canal-bridge' ? [8310,2350,0] : scenario==='lake-bridge' ? [3950,6900,0] : undefined;
  if(district){const [x,y,headingRad]=district as [number,number,number],elevation=drivingHeight(world.scene.terrain,x,y);
    if(carFootprintClear(world,x,y,elevation,state.timeS,state))return {...state,x,y,headingRad,elevation,vx:0,vy:0};
  }
  if(scenario!=="sidehill" && scenario!=="coast")return state;
  const hill=scenario==="sidehill",x=hill ? 1290 : state.x,y=hill ? 1360 : state.y,elevation=drivingHeight(world.scene.terrain,x,y);
  if(!carFootprintClear(world,x,y,elevation,state.timeS,state))return state;
  return {...state,x,y,elevation,headingRad:hill ? Math.PI/2 : Math.PI,vx:hill ? 0 : -80,vy:0};
}
