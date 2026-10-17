import type {Scene,Point} from '../scene/schema';
import type {Repair} from '../scene/commerce';
import type {CarState} from './car';
import {COMMERCE_LIMITS,repairKinds} from '../scene/commerce';
import {objectContacts,queryStaticContacts,sceneContacts,type Contact} from '../scene/contacts';
import {impactOf,zonesOf} from '../scene/object-dsl';
import {onPolygon,streetFootprints} from '../scene/streets';
import {polygonBounds,distanceToPolygon} from '../scene/polygons';
import {drivingHeight} from '../scene/terrain';
import {distanceToRoad,roadPoints} from '../scene/road';
import {isBroken} from './impacts';
import {actorContacts,actorPoses} from './actors';
import {objectHeight,objectRadius,archetypeOf} from './archetypes';
import {playerHeight,playerRadius} from '../scene/measure';

export interface RepairTarget {objectId:string;zoneId?:string;contact:Contact}
export const REPAIR_RADIUS=4,REPAIR_SPEED=14,REPAIR_REACH=12;
const cache=new WeakMap<Scene,Map<string,ReturnType<typeof area>>>();
function area(scene:Scene,r:Repair){
 const polygon=scene.surfaces.find(s=>s.id===r.on)!.points,b=polygonBounds(polygon),nx=Math.ceil((b.x1-b.x0)/12)+1,ny=Math.ceil((b.y1-b.y0)/12)+1,road=roadPoints(scene);
 const point=(i:number):Point=>({x:b.x0+i%nx*12,y:b.y0+Math.floor(i/nx)*12});
 const nearby=(points:Point[])=>{const q=polygonBounds(points);return q.x1+240>=b.x0 && q.x0-240<=b.x1 && q.y1+240>=b.y0 && q.y0-240<=b.y1;};
 const roads=road.slice(1).map((p,i)=>[road[i]!,p]).filter(nearby),riding=streetFootprints(scene).riding.filter(nearby),waters=(scene.terrain.landscape?.waters??[]).map(w=>w.polygon).filter(nearby);
 const allowed=(p:Point)=>onPolygon(polygon,p.x,p.y) && distanceToPolygon(p.x,p.y,polygon)>=REPAIR_RADIUS && !riding.some(q=>onPolygon(q,p.x,p.y) || distanceToPolygon(p.x,p.y,q)<REPAIR_RADIUS) && !roads.some(q=>distanceToRoad(q,p.x,p.y)<scene.roadMaskRef.params.roadWidth/2+REPAIR_RADIUS) && !waters.some(q=>onPolygon(q,p.x,p.y) || distanceToPolygon(p.x,p.y,q)<REPAIR_RADIUS);
 return {nx,ny,point,allowed,nodes:Array.from({length:Math.min(nx*ny,COMMERCE_LIMITS.repairNodes)},(_,i)=>allowed(point(i)))};
}
function grid(scene:Scene,r:Repair){let entries=cache.get(scene);if(!entries){entries=new Map();cache.set(scene,entries);}let value=entries.get(r.id);if(!value){value=area(scene,r);entries.set(r.id,value);}return value;}
export function repairClear(scene:Scene,r:Repair,p:Point,state:CarState):boolean{
 const floor=drivingHeight(scene.terrain,p.x,p.y);
 return grid(scene,r).allowed(p) && !queryStaticContacts(scene,p.x,p.y,REPAIR_RADIUS,state).some(c=>!isBroken(state,c) && Math.hypot(c.x-p.x,c.y-p.y)<c.r+REPAIR_RADIUS && c.top>floor && c.bottom<floor+18);
}
export function repairSegment(scene:Scene,r:Repair,a:Point,b:Point,state:CarState,areaOnly=false):boolean{
 const length=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(length/2));
 for(let i=0;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if(areaOnly ? !grid(scene,r).allowed(p) : !repairClear(scene,r,p,state))return false;}return true;
}
/** Bounded local work-yard path, never a world raster or a shortcut through a street. */
export function repairPath(scene:Scene,r:Repair,start:Point,end:Point,state:CarState):Point[]|undefined{
 const destination={x:end.x,y:end.y};
 if(repairSegment(scene,r,start,end,state))return [destination];
 const g=grid(scene,r),near=(p:Point)=>g.nodes.map((valid,i)=>({valid,i,d:Math.hypot(g.point(i).x-p.x,g.point(i).y-p.y)})).filter(v=>v.valid && v.d<=24).sort((a,b)=>a.d-b.d || a.i-b.i).filter(v=>repairSegment(scene,r,p,g.point(v.i),state)).map(v=>v.i);
 const starts=near(start),ends=new Set(near(end)),previous=new Int32Array(g.nodes.length).fill(-2),queue:number[]=[];
 for(const i of starts){previous[i]=-1;queue.push(i);}
 for(let cursor=0;cursor<queue.length;cursor++){
  const i=queue[cursor]!;
  if(ends.has(i)){const path:Point[]=[destination];for(let at=i;at>=0;at=previous[at]!)path.push(g.point(at));path.reverse();return path.length<=COMMERCE_LIMITS.repairPath ? path : undefined;}
  for(const j of [i-1,i+1,i-g.nx,i+g.nx])if(j>=0 && j<g.nodes.length && previous[j]===-2 && g.nodes[j] && Math.abs(j%g.nx-i%g.nx)+Math.abs(Math.floor(j/g.nx)-Math.floor(i/g.nx))===1 && repairSegment(scene,r,g.point(i),g.point(j),state)){previous[j]=i;queue.push(j);}
 }return;
}
export function repairTargets(scene:Scene,r:Repair):RepairTarget[]{
 const polygon=scene.surfaces.find(s=>s.id===r.on)!.points;
 return scene.objects.filter(o=>o.spec && 'measure' in o.spec && !!o.spec.measure && repairKinds(r).includes(o.spec.measure.kind) && onPolygon(polygon,o.x,o.y)).flatMap(o=>{
  const contacts=objectContacts(scene,o);
  return [...(['break','topple'].includes(impactOf(o.spec)?.kind??'') ? [{objectId:o.id,contact:contacts[0]!}] : []),...zonesOf(o.spec).map(z=>({objectId:o.id,zoneId:z.id,contact:contacts.find(c=>c.zoneId===z.id)!})).filter(t=>t.contact.bottom<=drivingHeight(scene.terrain,t.contact.x,t.contact.y)+18)];
 });
}
export const targetBroken=(state:CarState,t:Pick<RepairTarget,'objectId'|'zoneId'>)=>t.zoneId ? state.brokenZones.some(z=>z.objectId===t.objectId && z.zoneId===t.zoneId) : state.broken.includes(t.objectId);
export function repairApproach(scene:Scene,r:Repair,t:RepairTarget,start:Point,state:CarState){
 const c=t.contact,angle=Math.atan2(start.y-c.y,start.x-c.x),distance=c.r+REPAIR_RADIUS+3;
 for(let i=0;i<8;i++){const a=angle+i*Math.PI/4,end={x:c.x+Math.cos(a)*distance,y:c.y+Math.sin(a)*distance};if(repairClear(scene,r,end,state)){const path=repairPath(scene,r,start,end,state);if(path)return {end,path};}}
}
/** Same vehicle cylinder as driving; the maintenance foot clearance is conservative. */
export function repairPlayerContact(scene:Scene,state:CarState):Contact{
 const control=state.control,active=control.kind==='vehicle' || control.kind==='passenger' ? sceneContacts(scene).objects.get(control.id) : undefined;
 const r=control.kind==='foot' ? 4 : active ? objectRadius(active) : playerRadius(scene),height=control.kind==='foot' ? 18 : active ? objectHeight(active) : playerHeight(scene);
 return {x:state.x,y:state.y,r,bottom:state.elevation,top:state.elevation+height};
}
/** Restore only into unoccupied space, including vehicles left parked inside the rubble. */
export function repairSpaceClear(scene:Scene,t:RepairTarget,state:CarState):boolean{
 const object=scene.objects.find(o=>o.id===t.objectId)!,contacts=objectContacts(scene,object).filter(c=>c.zoneId===t.zoneId);
 const objects=sceneContacts(scene).objects,people=actorPoses(scene,state.timeS,state).filter(p=>{const object=objects.get(p.id);return object && archetypeOf(object).interaction==='decor';}).map(p=>{const o=objects.get(p.id)!;return {x:p.x,y:p.y,r:objectRadius(o),bottom:p.elevation,top:p.elevation+objectHeight(o)};});
 const obstacles=[...people,repairPlayerContact(scene,state),...actorContacts(scene,state.timeS,state),...state.props.map(p=>{const o=scene.objects.find(o=>o.id===p.id)!;return {x:p.x,y:p.y,r:objectRadius(o),bottom:p.elevation??0,top:(p.elevation??0)+objectHeight(o)};})];
 return contacts.every(c=>![...obstacles,...queryStaticContacts(scene,c.x,c.y,c.r,state).filter(o=>o.id!==t.objectId && !isBroken(state,o))].some(o=>Math.hypot(o.x-c.x,o.y-c.y)<o.r+c.r+.1 && o.top>c.bottom && o.bottom<c.top));
}
