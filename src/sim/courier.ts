import {objectRadius,objectHeight} from './archetypes';
import {worldSeats} from '../scene/seating';
import {walkingHeight} from '../scene/interiors';
import type {Scene,Point} from '../scene/schema';
import {accountJobs,type Delivery,type Economy} from '../scene/commerce';
import {workClear,workPath,workNetwork,type WalkingArea} from './work-navigation';

/** Deliveries with identical declared grounds share one prepared pedestrian topology. */
export function deliveryArea(d:Pick<Delivery,'on'|'grounds'>):WalkingArea{
 const grounds=[d.on!,...(d.grounds??[])];
 return {id:'delivery/'+grounds.join('/'),grounds,access:[],network:true};
}
export function deliveryAreas(scene:Scene):WalkingArea[]{
 return [...new Map((scene.economy?.deliveries??[]).filter(d=>d.on).map(d=>{const a=deliveryArea(d);return [a.id,a];})).values()];
}
export function mealAreas(scene:Scene):WalkingArea[]{return [...new Map((scene.economy?.meals??[]).map(m=>{const a=deliveryArea(m);return [a.id,a];})).values()];}
export function commuteArea(scene:Scene,a:Pick<Economy['accounts'][number],'actor'|'on'|'grounds'>):WalkingArea{
 const object=scene.objects.find(o=>o.id===a.actor)!,base=deliveryArea(a),radius=Math.max(4,Math.ceil(objectRadius(object)*10)/10),height=Math.max(18,Math.ceil(objectHeight(object)*10)/10);
 return {...base,id:`commute/${radius}/${height}/${base.id}`,radius,height};
}
export function commuteAreas(scene:Scene):WalkingArea[]{return [...new Map((scene.economy?.accounts??[]).filter(a=>a.commute).map(a=>{const area=commuteArea(scene,a);return [area.id,area];})).values()];}
export function commuteAccessProblems(scene:Scene):string[]{
 const e=scene.economy;if(!e)return [];const problems:string[]=[];
 for(const a of e.accounts.filter(a=>a.commute))for(const id of accountJobs(a)){
  const job=e.jobs.find(j=>j.id===id)!,home=scene.objects.find(o=>o.id===a.actor)!;
  try{const area=commuteArea(scene,a),offer=courierApproach(scene,a,job.market,home,undefined,area);if(!offer || !workPath(scene,area,offer.end,home))problems.push(`${a.id}: ${id} needs connected work and home approaches`);}catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 }
 return problems;
}
export function errandAreas(scene:Scene):WalkingArea[]{return [...new Map([...deliveryAreas(scene),...mealAreas(scene),...commuteAreas(scene)].map(a=>[a.id,a])).values()];}
export function mealAccessProblems(scene:Scene):string[]{
 const e=scene.economy;if(!e)return [];const problems:string[]=[];
 for(const a of e.accounts)if(a.meal){const m=e.meals.find(m=>m.id===a.meal),home=scene.objects.find(o=>o.id===a.actor);if(!m || !home)continue;for(const id of m.markets)try{const offer=courierApproach(scene,m,id,home);if(!offer || !workPath(scene,deliveryArea(m),offer.end,home))problems.push(`${a.id}: ${m.id} needs connected meal markets and home on the pedestrian network`);}catch(error){problems.push(error instanceof Error ? error.message : String(error));}}
 for(const m of e.meals)for(const s of worldSeats(scene).filter(s=>m.seats?.includes(s.objectId)))for(const id of m.markets){const vendor=scene.objects.find(o=>o.id===e.markets.find(v=>v.id===id)!.actor)!;const offer=courierApproach(scene,m,id,vendor);if(!offer || !workPath(scene,deliveryArea(m),offer.end,s.approach))problems.push(`${m.id}: seat ${s.objectId}/${s.seatId} needs a connected meal approach`);}
 return problems;
}
export function courierApproach(scene:Scene,d:Pick<Delivery,'on'|'grounds'>,marketId:string,start:Point,state?:import('./car').CarState,walkingArea?:WalkingArea){
 const m=scene.economy!.markets.find(m=>m.id===marketId)!,vendor=scene.objects.find(o=>o.id===m.actor)!,area=walkingArea??deliveryArea(d),angle=Math.atan2(start.y-vendor.y,start.x-vendor.x);
 for(let i=0;i<8;i++){
  const a=angle+i*Math.PI/4,end={x:vendor.x+Math.cos(a)*16,y:vendor.y+Math.sin(a)*16};
  if(Math.abs(walkingHeight(scene,end.x,end.y)-walkingHeight(scene,vendor.x,vendor.y))<4 && workClear(scene,area,end,state)){const path=workPath(scene,area,start,end,state);if(path)return {end,path};}
 }
}
export function courierAccessProblems(scene:Scene):string[]{
 const e=scene.economy;if(!e)return [];
 const problems:string[]=[];
 for(const area of deliveryAreas(scene))try{workNetwork(scene,area);}catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 for(const a of e.accounts)for(const id of a.deliveries??[]){
  const d=e.deliveries.find(d=>d.id===id)!,home=scene.objects.find(o=>o.id===a.actor);
  if(!home || !d?.on)continue;
  try{
   const pickup=courierApproach(scene,d,d.from,home),dropoff=pickup && courierApproach(scene,d,d.to,pickup.end);
   if(!pickup || !dropoff || !workPath(scene,deliveryArea(d),dropoff.end,home))problems.push(`${a.id}: ${id} needs connected delivery grounds, supplier, destination and home on the pedestrian network`);
  }catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 }
 return problems;
}
