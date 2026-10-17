import type {Scene,Point,SceneObject} from './schema';
import {walkingNetwork} from './sites';
import {streetFootprints,onPolygon} from './streets';
import {partition,polygonArea,polygonBounds,distanceToPolygon} from './polygons';
import {sceneContacts} from './contacts';
import {drivingHeight,waterAt} from './terrain';
import {assemblyHorizontalRadius} from './measure';
import type {ObjectDslV2} from './object-dsl';
import {bridgePolygon} from './landscape-dsl';
import {roadFootprint,distanceToRoad} from './road';
import {AMBIENT_LIMITS} from './ambient';

export interface WalkNode extends Point {links:number[]}
export interface AmbientGraph {sourceHash:string;nodes:WalkNode[];starts:Map<string,number>}
const cache=new WeakMap<Scene,ReturnType<typeof buildNavigation>>();
export function ambientNavigation(scene:Scene){let value=cache.get(scene);if(!value){value=buildNavigation(scene);cache.set(scene,value);}return value;}
/** Only the accepted world's worker supplies this cache, never Dream or saved state. */
export function ambientGraph(scene:Scene):AmbientGraph{const {nodes,starts}=ambientNavigation(scene);return {sourceHash:scene.sourceHash,nodes,starts};}
export function primeAmbientNavigation(scene:Scene,graph:AmbientGraph):void{
 const walkers=scene.objects.filter(o=>o.ambient?.motion.kind==='walk');
 const invalid=()=>{throw Error('Invalid prepared pedestrian graph');};
 if(!graph || graph.sourceHash!==scene.sourceHash || !Array.isArray(graph.nodes) || graph.nodes.length>AMBIENT_LIMITS.graphNodes || !(graph.starts instanceof Map) || graph.starts.size!==walkers.length)invalid();
 const {nodes,starts}=graph;
 let edges=0;
 for(const [i,node] of nodes.entries()){
  if(!node || !Number.isFinite(node.x) || !Number.isFinite(node.y) || node.x<0 || node.y<0 || node.x>scene.canonical.width || node.y>scene.canonical.height || !Array.isArray(node.links) || node.links.length>nodes.length || new Set(node.links).size!==node.links.length)invalid();
  edges+=node.links.length;
  if(node.links.some(j=>!Number.isInteger(j) || j<0 || j>=nodes.length || j===i))invalid();
 }
 if(edges>AMBIENT_LIMITS.graphNodes*4 || nodes.some((node,i)=>node.links.some(j=>!nodes[j]!.links.includes(i))) || walkers.some(o=>!Number.isInteger(starts.get(o.id)) || !nodes[starts.get(o.id)!]?.links.length))invalid();
 cache.set(scene,buildNavigation(scene,graph));
}
const radius=(o:SceneObject)=>assemblyHorizontalRadius(o.spec as ObjectDslV2,o.scale);
/** Sparse polygon portals reuse accepted pavement. No raster of the whole world or runtime path search. */
function buildNavigation(scene:Scene,prepared?:AmbientGraph){
 const members=scene.objects.filter(o=>!!o.ambient),walkers=members.filter(o=>o.ambient!.motion.kind==='walk');
 const r=Math.max(3,...walkers.map(radius)),contacts=sceneContacts(scene),polygons=walkers.length ? walkingNetwork(scene).polygons : [];
 const bins=new Map<string,number[]>(),bounds=polygons.map(polygonBounds);
 for(const [i,b] of bounds.entries())for(let y=Math.floor(b.y0/256);y<=Math.floor(b.y1/256);y++)for(let x=Math.floor(b.x0/256);x<=Math.floor(b.x1/256);x++){const key=x+','+y,cell=bins.get(key)??[];cell.push(i);bins.set(key,cell);}
 const paved=(x:number,y:number)=>bins.get(Math.floor(x/256)+','+Math.floor(y/256))?.some(i=>onPolygon(polygons[i]!,x,y,.01))??false;
 const blocked=[...streetFootprints(scene).reserved,...roadFootprint(scene),...scene.surfaces.map(s=>s.points),...(scene.terrain.landscape?.bridges??[]).map(bridgePolygon)];
 const blockedBins=new Map<string,number[]>(),margin=Math.max(0,...members.map(radius))+2;
 const waters=(scene.terrain.landscape?.waters??[]).map(w=>polygonBounds(w.polygon));
 for(const [i,p] of blocked.entries()){const b=polygonBounds(p);for(let y=Math.floor((b.y0-margin)/256);y<=Math.floor((b.y1+margin)/256);y++)for(let x=Math.floor((b.x0-margin)/256);x<=Math.floor((b.x1+margin)/256);x++){const key=x+','+y,cell=blockedBins.get(key)??[];cell.push(i);blockedBins.set(key,cell);}}
 const clear=(x:number,y:number,rr:number,walk:boolean)=>{
  if(x<rr || y<rr || x>scene.canonical.width-rr || y>scene.canonical.height-rr)return false;
  const floor=drivingHeight(scene.terrain,x,y);
  if(contacts.solids.query(x,y,rr+contacts.maxRadius).some(c=>Math.hypot(c.x-x,c.y-y)<c.r+rr && c.top>floor+.1 && c.bottom<floor+22))return false;
  const nearWater=waters.some(b=>x+rr>=b.x0 && x-rr<=b.x1 && y+rr>=b.y0 && y-rr<=b.y1);
  if(walk || nearWater)for(let i=0;i<9;i++){const px=x+(i ? Math.cos(i*Math.PI/4)*rr : 0),py=y+(i ? Math.sin(i*Math.PI/4)*rr : 0);if(nearWater && waterAt(scene.terrain,px,py,drivingHeight(scene.terrain,px,py)) || walk && !paved(px,py))return false;}
  return walk || !(blockedBins.get(Math.floor(x/256)+','+Math.floor(y/256))??[]).some(i=>onPolygon(blocked[i]!,x,y) || distanceToPolygon(x,y,blocked[i]!)<rr+2);
 };
 // Check every pavement boundary, so short gaps at an oblique portal cannot fall between samples.
 const pavedSegment=(a:Point,b:Point,rr:number)=>{
  const candidates=new Set<number>();
  for(let y=Math.floor((Math.min(a.y,b.y)-rr)/256);y<=Math.floor((Math.max(a.y,b.y)+rr)/256);y++)for(let x=Math.floor((Math.min(a.x,b.x)-rr)/256);x<=Math.floor((Math.max(a.x,b.x)+rr)/256);x++)for(const i of bins.get(x+','+y)??[])candidates.add(i);
  const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;if(d2<1e-10)return true;
  for(let sample=0;sample<9;sample++){
   const x=a.x+(sample ? Math.cos(sample*Math.PI/4)*rr : 0),y=a.y+(sample ? Math.sin(sample*Math.PI/4)*rr : 0),cuts=[0,1];
   for(const i of candidates){const polygon=polygons[i]!;
    for(let j=0;j<polygon.length;j++){const u=polygon[j]!,v=polygon[(j+1)%polygon.length]!,ex=v.x-u.x,ey=v.y-u.y,px=u.x-x,py=u.y-y,den=dx*ey-dy*ex;
     if(Math.abs(den)>1e-9){const t=(px*ey-py*ex)/den,s=(px*dy-py*dx)/den;if(t>0 && t<1 && s>=0 && s<=1)cuts.push(t);}
     else if(Math.abs(px*dy-py*dx)<1e-7)for(const p of [u,v]){const t=((p.x-x)*dx+(p.y-y)*dy)/d2;if(t>0 && t<1)cuts.push(t);}
    }
   }
   cuts.sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++){const t=(cuts[i-1]!+cuts[i]!)/2;if(cuts[i]!-cuts[i-1]!>1e-8 && !paved(x+dx*t,y+dy*t))return false;}
  }return true;
 };
 const segment=(a:Point,b:Point,rr:number,walk:boolean)=>{
  const length=Math.hypot(b.x-a.x,b.y-a.y);
  if(walk && !pavedSegment(a,b,rr))return false;
  for(const c of contacts.solids.query((a.x+b.x)/2,(a.y+b.y)/2,length/2+rr+contacts.maxRadius))if(distanceToRoad([a,b],c.x,c.y)<rr+c.r){
   const t=length ? Math.max(0,Math.min(1,((c.x-a.x)*(b.x-a.x)+(c.y-a.y)*(b.y-a.y))/(length*length))) : 0,floor=drivingHeight(scene.terrain,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
   if(c.top>floor+.1 && c.bottom<floor+22)return false;
  }
  const n=Math.max(1,Math.ceil(length/8));for(let i=0;i<=n;i++)if(!clear(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,rr,walk))return false;return true;
 };
 if(prepared)return {...prepared,radius,clear,segment};
 const nodes:WalkNode[]=[],centers:number[]=[];
 const add=(p:Point)=>{if(nodes.length>=AMBIENT_LIMITS.graphNodes)throw Error('pedestrian portal graph exceeds 8192 nodes');nodes.push({...p,links:[]});return nodes.length-1;};
 const connect=(i:number,j:number)=>{if(i!==j && segment(nodes[i]!,nodes[j]!,r,true)){nodes[i]!.links.push(j);nodes[j]!.links.push(i);}};
 for(const p of polygons){const center={x:p.reduce((n,q)=>n+q.x,0)/p.length,y:p.reduce((n,q)=>n+q.y,0)/p.length};centers.push(clear(center.x,center.y,r,true) ? add(center) : -1);}
 const shared=(a:Point[],b:Point[]):Point|undefined=>{
  const overlap=partition(a,b).inside;
  if(polygonArea(overlap)>.01)return {x:overlap.reduce((n,p)=>n+p.x,0)/overlap.length,y:overlap.reduce((n,p)=>n+p.y,0)/overlap.length};
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
   const p=a[i]!,q=a[(i+1)%a.length]!,u=b[j]!,v=b[(j+1)%b.length]!,dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);
   if(d<2*r || Math.abs(dx*(u.y-p.y)-dy*(u.x-p.x))/d>.01 || Math.abs(dx*(v.y-p.y)-dy*(v.x-p.x))/d>.01)continue;
   const t=(k:Point)=>((k.x-p.x)*dx+(k.y-p.y)*dy)/d,low=Math.max(0,Math.min(t(u),t(v))),high=Math.min(d,Math.max(t(u),t(v)));
   if(high-low>=2*r+.1)return {x:p.x+dx*(low+high)/2/d,y:p.y+dy*(low+high)/2/d};
  }
 };
 const pairs=new Set<string>();
 for(const cell of bins.values())for(const i of cell)for(const j of cell){if(i<=j || centers[i]===-1 || centers[j]===-1)continue;const key=i+':'+j;if(pairs.has(key))continue;pairs.add(key);const a=bounds[i]!,b=bounds[j]!;if(a.x1+.01<b.x0 || a.x0-.01>b.x1 || a.y1+.01<b.y0 || a.y0-.01>b.y1)continue;const portal=shared(polygons[i]!,polygons[j]!);if(portal && clear(portal.x,portal.y,r,true)){const k=add(portal);connect(centers[i]!,k);connect(k,centers[j]!);}}
 const starts=new Map<string,number>();
 for(const object of walkers){const choices=nodes.map((p,i)=>({i,d:Math.hypot(p.x-object.x,p.y-object.y)})).filter(p=>nodes[p.i]!.links.length).sort((a,b)=>a.d-b.d);const start=choices.slice(0,32).find(p=>segment(object,nodes[p.i]!,radius(object),true));if(start)starts.set(object.id,start.i);}
 return {nodes,starts,radius,clear,segment};
}
export function ambientProblems(scene:Scene):string[]{
 if(!scene.objects.some(o=>o.ambient))return [];
 const nav=ambientNavigation(scene),issues:string[]=[];
 for(const o of scene.objects.filter(o=>o.ambient)){
  const walk=o.ambient!.motion.kind==='walk',r=nav.radius(o);
  if(!nav.clear(o.x,o.y,r,walk) || walk && !nav.starts.has(o.id))issues.push(`ambient "${o.id}" needs a dry, clear ${walk ? 'connected sidewalk path' : 'habitat outside roads and grounds'}`);
 }
 return issues;
}
