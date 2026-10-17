import {carFootprintClear,resetCar,type CarState,type World} from "../sim/car";
import {drivingHeight,terrainHeight,waterAt} from "../scene/terrain";
import {actorPose,routeObjects} from "../sim/actors";
import {toggleRide,stepInteractive,bodyWorld,FOOT_HEIGHT} from "../sim/interaction";
import {controlFor} from "../scene/agents";
import {aircraftFloor} from '../scene/aircraft-support';

/** Real mock-world positions for exercising terrain contact, jumping and water navigation. */
export function movementReviewStart(state:CarState,world:World,scenario:string|null):CarState {
  if(scenario==='walk')return toggleRide(state,world);
  if(scenario==='football' || scenario==='basketball'){
    const court=world.scene.sports.find(s=>s.kind===scenario),ball=court && world.scene.objects.find(o=>o.id===court.ballId);if(!ball)return state;
    const x=ball.x-6,y=ball.y;
    const next:CarState={...state,control:{kind:'foot'},x,y,elevation:drivingHeight(world.scene.terrain,x,y),headingRad:0,
      vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
    return carFootprintClear(bodyWorld(next,world),x,y,next.elevation,state.timeS,next) ? next : state;
  }
  if(scenario==='plane-hill'){
    const plane=routeObjects(world.scene).find(o=>controlFor(o)==='plane');if(!plane)return state;
    const next:CarState={...state,x:12500,y:10200,headingRad:0,control:{kind:'vehicle',id:plane.id},vx:0,vy:0,vz:0,pitch:0,bank:0,grounded:true,
      vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
    next.elevation=aircraftFloor(world.scene,plane,next);
    return carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,state.timeS,next) ? next : state;
  }
  if(scenario!=='swim' && scenario!=='boat-bridge')return state;
  const boat=scenario==='boat-bridge',x=9000,y=boat ? 3980 : 3500,water=waterAt(world.scene.terrain,x,y,terrainHeight(world.scene.terrain,x,y));
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
  const district=scenario==='voxels' ? [7440,7460,0] : scenario==='airport' ? [2000,9400,Math.PI/2] : scenario==='medical' ? [12000,5200,0] : scenario==='town' ? [6330,4233,0] : scenario==='suburbs' ? [3600,3300,0] : scenario==='sports' ? [10400,5200,0] : scenario==='waterfront' ? [9900,2800,Math.PI/2] : scenario==='canal-bridge' ? [8610,4200,0] : scenario==='lake-bridge' ? [8865,6200,0] : undefined;
  if(district){const [x,y,headingRad]=district as [number,number,number],elevation=drivingHeight(world.scene.terrain,x,y);
    if(carFootprintClear(world,x,y,elevation,state.timeS,state))return {...state,x,y,headingRad,elevation,vx:0,vy:0};
  }
  if(scenario!=="sidehill" && scenario!=="coast")return state;
  const hill=scenario==="sidehill",x=hill ? 1150 : state.x,y=hill ? 1750 : state.y,elevation=drivingHeight(world.scene.terrain,x,y);
  if(!carFootprintClear(world,x,y,elevation,state.timeS,state))return state;
  return {...state,x,y,elevation,headingRad:hill ? Math.PI/2 : Math.PI,vx:hill ? 0 : -80,vy:0};
}

/** Dev-only close views of actual Dream population members; normal starts are untouched. */
export function populationReviewStart(state:CarState,world:World,scenario:string|null):CarState{
 if(scenario!=='wildlife' && scenario!=='pedestrians')return state;
 const object=world.scene.objects.find(o=>o.ambient?.motion.kind===(scenario==='wildlife' ? 'roam' : 'walk') && (scenario!=='wildlife' || o.ambient.motion.kind==='roam' && o.ambient.motion.gait==='walk'));
 if(!object)return state;
 const x=object.x+25,y=object.y,next:CarState={...state,control:{kind:'foot'},x,y,vx:0,vy:0,vz:0,grounded:true,elevation:drivingHeight(world.scene.terrain,x,y),vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
 return carFootprintClear(bodyWorld(next,world),x,y,next.elevation,state.timeS,next) ? next : state;
}

/** Profile the same driving start with cargo collected through the real engine. */
export function cargoReviewStart(state:CarState,world:World,id:string|null):CarState{
 const task=world.scene.economy?.deliveries.find(d=>d.id===id);if(!task)return state;
 const market=world.scene.economy!.markets.find(m=>m.id===task.from)!;
 const foot=npcReviewStart(state,world,market.actor);if(foot.control.kind!=='foot')return state;
 const next=stepInteractive(foot,{steer:0,throttle:0,commerce:{kind:'collect',delivery:task.id}},1/120,world);
 return next.economy?.accounts.some(a=>a.delivery?.id===id) ? resetCar(next,world.scene) : state;
}
