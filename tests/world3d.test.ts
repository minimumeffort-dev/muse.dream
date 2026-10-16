import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createFixtureScene } from "../src/scene/fixture";
import { parseScene } from "../src/scene/schema";
import { buildObject, toWorldX, toWorldZ } from "../src/game/world3d";

function meshCount(group: THREE.Group): number {
  let n = 0;
  group.traverse((o) => { if (o instanceof THREE.Mesh) n++; });
  return n;
}

describe("3D object builds", () => {
  it("maps sheet pixels to ground-plane world units", () => {
    expect(toWorldX(480)).toBe(0);
    expect(toWorldZ(360)).toBe(0);
    expect(toWorldX(0)).toBe(-480);
    expect(toWorldZ(720)).toBe(360);
    expect(toWorldX(1045, 2000)).toBe(45);
    expect(toWorldZ(1360, 1600)).toBe(560);
  });

  it("builds real meshes for every fixture object, built-in and invented", () => {
    const scene = createFixtureScene();
    for (const object of scene.objects) {
      const group = buildObject(object);
      expect(group, object.id).toBeInstanceOf(THREE.Group);
      expect(meshCount(group), object.id).toBeGreaterThan(0);
    }
  });

  it("compiles every allowlisted custom shape", () => {
    const scene = createFixtureScene();
    for (const shape of ["box-stack", "cone", "sphere-cluster", "cylinder", "pyramid"] as const) {
      const withShape = parseScene({
        ...scene,
        objects: [{
          id: "obj-x", kind: "custom", labelText: "X", x: 480, y: 360, scale: 1,
          spec: { displayName: "X", shape, interaction: "decor", colliderRadius: 12, heightFactor: 1, colorA: "#336699", colorB: "#ddeeff", shaderStyle: "toon" },
        }],
      });
      expect(meshCount(buildObject(withShape.objects[0] as never)), shape).toBeGreaterThan(0);
    }
  });
});

describe("invent-as-data guardrails", () => {
  const base = createFixtureScene();
  const custom = (spec: unknown) => ({
    ...base,
    objects: [{ id: "obj-x", kind: "custom", labelText: "X", x: 480, y: 360, scale: 1, spec }],
  });
  const goodSpec = {
    displayName: "X", shape: "cone", interaction: "solid", colliderRadius: 12,
    heightFactor: 1, colorA: "#336699", colorB: "#ddeeff", shaderStyle: "toon",
  };

  it("accepts a bounded spec and rejects unbounded or off-allowlist inventions", () => {
    expect(() => parseScene(custom(goodSpec))).not.toThrow();
    expect(() => parseScene(custom({ ...goodSpec, colliderRadius: 99 }))).toThrow();
    expect(() => parseScene(custom({ ...goodSpec, shape: "spaceship" }))).toThrow();
    expect(() => parseScene(custom({ ...goodSpec, shaderStyle: "plasma" }))).toThrow();
    expect(() => parseScene(custom({ ...goodSpec, colorA: "red; evil" }))).toThrow();
    expect(() => parseScene(custom(undefined))).toThrow();
  });

  it("rejects a spec smuggled onto a built-in kind", () => {
    const smuggled = {
      ...base,
      objects: [{ id: "obj-x", kind: "cone", labelText: "CONE", x: 480, y: 360, scale: 1, spec: goodSpec }],
    };
    expect(() => parseScene(smuggled)).toThrow();
  });
});
