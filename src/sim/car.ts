import {leaveSharedMeal} from './social';
import {contactOverlaps} from '../scene/contact-geometry';
import {initialAmbient,stepAmbient,type AmbientState} from './ambient';
import {initialEconomy,type EconomyState,type CommerceAction} from './commerce';
import {routePath} from "../scene/routes";
import {initialSports,type SportState} from './sports';
import {initialNpcs,stepNpcs,type NpcState} from './npcs';
import {onStreet} from '../scene/streets';
import {distanceToRoad} from "../scene/road";
import { playerHeight } from "../scene/measure";
import { objectPlacement } from "../scene/placement";
import type { Checkpoint, Scene } from "../scene/schema";
import { sampleTerrain, drivingHeight, terrainHeight, waterAt, waterCeiling } from "../scene/terrain";
import { archetypeOf, objectHeight, objectRadius } from "./archetypes";
import { pointInPolygon, type RasterMask } from "./mask";
import { sceneContacts,queryStaticContacts } from "../scene/contacts";
import { actorContacts } from "./actors";
import { impactOf,controlOf } from "../scene/object-dsl";
import { breakOnContact,advanceImpactMotion,isBroken,type DebrisState,type ImpactEvent } from "./impacts";

/**
 * Pure fixed-timestep car simulation. No rendering, no wall clock: callers
 * feed it fixed `dt` steps (see FixedStepper) so a replay is identical at
 * any rendering frame rate.
 *
 * Collision: circular footprint on the raster mask, conservative substeps
 * (each sub-move <= radius/2), last-valid-position rollback with an axis
 * slide attempt. Invariant: if the spawn footprint is clear, the car
 * footprint is clear after every step.
 */

export interface CarInput {
  /** -1 (left) .. 1 (right) */
  steer: number;
  /** -1 (brake/reverse) .. 1 (throttle) */
  throttle: number;
  /** Space / Shift for aircraft; view angle aligns walking with the screen. */
  lift?:number;viewAngle?:number;
  jump?:boolean;sprint?:boolean;
  /** One press requests a car boost; holding never repeats it. */
  boost?:boolean;
  /** A fresh UI press, consumed for one fixed tick (also preserves quick taps). */
  boostPressed?:boolean;
  shoot?:boolean;shootPressed?:boolean;shootReleased?:boolean;
  matchPressed?:boolean;passPressed?:boolean;
  talkPressed?:boolean;strikePressed?:boolean;
  commerce?:CommerceAction;
  aim?:{x:number;y:number};
}

import {sampleWeather} from '../scene/weather';
import {occupiedInterior} from '../scene/interiors';

export type Surface = "road" | "paper" | "ice" | "water";

/** Live state of one knockable object (its identity/kind stays in the scene). */
export interface PropState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  elevation?:number;
  vz?:number;
}

export type PlayerControl={kind:"car"}|{kind:"foot"}|{kind:"vehicle";id:string}|{kind:"passenger";id:string};
export interface ParkedVehicle {id:string|null;x:number;y:number;elevation:number;headingRad:number;distance:number}

export interface CarState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  headingRad: number;
  /** Height above world datum and vertical velocity, in canonical units. */
  elevation: number;
  vz: number;
  grounded: boolean;
  /** Contact impact for this fixed step only; visual effects consume it. */
  landingSpeed: number;
  /** Simulation clock (seconds). Drives boost cooldowns; never wall time. */
  timeS: number;
  /** Completed laps. Display lap = lap + 1. */
  lap: number;
  /** Index into scene.checkpoints of the next expected crossing. */
  nextCheckpoint: number;
  surface: Surface;
  /** Region id -> sim time at which its BOOST may fire again. */
  boostReadyAtS: Record<string, number>;
  /** True for the single step in which a boost fired (HUD flash). */
  boostedThisStep: boolean;
  carBoost:{held:boolean;activeUntilS:number;readyAtS:number};
  strikeReadyAtS?:number;
  sports:SportState[];
  /** Live knockable props, in scene-object order. Solids never move. */
  props: PropState[];
  broken:string[];
  growing?:import('../scene/growth').GrowingPlant[];
  brokenZones:{objectId:string;zoneId:string}[];
  debris:DebrisState[];
  impacts:ImpactEvent[];
  control:PlayerControl;
  seated?:import('../scene/seating').SeatRef;
  /** Only unoccupied vehicles are stored here; the active body is this state. */
  vehicles:ParkedVehicle[];
  npcs:NpcState[];
  population?:AmbientState;
  economy?:EconomyState;
  distance:number;pitch:number;bank:number;
  jump:{held:boolean;bufferUntilS:number;coyoteUntilS:number};
}

