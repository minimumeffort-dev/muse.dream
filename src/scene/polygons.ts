import type {Point} from './schema';
import {clipPolygon} from './landscape-dsl';

const signedArea=(p:Point[])=>{const origin=p[0];if(!origin)return 0;return p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length]!;return sum+(a.x-origin.x)*(b.y-origin.y)-(b.x-origin.x)*(a.y-origin.y);},0)/2;};
export const polygonArea=(p:Point[])=>Math.abs(signedArea(p));
export const polygonBounds=(p:Point[])=>({x0:Math.min(...p.map(v=>v.x)),x1:Math.max(...p.map(v=>v.x)),y0:Math.min(...p.map(v=>v.y)),y1:Math.max(...p.map(v=>v.y))});

/** Ear clipping for validated simple outlines; a concave river may cross one street repeatedly. */
export function triangulatePolygon(polygon:Point[]):Point[][]{
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const winding=Math.sign(signedArea(polygon));
  const remaining=[...polygon],triangles:Point[][]=[];
  while(remaining.length>3){
    let found=false;
    for(let i=0;i<remaining.length;i++){
      const a=remaining[(i+remaining.length-1)%remaining.length]!,b=remaining[i]!,c=remaining[(i+1)%remaining.length]!;
      if(Math.abs(cross(a,b,c))<1e-8){remaining.splice(i,1);found=true;break;}
      if(winding*cross(a,b,c)<=0)continue;
      if(remaining.some(p=>p!==a && p!==b && p!==c && winding*cross(a,b,p)>=-1e-8 && winding*cross(b,c,p)>=-1e-8 && winding*cross(c,a,p)>=-1e-8))continue;
      triangles.push([a,b,c]);remaining.splice(i,1);found=true;break;
    }
    if(!found)throw Error('Cannot triangulate a non-simple polygon');
  }
  if(remaining.length===3 && polygonArea(remaining)>1e-7)triangles.push(remaining);
  return triangles;
}

/** Partition against a convex outline, preserving the shared boundary in either winding. */
export function partition(polygon:Point[],outline:Point[]):{inside:Point[];outside:Point[][]}{
  const area=signedArea(outline);if(Math.abs(area)<1e-7)return {inside:[],outside:[polygon]};
  const winding=Math.sign(area);
  let inside=polygon;const outside:Point[][]=[];
  for(let i=0;i<outline.length && inside.length>=3;i++){
    const a=outline[i]!,b=outline[(i+1)%outline.length]!;
    // Clipping can repeat a corner. A zero-length plane would wrongly emit the entire polygon.
    if(Math.hypot(b.x-a.x,b.y-a.y)<1e-8)continue;
    const distance=(p:Point)=>winding*((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x));
    const piece=clipPolygon(inside,p=>-distance(p));if(piece.length>=3 && polygonArea(piece)>1e-7)outside.push(piece);
    inside=clipPolygon(inside,distance);
  }
  return {inside,outside};
}

const subtract=(pieces:Point[][],outline:Point[],b:ReturnType<typeof polygonBounds>)=>pieces.flatMap(p=>{
  const a=polygonBounds(p);
  return a.x1<=b.x0 || a.x0>=b.x1 || a.y1<=b.y0 || a.y0>=b.y1 ? [p] : partition(p,outline).outside;
});
const boundsOverlap=(a:ReturnType<typeof polygonBounds>,b:ReturnType<typeof polygonBounds>)=>a.x1>b.x0 && a.x0<b.x1 && a.y1>b.y0 && a.y0<b.y1;
/** Independent paint ribbons need clipping, without an unnecessary global polygon union. */
export function subtractPolygons(polygons:Point[][],holes:Point[][]):Point[][]{
  const cuts=holes.map(p=>({p,b:polygonBounds(p)}));
  return polygons.flatMap(polygon=>{
    const a=polygonBounds(polygon);
    let pieces=[polygon];for(const {p,b} of cuts){if(!pieces.length)break;if(boundsOverlap(a,b))pieces=subtract(pieces,p,b);}return pieces;
  });
}
/** Intersect convex pieces without confusing an overlapping bounding box with occupied ground. */
export function intersectPolygons(polygons:Point[][],outlines:Point[][]):Point[][]{
  const cuts=outlines.map(p=>({p,b:polygonBounds(p)}));
  return polygons.flatMap(p=>{const a=polygonBounds(p);return cuts.flatMap(({p:outline,b})=>{
    if(a.x1<=b.x0 || a.x0>=b.x1 || a.y1<=b.y0 || a.y0>=b.y1)return [];
    const inside=partition(p,outline).inside;return polygonArea(inside)>1e-7 ? [inside] : [];
  });});
}
/** Non-overlapping convex pieces, so junctions never stack terrain meshes. */
export function unionPolygons(polygons:Point[][],holes:Point[][]=[]):Point[][]{
  const result:Point[][]=[],bounds:ReturnType<typeof polygonBounds>[]=[];
  const cuts=holes.map(p=>({p,b:polygonBounds(p)}));
  for(const polygon of polygons){
    // Every remaining piece is contained by its original outline's bounds.
    const a=polygonBounds(polygon);
    let pieces=[polygon];for(const {p,b} of cuts)if(boundsOverlap(a,b))pieces=subtract(pieces,p,b);
    for(let i=0;i<result.length && pieces.length;i++)if(boundsOverlap(a,bounds[i]!))pieces=subtract(pieces,result[i]!,bounds[i]!);
    for(const p of pieces)if(polygonArea(p)>1e-7){result.push(p);bounds.push(polygonBounds(p));}
  }
  return result;
}

export function distanceToPolygon(x:number,y:number,polygon:Point[]):number{
  let distance=Infinity;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy || 1)));
    distance=Math.min(distance,Math.hypot(x-a.x-dx*t,y-a.y-dy*t));
  }
  return distance;
}
