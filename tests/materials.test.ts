import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { compileDream, checkDream, formatDream } from "../src/scene/dream";
import { buildObject } from "../src/game/world3d";
import { compactObject } from "../src/game/compact-object";
import { batchPrototype } from "../src/game/scenery";
import { createFixtureScene, buildMaskForScene } from "../src/scene/fixture";
import { parseScene } from "../src/scene/schema";
import { buildPaperMask } from "../src/sim/mask";
import { createCarAtSpawn, stepCar } from "../src/sim/car";
import { WorldDebris } from "../src/game/debris";
import { objectFragments } from "../src/scene/fragments";
import example from "../docs/examples/material-finishes.dream?raw";
import wall from "../docs/examples/voxel-wall.dream?raw";

const spec = compileDream(example)[0]!;
const object = { id: "materials", kind: "custom" as const, labelText: spec.displayName, x: 0, y: 0, scale: 2.7, spec };

function samples(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const result: number[][] = [];
  group.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const geometry = node.geometry, p = geometry.getAttribute("position"), uvw = geometry.getAttribute("surfacePosition");
    expect(uvw.count).toBe(p.count);
    for (let i = 0; i < (geometry.index?.count ?? p.count); i++) {
      const j = geometry.index?.getX(i) ?? i;
      result.push([...new THREE.Vector3().fromBufferAttribute(p, j).applyMatrix4(node.matrixWorld).toArray(), uvw.getX(j), uvw.getY(j), uvw.getZ(j)]);
    }
  });
  const key = (s: number[]) => s.map(x => Math.round(x * 1000)).join(",");
  return result.sort((a, b) => key(a).localeCompare(key(b)));
}

describe("physical material finishes", () => {
  it("compiles and formats a complete three-finish example while rejecting invented shaders", () => {
    expect(checkDream(example).ok).toBe(true);
    expect(compileDream(formatDream(example))).toEqual([spec]);
    expect(new Set(spec.parts.map(p => p.material.shaderStyle))).toEqual(new Set(["brick", "wood", "stone"]));
    expect(checkDream(example.replace("style=brick", "style=custom_shader")).ok).toBe(false);
  });

  it("joins adjacent brick parts in one coordinate frame without stretching each wall's courses", () => {
    const panel = spec.parts[0]!, a = { ...panel, id: "a", size: [32,28,4] as [number,number,number], position: [-16,17,0] as [number,number,number] }, b = { ...a, id: "b", position: [16,17,0] as [number,number,number] };
    const group = buildObject({ ...object, spec: { ...spec, parts: [a,b] } });
    const left = (group.getObjectByName("a") as THREE.Mesh).geometry.getAttribute("surfacePosition");
    const right = (group.getObjectByName("b") as THREE.Mesh).geometry.getAttribute("surfacePosition");
    const atJoin = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => Array.from({ length: a.count }, (_, i) => [a.getX(i), a.getY(i), a.getZ(i)]).filter(p => Math.abs(p[0]!) < .00001).map(p => p.join(",")).sort();
    expect(atJoin(left)).toEqual(atJoin(right));
    expect(atJoin(left).length).toBeGreaterThan(0);
  });

  it("preserves the finish at every vertex through rigid merging, instance prototypes and rotation", () => {
    const raw = buildObject(object), compact = compactObject(buildObject(object)), prototype = batchPrototype(buildObject(object));
    expect(compact.children.length).toBeLessThan(raw.children.length);
    for (const other of [compact, prototype]) {
      for (const group of [raw, other]) { group.position.set(95, 27, -200); group.rotation.set(.2, .8, -.1); }
      const a = samples(raw), b = samples(other);
      expect(b.length).toBe(a.length);
      let error = 0;
      for (let i = 0; i < a.length; i++) for (let j = 0; j < a[i]!.length; j++) error = Math.max(error, Math.abs(a[i]![j]! - b[i]![j]!));
      expect(error).toBeLessThan(.0001);
    }
  });

  it("keeps wood grain along a slat's long dimension and preserves its physical scale", () => {
    const group = buildObject(object), slat = spec.parts.find(p => p.material.shaderStyle === "wood")!;
    const mesh = group.getObjectByName(slat.id) as THREE.Mesh;
    const coordinates = mesh.geometry.getAttribute("surfacePosition"), bounds = new THREE.Box3().setFromBufferAttribute(coordinates as THREE.BufferAttribute).getSize(new THREE.Vector3());
    expect(bounds.y).toBeCloseTo(slat.size[0]);
    expect(bounds.x).toBeCloseTo(slat.size[1]);
    group.updateMatrixWorld(true);
    const positions = mesh.geometry.getAttribute("position");
    const a = new THREE.Vector3().fromBufferAttribute(positions, 0).applyMatrix4(mesh.matrixWorld), b = new THREE.Vector3().fromBufferAttribute(positions, 1).applyMatrix4(mesh.matrixWorld);
    const u = new THREE.Vector3().fromBufferAttribute(coordinates, 0), v = new THREE.Vector3().fromBufferAttribute(coordinates, 1);
    expect(a.distanceTo(b) / u.distanceTo(v)).toBeCloseTo(object.scale);
  });

  it("continues the same brick pattern onto newly exposed voxel fracture faces", () => {
    const assembly = compileDream(wall.replace("style=toon", "style=brick"))[0]!;
    const scene = parseScene({ ...createFixtureScene(), objects: [{ ...object, id: "wall", x: 480, y: 360, scale: 1, spec: assembly }], regions: [], terrain: { hills: [] } });
    const world = { scene, roadMask: buildMaskForScene(scene), driveMask: buildPaperMask(960, 720), carRadius: 11 };
    const state = stepCar({ ...createCarAtSpawn(scene), x: 445, y: 360, vx: 240, headingRad: 0 }, { throttle: 1, steer: 0 }, 1 / 120, world);
    expect(state.debris).toHaveLength(4);
    const visual = new WorldDebris(scene); visual.update(state);
    const fragments = objectFragments(assembly);
    for (const [index, group] of visual.group.children.entries()) {
      const data = samples(group as THREE.Group);
      expect(data.length).toBeGreaterThan(0);
      for (const p of data) {
        const expected = new THREE.Vector3(p[3], p[4], p[5]).sub(fragments[index]!.center)
          .multiplyScalar(group.scale.x).applyQuaternion(group.quaternion).add(group.position);
        expect(new THREE.Vector3(p[0], p[1], p[2]).distanceTo(expected)).toBeLessThan(.0001);
      }
    }
  });
});
