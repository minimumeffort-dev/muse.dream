import { describe, expect, it } from "vitest";
import { createFixtureScene, buildMaskForScene, CAR_RADIUS } from "../src/scene/fixture";
import { parseScene } from "../src/scene/schema";
import { sampleTerrain, terrainHeight } from "../src/scene/terrain";
import { createCarAtSpawn, FixedStepper, resetCar, stepCar, TUNING, type CarState, type World } from "../src/sim/car";
import { buildPaperMask } from "../src/sim/mask";
import { createWorldScene } from "../src/scene/world-fixture";
import {drivingReviewStart} from "../src/game/review-start";

const DT = 1 / 120, idle = { throttle: 0, steer: 0 };
const scene = parseScene({ ...createFixtureScene(), objects: [], regions: [],
  terrain: { hills: [{ id: "crest", x: 480, y: 360, radiusX: 180, radiusY: 180, height: 45 }] } });
const world: World = { scene, roadMask: buildMaskForScene(scene), driveMask: buildPaperMask(960, 720), carRadius: CAR_RADIUS };
const at = (x: number, vx = 0): CarState => ({ ...createCarAtSpawn(scene), x, y: 360, vx, vy: 0,
  headingRad: vx < 0 ? Math.PI : 0, elevation: terrainHeight(scene.terrain, x, 360) });

