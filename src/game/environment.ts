import * as THREE from "three";
import { bridgeAt, bridgeCoordinates, bridgePolygon } from "../scene/landscape-dsl";
import type { Point, Scene } from "../scene/schema";
import { sampleTerrain, terrainHeight, drivingHeight, waterAt } from "../scene/terrain";
import { routeInfrastructure } from "../scene/routes";
import { distanceToRoad, roadPoints, roadFrames, roadRibbon, ROAD_CURB_WIDTH, ROAD_SURFACE_LIFT, type RoadFrame } from "../scene/road";
import { tiledMesh, tiledInstances } from "./batching";
import { groundMaterial, roadMaterial, toonMaterial, zoneMaterial } from "./shaders";
import { toWorldX, toWorldZ } from "./world3d";
import { surfaceGeometry, surfaceHeight, surfaceEdge, TERRAIN_STEP } from "./surface";

export function worldPosition(doc: Scene, x: number, y: number, lift = 0): THREE.Vector3 {
  return new THREE.Vector3(toWorldX(x, doc.canonical.width), drivingHeight(doc.terrain, x, y) + lift, toWorldZ(y, doc.canonical.height));
}

/** Sample the same field for the ground, roads, wheels, and prop placement. */
export function terrainNormal(doc: Scene, x: number, y: number): THREE.Vector3 {
  const slope = sampleTerrain(doc.terrain, x, y);
  return new THREE.Vector3(-slope.dx, 1, -slope.dy).normalize();
}

type RoadSection = RoadFrame;

/** Keep road, curb joints and painted dash boundaries on the same cross-sections. */
export function roadSections(doc: Scene): RoadSection[] {
  const points = roadFrames(doc), n = points.length - 1, distances = points.map(p => p.distance);
  const length = distances[n]!, cuts = distances.map(distance => ({ distance, priority: 0 }));
  for (let d = 14; d < length; d += 14) cuts.push({ distance: d, priority: 1 });
  for (let d = 0; d < length; d += 48) { cuts.push({ distance: d, priority: 1 }); if (d + 22 < length) cuts.push({ distance: d + 22, priority: 1 }); }
  cuts.push({ distance: 0, priority: 2 }, { distance: length, priority: 2 });
  cuts.sort((a, b) => a.distance - b.distance);
  // Near-coincident cuts otherwise collapse or invert after Float32 world-coordinate rounding.
  const merged: typeof cuts = [];
  for (const cut of cuts) {
    const last = merged[merged.length - 1];
    if (last && cut.distance - last.distance < .05) { if (cut.priority > last.priority) merged[merged.length - 1] = cut; }
    else merged.push(cut);
  }
  let segment = 0;
  return merged.map(({ distance }) => {
    while (segment < n - 1 && distance > distances[segment + 1]!) segment++;
    const t = (distance - distances[segment]!) / (distances[segment + 1]! - distances[segment]!);
    const a = points[segment]!, b = points[segment + 1]!;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, nx: a.nx + (b.nx - a.nx) * t, ny: a.ny + (b.ny - a.ny) * t, distance };
  });
}

function roadPoint(section: RoadSection, offset: number): Point {
  return { x: section.x + section.nx * offset, y: section.y + section.ny * offset };
}

function timberFootprints(doc: Scene): Point[][] {
  return (doc.terrain.landscape?.bridges ?? []).filter(bridge => bridge.style === "timber").map(bridgePolygon);
}

/** Road, paint and effects all conform to the same triangles as the terrain. */
export function roadGeometry(doc: Scene): THREE.BufferGeometry {
  const sections = roadSections(doc), half = doc.roadMaskRef.params.roadWidth / 2;
  return surfaceGeometry(doc, sections.slice(1).map((b, i) => roadRibbon(sections[i]!, b, -half, half)), ROAD_SURFACE_LIFT, undefined, undefined, timberFootprints(doc));
}

/** Continuous bands, with top and walls split at the underlying terrain edges. */
export function curbGeometry(doc: Scene, side: -1 | 1): THREE.BufferGeometry {
  const sections = roadSections(doc), half = doc.roadMaskRef.params.roadWidth / 2;
  const inner = side * (half - ROAD_CURB_WIDTH / 2), outer = side * (half + ROAD_CURB_WIDTH / 2);
  const vertices: number[] = [], colors: number[] = [];
  const cutouts = timberFootprints(doc);
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
    const color = Math.floor((a.distance + b.distance) / 28) % 2 ? cream : red;
    const top = surfaceGeometry(doc, [roadRibbon(a, b, inner, outer)], 3.1, undefined, undefined, cutouts);
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
        if (bridgeAt(doc.terrain.landscape, (a.x + b.x) / 2, (a.y + b.y) / 2)?.style === "timber") continue;
        const point = (p: Point, lift: number) => new THREE.Vector3(p.x - doc.canonical.width / 2, surfaceHeight(doc, p.x, p.y) + curbLift(p.x, p.y, lift), p.y - doc.canonical.height / 2);
        const p = point(edge[j - 1]!, -.5), q = point(edge[j]!, -.5), r = point(edge[j]!, 3.1), t = point(edge[j - 1]!, 3.1);
        for (const v of [p, r, q, p, t, r]) vertices.push(...v.toArray());
      }
    }
    while (colors.length < vertices.length) colors.push(...color.toArray());
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals(); return geo;
}

