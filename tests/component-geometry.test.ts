import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { curbGeometry, roadSections, roadMarkingGeometry } from "../src/game/environment";
import { tiledMesh } from "../src/game/batching";
import {onStreet} from "../src/scene/streets";
import { bridgeAt } from "../src/scene/landscape-dsl";
import { surfaceHeight } from "../src/game/surface";
import { animateObject, buildObject } from "../src/game/world3d";
import { WorldScenery } from "../src/game/scenery";
import {createLegacyWorld as createWorldScene} from "./fixtures/legacy-world"; // Frozen engine regression world; the live city is tested separately.
import { mockCastle, mockCottage, mockWindmill, mockRuin } from "../src/scene/mock-objects";
import { mockBarn, mockWell } from "../src/scene/mock-landscape";
import { objectDslSchema } from "../src/scene/object-dsl";
import { objectPlacement } from "../src/scene/placement";
import { terrainHeight } from "../src/scene/terrain";
import { parseScene } from "../src/scene/schema";
import { buildMaskForScene, createFixtureScene } from "../src/scene/fixture";
import { createCarAtSpawn, stepCar } from "../src/sim/car";
import { objectHeight, objectRadius } from "../src/sim/archetypes";
import { partGeometry } from "../src/scene/object-geometry";
import { buildPaperMask } from "../src/sim/mask";

const worldScene = createWorldScene();

describe("continuous road trim", () => {
  it.each([-1, 1] as const)("joins every curb face, including the loop seam on side %s", side => {
    const geometry = curbGeometry(worldScene, side), positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const ground = surfaceHeight(worldScene, positions.getX(i) + worldScene.canonical.width/2, positions.getZ(i) + worldScene.canonical.height/2), lift = positions.getY(i) - ground;
      expect(lift).toBeGreaterThanOrEqual(-.501);expect(lift).toBeLessThanOrEqual(3.101);
    }
    const mesh = tiledMesh(geometry, new THREE.MeshBasicMaterial()), ray = new THREE.Raycaster();
    mesh.updateMatrixWorld(true);
    const sections = roadSections(worldScene), half = worldScene.roadMaskRef.params.roadWidth / 2;
    for (let i = 0; i < sections.length - 1; i++) {
      const at = sections[i]!, before = sections[(i - 1 + sections.length - 1) % (sections.length - 1)]!, after = sections[i + 1]!;
      for (const neighbor of [before, after]) {
        const x = at.x * .98 + neighbor.x * .02 + at.nx * side * half;
        const y = at.y * .98 + neighbor.y * .02 + at.ny * side * half;
        ray.set(new THREE.Vector3(x - worldScene.canonical.width/2, 600, y - worldScene.canonical.height/2), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(mesh, true)[0];
        if(onStreet(worldScene,x,y) || bridgeAt(worldScene.terrain.landscape,x,y)?.style==="timber") {expect(hit).toBeUndefined();continue;}
        expect(hit, `curb gap at section ${i}`).toBeDefined();
        const lift=hit!.point.y-surfaceHeight(worldScene,x,y);
        expect(lift).toBeGreaterThanOrEqual(1.499);expect(lift).toBeLessThanOrEqual(3.101);
      }
    }
  });
  it("places exact brick and dash boundaries without leaving subpixel slivers", () => {
    const sections = roadSections(worldScene);
    for (let i = 1; i < sections.length; i++)expect(sections[i]!.distance - sections[i - 1]!.distance).toBeGreaterThan(1e-6);
    for (const d of [14, 22, 28, 48, 56, 70, 96]) expect(sections.some(s => Math.abs(s.distance - d) < 1e-6)).toBe(true);
    const normals = roadMarkingGeometry(worldScene).getAttribute("normal");
    for (let i = 0; i < normals.count; i += 3)expect(normals.getY(i)).toBeGreaterThan(0);
  });
});