describe("terrain driving", () => {
  it("starts driving reviews at clear real-world poses and leaves normal starts untouched",()=>{
    const doc=createWorldScene(),w={...world,scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(6000,4800)},start=createCarAtSpawn(doc);
    const hill=drivingReviewStart(start,w,"sidehill"),coast=drivingReviewStart(start,w,"coast");
    expect(hill).toMatchObject({x:1290,y:1360,vx:0,vy:0,headingRad:Math.PI/2});
    expect(hill.elevation).toBe(terrainHeight(doc.terrain,hill.x,hill.y));
    expect(coast).toMatchObject({x:start.x,y:start.y,vx:-80,vy:0,headingRad:Math.PI});
    expect(drivingReviewStart(start,w,null)).toBe(start);
    expect(drivingReviewStart(start,w,"anything-else")).toBe(start);
    const blocked={...w,driveMask:buildPaperMask(100,100)};
    expect(drivingReviewStart(start,blocked,"sidehill")).toBe(start);
  });
  it("lets the mock player drive the opening road crest, jump and land without a scripted impulse", () => {
    const doc = createWorldScene();
    const mockWorld = { ...world, scene: doc, roadMask: buildMaskForScene(doc), driveMask: buildPaperMask(doc.canonical.width, doc.canonical.height) };
    let car = createCarAtSpawn(doc), clearance = 0, jumped = false, landed = false;
    for (let i = 0; i < 600; i++) {
      const wasGrounded = car.grounded;
      car = stepCar(car, { throttle: 1, steer: 0 }, DT, mockWorld);
      jumped ||= !car.grounded;
      landed ||= !wasGrounded && car.grounded;
      clearance = Math.max(clearance, car.elevation - terrainHeight(doc.terrain, car.x, car.y));
      expect(mockWorld.driveMask.footprintClear(car.x, car.y, CAR_RADIUS)).toBe(true);
    }
    expect(jumped).toBe(true);
    expect(landed).toBe(true);
    expect(clearance).toBeGreaterThan(1);
    expect(car.x).toBeGreaterThan(1520);
  });
  it("uses analytic slope and crest curvature consistent with the rendered height field", () => {
    const sample = sampleTerrain(scene.terrain, 420, 360, 200, 0);
    const derivative = (terrainHeight(scene.terrain, 420.01, 360) - terrainHeight(scene.terrain, 419.99, 360)) / .02;
    expect(sample.dx).toBeCloseTo(derivative, 6);
    expect(sample.dy).toBe(0);
    expect(sampleTerrain(scene.terrain, 480, 360, 300, 0).bend).toBeLessThan(-700);
  });

  it("slows uphill, accelerates downhill, and rolls back from rest on a slope", () => {
    const up = stepCar(at(420, 200), idle, DT, world);
    const down = stepCar(at(420, -200), idle, DT, world);
    const flat = parseScene({ ...scene, terrain: { hills: [] } });
    const coast = stepCar({ ...at(420, 200), elevation: 0 }, idle, DT, { ...world, scene: flat });
    expect(up.vx).toBeLessThan(coast.vx);
    expect(Math.abs(down.vx)).toBeGreaterThan(coast.vx);
    const roll = stepCar(at(420), idle, DT, world);
    expect(roll.vx).toBeLessThan(0);
    expect(roll.elevation).toBeLessThan(at(420).elevation);
  });
  it("holds the tires across a dry hillside instead of slowly sliding sideways from rest", () => {
    for(const headingRad of [Math.PI/2,-Math.PI/2]){
      const start={...at(420),headingRad};let car=start;
      for(let i=0;i<1200;i++)car=stepCar(car,idle,DT,world);
      expect(Math.hypot(car.x-start.x,car.y-start.y)).toBeLessThan(.001);
      expect(Math.hypot(car.vx,car.vy)).toBeLessThan(.001);
    }
  });
  it("coasts to a complete stop on dry flat ground after releasing the controls", () => {
    const flat=parseScene({...scene,terrain:{hills:[]}}),dry={...world,scene:flat};
    for(const vx of [80,-80]){
      let car={...at(420,vx),elevation:0};
      for(let i=0;i<600;i++)car=stepCar(car,idle,DT,dry);
      expect(Math.hypot(car.vx,car.vy)).toBe(0);
      const stopped=car;
      for(let i=0;i<600;i++)car=stepCar(car,idle,DT,dry);
      expect([car.x,car.y]).toEqual([stopped.x,stopped.y]);
    }
  });
  it("settles an existing side slip without stopping legitimate rolling or ice drift", () => {
    let dry={...at(420,-15),headingRad:Math.PI/2};
    for(let i=0;i<600;i++)dry=stepCar(dry,idle,DT,world);
    expect(Math.hypot(dry.vx,dry.vy)).toBeLessThan(.001);
    expect(Math.abs(dry.x-420)).toBeLessThan(5);
    const frozen={x:dry.x,y:dry.y};
    for(let i=0;i<600;i++)dry=stepCar(dry,idle,DT,world);
    expect(Math.hypot(dry.x-frozen.x,dry.y-frozen.y)).toBeLessThan(.001);
    const icy=parseScene({...scene,regions:[{id:"frozen-slope",labelText:"ICE",rule:{effect:"ICE"},polygon:[{x:240,y:300},{x:600,y:300},{x:600,y:420},{x:240,y:420}]}]});
    let ice={...at(420),headingRad:Math.PI/2};
    for(let i=0;i<360;i++)ice=stepCar(ice,idle,DT,{...world,scene:icy});
    expect(Math.abs(ice.x-420)).toBeGreaterThan(10);
    expect(ice.surface).toBe("ice");
  });
  it("preserves throttle power and airborne motion while resolving neutral coasting", () => {
    const flat=parseScene({...scene,terrain:{hills:[]}}),dry={...world,scene:flat};
    const start={...at(420,80),elevation:0};
    const noResistance={...dry,tuning:{...TUNING,lateralFriction:0,iceLateralFriction:0,coastFriction:0,iceCoastFriction:0}};
    expect(stepCar(start,{throttle:1,steer:0},DT,dry)).toEqual(stepCar(start,{throttle:1,steer:0},DT,noResistance));
    const flying={...start,elevation:100,grounded:false};
    expect(stepCar(flying,idle,DT,dry)).toEqual(stepCar(flying,idle,DT,noResistance));
  });
  it("replays a dry-ground stop identically at 30, 60 and 144 rendering fps", () => {
    const flat=parseScene({...scene,terrain:{hills:[]}}),dry={...world,scene:flat};
    const replay=(fps:number)=>{let car={...at(420,80),elevation:0};const clock=new FixedStepper();
      for(let frame=0;frame<fps*5;frame++)for(let i=clock.push(1/fps);i>0;i--)car=stepCar(car,idle,clock.stepDt,dry);
      return car;
    };
    expect(replay(30)).toEqual(replay(60));expect(replay(144)).toEqual(replay(60));
  });
  it("projects engine force onto steep terrain instead of gaining free climbing power", () => {
    const steep = parseScene({ ...scene, terrain: { hills: [{ id: "steep", x: 480, y: 360, radiusX: 120, radiusY: 180, height: 300 }] } });
    const car = { ...at(420), elevation: terrainHeight(steep.terrain, 420, 360) };
    expect(stepCar(car, { throttle: 1, steer: 0 }, DT, { ...world, scene: steep }).vx).toBeLessThan(0);
  });

  it("launches from a convex crest, falls ballistically, and lands above the ground", () => {
    let car = stepCar(at(480, 300), idle, DT, world);
    expect(car.grounded).toBe(false);
    let clearance = 0, impact = 0;
    for (let i = 0; i < 240; i++) {
      car = stepCar(car, idle, DT, world);
      const ground = terrainHeight(scene.terrain, car.x, car.y);
      clearance = Math.max(clearance, car.elevation - ground);
      impact = Math.max(impact, car.landingSpeed);
      expect(car.elevation).toBeGreaterThanOrEqual(ground - 1e-8);
    }
    expect(clearance).toBeGreaterThan(2);
    expect(impact).toBeGreaterThan(20);
    expect(car.grounded).toBe(true);
    expect(car.elevation).toBeCloseTo(0);
  });

  it("does not launch a slow car, and resets airborne state at the real spawn height", () => {
    expect(stepCar(at(480, 25), idle, DT, world).grounded).toBe(true);
    const fresh = resetCar({ ...at(480, 300), grounded: false, vz: 100, elevation: 200 }, scene);
    expect(fresh).toMatchObject({ grounded: true, vz: 0, landingSpeed: 0 });
    expect(fresh.elevation).toBe(terrainHeight(scene.terrain, scene.spawn.x, scene.spawn.y));
  });

  it("keeps airborne travel inside the full footprint boundary", () => {
    let car = { ...at(940, 400), elevation: 200, grounded: false };
    for (let i = 0; i < 120; i++) {
      car = stepCar(car, idle, DT, world);
      expect(world.driveMask.footprintClear(car.x, car.y, CAR_RADIUS)).toBe(true);
    }
    expect(car.x).toBeLessThanOrEqual(949);
  });

  it("replays jumps and landings identically at 30, 60 and 120 rendering fps", () => {
    const replay = (frameSteps: number) => {
      let car = at(480, 300); const stepper = new FixedStepper();
      for (let frame = 0; frame < 240 / frameSteps; frame++) {
        const steps = stepper.push(frameSteps * DT);
        for (let i = 0; i < steps; i++) car = stepCar(car, idle, DT, world);
      }
      return car;
    };
    expect(replay(4)).toEqual(replay(2));
    expect(replay(1)).toEqual(replay(2));
  });
});