export function roadMarkingGeometry(doc: Scene): THREE.BufferGeometry {
  const sections = roadSections(doc), polygons: Point[][] = [];
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i - 1]!, b = sections[i]!;
    if ((a.distance + b.distance) / 2 % 48 < 22) polygons.push(roadRibbon(a, b, -1.25, 1.25));
  }
  return surfaceGeometry(doc, polygons, 1.8, undefined, undefined, timberFootprints(doc));
}

export function drapedPolygon(doc: Scene, polygon: Point[], lift: number): THREE.BufferGeometry {
  const center = polygon.reduce((p, q) => ({ x: p.x + q.x / polygon.length, y: p.y + q.y / polygon.length }), { x: 0, y: 0 });
  const frames = roadFrames(doc);
  const nearest = (p: Point) => frames.reduce((a, b) => Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? a : b);
  const frame = nearest(center), start = doc.checkpoints[0]!, startFrame = nearest({ x: (start.a.x + start.b.x) / 2, y: (start.a.y + start.b.y) / 2 });
  // A mask's outline winding need not match the race's checkpoint direction.
  const sign = Math.sign(startFrame.ny * start.dir.x - startFrame.nx * start.dir.y) || 1;
  let geometry = surfaceGeometry(doc, [polygon], lift, { x: frame.ny * sign, y: -frame.nx * sign });
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

export function buildEnvironment(doc: Scene): THREE.Group {
  const group = new THREE.Group(), { width, height } = doc.canonical;
  // Local terrain tiles keep invisible hills out of the main and shadow passes.
  const groundMat = groundMaterial(), low = new THREE.Color("#52744c"), high = new THREE.Color("#70865a"), rock = new THREE.Color("#77817b");
  const tints = (doc.terrain.tints ?? []).map(t => ({ ...t, color: new THREE.Color(t.color) }));
  for (let y = -800; y < height + 800; y += 400) for (let x = -800; x < width + 800; x += 400) {
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
    const tile = new THREE.Mesh(ground, groundMat); tile.receiveShadow = true; tile.matrixAutoUpdate = false; group.add(tile);
  }
  group.add(tiledMesh(roadGeometry(doc), roadMaterial()));
  const roadWidth = doc.roadMaskRef.params.roadWidth;
  const curbMaterial = toonMaterial("#ffffff"); curbMaterial.vertexColors = true;
  group.add(tiledMesh(curbGeometry(doc, 1), curbMaterial), tiledMesh(curbGeometry(doc, -1), curbMaterial),
    tiledMesh(roadMarkingGeometry(doc), toonMaterial("#e8e1c8")));
  for (const region of doc.regions) {
    const surface = new THREE.Mesh(drapedPolygon(doc, region.polygon, 1.65), zoneMaterial(region.rule.effect));
    surface.receiveShadow = true; surface.renderOrder = 1; group.add(surface);
  }
  // The finish line derives from the checkpoint, rather than a fixture coordinate.
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
  ["#263e4d", "#f8edcf"].forEach((color, i) => group.add(tiledMesh(surfaceGeometry(doc, finishPolygons[i]!, 1.85), toonMaterial(color))));
  // Passable decoration is instanced in spatial tiles, never a new collider.
  const corridors=doc.routes.filter(route=>route.kind!=="water").map(route=>{
    const {points,radius}=routeInfrastructure(route);return {points,radius:radius+4};
  });
  const path = roadPoints(doc), tufts: THREE.Matrix4[] = [], flowers: THREE.Matrix4[] = [], colors: THREE.Color[] = [];
  const transform = new THREE.Object3D(); let seed = 1234;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const decorationSamples = Math.min(24000, Math.ceil(width * height / 1200));
  for (let i = 0; i < decorationSamples; i++) {
    const x = random() * width, y = random() * height;
    if (bridgeAt(doc.terrain.landscape,x,y) || waterAt(doc.terrain,x,y) || distanceToRoad(path, x, y) < roadWidth / 2 + 10 ||
      corridors.some(route=>distanceToRoad(route.points,x,y)<route.radius)) continue;
    transform.position.copy(worldPosition(doc, x, y, 3)); transform.rotation.set(.1, random() * 6, .2);
    transform.scale.setScalar(.6 + random() * .8); transform.updateMatrix(); tufts.push(transform.matrix.clone());
    if (i % 8 === 0) { flowers.push(transform.matrix.clone()); colors.push(new THREE.Color(i % 3 ? "#f8d99e" : "#e9a6b1")); }
  }
  group.add(tiledInstances(new THREE.ConeGeometry(1.8, 7, 3), toonMaterial("#557d4a"), tufts),
    tiledInstances(new THREE.IcosahedronGeometry(2, 0), toonMaterial("#ffffff"), flowers, colors));
  return group;
}
