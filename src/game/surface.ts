import * as THREE from "three";
import { bridgeCoordinates, bridgePolygon, clipPolygon as clip, type Bridge } from "../scene/landscape-dsl";
import type { Point, Scene } from "../scene/schema";
import { sampleTerrain, terrainHeight, bridgeHeight, terrainSurfaceHeight, TERRAIN_STEP } from "../scene/terrain";

export { TERRAIN_STEP } from "../scene/terrain";

/** Match PlaneGeometry's SW–NE diagonal, including between its vertices. */
type HeightAt = (x:number,y:number)=>number;
export function bridgeHeightAt(doc:Scene,bridge:Bridge):HeightAt {
  return (x,y)=>{const p=bridgeCoordinates(bridge,x,y);return bridgeHeight(doc.terrain,bridge,p.t,p.across);};
}
export function surfaceHeight(doc: Scene, x: number, y: number, heightAt?:HeightAt): number {
  return terrainSurfaceHeight(doc.terrain,x,y,heightAt);
}

/** Partition against a convex outline, preserving the exact shared boundary in either winding. */
function partition(polygon:Point[],outline:Point[]):{inside:Point[];outside:Point[][]} {
  const winding=Math.sign(outline.reduce((area,a,i)=>{const b=outline[(i+1)%outline.length]!;return area+a.x*b.y-b.x*a.y;},0));
  let inside=polygon;const outside:Point[][]=[];
  for(let i=0;i<outline.length && inside.length>=3;i++) {
    const a=outline[i]!,b=outline[(i+1)%outline.length]!;
    const distance=(p:Point)=>winding*((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x));
    const piece=clip(inside,p=>-distance(p));if(piece.length>=3)outside.push(piece);
    inside=clip(inside,distance);
  }
  return {inside,outside};
}

/** Clip authored polygons onto the actual ground triangles, rather than sampling a second mesh. */
export function surfaceGeometry(doc: Scene, polygons: Point[][], lift: number, direction?: Point, heightAt?:HeightAt, cutouts:Point[][]=[]): THREE.BufferGeometry {
  const ground:HeightAt=(x,y)=>terrainHeight(doc.terrain,x,y);
  const decks=(doc.terrain.landscape?.bridges ?? []).map(bridge=> {
    const polygon=bridgePolygon(bridge);
    return {polygon,heightAt:bridgeHeightAt(doc,bridge),minX:Math.min(...polygon.map(p=>p.x)),maxX:Math.max(...polygon.map(p=>p.x)),
      minY:Math.min(...polygon.map(p=>p.y)),maxY:Math.max(...polygon.map(p=>p.y))};
  });
  const holes=cutouts.map(polygon=>({polygon,minX:Math.min(...polygon.map(p=>p.x)),maxX:Math.max(...polygon.map(p=>p.x)),
    minY:Math.min(...polygon.map(p=>p.y)),maxY:Math.max(...polygon.map(p=>p.y))}));
  const positions: number[] = [], normals: number[] = [], uv: number[] = [], step = TERRAIN_STEP;
  for (const polygon of polygons) {
    const points = polygon.map(p => new THREE.Vector2(p.x, p.y));
    const origin = points[0]!, along = (direction ? new THREE.Vector2(direction.x, direction.y) : points[1]!.clone().sub(origin)).normalize();
    const across = new THREE.Vector2(-along.y, along.x);
    const local = points.map(p => p.clone().sub(origin));
    const us = local.map(p => p.dot(across)), vs = local.map(p => p.dot(along));
    const minU = Math.min(...us), minV = Math.min(...vs), width = Math.max(...us) - minU || 1, length = Math.max(...vs) - minV || 1;
    for (const face of THREE.ShapeUtils.triangulateShape(points, [])) {
      const triangle = face.map(i => polygon[i]!);
      const minX = Math.floor(Math.min(...triangle.map(p => p.x)) / step) * step;
      const minY = Math.floor(Math.min(...triangle.map(p => p.y)) / step) * step;
      const maxX = Math.max(...triangle.map(p => p.x)), maxY = Math.max(...triangle.map(p => p.y));
      for (let x = minX; x < maxX; x += step) for (let y = minY; y < maxY; y += step) {
        let cell = clip(triangle, p => p.x - x); cell = clip(cell, p => x + step - p.x);
        cell = clip(cell, p => p.y - y); cell = clip(cell, p => y + step - p.y);
        if (cell.length < 3) continue;
        for (const side of [-1, 1]) {
          const half = clip(cell, p => side * (p.x - x + p.y - y - step));
          let remaining=[half];
          for(const hole of holes) {
            if(x+step<hole.minX || x>hole.maxX || y+step<hole.minY || y>hole.maxY)continue;
            remaining=remaining.flatMap(polygon=>partition(polygon,hole.polygon).outside);
          }
          const patches:{polygon:Point[];sample:HeightAt}[]=[];
          if(!heightAt) for(const deck of decks) {
            if(x+step<deck.minX || x>deck.maxX || y+step<deck.minY || y>deck.maxY) continue;
            const next:Point[][]=[];
            for(const polygon of remaining) {
              const {inside,outside}=partition(polygon,deck.polygon);next.push(...outside);
              if(inside.length>=3) patches.push({polygon:inside,sample:deck.heightAt});
            }
            remaining=next;
          }
          patches.push(...remaining.map(polygon=>({polygon,sample:heightAt ?? ground})));
          for(const {polygon:patch,sample} of patches) for (let i = 1; i < patch.length - 1; i++) {
            const a = patch[0]!, b = patch[i]!, c = patch[i + 1]!;
            const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
            if (Math.abs(area) < 1e-7) continue;
            for (const p of area > 0 ? [a, c, b] : [a, b, c]) {
              positions.push(p.x - doc.canonical.width / 2, surfaceHeight(doc, p.x, p.y,sample) + lift, p.y - doc.canonical.height / 2);
              const slope = sampleTerrain(doc.terrain, p.x, p.y), normal = new THREE.Vector3(-slope.dx, 1, -slope.dy).normalize();
              normals.push(...normal.toArray());
              const dx = p.x - origin.x, dy = p.y - origin.y;
              uv.push((dx * across.x + dy * across.y - minU) / width, (dx * along.x + dy * along.y - minV) / length);
            }
          }
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return geometry;
}

/** Subdivide curb walls wherever their base crosses a ground triangle edge. */
export function surfaceEdge(a: Point, b: Point, outlines: Point[][] = []): Point[] {
  const cuts = [0, 1];
  for (const outline of outlines) for (let i = 0; i < outline.length; i++) {
    const p = outline[i]!, q = outline[(i + 1) % outline.length]!;
    const dx = b.x - a.x, dy = b.y - a.y, ex = q.x - p.x, ey = q.y - p.y;
    const cross = dx * ey - dy * ex;
    if (Math.abs(cross) < 1e-9) continue;
    const t = ((p.x - a.x) * ey - (p.y - a.y) * ex) / cross;
    const u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / cross;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
  }
  for (const [start, end] of [[a.x, b.x], [a.y, b.y], [a.x + a.y, b.x + b.y]] as const) {
    if (start === end) continue;
    for (let line = (Math.floor(Math.min(start, end) / TERRAIN_STEP) + 1) * TERRAIN_STEP; line < Math.max(start, end); line += TERRAIN_STEP)
      cuts.push((line - start) / (end - start));
  }
  return [...new Set(cuts)].sort((x, y) => x - y).map(t => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }));
}
