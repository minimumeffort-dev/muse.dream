import { describe, expect, it } from "vitest";
import { buildMaskForScene, CAR_RADIUS, createFixtureScene } from "../src/scene/fixture";
import { buildPaperMask } from "../src/sim/mask";
import { objectRadius } from "../src/sim/archetypes";
import {
  createCarAtSpawn,
  FixedStepper,
  resetCar,
  stepCar,
  TUNING,
  type CarInput,
  type CarState,
  type World,
} from "../src/sim/car";

const scene = createFixtureScene();
const mask = buildMaskForScene(scene);
const world: World = {
  scene, roadMask: mask,
  driveMask: buildPaperMask(scene.canonical.width, scene.canonical.height),
  carRadius: CAR_RADIUS,
};
const roadOnlyWorld: World = { ...world, driveMask: mask };
const DT = 1 / 120;

function stateAt(patch: Partial<CarState>): CarState {
  return { ...createCarAtSpawn(scene), ...patch };
}

function drive(state: CarState, input: CarInput, steps: number): CarState {
  let s = state;
  for (let i = 0; i < steps; i++) s = stepCar(s, input, DT, world);
  return s;
}

describe("deterministic replay across rendering frame rates", () => {
  const inputForStep = (i: number): CarInput => ({
    throttle: 1,
    steer: Math.sin(i / 40) > 0.3 ? 0.6 : Math.sin(i / 40) < -0.3 ? -0.6 : 0,
  });

  function runWithFrames(frameSteps: number[]): CarState {
    const stepper = new FixedStepper(DT);
    let s = createCarAtSpawn(scene);
    let stepIndex = 0;
    for (const k of frameSteps) {
      const steps = stepper.push(k * DT);
      for (let i = 0; i < steps; i++) {
        s = stepCar(s, inputForStep(stepIndex++), DT, world);
      }
    }
    expect(stepper.stepsRun).toBe(360);
    return s;
  }

  it("produces identical state at 60fps, 30fps, and irregular frames", () => {
    const at60 = runWithFrames(Array.from({ length: 180 }, () => 2));
    const at30 = runWithFrames(Array.from({ length: 90 }, () => 4));
    const irregular: number[] = [];
    let total = 0;
    const pattern = [1, 3, 2, 5, 1, 4];
    let pi = 0;
    while (total < 360) {
      const k = Math.min(pattern[pi++ % pattern.length] as number, 360 - total);
      irregular.push(k);
      total += k;
    }
    const atIrregular = runWithFrames(irregular);

    for (const other of [at30, atIrregular]) {
      expect(other.x).toBeCloseTo(at60.x, 9);
      expect(other.y).toBeCloseTo(at60.y, 9);
      expect(other.headingRad).toBeCloseTo(at60.headingRad, 9);
      expect(other.lap).toBe(at60.lap);
      expect(other.nextCheckpoint).toBe(at60.nextCheckpoint);
    }
    // The replay actually went somewhere.
    expect(Math.hypot(at60.x - scene.spawn.x, at60.y - scene.spawn.y)).toBeGreaterThan(50);
  });
});

describe("footprint collision with an explicit road-only boundary", () => {
  it("never lets the footprint leave the road when driving into the outer wall", () => {
    let s = stateAt({ x: 480, y: 615, headingRad: Math.PI / 2 });
    for (let i = 0; i < 240; i++) {
      s = stepCar(s, { steer: 0, throttle: 1 }, DT, roadOnlyWorld);
      expect(mask.footprintClear(s.x, s.y, CAR_RADIUS)).toBe(true);
    }
    // Stopped against the bottom boundary (outer edge y=650) instead of through it.
    expect(s.y).toBeLessThan(650 - CAR_RADIUS + 1);
    expect(s.y).toBeGreaterThan(600);
  });

  it("never lets the footprint cross into the center island", () => {
    let s = stateAt({ x: 480, y: 560, headingRad: -Math.PI / 2 });
    for (let i = 0; i < 240; i++) {
      s = stepCar(s, { steer: 0, throttle: 1 }, DT, roadOnlyWorld);
      expect(mask.footprintClear(s.x, s.y, CAR_RADIUS)).toBe(true);
      expect(mask.isDrivable(480, 360)).toBe(false); // island center stays a hole
    }
    // Island bottom edge is y=532; the car must stay south of it.
    expect(s.y - CAR_RADIUS).toBeGreaterThan(532 - 1);
  });
});