export interface World {
  /** Immutable accepted revision; replace the world when applying a new scene. */
  scene: Scene;
  /** Host-computed accepted simulation contract; never supplied by Dream. */
  saveCompatibility?:string;
  previousSaveCompatibility?:string;
  previousMarketSaveCompatibility?:string;
  previousParkingSaveCompatibility?:string;
  previousRepairSaveCompatibility?:string;
  previousSupplySaveCompatibility?:string;
  previousNetworkSaveCompatibility?:string;
  previousPoolSaveCompatibility?:string;
  previousVergeSaveCompatibility?:string;
  previousPlantSaveCompatibility?:string;
  previousFinishSaveCompatibility?:string;
  previousCourierSaveCompatibility?:string;
  previousPeopleSaveCompatibility?:string;
  previousInvitationSaveCompatibility?:string;
  previousWalkingLinksSaveCompatibility?:string;
  previousCrossingAccessSaveCompatibility?:string;previousCrossingAccessContacts?:import('../scene/contacts').SceneContactData;previousCrossingAccessNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousStationMaintenanceSaveCompatibility?:string;
  previousDistrictSaveCompatibility?:string;previousDistrictContacts?:import('../scene/contacts').SceneContactData;previousDistrictNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousUpstairsSocialSaveCompatibility?:string;previousSeatedRestSaveCompatibility?:string;previousCompanySaveCompatibility?:string;previousLoftSaveCompatibility?:string;previousLoftContacts?:import('../scene/contacts').SceneContactData;previousLoftNavigation?:import('../scene/ambient-navigation').AmbientGraph;previousPeerRecipeSaveCompatibility?:string;previousCompanionSaveCompatibility?:string;previousGestureSaveCompatibility?:string;previousStationSaveCompatibility?:string;previousBondSaveCompatibility?:string;previousShelterSaveCompatibility?:string;previousAttendanceSaveCompatibility?:string;previousFloorsSaveCompatibility?:string;previousFloorsContacts?:import('../scene/contacts').SceneContactData;previousFloorsNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousStairsSaveCompatibility?:string;
  previousStairsContacts?:import('../scene/contacts').SceneContactData;
  previousStairsNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousRestSaveCompatibility?:string;
  previousWorkCommuteSaveCompatibility?:string;
  previousHomeMealsSaveCompatibility?:string;
  previousHomeInteriorSaveCompatibility?:string;
  previousHomeInteriorNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousHomeInteriorContacts?:import('../scene/contacts').SceneContactData;
  previousWeatherSaveCompatibility?:string;
  previousRationsSaveCompatibility?:string;
  previousSchoolInteriorSaveCompatibility?:string;
  previousSchoolInteriorNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousSchoolInteriorContacts?:import('../scene/contacts').SceneContactData;
  previousNurserySaveCompatibility?:string;
  previousHardwareSaveCompatibility?:string;
  previousRecoverySaveCompatibility?:string;
  previousResidentSupplySaveCompatibility?:string;
  previousWorkshopSupplySaveCompatibility?:string;
  previousKitProductionSaveCompatibility?:string;
  previousStrikeSaveCompatibility?:string;
  previousEquipmentSaveCompatibility?:string;
  previousServiceSaveCompatibility?:string;
  previousServiceNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousCharactersSaveCompatibility?:string;
  previousFixturesSaveCompatibility?:string;
  previousWildlifeSaveCompatibility?:string;previousWildlifeContacts?:import('../scene/contacts').SceneContactData;previousFurnitureSaveCompatibility?:string;previousFurnitureContacts?:import('../scene/contacts').SceneContactData;previousBotanySaveCompatibility?:string;previousBotanyContacts?:import('../scene/contacts').SceneContactData;previousCanopySaveCompatibility?:string;
  previousCanopyContacts?:import('../scene/contacts').SceneContactData;
  previousFleetSaveCompatibility?:string;
  previousTreeSaveCompatibility?:string;
  previousCoverageSaveCompatibility?:string;
  previousPeopleNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousPeopleContacts?:import('../scene/contacts').SceneContactData;
  previousJunctionSaveCompatibility?:string;
  previousJunctionNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousJunctionContacts?:import('../scene/contacts').SceneContactData;
  previousSpacingSaveCompatibility?:string;
  previousParkSaveCompatibility?:string;
  previousParkNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousCitySaveCompatibility?:string;
  previousCityNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousMatchSaveCompatibility?:string;
  previousBusinessSaveCompatibility?:string;previousSchoolRepairSaveCompatibility?:string;
  previousSocialSaveCompatibility?:string;
  previousShiftSaveCompatibility?:string;
  previousHoursSaveCompatibility?:string;
  previousSeatingSaveCompatibility?:string;
  previousKitchenSaveCompatibility?:string;
  previousMealSaveCompatibility?:string;
  previousProgressSaveCompatibility?:string;
  previousRecipeSaveCompatibility?:string;
  previousEgressSaveCompatibility?:string;
  previousInteriorSaveCompatibility?:string;
  previousInteriorNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousInteriorContacts?:import('../scene/contacts').SceneContactData;
  previousVergeNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  emptyEconomySaveCompatibility?:string;
  previousSaveSource?:string;
  /** Racing surface, independent of where the car may travel. */
  roadMask: RasterMask;
  /** Travel boundary. The fixture allows the whole sheet. */
  driveMask: RasterMask;
  carRadius: number;
  bodyHeight?:number;
  tuning?:CarTuning;
  dryGround?:boolean;
  damageEnabled?:boolean;
  effectsEnabled?:boolean;
  stepHeight?:number;
  jumpSpeed?:number;
  /** A walking body wades on the bed and floats at chest depth in deeper water. */
  waterSupport?:boolean;
}

