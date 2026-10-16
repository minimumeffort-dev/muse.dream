import { carFootprintClear,stepCar,TUNING,type CarState,type CarInput,type World,type ParkedVehicle,type CarTuning } from "./car";
import { actorPose,actorContacts,routeObjects } from "./actors";
import { advanceImpactMotion,breakOnContact } from "./impacts";
import { controlOf,type VehicleControl } from "../scene/object-dsl";
import { objectHeight,objectRadius } from "./archetypes";
import { drivingHeight,waterAt } from "../scene/terrain";
import {assemblyHorizontalRadius,playerRadius} from "../scene/measure";
import { sceneContacts } from "../scene/contacts";
import type {SceneObject} from "../scene/schema";

export const FOOT_RADIUS=3,FOOT_HEIGHT=17.5;
const groundTuning:Record<"car"|"bicycle"|"skateboard",CarTuning>={
  car:TUNING,
  bicycle:{...TUNING,engineAccel:100,brakeAccel:180,reverseAccel:50,maxForwardSpeed:130,maxReverseSpeed:35,dragPerS:.5,turnRateRadS:2.4,maxTerrainSpeed:180},
  skateboard:{...TUNING,engineAccel:65,brakeAccel:140,reverseAccel:35,maxForwardSpeed:85,maxReverseSpeed:25,dragPerS:.6,turnRateRadS:2.8,maxTerrainSpeed:130},
};
const walkingTuning={...TUNING,engineAccel:0,turnRateRadS:0,baseLateralGrip:0,iceLateralGrip:0,dragPerS:0};
export function occupiedObject(state:CarState,world:World) {
  const control=state.control;
  return control.kind==="vehicle" || control.kind==="passenger" ? world.scene.objects.find(o=>o.id===control.id) : undefined;
}
export function bodyWorld(state:CarState,world:World):World {
  if(state.control.kind==="foot")return {...world,carRadius:FOOT_RADIUS,bodyHeight:FOOT_HEIGHT,tuning:walkingTuning,dryGround:true,damageEnabled:false,effectsEnabled:false};
  const object=occupiedObject(state,world);
  return object ? {...world,carRadius:objectRadius(object),bodyHeight:objectHeight(object)} : world;
}
export interface RideTarget {id:string|null;labelText:string;object?:SceneObject}
export function nearbyRide(state:CarState,world:World):RideTarget|undefined {
  let nearest:RideTarget|undefined,distance=60;
  const parked=state.vehicles.find(v=>v.id===null);
  if(parked && Math.hypot(parked.x-state.x,parked.y-state.y)-playerRadius(world.scene)<distance && Math.abs(parked.elevation-state.elevation)<28){
    nearest={id:null,labelText:"car"};distance=Math.max(0,Math.hypot(parked.x-state.x,parked.y-state.y)-playerRadius(world.scene));
  }
  for(const object of routeObjects(world.scene)) {
    if(!object.spec || !("dslVersion" in object.spec) || object.spec.dslVersion!==2 || !object.spec.rideable)continue;
    const p=actorPose(world.scene,object,state.timeS,state),d=Math.max(0,Math.hypot(p.x-state.x,p.y-state.y)-objectRadius(object));
    if(d<distance && Math.abs(p.elevation-state.elevation)<28){nearest={id:object.id,labelText:object.labelText,object};distance=d;}
  }
  return nearest;
}
const parkedPose=(state:CarState,id:string|null):ParkedVehicle=>({id,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:state.distance});
/** Exit beside the actual body, on dry accessible ground; never eject into flight or water. */
export function exitPosition(state:CarState,world:World) {
  if(state.control.kind==="foot" || !state.grounded || controlOf(occupiedObject(state,world)?.spec)==="plane" && (state.surface==="water" || state.elevation>drivingHeight(world.scene.terrain,state.x,state.y)+3))return undefined;
  const id=state.control.kind==="car" ? null : state.control.id;
  const vehicles=state.control.kind==="passenger" ? state.vehicles : [...state.vehicles.filter(v=>v.id!==id),parkedPose(state,id)];
  const foot:CarState={...state,control:{kind:"foot"},vehicles},footWorld=bodyWorld(foot,world),object=occupiedObject(state,world),bodyRadius=bodyWorld(state,world).carRadius;
  const radius=controlOf(object?.spec)==="plane" ? Math.max(bodyRadius,assemblyHorizontalRadius(object!.spec as import("../scene/object-dsl").ObjectDsl,object!.scale)) : bodyRadius;
  for(let ring=0;ring<7;ring++)for(let side=0;side<8;side++){
    const angle=state.headingRad+Math.PI/2+side*Math.PI/4,r=radius+FOOT_RADIUS+5+ring*8;
    const x=state.x+Math.cos(angle)*r,y=state.y+Math.sin(angle)*r,elevation=drivingHeight(world.scene.terrain,x,y);
    if(r-bodyRadius<60 && Math.abs(elevation-state.elevation)<28 && carFootprintClear(footWorld,x,y,elevation,state.timeS,foot))return {x,y,elevation,vehicles};
  }
  return undefined;
}
/** F leaves the current vehicle. On foot it takes over the nearest reachable seat. */
export function toggleRide(state:CarState,world:World):CarState {
  if(state.control.kind!=="foot"){
    const exit=exitPosition(state,world);if(!exit)return state;
    return {...state,...exit,control:{kind:"foot"},vx:0,vy:0,vz:0,grounded:true,landingSpeed:0,pitch:0,bank:0,boostedThisStep:false};
  }
  const target=nearbyRide(state,world);if(!target)return state;
  const pose=target.id===null ? state.vehicles.find(v=>v.id===null)! : actorPose(world.scene,target.object!,state.timeS,state);
  const control:CarState["control"]=target.id===null ? {kind:"car"} : {kind:controlOf(target.object!.spec) ? "vehicle" : "passenger",id:target.id};
  const next:CarState={...state,control,x:pose.x,y:pose.y,elevation:pose.elevation,headingRad:pose.headingRad,distance:pose.distance,vehicles:state.vehicles.filter(v=>v.id!==target.id),
    vx:0,vy:0,vz:0,grounded:true,landingSpeed:0,pitch:0,bank:0,boostedThisStep:false};
  if(control.kind!=="passenger" && !carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))return state;
  return next;
}
function nextMotion(state:CarState,dt:number):CarState {
  return {...state,timeS:state.timeS+dt,props:state.props.map(p=>({...p})),broken:[...state.broken],brokenZones:state.brokenZones.map(z=>({...z})),debris:[...state.debris],impacts:[],boostReadyAtS:{...state.boostReadyAtS},boostedThisStep:false,landingSpeed:0};
}
function afloat(world:World,x:number,y:number,radius:number) {
  const floor=drivingHeight(world.scene.terrain,x,y),water=waterAt(world.scene.terrain,x,y,floor);
  if(!water || floor>=water.level-.5)return undefined;
  for(let i=0;i<12;i++){
    const px=x+Math.cos(i*Math.PI/6)*radius,py=y+Math.sin(i*Math.PI/6)*radius,ground=drivingHeight(world.scene.terrain,px,py);
    if(ground>=water.level-.5 || waterAt(world.scene.terrain,px,py,ground)?.id!==water.id)return undefined;
  }
  return water;
}
/** Bounded arcade boat/aircraft dynamics, independent of authored routes. */
function stepFreeVehicle(state:CarState,input:CarInput,dt:number,world:World,profile:"boat"|"plane"):CarState {
  const s=nextMotion(state,dt),body=bodyWorld(s,world),throttle=Math.max(-1,Math.min(1,input.throttle)),steer=Math.max(-1,Math.min(1,input.steer));
  const plane=profile==="plane",maxSpeed=plane ? 400 : 135,accel=plane ? 170 : 80;
  let fwd=s.vx*Math.cos(s.headingRad)+s.vy*Math.sin(s.headingRad);
  if(throttle>0)fwd+=accel*Math.max(0,1-fwd/maxSpeed)*throttle*dt;
  else if(throttle<0)fwd=fwd>1 ? Math.max(0,fwd-accel*1.8*dt) : Math.max(plane ? 0 : -40,fwd+accel*.4*throttle*dt);
  fwd*=Math.exp(-(plane ? .12 : .3)*dt);
  if(plane && s.grounded && waterAt(world.scene.terrain,s.x,s.y,drivingHeight(world.scene.terrain,s.x,s.y)))fwd=0;
  const authority=Math.max(-1,Math.min(1,fwd/(plane ? 100 : 35)));
  s.headingRad+=steer*(plane ? 1.05 : 1.5)*authority*dt;
  s.vx=Math.cos(s.headingRad)*fwd;s.vy=Math.sin(s.headingRad)*fwd;
  const waterRadius=plane ? body.carRadius : Math.max(body.carRadius,assemblyHorizontalRadius(occupiedObject(s,world)!.spec as import("../scene/object-dsl").ObjectDsl,occupiedObject(s,world)!.scale));
  const water=plane ? undefined : afloat(world,s.x,s.y,waterRadius);
  if(water){s.vx+=water.flow.x*.3*dt;s.vy+=water.flow.y*.3*dt;}
  const lift=Math.max(-1,Math.min(1,input.lift??0));
  if(plane){
    if(s.grounded && fwd>110 && lift>0)s.grounded=false;
    s.vz=s.grounded ? 0 : fwd<95 ? -65 : lift*75;
  }else{s.elevation=water ? water.level-2 : s.elevation;s.vz=0;s.grounded=true;}
  const steps=Math.max(1,Math.ceil(Math.hypot(s.vx,s.vy,s.vz)*dt/(body.carRadius*.5))),sdt=dt/steps;
  for(let i=0;i<steps;i++){
    const x=s.x+s.vx*sdt,y=s.y+s.vy*sdt,ground=drivingHeight(world.scene.terrain,x,y),landingWater=plane ? waterAt(world.scene.terrain,x,y,ground) : undefined,floor=landingWater ? landingWater.level : ground,support=plane ? undefined : afloat(world,x,y,waterRadius);
    const elevation=plane ? s.grounded ? floor : Math.max(floor,Math.min(floor+450,s.elevation+s.vz*sdt)) : support ? support.level-2 : s.elevation;
    const data=sceneContacts(world.scene),contacts=[...data.solids.query(x,y,body.carRadius+data.maxRadius),...actorContacts(world.scene,s.timeS,s)];
    breakOnContact(s,body,x,y,contacts);
    if(!plane && !support || !carFootprintClear(body,x,y,elevation,s.timeS,s)) {s.vx=0;s.vy=0;s.vz=0;break;}
    s.x=x;s.y=y;s.elevation=elevation;
    if(plane && !s.grounded && elevation<=floor+.01){s.grounded=true;s.landingSpeed=Math.max(0,-s.vz);s.vz=0;s.vx*=.85;s.vy*=.85;}
  }
  s.distance+=fwd*dt;s.pitch=plane && !s.grounded ? Math.atan2(s.vz,Math.max(1,fwd)) : 0;
  s.bank+=((plane && !s.grounded ? steer*.35*authority : 0)-s.bank)*Math.min(1,dt*5);
  s.surface=plane && !(s.grounded && waterAt(world.scene.terrain,s.x,s.y,drivingHeight(world.scene.terrain,s.x,s.y))) ? "paper" : "water";
  advanceImpactMotion(s,body,dt);return s;
}
export function stepInteractive(state:CarState,input:CarInput,dt:number,world:World):CarState {
  if(state.control.kind==="car")return stepCar(state,input,dt,world);
  if(state.control.kind==="foot"){
    const angle=Math.atan2(180,480)+(input.viewAngle??0),length=Math.max(1,Math.hypot(input.steer,input.throttle));
    const vx=(input.steer*Math.cos(angle)-input.throttle*Math.sin(angle))*65/length,vy=(-input.steer*Math.sin(angle)-input.throttle*Math.cos(angle))*65/length;
    return stepCar({...state,vx,vy,headingRad:Math.hypot(vx,vy)>0 ? Math.atan2(vy,vx) : state.headingRad},{steer:0,throttle:0},dt,bodyWorld(state,world));
  }
  const object=occupiedObject(state,world)!;
  if(state.control.kind==="vehicle"){
    const profile=controlOf(object.spec)!;
    if(profile==="boat" || profile==="plane")return stepFreeVehicle(state,input,dt,world,profile);
    return stepCar(state,input,dt,{...bodyWorld(state,world),tuning:groundTuning[profile]});
  }
  const p=actorPose(world.scene,object,state.timeS+dt,state),next=nextMotion(state,dt);
  Object.assign(next,{x:p.x,y:p.y,elevation:p.elevation,headingRad:p.headingRad,vx:p.vx??0,vy:p.vy??0,vz:0,grounded:p.kind!=="air",surface:p.kind==="water" ? "water" : "paper",distance:p.travelled});
  advanceImpactMotion(next,bodyWorld(state,world),dt,false);return next;
}
