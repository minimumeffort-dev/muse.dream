import {MAX_WORLD_SIZE,MAX_WATER_AREA,MAX_WAVE_CELLS} from './world-bounds';
import { z } from "zod";
import { pointInPolygon } from "../sim/mask";

const point = z.object({ x:z.number().finite().min(0).max(MAX_WORLD_SIZE), y:z.number().finite().min(0).max(MAX_WORLD_SIZE) }).strict();
type Point = z.infer<typeof point>;
const id = z.string().min(1).max(40);
const cross = (a:Point,b:Point,c:Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);

export const waterSchema = z.object({
  id, polygon:z.array(point).min(3).max(32),
  level:z.number().finite().min(0).max(300), depth:z.number().finite().min(2).max(24),
  bankWidth:z.number().finite().min(20).max(120), color:z.string().regex(/^#[0-9a-fA-F]{6}$/),
  flow:z.object({ x:z.number().finite().min(-60).max(60), y:z.number().finite().min(-60).max(60) }).strict(),
  dragPerS:z.number().finite().min(.5).max(6),
  waves:z.object({ speed:z.number().finite().min(20).max(100), damping:z.number().finite().min(.5).max(4),
    strength:z.number().finite().min(0).max(2) }).strict(),
}).strict().superRefine(({polygon},ctx) => {
  let area=0, invalid=false;
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i]!, b=polygon[(i+1)%polygon.length]!;
    area+=a.x*b.y-b.x*a.y;
    if(Math.hypot(a.x-b.x,a.y-b.y)<4) invalid=true;
    for(let j=i+2;j<polygon.length;j++) {
      if(i===0 && j===polygon.length-1) continue;
      const c=polygon[j]!,d=polygon[(j+1)%polygon.length]!;
      if(cross(a,b,c)*cross(a,b,d)<=0 && cross(c,d,a)*cross(c,d,b)<=0 &&
        Math.max(a.x,b.x)>=Math.min(c.x,d.x) && Math.max(c.x,d.x)>=Math.min(a.x,b.x) &&
        Math.max(a.y,b.y)>=Math.min(c.y,d.y) && Math.max(c.y,d.y)>=Math.min(a.y,b.y)) invalid=true;
    }
  }
  const width=Math.max(...polygon.map(p=>p.x))-Math.min(...polygon.map(p=>p.x));
  const height=Math.max(...polygon.map(p=>p.y))-Math.min(...polygon.map(p=>p.y));
  if(invalid || Math.abs(area)/2<400 || Math.abs(area)/2>MAX_WATER_AREA || width<80 || height<80 || width>MAX_WORLD_SIZE || height>MAX_WORLD_SIZE || (Math.ceil(width/24)+1)*(Math.ceil(height/24)+1)>MAX_WAVE_CELLS)
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"water requires a simple bounded polygon (400–8000000 square units, maximum extent 16384 and 131072 wave cells)"});
});

export const bridgeSchema = z.object({
  id, a:point, b:point, width:z.number().finite().min(64).max(240),
  archHeight:z.number().finite().min(0).max(40), style:z.enum(["timber","stone"]), rails:z.boolean(),
}).strict().superRefine(({a,b},ctx) => {
  const length=Math.hypot(a.x-b.x,a.y-b.y);
  if(length<80 || length>600) ctx.addIssue({code:z.ZodIssueCode.custom,message:"bridge span must be 80–600 units"});
});

export const landscapeSchema = z.object({
  dslVersion:z.literal(1), waters:z.array(waterSchema).max(8), bridges:z.array(bridgeSchema).max(8),
}).strict().superRefine(({waters,bridges},ctx) => {
  const ids=[...waters,...bridges].map(f=>f.id);
  if(new Set(ids).size!==ids.length) ctx.addIssue({code:z.ZodIssueCode.custom,message:"duplicate landscape id"});
});
export type Water = z.infer<typeof waterSchema>;
export type Bridge = z.infer<typeof bridgeSchema>;
export type Landscape = z.infer<typeof landscapeSchema>;

