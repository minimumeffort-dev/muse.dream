import {MAX_WORLD_SIZE} from './world-bounds';
import {z} from 'zod';
import type {Scene,Point} from './schema';
import {pointInPolygon} from '../sim/mask';
import {bridgeCoordinates,bridgePolygon,clipPolygon,polygonsOverlap} from './landscape-dsl';

const point=z.object({x:z.number().finite().min(0).max(MAX_WORLD_SIZE),y:z.number().finite().min(0).max(MAX_WORLD_SIZE)}).strict();
const id=z.string().min(1).max(40),color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const streetSchema=z.object({id,width:z.number().min(60).max(180),sidewalk:z.number().min(0).max(40),cycleWidth:z.number().min(16).max(40).optional(),points:z.array(point).min(2).max(16)}).strict().superRefine((s,ctx)=>{
  for(let i=1;i<s.points.length;i++){
    const a=s.points[i-1]!,b=s.points[i]!;
    if((a.x!==b.x && a.y!==b.y) || Math.hypot(a.x-b.x,a.y-b.y)<80)
      ctx.addIssue({code:'custom',message:'streets require orthogonal segments at least 80 units long'});
  }
});
export const surfaceSchema=z.object({id,color,points:z.array(point).min(3).max(64)}).strict().superRefine((s,ctx)=>{
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  let area=0;
  for(let i=0;i<s.points.length;i++){
    const a=s.points[i]!,b=s.points[(i+1)%s.points.length]!;area+=a.x*b.y-b.x*a.y;
    if(Math.hypot(a.x-b.x,a.y-b.y)<.01)ctx.addIssue({code:'custom',message:'surface has a zero-length edge'});
    for(let j=i+2;j<s.points.length;j++){
      if(i===0 && j===s.points.length-1)continue;
      const c=s.points[j]!,d=s.points[(j+1)%s.points.length]!;
      if(cross(a,b,c)*cross(a,b,d)<=0 && cross(c,d,a)*cross(c,d,b)<=0 && Math.max(a.x,b.x)>=Math.min(c.x,d.x) && Math.max(c.x,d.x)>=Math.min(a.x,b.x) && Math.max(a.y,b.y)>=Math.min(c.y,d.y) && Math.max(c.y,d.y)>=Math.min(a.y,b.y))ctx.addIssue({code:'custom',message:'surface must not cross or touch itself'});
    }
  }
  if(Math.abs(area)<2)ctx.addIssue({code:'custom',message:'surface area must be at least 1'});
  if(Math.abs(area)/2>1000000 || Math.max(...s.points.map(p=>p.x))-Math.min(...s.points.map(p=>p.x))>2000 || Math.max(...s.points.map(p=>p.y))-Math.min(...s.points.map(p=>p.y))>2000)
    ctx.addIssue({code:'custom',message:'surface exceeds 1000000 area or 2000 extent; split large grounds into bounded tiles'});
});
export const markingSchema=z.object({id,color,width:z.number().min(.5).max(12),closed:z.boolean(),points:z.array(point).min(2).max(64)}).strict().superRefine((s,ctx)=>{
  if(s.closed && s.points.length<3)ctx.addIssue({code:'custom',message:'closed markings need three points'});
  const points=s.closed ? [...s.points,s.points[0]!] : s.points;
  if(points.slice(1).some((p,i)=>Math.hypot(p.x-points[i]!.x,p.y-points[i]!.y)<.1))ctx.addIssue({code:'custom',message:'marking has a zero-length segment'});
});
export type Street=z.infer<typeof streetSchema>;
export type GroundSurface=z.infer<typeof surfaceSchema>;
export type Marking=z.infer<typeof markingSchema>;
export type Rect={x0:number;y0:number;x1:number;y1:number};
export const rectPolygon=(r:Rect):Point[]=>[{x:r.x0,y:r.y0},{x:r.x1,y:r.y0},{x:r.x1,y:r.y1},{x:r.x0,y:r.y1}];
export function streetRects(streets:Street[],sidewalk=false):Rect[]{
  return streets.flatMap(s=>s.points.slice(1).map((b,i)=>{
    const a=s.points[i]!,r=s.width/2+(sidewalk ? s.sidewalk+(s.cycleWidth ? s.cycleWidth+6 : 0) : 0);
    return {x0:Math.min(a.x,b.x)-r,y0:Math.min(a.y,b.y)-r,x1:Math.max(a.x,b.x)+r,y1:Math.max(a.y,b.y)+r};
  }));
}
/** Exact union/difference of orthogonal footprints. Junctions have one surface, no stacked tiles. */
export function unionRects(rects:Rect[],holes:Rect[]=[]):Rect[]{
  const xs=[...new Set([...rects,...holes].flatMap(r=>[r.x0,r.x1]))].sort((a,b)=>a-b),result:Rect[]=[];
  let previous=new Map<string,Rect>();
  for(let i=1;i<xs.length;i++){
    const x0=xs[i-1]!,x1=xs[i]!,x=(x0+x1)/2;
    const active=rects.filter(r=>r.x0<x && r.x1>x),cut=holes.filter(r=>r.x0<x && r.x1>x);
    const ys=[...new Set([...active,...cut].flatMap(r=>[r.y0,r.y1]))].sort((a,b)=>a-b),bands:Rect[]=[];
    for(let j=1;j<ys.length;j++){
      const y0=ys[j-1]!,y1=ys[j]!,y=(y0+y1)/2;
      if(!active.some(r=>r.y0<y && r.y1>y) || cut.some(r=>r.y0<y && r.y1>y))continue;
      const last=bands.at(-1);if(last?.y1===y0)last.y1=y1;else bands.push({x0,x1,y0,y1});
    }
    const next=new Map<string,Rect>();
    for(const band of bands){const key=`${band.y0},${band.y1}`,prior=previous.get(key);if(prior && prior.x1===x0){prior.x1=x1;next.set(key,prior);}else{result.push(band);next.set(key,band);}}
    previous=next;
  }
  return result;
}
const cache=new WeakMap<Scene,{roads:Rect[];riding:Rect[];reserved:Rect[]}>();
export function streetFootprints(scene:Scene){let value=cache.get(scene);if(!value){value={roads:streetRects(scene.streets),riding:streetRidingRects(scene.streets),reserved:streetRects(scene.streets,true)};cache.set(scene,value);}return value;}
export const inRect=(r:Rect,x:number,y:number,margin=0)=>x>=r.x0-margin && x<=r.x1+margin && y>=r.y0-margin && y<=r.y1+margin;
export function onStreet(scene:Scene,x:number,y:number){return streetFootprints(scene).riding.some(r=>inRect(r,x,y));}
export function reservedGround(scene:Scene,x:number,y:number){return streetFootprints(scene).reserved.some(r=>inRect(r,x,y,4)) || scene.surfaces.some(s=>pointInPolygon(x,y,s.points));}
/** Mitered paint stays a single ribbon at corners. Limit miter reach for very sharp authored turns. */
export function markingPolygons(s:Marking):Point[][]{
  const n=s.points.length,frames=s.points.map((p,i)=>{
    const a=s.points[i===0 ? s.closed ? n-1 : 0 : i-1]!,b=s.points[i===n-1 ? s.closed ? 0 : n-1 : i+1]!;
    const normal=(a:Point,b:Point)=>{const d=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:-(b.y-a.y)/d,y:(b.x-a.x)/d};};
    const u=normal(a,p),v=normal(p,b),nx=u.x+v.x,ny=u.y+v.y,length=Math.hypot(nx,ny)||1;
    const dot=(nx*v.x+ny*v.y)/length || 1,scale=Math.min(2,1/Math.abs(dot))*s.width/2;
    return {p,x:nx/length*scale,y:ny/length*scale};
  });
  if(s.closed)frames.push(frames[0]!);
  return frames.slice(1).map((b,i)=>{const a=frames[i]!;return [{x:a.p.x+a.x,y:a.p.y+a.y},{x:b.p.x+b.x,y:b.p.y+b.y},{x:b.p.x-b.x,y:b.p.y-b.y},{x:a.p.x-a.x,y:a.p.y-a.y}];});
}

