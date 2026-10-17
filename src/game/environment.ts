import {sceneInteriors} from '../scene/interiors';
import * as THREE from "three";
import {contains,overlaps,type RenderRegion} from "./render-region";
import {voxelTerrainTile} from './voxel-columns';
import {voxelStamp} from '../scene/voxel-stamp';
import {reservedGround,streetPolygons,streetCircuitCrossings,onPolygon} from '../scene/streets';
import {roadSections,roadGeometry,timberFootprints} from './road-surfaces';
export {roadSections,roadGeometry} from './road-surfaces';
import {buildStreetSteps} from './streets';
import {tramTrackPolygons} from './tram-tracks';
import { bridgeAt, bridgeCoordinates } from "../scene/landscape-dsl";
import type { Point, Scene } from "../scene/schema";
import { sampleTerrain, terrainHeight, drivingHeight, waterAt } from "../scene/terrain";
import { routeInfrastructure } from "../scene/routes";
import { distanceToRoad, roadPoints, roadFrames, roadRibbon, ROAD_CURB_WIDTH, ROAD_SURFACE_LIFT, type RoadFrame } from "../scene/road";
import { finishBuild, tiledMeshSteps, tiledInstances } from "./batching";
import { groundMaterial, roadMaterial, toonMaterial, zoneMaterial } from "./shaders";
import { toWorldX, toWorldZ } from "./world3d";
import { surfaceGeometry, surfaceHeight, surfaceEdge, voxelSurfaceBase,TERRAIN_STEP } from "./surface";

export function worldPosition(doc: Scene, x: number, y: number, lift = 0): THREE.Vector3 {
  return new THREE.Vector3(toWorldX(x, doc.canonical.width), drivingHeight(doc.terrain, x, y) + lift, toWorldZ(y, doc.canonical.height));
}

/** Sample the same field for the ground, roads, wheels, and prop placement. */
export function terrainNormal(doc: Scene, x: number, y: number): THREE.Vector3 {
  const slope = sampleTerrain(doc.terrain, x, y);
  return new THREE.Vector3(-slope.dx, 1, -slope.dy).normalize();
}

type RoadSection = RoadFrame;

function roadPoint(section: RoadSection, offset: number): Point {
  return { x: section.x + section.nx * offset, y: section.y + section.ny * offset };
}

/** Continuous bands, with top and walls split at the underlying terrain edges. */
export function curbGeometry(doc: Scene, side: -1 | 1,region?:RenderRegion): THREE.BufferGeometry {
  const sections = roadSections(doc), half = doc.roadMaskRef.params.roadWidth / 2;
  const inner = side * (half - ROAD_CURB_WIDTH / 2), outer = side * (half + ROAD_CURB_WIDTH / 2);
  const vertices: number[] = [], colors: number[] = [];
  const cutouts = [...timberFootprints(doc),...streetPolygons(doc.streets,'reserved')];
  const timber = (doc.terrain.landscape?.bridges ?? []).filter(bridge => bridge.style === "timber");
  const curbLift = (x: number, y: number, lift: number) => {
    let distance = Infinity;
    for (const bridge of timber) {
      const p = bridgeCoordinates(bridge, x, y);
      distance = Math.min(distance, Math.hypot(Math.max(-p.t, p.t - 1, 0) * p.length, Math.max(Math.abs(p.across) - bridge.width / 2, 0)));
    }
    // Collapse the complete curb section into the deck, leaving no open end cap or raised lip.
    return ROAD_SURFACE_LIFT + (lift - ROAD_SURFACE_LIFT) * THREE.MathUtils.smoothstep(distance, 0, 24);
  };
  const cream = new THREE.Color("#f7ddbe"), red = new THREE.Color("#ce776d");
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i - 1]!, b = sections[i]!;
    const color = doc.roadMaskRef.params.style=== "street" ? new THREE.Color("#aaa79a") : Math.floor((a.distance + b.distance) / 28) % 2 ? cream : red;
    const polygon=roadRibbon(a,b,inner,outer);
    if(region && !overlaps(region,polygon))continue;
    const top = surfaceGeometry(doc, [polygon], 3.1, undefined, undefined, cutouts,region);
    const positions = top.getAttribute("position");
    for (let j = 0; j < positions.count; j++) {
      const x = positions.getX(j) + doc.canonical.width / 2, y = positions.getZ(j) + doc.canonical.height / 2;
      positions.setY(j, positions.getY(j) - 3.1 + curbLift(x, y, 3.1));
    }
    vertices.push(...top.getAttribute("position").array); top.dispose();
    for (const [start, end] of side === 1 ? [[roadPoint(a, inner), roadPoint(b, inner)], [roadPoint(b, outer), roadPoint(a, outer)]] : [[roadPoint(b, inner), roadPoint(a, inner)], [roadPoint(a, outer), roadPoint(b, outer)]]) {
      const edge = surfaceEdge(start!, end!, cutouts);
      for (let j = 1; j < edge.length; j++) {
        const a = edge[j - 1]!, b = edge[j]!;
        if(region && !contains(region,(a.x+b.x)/2,(a.y+b.y)/2))continue;
        if (cutouts.some(p=>onPolygon(p,(a.x+b.x)/2,(a.y+b.y)/2))) continue;
        const point = (p: Point, lift: number) => new THREE.Vector3(p.x - doc.canonical.width / 2, surfaceHeight(doc, p.x, p.y) + curbLift(p.x, p.y, lift), p.y - doc.canonical.height / 2);
        const p = point(edge[j - 1]!, -.5), q = point(edge[j]!, -.5), r = point(edge[j]!, 3.1), t = point(edge[j - 1]!, 3.1);
        for (const v of [p, r, q, p, t, r]) vertices.push(...v.toArray());
      }
    }
    while (colors.length < vertices.length) colors.push(...color.toArray());
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  if(doc.voxelWorld)geo.userData.voxelOptions={contour:true,cell:doc.voxelWorld.groundCell,originX:-doc.canonical.width/2,originZ:-doc.canonical.height/2,step:doc.voxelWorld.heightStep,lift:3.1,thickness:3.6,baseAt:(x:number,z:number)=>voxelSurfaceBase(doc,x,z),liftAt:(x:number,z:number)=>curbLift(x+doc.canonical.width/2,z+doc.canonical.height/2,3.1)};
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals(); return geo;
}

