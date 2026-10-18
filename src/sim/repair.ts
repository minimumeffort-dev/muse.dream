import {socialAreas} from './social';
import {walkingHeight} from '../scene/interiors';
import {contactOverlaps} from '../scene/contact-geometry';
import {errandAreas} from './courier';
import {shiftAreas} from './shifts';
import {workClear,workSegment,workPath,workNetwork,primeWorkNetworks,type WalkingArea,type WorkNode} from './work-navigation';
import {growthContact} from '../scene/growth';
import {objectPlacement} from '../scene/placement';
import type {Scene,Point} from '../scene/schema';
import type {Repair} from '../scene/commerce';
import type {CarState} from './car';
import {COMMERCE_LIMITS,accountRepairs,repairGrounds,repairTargets,repairCoverage,primeRepairCoverage,type RepairCoverage,type RepairTarget} from '../scene/commerce';
import {objectContacts,queryStaticContacts,sceneContacts,type Contact} from '../scene/contacts';
import {isBroken} from './impacts';
import {actorContacts,actorPoses} from './actors';
import {objectHeight,objectRadius,archetypeOf} from './archetypes';
import {playerHeight,playerRadius} from '../scene/measure';

export {repairTargets,type RepairTarget} from '../scene/commerce';
export const REPAIR_RADIUS=COMMERCE_LIMITS.repairRadius,REPAIR_SPEED=14,REPAIR_REACH=12;
const repairAreas=new WeakMap<Scene,Map<string,WalkingArea>>();
// Preserve released narrow-service paths; wider verges need worker-sized corner turns.
export function repairArea(scene:Scene,r:Repair):WalkingArea{
 let entries=repairAreas.get(scene);if(!entries){entries=new Map();repairAreas.set(scene,entries);}let area=entries.get(r.id);if(!area){area={id:r.id,grounds:repairGrounds(r),access:repairCoverage(scene,r).access,network:!!(r.grounds || r.streets),wideAccess:(r.verge??24)>32};entries.set(r.id,area);}return area;
}
export const repairClear=(scene:Scene,r:Repair,p:Point,state?:CarState)=>workClear(scene,repairArea(scene,r),p,state);
export const repairSegment=(scene:Scene,r:Repair,a:Point,b:Point,state:CarState|undefined,areaOnly=false)=>workSegment(scene,repairArea(scene,r),a,b,state,areaOnly);
export const repairPath=(scene:Scene,r:Repair,start:Point,end:Point,state?:CarState)=>workPath(scene,repairArea(scene,r),start,end,state);
export const repairNetwork=(scene:Scene,r:Repair)=>workNetwork(scene,repairArea(scene,r));
export interface RepairNavigation {sourceHash:string;services:{id:string;nodes:WorkNode[];coverage?:RepairCoverage}[]}
const journeyAreas=(scene:Scene)=>[...new Map([...errandAreas(scene),...shiftAreas(scene),...socialAreas(scene)].map(a=>[a.id,a])).values()];
export function repairNavigation(scene:Scene):RepairNavigation{return {sourceHash:scene.sourceHash,services:[...(scene.economy?.repairs??[]).filter(r=>r.grounds || r.streets).map(r=>({id:r.id,nodes:repairNetwork(scene,r),coverage:repairCoverage(scene,r)})),...journeyAreas(scene).map(a=>({id:a.id,nodes:workNetwork(scene,a)}))]};}
/** Prepared topology comes only from the accepted world's own worker, never Dream or saves. */
export function primeRepairNavigation(scene:Scene,packet:RepairNavigation):void{
 const expected=(scene.economy?.repairs??[]).filter(r=>r.grounds || r.streets).map(r=>r.id).concat(journeyAreas(scene).map(a=>a.id)),bad=()=>{throw Error('Invalid prepared repair navigation');};
 if(!packet || packet.sourceHash!==scene.sourceHash || !Array.isArray(packet.services) || packet.services.length!==expected.length || packet.services.some(s=>!s || typeof s.id!=='string') || new Set(packet.services.map(s=>s.id)).size!==expected.length)bad();
 const prepared=new Map<string,WorkNode[]>();
 for(const service of packet.services){if(!expected.includes(service.id) || !Array.isArray(service.nodes) || !service.nodes.length || service.nodes.length>COMMERCE_LIMITS.repairNetworkNodes)bad();
  const nodes=service.nodes;let links=0;
  for(let i=0;i<nodes.length;i++){const n=nodes[i]!;if(!n || !Number.isFinite(n.x) || !Number.isFinite(n.y) || n.x<0 || n.y<0 || n.x>scene.canonical.width || n.y>scene.canonical.height || !Array.isArray(n.links))bad();links+=n.links.length;if(links>COMMERCE_LIMITS.repairNetworkLinks || new Set(n.links).size!==n.links.length || n.links.some(j=>!Number.isInteger(j) || j<0 || j>=nodes.length || j===i))bad();}
  const sets=nodes.map(n=>new Set(n.links));if(nodes.some((n,i)=>n.links.some(j=>!sets[j]!.has(i))))bad();prepared.set(service.id,nodes);
 }
 const coverage=new Map(packet.services.filter(s=>scene.economy?.repairs.some(r=>r.id===s.id)).map(s=>[s.id,s.coverage!]));
 if(packet.services.some(s=>!coverage.has(s.id) && s.coverage!==undefined))bad();
 primeRepairCoverage(scene,coverage);
 primeWorkNetworks(scene,prepared);
}
export function repairAccessProblems(scene:Scene):string[]{
 const problems:string[]=[];
 for(const r of scene.economy?.repairs??[]){if(!r.grounds && !r.streets)continue;
  try{const workers=scene.economy!.accounts.filter(a=>accountRepairs(a).includes(r.id)).map(a=>scene.objects.find(o=>o.id===a.actor)!);
   const homes=workers.length ? workers : [scene.objects.find(o=>o.id===scene.economy!.markets.find(m=>m.id===r.market)!.actor)!];
   repairNetwork(scene,r);
   for(const home of homes)for(const target of repairTargets(scene,r))if(!repairApproach(scene,r,target,home))problems.push(`${r.id}: ${target.objectId} needs a clear connection from its work ground to the pedestrian network and supply home`);
  }catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 }
 return problems;
}
export const targetBroken=(state:CarState,t:Pick<RepairTarget,'objectId'|'zoneId'>)=>t.zoneId ? state.brokenZones.some(z=>z.objectId===t.objectId && z.zoneId===t.zoneId) : state.broken.includes(t.objectId);
export function repairApproach(scene:Scene,r:Repair,t:RepairTarget,start:Point,state?:CarState){
 const c=t.contact,angle=Math.atan2(start.y-c.y,start.x-c.x),distance=c.r+REPAIR_RADIUS+3;
 for(let i=0;i<8;i++){const a=angle+i*Math.PI/4,end={x:c.x+Math.cos(a)*distance,y:c.y+Math.sin(a)*distance};if(Math.abs(walkingHeight(scene,end.x,end.y)-walkingHeight(scene,c.x,c.y))<4 && repairClear(scene,r,end,state)){const path=repairPath(scene,r,start,end,state);if(path)return {end,path};}}
}
/** Same vehicle cylinder as driving; the maintenance foot clearance is conservative. */
export function repairPlayerContact(scene:Scene,state:CarState):Contact{
 const control=state.control,active=control.kind==='vehicle' || control.kind==='passenger' ? sceneContacts(scene).objects.get(control.id) : undefined;
 const r=control.kind==='foot' ? 4 : active ? objectRadius(active) : playerRadius(scene),height=control.kind==='foot' ? 18 : active ? objectHeight(active) : playerHeight(scene);
 return {x:state.x,y:state.y,r,bottom:state.elevation,top:state.elevation+height};
}
/** Restore only into unoccupied space, including vehicles left parked inside the rubble. */
export function repairSpaceClear(scene:Scene,t:RepairTarget,state:CarState,scale=1):boolean{
 const object=scene.objects.find(o=>o.id===t.objectId)!,base=objectPlacement(scene,object).base;
 // Restoration checks above the footing; its supporting slab is not an overlap.
 const contacts=objectContacts(scene,object).filter(c=>c.zoneId===t.zoneId).map(c=>{const contact=growthContact(c,base,scale);return {...contact,bottom:Math.max(base,contact.bottom)};});
 const objects=sceneContacts(scene).objects,people=actorPoses(scene,state.timeS,state).filter(p=>{const object=objects.get(p.id);return object && archetypeOf(object).interaction==='decor';}).map(p=>{const o=objects.get(p.id)!;return {x:p.x,y:p.y,r:objectRadius(o),bottom:p.elevation,top:p.elevation+objectHeight(o)};});
 const obstacles=[...people,repairPlayerContact(scene,state),...actorContacts(scene,state.timeS,state),...state.props.map(p=>{const o=scene.objects.find(o=>o.id===p.id)!;return {x:p.x,y:p.y,r:objectRadius(o),bottom:p.elevation??0,top:(p.elevation??0)+objectHeight(o)};})];
 return contacts.every(c=>![...obstacles,...queryStaticContacts(scene,c.x,c.y,c.r,state).filter(o=>o.id!==t.objectId && !isBroken(state,o))].some(o=>contactOverlaps(o,c.x,c.y,c.r+.1) && o.top>c.bottom && o.bottom<c.top));
}
