import { z } from "zod";

export const routeSchema=z.object({
  id:z.string().min(1).max(40),kind:z.enum(["rail","path","water","air"]),mode:z.enum(["loop","shuttle"]),
  speed:z.number().finite().min(12).max(160),altitude:z.number().finite().min(60).max(300).optional(),
  waitS:z.number().finite().min(0).max(12).default(0),
  points:z.array(z.object({x:z.number().finite().min(0).max(8192),y:z.number().finite().min(0).max(8192)}).strict()).min(2).max(64),
}).strict().superRefine((route,ctx)=>{
  if((route.kind==="air")!==!!route.altitude) ctx.addIssue({code:z.ZodIssueCode.custom,message:"only air routes require altitude"});
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
