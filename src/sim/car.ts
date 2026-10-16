import { objectPlacement } from "../scene/placement";
import type { Checkpoint, Scene } from "../scene/schema";
import { sampleTerrain, drivingHeight, waterAt } from "../scene/terrain";
import { archetypeOf, objectHeight, objectRadius } from "./archetypes";
import { pointInPolygon, type RasterMask } from "./mask";
import { sceneContacts } from "../scene/contacts";
import { actorContacts } from "./actors";
import { impactOf } from "../scene/object-dsl";
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
}

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
  /** Live knockable props, in scene-object order. Solids never move. */
  props: PropState[];
  broken:string[];
  brokenZones:{objectId:string;zoneId:string}[];
  debris:DebrisState[];
  impacts:ImpactEvent[];
  ride?:{actorId:string;parked:{x:number;y:number;headingRad:number;elevation:number}};
}

export interface World {
  /** Immutable accepted revision; replace the world when applying a new scene. */
  scene: Scene;
  /** Racing surface, independent of where the car may travel. */
  roadMask: RasterMask;
  /** Travel boundary. The fixture allows the whole sheet. */
  driveMask: RasterMask;
  carRadius: number;
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
  dragPerS: 0.25,
  turnRateRadS: 2.7,
  gravity: 300,
  maxTerrainSpeed: 560,
  checkpointHeight: 48,
} as const;

