import {walkingHeight} from './interiors';
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
const placements = new WeakMap<Scene, Map<SceneObject, {x:number;y:number;placement:ObjectPlacement}>>();
export function objectPlacement(scene: Scene, object: SceneObject, x=object.x, y=object.y): ObjectPlacement {
  let cache = placements.get(scene);
  if (!cache) { cache = new Map(); placements.set(scene, cache); }
  const cached = cache.get(object); if (cached?.x===x && cached.y===y) return cached.placement;
  const grounded=object.spec && "dslVersion" in object.spec && !!object.spec.foundation;
  const height=(x:number,y:number)=>Math.max(grounded ? drivingHeight(scene.terrain,x,y) : walkingHeight(scene,x,y,0),terrainSurfaceHeight(scene.terrain,x,y));
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