export const watercourseSchema=z.object({
  ends:z.enum(["round","open"]).default("round"),
  id,stations:z.array(z.object({x:point.shape.x,y:point.shape.y,width:z.number().finite().min(80).max(1200)}).strict()).min(2).max(8),
  level:z.number().finite().min(0).max(300),depth:z.number().finite().min(2).max(24),
  bankWidth:z.number().finite().min(20).max(120),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),
  dragPerS:z.number().finite().min(.5).max(6).default(2.2),
  flow:z.object({x:z.number().finite().min(-60).max(60),y:z.number().finite().min(-60).max(60)}).strict(),
}).strict();
/** One continuous basin, widening into pools and closing with rounded source/outlet banks. */
export function compileWatercourse(input:z.input<typeof watercourseSchema>):Water {
  const {stations,ends,...data}=watercourseSchema.parse(input),outline:Point[]=[];
  const normals=stations.map((p,i)=>{
    const a=stations[Math.max(0,i-1)]!,b=stations[Math.min(stations.length-1,i+1)]!,length=Math.hypot(b.x-a.x,b.y-a.y);
    if(length<8) throw new Error("watercourse stations must be distinct");
    return {x:-(b.y-a.y)/length,y:(b.x-a.x)/length};
  });
  const edge=(i:number,side:number)=>({x:stations[i]!.x+normals[i]!.x*stations[i]!.width/2*side,y:stations[i]!.y+normals[i]!.y*stations[i]!.width/2*side});
  for(let i=0;i<stations.length;i++) outline.push(edge(i,1));
  const cap=(i:number,start:number)=>{const p=stations[i]!,n=normals[i]!,a=Math.atan2(n.y,n.x)+start;for(let j=1;j<8;j++){const angle=a-Math.PI*j/8;outline.push({x:p.x+Math.cos(angle)*p.width/2,y:p.y+Math.sin(angle)*p.width/2});}};
  if(ends==="round")cap(stations.length-1,0);
  for(let i=stations.length-1;i>=0;i--) outline.push(edge(i,-1));
  if(ends==="round")cap(0,Math.PI);
  return waterSchema.parse({...data,polygon:outline,waves:{speed:70,damping:1.4,strength:1.2}});
}

export function polygonsOverlap(a:Point[],b:Point[]):boolean {
  if(a.some(p=>pointInPolygon(p.x,p.y,b)) || b.some(p=>pointInPolygon(p.x,p.y,a))) return true;
  return a.some((p,i)=>b.some((q,j)=>cross(p,a[(i+1)%a.length]!,q)*cross(p,a[(i+1)%a.length]!,b[(j+1)%b.length]!)<0 &&
    cross(q,b[(j+1)%b.length]!,p)*cross(q,b[(j+1)%b.length]!,a[(i+1)%a.length]!)<0));
}

/** Distance to the outline, negative outside; used for a smooth, dry bank. */
export function waterDistance(water:Water,x:number,y:number):number {
  if(!waterContains(water,x,y)) return -1;
  let distance=Infinity;
  for(let i=0;i<water.polygon.length;i++) {
    const a=water.polygon[i]!,b=water.polygon[(i+1)%water.polygon.length]!;
    const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
    distance=Math.min(distance,Math.hypot(x-a.x-dx*t,y-a.y-dy*t));
  }
  return distance;
}

// Accepted landscape geometry is immutable; caches follow its lifetime.
const waterBounds=new WeakMap<Water,{x0:number;y0:number;x1:number;y1:number}>();
export function waterContains(water:Water,x:number,y:number):boolean {
  let b=waterBounds.get(water);
  if(!b){b={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity};for(const p of water.polygon){b.x0=Math.min(b.x0,p.x);b.y0=Math.min(b.y0,p.y);b.x1=Math.max(b.x1,p.x);b.y1=Math.max(b.y1,p.y);}waterBounds.set(water,b);}
  return x>=b.x0 && x<=b.x1 && y>=b.y0 && y<=b.y1 && pointInPolygon(x,y,water.polygon);
}
const bridgeFrames=new WeakMap<Bridge,{length:number;ux:number;uy:number}>();
export function bridgeCoordinates(bridge:Bridge,x:number,y:number) {
  let frame=bridgeFrames.get(bridge);
  if(!frame){const length=Math.hypot(bridge.b.x-bridge.a.x,bridge.b.y-bridge.a.y);frame={length,ux:(bridge.b.x-bridge.a.x)/length,uy:(bridge.b.y-bridge.a.y)/length};if(length>0 && Number.isFinite(length))bridgeFrames.set(bridge,frame);}
  const {length,ux,uy}=frame;
  return {length,ux,uy,t:((x-bridge.a.x)*ux+(y-bridge.a.y)*uy)/length,across:-(x-bridge.a.x)*uy+(y-bridge.a.y)*ux};
}
export function bridgeAt(landscape:Landscape|undefined,x:number,y:number):Bridge|undefined {
  return landscape?.bridges.find(bridge=>{const p=bridgeCoordinates(bridge,x,y);return p.t>=0 && p.t<=1 && Math.abs(p.across)<=bridge.width/2;});
}
export function bridgePolygon(bridge:Bridge):Point[] {
  const {ux,uy}=bridgeCoordinates(bridge,bridge.a.x,bridge.a.y),h=bridge.width/2;
  return [{x:bridge.a.x-uy*h,y:bridge.a.y+ux*h},{x:bridge.b.x-uy*h,y:bridge.b.y+ux*h},
    {x:bridge.b.x+uy*h,y:bridge.b.y-ux*h},{x:bridge.a.x+uy*h,y:bridge.a.y-ux*h}];
}

export function clipPolygon(polygon: Point[], distance: (p: Point) => number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!, da = distance(a), db = distance(b);
    if (da >= 0) result.push(a);
    if ((da < 0) !== (db < 0)) {
      const t = da / (da - db); result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