describe("connected object assemblies", () => {
  it.each(["Timber workshop","Brick bakehouse"])("connects %s's detachable canopy to its supporting wall", name => {
    const object=worldScene.objects.find(o=>o.spec?.displayName===name)!;
    const spec=object.spec!;
    if(!("dslVersion" in spec) || spec.dslVersion!==2)throw new Error("expected Dream 2 building");
    const model=buildObject({...object,scale:1});
    const wall=spec.parts.find(p=>!p.zone && p.shape==="box" && p.size[0]>=40 && p.size[1]>=40)!;
    const wallBounds=new THREE.Box3().setFromObject(model.getObjectByName(wall.id)!,true);
    const roofs=spec.parts.filter(p=>p.zone && p.shape==="box" && p.size[0]>=40 && p.size[1]<=4);
    expect(roofs.length).toBeGreaterThan(0);
    for(const roof of roofs){
      const bounds=new THREE.Box3().setFromObject(model.getObjectByName(roof.id)!,true);
      expect(bounds.min.x).toBeLessThanOrEqual(wallBounds.max.x);
      expect(bounds.max.y).toBeLessThanOrEqual(wallBounds.max.y);
    }
  });
  it("keeps long plank tops flat near their ends and leaves a usable hole in thin rings", () => {
    const base = {id:"detail",position:[0,0,0] as [number,number,number],material:mockCastle.parts[0]!.material};
    const board = new THREE.Mesh(partGeometry({...base,shape:"box",size:[60,4,6]}),new THREE.MeshBasicMaterial());
    board.scale.set(60,4,6);board.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(29,20,0),new THREE.Vector3(0,-1,0));
    expect(ray.intersectObject(board)[0]!.point.y).toBeCloseTo(2,5);
    const ring = new THREE.Mesh(partGeometry({...base,shape:"torus",size:[20,20,3]}),new THREE.MeshBasicMaterial());
    ring.scale.set(20,20,3);ring.updateMatrixWorld(true);
    ray.set(new THREE.Vector3(6,0,20),new THREE.Vector3(0,0,-1));
    expect(ray.intersectObject(ring)).toHaveLength(0);
    ray.set(new THREE.Vector3(8,0,20),new THREE.Vector3(0,0,-1));
    expect(ray.intersectObject(ring).length).toBeGreaterThan(0);
  });
  it.each(["box", "sphere", "cylinder", "cone", "pyramid", "icosphere"] as const)("honors the declared XYZ dimensions for %s", shape => {
    const spec = objectDslSchema.parse({ ...mockCastle, foundation: undefined, parts: [{ id: "part", shape, position: [0, 12, 0], size: [30, 24, 18], material: mockCastle.parts[0]!.material }] });
    const built = buildObject({ id: "shape", kind: "custom", labelText: "shape", x: 0, y: 0, scale: 1, spec });
    const dimensions = new THREE.Box3().setFromObject(built).getSize(new THREE.Vector3());
    expect(dimensions.x).toBeCloseTo(30, 4); expect(dimensions.y).toBeCloseTo(24, 4); expect(dimensions.z).toBeCloseTo(18, 4);
  });
  it("keeps cottage walls entirely below the roof, with an overhang on every side", () => {
    const model = buildObject({ id: "cottage", kind: "custom", labelText: "cottage", x: 0, y: 0, scale: 1, spec: mockCottage });
    const walls = new THREE.Box3().setFromObject(model.getObjectByName("walls")!);
    const roof = new THREE.Box3().setFromObject(model.getObjectByName("roof")!);
    expect(roof.min.y).toBeCloseTo(walls.max.y);
    expect(roof.min.x).toBeLessThan(walls.min.x); expect(roof.max.x).toBeGreaterThan(walls.max.x);
    expect(roof.min.z).toBeLessThan(walls.min.z); expect(roof.max.z).toBeGreaterThan(walls.max.z);
  });
  it("supports the low parts of every building, including cottage steps and fallen masonry",()=>{
    for(const spec of [mockCastle,mockCottage,mockWindmill,mockRuin,mockBarn,mockWell]){
      const object=buildObject({id:"support",kind:"custom",labelText:"support",x:0,y:0,scale:1,spec});object.updateMatrixWorld(true);
      for(const child of object.children){
        const part=child as THREE.Mesh,vertices=part.geometry.getAttribute("position");
        for(let i=0;i<vertices.count;i++){
          const vertex=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(part.matrixWorld);
          if(vertex.y>2)continue;
          expect(Math.abs(vertex.x)).toBeLessThanOrEqual(spec.foundation!.footprint[0]/2+.001);
          expect(Math.abs(vertex.z)).toBeLessThanOrEqual(spec.foundation!.footprint[1]/2+.001);
        }
      }
    }
  });
  it("keeps both rotating sails connected through the hub and shaft to the tower", () => {
    const model = buildObject({ id:"mill", kind:"custom", labelText:"mill", x:0, y:0, scale:1, spec:mockWindmill });
    const tower = new THREE.Box3().setFromObject(model.getObjectByName("tower")!);
    const axle = new THREE.Box3().setFromObject(model.getObjectByName("axle")!);
    const hub = new THREE.Box3().setFromObject(model.getObjectByName("hub")!);
    expect(axle.intersectsBox(tower)).toBe(true); expect(axle.intersectsBox(hub)).toBe(true);
    for (const time of [0, 1.5, 3, 4.5, 6]) {
      animateObject(model, time); model.updateMatrixWorld(true);
      for (const id of ["sails-0", "sails-1"]) {
        const sail = model.getObjectByName(id)!;
        expect(hub.containsPoint(sail.position)).toBe(true);
        expect(new THREE.Box3().setFromObject(sail).intersectsBox(hub)).toBe(true);
      }
    }
  });
  it("places the windmill roof over the tower cap without a visible intersection ring", () => {
    const model = buildObject({ id: "mill", kind: "custom", labelText: "mill", x: 0, y: 0, scale: 1, spec: mockWindmill });
    const tower = new THREE.Box3().setFromObject(model.getObjectByName("tower")!);
    const roof = new THREE.Box3().setFromObject(model.getObjectByName("roof")!);
    expect(roof.min.y).toBeCloseTo(tower.max.y);
    expect(roof.max.x).toBeGreaterThan(tower.max.x); expect(roof.max.z).toBeGreaterThan(tower.max.z);
  });
});

