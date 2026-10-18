import type {Point,Scene} from '../scene/schema';
import type {RenderRegion} from './render-region';
import type {BufferGeometry} from 'three';
import {bridgeCoordinates,bridgePolygon,type Bridge} from '../scene/landscape-dsl';
import {streetPolygons} from '../scene/streets';
import {roadFrames,roadRibbon,roadFootprint,ROAD_SURFACE_LIFT,type RoadFrame} from '../scene/road';
import {surfaceGeometry,bridgeHeightAt} from './surface';
type RoadSection=RoadFrame;

/** Keep road, curb joints and painted dash boundaries on the same cross-sections. */
export function roadSections(doc: Scene): RoadSection[] {
  if(doc.roadMaskRef.kind==='street-network')return [];
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


export function timberFootprints(doc: Scene): Point[][] {
  return (doc.terrain.landscape?.bridges ?? []).filter(bridge => bridge.style === "timber").map(bridgePolygon);
}

/** Road, paint and effects all conform to the same triangles as the terrain. */
export function roadGeometry(doc: Scene,region?:RenderRegion): BufferGeometry {
  const sections = roadSections(doc), half = doc.roadMaskRef.params.roadWidth / 2;
  return surfaceGeometry(doc, sections.slice(1).map((b, i) => roadRibbon(sections[i]!, b, -half, half)), ROAD_SURFACE_LIFT, undefined, undefined, [...timberFootprints(doc),...streetPolygons(doc.streets)],region);
}

/** Shared deck triangles for the visible bridge and attached surface details. */
export function bridgeDeckGeometry(doc:Scene,bridge:Bridge,region?:RenderRegion){
  const {ux,uy}=bridgeCoordinates(bridge,bridge.a.x,bridge.a.y),footprint=bridgePolygon(bridge);
  const minX=Math.min(...footprint.map(p=>p.x)),maxX=Math.max(...footprint.map(p=>p.x)),minY=Math.min(...footprint.map(p=>p.y)),maxY=Math.max(...footprint.map(p=>p.y));
  const roadway=[...roadFootprint(doc),...streetPolygons(doc.streets,'riding')].filter(polygon=>Math.max(...polygon.map(p=>p.x))>=minX && Math.min(...polygon.map(p=>p.x))<=maxX && Math.max(...polygon.map(p=>p.y))>=minY && Math.min(...polygon.map(p=>p.y))<=maxY);
  return surfaceGeometry(doc,[footprint],ROAD_SURFACE_LIFT,{x:ux,y:uy},bridgeHeightAt(doc,bridge),bridge.style==='timber' ? [] : roadway,region);
}
