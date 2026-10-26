import {distanceToPolygon,unionPolygons,intersectPolygons} from './polygons';
import {MAX_WORLD_SIZE} from './world-bounds';
import {z} from 'zod';
import type {Scene,Point} from './schema';
import {pointInPolygon} from '../sim/mask';
import {roadFootprint} from './road';
import {bridgeCoordinates,bridgePolygon,clipPolygon,polygonsOverlap} from './landscape-dsl';

const point=z.object({x:z.number().finite().min(0).max(MAX_WORLD_SIZE),y:z.number().finite().min(0).max(MAX_WORLD_SIZE)}).strict();
const id=z.string().min(1).max(40),color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const streetSchema=z.object({id,width:z.number().min(60).max(180),sidewalk:z.number().min(0).max(40),cycleWidth:z.number().min(16).max(40).optional(),points:z.array(point).min(2).max(16)}).strict().superRefine((s,ctx)=>{
  for(let i=1;i<s.points.length;i++){
    const a=s.points[i-1]!,b=s.points[i]!,d=Math.hypot(a.x-b.x,a.y-b.y);
    if(d<80)ctx.addIssue({code:'custom',message:'street segments must be at least 80 units long'});
    const c=s.points[i+1];
    if(c && ((b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y))/(d*Math.hypot(c.x-b.x,c.y-b.y))<-.5)
      ctx.addIssue({code:'custom',message:'street turns must not exceed 120 degrees; split the junction into separate streets'});
  }
});
export const surfaceSchema=z.object({id,color:color.optional(),finish:z.enum(['paint','terrain']).optional(),walkable:z.boolean().optional(),points:z.array(point).min(3).max(64)}).strict().superRefine((s,ctx)=>{
  if(s.finish==='terrain' && s.color!==undefined)ctx.addIssue({code:'custom',message:'terrain finish inherits the ground; omit color',path:['color']});
  if(s.finish!=='terrain' && s.color===undefined)ctx.addIssue({code:'custom',message:'painted surface requires color',path:['color']});
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  if(s.walkable && new Set(s.points.map((a,i)=>Math.sign(cross(a,s.points[(i+1)%s.points.length]!,s.points[(i+2)%s.points.length]!))).filter(Boolean)).size>1)
    ctx.addIssue({code:'custom',path:['points'],message:'walkable surfaces must be convex; join clear path pieces instead'});
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
function streetStrip(s:Street,r:number,cap=r):Point[][]{
  const points=s.points.map(p=>({...p}));
  for(const [i,j] of [[0,1],[points.length-1,points.length-2]]){
    const p=points[i!]!,q=s.points[j!]!,length=Math.hypot(p.x-q.x,p.y-q.y);
    p.x+=(p.x-q.x)/length*cap;p.y+=(p.y-q.y)/length*cap;
  }
  return markingPolygons({id:s.id,color:'#000000',width:r*2,closed:false,points});
}
/** One bounded miter ribbon; interior anchors never add protruding square caps. */
export function streetPolygons(streets:Street[],mode:'road'|'riding'|'reserved'='road'):Point[][]{
  return streets.flatMap(s=>streetStrip(s,s.width/2+(mode!=='road' && s.cycleWidth ? s.cycleWidth+6 : 0)+(mode==='reserved' ? s.sidewalk : 0)));
}
const cache=new WeakMap<Scene,{roads:Point[][];riding:Point[][];reserved:Point[][];walkways?:Point[][];cycles?:Point[][];crossings?:{street:Street;polygons:Point[][]}[]}>();
export function streetFootprints(scene:Scene){let value=cache.get(scene);if(!value){value={roads:streetPolygons(scene.streets),riding:streetPolygons(scene.streets,'riding'),reserved:streetPolygons(scene.streets,'reserved')};cache.set(scene,value);}return value;}
/** Validation and rendering reuse the exact same sidewalk union. */
export function streetSidewalks(scene:Scene){const ground=streetFootprints(scene);return ground.walkways??=unionPolygons(ground.reserved,[...ground.riding,...roadFootprint(scene)]);}
/** City lanes yield to every carriageway, including the independently authored circuit. */
export function streetCycleTracks(scene:Scene){const ground=streetFootprints(scene);return ground.cycles??=unionPolygons(cyclePolygons(scene.streets),[...ground.roads,...roadFootprint(scene)]);}
/** Existing sidewalk connections across the circuit become crosswalks, rather than raised paving. */
export function streetCircuitCrossings(scene:Scene){
  const ground=streetFootprints(scene),loop=roadFootprint(scene);let used:Point[][]=[];
  return ground.crossings??=scene.streets.flatMap(street=>{
    const walks=unionPolygons(streetPolygons([street],'reserved'),ground.riding);
    const polygons=unionPolygons(intersectPolygons(walks,loop),used);used=used.concat(polygons);
    return polygons.length ? [{street,polygons}] : [];
  });
}
export const inRect=(r:Rect,x:number,y:number,margin=0)=>x>=r.x0-margin && x<=r.x1+margin && y>=r.y0-margin && y<=r.y1+margin;
export const onPolygon=(p:Point[],x:number,y:number,margin=0)=>pointInPolygon(x,y,p) || distanceToPolygon(x,y,p)<=margin;
export function onStreet(scene:Scene,x:number,y:number){return streetFootprints(scene).riding.some(p=>onPolygon(p,x,y));}
export function reservedGround(scene:Scene,x:number,y:number){return streetFootprints(scene).reserved.some(p=>onPolygon(p,x,y,4)) || scene.surfaces.some(s=>s.finish!=='terrain' && pointInPolygon(x,y,s.points));}
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
export function cyclePolygons(streets:Street[]):Point[][]{
  return streets.filter(s=>s.cycleWidth).flatMap(s=>{
    const inner=s.width/2+6,outer=inner+s.cycleWidth!;
    return unionPolygons(streetStrip(s,outer),streetStrip(s,inner,outer));
  });
}
/** A bridge must carry the entire street cross-section through both open ends. */
export function bridgeFitsStreet(scene:Scene,bridge:import('./landscape-dsl').Bridge):boolean{
  const outline=bridgePolygon(bridge),available=bridge.width/2-(bridge.rails ? 6 : 0);
  for(const polygon of streetPolygons(scene.streets,'reserved'))if(polygonsOverlap(polygon,outline)){
    let strip=polygon.map(point=>{const p=bridgeCoordinates(bridge,point.x,point.y);return {x:p.t,y:p.across};});
    strip=clipPolygon(strip,p=>p.x);strip=clipPolygon(strip,p=>1-p.x);
    if(strip.some(p=>Math.abs(p.y)>available+.001))return false;
  }
  return scene.streets.some(s=>s.points.slice(1).some((b,i)=>{
    const a=s.points[i]!,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
    const u=bridgeCoordinates(bridge,a.x,a.y),v=bridgeCoordinates(bridge,b.x,b.y);
    const parallel=Math.abs(dx*(bridge.b.y-bridge.a.y)-dy*(bridge.b.x-bridge.a.x))/(length*u.length)<1e-6;
    const extent=s.width/2+(s.cycleWidth ? s.cycleWidth+6 : 0)+s.sidewalk;
    return parallel && Math.max(Math.abs(u.across),Math.abs(v.across))+extent<=available && Math.min(u.t,v.t)*u.length<=-20 && (Math.max(u.t,v.t)-1)*u.length>=20;
  }));
}
