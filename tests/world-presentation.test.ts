import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createFixtureScene } from "../src/scene/fixture";
import { createWorldScene } from "../src/scene/world-fixture";
import { mockCar, mockOak, mockRock } from "../src/scene/mock-objects";
import { objectDslSchema } from "../src/scene/object-dsl";
import { parseScene, type SceneObject } from "../src/scene/schema";
import { terrainHeight } from "../src/scene/terrain";
import { objectHeight } from "../src/sim/archetypes";
import { animateObject, buildObject, buildPlayer } from "../src/game/world3d";
import { cameraPosition } from "../src/game/camera";
import { SceneryOcclusion } from "../src/game/occlusion";

const oak: SceneObject = { id: "oak", kind: "custom", labelText: "OAK", x: 400, y: 400, scale: 1.3, spec: mockOak };

describe("composed assets", () => {
  it("builds the player from validated scene data, with independent collision dimensions", () => {
    const scene = parseScene({ ...createFixtureScene(), player: JSON.parse(JSON.stringify(mockCar)) });
    const player = buildPlayer(scene);
    expect(player.getObjectByName("hood")).toBeInstanceOf(THREE.Mesh);
    expect(player.children.filter((part) => part.name.startsWith("wheel-"))).toHaveLength(4);
    const bounds = new THREE.Box3().setFromObject(player).getSize(new THREE.Vector3());
    expect(bounds.x).toBeGreaterThan(33);
    expect(scene.player!.body).toMatchObject({ colliderRadius: 11, colliderHeight: 14 });
    expect(() => parseScene({ ...scene, player: { ...mockCar, body: { ...mockCar.body, interaction: "knockable" } } })).toThrow();
  });
  it("keeps tree scaling uniform and animates rigid crowns within their declared bounds", () => {
    const tree = buildObject(oak), crown = tree.getObjectByName("crown")!;
    expect(tree.scale.toArray()).toEqual([1.3, 1.3, 1.3]);
    const position = crown.position.clone(), scale = crown.scale.clone();
    for (let time = 0; time < 12; time += .1) {
      animateObject(tree, time);
      expect(Math.abs(crown.rotation.z)).toBeLessThanOrEqual(.025);
      expect(crown.position).toEqual(position);
      expect(crown.scale).toEqual(scale);
    }
    animateObject(tree, 100, false);
    expect(crown.rotation.z).toBeCloseTo(0);
    expect(objectHeight(oak)).toBeCloseTo(56 * 1.3);
  });
  it("gives an icosphere the requested dimensions and bounds height and animation data", () => {
    const rock = buildObject({ ...oak, scale: 1, spec: mockRock });
    const part = rock.getObjectByName("large")!;
    const size = new THREE.Box3().setFromObject(part).getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(29); expect(size.y).toBeCloseTo(22); expect(size.z).toBeCloseTo(26);
    expect(() => objectDslSchema.parse({ ...mockOak, body: { ...mockOak.body, colliderHeight: 999 } })).toThrow();
    expect(() => objectDslSchema.parse({ ...mockOak, parts: [{ ...mockOak.parts[0], animation: { kind: "sway", amplitudeRad: .8, speed: 1 } }] })).toThrow();
    expect(() => objectDslSchema.parse({ ...mockOak, parts: [{ ...mockOak.parts[0], animation: { kind: "script", code: "evil()" } }] })).toThrow();
  });
  it("rolls a wheel with an arbitrary name and compresses the chassis while wheels stay planted", () => {
    const player = { ...mockCar, parts: mockCar.parts.map((part) => part.animation?.kind === "roll" ? { ...part, id: `axle-${part.id}` } : part) };
    const built = buildPlayer(parseScene({ ...createFixtureScene(), player }));
    const wheel = built.getObjectByName("axle-wheel--10--1")!;
    const chassis = built.getObjectByName("chassis")!;
    const rotation = wheel.quaternion.clone(), wheelY = wheel.position.y, chassisY = chassis.position.y;
    animateObject(built, 0, true, Math.PI * 4, 1.5);
    expect(rotation.angleTo(wheel.quaternion)).toBeCloseTo(Math.PI);
    expect(wheel.position.y).toBe(wheelY);
    expect(chassis.position.y).toBe(chassisY - 1.5);
    animateObject(built, 1, false, 200, 0);
    expect(wheel.quaternion.angleTo(rotation)).toBeCloseTo(0);
    expect(chassis.position.y).toBe(chassisY);
    const large = buildObject({ ...oak, scale: 2, spec: player });
    animateObject(large, 0, true, Math.PI * 8);
    expect(rotation.angleTo(large.getObjectByName("axle-wheel--10--1")!.quaternion)).toBeCloseTo(Math.PI);
  });
});

describe("world visibility", () => {
  it("keeps exactly the same view orientation while following hills, accelerating or landing", () => {
    const scene=createWorldScene();
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
      let initial:THREE.Vector3|undefined;
      for(const [x,z] of [[500,500],[1350,1360],[4700,1000],[3300,4000]]) {
        const target={x:x!-scene.canonical.width/2,y:terrainHeight(scene.terrain,x!,z!)+12,z:z!-scene.canonical.height/2};
        const p=cameraPosition(target,angle), direction=new THREE.Vector3(p.x-target.x,p.y-target.y,p.z-target.z).normalize();
        if(initial) expect(direction.distanceTo(initial)).toBeLessThan(1e-12);
        initial=direction;
        expect(p.y-target.y).toBeCloseTo(1000,10);
      }
    }
  });
  it("fades an actual mesh blocking the player and restores it when the view is clear", () => {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 500);
    camera.position.set(0, 50, 100); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const root = new THREE.Group();
    const material = new THREE.MeshToonMaterial({ color: "#557755" });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 30, 20), material);
    mesh.position.set(0, 12, 25); root.add(mesh); scene.add(root); scene.updateMatrixWorld();
    const occlusion = new SceneryOcclusion([root]);
    occlusion.update(camera, new THREE.Vector3(0, 0, 0), .1, true);
    expect(material.opacity).toBe(.22);
    expect(material.transparent).toBe(true);
    root.position.x = 80; scene.updateMatrixWorld();
    occlusion.update(camera, new THREE.Vector3(0, 0, 0), .1, true);
    expect(material.opacity).toBe(1);
    expect(material.transparent).toBe(false);
    expect(material.depthWrite).toBe(true);
  });
});
