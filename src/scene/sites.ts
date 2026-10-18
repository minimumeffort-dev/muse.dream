import {sceneInteriors,walkingHeight} from './interiors';
import {contactTouchesPolygon} from './contact-geometry';
import {isActor} from './agents';
import {MAX_WORLD_SIZE} from './world-bounds';
import {z} from 'zod';
import type {Point,Scene} from './schema';
import {pointInPolygon} from '../sim/mask';
import {streetPolygons,streetSidewalks,streetCircuitCrossings,markingPolygons,onPolygon} from './streets';
import {distanceToPolygon,polygonBounds,unionPolygons,partition,polygonArea,subtractPolygons,intersectPolygons,triangulatePolygon} from './polygons';
import {sceneContacts} from './contacts';
import {assemblyBounds} from './measure';
import {drivingHeight,waterAt} from './terrain';
import {bridgePolygon,bridgeCoordinates,clipPolygon,polygonsOverlap} from './landscape-dsl';
import {routeInfrastructure} from './routes';

const ref=z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
const point=z.object({x:z.number().finite().min(0).max(MAX_WORLD_SIZE),y:z.number().finite().min(0).max(MAX_WORLD_SIZE)}).strict();
export const siteSchema=z.object({id:ref,objectId:ref,kind:z.enum(['home','market','school','hospital','work','civic','park','station','airport','stop']),
  label:z.string().trim().min(1).max(80).optional(),
  entry:z.object({x:z.number().finite().min(-128).max(128),y:z.number().finite().min(-128).max(128)}).strict(),street:ref,width:z.number().min(12).max(40),
  points:z.array(point).min(1).max(16),serves:z.array(ref).max(8).default([]),
}).strict().superRefine((s,ctx)=>{
  if(s.kind!=='stop' && s.serves.length || new Set(s.serves).size!==s.serves.length)ctx.addIssue({code:'custom',message:'only stops declare unique served sites'});
});
export const crossingSchema=z.object({id:ref,street:ref,at:point,width:z.number().min(12).max(40),junction:z.boolean().default(false)}).strict();
export type Site=z.infer<typeof siteSchema>;
export type Crossing=z.infer<typeof crossingSchema>;