export const TUNING = {
  engineAccel: 320, // px/s^2 at full throttle from rest
  brakeAccel: 460,
  reverseAccel: 180,
  maxForwardSpeed: 340, // engine force fades out approaching this
  maxReverseSpeed: 120,
  boostImpulse: 230, // px/s added along heading
  boostSpeedCap: 520, // hard cap applied when a boost fires
  boostCooldownS: 2.5,
  baseLateralGrip: 9, // 1/s exponential lateral-velocity decay
  iceLateralGrip: 1.3,
  lateralFriction: .7, // bounded tire impulse as a fraction of contact load
  iceLateralFriction: .025,
  coastFriction: .06, // rolling resistance at neutral throttle
  iceCoastFriction: .006,
  dragPerS: 0.25,
  turnRateRadS: 2.7,
  gravity: 300,
  maxTerrainSpeed: 560,
  checkpointHeight: 48,
} as const;

export type CarTuning={ [K in keyof typeof TUNING]:number };

export const CAR_BOOST={durationS:1,rechargeS:5,acceleration:650} as const;

/** Only player-owned car profiles get the manual boost capability. */
export function isCarControl(state:CarState,world:World):boolean {
  const control=state.control;
  return control.kind==='car' || control.kind==='vehicle' && controlOf(world.scene.objects.find(o=>o.id===control.id)?.spec)==='car';
}

export function createCarAtSpawn(scene: Scene): CarState {
  return {
    control:{kind:"car"},vehicles:[],npcs:initialNpcs(scene),population:initialAmbient(scene),economy:initialEconomy(scene),distance:0,pitch:0,bank:0,
    jump:{held:false,bufferUntilS:0,coyoteUntilS:0},
    ...(scene.strike ? {strikeReadyAtS:0} : {}),
    x: scene.spawn.x,
    y: scene.spawn.y,
    vx: 0,
    vy: 0,
    headingRad: scene.spawn.headingRad,
    elevation: drivingHeight(scene.terrain, scene.spawn.x, scene.spawn.y),
    vz: 0, grounded: true, landingSpeed: 0,
    timeS: 0,
    lap: 0,
    // Spawn sits just past the start line, so checkpoint 1 is next.
    nextCheckpoint: scene.checkpoints.length > 1 ? 1 : 0,
    surface: "road",
    boostReadyAtS: {},
    boostedThisStep: false,
    carBoost:{held:false,activeUntilS:0,readyAtS:0},
    sports:initialSports(scene),
    broken:[],brokenZones:[],debris:[],impacts:[],
    props: scene.objects
      .filter((o) => archetypeOf(o).interaction === "knockable")
      .map((o) => ({ id: o.id, x: o.x, y: o.y, vx: 0, vy: 0 })),
  };
}

