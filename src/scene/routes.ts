import { z } from "zod";

export const routeSchema=z.object({
  id:z.string().min(1).max(40),kind:z.enum(["rail","path","water","air"]),mode:z.enum(["loop","shuttle"]),
  speed:z.number().finite().min(12).max(160),altitude:z.number().finite().min(60).max(300).optional(),
  width:z.number().finite().min(16).max(120).optional(),surface:z.enum(["trail","cycle","paved"]).optional(),
  waitS:z.number().finite().min(0).max(12).default(0),
  points:z.array(z.object({x:z.number().finite().min(0).max(8192),y:z.number().finite().min(0).max(8192)}).strict()).min(2).max(64),
}).strict().superRefine((route,ctx)=>{
  if((route.kind==="air")!==!!route.altitude) ctx.addIssue({code:z.ZodIssueCode.custom,message:"only air routes require altitude"});
  if((route.width!==undefined || route.surface!==undefined) && route.kind!=="path")ctx.addIssue({code:z.ZodIssueCode.custom,message:"width and surface belong to path routes"});
  if(route.surface!==undefined && route.width===undefined)ctx.addIssue({code:z.ZodIssueCode.custom,message:"styled paths require an explicit corridor width"});
  if(route.mode==="loop" && route.points.length<3) ctx.addIssue({code:z.ZodIssueCode.custom,message:"loops need three points"});
  for(let i=1;i<route.points.length;i++) if(Math.hypot(route.points[i]!.x-route.points[i-1]!.x,route.points[i]!.y-route.points[i-1]!.y)<8)
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"route points must be at least 8 units apart"});
  if(route.mode==="loop" && Math.hypot(route.points[0]!.x-route.points.at(-1)!.x,route.points[0]!.y-route.points.at(-1)!.y)<8)
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"loop closure must be at least 8 units"});
  const length=route.points.reduce((sum,p,i)=>i ? sum+Math.hypot(p.x-route.points[i-1]!.x,p.y-route.points[i-1]!.y) : 0,0)+
    (route.mode==="loop" ? Math.hypot(route.points[0]!.x-route.points.at(-1)!.x,route.points[0]!.y-route.points.at(-1)!.y) : 0);
  if(length>12000)ctx.addIssue({code:z.ZodIssueCode.custom,message:"route length exceeds 12000"});
});
export type Route=z.infer<typeof routeSchema>;
const cache=new WeakMap<Route,{points:Route["points"];distances:number[];length:number}>();
export function routePath(route:Route) {
  let path=cache.get(route);if(path)return path;
  const points=route.mode==="loop" ? [...route.points,route.points[0]!] : route.points;
  const distances=[0];for(let i=1;i<points.length;i++) distances.push(distances[i-1]!+Math.hypot(points[i]!.x-points[i-1]!.x,points[i]!.y-points[i-1]!.y));
  path={points,distances,length:distances.at(-1)!};cache.set(route,path);return path;
}
const modulo=(n:number,d:number)=>((n%d)+d)%d;
export function routePoint(route:Route,distance:number) {
  const path=routePath(route);distance=route.mode==="loop" ? modulo(distance,path.length) : Math.max(0,Math.min(path.length,distance));
  let i=1;while(i<path.distances.length-1 && path.distances[i]!<distance)i++;
  const a=path.points[i-1]!,b=path.points[i]!,t=(distance-path.distances[i-1]!)/(path.distances[i]!-path.distances[i-1]!);
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}
/** Air routes only pave the first 180 units; airborne legs reserve no ground. */
export function routeGroundPath(route:Route) {
  const path=routePath(route);
  return route.kind==="air" && path.length>180 ? [...path.points.filter((_,i)=>path.distances[i]!<180),routePoint(route,180)] : path.points;
}
/** Include every authored corner; shared miter frames keep adjacent ribbon tiles joined. */
export function routeFrames(route:Route) {
  const path=routePath(route);
  const normal=(a:{x:number;y:number},b:{x:number;y:number})=>{const n=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:-(b.y-a.y)/n,y:(b.x-a.x)/n};};
  const corners=path.points.map((p,i)=>{
    const previous=path.points[i-1]??(route.mode==="loop" ? path.points.at(-2)! : p),next=path.points[i+1]??(route.mode==="loop" ? path.points[1]! : p);
    const a=normal(previous,p),b=normal(p,next);
    if(i===0 && route.mode!=="loop")return {...p,nx:b.x,ny:b.y};
    if(i===path.points.length-1 && route.mode!=="loop")return {...p,nx:a.x,ny:a.y};
    const denominator=Math.max(.5,1+a.x*b.x+a.y*b.y);
    return {...p,nx:(a.x+b.x)/denominator,ny:(a.y+b.y)/denominator};
  });
  const frames:(typeof corners[number]&{distance:number})[]=[];
  for(let i=1;i<corners.length;i++){
    const a=corners[i-1]!,b=corners[i]!,length=path.distances[i]!-path.distances[i-1]!,steps=Math.ceil(length/8);
    // Interpolate the joined edges, rather than pinching a miter into the final tiny tile.
    for(let j=0;j<steps;j++){const t=j/steps;frames.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,nx:a.nx+(b.nx-a.nx)*t,ny:a.ny+(b.ny-a.ny)*t,distance:path.distances[i-1]!+length*t});}
  }
  frames.push({...corners.at(-1)!,distance:path.length});return frames;
}
/** Rendering, layout reservations and decoration share one infrastructure footprint. */
export function routeInfrastructure(route:Route) {
  const points=routeGroundPath(route),frames=routeFrames(route.kind==="air" ? {...route,mode:"shuttle",points} : route);
  const halfWidth=route.kind==="air" ? 30 : route.kind==="rail" ? 20 : (route.width??28)/2;
  return {points,frames,halfWidth,radius:halfWidth*Math.max(...frames.map(p=>Math.hypot(p.nx,p.ny)))};
}
/** Stateless distance clock keeps all carriages on the same centerline, including corners. */
export function routePose(route:Route,timeS:number,offset=0) {
  const {length}=routePath(route),travelS=length/route.speed,cycle=travelS+route.waitS;
  const leg=Math.floor(timeS/cycle),phase=modulo(timeS,cycle),waiting=phase<route.waitS,travel=Math.max(0,phase-route.waitS)*route.speed;
  let distance:number,direction=1;
  if(route.mode==="loop") {
    distance=modulo(travel-offset,length);
  } else {
    direction=leg%2===0 ? 1 : -1;
    distance=direction===1 ? Math.max(0,travel-offset) : Math.min(length,length-travel+offset);
  }
  const point=routePoint(route,distance),before=routePoint(route,distance-12),after=routePoint(route,distance+12);
  const travelled=leg*length+travel-offset;
  return {...point,headingRad:Math.atan2(after.y-before.y,after.x-before.x)+(direction===-1 ? Math.PI : 0),distance,travelled,speed:waiting ? 0 : route.speed,direction};
}