describe("open paper world", () => {
  it("crosses the inner road edge onto the island, then rejoins the road", () => {
    const onPaper = drive(stateAt({ x: 480, y: 560, headingRad: -Math.PI / 2 }), { steer: 0, throttle: 1 }, 100);
    expect(onPaper.y).toBeLessThan(500);
    expect(onPaper.surface).toBe("paper");
    expect(mask.isDrivable(onPaper.x, onPaper.y)).toBe(false);
    expect(onPaper.lap).toBe(0);
    const back = drive({ ...onPaper, headingRad: Math.PI / 2, vx: 0, vy: 0 }, { steer: 0, throttle: 1 }, 100);
    expect(back.y).toBeGreaterThan(540);
    expect(back.surface).toBe("road");
  });

  it("crosses the outer road edge but keeps the full footprint on the sheet", () => {
    let s = stateAt({ x: 480, y: 615, headingRad: Math.PI / 2 });
    for (let i = 0; i < 360; i++) {
      s = stepCar(s, { steer: 0, throttle: 1 }, DT, world);
      expect(world.driveMask.footprintClear(s.x, s.y, CAR_RADIUS)).toBe(true);
    }
    expect(s.y).toBeGreaterThan(680);
    expect(s.y).toBeLessThanOrEqual(scene.canonical.height - CAR_RADIUS);
    expect(s.surface).toBe("paper");
  });

  it("drives from the road to the composed castle and stops at its collider", () => {
    const castle = scene.objects.find((o) => o.id === "obj-invented-castle")!;
    let s = stateAt({ x: castle.x, y: 591, headingRad: -Math.PI / 2 });
    for (let i = 0; i < 240; i++) {
      s = stepCar(s, { steer: 0, throttle: 1 }, DT, world);
      expect(Math.hypot(s.x - castle.x, s.y - castle.y)).toBeGreaterThanOrEqual(CAR_RADIUS + objectRadius(castle));
    }
    expect(s.y).toBeLessThan(515);
    expect(s.y).toBeGreaterThanOrEqual(castle.y + CAR_RADIUS + objectRadius(castle));
    expect(s.surface).toBe("paper");
    const reset = resetCar(s, scene);
    expect(reset).toMatchObject({ x: scene.spawn.x, y: scene.spawn.y, surface: "road" });
  });

  it("restores normal grip when leaving ICE for paper", () => {
    const after = stepCar(stateAt({ x: 480, y: 200, surface: "ice", headingRad: 0, vy: 80 }),
      { steer: 0, throttle: 0 }, DT, world);
    expect(after.surface).toBe("paper");
    const normal=stepCar(stateAt({x:480,y:200,surface:"paper",headingRad:0,vy:80}),{steer:0,throttle:0},DT,world);
    expect(after).toEqual(normal);
    expect(after.vy).toBeLessThan(75);
  });
});

describe("ice", () => {
  it("keeps far more lateral slide on ICE than on road", () => {
    const base = { headingRad: 0, vx: 100, vy: 80 };
    const onRoad = drive(stateAt({ ...base, x: 480, y: 591 }), { steer: 0, throttle: 0 }, 60);
    const onIce = drive(stateAt({ ...base, x: 480, y: 129 }), { steer: 0, throttle: 0 }, 60);
    expect(onIce.surface).toBe("ice");
    expect(onRoad.surface).toBe("road");
    // Heading is east, so vy is the lateral component.
    expect(Math.abs(onRoad.vy)).toBeLessThan(5);
    expect(Math.abs(onIce.vy)).toBeGreaterThan(Math.abs(onRoad.vy) * 5);
  });

  it("restores baseline grip immediately on exit (no stuck ice state)", () => {
    const sliding = drive(
      stateAt({ x: 480, y: 129, headingRad: 0, vx: 100, vy: 80 }),
      { steer: 0, throttle: 0 },
      30,
    );
    expect(sliding.surface).toBe("ice");
    // Same velocity, now positioned on plain road: surface flips in one step.
    const exited = stepCar({ ...sliding, x: 480, y: 591 }, { steer: 0, throttle: 0 }, DT, world);
    expect(exited.surface).toBe("road");
    const settled = drive(exited, { steer: 0, throttle: 0 }, 60);
    expect(Math.abs(settled.vy)).toBeLessThan(5);
  });
});