describe("vertical contact and existing game rules", () => {
  const flat = parseScene({ ...scene, terrain: { hills: [] }, objects: [{ id: "block", kind: "custom", labelText: "BLOCK", x: 540, y: 360, scale: 1,
    spec: { dslVersion: 1, displayName: "Block", body: { interaction: "solid", colliderRadius: 15, colliderHeight: 24 },
      parts: [{ id: "box", shape: "box", position: [0, 12, 0], size: [30, 24, 30], material: { shaderStyle: "toon", colorA: "#555555", colorB: "#ffffff" } }] } }] });
  const flatWorld = { ...world, scene: flat };
  it("blocks low airborne side impacts but lets a high jump clear a low object", () => {
    const low = stepCar({ ...at(512, 400), elevation: 10, grounded: false }, idle, .03, flatWorld);
    expect(low.x).toBeLessThanOrEqual(514);
    const high = stepCar({ ...at(512, 400), elevation: 100, grounded: false }, idle, .1, flatWorld);
    expect(high.x).toBeGreaterThan(540);
  });
  it("lands safely on a solid top and falls off its edge without embedding", () => {
    let car = { ...at(540), elevation: 60, vz: -50, grounded: false };
    for (let i = 0; i < 80; i++) car = stepCar(car, idle, DT, flatWorld);
    expect(car).toMatchObject({ grounded: true, elevation: 24, vz: 0 });
    for (let i = 0; i < 120; i++) car = stepCar(car, { throttle: 1, steer: 0 }, DT, flatWorld);
    expect(car.x).toBeGreaterThan(580);
    expect(car.elevation).toBe(0);
    expect(car.grounded).toBe(true);
  });
  it("does not trigger boost or ice grip while airborne above a zone", () => {
    const original = createFixtureScene();
    const originalWorld = { ...world, scene: original, roadMask: buildMaskForScene(original) };
    const car = { ...createCarAtSpawn(original), x: 811, y: 360, elevation: 80, grounded: false };
    expect(stepCar(car, idle, DT, originalWorld).boostedThisStep).toBe(false);
    const ice = stepCar({ ...car, x: 480, y: 129, vx: 100, vy: 80 }, idle, DT, originalWorld);
    expect(ice.surface).not.toBe("ice");
    expect(ice.vy).toBeGreaterThan(79);
    const flying = { ...car, vx: 150, headingRad: 0 };
    expect(stepCar(flying, { throttle: 1, steer: 0 }, DT, originalWorld).vx)
      .toBe(stepCar(flying, idle, DT, originalWorld).vx);
  });
  it("does not apply road effects to a car supported by an obstacle roof", () => {
    const withZone = parseScene({ ...flat, regions: [{ id: "under-roof", labelText: "BOOST", rule: { effect: "BOOST" },
      polygon: [{ x: 520, y: 340 }, { x: 560, y: 340 }, { x: 560, y: 380 }, { x: 520, y: 380 }] }] });
    const car = { ...at(540), elevation: 24, grounded: true };
    expect(stepCar(car, idle, DT, { ...flatWorld, scene: withZone }).boostedThisStep).toBe(false);
  });
  it("counts a low jump through a checkpoint but rejects a flyover above its gate", () => {
    const original = createFixtureScene();
    const originalWorld = { ...world, scene: original, roadMask: buildMaskForScene(original) };
    const approach = { ...createCarAtSpawn(original), x: 811, y: 361, headingRad: -Math.PI / 2,
      vy: -240, grounded: false, nextCheckpoint: 1 };
    expect(stepCar({ ...approach, elevation: 15 }, idle, DT, originalWorld).nextCheckpoint).toBe(2);
    expect(stepCar({ ...approach, elevation: 80 }, idle, DT, originalWorld).nextCheckpoint).toBe(1);
  });
});
