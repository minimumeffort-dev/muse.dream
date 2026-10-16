import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { bridgeAt } from "../src/scene/landscape-dsl";
import { bridgeHeightAt } from "../src/game/surface";
import { terrainHeight, terrainSchema } from "../src/scene/terrain";
import { createWorldScene } from "../src/scene/world-fixture";
import { createFixtureScene, buildMaskForScene, CAR_RADIUS } from "../src/scene/fixture";
import { parseScene } from "../src/scene/schema";
import { validateScenePlayability } from "../src/scene/validate";
import { followCamera } from "../src/game/camera";
import { drapedPolygon, roadGeometry, terrainNormal } from "../src/game/environment";
import { surfaceHeight } from "../src/game/surface";
import { WorldParticles } from "../src/game/particles";
import { createCarAtSpawn } from "../src/sim/car";

describe("paper-authored landscape data", () => {
  const hill = { id: "hill", x: 500, y: 500, radiusX: 300, radiusY: 400, height: 200 };
  it("blends hills smoothly, has finite support, and caps overlapping heights", () => {
    const terrain = terrainSchema.parse({ hills: [hill] });
    expect(terrainHeight(terrain, 500, 500)).toBe(200);
    expect(terrainHeight(terrain, 800, 500)).toBe(0);
    expect(terrainHeight(terrain, 500, 950)).toBe(0);
    expect(terrainHeight(terrain, 799, 500)).toBeLessThan(.001);
    expect(terrainHeight({ hills: [hill, { ...hill, id: "other" }] }, 500, 500)).toBe(320);
  });
  it("rejects unbounded terrain and preserves flat legacy scenes", () => {
    for (const value of [NaN, Infinity, 321, -1])
      expect(() => terrainSchema.parse({ hills: [{ ...hill, height: value }] })).toThrow();
    expect(() => terrainSchema.parse({ hills: [hill, hill] })).toThrow();
    expect(() => terrainSchema.parse({ hills: [{ ...hill, shader: "void main(){}" }] })).toThrow();
    const { terrain: _, ...legacy } = createFixtureScene();
    expect(parseScene(legacy).terrain.hills).toEqual([]);
  });
  it("keeps the larger mock world's racing road playable", () => {
    const scene = createWorldScene();
    expect(validateScenePlayability(scene, buildMaskForScene(scene), CAR_RADIUS)).toEqual([]);
    expect(terrainHeight(scene.terrain, 1480, 670)).toBeGreaterThan(150);
    expect(scene.canonical.width).toBeGreaterThan(1900);
  });
});