describe("boost", () => {
  const inBoost = { x: 811, y: 360, headingRad: -Math.PI / 2 };

  it("applies a bounded impulse and never exceeds the boost speed cap", () => {
    const fast = stateAt({ ...inBoost, vx: 0, vy: -500 });
    const after = stepCar(fast, { steer: 0, throttle: 0 }, DT, world);
    expect(after.boostedThisStep).toBe(true);
    const speed = Math.hypot(after.vx, after.vy);
    expect(speed).toBeLessThanOrEqual(TUNING.boostSpeedCap);
    expect(speed).toBeGreaterThan(500);
  });

  it("does not refire during cooldown, and fires again after it", () => {
    const first = stepCar(stateAt({ ...inBoost, vx: 0, vy: 0 }), { steer: 0, throttle: 0 }, DT, world);
    expect(first.boostedThisStep).toBe(true);

    const duringCooldown = stepCar(
      { ...first, ...inBoost, vx: 0, vy: 0 },
      { steer: 0, throttle: 0 },
      DT,
      world,
    );
    expect(duringCooldown.boostedThisStep).toBe(false);
    expect(Math.hypot(duringCooldown.vx, duringCooldown.vy)).toBeLessThan(1);

    const afterCooldown = stepCar(
      { ...first, ...inBoost, vx: 0, vy: 0, timeS: first.timeS + TUNING.boostCooldownS + 0.1 },
      { steer: 0, throttle: 0 },
      DT,
      world,
    );
    expect(afterCooldown.boostedThisStep).toBe(true);
    expect(Math.hypot(afterCooldown.vx, afterCooldown.vy)).toBeGreaterThan(150);
  });
});

describe("ordered directional checkpoints", () => {
  it("counts a lap only when the start line is the expected checkpoint", () => {
    const crossingStart = { x: 455, y: 591, headingRad: 0, vx: 220, vy: 0 };
    const farmed = drive(stateAt({ ...crossingStart, nextCheckpoint: 1 }), { steer: 0, throttle: 0 }, 90);
    expect(farmed.x).toBeGreaterThan(480); // it really crossed the line
    expect(farmed.lap).toBe(0);
    expect(farmed.nextCheckpoint).toBe(1);

    const legit = drive(stateAt({ ...crossingStart, nextCheckpoint: 0 }), { steer: 0, throttle: 0 }, 90);
    expect(legit.lap).toBe(1);
    expect(legit.nextCheckpoint).toBe(1);
  });

  it("ignores wrong-direction crossings and accepts correct ones", () => {
    // CP-east is the horizontal line y=360 on the right straight, travel north.
    const southbound = drive(
      stateAt({ x: 811, y: 335, headingRad: Math.PI / 2, vx: 0, vy: 220, nextCheckpoint: 1 }),
      { steer: 0, throttle: 0 },
      90,
    );
    expect(southbound.y).toBeGreaterThan(360);
    expect(southbound.nextCheckpoint).toBe(1);

    const northbound = drive(
      stateAt({ x: 811, y: 385, headingRad: -Math.PI / 2, vx: 0, vy: -220, nextCheckpoint: 1 }),
      { steer: 0, throttle: 0 },
      90,
    );
    expect(northbound.y).toBeLessThan(360);
    expect(northbound.nextCheckpoint).toBe(2);
  });

  it("drives a full scripted lap by teleporting between checkpoint approaches", () => {
    // Exercises the ordering state machine end to end: 1 -> 2 -> 3 -> 0 = lap.
    let s = stateAt({ x: 811, y: 385, headingRad: -Math.PI / 2, vx: 0, vy: -220, nextCheckpoint: 1 });
    s = drive(s, { steer: 0, throttle: 0 }, 90);
    expect(s.nextCheckpoint).toBe(2);
    s = drive({ ...s, x: 505, y: 129, headingRad: Math.PI, vx: -220, vy: 0 }, { steer: 0, throttle: 0 }, 90);
    expect(s.nextCheckpoint).toBe(3);
    s = drive({ ...s, x: 149, y: 335, headingRad: Math.PI / 2, vx: 0, vy: 220 }, { steer: 0, throttle: 0 }, 90);
    expect(s.nextCheckpoint).toBe(0);
    expect(s.lap).toBe(0);
    s = drive({ ...s, x: 455, y: 591, headingRad: 0, vx: 220, vy: 0 }, { steer: 0, throttle: 0 }, 90);
    expect(s.lap).toBe(1);
    expect(s.nextCheckpoint).toBe(1);
  });
});

