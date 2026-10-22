import {Vector3} from 'three';
import type {Scene} from './schema';
import {objectPlacement} from './placement';
import {objectFloor} from './floors';
import {walkingHeight,workGround} from './interiors';
import {onPolygon} from './streets';
import {roleOf} from './agents';
import {supportedObjectPoint} from './seating';
import {queryStaticContacts} from './contacts';
import {contactOverlaps} from './contact-geometry';
import {waterAt} from './terrain';

export const STATION_REACH=2;
export interface Workstation {id:string;objectId:string;x:number;y:number;elevation:number;headingRad:number;hands:{x:number;y:number;z:number}}
const cache=new WeakMap<Scene,Workstation[]>();
/** Positions use the same fitted and rotated placement as the furniture mesh. */
export function workstations(scene:Scene):Workstation[]{
 let result=cache.get(scene);if(result)return result;
 result=(scene.economy?.stations??[]).flatMap(s=>{
  const o=scene.objects.find(o=>o.id===s.object);if(!o)return [];
  const placement=objectPlacement(scene,o),point=(p:[number,number,number])=>new Vector3(...p).multiplyScalar(o.scale).applyQuaternion(placement.rotation).add(new Vector3(o.x,placement.base,o.y));
  const at=point([s.at[0],0,s.at[1]]),hands=point(s.hands),elevation=objectFloor(scene,o)?.elevation??walkingHeight(scene,at.x,at.z,4.1);
  return [{id:s.id,objectId:o.id,x:at.x,y:at.z,elevation,headingRad:Math.atan2(hands.z-at.z,hands.x-at.x),hands:{x:hands.x,y:hands.y,z:hands.z}}];
 });cache.set(scene,result);return result;
}
export const workstation=(scene:Scene,id:string|undefined)=>id ? workstations(scene).find(s=>s.id===id) : undefined;
export function workstationProblems(scene:Scene):string[]{
 const problems:string[]=[];
 for(const s of scene.economy?.stations??[]){
  const o=scene.objects.find(o=>o.id===s.object),spec=o?.spec,p=workstation(scene,s.id);
  if(!o || !p || roleOf(o)!=='prop' || o.route || o.ambient || !spec || !('dslVersion' in spec) || spec.dslVersion!==2 || spec.body.interaction!=='solid' || spec.rideable || o.floor || spec.grounding==='surface' || spec.joints?.length || spec.parts.some(p=>p.animation)){problems.push(`${s.id}: station needs upright static solid prop geometry without joints`);continue;}
  const grounds=[s.on,...(s.grounds??[])].map(id=>workGround(scene,id));
  if(grounds.some(g=>!g) || !grounds.some(g=>g && onPolygon(g.points,p.x,p.y)))problems.push(`${s.id}: station stand must lie on its declared work grounds`);
  const radius=4.1,height=18;
  if(p.x<radius || p.y<radius || p.x>scene.canonical.width-radius || p.y>scene.canonical.height-radius || waterAt(scene.terrain,p.x,p.y,p.elevation) || queryStaticContacts(scene,p.x,p.y,radius).some(c=>c.top>p.elevation+.05 && c.bottom<p.elevation+height-.05 && contactOverlaps(c,p.x,p.y,radius)))problems.push(`${s.id}: station needs a dry clear standing body and headroom`);
  if(Array.from({length:8},(_,i)=>{const x=p.x+Math.cos(i*Math.PI/4)*radius,y=p.y+Math.sin(i*Math.PI/4)*radius;return !!waterAt(scene.terrain,x,y,walkingHeight(scene,x,y,0)) || Math.abs(walkingHeight(scene,x,y,0)-p.elevation)>4;}).some(Boolean))problems.push(`${s.id}: station standing footprint needs dry supported ground`);
  const reach=Math.hypot(p.hands.x-p.x,p.hands.z-p.y),heightAt=p.hands.y-p.elevation;
  if(reach<3 || reach>7 || heightAt<6 || heightAt>12 || !supportedObjectPoint(spec,s.hands,.25/o.scale))problems.push(`${s.id}: hands need a supported work surface 3..7 units away and 6..12 above the floor`);
  for(const j of scene.economy!.jobs.filter(j=>j.station===s.id)){
   const market=scene.economy!.markets.find(m=>m.id===j.market)!,vendor=scene.objects.find(o=>o.id===market.actor)!;
   if(vendor && Math.hypot(p.x-vendor.x,p.y-vendor.y,p.elevation-walkingHeight(scene,vendor.x,vendor.y))>market.radius)problems.push(`${s.id}: station must remain inside its job's counter reach`);
  }
 }
 const stations=workstations(scene);for(let i=0;i<stations.length;i++)if(stations.slice(0,i).some(p=>Math.hypot(p.x-stations[i]!.x,p.y-stations[i]!.y,p.elevation-stations[i]!.elevation)<10))problems.push(`${stations[i]!.id}: station stands need 10-unit separation`);
 return problems;
}
