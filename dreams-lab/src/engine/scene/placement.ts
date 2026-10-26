import {objectFloor} from './floors';
import {walkingHeight,sceneInteriors} from './interiors';
import {roleOf} from './agents';
import {archetypeOf} from '../sim/archetypes';
import {polygonBounds} from './polygons';
import type { Scene, SceneObject } from "./schema";
import { Quaternion, Vector3 } from "three";
import { drivingHeight, sampleTerrain, terrainSurfaceHeight } from "./terrain";
import { objectSupport } from "./object-support";

export interface ObjectPlacement {
  base: number;
  low: number;
  rotation: Quaternion;
  foundation?: { width: number; depth: number; color: string };
}

// Cache one position per object; moving props invalidate it without accumulating entries.
const placements = new WeakMap<Scene, Map<SceneObject, {x:number;y:number;placement:ObjectPlacement;supportRadius?:number}>>();
/** Worker bootstrap only: immutable foundations fit the same object against the same terrain. */
export function shareFoundationPlacements(scene:Scene,source:Scene):void{
  if(scene===source || scene.terrain!==source.terrain)return;
  const from=placements.get(source);if(!from)return;
  let target=placements.get(scene);
  for(const object of scene.objects){
    const spec=object.spec,entry=from.get(object);
    if(object.floor || !spec || !('dslVersion' in spec) || !spec.foundation || !entry || entry.x!==object.x || entry.y!==object.y || target?.has(object))continue;
    target??=new Map();target.set(object,entry);
  }
  if(target)placements.set(scene,target);
}
/** Unchanged static fits remain valid outside any changed interior walking surface. */
export function shareStaticPlacements(scene:Scene,source:Scene):void{
  shareFoundationPlacements(scene,source);
  if(scene===source || scene.terrain!==source.terrain)return;
  const from=placements.get(source);if(!from)return;
  const frames=(doc:Scene)=>sceneInteriors(doc).map(f=>({key:JSON.stringify([f.object.x,f.object.y,f.object.scale,f.object.headingRad??0,f.floor,f.room.position,f.room.size]),bounds:polygonBounds(f.polygon)})),before=frames(source),after=frames(scene);
  const changed=[...before.filter(f=>!after.some(g=>g.key===f.key)),...after.filter(f=>!before.some(g=>g.key===f.key))].map(f=>f.bounds);
  let target=placements.get(scene);
  for(const object of scene.objects){
    const entry=from.get(object),spec=object.spec;
    if(object.floor || roleOf(object)!=='prop' || archetypeOf(object).interaction!=='solid' || spec && 'dslVersion' in spec && spec.foundation || !entry || entry.x!==object.x || entry.y!==object.y || target?.has(object))continue;
    if(changed.length){
      // A 3D support sphere also encloses every rotated underside sample.
      entry.supportRadius??=Math.sqrt(objectSupport(source,object).reduce((r,p)=>Math.max(r,p.lengthSq()),0))*object.scale+.01;
      if(changed.some(b=>Math.hypot(Math.max(b.x0-object.x,0,object.x-b.x1),Math.max(b.y0-object.y,0,object.y-b.y1))<=entry.supportRadius!))continue;
    }
    target??=new Map();target.set(object,entry);
  }
  if(target)placements.set(scene,target);
}
export function objectPlacement(scene: Scene, object: SceneObject, x=object.x, y=object.y): ObjectPlacement {
  let cache = placements.get(scene);
  if (!cache) { cache = new Map(); placements.set(scene, cache); }
  const cached = cache.get(object); if (cached?.x===x && cached.y===y) return cached.placement;
  const grounded=object.spec && "dslVersion" in object.spec && !!object.spec.foundation;
  const bound=objectFloor(scene,object);
  const height=(x:number,y:number)=>bound ? bound.elevation : Math.max(grounded ? drivingHeight(scene.terrain,x,y) : walkingHeight(scene,x,y,0),terrainSurfaceHeight(scene.terrain,x,y));
  const rotation = new Quaternion();
  if (object.spec && "dslVersion" in object.spec && object.spec.grounding === "surface") {
    const slope=sampleTerrain(scene.terrain,x,y);
    rotation.setFromUnitVectors(new Vector3(0,1,0),new Vector3(-slope.dx,1,-slope.dy).normalize());
  }
  if(object.headingRad) rotation.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),-object.headingRad));
  const placement: ObjectPlacement = { base: height(x,y), low: height(x,y), rotation };
  // Fit the actual underside, including rotated/deformed parts and joint rest poses.
  const point=new Vector3();
  for (const local of objectSupport(scene,object)) {
    point.copy(local).multiplyScalar(object.scale).applyQuaternion(rotation);
    const ground=height(x+point.x,y+point.z);
    placement.base=Math.max(placement.base,ground-point.y);
  }
  const foundation = object.spec && "dslVersion" in object.spec ? object.spec.foundation : undefined;
  if (foundation) {
    const width = foundation.footprint[0] * object.scale, depth = foundation.footprint[1] * object.scale;
    const nx = Math.ceil(width / 8), ny = Math.ceil(depth / 8);
    for (let ix = 0; ix <= nx; ix++)for (let iy = 0; iy <= ny; iy++) {
      const h = height(x + (ix / nx - .5) * width, y + (iy / ny - .5) * depth);
      placement.base = Math.max(placement.base, h); placement.low = Math.min(placement.low, h);
    }
    placement.foundation = { width, depth, color: foundation.color };
  }
  cache.set(object, {x,y,placement}); return placement;
}