describe("object archetypes", () => {
  it("a solid tire stack blocks the car like a wall", () => {
    // obj-tire-1 sits mid-road on the bottom straight at (640, 591), r=15.
    let s = stateAt({ x: 575, y: 591, headingRad: 0, vx: 240, vy: 0 });
    for (let i = 0; i < 180; i++) {
      s = stepCar(s, { steer: 0, throttle: 1 }, DT, world);
      const dist = Math.hypot(s.x - 640, s.y - 591);
      expect(dist).toBeGreaterThanOrEqual(CAR_RADIUS + 15 - 0.6);
      expect(mask.footprintClear(s.x, s.y, CAR_RADIUS)).toBe(true);
    }
    expect(s.x).toBeLessThan(640);
  });

  it("a knockable cone is punted aside and the car drives through its spot", () => {
    // obj-cone-1 starts at (720, 620); approach on y=628 uses the south
    // slalom gap past the tire stack and clips the cone.
    const start = stateAt({ x: 600, y: 628, headingRad: 0, vx: 240, vy: 0 });
    const after = drive(start, { steer: 0, throttle: 1 }, 150);
    expect(after.x).toBeGreaterThan(740); // car passed the cone's home
    const cone = after.props.find((p) => p.id === "obj-cone-1");
    expect(cone).toBeDefined();
    const moved = Math.hypot((cone?.x ?? 720) - 720, (cone?.y ?? 620) - 620);
    expect(moved).toBeGreaterThan(25); // and the cone ended up elsewhere

    // Race reset restores props; car-only reset leaves them lying there.
    const raceReset = resetCar(after, scene, true);
    expect(raceReset.props.find((p) => p.id === "obj-cone-1")).toMatchObject({ x: 720, y: 620 });
    const carOnly = resetCar(after, scene, false);
    expect(carOnly.props.find((p) => p.id === "obj-cone-1")?.x).toBe(cone?.x);
  });

  it("an invented knockable spec behaves through the same physics path", () => {
    // obj-invented-mushroom (custom, knockable, r=10) sits at (300, 600).
    const start = stateAt({ x: 375, y: 600, headingRad: Math.PI, vx: -240, vy: 0 });
    const after = drive(start, { steer: 0, throttle: 1 }, 130);
    expect(after.x).toBeLessThan(275);
    const shroom = after.props.find((p) => p.id === "obj-invented-mushroom");
    expect(shroom).toBeDefined();
    expect(Math.hypot((shroom?.x ?? 300) - 300, (shroom?.y ?? 600) - 600)).toBeGreaterThan(20);
  });

  it("invents nothing beyond its bounds: friction comes from the archetype table", () => {
    const idle = drive(stateAt({ props: [{ id: "obj-invented-mushroom", x: 300, y: 600, vx: 100, vy: 0 }] }), { steer: 0, throttle: 0 }, 120);
    const shroom = idle.props.find((p) => p.id === "obj-invented-mushroom");
    // spec frictionPerS = 1.6 -> after 1s, vx ~= 100 * exp(-1.6) ~= 20.
    expect(shroom?.vx ?? 0).toBeGreaterThan(10);
    expect(shroom?.vx ?? 99).toBeLessThan(32);
  });
});
