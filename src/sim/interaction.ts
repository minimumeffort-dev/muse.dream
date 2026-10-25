import {objectFloor,walkingSupport} from '../scene/floors';
import {stepStrike} from './strike';
import {leaveSharedMeal} from './social';
import {nearbySeat,seatedPose} from './seating';
import {walkingHeight} from '../scene/interiors';
import {contactOverlaps} from '../scene/contact-geometry';
import {stepCommerce} from './commerce';
import {stepAmbient} from './ambient';
import { applyJump,carFootprintClear,stepCar,TUNING,type CarState,type CarInput,type World,type ParkedVehicle,type CarTuning } from "./car";
import { actorPose,actorContacts,routeObjects } from "./actors";
import { advanceImpactMotion,breakOnContact,isBroken } from "./impacts";
import { controlOf,type VehicleControl } from "../scene/object-dsl";
import {controlFor,roleOf} from '../scene/agents';
import {stepNpcs} from './npcs';
import { objectHeight,objectRadius } from "./archetypes";
import { drivingHeight,terrainHeight,waterAt,navigableWater,waterCeiling } from "../scene/terrain";
import {assemblyHorizontalRadius,playerRadius} from "../scene/measure";
import { queryStaticContacts,objectContacts } from "../scene/contacts";
import type {SceneObject} from "../scene/schema";
import {bridgeAt} from '../scene/landscape-dsl';
import {aircraftFloor} from '../scene/aircraft-support';
import {stepSports} from './sports';
import {nearbyParking} from './parking';