const object = { id: "building", kind: "custom" as const, labelText: "CASTLE", x: 540, y: 430, scale: 1.5, spec: mockCastle };
const slopeScene = parseScene({ ...createFixtureScene(), objects: [object], regions: [], terrain: { hills: [{ id: "slope", x: 480, y: 360, radiusX: 300, radiusY: 300, height: 160 }] } });
const building = slopeScene.objects[0]!;

describe("terrain-supported buildings", () => {
  it("surveys the entire footprint, keeps the body above it and fills the downhill gap", () => {
    const placement = objectPlacement(slopeScene, building), ground = terrainHeight(slopeScene.terrain, building.x, building.y);
    expect(placement.base).toBeGreaterThan(ground + 10); expect(placement.low).toBeLessThan(ground - 10);
    const scenery = new WorldScenery(slopeScene), foundation = scenery.group.getObjectByName("terrain-foundations")!;
    scenery.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(foundation);
    expect(bounds.min.y).toBeLessThanOrEqual(placement.low); expect(bounds.max.y).toBeGreaterThanOrEqual(placement.base + 1.5);
    for (const dx of [-36, 0, 36]) for (const dy of [-33, 0, 33])
      expect(placement.base + 1.5).toBeGreaterThan(terrainHeight(slopeScene.terrain, building.x + dx, building.y + dy));
    const bodyBounds = new THREE.Box3();
    scenery.group.children.filter(part => part.name !== "terrain-foundations").forEach(part => bodyBounds.union(new THREE.Box3().setFromObject(part)));
    expect(bodyBounds.min.y).toBeCloseTo(placement.base + 1.5, 4);
  });
  it("uses the raised base for collision and landing contacts", () => {
    const placement = objectPlacement(slopeScene, building), top = placement.base + objectHeight(building);
    const world = { scene: slopeScene, roadMask: buildMaskForScene(slopeScene), driveMask: buildPaperMask(960, 720), carRadius: 11 };
    let landed = { ...createCarAtSpawn(slopeScene), x: building.x, y: building.y, elevation: top + 1, vz: -60, grounded: false };
    for (let i = 0; i < 10; i++)landed = stepCar(landed, { throttle: 0, steer: 0 }, 1 / 120, world);
    expect(landed.grounded).toBe(true); expect(landed.elevation).toBeCloseTo(top, 6);
    let moving = { ...createCarAtSpawn(slopeScene), x: building.x - objectRadius(building) - 15, y: building.y, vx: 200, vy: 0, headingRad: 0, elevation: top - 5, vz: 0, grounded: false };
    for (let i = 0; i < 60; i++)moving = stepCar(moving, { throttle: 0, steer: 0 }, 1 / 120, world);
    expect(moving.x).toBeLessThanOrEqual(building.x - objectRadius(building) - 11 + .001);
  });
  it("rejects moving foundations, executable fields and unbounded footprints", () => {
    expect(() => objectDslSchema.parse({ ...mockCastle, body: { ...mockCastle.body, interaction: "knockable" } })).toThrow();
    expect(() => objectDslSchema.parse({ ...mockCastle, foundation: { ...mockCastle.foundation, script: "evil()" } })).toThrow();
    expect(() => objectDslSchema.parse({ ...mockCastle, foundation: { ...mockCastle.foundation, footprint: [999, 10] } })).toThrow();
    expect(() => parseScene({ ...createFixtureScene(), player: mockCastle })).toThrow();
  });
});
