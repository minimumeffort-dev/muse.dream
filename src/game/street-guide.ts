import type {Point,Scene} from '../scene/schema';

type Edge={a:number;b:number;width:number;length:number};
type Graph={points:Point[];edges:Edge[];links:{to:number;cost:number}[][]};
const cache=new WeakMap<Scene,Graph|null>(),distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x,sub=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y});
const project=(a:Point,b:Point,p:Point)=>Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/((b.x-a.x)**2+(b.y-a.y)**2)));
const along=(a:Point,b:Point,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});

/** Derived UI topology only. No invented links across gaps, railways or off-road terrain. */
function graph(scene:Scene):Graph|null{
 if(cache.has(scene))return cache.get(scene)!;
 const segments=scene.streets.flatMap(s=>s.points.slice(1).map((b,i)=>({a:s.points[i]!,b,width:s.width,cuts:[0,1]})));
 const points:Point[]=[],edges:Edge[]=[],keys=new Map<string,number>();
 const node=(p:Point)=>{const key=p.x.toFixed(6)+','+p.y.toFixed(6),known=keys.get(key);if(known!==undefined)return known;keys.set(key,points.length);points.push(p);return points.length-1;};
 for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const a=segments[i]!,b=segments[j]!,r=sub(a.b,a.a),s=sub(b.b,b.a),delta=sub(b.a,a.a),den=cross(r,s);
  if(Math.abs(den)>1e-8){
   const t=cross(delta,s)/den,u=cross(delta,r)/den;
   if(t>=-1e-8 && t<=1+1e-8 && u>=-1e-8 && u<=1+1e-8){a.cuts.push(Math.max(0,Math.min(1,t)));b.cuts.push(Math.max(0,Math.min(1,u)));}
  }else if(Math.abs(cross(delta,r))<1e-6){
   // Collinear overlaps share their endpoints rather than producing parallel duplicate links.
   for(const [line,other] of [[a,b],[b,a]] as const)for(const p of [other.a,other.b]){const t=project(line.a,line.b,p);if(distance(along(line.a,line.b,t),p)<1e-6)line.cuts.push(t);}
  }
 }
 for(const segment of segments){
  const cuts=[...new Set(segment.cuts.map(t=>Math.round(t*1e10)/1e10))].sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){
   const a=node(along(segment.a,segment.b,cuts[i-1]!)),b=node(along(segment.a,segment.b,cuts[i]!)),length=distance(points[a]!,points[b]!);
   if(length>.001)edges.push({a,b,width:segment.width,length});
   if(points.length>2048 || edges.length>8192){cache.set(scene,null);return null;}
  }
 }
 const links=points.map(()=>[] as Graph['links'][number]);for(const edge of edges){links[edge.a]!.push({to:edge.b,cost:edge.length});links[edge.b]!.push({to:edge.a,cost:edge.length});}
 const result=edges.length ? {points,edges,links} : null;cache.set(scene,result);return result;
}
type Snap={point:Point;edge:Edge;t:number;distance:number};
function nearest(g:Graph,p:Point):Snap{
 let best:Snap|undefined;
 for(const edge of g.edges){const t=project(g.points[edge.a]!,g.points[edge.b]!,p),point=along(g.points[edge.a]!,g.points[edge.b]!,t),d=distance(p,point);if(!best || d<best.distance-1e-6)best={point,edge,t,distance:d};}
 return best!;
}
type Destination={x:number;y:number;snap:Snap;cost:Float64Array;next:Int32Array};
const destinations=new WeakMap<Scene,Destination>();

/** One reverse shortest-path search per destination, reused while the player moves. */
function destination(scene:Scene,g:Graph,to:Point):Destination{
 const old=destinations.get(scene);if(old?.x===to.x && old.y===to.y)return old;
 const snap=nearest(g,to),cost=new Float64Array(g.points.length).fill(Infinity),next=new Int32Array(g.points.length).fill(-1),closed=new Uint8Array(g.points.length);
 cost[snap.edge.a]=snap.t*snap.edge.length;cost[snap.edge.b]=(1-snap.t)*snap.edge.length;
 for(let step=0;step<g.points.length;step++){
  let i=-1;for(let n=0;n<cost.length;n++)if(!closed[n] && Number.isFinite(cost[n]) && (i<0 || cost[n]!<cost[i]!))i=n;
  if(i<0)break;closed[i]=1;
  for(const link of g.links[i]!)if(cost[i]!+link.cost<cost[link.to]!-1e-6){cost[link.to]=cost[i]!+link.cost;next[link.to]=i;}
 }
 const result={x:to.x,y:to.y,snap,cost,next};destinations.set(scene,result);return result;
}

export function streetGuide(scene:Scene,from:Point,to:Point):{points:Point[];aim:Point;distance:number}|undefined{
 const g=graph(scene);if(!g)return;
 const start=nearest(g,from),end=destination(scene,g,to);
 // Off-road connectors are bearings, not certified drivable paths.
 if(start.distance>start.edge.width/2+12 || end.snap.distance>256)return;
 const a=start.t*start.edge.length+end.cost[start.edge.a]!,b=(1-start.t)*start.edge.length+end.cost[start.edge.b]!;
 const direct=start.edge===end.snap.edge ? Math.abs(start.t-end.snap.t)*start.edge.length : Infinity;
 let street:Point[];
 if(Number.isFinite(direct) && direct<=Math.min(a,b))street=[start.point,end.snap.point];
 else{
  let node=a<=b ? start.edge.a : start.edge.b;if(!Number.isFinite(end.cost[node]))return;
  street=[start.point];for(let count=0;node>=0 && count<=g.points.length;count++){street.push(g.points[node]!);node=end.next[node]!;}street.push(end.snap.point);
 }
 let remaining=80,aim=end.snap.point;
 for(let i=1;i<street.length;i++){const length=distance(street[i-1]!,street[i]!);if(length>=remaining){aim=along(street[i-1]!,street[i]!,remaining/length);break;}remaining-=length;}
 if(distance(from,end.snap.point)<25)aim=to;
 const points=[from,...street,to].map(p=>({x:p.x,y:p.y})),total=points.slice(1).reduce((n,p,i)=>n+distance(points[i]!,p),0);
 return {points,aim:{x:aim.x,y:aim.y},distance:total};
}