export function createCarAtSpawn(scene: Scene): CarState {
  return {
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
  // Car-only reset leaves knocked props where they lie.
  return {
    ...fresh,
    timeS: state.timeS,
    lap: state.lap,
    boostReadyAtS: { ...state.boostReadyAtS },
    props: state.props.map((p) => ({ ...p })),
    broken:[...state.broken],brokenZones:state.brokenZones.map(z=>({...z})),debris:state.debris.map(p=>({...p})),
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
  const data=sceneContacts(world.scene),height=world.scene.player?.body.colliderHeight ?? 14;
  return world.driveMask.footprintClear(x,y,world.carRadius) && ![...data.solids.query(x,y,world.carRadius+data.maxRadius),...actorContacts(world.scene,timeS)]
    .some(s=>(!state || !isBroken(state,s)) && elevation<s.top-.05 && elevation+height>s.bottom+.05 && Math.hypot(x-s.x,y-s.y)<world.carRadius+s.r);
}

export function stepCar(state: CarState, input: CarInput, dt: number, world: World): CarState {
  const { scene, roadMask, driveMask, carRadius } = world;
  const s: CarState = {
    ...state,
    boostReadyAtS: { ...state.boostReadyAtS },
    boostedThisStep: false,
    landingSpeed: 0,
    props: state.props.map((p) => ({ ...p })),
    broken:[...state.broken],brokenZones:state.brokenZones.map(z=>({...z})),debris:[...state.debris],impacts:[],
  };
  s.timeS += dt;

  // Solid archetype colliders join the mask as "not drivable" for the car.
  const compiled = sceneContacts(scene);
  // Include the full fixed-step movement and any displacement by a moving actor.
  const moving=actorContacts(scene,s.timeS),height=scene.player?.body.colliderHeight ?? 14;
  const pushRange=moving.length ? 2*(carRadius+Math.max(...moving.map(a=>a.r))) : 0;
  const solids = [...compiled.solids.query(s.x,s.y,carRadius + compiled.maxRadius + TUNING.maxTerrainSpeed*dt+pushRange),...moving];
  const supportHeight = (x: number, y: number, fromHeight: number): number => {
    let floor = drivingHeight(scene.terrain, x, y);
    for (const solid of solids) {
      if(isBroken(s,solid))continue;
      if (fromHeight >= solid.top - .05 && Math.hypot(x - solid.x, y - solid.y) < carRadius + solid.r)
        floor = Math.max(floor, solid.top);
    }
    return floor;
  };
  const blocked = (x: number, y: number): boolean => {
    if (!driveMask.footprintClear(x, y, carRadius)) return true;
    for (const solid of solids) {
      if(isBroken(s,solid))continue;
      if (s.elevation < solid.top - .05 && s.elevation+height>solid.bottom+.05 && Math.hypot(x - solid.x, y - solid.y) < carRadius + solid.r) return true;
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
  const onObject = floor > ground.height + .05;
  if (s.grounded) {
    s.elevation = floor;
    s.vz = onObject ? 0 : ground.dx * s.vx + ground.dy * s.vy;
  }

  const steer = Math.max(-1, Math.min(1, input.steer));
  const throttle = Math.max(-1, Math.min(1, input.throttle));

  // Derive surface each step, so leaving water or ice always restores normal grip.
  let surface: Surface = roadMask.isDrivable(s.x, s.y) ? "road" : "paper";
  const water = waterAt(scene.terrain,s.x,s.y,s.elevation);
  for (const region of scene.regions) {
    if (s.grounded && !onObject && region.rule.effect === "ICE" && pointInPolygon(s.x, s.y, region.polygon)) {
      surface = "ice";
    }
    if (s.grounded && !onObject && region.rule.effect === "BOOST" && pointInPolygon(s.x, s.y, region.polygon)) {
      const readyAt = s.boostReadyAtS[region.id] ?? 0;
      if (s.timeS >= readyAt) {
        s.vx += Math.cos(s.headingRad) * TUNING.boostImpulse;
        s.vy += Math.sin(s.headingRad) * TUNING.boostImpulse;
        const speed = Math.hypot(s.vx, s.vy);
        if (speed > TUNING.boostSpeedCap) {
          s.vx = (s.vx / speed) * TUNING.boostSpeedCap;
          s.vy = (s.vy / speed) * TUNING.boostSpeedCap;
        }
        s.boostReadyAtS[region.id] = s.timeS + TUNING.boostCooldownS;
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

  // Steering needs rolling speed; sign follows travel so reverse steers sanely.
  const steerAuthority = Math.max(-1, Math.min(1, fwdSpeed / 45));
  s.headingRad += steer * TUNING.turnRateRadS * steerAuthority * dt * (s.grounded ? 1 : .15);

  const nfx = Math.cos(s.headingRad);
  const nfy = Math.sin(s.headingRad);
  let fwd = s.vx * nfx + s.vy * nfy;
  let lat = s.vx * -nfy + s.vy * nfx;
  const beforeEngine = fwd;

  if (s.grounded && throttle > 0) {
    const fade = Math.max(0, 1 - fwd / TUNING.maxForwardSpeed);
    fwd += TUNING.engineAccel * fade * throttle * dt;
  } else if (s.grounded && throttle < 0) {
    if (fwd > 1) {
      fwd = Math.max(0, fwd + TUNING.brakeAccel * throttle * dt);
    } else {
      fwd = Math.max(-TUNING.maxReverseSpeed, fwd + TUNING.reverseAccel * throttle * dt);
    }
  }
  const engineAccel = (fwd - beforeEngine) / dt;
  const drag = Math.exp(-(s.grounded ? TUNING.dragPerS : .04) * dt);
  fwd *= drag;
  const grip = surface === "ice" ? TUNING.iceLateralGrip : TUNING.baseLateralGrip;
  lat *= Math.exp(-(s.grounded ? grip : .04) * dt);

  s.vx = nfx * fwd + -nfy * lat;
  s.vy = nfy * fwd + nfx * lat;

  if(water) {
    const retention=Math.exp(-water.dragPerS*dt);
    s.vx=water.flow.x+(s.vx-water.flow.x)*retention;
    s.vy=water.flow.y+(s.vy-water.flow.y)*retention;
  }

  if (s.grounded && !onObject) {
    const denominator = 1 + ground.dx ** 2 + ground.dy ** 2;
    const bend = sampleTerrain(scene.terrain, s.x, s.y, s.vx, s.vy).bend;
    const normalForce = TUNING.gravity + bend + (ground.dx * nfx + ground.dy * nfy) * engineAccel;
    // Project forces onto the surface; a crest cannot pull the car down.
    if (normalForce < 0 && Math.hypot(s.vx, s.vy) > 60) s.grounded = false;
    else {
      s.vx -= normalForce * ground.dx / denominator * dt;
      s.vy -= normalForce * ground.dy / denominator * dt;
    }
    s.vz = ground.dx * s.vx + ground.dy * s.vy;
  }
  const speed = Math.hypot(s.vx, s.vy);
  if (speed > TUNING.maxTerrainSpeed) {
    s.vx *= TUNING.maxTerrainSpeed / speed; s.vy *= TUNING.maxTerrainSpeed / speed;
    s.vz *= TUNING.maxTerrainSpeed / speed;
  }

  // Conservative substeps: no sub-move longer than half the footprint radius.
  const moveLen = Math.hypot(s.vx * dt, s.vy * dt);
  const substeps = Math.max(1, Math.ceil(moveLen / (carRadius * 0.5)));
  const sdt = dt / substeps;
  for (let i = 0; i < substeps; i++) {
    const from = { x: s.x, y: s.y };
    const dx = s.vx * sdt;
    const dy = s.vy * sdt;
    let nx = s.x + dx;
    let ny = s.y + dy;
    breakOnContact(s,world,nx,ny,solids);
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

    const contact = supportHeight(s.x, s.y, s.elevation);
    let predicted = s.elevation + s.vz * sdt - .5 * TUNING.gravity * sdt * sdt;
    for(const solid of solids) if(!isBroken(s,solid) && s.elevation+height<=solid.bottom+.05 && predicted+height>solid.bottom && Math.hypot(s.x-solid.x,s.y-solid.y)<carRadius+solid.r){
      predicted=solid.bottom-height;s.vz=Math.min(0,-Math.abs(s.vz)*.2);
    }
    if (s.grounded && contact < predicted - .08) s.grounded = false;
    if (!s.grounded) {
      s.elevation = predicted;
      s.vz -= TUNING.gravity * sdt;
      if (s.elevation <= contact) {
        const slope = sampleTerrain(scene.terrain, s.x, s.y);
        const floorSpeed = contact > slope.height + .05 ? 0 : slope.dx * s.vx + slope.dy * s.vy;
        s.landingSpeed = Math.max(s.landingSpeed, floorSpeed - s.vz);
        const retention = 1 - Math.min(.22, Math.max(0, s.landingSpeed) * .0006);
        s.vx *= retention; s.vy *= retention;
        s.elevation = contact; s.grounded = true; s.vz = floorSpeed;
      }
    } else {
      s.elevation = contact;
      const slope = sampleTerrain(scene.terrain, s.x, s.y);
      s.vz = contact > slope.height + .05 ? 0 : slope.dx * s.vx + slope.dy * s.vy;
    }

    const expected = scene.checkpoints[s.nextCheckpoint];
    if (expected && s.elevation - drivingHeight(scene.terrain, s.x, s.y) <= TUNING.checkpointHeight && crossedCheckpoint(from, { x: s.x, y: s.y }, expected)) {
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
  advanceImpactMotion(s,world,dt);
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
