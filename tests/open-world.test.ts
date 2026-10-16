import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createWorldScene } from "../src/scene/world-fixture";
import { parseScene } from "../src/scene/schema";
import { roadPoints, distanceToRoad } from "../src/scene/road";
import { buildMaskForScene } from "../src/scene/fixture";
import { validateScenePlayability } from "../src/scene/validate";
import { buildPaperMask } from "../src/sim/mask";
import { objectRadius } from "../src/sim/archetypes";
import { SpatialGrid } from "../src/sim/spatial";
import { createCarAtSpawn, stepCar, type World } from "../src/sim/car";
import { WorldScenery } from "../src/game/scenery";
import { WorldParticles } from "../src/game/particles";
import { mockWindmill } from "../src/scene/mock-objects";
import { objectDslSchema } from "../src/scene/object-dsl";
import { animateObject, buildObject } from "../src/game/world3d";

const scene = createWorldScene();

describe("bounded open-world scene", () => {
  it("has nine times the former area, a winding circuit and diverse assemblies", () => {
    expect(scene.canonical.width * scene.canonical.height).toBe(9 * 2000 * 1600);
    expect(new Set(scene.objects.filter(o => o.spec).map(o => o.spec!.displayName)).size).toBeGreaterThanOrEqual(12);
    expect(scene.objects.length).toBeGreaterThan(300);
    expect(scene.objects.length).toBeLessThan(700);
    expect(scene.checkpoints).toHaveLength(8);
    const points = roadPoints(scene), mask = buildMaskForScene(scene);
    for (const p of points) expect(mask.footprintClear(p.x, p.y, 11)).toBe(true);
    expect(mask.data.length).toBeLessThan(2_000_000);
    expect(mask.isDrivable(3000, 2400)).toBe(false);
    for(const object of scene.objects.filter(o=>!o.route)) expect(distanceToRoad(points,object.x,object.y)-objectRadius(object)).toBeGreaterThan(scene.roadMaskRef.params.roadWidth/2+15);
    expect(validateScenePlayability(scene, mask, 11)).toEqual([]);
  });
  it("keeps mock ice and boost footprints inside the road, pointing along travel", () => {
    const mask = buildMaskForScene(scene), path = roadPoints(scene);
    for (const region of scene.regions) {
      for (let i = 0; i < region.polygon.length; i++) {
        const a = region.polygon[i]!, b = region.polygon[(i+1)%region.polygon.length]!;
        for (let t = 0; t <= 1; t += .1)expect(mask.footprintClear(a.x+(b.x-a.x)*t, a.y+(b.y-a.y)*t, 20)).toBe(true);
      }
      const a = region.polygon[0]!, b = region.polygon[1]!, forward = new THREE.Vector2(b.x-a.x,b.y-a.y).normalize();
      const center = region.polygon.reduce((p,q)=>({x:p.x+q.x/4,y:p.y+q.y/4}),{x:0,y:0});
      const index = path.reduce((best,p,i)=>Math.hypot(p.x-center.x,p.y-center.y)<Math.hypot(path[best]!.x-center.x,path[best]!.y-center.y)?i:best,0);
      const direction = new THREE.Vector2(path[index+1]!.x-path[index-1]!.x,path[index+1]!.y-path[index-1]!.y).normalize();
      expect(forward.dot(direction)).toBeGreaterThan(.99);
    }
  });
  it("rejects collapsed, unbounded or off-sheet road proposals", () => {
    expect(() => parseScene({ ...scene, roadMaskRef: { kind: "generated-spline-loop", params: { roadWidth: 156, points: Array(6).fill({ x: 100, y: 100 }) } } })).toThrow();
    expect(() => parseScene({ ...scene, canonical: { ...scene.canonical, width: 9000 } })).toThrow();
    const tight = parseScene({ ...scene, roadMaskRef: { kind: "generated-spline-loop", params: { roadWidth: 240, points: [{ x: 300, y: 300 }, { x: 800, y: 300 }, { x: 850, y: 350 }, { x: 800, y: 800 }, { x: 300, y: 800 }, { x: 250, y: 500 }] } } });
    expect(validateScenePlayability(tight, buildMaskForScene(tight), 11)).toContainEqual(expect.objectContaining({ code: "road-bend-too-tight" }));
    const offSheet = parseScene({ ...scene, roadMaskRef: { kind: "generated-spline-loop", params: { roadWidth: 156, points: [{ x: 30, y: 30 }, { x: 500, y: 30 }, { x: 700, y: 700 }, { x: 500, y: 1000 }, { x: 200, y: 1000 }, { x: 10, y: 700 }] } } });
    expect(validateScenePlayability(offSheet, buildMaskForScene(offSheet), 11)).toContainEqual(expect.objectContaining({ code: "road-out-of-bounds" }));
  });
  it("keeps travel bounds exact even with a coarse world raster", () => {
    const mask = buildPaperMask(6001, 4801);
    expect(mask.footprintClear(12, 12, 11)).toBe(true);
    expect(mask.footprintClear(10, 12, 11)).toBe(false);
    expect(mask.footprintClear(5991, 4790, 11)).toBe(false);
    expect(mask.isDrivable(6001, 4800)).toBe(false);
    expect(mask.floodFrom(6001,4800).some(value=>value===1)).toBe(false);
  });
  it("finishes the full winding circuit through every ordered checkpoint", () => {
    const world: World = { scene, roadMask: buildMaskForScene(scene), driveMask: buildPaperMask(6000, 4800), carRadius: 11 };
    const path = roadPoints(scene), n = path.length - 1;
    let car = createCarAtSpawn(scene), cursor = 0; const seen = new Set<number>();
    for (let i = 0;i < 24000 && car.lap === 0;i++) {
      let best = Infinity; const previousCursor = cursor;
      for (let j = -5;j < 25;j++) {
        const index = (previousCursor + j + n) % n, p = path[index]!, distance = Math.hypot(car.x - p.x, car.y - p.y);
        if (distance < best) { best = distance; cursor = index; }
      }
      let aim = cursor, look = 0;
      while (look < 100) { const a = path[aim]!, b = path[(aim + 1) % n]!; look += Math.hypot(b.x - a.x, b.y - a.y); aim = (aim + 1) % n; }
      const p = path[aim]!, angle = Math.atan2(p.y - car.y, p.x - car.x) - car.headingRad;
      const error = Math.atan2(Math.sin(angle), Math.cos(angle));
      car = stepCar(car, { throttle: Math.hypot(car.vx, car.vy) > 215 ? -1 : 1, steer: Math.max(-1, Math.min(1, error * 2)) }, 1 / 120, world);
      seen.add(car.nextCheckpoint);
      expect(world.driveMask.footprintClear(car.x, car.y, 11)).toBe(true);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(car.lap).toBe(1);
    expect(distanceToRoad(path, car.x, car.y)).toBeLessThan(78);
  });
});

describe("local rendering and interaction budgets", () => {
  it("queries local colliders without losing a neighbor across a cell boundary", () => {
    const grid = new SpatialGrid(Array.from({ length: 1000 }, (_, i) => ({ x: i * 100, y: 0 })), 256);
    const nearby = grid.query(255, 0, 65);
    expect(nearby.some(p => p.x === 300)).toBe(true);
    expect(nearby.length).toBeLessThan(10);
  });
  it("instances repeated assemblies and fades only the obstructing instance", () => {
    const object = scene.objects.find(o => o.id === "cottage")!;
    const doc = parseScene({ ...scene, terrain: { hills: [] }, objects: [{ ...object, x: 3000, y: 2425 }, { ...object, id: "other", x: 3100, y: 2425 }] });
    const scenery = new WorldScenery(doc);
    expect(scenery.group.children.length).toBeLessThan(8);
    expect(scenery.group.children.every(m => m instanceof THREE.InstancedMesh)).toBe(true);
    const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 500);
    camera.position.set(0, 100, 200); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    scenery.update(camera, new THREE.Vector3(0, 7, 0), .1, true);
    expect(scenery.obscuredCount).toBe(1);
    const alpha = (scenery.group.children[0] as THREE.InstancedMesh).geometry.getAttribute("visibility");
    expect(alpha.getX(0)).toBeCloseTo(.22); expect(alpha.getX(1)).toBe(1);
    scenery.update(camera, new THREE.Vector3(-100, 7, 0), .1, true);
    expect(alpha.getX(0)).toBe(1);
  });
  it("preserves the full composed asset bounds when batching, including scaled cloth", () => {
    for (const id of ["castle", "mill"]) {
      const object = scene.objects.find(o => o.id === id)!;
      const doc = parseScene({ ...scene, terrain: { hills: [] }, objects: [{ ...object, x: 3000, y: 2400 }] });
      const source = buildObject(doc.objects[0]!); source.position.y = 1.5; source.updateMatrixWorld(true);
      const batched = new WorldScenery(doc).group; batched.updateMatrixWorld(true);
      const a = new THREE.Box3().setFromObject(source), b = new THREE.Box3().setFromObject(batched);
      expect(a.min.distanceTo(b.min)).toBeLessThan(.0001); expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
    }
  });
  it("runs bounded windmill rotation, pauses at rest and rejects executable motion", () => {
    const object = scene.objects.find(o => o.id === "mill")!, built = buildObject(object), part = built.getObjectByName(object.spec && "parts" in object.spec ? object.spec.parts.find(p=>p.animation?.kind==="spin")!.id : "")!;
    const initial = part.quaternion.clone(); animateObject(built, 2);
    expect(part.quaternion.angleTo(initial)).toBeCloseTo(1);
    animateObject(built, 2, false); expect(part.quaternion.angleTo(initial)).toBeCloseTo(0);
    expect(() => objectDslSchema.parse({ ...mockWindmill, parts: [{ ...mockWindmill.parts[0], animation: { kind: "spin", axis: "z", speed: 100 } }] })).toThrow();
  });
  it("does not emit tire dust in flight and gives landings a bounded radial burst", () => {
    const pool = new WorldParticles(scene), car = { ...createCarAtSpawn(scene), grounded: false, vx: 250, surface: "paper" as const };
    pool.update(car, .1, true); expect(pool.activeCount).toBe(0);
    pool.update({ ...car, grounded: true, vx: 0 }, .016, true, false, 140); expect(pool.activeCount).toBe(28);
    const positions = pool.mesh.geometry.getAttribute("position"), before = Array.from(positions.array);
    pool.update({ ...car, vx: 0 }, .1, true);
    const deltas = Array.from({ length: 28 }, (_, i) => positions.getX(i) - before[i * 3]!);
    expect(deltas.some(d => d > 0)).toBe(true); expect(deltas.some(d => d < 0)).toBe(true);
    pool.clear(); expect(pool.activeCount).toBe(0);
  });
});
