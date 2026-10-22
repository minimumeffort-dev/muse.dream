import {walkingHeight,workGround} from '../scene/interiors';
import {contactOverlaps,segmentContactDistance} from '../scene/contact-geometry';
import type {Scene,Point} from '../scene/schema';
import type {CarState} from './car';
import {COMMERCE_LIMITS} from '../scene/commerce';
import {queryStaticContacts,sceneContacts,type Contact} from '../scene/contacts';
import {onPolygon,streetFootprints} from '../scene/streets';
import {polygonBounds,distanceToPolygon} from '../scene/polygons';
import {drivingHeight,waterAt} from '../scene/terrain';
import {distanceToRoad,roadPoints} from '../scene/road';
import {SpatialGrid} from './spatial';
import {isBroken} from './impacts';
import {actorContacts} from './actors';
import {ambientNavigation} from '../scene/ambient-navigation';
import {walkingNetwork} from '../scene/sites';
import {pavementSurface,pavementPortal,pavementInsetPoint} from '../scene/pavement';
const REPAIR_RADIUS=COMMERCE_LIMITS.repairRadius;

/** Engine-owned work coverage; IDs are host cache keys, not source or saved graph data. */
export interface WalkingArea {id:string;grounds:string[];access:Point[][];network:boolean;radius?:number;height?:number;wideAccess?:boolean}
const cache=new WeakMap<Scene,Map<string,ReturnType<typeof area>>>();
function area(scene:Scene,r:WalkingArea){
 const radius=r.radius??REPAIR_RADIUS;
 let offset=0;
 const patches=r.grounds.map(id=>{const polygon=workGround(scene,id)!.points,b=polygonBounds(polygon),nx=Math.ceil((b.x1-b.x0)/12)+1,ny=Math.ceil((b.y1-b.y0)/12)+1,start=offset;offset+=nx*ny;return {polygon,b,nx,ny,start};});
 const point=(i:number):Point=>{const p=patches.find(p=>i>=p.start && i<p.start+p.nx*p.ny)!,n=i-p.start;
  // Fit explicit body profiles inside narrow paths instead of missing their only clear row.
  const coordinate=(low:number,high:number,k:number,count:number)=>{const inset=Math.min(radius,(high-low)/2);return low+inset+k/Math.max(1,count-1)*(high-low-2*inset);};
  return r.radius===undefined ? {x:p.b.x0+n%p.nx*12,y:p.b.y0+Math.floor(n/p.nx)*12} : {x:coordinate(p.b.x0,p.b.x1,n%p.nx,p.nx),y:coordinate(p.b.y0,p.b.y1,Math.floor(n/p.nx),p.ny)};
 };
 const {polygon,b,nx,ny}=patches[0]!,road=roadPoints(scene);
 const nearby=(points:Point[])=>{const q=polygonBounds(points);return q.x1+240>=b.x0 && q.x0-240<=b.x1 && q.y1+240>=b.y0 && q.y0-240<=b.y1;};
 const roads=road.slice(1).map((p,i)=>[road[i]!,p]).filter(nearby),riding=streetFootprints(scene).riding.filter(nearby),waters=(scene.terrain.landscape?.waters??[]).map(w=>w.polygon).filter(nearby);
 const access=r.access,surface=r.network ? pavementSurface([...walkingNetwork(scene).polygons,...patches.map(p=>p.polygon),...access]) : undefined;
 const waterBounds=(scene.terrain.landscape?.waters??[]).map(w=>polygonBounds(w.polygon));
 const dry=(p:Point)=>!waterBounds.some(b=>p.x+radius>=b.x0 && p.x-radius<=b.x1 && p.y+radius>=b.y0 && p.y-radius<=b.y1) || Array.from({length:9},(_,i)=>({x:p.x+(i ? Math.cos(i*Math.PI/4)*radius : 0),y:p.y+(i ? Math.sin(i*Math.PI/4)*radius : 0)})).every(p=>!waterAt(scene.terrain,p.x,p.y,drivingHeight(scene.terrain,p.x,p.y)));
 const allowed=(p:Point)=>surface ? dry(p) && Array.from({length:9},(_,i)=>({x:p.x+(i ? Math.cos(i*Math.PI/4)*radius : 0),y:p.y+(i ? Math.sin(i*Math.PI/4)*radius : 0)})).every(p=>surface.paved(p.x,p.y)) : onPolygon(polygon,p.x,p.y) && distanceToPolygon(p.x,p.y,polygon)>=radius && !riding.some(q=>onPolygon(q,p.x,p.y) || distanceToPolygon(p.x,p.y,q)<radius) && !roads.some(q=>distanceToRoad(q,p.x,p.y)<scene.roadMaskRef.params.roadWidth/2+radius) && !waters.some(q=>onPolygon(q,p.x,p.y) || distanceToPolygon(p.x,p.y,q)<radius);
 return {nx,ny,point,allowed,patches,access,surface,dry,nodes:Array.from({length:Math.min(offset,COMMERCE_LIMITS.repairNodes)},(_,i)=>allowed(point(i)))};
}
function grid(scene:Scene,r:WalkingArea){let entries=cache.get(scene);if(!entries){entries=new Map();cache.set(scene,entries);}let value=entries.get(r.id);if(!value){value=area(scene,r);entries.set(r.id,value);}return value;}
export function workClear(scene:Scene,r:WalkingArea,p:Point,state?:CarState):boolean{
 const floor=walkingHeight(scene,p.x,p.y),radius=r.radius??REPAIR_RADIUS,height=r.height??18;
 return grid(scene,r).allowed(p) && !queryStaticContacts(scene,p.x,p.y,radius,state).some(c=>!(state && isBroken(state,c)) && contactOverlaps(c,p.x,p.y,radius) && c.top>floor && c.bottom<floor+height);
}
export function workSegment(scene:Scene,r:WalkingArea,a:Point,b:Point,state:CarState|undefined,areaOnly=false):boolean{
 const g=grid(scene,r),radius=r.radius??REPAIR_RADIUS;
 if(g.surface){
  if(!g.allowed(a) || !g.allowed(b) || !g.surface.segment(a,b,radius))return false;
  const length=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(length/8));
  for(let i=0;i<=n;i++)if(!g.dry({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;
  if(areaOnly)return true;
  return segmentClear(scene,a,b,state,[],radius,r.height??18);

 }
 const length=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(length/2));
 for(let i=0;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if(areaOnly ? !grid(scene,r).allowed(p) : !workClear(scene,r,p,state))return false;}return true;
}
/** Graph edges already have immutable pavement/water support; contacts remain live. */
function segmentClear(scene:Scene,a:Point,b:Point,state?:CarState,live:Contact[]=[],radius:number=REPAIR_RADIUS,height=18):boolean{
 const length=Math.hypot(b.x-a.x,b.y-a.y),x0=Math.min(a.x,b.x)-radius,x1=Math.max(a.x,b.x)+radius,y0=Math.min(a.y,b.y)-radius,y1=Math.max(a.y,b.y)+radius;
 return ![...queryStaticContacts(scene,(a.x+b.x)/2,(a.y+b.y)/2,length/2+radius,state),...live].some(c=>{
   if(state && isBroken(state,c))return false;
   // A conservative box envelope avoids exact corner tests for distant grid-cell contacts.
   const reach=(c.box ? c.box.halfX+c.box.halfY : c.r)+1e-6;
   if(c.x+reach<x0 || c.x-reach>x1 || c.y+reach<y0 || c.y-reach>y1 || segmentContactDistance(c,a,b)>=radius)return false;
   const t=length ? Math.max(0,Math.min(1,((c.x-a.x)*(b.x-a.x)+(c.y-a.y)*(b.y-a.y))/(length*length))) : 0,floor=walkingHeight(scene,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
   return c.top>floor && c.bottom<floor+height;
  });
}
/** Bounded work-yard or public-pavement path; never a world raster or street shortcut. */
export function workPath(scene:Scene,r:WalkingArea,start:Point,end:Point,state?:CarState):Point[]|undefined{
 if(r.network)return networkPath(scene,r,start,end,state);
 const destination={x:end.x,y:end.y};
 if(workSegment(scene,r,start,end,state))return [destination];
 const g=grid(scene,r),near=(p:Point)=>g.nodes.map((valid,i)=>({valid,i,d:Math.hypot(g.point(i).x-p.x,g.point(i).y-p.y)})).filter(v=>v.valid && v.d<=24).sort((a,b)=>a.d-b.d || a.i-b.i).filter(v=>workSegment(scene,r,p,g.point(v.i),state)).map(v=>v.i);
 const starts=near(start),ends=new Set(near(end)),previous=new Int32Array(g.nodes.length).fill(-2),queue:number[]=[];
 for(const i of starts){previous[i]=-1;queue.push(i);}
 for(let cursor=0;cursor<queue.length;cursor++){
  const i=queue[cursor]!;
  if(ends.has(i)){const path:Point[]=[destination];for(let at=i;at>=0;at=previous[at]!)path.push(g.point(at));path.reverse();return path.length<=COMMERCE_LIMITS.repairPath ? path : undefined;}
  for(const j of [i-1,i+1,i-g.nx,i+g.nx])if(j>=0 && j<g.nodes.length && previous[j]===-2 && g.nodes[j] && Math.abs(j%g.nx-i%g.nx)+Math.abs(Math.floor(j/g.nx)-Math.floor(i/g.nx))===1 && workSegment(scene,r,g.point(i),g.point(j),state)){previous[j]=i;queue.push(j);}
 }return;
}
export type WorkNode=Point & {links:number[]};
const endpointIndices=new WeakMap<WorkNode[],{points:{x:number;y:number;i:number}[];grid:SpatialGrid<{x:number;y:number;i:number}>}>();
/** Graph geometry is immutable after construction/priming; dynamic clearance is never cached. */
export function nearestWorkNodes(nodes:WorkNode[],p:Point):{i:number;d:number}[]{
 let index=endpointIndices.get(nodes);
 if(!index){const points=nodes.flatMap((n,i)=>n.links.length ? [{x:n.x,y:n.y,i}] : []);index={points,grid:new SpatialGrid(points,128)};endpointIndices.set(nodes,index);}
 const rank=(points:typeof index.points)=>points.map(n=>({i:n.i,d:Math.hypot(n.x-p.x,n.y-p.y)})).sort((a,b)=>a.d-b.d || a.i-b.i);
 if(index.points.length<=32)return rank(index.points);
 for(let radius=64;;radius*=2){
  // Sparse or far-away probes must not scan more empty cells than a full node query.
  if((Math.ceil(radius/64)+2)**2>index.points.length*2)return rank(index.points).slice(0,32);
  const nearest=rank(index.grid.query(p.x,p.y,radius)).filter(n=>n.d<=radius);
  if(nearest.length>=32)return nearest.slice(0,32);
 }
}
const networks=new WeakMap<Scene,Map<string,WorkNode[]>>();
/** Reuse the city's sparse pedestrian graph; local grids only cover declared work grounds. */
export function workNetwork(scene:Scene,r:WalkingArea){
 let entries=networks.get(scene);if(!entries){entries=new Map();networks.set(scene,entries);}const existing=entries.get(r.id);if(existing)return existing;
 const radius=r.radius??REPAIR_RADIUS,g=grid(scene,r),publicNodes=ambientNavigation(scene).nodes,nodes:WorkNode[]=publicNodes.map(n=>({x:n.x,y:n.y,links:[...n.links]})),local=new Int32Array(g.nodes.length).fill(-1);
 if(r.radius!==undefined)for(let i=0;i<publicNodes.length;i++)nodes[i]!.links=nodes[i]!.links.filter(j=>j<i ? nodes[j]!.links.includes(i) : workSegment(scene,r,nodes[i]!,nodes[j]!,undefined,true));
 const add=(p:Point)=>{if(nodes.length>=COMMERCE_LIMITS.repairNetworkNodes)throw Error(`${r.id}: repair network exceeds 8192 nodes`);nodes.push({x:p.x,y:p.y,links:[]});return nodes.length-1;};
 const connect=(a:number,b:number)=>{if(a!==b && workSegment(scene,r,nodes[a]!,nodes[b]!,undefined,true)){if(!nodes[a]!.links.includes(b))nodes[a]!.links.push(b);if(!nodes[b]!.links.includes(a))nodes[b]!.links.push(a);return true;}return false;};
 for(let i=0;i<g.nodes.length;i++)if(g.nodes[i])local[i]=add(g.point(i));
 for(const patch of g.patches)for(let j=0;j<patch.nx*patch.ny;j++){const i=patch.start+j;if(local[i]!<0)continue;for(const k of [j+1,j+patch.nx])if(k<patch.nx*patch.ny && (k===j+patch.nx || k%patch.nx!==0) && local[patch.start+k]!>=0)connect(local[i]!,local[patch.start+k]!);}
 const connectLocal=(i:number,p:Point)=>{for(let j=0;j<g.nodes.length;j++)if(local[j]!>=0 && Math.hypot(g.point(j).x-p.x,g.point(j).y-p.y)<=24)connect(i,local[j]!);};
 for(let a=0;a<g.patches.length;a++)for(let b=a+1;b<g.patches.length;b++){
  const p=pavementPortal(g.patches[a]!.polygon,g.patches[b]!.polygon,radius);if(p && g.allowed(p))connectLocal(add(p),p);
 }
 // The worker's four-unit cylinder can use safe links omitted for wider cosmetic rigs.
 const components=new Int32Array(publicNodes.length).fill(-1);let component=0;
 for(let i=0;i<publicNodes.length;i++)if(components[i]===-1){const queue=[i];components[i]=component;for(let at=0;at<queue.length;at++)for(const j of publicNodes[queue[at]!]!.links)if(components[j]===-1){components[j]=component;queue.push(j);}component++;}
 const publicGrid=new SpatialGrid(publicNodes.map((n,i)=>({x:n.x,y:n.y,i})),128);
 for(let i=0;i<publicNodes.length;i++){const n=publicNodes[i]!;let count=0;for(const p of publicGrid.query(n.x,n.y,128).filter(p=>p.i>i && components[p.i]!==components[i] && Math.hypot(p.x-n.x,p.y-n.y)<=128).sort((a,b)=>Math.hypot(a.x-n.x,a.y-n.y)-Math.hypot(b.x-n.x,b.y-n.y) || a.i-b.i).slice(0,32))if(connect(i,p.i) && ++count===4)break;}
 const pavement=walkingNetwork(scene).polygons.map(polygon=>({polygon,b:polygonBounds(polygon)}));
 for(const patch of [...g.patches.map(p=>({...p,verge:false})),...g.access.map(polygon=>({polygon,b:polygonBounds(polygon),verge:true}))])for(const {polygon,b} of pavement){if(b.x1<patch.b.x0 || b.x0>patch.b.x1 || b.y1<patch.b.y0 || b.y0>patch.b.y1)continue;
  const p=pavementPortal(patch.polygon,polygon,radius);if(!p || !g.allowed(p))continue;
  const i=add(p),inner=patch.verge ? pavementInsetPoint(polygon,p,radius) : undefined;let link=i;
  if(inner && Math.hypot(inner.x-p.x,inner.y-p.y)>.01){const j=add(inner);if(connect(i,j))link=j;}
  connectLocal(i,p);
  let linked=0;for(const {j} of publicNodes.map((n,j)=>({j,d:Math.hypot(n.x-p.x,n.y-p.y)})).filter(({j})=>publicNodes[j]!.links.length).sort((a,b)=>a.d-b.d || a.j-b.j).slice(0,32))if(connect(link,j) && ++linked===8)break;
 }
 // Wider service areas need supported corner turns omitted for larger cosmetic rigs.
 if(r.wideAccess){
  const roots=nodes.map((_,i)=>i),root=(i:number):number=>{while(roots[i]!==i){roots[i]=roots[roots[i]!]!;i=roots[i]!;}return i;};
  for(let i=0;i<nodes.length;i++)for(const j of nodes[i]!.links)roots[root(i)]=root(j);
  const positions=new Map(nodes.map((n,i)=>[`${n.x},${n.y}`,i]));
  for(let i=0;i<publicNodes.length;i++){
   const a=nodes[i]!;
   for(const {i:j} of publicGrid.query(a.x,a.y,128).filter(p=>p.i>i && Math.hypot(p.x-a.x,p.y-a.y)<=128).sort((p,q)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(q.x-a.x,q.y-a.y) || p.i-q.i).slice(0,32)){
    if(root(i)===root(j))continue;const b=nodes[j]!,near=new Set<number>();
    for(let y=Math.floor((Math.min(a.y,b.y)-radius)/256);y<=Math.floor((Math.max(a.y,b.y)+radius)/256);y++)for(let x=Math.floor((Math.min(a.x,b.x)-radius)/256);x<=Math.floor((Math.max(a.x,b.x)+radius)/256);x++)for(const k of g.surface!.bins.get(x+','+y)??[])if(k<pavement.length)near.add(k);
    let joined=false;
    for(const k of near){const polygon=pavement[k]!.polygon,center={x:polygon.reduce((n,p)=>n+p.x,0)/polygon.length,y:polygon.reduce((n,p)=>n+p.y,0)/polygon.length};
     for(const p of [center,pavementInsetPoint(polygon,a,radius),pavementInsetPoint(polygon,b,radius)]){
      if(!p || !workSegment(scene,r,a,p,undefined) || !workSegment(scene,r,p,b,undefined))continue;
      const key=`${p.x},${p.y}`;let n=positions.get(key);if(n===undefined){n=add(p);roots.push(n);positions.set(key,n);}
      connect(i,n);connect(n,j);roots[root(i)]=root(j);roots[root(n)]=root(j);joined=true;break;
     }
     if(joined)break;
    }
   }
  }
 }
 if(nodes.reduce((n,p)=>n+p.links.length,0)>COMMERCE_LIMITS.repairNetworkLinks)throw Error(`${r.id}: repair network exceeds 32768 links`);
 entries.set(r.id,nodes);return nodes;
}
function networkPath(scene:Scene,r:WalkingArea,start:Point,end:Point,state?:CarState):Point[]|undefined{
 const radius=r.radius??REPAIR_RADIUS,height=r.height??18,live=state ? actorContacts(scene,state.timeS,state).filter(c=>!c.id || !sceneContacts(scene).objects.get(c.id)?.route) : [],clear=(a:Point,b:Point)=>workSegment(scene,r,a,b,state,true) && segmentClear(scene,a,b,state,live,radius,height);
 if(clear(start,end))return [{x:end.x,y:end.y}];
 const nodes=workNetwork(scene,r),near=(p:Point)=>nearestWorkNodes(nodes,p).filter(v=>clear(p,nodes[v.i]!));
 const starts=near(start),ends=new Set(near(end).map(n=>n.i)),previous=new Int32Array(nodes.length).fill(-2),cost=new Float64Array(nodes.length).fill(Infinity),closed=new Uint8Array(nodes.length),heap:{i:number;f:number}[]=[];
 const less=(a:{i:number;f:number},b:{i:number;f:number})=>a.f<b.f || a.f===b.f && a.i<b.i;
 const push=(v:{i:number;f:number})=>{let i=heap.length;heap.push(v);while(i>0){const p=(i-1)>>1;if(!less(v,heap[p]!))break;heap[i]=heap[p]!;i=p;}heap[i]=v;};
 const pop=()=>{const result=heap[0]!,last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length && less(heap[c+1]!,heap[c]!))c++;if(!less(heap[c]!,last))break;heap[i]=heap[c]!;i=c;}heap[i]=last;}return result.i;};
 const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
 for(const n of starts){cost[n.i]=n.d;previous[n.i]=-1;push({i:n.i,f:n.d+distance(nodes[n.i]!,end)});}
 while(heap.length){const i=pop();if(closed[i])continue;closed[i]=1;
  if(ends.has(i)){const path:Point[]=[{x:end.x,y:end.y}];for(let at=i;at>=0;at=previous[at]!)path.push({x:nodes[at]!.x,y:nodes[at]!.y});path.reverse();
   const compact:Point[]=[];
   for(const p of path){if(compact.length && distance(compact.at(-1)!,p)<.001)continue;while(compact.length>1){const a=compact.at(-2)!,b=compact.at(-1)!,cross=(b.x-a.x)*(p.y-b.y)-(b.y-a.y)*(p.x-b.x),dot=(b.x-a.x)*(p.x-b.x)+(b.y-a.y)*(p.y-b.y);if(dot<0 || Math.abs(cross)>1e-5*(distance(a,b)+distance(b,p)))break;compact.pop();}compact.push(p);}
   return compact.length<=COMMERCE_LIMITS.repairPath ? compact : undefined;}
  for(const j of nodes[i]!.links){const next=cost[i]!+distance(nodes[i]!,nodes[j]!);if(!closed[j] && next<cost[j]! && segmentClear(scene,nodes[i]!,nodes[j]!,state,live,radius,height)){cost[j]=next;previous[j]=i;push({i:j,f:next+distance(nodes[j]!,end)});}}
 }return;
}

export function primeWorkNetworks(scene:Scene,prepared:Map<string,WorkNode[]>):void{networks.set(scene,prepared);}