export function streetFrame(street:Scene['streets'][number],point:Point){
  let best={x:0,y:0,dx:1,dy:0,distance:Infinity};
  for(let i=1;i<street.points.length;i++){
    const a=street.points[i-1]!,b=street.points[i]!,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
    const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(length*length))),x=a.x+t*dx,y=a.y+t*dy,distance=Math.hypot(point.x-x,point.y-y);
    if(distance<best.distance)best={x,y,dx:dx/length,dy:dy/length,distance};
  }
  return best;
}
export function siteEntry(scene:Scene,site:Site):Point{
  const object=scene.objects.find(o=>o.id===site.objectId);if(!object)return site.points[0]!;
  const c=Math.cos(object.headingRad??0),s=Math.sin(object.headingRad??0);
  return {x:object.x+(site.entry.x*c-site.entry.y*s)*object.scale,y:object.y+(site.entry.x*s+site.entry.y*c)*object.scale};
}
export const sitePath=(scene:Scene,site:Site)=>[siteEntry(scene,site),...site.points];
export const sitePolygons=(scene:Scene,site:Site)=>markingPolygons({id:site.id,color:'#bcb6a4',closed:false,width:site.width,points:sitePath(scene,site)});
/** One junction declaration expands to a crossing on every connected street arm. */
export function crossingLanes(scene:Scene,crossing:Crossing){
  const street=scene.streets.find(s=>s.id===crossing.street);if(!street)return [];
  if(!crossing.junction)return [{street,at:crossing.at}];
  const center=streetFrame(street,crossing.at),arms:{street:typeof street;dx:number;dy:number;length:number}[]=[];
  for(const s of scene.streets)for(let i=1;i<s.points.length;i++){
    const a=s.points[i-1]!,b=s.points[i]!,length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
    const t=((center.x-a.x)*dx+(center.y-a.y)*dy)/length;
    if(t<-.001 || t>1.001 || Math.abs((center.x-a.x)*dy-(center.y-a.y)*dx)>1)continue;
    for(const sign of [-1,1]){
      const reach=(sign===1 ? 1-t : t)*length;if(reach<40)continue;
      const arm={street:s,dx:dx*sign,dy:dy*sign,length:reach};
      const prior=arms.findIndex(a=>a.dx*arm.dx+a.dy*arm.dy>.9999);
      if(prior<0)arms.push(arm);else if(s.width>arms[prior]!.street.width)arms[prior]=arm;
    }
  }
  return arms.flatMap(arm=>{
    let offset=0;
    for(const other of arms){const sine=Math.abs(arm.dx*other.dy-arm.dy*other.dx);if(sine<.1)continue;
      const s=other.street,r=s.width/2+(s.cycleWidth ? s.cycleWidth+6 : 0)+s.sidewalk;
      offset=Math.max(offset,r/sine);
    }
    offset=Math.min(arm.length/2,offset+crossing.width/2+2);
    // Close junctions form one intersection area; cross its outer arms, not the short internal link.
    if(scene.roadMaskRef.kind==='street-network' && scene.crossings.some(other=>{
      if(!other.junction || other===crossing)return false;
      const dx=other.at.x-center.x,dy=other.at.y-center.y,d=dx*arm.dx+dy*arm.dy;
      return d>1 && d<2*offset+crossing.width+4 && Math.abs(dx*arm.dy-dy*arm.dx)<1 && streetFrame(arm.street,other.at).distance<=1;
    }))return [];
    return [{street:arm.street,at:{x:center.x+arm.dx*offset,y:center.y+arm.dy*offset}}];
  });
}
export function crossingPolygons(scene:Scene,crossing:Crossing):Point[][]{
  return crossingLanes(scene,crossing).map(({street,at})=>{
    const p=streetFrame(street,at),r=street.width/2+(street.cycleWidth ? street.cycleWidth+6 : 0)+street.sidewalk/2;
    return [-1,1].flatMap((side,i)=>[i ? 1 : -1,i ? -1 : 1].map(along=>({x:p.x+p.dx*along*crossing.width/2-p.dy*r*side,y:p.y+p.dy*along*crossing.width/2+p.dx*r*side})));
  });
}
const cache=new WeakMap<Scene,{polygons:Point[][];sites:Map<string,number>;roots:number[]}>();
/** Sidewalks, crossings and entrance paths form one explicit pedestrian network. */
export function walkingNetwork(scene:Scene){
  let value=cache.get(scene);if(value)return value;
  const polygons=[...streetSidewalks(scene)];
  polygons.push(...streetCircuitCrossings(scene).flatMap(c=>c.polygons));
  polygons.push(...scene.crossings.flatMap(c=>crossingPolygons(scene,c)));
  const sites=new Map<string,number>();
  for(const site of scene.sites){sites.set(site.id,polygons.length);polygons.push(...sitePolygons(scene,site));}
  polygons.push(...sceneInteriors(scene).map(f=>f.polygon));
  polygons.push(...scene.surfaces.filter(s=>s.walkable).map(s=>s.points));
  const roots=polygons.map((_,i)=>i),bounds=polygons.map(polygonBounds);
  const root=(i:number):number=>roots[i]===i ? i : roots[i]=root(roots[i]!);
  const connected=(a:Point[],b:Point[])=>{
    if(polygonArea(partition(a,b).inside)>.01)return true;
    // Point-only corners cannot carry a person. Require a shared boundary at least 0.8 m wide.
    for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
      const p=a[i]!,q=a[(i+1)%a.length]!,u=b[j]!,v=b[(j+1)%b.length]!,dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);
      if(length<8 || Math.abs(dx*(u.y-p.y)-dy*(u.x-p.x))/length>.01 || Math.abs(dx*(v.y-p.y)-dy*(v.x-p.x))/length>.01)continue;
      const t=(r:Point)=>((r.x-p.x)*dx+(r.y-p.y)*dy)/length;
      if(Math.min(length,Math.max(t(u),t(v)))-Math.max(0,Math.min(t(u),t(v)))>=8-.01)return true;
    }
    return false;
  };
  for(let i=0;i<polygons.length;i++)for(let j=0;j<i;j++){
    if(root(i)===root(j))continue;const a=bounds[i]!,b=bounds[j]!;
    if(a.x1+.01<b.x0 || a.x0-.01>b.x1 || a.y1+.01<b.y0 || a.y0-.01>b.y1)continue;
    if(connected(polygons[i]!,polygons[j]!))roots[root(i)]=root(j);
  }
  roots.forEach((_,i)=>roots[i]=root(i));value={polygons,sites,roots};cache.set(scene,value);return value;
}
export function onWalkway(scene:Scene,x:number,y:number,radius=0){
  const {polygons}=walkingNetwork(scene);
  return Array.from({length:radius ? 9 : 1},(_,i)=>i===0 ? {x,y} : {x:x+Math.cos(i*Math.PI/4)*radius,y:y+Math.sin(i*Math.PI/4)*radius}).every(p=>polygons.some(polygon=>onPolygon(polygon,p.x,p.y,.01)));
}
export function validateSites(scene:Scene):string[]{
  if(!scene.sites.length && !scene.crossings.length && !scene.surfaces.some(s=>s.walkable))return [];
  const problems:string[]=[],ids=new Set<string>();
  for(const item of [...scene.sites,...scene.crossings]){if(ids.has(item.id))problems.push(`duplicate access ID "${item.id}"`);ids.add(item.id);}
  for(const c of scene.crossings){const street=scene.streets.find(s=>s.id===c.street);
    if(!street || street.sidewalk<12 || streetFrame(street,c.at).distance>1)problems.push(`crossing "${c.id}" needs a named street centerline with sidewalks`);
  }
  for(const street of scene.streets)for(const endpoint of [street.points[0]!,street.points.at(-1)!]){
    const missed=scene.streets.find(other=>other!==street && (()=>{const p=streetFrame(other,endpoint);return p.distance>1 && p.distance<other.width/2+(other.cycleWidth ? other.cycleWidth+6 : 0);})());
    if(missed)problems.push(`street "${street.id}" must meet "${missed.id}" at its centerline; share a junction instead of overlapping short endpoints`);
  }
  const contacts=sceneContacts(scene),network=walkingNetwork(scene);
  const paths=scene.surfaces.filter(s=>s.walkable),base=network.polygons.length-paths.length,connectedRoots=new Set(network.roots.slice(0,base));
  const water=paths.length ? (scene.terrain.landscape?.waters??[]).flatMap(w=>triangulatePolygon(w.polygon)) : [],decks=(scene.terrain.landscape?.bridges??[]).map(bridgePolygon);
  for(const [i,path] of paths.entries()){
    if(!connectedRoots.has(network.roots[base+i]!))problems.push(`walkable surface "${path.id}" needs a full-width connection to accepted pedestrian pavement`);
    if(subtractPolygons(intersectPolygons([path.points],water),decks).some(p=>polygonArea(p)>.01))problems.push(`walkable surface "${path.id}" crosses water without a supporting bridge`);
    for(const bridge of scene.terrain.landscape?.bridges??[])if(polygonsOverlap(path.points,bridgePolygon(bridge))){
      const outline=path.points.map(p=>{const q=bridgeCoordinates(bridge,p.x,p.y);return {x:q.t,y:q.across};}),inside=clipPolygon(clipPolygon(outline,p=>p.x),p=>1-p.x);
      if(inside.some(p=>Math.abs(p.y)>bridge.width/2-(bridge.rails ? 6 : 0)+.001))problems.push(`walkable surface "${path.id}" must enter bridge "${bridge.id}" through its open ends and clear its rails`);
    }
    for(const route of scene.routes.filter(r=>r.kind==='rail' || r.kind==='air')){
      const corridor=routeInfrastructure(route),polygons=markingPolygons({id:route.id,color:'#000000',closed:false,width:corridor.radius*2,points:corridor.points});
      if(polygons.some(p=>polygonsOverlap(path.points,p)))problems.push(`walkable surface "${path.id}" must stay clear of rail and runway corridors`);
    }
    const b=polygonBounds(path.points),x=(b.x0+b.x1)/2,y=(b.y0+b.y1)/2,r=Math.hypot(b.x1-b.x0,b.y1-b.y0)/2;
    if(contacts.solids.query(x,y,r+contacts.maxRadius).some(c=>contactTouchesPolygon(c,path.points) && c.top>walkingHeight(scene,c.x,c.y)+.1 && c.bottom<walkingHeight(scene,c.x,c.y)+20))problems.push(`walkable surface "${path.id}" needs a clear footprint; place furniture beside the path`);
  }
  for(const site of scene.sites){
    const object=scene.objects.find(o=>o.id===site.objectId),street=scene.streets.find(s=>s.id===site.street);
    if(!object || isActor(object) || object.route || !object.spec || !('dslVersion' in object.spec)){problems.push(`site "${site.id}" needs a static assembly`);continue;}
    if(!street || street.sidewalk<site.width){problems.push(`site "${site.id}" needs a named street with a sidewalk at least as wide as its path`);continue;}
    const box=assemblyBounds(object.spec),entry=site.entry,tolerance=Math.max(2,Math.min(box.max.x-box.min.x,box.max.z-box.min.z)*.2);
    const edge=Math.min(Math.abs(entry.x-box.min.x),Math.abs(entry.x-box.max.x),Math.abs(entry.y-box.min.z),Math.abs(entry.y-box.max.z));
    if(edge>tolerance || entry.x<box.min.x-tolerance || entry.x>box.max.x+tolerance || entry.y<box.min.z-tolerance || entry.y>box.max.z+tolerance)problems.push(`site "${site.id}" entrance must attach to its building's exterior`);
    const end=site.points.at(-1)!,reserved=streetPolygons([street],'reserved'),riding=streetPolygons(scene.streets,'riding');
    for(let i=0;i<8;i++){
      const x=end.x+Math.cos(i*Math.PI/4)*site.width/2,y=end.y+Math.sin(i*Math.PI/4)*site.width/2;
      if(!reserved.some(p=>onPolygon(p,x,y,.01)) || riding.some(p=>pointInPolygon(x,y,p))){problems.push(`site "${site.id}" path must join its named sidewalk without blocking a riding lane`);break;}
    }
    const path=sitePath(scene,site);let length=0,invalid=false;
    for(let i=1;i<path.length;i++){
      const a=path[i-1]!,b=path[i]!,d=Math.hypot(b.x-a.x,b.y-a.y);length+=d;
      if(d<.1){invalid=true;break;}
      for(let t=0;t<=Math.ceil(d/12);t++){
        const f=t/Math.ceil(d/12),x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,r=site.width/2,floor=drivingHeight(scene.terrain,x,y);
        if(x<r || y<r || x>scene.canonical.width-r || y>scene.canonical.height-r || waterAt(scene.terrain,x,y,floor))invalid=true;
      }
    }
    const uncrossed=subtractPolygons(sitePolygons(scene,site),scene.crossings.flatMap(c=>crossingPolygons(scene,c)));
    if(uncrossed.some(path=>riding.some(road=>polygonArea(partition(path,road).inside)>1e-5)))problems.push(`site "${site.id}" crosses a riding lane without a declared crossing`);
    for(const polygon of sitePolygons(scene,site)){
      const b=polygonBounds(polygon),x=(b.x0+b.x1)/2,y=(b.y0+b.y1)/2,r=Math.hypot(b.x1-b.x0,b.y1-b.y0)/2;
      if(contacts.solids.query(x,y,r+contacts.maxRadius).some(c=>c.id!==site.objectId && contactTouchesPolygon(c,polygon) && c.top>walkingHeight(scene,c.x,c.y)+.1 && c.bottom<walkingHeight(scene,c.x,c.y)+20))invalid=true;
    }
    if(invalid || length>800)problems.push(`site "${site.id}" needs an unobstructed, dry entrance path of at most 800 units`);
    const own=network.roots[network.sites.get(site.id)!];
    for(const target of site.serves){const other=scene.sites.find(s=>s.id===target);
      if(!other || other.kind==='stop' || own!==network.roots[network.sites.get(target)!])problems.push(`stop "${site.id}" cannot reach served site "${target}" along the pedestrian network`);
    }
  }
  for(const object of scene.objects)if(object.spec && 'measure' in object.spec && object.spec.measure?.kind==='building' && !object.route && !scene.sites.some(s=>s.objectId===object.id))problems.push(`building "${object.id}" needs a connected site`);
  return problems;
}