/** Riding surface includes two cycle tracks and their 0.6 m separators. */
export function streetRidingRects(streets:Street[]):Rect[]{return streetRects(streets.map(s=>({...s,width:s.width+(s.cycleWidth ? 2*(s.cycleWidth+6) : 0)})));}
export function cycleBands(streets:Street[]):Rect[]{
  return streets.filter(s=>s.cycleWidth).flatMap(s=>s.points.slice(1).flatMap((b,i)=>{
    const a=s.points[i]!,inner=s.width/2+6,outer=inner+s.cycleWidth!,reach=outer;
    return [-1,1].map(side=>a.y===b.y ? {x0:Math.min(a.x,b.x)-reach,x1:Math.max(a.x,b.x)+reach,y0:a.y+(side<0 ? -outer : inner),y1:a.y+(side<0 ? -inner : outer)} : {y0:Math.min(a.y,b.y)-reach,y1:Math.max(a.y,b.y)+reach,x0:a.x+(side<0 ? -outer : inner),x1:a.x+(side<0 ? -inner : outer)});
  }));
}
/** A bridge must carry the entire street cross-section through both open ends. */
export function bridgeFitsStreet(scene:Scene,bridge:import('./landscape-dsl').Bridge):boolean{
  const horizontal=bridge.a.y===bridge.b.y,vertical=bridge.a.x===bridge.b.x;if(!horizontal && !vertical)return false;
  const outline=bridgePolygon(bridge),available=bridge.width/2-(bridge.rails ? 6 : 0);
  for(const rect of streetRects(scene.streets,true))if(polygonsOverlap(rectPolygon(rect),outline)){
    let strip=rectPolygon(rect).map(point=>{const p=bridgeCoordinates(bridge,point.x,point.y);return {x:p.t,y:p.across};});
    strip=clipPolygon(strip,p=>p.x);strip=clipPolygon(strip,p=>1-p.x);
    if(strip.some(p=>Math.abs(p.y)>available+.001))return false;
  }
  return scene.streets.some(s=>s.points.slice(1).some((b,i)=>{
    const a=s.points[i]!;if(horizontal!== (a.y===b.y))return false;
    const extent=s.width/2+(s.cycleWidth ? s.cycleWidth+6 : 0)+s.sidewalk,available=bridge.width/2-(bridge.rails ? 6 : 0);
    const offset=horizontal ? Math.abs(a.y-bridge.a.y) : Math.abs(a.x-bridge.a.x);
    return offset+extent<=available && (horizontal ? Math.min(a.x,b.x)<=Math.min(bridge.a.x,bridge.b.x)-20 && Math.max(a.x,b.x)>=Math.max(bridge.a.x,bridge.b.x)+20 : Math.min(a.y,b.y)<=Math.min(bridge.a.y,bridge.b.y)-20 && Math.max(a.y,b.y)>=Math.max(bridge.a.y,bridge.b.y)+20);
  }));
}
