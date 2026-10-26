import type {Scene,Point} from '../scene/schema';
import {sceneFloors,FLOOR_LIMITS,type WalkingPoint} from '../scene/floors';
import {sceneInteriors,walkingHeight} from '../scene/interiors';
import {objectContacts} from '../scene/contacts';
import {contactOverlaps} from '../scene/contact-geometry';
import {pavementSurface} from '../scene/pavement';
import {polygonBounds} from '../scene/polygons';
import {SpatialGrid} from './spatial';
import type {CarState} from './car';
import {isBroken} from './impacts';
import type {WalkingArea,WorkNode} from './work-navigation';
import {queryStaticContacts} from '../scene/contacts';
export type IndoorArea=WalkingArea & {indoor:string};
const cache=new WeakMap<Scene,Map<string,ReturnType<typeof prepare>>>();
export function indoorAreas(scene:Scene,area:WalkingArea):IndoorArea[]{
 const floors=sceneFloors(scene).filter(f=>area.grounds.includes(f.id)),owners=[...new Set(floors.map(f=>f.object.id))];
 return owners.map(owner=>{
  if(!area.grounds.includes(owner))throw Error(`${area.id}: floor routes also need their enclosing building ground`);
  const ids=floors.filter(f=>f.object.id===owner).map(f=>f.id);
  return {...area,id:`indoor/${owner}/${area.radius??4}/${area.height??18}/${ids.join('/')}`,grounds:[owner,...ids],network:true,indoor:owner};
 });
}
function prepare(scene:Scene,area:IndoorArea){
 const room=sceneInteriors(scene).find(r=>r.object.id===area.indoor)!;if(!room)throw Error('Indoor route needs its enclosing building');
 const object=room.object,spec=object.spec && 'dslVersion' in object.spec && object.spec.dslVersion===2 ? object.spec : undefined,contacts=objectContacts(scene,object),radius=area.radius??4,height=area.height??18;
 const layers=[{elevation:room.floor,points:room.polygon},...sceneFloors(scene).filter(f=>area.grounds.includes(f.id))],groups=new Map<number,Point[][]>();
 for(const f of layers){const group=groups.get(f.elevation)??[];group.push(f.points);groups.set(f.elevation,group);}
 const surfaces=[...groups].map(([elevation,polygons])=>({elevation,surface:pavementSurface(polygons)}));
 const flights=(spec?.stairways??[]).map(s=>{const cs=contacts.slice(s.contactStart,s.contactStart+s.steps),first=cs[0]!,last=cs.at(-1)!,a=first.box!.headingRad,dx=-Math.sin(a),dy=Math.cos(a),half=first.box!.halfY;
  const points:WalkingPoint[]=[{x:first.x-dx*(half+radius+1),y:first.y-dy*(half+radius+1),elevation:first.bottom},...cs.map(c=>({x:c.x+dx*(half-radius-.05),y:c.y+dy*(half-radius-.05),elevation:c.top})),{x:last.x+dx*(half+radius+1),y:last.y+dy*(half+radius+1),elevation:last.top}];
  return {points,first,last,dx,dy,half,width:first.box!.halfX};
 });
 const covers=(p:WalkingPoint)=>{
  const h=p.elevation??walkingHeight(scene,p.x,p.y);
  if(surfaces.some(f=>Math.abs(h-f.elevation)<.1 && Array.from({length:9},(_,i)=>({x:p.x+(i ? Math.cos(i*Math.PI/4)*radius : 0),y:p.y+(i ? Math.sin(i*Math.PI/4)*radius : 0)})).every(q=>f.surface.paved(q.x,q.y))))return true;
  return flights.some(f=>{const dx=p.x-f.first.x,dy=p.y-f.first.y,along=dx*f.dx+dy*f.dy,lateral=dx*f.dy-dy*f.dx;return Math.abs(lateral)+radius<=f.width+.001 && along>=-f.half-radius-1.01 && along<=Math.hypot(f.last.x-f.first.x,f.last.y-f.first.y)+f.half+radius+1.01 && h>=f.first.bottom-.05 && h<=f.last.top+.05;});
 };
 const support=(p:Point,from:number,step=4)=>Math.max(room.floor,...contacts.filter(c=>c.top<=from+step+.05 && contactOverlaps(c,p.x,p.y,radius)).map(c=>c.top));
 return {room,contacts,radius,height,layers,flights,covers,support};
}
function data(scene:Scene,area:IndoorArea){let entries=cache.get(scene);if(!entries){entries=new Map();cache.set(scene,entries);}let value=entries.get(area.id);if(!value){value=prepare(scene,area);entries.set(area.id,value);}return value;}
export function indoorClear(scene:Scene,area:IndoorArea,p:WalkingPoint,state?:CarState,structural=false):boolean{
 const d=data(scene,area),floor=p.elevation??walkingHeight(scene,p.x,p.y);
 if(!d.covers(p) || Math.abs(d.support(p,floor,0)-floor)>.1)return false;
 return !(structural ? d.contacts : queryStaticContacts(scene,p.x,p.y,d.radius,state)).some(c=>(!state || !isBroken(state,c)) && c.top>floor+.05 && c.bottom<floor+d.height-.05 && contactOverlaps(c,p.x,p.y,d.radius));
}
export function indoorSupport(scene:Scene,area:IndoorArea,p:Point,from:number){return data(scene,area).support(p,from);}
/** Every sampled cylinder stays on a declared slab or the validated stair caps. */
export function indoorSegment(scene:Scene,area:IndoorArea,a:WalkingPoint,b:WalkingPoint,state?:CarState,structural=false):boolean{
 const d=data(scene,area),ah=a.elevation??walkingHeight(scene,a.x,a.y),bh=b.elevation??walkingHeight(scene,b.x,b.y),n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));let previous=ah;
 if(!indoorClear(scene,area,{...a,elevation:ah},state,structural))return false;
 for(let i=1;i<=n;i++){const t=i/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},expected=ah+(bh-ah)*t,floor=d.support(p,previous);
  if(Math.abs(floor-previous)>4.05 || Math.abs(floor-expected)>4.05 || !indoorClear(scene,area,{...p,elevation:floor},state,structural))return false;previous=floor;
 }
 return Math.abs(previous-bh)<.15;
}
export function indoorOwner(scene:Scene,areas:IndoorArea[],p:WalkingPoint):IndoorArea|undefined{
 if(p.elevation===undefined || p.elevation<=walkingHeight(scene,p.x,p.y)+.05)return;
 return areas.find(a=>data(scene,a).room.contains(p.x,p.y));
}
export function indoorEntries(scene:Scene,area:IndoorArea):WalkingPoint[]{const d=data(scene,area);return d.flights.filter(f=>Math.abs(f.first.bottom-d.room.floor)<.1).map(f=>f.points[0]!);}
export function buildIndoorNetwork(scene:Scene,area:IndoorArea):WorkNode[]{
 const d=data(scene,area),nodes:WorkNode[]=[];
 const add=(p:WalkingPoint)=>{if(!indoorClear(scene,area,p,undefined,true))return;if(nodes.some(n=>Math.hypot(n.x-p.x,n.y-p.y,(n.elevation??0)-(p.elevation??0))<.1))return;if(nodes.length>=FLOOR_LIMITS.nodes)throw Error('Indoor route exceeds 1024 nodes');nodes.push({...p,links:[]});};
 for(const f of d.layers){const b=polygonBounds(f.points),nx=Math.max(1,Math.ceil((b.x1-b.x0)/12)),ny=Math.max(1,Math.ceil((b.y1-b.y0)/12));if(nx*ny>4096)throw Error('Indoor floor exceeds 4096 samples');for(let x=0;x<nx;x++)for(let y=0;y<ny;y++)add({x:b.x0+d.radius+(b.x1-b.x0-2*d.radius)*x/Math.max(1,nx-1),y:b.y0+d.radius+(b.y1-b.y0-2*d.radius)*y/Math.max(1,ny-1),elevation:f.elevation});}
 for(const f of d.flights)f.points.forEach(add);
 const indexed=nodes.map((p,i)=>({...p,i})),grid=new SpatialGrid(indexed,24);let links=0;
 for(let i=0;i<nodes.length;i++)for(const q of grid.query(nodes[i]!.x,nodes[i]!.y,24))if(q.i>i && Math.hypot(q.x-nodes[i]!.x,q.y-nodes[i]!.y)<=24 && indoorSegment(scene,area,nodes[i]!,q,undefined,true) && indoorSegment(scene,area,q,nodes[i]!,undefined,true)){if((links+=2)>32768)throw Error('Indoor route exceeds 32768 links');nodes[i]!.links.push(q.i);nodes[q.i]!.links.push(i);}
 return nodes;
}
export function indoorPath(scene:Scene,area:IndoorArea,nodes:WorkNode[],a:WalkingPoint,b:WalkingPoint,state?:CarState):WalkingPoint[]|undefined{
 if(indoorSegment(scene,area,a,b,state))return [{...b}];
 const near=(p:WalkingPoint)=>nodes.map((n,i)=>({i,d:Math.hypot(n.x-p.x,n.y-p.y,(n.elevation??0)-(p.elevation??0))})).filter(n=>n.d<=32).sort((a,b)=>a.d-b.d || a.i-b.i).filter(n=>indoorSegment(scene,area,p,nodes[n.i]!,state));
 const starts=near(a),ends=new Set(near(b).map(n=>n.i)),previous=new Int32Array(nodes.length).fill(-2),queue:number[]=[];for(const n of starts){previous[n.i]=-1;queue.push(n.i);}
 for(let at=0;at<queue.length;at++){const i=queue[at]!;if(ends.has(i)){const path:WalkingPoint[]=[{...b}];for(let k=i;k>=0;k=previous[k]!)path.push({x:nodes[k]!.x,y:nodes[k]!.y,elevation:nodes[k]!.elevation});path.reverse();return path.length<=128 ? path : undefined;}for(const j of nodes[i]!.links)if(previous[j]===-2 && indoorSegment(scene,area,nodes[i]!,nodes[j]!,state)){previous[j]=i;queue.push(j);}}
}