describe("terrain and render alignment", () => {
  const scene = createWorldScene();
  it("subdivides long road straights and drapes every vertex over the same height field", () => {
    const positions = roadGeometry(scene).getAttribute("position");
    let low = Infinity, high = -Infinity, maxError=0;
    for (let i = 0; i < positions.count; i++) {
      const h = positions.getY(i);
      maxError=Math.max(maxError,Math.abs(h-surfaceHeight(scene,positions.getX(i)+scene.canonical.width/2,positions.getZ(i)+scene.canonical.height/2)-1.5));
      low = Math.min(low, h); high = Math.max(high, h);
    }
    expect(maxError).toBeLessThan(.0005);
    expect(high - low).toBeGreaterThan(90);
    expect(terrainNormal(scene, 1350, 1100).y).toBeLessThan(.99);
  });
  it("keeps triangle interiors above the rendered ground, including ice, boost and the road crest", () => {
    const groundAt = (x: number, y: number) => {
      const bridge=bridgeAt(scene.terrain.landscape,x,y),heightAt=bridge ? bridgeHeightAt(scene,bridge) : (x:number,y:number)=>terrainHeight(scene.terrain,x,y);
      const gx = Math.floor(x / 20) * 20, gy = Math.floor(y / 20) * 20;
      const geometry = new THREE.PlaneGeometry(20, 20); geometry.rotateX(-Math.PI / 2); geometry.translate(gx + 10, 0, gy + 10);
      const p = geometry.getAttribute("position");
      for (let i = 0; i < p.count; i++)p.setY(i, heightAt(p.getX(i), p.getZ(i)));
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()), ray = new THREE.Raycaster(new THREE.Vector3(x, 600, y), new THREE.Vector3(0, -1, 0));
      const height = ray.intersectObject(mesh)[0]!.point.y; geometry.dispose(); mesh.material.dispose(); return height;
    };
    const surfaces = [{ geometry:roadGeometry(scene), lift:1.5 }, ...scene.regions.map(region => ({ geometry:drapedPolygon(scene, region.polygon, 1.95), lift:1.95 }))];
    for (const {geometry,lift} of surfaces) {
      const p = geometry.getAttribute("position");
      for (let i = 0; i < p.count; i += 3 * 31) {
        const a = new THREE.Vector3().fromBufferAttribute(p,i), b = new THREE.Vector3().fromBufferAttribute(p,i+1), c = new THREE.Vector3().fromBufferAttribute(p,i+2);
        for (const [u,v] of [[.2,.3],[.65,.1]]) {
          const point = a.clone().multiplyScalar(1-u!-v!).addScaledVector(b,u!).addScaledVector(c,v!);
          expect(point.y-groundAt(point.x+3000,point.z+2400)).toBeCloseTo(lift,3);
        }
      }
      geometry.dispose();
    }
  });
  it("keeps boost arrows pointing along travel when polygon vertices are reordered", () => {
    const legacy = createFixtureScene(), polygon = legacy.regions.find(r=>r.rule.effect==="BOOST")!.polygon;
    const read = (order: typeof polygon) => {
      const geometry = drapedPolygon(legacy,order,1.95), p=geometry.getAttribute("position"), uv=geometry.getAttribute("uv");
      const result = polygon.map(corner=>{
        const index = Array.from({length:p.count},(_,i)=>i).find(i=>Math.abs(p.getX(i)+480-corner.x)<.001 && Math.abs(p.getZ(i)+360-corner.y)<.001)!;
        return [uv.getX(index),uv.getY(index)];
      });
      geometry.dispose(); return result;
    };
    const reference=read(polygon);
    for (const order of [[...polygon.slice(1),polygon[0]!],[...polygon].reverse()]) {
      const mapped=read(order);
      for (let i=0;i<polygon.length;i++)for(let axis=0;axis<2;axis++)expect(mapped[i]![axis]).toBeCloseTo(reference[i]![axis]!,5);
    }
    expect(reference[0]![1]).toBeGreaterThan(reference[3]![1]!);
  });
  it("keeps a concave effect polygon's area instead of filling its bounding box", () => {
    const polygon = [{ x: 400, y: 400 }, { x: 440, y: 400 }, { x: 440, y: 410 }, { x: 410, y: 410 }, { x: 410, y: 440 }, { x: 400, y: 440 }];
    const geo = drapedPolygon(scene, polygon, 2), p = geo.getAttribute("position");
    let area = 0;
    for (let i = 0; i < p.count; i += 3) {
      const ax = p.getX(i), az = p.getZ(i), bx = p.getX(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cz = p.getZ(i + 2);
      area += Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) / 2;
      expect(p.getY(i)).toBeCloseTo(surfaceHeight(scene, ax + scene.canonical.width/2, az + scene.canonical.height/2) + 2, 3);
    }
    expect(area).toBeCloseTo(700);
  });
  it("feathers the actual effect outline, including its concave notch", () => {
    const polygon=[{x:400,y:400},{x:480,y:400},{x:480,y:440},{x:440,y:440},{x:440,y:480},{x:400,y:480}];
    for(const outline of [polygon,[...polygon].reverse()]) {
      const geometry=drapedPolygon(scene,outline,1.65),p=geometry.getAttribute("position"),edge=geometry.getAttribute("edgeDistance");
      const distancesAt=(x:number,y:number)=>Array.from({length:p.count},(_,i)=>i)
        .filter(i=>Math.abs(p.getX(i)+3000-x)<.001 && Math.abs(p.getZ(i)+2400-y)<.001).map(i=>edge.getX(i));
      for(const [x,y,distance] of [[400,420,0],[440,440,0],[420,420,20],[460,420,20]]) {
        const values=distancesAt(x!,y!);expect(values.length).toBeGreaterThan(0);
        values.forEach(value=>expect(value).toBeCloseTo(distance!,3));
      }
      geometry.dispose();
    }
  });
  it("retains visible interiors for patches smaller than a terrain cell", () => {
    for(const polygon of [
      [{x:400,y:400},{x:420,y:400},{x:420,y:420},{x:400,y:420}],
      [{x:400,y:400},{x:420,y:400},{x:400,y:420}],
    ]) {
      const geometry=drapedPolygon(scene,polygon,1.65),edge=geometry.getAttribute("edgeDistance");
      expect(Math.max(...edge.array)).toBeGreaterThan(4);
      expect(Array.from(edge.array).every(Number.isFinite)).toBe(true);geometry.dispose();
    }
  });
});

describe("following camera and motion", () => {
  it("follows equally at 30 and 60 fps and snaps on reset or reduced motion", () => {
    const target = { x: 1200, y: 220, z: -900 };
    const run = (fps: number) => {
      let state = { x: 0, y: 0, z: 0 };
      for (let i = 0; i < fps; i++) state = followCamera(state, target, 1 / fps);
      return state;
    };
    expect(run(30).x).toBeCloseTo(run(60).x, 8);
    expect(run(30).x).toBeGreaterThan(1190);
    expect(followCamera(run(30), target, 0, true)).toEqual(target);
    expect(followCamera(target, { x: 0, y: 0, z: 0 }, 0)).toEqual(target);
  });
  it("bounds particle trails, lets them expire, and clears them for reduced motion", () => {
    const scene = createWorldScene(), particles = new WorldParticles(scene);
    const moving = { ...createCarAtSpawn(scene), vx: 250, surface: "paper" as const };
    for (let i = 0; i < 300; i++) particles.update(moving, 1 / 60, true, true);
    expect(particles.activeCount).toBeGreaterThan(0);
    expect(particles.activeCount).toBeLessThanOrEqual(256);
    particles.update({ ...moving, vx: 0 }, 2, true);
    expect(particles.activeCount).toBe(0);
    particles.update(moving, .1, true, true);
    particles.update(moving, .1, false);
    expect(particles.activeCount).toBe(0);
    const alpha = particles.mesh.geometry.getAttribute("opacity");
    expect(Array.from(alpha.array).every((v) => v === 0)).toBe(true);
  });
});
