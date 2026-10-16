import { describe, expect, it } from "vitest";
import { buildMaskForScene, CAR_RADIUS, createFixtureScene } from "../src/scene/fixture";
import { parseScene } from "../src/scene/schema";
import { validateScenePlayability } from "../src/scene/validate";
import { RasterMask } from "../src/sim/mask";

describe("fixture scene", () => {
  it("parses and is playable: spawn fits, checkpoints connected, island preserved", () => {
    const scene = createFixtureScene();
    const mask = buildMaskForScene(scene);
    expect(validateScenePlayability(scene, mask, CAR_RADIUS)).toEqual([]);
    expect(mask.isDrivable(scene.spawn.x, scene.spawn.y)).toBe(true);
    expect(mask.isDrivable(480, 360)).toBe(false);
  });
});

describe("scene schema boundary", () => {
  it("rejects an unsupported effect instead of inventing behavior for it", () => {
    const scene = createFixtureScene();
    const tampered = structuredClone(scene) as unknown as {
      regions: { rule: { effect: string } }[];
    };
    (tampered.regions[0] as { rule: { effect: string } }).rule.effect = "LAVA";
    expect(() => parseScene(tampered)).toThrow();
  });

  it("rejects non-finite coordinates", () => {
    const scene = createFixtureScene();
    const tampered = structuredClone(scene);
    tampered.spawn.x = Number.NaN;
    expect(() => parseScene(tampered)).toThrow();
  });
});

describe("playability validation", () => {
  it("rejects connected road pixels whose bottlenecks cannot fit the car", () => {
    const scene = createFixtureScene();
    const mask = buildMaskForScene(scene);
    // Cut both sides of the loop, leaving a one-pixel passage on each side.
    for (let y = 430; y <= 450; y++) {
      for (let x = 0; x < mask.width; x++) {
        if (x !== 149 && x !== 811) mask.data[y * mask.width + x] = 0;
      }
    }
    const north = scene.checkpoints[2]!;
    const nx = (north.a.x + north.b.x) / 2;
    const ny = (north.a.y + north.b.y) / 2;
    expect(mask.floodFrom(scene.spawn.x, scene.spawn.y)[ny * mask.width + nx]).toBe(1);
    expect(mask.footprintClear(nx, ny, CAR_RADIUS)).toBe(true);
    expect(validateScenePlayability(scene, mask, CAR_RADIUS))
      .toContainEqual(expect.objectContaining({ code: "checkpoint-unreachable" }));
  });

  it("accepts passages with enough car clearance", () => {
    const scene = createFixtureScene();
    const mask = buildMaskForScene(scene);
    for (let y = 430; y <= 450; y++) {
      for (let x = 0; x < mask.width; x++) {
        if (Math.abs(x - 149) > 16 && Math.abs(x - 811) > 16) mask.data[y * mask.width + x] = 0;
      }
    }
    expect(validateScenePlayability(scene, mask, CAR_RADIUS)).toEqual([]);
  });

  it("detects solid barricades between checkpoints", () => {
    const scene = createFixtureScene();
    const blocked = parseScene({ ...scene, objects: [
      ...scene.objects,
      ...[115, 145, 175, 205, 775, 805, 835, 865].map((x) => ({
        id: `barricade-${x}`, kind: "tire-stack", labelText: "TIRES", x, y: 440, scale: 1.2,
      })),
    ] });
    expect(validateScenePlayability(blocked, buildMaskForScene(scene), CAR_RADIUS))
      .toContainEqual(expect.objectContaining({ code: "checkpoint-unreachable" }));
  });

  it("rejects a road mask with mismatched dimensions", () => {
    const scene = createFixtureScene();
    const mask = new RasterMask(scene.canonical.width - 1, scene.canonical.height);
    expect(validateScenePlayability(scene, mask, CAR_RADIUS))
      .toEqual([expect.objectContaining({ code: "mask-dimensions" })]);
  });

  it("rejects a road too narrow for the car footprint", () => {
    const scene = createFixtureScene();
    if (scene.roadMaskRef.kind !== "generated-rounded-rect-loop") throw new Error("expected legacy loop");
    const narrow = parseScene({
      ...scene,
      revisionId: "narrow-test",
      roadMaskRef: {
        kind: "generated-rounded-rect-loop",
        params: { outer: scene.roadMaskRef.params.outer, roadWidth: 14 },
      },
    });
    const mask = buildMaskForScene(narrow);
    const problems = validateScenePlayability(narrow, mask, CAR_RADIUS);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.some((p) => p.code === "spawn-not-clear")).toBe(true);
  });

  it("flags duplicate stable IDs", () => {
    const scene = createFixtureScene();
    const dup = parseScene({
      ...scene,
      regions: scene.regions.map((r) => ({ ...r, id: "same-id" })),
    });
    const mask = buildMaskForScene(scene);
    const problems = validateScenePlayability(dup, mask, CAR_RADIUS);
    expect(problems.some((p) => p.code === "duplicate-id")).toBe(true);
  });

  it("flags a spawn placed off the road", () => {
    const scene = createFixtureScene();
    const bad = parseScene({ ...scene, spawn: { x: 480, y: 360, headingRad: 0 } });
    const mask = buildMaskForScene(scene);
    const problems = validateScenePlayability(bad, mask, CAR_RADIUS);
    expect(problems.some((p) => p.code === "spawn-not-clear")).toBe(true);
  });

  it("rejects an unknown object kind and a solid parked on the spawn", () => {
    const scene = createFixtureScene();
    const unknown = structuredClone(scene) as unknown as { objects: { kind: string }[] };
    (unknown.objects[0] as { kind: string }).kind = "ufo";
    expect(() => parseScene(unknown)).toThrow();

    const blocking = parseScene({
      ...scene,
      objects: [
        ...scene.objects,
        { id: "obj-blocker", kind: "tire-stack", labelText: "TIRES", x: scene.spawn.x, y: scene.spawn.y, scale: 1 },
      ],
    });
    const mask = buildMaskForScene(scene);
    const problems = validateScenePlayability(blocking, mask, CAR_RADIUS);
    expect(problems.some((p) => p.code === "object-blocks-route")).toBe(true);
  });
});