/** Reset the car to spawn. Keeps lap/time unless `resetRace` is set. Idempotent. */
export function resetCar(state: CarState, scene: Scene, resetRace = false): CarState {
  const fresh = createCarAtSpawn(scene);
  if (resetRace) return fresh;
  state=leaveSharedMeal(state,scene);
  const vehicleId=state.control.kind==="vehicle" ? state.control.id : undefined;
  const saveVehicle=vehicleId && state.grounded && !(controlOf(scene.objects.find(o=>o.id===vehicleId)?.spec)==="plane" && waterAt(scene.terrain,state.x,state.y,drivingHeight(scene.terrain,state.x,state.y)));
  // Car-only reset leaves knocked props and safely parked vehicles where they lie.
  return {
    ...fresh,
    vehicles:[...state.vehicles.filter(v=>v.id!==null && !(state.control.kind==="vehicle" && v.id===state.control.id)),...(saveVehicle ? [{id:vehicleId,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:state.distance}] : [])],
    timeS: state.timeS,
    npcs:state.npcs.map(n=>({...n})),population:state.population,economy:state.economy,
    lap: state.lap,
    boostReadyAtS: { ...state.boostReadyAtS },
    ...(scene.strike ? {strikeReadyAtS:state.strikeReadyAtS} : {}),
    carBoost:{...fresh.carBoost,held:state.carBoost.held,readyAtS:state.carBoost.readyAtS},
    sports:state.sports.map(game=>({...game,held:false,possessed:false,chargeStartS:null,...(game.match ? {match:{...game.match,owner:null}} : {})})),
    props: state.props.map((p) => ({ ...p })),
    growing:state.growing,broken:[...state.broken],brokenZones:state.brokenZones.map(z=>({...z})),debris:state.debris.map(p=>({...p})),
  };
}

function segmentsCross(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number },
): boolean {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (denom === 0) return false;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  return t > 0 && t <= 1 && u >= 0 && u <= 1;
}

function crossedCheckpoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  cp: Checkpoint,
): boolean {
  const mdx = to.x - from.x;
  const mdy = to.y - from.y;
  if (mdx === 0 && mdy === 0) return false;
  // Directional: crossing against the travel direction never counts.
  if (mdx * cp.dir.x + mdy * cp.dir.y <= 0) return false;
  return segmentsCross(from, to, cp.a, cp.b);
}

export function carFootprintClear(world:World,x:number,y:number,elevation:number,timeS:number,state?:CarState):boolean {
  const height=world.bodyHeight??playerHeight(world.scene);
  return world.driveMask.footprintClear(x,y,world.carRadius) && (!world.dryGround || !waterAt(world.scene.terrain,x,y,drivingHeight(world.scene.terrain,x,y))) && !(world.waterSupport && elevation<drivingHeight(world.scene.terrain,x,y)-.05 && elevation+height>waterCeiling(world.scene.terrain,x,y,world.carRadius)) && ![...queryStaticContacts(world.scene,x,y,world.carRadius,state),...actorContacts(world.scene,timeS,state)]
    .some(s=>(!state?.seated || s.id!==state.seated.objectId) && (!state || !isBroken(state,s)) && elevation<s.top-.05 && elevation+height>s.bottom+.05 && contactOverlaps(s,x,y,world.carRadius));
}

/** A press is buffered across a landing; holding Space never repeats a jump. */
export function applyJump(s:CarState,input:CarInput,speed:number):void {
  if(input.jump && !s.jump.held)s.jump.bufferUntilS=s.timeS+.12;
  s.jump.held=!!input.jump;
  if(s.grounded)s.jump.coyoteUntilS=s.timeS+.1;
  if(s.jump.bufferUntilS>s.timeS && (s.grounded || s.jump.coyoteUntilS>s.timeS)){
    s.vz=Math.max(0,s.vz)+speed;s.grounded=false;
    s.jump.bufferUntilS=0;s.jump.coyoteUntilS=0;
  }
}