export function roadMarkingGeometry(doc: Scene,region?:RenderRegion): THREE.BufferGeometry {
  const sections = roadSections(doc), polygons: Point[][] = [];
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i - 1]!, b = sections[i]!;
    if ((a.distance + b.distance) / 2 % 48 < 22) polygons.push(roadRibbon(a, b, -1.25, 1.25));
  }
  return surfaceGeometry(doc, polygons, 1.8, undefined, undefined, [...timberFootprints(doc),...streetPolygons(doc.streets,'riding'),...streetCircuitCrossings(doc).flatMap(c=>c.polygons),...tramTrackPolygons(doc).grooves],region);
}

export function drapedPolygon(doc: Scene, polygon: Point[], lift: number,region?:RenderRegion): THREE.BufferGeometry {
  const center = polygon.reduce((p, q) => ({ x: p.x + q.x / polygon.length, y: p.y + q.y / polygon.length }), { x: 0, y: 0 });
  const frames = roadFrames(doc);
  const nearest = (p: Point) => frames.reduce((a, b) => Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? a : b);
  const frame = nearest(center), start = doc.checkpoints[0]!, startFrame = nearest({ x: (start.a.x + start.b.x) / 2, y: (start.a.y + start.b.y) / 2 });
  // A mask's outline winding need not match the race's checkpoint direction.
  const sign = Math.sign(startFrame.ny * start.dir.x - startFrame.nx * start.dir.y) || 1;
  let geometry = surfaceGeometry(doc, [polygon], lift, { x: frame.ny * sign, y: -frame.nx * sign },undefined,[],region);
  // Interior and edge samples keep small patches visible when all original corners lie on their outline.
  const weights = [[1,0,0],[0,1,0],[0,0,1],[.5,.5,0],[0,.5,.5],[.5,0,.5],[1/3,1/3,1/3]];
  const faces = [0,3,6,3,1,6,1,4,6,4,2,6,2,5,6,5,0,6], indices: number[] = [];
  const refined = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const attribute = geometry.getAttribute(name), values: number[] = [];
    for (let i = 0; i < attribute.count; i += 3) {
      for (const weight of weights) for (let axis = 0; axis < attribute.itemSize; axis++)
        values.push(weight.reduce((sum, w, j) => sum + w * attribute.array[(i + j) * attribute.itemSize + axis]!, 0));
      if (name === "position") indices.push(...faces.map(index => i / 3 * weights.length + index));
    }
    refined.setAttribute(name, new THREE.Float32BufferAttribute(values, attribute.itemSize));
  }
  refined.setIndex(indices); geometry.dispose(); geometry = refined.toNonIndexed(); refined.dispose();
  const positions = geometry.getAttribute("position"), distances: number[] = [];
  // shortcut: feathering interpolates outline samples; use a distance texture for subcell sketch detail.
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + doc.canonical.width / 2, y = positions.getZ(i) + doc.canonical.height / 2;
    distances.push(Math.min(...polygon.map((a, j) => {
      const b = polygon[(j + 1) % polygon.length]!, dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
    })));
  }
  geometry.setAttribute("edgeDistance", new THREE.Float32BufferAttribute(distances, 1));
  return geometry;
}

