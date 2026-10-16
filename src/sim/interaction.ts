import { carFootprintClear,stepCar,type CarState,type CarInput,type World } from "./car";
import { actorPose,routeObjects } from "./actors";
import { advanceImpactMotion } from "./impacts";

export function nearbyRide(state:CarState,world:World) {
  let nearest:ReturnType<typeof routeObjects>[number]|undefined,distance=70;
  for(const object of routeObjects(world.scene)) {
    if(!object.spec || !("dslVersion" in object.spec) || object.spec.dslVersion!==2 || !object.spec.rideable)continue;
    const p=actorPose(world.scene,object,state.timeS),d=Math.hypot(p.x-state.x,p.y-state.y);
    if(d<distance && Math.abs(p.elevation-state.elevation)<28){nearest=object;distance=d;}
  }
  return nearest;
}
/** Boarding is a passenger ride. Returning restores the parked car without changing race progress. */
export function toggleRide(state:CarState,world:World):CarState {
  if(state.ride){
    const parked=state.ride.parked;
    if(!carFootprintClear(world,parked.x,parked.y,parked.elevation,state.timeS,state))return state;
    return {...state,...parked,ride:undefined,vx:0,vy:0,vz:0,grounded:true,landingSpeed:0};
  }
  const actor=nearbyRide(state,world);if(!actor)return state;
  return {...state,ride:{actorId:actor.id,parked:{x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad}},boostedThisStep:false};
}
export function stepInteractive(state:CarState,input:CarInput,dt:number,world:World):CarState {
  if(!state.ride)return stepCar(state,input,dt,world);
  const object=routeObjects(world.scene).find(o=>o.id===state.ride!.actorId)!;
  const p=actorPose(world.scene,object,state.timeS+dt),spec=object.spec!;
  const seat="dslVersion" in spec && spec.dslVersion===2 ? spec.rideable!.seat[1]*object.scale : 0;
  const next:CarState={...state,props:state.props.map(p=>({...p})),impacts:[],timeS:state.timeS+dt,x:p.x,y:p.y,elevation:p.elevation+seat,headingRad:p.headingRad,
    vx:Math.cos(p.headingRad)*p.speed,vy:Math.sin(p.headingRad)*p.speed,vz:0,grounded:p.kind!=="air",landingSpeed:0,boostedThisStep:false,surface:p.kind==="water" ? "water" : "paper"};
  advanceImpactMotion(next,world,dt,false);return next;
}
