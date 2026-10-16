import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { objectDslSchema, type ObjectDsl } from "../src/scene/object-dsl";
import { mockCastle, mockMushroom, mockMushroomRover } from "../src/scene/mock-objects";
import { createFixtureScene } from "../src/scene/fixture";
import { parseScene } from "../src/scene/schema";
import { archetypeOf } from "../src/sim/archetypes";
import { buildObject } from "../src/game/world3d";

const box: ObjectDsl = {
  dslVersion: 1,
  displayName: "Rotated block",
  body: { interaction: "solid", colliderRadius: 12 },
  parts: [{
    id: "block", shape: "box", position: [5, 10, -3], size: [10, 4, 6],
    rotation: [0, 0, Math.PI / 2],
    material: { shaderStyle: "toon", colorA: "#336699", colorB: "#ddeeff" },
  }],
};

function objectWithSpec(spec: unknown, scale = 1) {
  return parseScene({ ...createFixtureScene(), objects: [{
    id: "composed", kind: "custom", labelText: "INVENTION", x: 480, y: 360, scale, spec,
  }] }).objects[0]!;
}

describe("compositional objects", () => {
  it("accepts JSON mock responses through the scene boundary and builds distinct assemblies", () => {
    const groups = [mockCastle, mockMushroom, mockMushroomRover].map((spec) =>
      buildObject(objectWithSpec(JSON.parse(JSON.stringify(spec)))));
    expect(groups[0]!.getObjectByName("roof-ne")).toBeInstanceOf(THREE.Mesh);
    expect(groups[1]!.getObjectByName("cap")).toBeInstanceOf(THREE.Mesh);
    expect(groups[1]!.getObjectByName("wheel-ne")).toBeUndefined();
    expect(groups[2]!.getObjectByName("wheel-ne")).toBeInstanceOf(THREE.Mesh);
  });

  it("applies local size, rotation, translation and the object's scale to actual mesh bounds", () => {
    const built = buildObject(objectWithSpec(box, 2));
    const bounds = new THREE.Box3().setFromObject(built);
    // A 10x4x6 box rotated 90deg about Z becomes 4x10x6, then scales by 2.
    expect(bounds.min.x).toBeCloseTo(6);
    expect(bounds.max.x).toBeCloseTo(14);
    expect(bounds.min.y).toBeCloseTo(10);
    expect(bounds.max.y).toBeCloseTo(30);
    expect(bounds.min.z).toBeCloseTo(-12);
    expect(bounds.max.z).toBeCloseTo(0);
  });

  it("gives each part its own material without changing the physical body", () => {
    const spec = objectDslSchema.parse({ ...box, parts: [
      { ...box.parts[0]!, rotation: [0, 0, 0] },
      { ...box.parts[0]!, id: "lamp", position: [30, 10, 0],
        material: { shaderStyle: "glow", colorA: "#ff8844", colorB: "#ffffff" } },
    ] });
    const object = objectWithSpec(spec);
    const built = buildObject(object);
    const base = built.getObjectByName("block") as THREE.Mesh;
    const lamp = built.getObjectByName("lamp") as THREE.Mesh;
    expect(base.material).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(lamp.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect((lamp.material as THREE.MeshStandardMaterial).emissive.getHexString()).toBe("ff8844");
    expect(new THREE.Box3().setFromObject(built).max.x).toBeGreaterThan(30);
    expect(archetypeOf(object)).toMatchObject({ colliderRadius: 12, interaction: "solid" });
    expect(archetypeOf(object)).toEqual(archetypeOf(objectWithSpec(box)));
  });

  it.each(["box", "sphere", "cylinder", "cone", "pyramid"] as const)("builds a %s part with the requested dimensions", (shape) => {
    const spec = { ...box, parts: [{ ...box.parts[0]!, shape, position: [0, 10, 0], size: [8, 12, 10], rotation: [0, 0, 0] }] };
    const built = buildObject(objectWithSpec(spec));
    const size = new THREE.Box3().setFromObject(built).getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(8);
    expect(size.y).toBeCloseTo(12);
    expect(size.z).toBeCloseTo(10);
  });

  it("keeps knockable friction in the declared body", () => {
    expect(archetypeOf(objectWithSpec(mockMushroom)))
      .toMatchObject({ interaction: "knockable", colliderRadius: 10, frictionPerS: 1.6 });
  });
});

describe("DSL input boundary", () => {
  it.each([
    ["an unknown version", { ...box, dslVersion: 3 }],
    ["no parts", { ...box, parts: [] }],
    ["more than 32 parts", { ...box, parts: Array.from({ length: 33 }, (_, i) => ({ ...box.parts[0]!, id: `part-${i}` })) }],
    ["duplicate part identities", { ...box, parts: [box.parts[0], box.parts[0]] }],
    ["missing physics", { ...box, body: undefined }],
    ["unbounded physics", { ...box, body: { ...box.body, colliderRadius: 99 } }],
    ["custom code", { ...box, code: "throw new Error()" }],
    ["a shader program", { ...box, parts: [{ ...box.parts[0]!, material: { ...box.parts[0]!.material, fragmentShader: "void main() {}" } }] }],
    ["an external asset", { ...box, parts: [{ ...box.parts[0]!, url: "https://example.com/model.glb" }] }],
    ["an unsupported primitive", { ...box, parts: [{ ...box.parts[0]!, shape: "spaceship" }] }],
    ["an invalid color", { ...box, parts: [{ ...box.parts[0]!, material: { ...box.parts[0]!.material, colorA: "red" } }] }],
    ["a non-finite offset", { ...box, parts: [{ ...box.parts[0]!, position: [Number.NaN, 0, 0] }] }],
    ["an excessive offset", { ...box, parts: [{ ...box.parts[0]!, position: [1000, 0, 0] }] }],
    ["a zero dimension", { ...box, parts: [{ ...box.parts[0]!, size: [0, 1, 1] }] }],
    ["an unbounded dimension", { ...box, parts: [{ ...box.parts[0]!, size: [1, 129, 1] }] }],
    ["an unbounded rotation", { ...box, parts: [{ ...box.parts[0]!, rotation: [7, 0, 0] }] }],
  ])("rejects %s before compilation", (_name, spec) => {
    expect(() => objectWithSpec(spec)).toThrow();
  });

  it("rejects a compositional spec on a built-in object", () => {
    expect(() => parseScene({ ...createFixtureScene(), objects: [{
      id: "smuggled", kind: "tree", labelText: "TREE", x: 480, y: 360, scale: 1, spec: box,
    }] })).toThrow();
  });
});