export function buildEnvironment(doc: Scene): THREE.Group {return finishBuild(buildEnvironmentSteps(doc));}
export function* buildEnvironmentSteps(doc:Scene,region?:RenderRegion):Generator<void,THREE.Group> {
  const group = new THREE.Group(), { width, height } = doc.canonical;
  group.add(yield* buildStreetSteps(doc,region));
  yield;
  // Local terrain tiles keep invisible hills out of the main and shadow passes.
  const groundMat = groundMaterial(), low = new THREE.Color("#52744c"), high = new THREE.Color("#70865a"), rock = new THREE.Color("#77817b");
  const tints = (doc.terrain.tints ?? []).map(t => ({ ...t, color: new THREE.Color(t.color) }));
  for (let y = -800; y < height + 800; y += 400) for (let x = -800; x < width + 800; x += 400) {
    if(region && !contains(region,x,y))continue;
    if(doc.voxelWorld){
      const ground=voxelTerrainTile(x-width/2,y-height/2,doc.voxelWorld,(px,pz)=>terrainHeight(doc.terrain,px+width/2,pz+height/2),(px,pz,h)=>{
        const wx=px+width/2,wy=pz+height/2,color=low.clone().lerp(high,h/350);
        for(const tint of tints)color.lerp(tint.color,THREE.MathUtils.smoothstep(1-Math.hypot(wx-tint.x,wy-tint.y)/tint.radius,0,1)*.8);
        return color;
      });
      const tile=new THREE.Mesh(ground,groundMat);tile.name='voxel-terrain';tile.receiveShadow=true;tile.matrixAutoUpdate=false;group.add(tile);yield;continue;
    }
    const ground = new THREE.PlaneGeometry(400, 400, 400 / TERRAIN_STEP, 400 / TERRAIN_STEP); ground.rotateX(-Math.PI / 2);
    ground.translate(x + 200 - width / 2, 0, y + 200 - height / 2);
    const vertices = ground.getAttribute("position"), colors: number[] = [];
    for (let i = 0; i < vertices.count; i++) {
      const px = vertices.getX(i) + width / 2, py = vertices.getZ(i) + height / 2, h = terrainHeight(doc.terrain, px, py);
      vertices.setY(i, h); const color = low.clone().lerp(high, h / 350);
      for (const tint of tints) color.lerp(tint.color, THREE.MathUtils.smoothstep(1 - Math.hypot(px - tint.x, py - tint.y) / tint.radius, 0, 1) * .8);
      color.lerp(rock, THREE.MathUtils.smoothstep(1 - terrainNormal(doc, px, py).y, .08, .23));
      color.multiplyScalar(.96 + .04 * Math.sin(px * .03) * Math.cos(py * .025)); colors.push(...color.toArray());
    }
    ground.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); ground.computeVertexNormals(); ground.computeBoundingSphere();
    const tile = new THREE.Mesh(ground, groundMat); tile.receiveShadow = true; tile.matrixAutoUpdate = false; group.add(tile);yield;
  }
  group.add(yield* tiledMeshSteps(roadGeometry(doc,region), roadMaterial()));
  const roadWidth = doc.roadMaskRef.params.roadWidth;
  const curbMaterial = toonMaterial("#ffffff"); curbMaterial.vertexColors = true;
  const paint=roadMarkingGeometry(doc,region);
  group.add(yield* tiledMeshSteps(curbGeometry(doc, 1,region), curbMaterial));
  group.add(yield* tiledMeshSteps(curbGeometry(doc, -1,region), curbMaterial));
  group.add(yield* tiledMeshSteps(paint, toonMaterial("#e8e1c8")));
  const renderRegion=region;
  for (const region of doc.regions) {
    const geometry=drapedPolygon(doc,region.polygon,1.65,renderRegion);
    if(doc.voxelWorld)geometry.userData.voxelOptions={contour:true,cell:doc.voxelWorld.groundCell,originX:-doc.canonical.width/2,originZ:-doc.canonical.height/2,step:doc.voxelWorld.heightStep,lift:1.65,thickness:.08,baseAt:(x:number,z:number)=>voxelSurfaceBase(doc,x,z)};
    const surface = doc.voxelWorld ? yield* tiledMeshSteps(geometry,zoneMaterial(region.rule.effect)) : new THREE.Mesh(geometry,zoneMaterial(region.rule.effect));
    surface.receiveShadow = true; surface.renderOrder = 1; group.add(surface);
  }
  // The finish line derives from the checkpoint, rather than a fixture coordinate.
  if(doc.roadMaskRef.params.style!=="street"){
  const start = doc.checkpoints[0]!;
  const direction = new THREE.Vector2(start.b.x - start.a.x, start.b.y - start.a.y);
  const length = direction.length(); direction.normalize();
  const finishPolygons: Point[][][] = [[], []];
  for (let i = 0; i < Math.floor(length / 10); i++) for (let j = 0; j < 2; j++) {
    const polygon = [[i * 10, (j - 1) * 6], [(i + 1) * 10, (j - 1) * 6], [(i + 1) * 10, j * 6], [i * 10, j * 6]].map(([along, across]) => ({
      x: start.a.x + direction.x * along! - direction.y * across!, y: start.a.y + direction.y * along! + direction.x * across!,
    }));
    finishPolygons[(i + j) % 2]!.push(polygon);
  }
  for(const [i,color] of ["#263e4d", "#f8edcf"].entries())group.add(yield* tiledMeshSteps(surfaceGeometry(doc,finishPolygons[i]!,1.85,undefined,undefined,tramTrackPolygons(doc).grooves,region),toonMaterial(color)));
  }
  // Passable decoration is instanced in spatial tiles, never a new collider.
  const corridors=doc.routes.filter(route=>["rail","path","air"].includes(route.kind)).map(route=>{
    const {points,radius}=routeInfrastructure(route);return {points,radius:radius+4};
  });
  const interiors=sceneInteriors(doc);
  const path = roadPoints(doc), tufts: THREE.Matrix4[] = [], flowers: THREE.Matrix4[] = [], colors: THREE.Color[] = [];
  const transform = new THREE.Object3D(); let seed = 1234;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const decorationSamples = Math.ceil(width * height / 1200);
  for (let i = 0; i < decorationSamples; i++) {
    if(i%500===0)yield;
    const x = random() * width, y = random() * height,yaw=random()*6,size=.6+random()*.8;
    if(region && !contains(region,x,y))continue;
    if (interiors.some(f=>f.contains(x,y,-5)) || reservedGround(doc,x,y) || bridgeAt(doc.terrain.landscape,x,y) || waterAt(doc.terrain,x,y) || distanceToRoad(path, x, y) < roadWidth / 2 + 10 ||
      corridors.some(route=>distanceToRoad(route.points,x,y)<route.radius)) continue;
    transform.position.copy(worldPosition(doc, x, y, 3)); transform.rotation.set(.1,yaw,.2);
    transform.scale.setScalar(size); transform.updateMatrix(); tufts.push(transform.matrix.clone());
    if (i % 8 === 0) { flowers.push(transform.matrix.clone()); colors.push(new THREE.Color(i % 3 ? "#f8d99e" : "#e9a6b1")); }
  }
  const stamp=(g:THREE.BufferGeometry,size:number[])=>{if(!doc.voxelWorld)return g;const v=voxelStamp(g,size,doc.voxelWorld.objectCell);g.dispose();return v;};
  group.add(tiledInstances(stamp(new THREE.ConeGeometry(1.8,7,3),[3.6,7,3.6]),toonMaterial("#557d4a"),tufts),
    tiledInstances(stamp(new THREE.IcosahedronGeometry(2,0),[4,4,4]),toonMaterial("#ffffff"),flowers,colors));
  return group;
}