export function stepCar(state: CarState, input: CarInput, dt: number, world: World): CarState {
  const { scene, roadMask, driveMask, carRadius } = world;
  const tuning=world.tuning??TUNING;
  const s: CarState = {
    ...state,
    jump:{...state.jump},
    carBoost:{...state.carBoost},
    npcs:stepNpcs(state,dt,scene,input.talkPressed),population:stepAmbient(state,dt,scene),
    boostReadyAtS: { ...state.boostReadyAtS },
    boostedThisStep: false,
    landingSpeed: 0,
    props: state.props.map((p) => ({ ...p })),
    broken:state.broken,brokenZones:state.brokenZones,debris:[...state.debris],impacts:[],
  };
  s.timeS += dt;

  // Solid archetype colliders join the mask as "not drivable" for the car.
  const compiled=sceneContacts(scene);
  // Include the full fixed-step movement and any displacement by a moving actor.
  const moving=actorContacts(scene,s.timeS,s),height=world.bodyHeight??playerHeight(scene);
  const pushRange=moving.length ? 2*(carRadius+Math.max(...moving.map(a=>a.r))) : 0;
  const solids = [...queryStaticContacts(scene,s.x,s.y,carRadius+tuning.maxTerrainSpeed*dt+pushRange,s),...moving];
  const supportHeight = (x: number, y: number, fromHeight: number): number => {
    let floor = drivingHeight(scene.terrain, x, y);
    const water=world.waterSupport && waterAt(scene.terrain,x,y,terrainHeight(scene.terrain,x,y));
    // A swimmer stays below a bridge; somebody already on its deck stays on it.
    if(water && (floor<water.level+.5 || fromHeight<floor-.05))floor=Math.max(terrainHeight(scene.terrain,x,y),water.level-height*.65);
    for (const solid of solids) {
      if(isBroken(s,solid))continue;
      if (fromHeight >= solid.top - .05 && contactOverlaps(solid,x,y,carRadius))
        floor = Math.max(floor, solid.top);
    }
    return floor;
  };
  const blocked = (x: number, y: number): boolean => {
    if (!driveMask.footprintClear(x, y, carRadius) || world.dryGround && waterAt(scene.terrain,x,y,drivingHeight(scene.terrain,x,y))) return true;
    const step=world.stepHeight??0,raised=s.grounded && step>0 ? Math.max(s.elevation,supportHeight(x,y,s.elevation+step)) : s.elevation;
    if(raised-s.elevation>step+.05 || world.waterSupport && raised<drivingHeight(scene.terrain,x,y)-.05 && raised+height>waterCeiling(scene.terrain,x,y,carRadius))return true;
    for (const solid of solids) {
      if(isBroken(s,solid))continue;
      if (raised < solid.top - .05 && raised+height>solid.bottom+.05 && contactOverlaps(solid,x,y,carRadius)) return true;
    }
    return false;
  };
  // A moving vehicle can contact a stationary car; don't leave the two cylinders embedded.
  for(const actor of moving) {
    const dx=s.x-actor.x,dy=s.y-actor.y,distance=Math.hypot(dx,dy),r=carRadius+actor.r;
    if(distance>=r || s.elevation>=actor.top-.05 || s.elevation+height<=actor.bottom+.05)continue;
    for(let i=0;i<16;i++){
      const angle=Math.atan2(dy,dx)+i*Math.PI/8,x=actor.x+Math.cos(angle)*(r+.1),y=actor.y+Math.sin(angle)*(r+.1);
      if(!blocked(x,y)){s.x=x;s.y=y;s.vx=actor.vx;s.vy=actor.vy;break;}
    }
  }

  const ground = sampleTerrain(scene.terrain, s.x, s.y, s.vx, s.vy);
  const floor = supportHeight(s.x, s.y, s.elevation);
  const onObject = floor > ground.height + .05 || !!world.waterSupport && floor < ground.height-.05;
  if (s.grounded) {
    s.elevation = floor;
    s.vz = onObject ? 0 : ground.dx * s.vx + ground.dy * s.vy;
  }
  if(world.jumpSpeed)applyJump(s,input,world.jumpSpeed);
  else s.jump={held:!!input.jump,bufferUntilS:0,coyoteUntilS:0};

  const steer = Math.max(-1, Math.min(1, input.steer));
  const throttle = Math.max(-1, Math.min(1, input.throttle));

  // Derive surface each step, so leaving water or ice always restores normal grip.
  let surface: Surface = roadMask.isDrivable(s.x, s.y) || onStreet(scene,s.x,s.y) || scene.routes.some(r=>r.kind==="path" && r.surface && r.surface!=="trail" && distanceToRoad(routePath(r).points,s.x,s.y)<r.width!/2) ? "road" : "paper";
  const water = waterAt(scene.terrain,s.x,s.y,s.elevation);
  for (const region of world.effectsEnabled===false ? [] : scene.regions) {
    if (s.grounded && !onObject && region.rule.effect === "ICE" && pointInPolygon(s.x, s.y, region.polygon)) {
      surface = "ice";
    }
    if (s.grounded && !onObject && region.rule.effect === "BOOST" && pointInPolygon(s.x, s.y, region.polygon)) {
      const readyAt = s.boostReadyAtS[region.id] ?? 0;
      if (s.timeS >= readyAt) {
        s.vx += Math.cos(s.headingRad) * tuning.boostImpulse;
        s.vy += Math.sin(s.headingRad) * tuning.boostImpulse;
        const speed = Math.hypot(s.vx, s.vy);
        if (speed > tuning.boostSpeedCap) {
          s.vx = (s.vx / speed) * tuning.boostSpeedCap;
          s.vy = (s.vy / speed) * tuning.boostSpeedCap;
        }
        s.boostReadyAtS[region.id] = s.timeS + tuning.boostCooldownS;
        s.boostedThisStep = true;
      }
    }
  }
  // Exit cleanup is structural: grip is derived from position every step,
  // so leaving ICE restores baseline grip with nothing to undo.
  if(water) surface="water";
  s.surface = surface;

  const fx = Math.cos(s.headingRad);
  const fy = Math.sin(s.headingRad);
  const fwdSpeed = s.vx * fx + s.vy * fy;

  const carControl=isCarControl(s,world),pressed=input.boostPressed || input.boost && !s.carBoost.held;
  s.carBoost.held=!!input.boost;
  // Brake cancels thrust. Water and changing body cannot carry a car burst along.
  if(!carControl || water || throttle<0)s.carBoost.activeUntilS=0;
  if(pressed && carControl && s.grounded && !water && throttle>=0 && fwdSpeed>=-1 && s.timeS>=s.carBoost.readyAtS){
    s.carBoost.activeUntilS=s.timeS+CAR_BOOST.durationS;
    s.carBoost.readyAtS=s.carBoost.activeUntilS+CAR_BOOST.rechargeS;
    s.boostedThisStep=true;
  }
  const boosting=carControl && s.grounded && s.timeS<s.carBoost.activeUntilS;

  // Steering needs rolling speed; sign follows travel so reverse steers sanely.
  const steerAuthority = Math.max(-1, Math.min(1, fwdSpeed / 45));
  s.headingRad += steer * tuning.turnRateRadS * steerAuthority * dt * (s.grounded ? 1 : .15);

  const nfx = Math.cos(s.headingRad);
  const nfy = Math.sin(s.headingRad);
  let fwd = s.vx * nfx + s.vy * nfy;
  let lat = s.vx * -nfy + s.vy * nfx;
  const beforeEngine = fwd;
  const weatherGrip=!scene.weather || surface==="ice" || water || occupiedInterior(scene,s.x,s.y,s.elevation) ? 1 : sampleWeather(scene.weather,s.timeS).grip;

  if (s.grounded && throttle > 0) {
    const fade = Math.max(0, 1 - fwd / tuning.maxForwardSpeed);
    fwd += tuning.engineAccel * weatherGrip * fade * throttle * dt;
  } else if (s.grounded && throttle < 0) {
    if (fwd > 1) {
      fwd = Math.max(0, fwd + tuning.brakeAccel * weatherGrip * throttle * dt);
    } else {
      fwd = Math.max(-tuning.maxReverseSpeed, fwd + tuning.reverseAccel * weatherGrip * throttle * dt);
    }
  }
  if(boosting)fwd+=CAR_BOOST.acceleration*dt;
  const engineAccel = (fwd - beforeEngine) / dt;
  const drag = Math.exp(-(s.grounded ? tuning.dragPerS : .04) * dt);
  fwd *= drag;
  const grip = surface === "ice" ? tuning.iceLateralGrip : tuning.baseLateralGrip*weatherGrip;
  lat *= Math.exp(-(s.grounded ? grip : .04) * dt);

  s.vx = nfx * fwd + -nfy * lat;
  s.vy = nfy * fwd + nfx * lat;

  if(water) {
    const retention=Math.exp(-water.dragPerS*dt);
    s.vx=water.flow.x+(s.vx-water.flow.x)*retention;
    s.vy=water.flow.y+(s.vy-water.flow.y)*retention;
  }

  let contactLoad=tuning.gravity;
  if (s.grounded && !onObject && !world.waterSupport) {
    const denominator = 1 + ground.dx ** 2 + ground.dy ** 2;
    const bend = sampleTerrain(scene.terrain, s.x, s.y, s.vx, s.vy).bend;
    const normalForce = tuning.gravity + bend + (ground.dx * nfx + ground.dy * nfy) * engineAccel;
    contactLoad=Math.max(0,normalForce)/denominator;
    // Project forces onto the surface; a crest cannot pull the car down.
    if (normalForce < 0 && Math.hypot(s.vx, s.vy) > 60) s.grounded = false;
    else {
      s.vx -= normalForce * ground.dx / denominator * dt;
      s.vy -= normalForce * ground.dy / denominator * dt;
    }
    s.vz = ground.dx * s.vx + ground.dy * s.vy;
  }
  // Resolve tire resistance after gravity; decay alone never reaches a stable stop.
  if(s.grounded && !water){
    let forward=s.vx*nfx+s.vy*nfy,side=-s.vx*nfy+s.vy*nfx;
    const ice=surface==="ice",loadImpulse=contactLoad*dt;
    side=Math.sign(side)*Math.max(0,Math.abs(side)-(ice ? tuning.iceLateralFriction : tuning.lateralFriction)*loadImpulse);
    if(throttle===0 && !boosting)forward=Math.sign(forward)*Math.max(0,Math.abs(forward)-(ice ? tuning.iceCoastFriction : tuning.coastFriction)*loadImpulse);
    s.vx=nfx*forward-nfy*side;s.vy=nfy*forward+nfx*side;
    s.vz=onObject ? 0 : ground.dx*s.vx+ground.dy*s.vy;
  }
  const speed = Math.hypot(s.vx, s.vy);
  const speedCap=boosting ? Math.min(tuning.boostSpeedCap,tuning.maxTerrainSpeed) : tuning.maxTerrainSpeed;
  if (speed > speedCap) {
    s.vx *= speedCap / speed; s.vy *= speedCap / speed;
    s.vz *= speedCap / speed;
  }

  // Conservative substeps: no sub-move longer than half the footprint radius.
  const moveLen = Math.hypot(s.vx * dt, s.vy * dt);
  const substeps = Math.max(1, Math.ceil(Math.hypot(moveLen,s.vz*dt) / (carRadius * 0.5)));
  const sdt = dt / substeps;
  for (let i = 0; i < substeps; i++) {
    const from = { x: s.x, y: s.y };
    const dx = s.vx * sdt;
    const dy = s.vy * sdt;
    let nx = s.x + dx;
    let ny = s.y + dy;
    if(world.damageEnabled!==false)breakOnContact(s,world,nx,ny,solids);
    if (blocked(nx, ny)) {
      // Rollback with slide: try each axis from the last valid position.
      if (!blocked(nx, s.y)) {
        ny = s.y;
        s.vy = 0;
      } else if (!blocked(s.x, ny)) {
        nx = s.x;
        s.vx = 0;
      } else {
        nx = s.x;
        ny = s.y;
        s.vx *= 0.2;
        s.vy *= 0.2;
      }
    }
    s.x = nx;
    s.y = ny;

    const contact = supportHeight(s.x, s.y, s.elevation+(s.grounded ? world.stepHeight??0 : 0));
    let predicted = s.elevation + s.vz * sdt - .5 * tuning.gravity * sdt * sdt;
    if(world.waterSupport && s.elevation<drivingHeight(scene.terrain,s.x,s.y)-.05){
      const ceiling=waterCeiling(scene.terrain,s.x,s.y,carRadius)-height;
      if(predicted>ceiling){predicted=ceiling;s.vz=Math.min(0,s.vz);}
    }
    for(const solid of solids) if(!isBroken(s,solid) && s.elevation+height<=solid.bottom+.05 && predicted+height>solid.bottom && contactOverlaps(solid,s.x,s.y,carRadius)){
      predicted=solid.bottom-height;s.vz=Math.min(0,-Math.abs(s.vz)*.2);
    }
    if (s.grounded && contact < predicted - .08) s.grounded = false;
    if (!s.grounded) {
      s.elevation = predicted;
      s.vz -= tuning.gravity * sdt;
      if (s.elevation <= contact) {
        const slope = sampleTerrain(scene.terrain, s.x, s.y);
        const floorSpeed = contact > slope.height + .05 || world.waterSupport && contact<slope.height-.05 ? 0 : slope.dx * s.vx + slope.dy * s.vy;
        s.landingSpeed = Math.max(s.landingSpeed, floorSpeed - s.vz);
        const retention = 1 - Math.min(.22, Math.max(0, s.landingSpeed) * .0006);
        s.vx *= retention; s.vy *= retention;
        s.elevation = contact; s.grounded = true; s.vz = floorSpeed;
      }
    } else {
      s.elevation = contact;
      const slope = sampleTerrain(scene.terrain, s.x, s.y);
      s.vz = contact > slope.height + .05 || world.waterSupport && contact<slope.height-.05 ? 0 : slope.dx * s.vx + slope.dy * s.vy;
    }

    const expected = scene.checkpoints[s.nextCheckpoint];
    if (s.control.kind==="car" && expected && s.elevation - drivingHeight(scene.terrain, s.x, s.y) <= tuning.checkpointHeight && crossedCheckpoint(from, { x: s.x, y: s.y }, expected)) {
      if (s.nextCheckpoint === 0) s.lap += 1;
      s.nextCheckpoint = (s.nextCheckpoint + 1) % scene.checkpoints.length;
    }
  }

  // Knockable props: slide with friction, stay on the sheet, and get punted
  // by the car (light enough that the car itself is unaffected).
  const propById = compiled.objects;
  for (const prop of s.props) {
    const object = propById.get(prop.id);
    if (!object) continue;
    if(impactOf(object.spec)?.kind==="bounce")continue;
    const arch = archetypeOf(object);
    const r = objectRadius(object);
    const friction = Math.exp(-(arch.frictionPerS ?? 2.2) * dt);
    prop.vx *= friction;
    prop.vy *= friction;
    prop.x = Math.min(scene.canonical.width - r, Math.max(r, prop.x + prop.vx * dt));
    prop.y = Math.min(scene.canonical.height - r, Math.max(r, prop.y + prop.vy * dt));

    const dx = prop.x - s.x;
    const dy = prop.y - s.y;
    const dist = Math.hypot(dx, dy);
    const minDist = carRadius + r;
    if (dist > 0 && dist < minDist && s.elevation < objectPlacement(scene, object, prop.x, prop.y).base + objectHeight(object)) {
      const nx = dx / dist;
      const ny = dy / dist;
      prop.x = s.x + nx * minDist;
      prop.y = s.y + ny * minDist;
      prop.vx = s.vx * 1.15 + nx * 60;
      prop.vy = s.vy * 1.15 + ny * 60;
    }
  }
  s.distance+=(s.vx*Math.cos(s.headingRad)+s.vy*Math.sin(s.headingRad))*dt;
  advanceImpactMotion(s,world,dt,world.damageEnabled!==false);
  return s;
}

/**
 * Accumulates variable render-frame time and emits fixed steps, so replay
 * results depend only on inputs per fixed step, never on frame rate.
 */
export class FixedStepper {
  readonly stepDt: number;
  private accumulator = 0;
  stepsRun = 0;

  constructor(stepDt = 1 / 120) {
    this.stepDt = stepDt;
  }

  /** Fraction between the last two fixed poses; presentation never advances physics. */
  get alpha():number{return this.accumulator/this.stepDt;}

  /** Returns how many fixed steps to run for this render frame. */
  push(frameDtS: number): number {
    // Cap pathological frames (tab switch) instead of spiralling.
    this.accumulator += Math.min(frameDtS, 0.1);
    let steps = 0;
    while (this.accumulator + Number.EPSILON * 8 >= this.stepDt) {
      this.accumulator = Math.max(0,this.accumulator - this.stepDt);
      steps++;
    }
    this.stepsRun += steps;
    return steps;
  }

  reset(): void {
    this.accumulator = 0;
    this.stepsRun = 0;
  }
}