export const FOOT_RADIUS=3,FOOT_HEIGHT=17.5;
export const MAX_FLIGHT_CLEARANCE=450;
const groundTuning:Record<"car"|"bicycle"|"skateboard"|"scooter",CarTuning>={
  car:TUNING,
  bicycle:{...TUNING,engineAccel:100,brakeAccel:180,reverseAccel:50,maxForwardSpeed:130,maxReverseSpeed:35,dragPerS:.5,turnRateRadS:2.4,maxTerrainSpeed:180},
  scooter:{...TUNING,engineAccel:90,brakeAccel:190,reverseAccel:35,maxForwardSpeed:105,maxReverseSpeed:25,dragPerS:.6,turnRateRadS:2.5,maxTerrainSpeed:150},
  skateboard:{...TUNING,engineAccel:65,brakeAccel:140,reverseAccel:35,maxForwardSpeed:85,maxReverseSpeed:25,dragPerS:.6,turnRateRadS:2.8,maxTerrainSpeed:130},
};
const walkingTuning={...TUNING,engineAccel:0,turnRateRadS:0,baseLateralGrip:0,iceLateralGrip:0,dragPerS:0,lateralFriction:0,iceLateralFriction:0,coastFriction:0,iceCoastFriction:0};
export function occupiedObject(state:CarState,world:World) {
  const control=state.control;
  return control.kind==="vehicle" || control.kind==="passenger" ? world.scene.objects.find(o=>o.id===control.id) : undefined;
}
export function bodyWorld(state:CarState,world:World):World {
  if(state.control.kind==="foot")return {...world,carRadius:FOOT_RADIUS,bodyHeight:FOOT_HEIGHT,tuning:walkingTuning,stepHeight:4,jumpSpeed:105,waterSupport:true,dryGround:false,damageEnabled:false,effectsEnabled:false};
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
  for(const object of [...routeObjects(world.scene),...nearbyParking(world.scene,state,60)]) {
    if(!object.spec || !("dslVersion" in object.spec) || object.spec.dslVersion!==2 || !object.spec.rideable)continue;
    if(roleOf(object)==='npc' && controlOf(object.spec))continue;
    const p=actorPose(world.scene,object,state.timeS,state),contacts=object.spec.contacts;
    const d=contacts ? Math.max(0,Math.min(...objectContacts(world.scene,object,p).map(c=>Math.hypot(c.x-state.x,c.y-state.y)-c.r))) : Math.max(0,Math.hypot(p.x-state.x,p.y-state.y)-objectRadius(object));
    if((d<distance || d===distance && nearest?.id!==null && object.id<(nearest?.id??'')) && Math.abs(p.elevation-state.elevation)<28){nearest={id:object.id,labelText:object.labelText,object};distance=d;}
  }
  return nearest;
}
const parkedPose=(state:CarState,id:string|null):ParkedVehicle=>({id,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:state.distance});
/** Prefer dry exits, then let a grounded occupant disembark into swimmable water. */
export function exitPosition(state:CarState,world:World) {
  if(state.control.kind==="foot" || !state.grounded || controlOf(occupiedObject(state,world)?.spec)==="plane" && state.surface!=="water" && state.elevation>aircraftFloor(world.scene,occupiedObject(state,world)!,state)+3)return undefined;
  const id=state.control.kind==="car" ? null : state.control.id;
  const vehicles=state.control.kind==="passenger" ? state.vehicles : [...state.vehicles.filter(v=>v.id!==id),parkedPose(state,id)];
  const foot:CarState={...state,control:{kind:"foot"},vehicles},footWorld=bodyWorld(foot,world),object=occupiedObject(state,world),bodyRadius=bodyWorld(state,world).carRadius;
  const layer=object && objectFloor(world.scene,object),profile=controlOf(object?.spec),radius=profile==="plane" || profile==="boat" ? Math.max(bodyRadius,assemblyHorizontalRadius(object!.spec as import("../scene/object-dsl").ObjectDsl,object!.scale)) : bodyRadius;
  // Seats with explicit contacts are validated upright passenger cylinders. The
  // enclosing broad-phase radius is useful for queries, not a sideways exit.
  const contacts=object?.spec && 'dslVersion' in object.spec && object.spec.dslVersion===2 && object.spec.contacts ? objectContacts(world.scene,object,state) : undefined,margin=FOOT_RADIUS+5;
  const exits=Array.from({length:8},(_,side)=>{
    const angle=state.headingRad+Math.PI/2+side*Math.PI/4,dx=Math.cos(angle),dy=Math.sin(angle);let extent:number|undefined;
    for(const c of contacts??[]){
      const x=c.x-state.x,y=c.y-state.y,along=x*dx+y*dy,disc=(c.r+margin)**2-(x*x+y*y-along*along);
      if(disc<0)continue;const end=along+Math.sqrt(disc);if(end>=0)extent=Math.max(extent??0,end);
    }
    return {dx,dy,r:Math.max(margin,extent??radius+margin)};
  });
  for(const wet of [false,true])for(let ring=0;ring<7;ring++)for(const exit of exits){
    const r=exit.r+ring*8,x=state.x+exit.dx*r,y=state.y+exit.dy*r,ground=layer ? walkingSupport(world.scene,x,y,state.elevation,FOOT_RADIUS,4,object!.id) : walkingHeight(world.scene,x,y,FOOT_RADIUS),water=waterAt(world.scene.terrain,x,y,terrainHeight(world.scene.terrain,x,y));
    if(layer && Math.abs(ground-state.elevation)>4)continue;
    const elevation=wet && water ? Math.max(terrainHeight(world.scene.terrain,x,y),water.level-FOOT_HEIGHT*.65) : ground;
    // A boat can leave at the shore, but cannot teleport up through a bridge deck.
    if(!wet && profile==='boat' && bridgeAt(world.scene.terrain.landscape,x,y))continue;
    if(wet && !water)continue;
    if(r-bodyRadius<60 && Math.abs(elevation-state.elevation)<28 && carFootprintClear({...footWorld,dryGround:!wet},x,y,elevation,state.timeS,foot))return {x,y,elevation,vehicles};
  }
  return undefined;
}
/** A furniture transfer uses its authored approach, with ordinary body clearance. */
export function standUp(state:CarState,world:World):CarState {
 const seat=seatedPose(state,world.scene);if(!state.seated)return state;
 if(!seat)return leaveSharedMeal({...state,seated:undefined},world.scene);
 const next={...state,seated:undefined,x:seat.approach.x,y:seat.approach.y,elevation:seat.approach.elevation??walkingHeight(world.scene,seat.approach.x,seat.approach.y,FOOT_RADIUS)};
 if(carFootprintClear({...bodyWorld(next,world),dryGround:true},next.x,next.y,next.elevation,next.timeS,next))return leaveSharedMeal(next,world.scene);
 const exit=exitPosition({...state,seated:undefined,control:{kind:'passenger',id:seat.objectId}},world);
 return exit ? leaveSharedMeal({...next,...exit},world.scene) : state;
}
/** F leaves the current vehicle. On foot it takes over the nearest reachable seat. */
export function toggleRide(state:CarState,world:World):CarState {
  if(state.seated)return standUp(state,world);
  const seat=nearbySeat(state,world);
  if(seat && carFootprintClear({...bodyWorld(state,world),dryGround:true},seat.approach.x,seat.approach.y,seat.approach.elevation??walkingHeight(world.scene,seat.approach.x,seat.approach.y,FOOT_RADIUS),state.timeS,state))return {...state,seated:{objectId:seat.objectId,seatId:seat.seatId},x:seat.x,y:seat.y,elevation:seat.elevation,headingRad:seat.headingRad,vx:0,vy:0,vz:0,pitch:0,bank:0,jump:{...state.jump,bufferUntilS:0,coyoteUntilS:0}};
  if(state.control.kind!=="foot"){
    const exit=exitPosition(state,world);if(!exit)return state;
    return {...state,...exit,control:{kind:"foot"},vx:0,vy:0,vz:0,grounded:true,landingSpeed:0,pitch:0,bank:0,boostedThisStep:false,carBoost:{...state.carBoost,activeUntilS:0},jump:{held:state.jump.held,bufferUntilS:0,coyoteUntilS:0}};
  }
  const target=nearbyRide(state,world);if(!target)return state;
  const pose=target.id===null ? state.vehicles.find(v=>v.id===null)! : actorPose(world.scene,target.object!,state.timeS,state);
  const control:CarState["control"]=target.id===null ? {kind:"car"} : {kind:controlFor(target.object!) ? "vehicle" : "passenger",id:target.id};
  const next:CarState={...state,control,x:pose.x,y:pose.y,elevation:pose.elevation,headingRad:pose.headingRad,distance:pose.distance,vehicles:state.vehicles.filter(v=>v.id!==target.id),
    vx:0,vy:0,vz:0,grounded:true,landingSpeed:0,pitch:0,bank:0,boostedThisStep:false,carBoost:{...state.carBoost,activeUntilS:0},jump:{held:state.jump.held,bufferUntilS:0,coyoteUntilS:0}};
  if(control.kind!=="passenger" && !carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))return state;
  return next;
}
function nextMotion(state:CarState,input:CarInput,dt:number,world:World):CarState {
  return {...state,jump:{...state.jump},carBoost:{...state.carBoost,held:!!input.boost,activeUntilS:0},npcs:stepNpcs(state,dt,world.scene,input.talkPressed),population:stepAmbient(state,dt,world.scene),timeS:state.timeS+dt,props:state.props.map(p=>({...p})),broken:state.broken,brokenZones:state.brokenZones,debris:[...state.debris],impacts:[],boostReadyAtS:{...state.boostReadyAtS},boostedThisStep:false,landingSpeed:0};
}
export function isSwimming(state:CarState,world:World):boolean {
  const water=state.control.kind==='foot' && waterAt(world.scene.terrain,state.x,state.y,state.elevation);
  return !!water && state.elevation<water.level-FOOT_HEIGHT*.4 && terrainHeight(world.scene.terrain,state.x,state.y)<water.level-FOOT_HEIGHT*.65;
}
/** Bounded arcade boat/aircraft dynamics, independent of authored routes. */
function stepFreeVehicle(state:CarState,input:CarInput,dt:number,world:World,profile:"boat"|"plane"):CarState {
  const s=nextMotion(state,input,dt,world),body=bodyWorld(s,world),throttle=Math.max(-1,Math.min(1,input.throttle)),steer=Math.max(-1,Math.min(1,input.steer));
  const plane=profile==="plane",aircraft=plane ? occupiedObject(s,world)! : undefined,maxSpeed=plane ? 400 : 135,accel=plane ? 170 : 80;
  const water=plane ? undefined : waterAt(world.scene.terrain,s.x,s.y,terrainHeight(world.scene.terrain,s.x,s.y));
  const flow=water?.flow??{x:0,y:0};
  let fwd=(s.vx-flow.x)*Math.cos(s.headingRad)+(s.vy-flow.y)*Math.sin(s.headingRad);
  if(throttle>0)fwd+=accel*Math.max(0,1-fwd/maxSpeed)*throttle*dt;
  else if(throttle<0)fwd=fwd>1 ? Math.max(0,fwd-accel*1.8*dt) : Math.max(plane && !s.grounded ? 0 : -40,fwd+accel*.4*throttle*dt);
  fwd*=Math.exp(-(plane ? .12 : .3)*dt);
  if(plane && s.grounded && waterAt(world.scene.terrain,s.x,s.y,drivingHeight(world.scene.terrain,s.x,s.y)))fwd=0;
  const authority=Math.max(-1,Math.min(1,fwd/(plane ? 100 : 35)));
  const yaw=steer*(plane ? 1.05 : 1.3)*(plane ? authority : authority || throttle*.15);
  s.headingRad+=yaw*dt;
  // Retain momentum across a turn; hull/air resistance removes side slip gradually.
  const c=Math.cos(s.headingRad),sn=Math.sin(s.headingRad);
  const side=((s.vx-flow.x)*-sn+(s.vy-flow.y)*c)*Math.exp(-(plane ? 3 : 2.5)*dt);
  s.vx=c*fwd-sn*side+flow.x;s.vy=sn*fwd+c*side+flow.y;
  const waterRadius=plane ? body.carRadius : Math.max(body.carRadius,assemblyHorizontalRadius(occupiedObject(s,world)!.spec as import("../scene/object-dsl").ObjectDsl,occupiedObject(s,world)!.scale));
  const lift=Math.max(-1,Math.min(1,input.lift??0));
  if(plane){
    if(s.grounded && fwd>110 && lift>0){s.grounded=false;s.vz=15;}
    const target=fwd<100 ? -Math.max(10,(100-fwd)*1.5) : lift*80*Math.min(1,fwd/150);
    s.vz=s.grounded ? 0 : s.vz+Math.max(-100*dt,Math.min(100*dt,target-s.vz));
    s.pitch=s.grounded ? 0 : Math.atan2(s.vz,Math.max(60,Math.abs(fwd)));
    s.bank+=((s.grounded ? 0 : steer*.45*authority)-s.bank)*Math.min(1,dt*5);
  }else{
    if(s.grounded && water){s.elevation=water.level-2;s.vz=0;}
    applyJump(s,input,45);
  }
  const steps=Math.max(1,Math.ceil(Math.hypot(s.vx,s.vy,s.vz)*dt/(body.carRadius*.5))),sdt=dt/steps;
  for(let i=0;i<steps;i++){
    // The finite world edge contains flight without removing the airspeed needed to turn back.
    const margin=body.carRadius+.001,flying=plane && !s.grounded;
    const x=flying ? Math.max(margin,Math.min(world.driveMask.width-margin,s.x+s.vx*sdt)) : s.x+s.vx*sdt;
    const y=flying ? Math.max(margin,Math.min(world.driveMask.height-margin,s.y+s.vy*sdt)) : s.y+s.vy*sdt;
    const support=plane ? undefined : navigableWater(world.scene.terrain,x,y,waterRadius,body.bodyHeight??20);
    let floor=plane ? aircraftFloor(world.scene,aircraft!,{...s,x,y}) : (support?.level??water?.level??s.elevation+2)-2;
    const contacts=[...queryStaticContacts(world.scene,x,y,body.carRadius,s),...actorContacts(world.scene,s.timeS,s)];
    // Retain a landed cap across ticks, but never climb a solid from its side.
    if(plane)for(const contact of contacts)if(!isBroken(s,contact) && s.elevation>=contact.top-.05 && contactOverlaps(contact,x,y,body.carRadius))floor=Math.max(floor,contact.top);
    if(plane && s.grounded && floor<s.elevation-4){s.grounded=false;s.vz=0;}
    let elevation=s.grounded ? floor : s.elevation+s.vz*sdt-(plane ? 0 : 90*sdt*sdt);
    if(!plane){
      s.vz-=s.grounded ? 0 : 180*sdt;
      const ceiling=waterCeiling(world.scene.terrain,x,y,waterRadius)-(body.bodyHeight??20);
      if(elevation>ceiling){elevation=Math.max(floor,ceiling);s.vz=Math.min(0,s.vz);}
    }
    elevation=Math.max(floor,Math.min(floor+MAX_FLIGHT_CLEARANCE,elevation));
    breakOnContact(s,body,x,y,contacts);
    if(!plane && !support || !carFootprintClear(body,x,y,elevation,s.timeS,s)) {
      s.vx=0;s.vy=0;
      // A collision stops travel, not gravity. An airborne body must still land.
      let ownFloor=plane ? aircraftFloor(world.scene,aircraft!,s) : (water?.level??s.elevation+2)-2,ceiling=plane ? Infinity : waterCeiling(world.scene.terrain,s.x,s.y,waterRadius)-(body.bodyHeight??20);
      const local=[...queryStaticContacts(world.scene,s.x,s.y,body.carRadius,s),...actorContacts(world.scene,s.timeS,s)];
      for(const contact of local){
        if(isBroken(s,contact) || !contactOverlaps(contact,s.x,s.y,body.carRadius))continue;
        if(s.elevation>=contact.top-.05)ownFloor=Math.max(ownFloor,contact.top);
        if(s.elevation+(body.bodyHeight??20)<=contact.bottom+.05)ceiling=Math.min(ceiling,contact.bottom-(body.bodyHeight??20));
      }
      s.elevation=Math.max(ownFloor,Math.min(ceiling,s.elevation+s.vz*sdt));
      if(s.elevation>=ceiling)s.vz=Math.min(0,s.vz);
      if(s.elevation<=ownFloor && s.vz<=0){s.grounded=true;s.vz=0;}
      continue;
    }
    s.distance+=((x-s.x)*c+(y-s.y)*sn);s.x=x;s.y=y;s.elevation=elevation;
    if(!s.grounded && elevation<=floor+.01 && s.vz<=0){s.grounded=true;s.landingSpeed=Math.max(0,-s.vz);s.vz=0;s.vx*=.85;s.vy*=.85;}
    if(elevation>=floor+MAX_FLIGHT_CLEARANCE)s.vz=Math.min(0,s.vz);
  }
  if(plane && s.grounded && (s.pitch!==0 || s.bank!==0)){
    s.pitch=0;s.bank=0;
    let floor=aircraftFloor(world.scene,aircraft!,s);
    for(const contact of [...queryStaticContacts(world.scene,s.x,s.y,body.carRadius,s),...actorContacts(world.scene,s.timeS,s)])
      if(!isBroken(s,contact) && s.elevation>=contact.top-.05 && contactOverlaps(contact,s.x,s.y,body.carRadius))floor=Math.max(floor,contact.top);
    s.elevation=floor;
  }
  if(!plane){s.pitch=0;s.bank+=(steer*.08*authority-s.bank)*Math.min(1,dt*5);}
  s.surface=plane && !(s.grounded && waterAt(world.scene.terrain,s.x,s.y,drivingHeight(world.scene.terrain,s.x,s.y))) ? "paper" : "water";
  advanceImpactMotion(s,body,dt);return s;
}
export function stepInteractive(state:CarState,input:CarInput,dt:number,world:World):CarState {
  return stepCommerce(stepSports(stepStrike(stepControlled(state,input,dt,world),input,world),state,input,dt,world),input,dt,world.scene);
}
function stepControlled(state:CarState,input:CarInput,dt:number,world:World):CarState {
  if(state.seated){
    const seat=seatedPose(state,world.scene);
    // Accepted furniture is static; damage is the only change to sitting support.
    if(!seat || state.broken.includes(seat.objectId) || input.jump || input.steer || input.throttle){
      const standing=standUp(state,world);if(!standing.seated)return stepControlled(standing,input,dt,world);
    }
    const s=nextMotion(state,input,dt,world);s.jump.held=!!input.jump;advanceImpactMotion(s,bodyWorld(s,world),dt);return s;
  }
  if(state.control.kind==="car")return stepCar(state,input,dt,world);
  if(state.control.kind==="foot"){
    const angle=Math.atan2(180,480)+(input.viewAngle??0),length=Math.max(1,Math.hypot(input.steer,input.throttle));
    const swimming=isSwimming(state,world),speed=swimming ? input.sprint || input.jump ? 48 : 32 : input.sprint ? 95 : 55;
    const water=swimming && waterAt(world.scene.terrain,state.x,state.y,state.elevation);
    const tx=(input.steer*Math.cos(angle)-input.throttle*Math.sin(angle))*speed/length+(water ? water.flow.x : 0),ty=(-input.steer*Math.sin(angle)-input.throttle*Math.cos(angle))*speed/length+(water ? water.flow.y : 0);
    const moving=Math.hypot(input.steer,input.throttle)>0,accel=swimming ? 120 : state.grounded ? moving ? 500 : 700 : moving ? 100 : 0;
    const change=Math.hypot(tx-state.vx,ty-state.vy),blend=change ? Math.min(1,accel*dt/change) : 1;
    const vx=state.vx+(tx-state.vx)*blend,vy=state.vy+(ty-state.vy)*blend;
    const targetHeading=Math.atan2(ty-(water ? water.flow.y : 0),tx-(water ? water.flow.x : 0));
    const turn=moving ? Math.atan2(Math.sin(targetHeading-state.headingRad),Math.cos(targetHeading-state.headingRad)) : 0;
    const headingRad=state.headingRad+Math.max(-12*dt,Math.min(12*dt,turn));
    const footWorld={...bodyWorld(state,world),jumpSpeed:swimming ? undefined : 105};
    return stepCar({...state,vx,vy,headingRad},{steer:0,throttle:0,jump:input.jump,boost:input.boost,talkPressed:input.talkPressed},dt,footWorld);
  }
  const object=occupiedObject(state,world)!;
  if(state.control.kind==="vehicle"){
    const profile=controlOf(object.spec)!;
    if(profile==="boat" || profile==="plane")return stepFreeVehicle(state,input,dt,world,profile);
    const body={...bodyWorld(state,world),tuning:groundTuning[profile],jumpSpeed:profile==='bicycle' ? 85 : profile==='skateboard' || profile==='scooter' ? 75 : undefined};
    const speed=state.vx*Math.cos(state.headingRad)+state.vy*Math.sin(state.headingRad),authority=Math.max(-1,Math.min(1,speed/45));
    const yaw=Math.sign(speed)*Math.sign(input.steer)*Math.min(Math.abs(speed)/14*Math.tan(Math.abs(input.steer)*.42),TUNING.gravity*.55/Math.max(20,Math.abs(speed)));
    const steer=profile==='bicycle' && authority!==0 ? yaw/(body.tuning.turnRateRadS*authority) : input.steer;
    const next=stepCar(state,{...input,steer},dt,body);
    next.bank=state.bank+((profile==='bicycle' && next.grounded ? Math.atan(speed*yaw/TUNING.gravity)*.8 : 0)-state.bank)*Math.min(1,dt*8);
    const pitch=next.grounded ? 0 : Math.max(-.35,Math.min(.35,Math.atan2(next.vz,Math.max(60,Math.hypot(next.vx,next.vy)))));
    next.pitch=state.pitch+(pitch-state.pitch)*Math.min(1,dt*12);
    return next;
  }
  const next=nextMotion(state,input,dt,world),p=actorPose(world.scene,object,next.timeS,next);
  Object.assign(next,{x:p.x,y:p.y,elevation:p.elevation,headingRad:p.headingRad,vx:p.vx??0,vy:p.vy??0,vz:0,grounded:p.kind!=="air",surface:p.kind==="water" ? "water" : "paper",distance:p.travelled});
  advanceImpactMotion(next,bodyWorld(state,world),dt,false);return next;
}
