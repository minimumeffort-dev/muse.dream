import {afterEach,beforeAll,expect,it} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {preCrossingAccessScene,preTowerRoomScene} from '../src/scene/save-compatibility';
import type {Point,Scene} from '../src/scene/schema';
import {crossingLanes,crossingPolygons,onWalkway} from '../src/scene/sites';
import {polygonArea,polygonBounds,partition} from '../src/scene/polygons';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {AMBIENT_LIMITS} from '../src/scene/ambient';
import {COMMERCE_LIMITS} from '../src/scene/commerce';
import {repairTargets,repairApproach,repairPath,repairSegment,repairNavigation} from '../src/sim/repair';
import {streetPlanSteps} from '../src/game/streets';
import {createLegacyWorld} from './fixtures/legacy-world';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {stepInteractive,toggleRide} from '../src/sim/interaction';
import {crossingReviewStart,crossingReviewPath} from '../src/game/crossing-review';
import {loftReviewInput} from '../src/game/loft-review';

let accepted:Scene|undefined,snapshot:string|undefined;
function scene(){if(!accepted){accepted={...preTowerRoomScene(createWorldScene()),revisionId:'r113',sourceHash:'handmade-city-life-v113'};snapshot=JSON.stringify(accepted);}return accepted;}
beforeAll(()=>{scene();},60000);
afterEach(()=>{if(accepted)expect(JSON.stringify(accepted)).toBe(snapshot);});
const added=['crossing_medical_access','crossing_copper_access','crossing_weavers_access','crossing_terrace_access'];
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
function pathLength(start:Point,path:Point[]){let result=0;for(const point of path){result+=distance(start,point);start=point;}return result;}

/** Include geometric intersections between anchor points, not only named junctions. */
function fourWayIntersections(current:Scene){
 const segments=current.streets.flatMap(s=>s.points.slice(1).map((b,i)=>({a:s.points[i]!,b,id:s.id}))),points:Point[]=[];
 for(let i=0;i<segments.length;i++)for(let j=0;j<i;j++){
  const a=segments[i]!,b=segments[j]!;if(a.id===b.id)continue;
  const rx=a.b.x-a.a.x,ry=a.b.y-a.a.y,sx=b.b.x-b.a.x,sy=b.b.y-b.a.y,dx=b.a.x-a.a.x,dy=b.a.y-a.a.y,den=rx*sy-ry*sx;
  if(Math.abs(den)<1e-8)continue;const t=(dx*sy-dy*sx)/den,u=(dx*ry-dy*rx)/den;
  if(t< -1e-8||t>1+1e-8||u< -1e-8||u>1+1e-8)continue;
  const p={x:a.a.x+t*rx,y:a.a.y+t*ry};if(!points.some(q=>distance(p,q)<.001))points.push(p);
 }
 return points.filter(p=>{
  const arms:Point[]=[];
  for(const {a,b} of segments){
   const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),t=((p.x-a.x)*dx+(p.y-a.y)*dy)/(length*length);
   if(t< -1e-8||t>1+1e-8||Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx)/length>.001)continue;
   for(const end of [a,b]){const d=distance(p,end);if(d<1)continue;const arm={x:(end.x-p.x)/d,y:(end.y-p.y)/d};if(!arms.some(q=>q.x*arm.x+q.y*arm.y>.9999))arms.push(arm);}
  }
  return arms.length>=4;
 });
}

const overlaps=(a:ReturnType<typeof polygonBounds>,b:ReturnType<typeof polygonBounds>)=>a.x1>b.x0+1e-7&&a.x0<b.x1-1e-7&&a.y1>b.y0+1e-7&&a.y0<b.y1-1e-7;
function overlapArea(a:Point[][],b:Point[][]){
 const right=b.map(p=>({p,b:polygonBounds(p)}));let area=0;
 for(const p of a){const bounds=polygonBounds(p);for(const q of right)if(overlaps(bounds,q.b))area+=polygonArea(partition(p,q.p).inside);}
 return area;
}

it('accepts r113 with every named or geometric four-way intersection covered and preserves the released geometry',()=>{
 const current=scene(),prior=preCrossingAccessScene(current);
 expect(current.revisionId).toBe('r113');expect(current.sourceHash).toBe('handmade-city-life-v113');expect(current.crossings).toHaveLength(62);
 expect(current.crossings.filter(c=>!added.includes(c.id))).toEqual(prior.crossings);expect(prior.crossings).toHaveLength(58);
 const intersections=fourWayIntersections(current),uncovered=(s:Scene)=>intersections.filter(p=>!s.crossings.some(c=>c.junction&&distance(c.at,p)<1));
 expect(intersections).toHaveLength(23);expect(uncovered(current)).toEqual([]);
 expect(uncovered(prior)).toHaveLength(4);for(const p of uncovered(prior))expect(current.crossings.some(c=>added.includes(c.id)&&distance(c.at,p)<1)).toBe(true);
 for(const crossing of current.crossings.filter(c=>added.includes(c.id))){
  expect(crossing).toMatchObject({width:24,junction:true});expect(crossingLanes(current,crossing)).toHaveLength(4);
  for(const polygon of crossingPolygons(current,crossing)){const center=polygon.reduce((p,q)=>({x:p.x+q.x/polygon.length,y:p.y+q.y/polygon.length}),{x:0,y:0});expect(onWalkway(current,center.x,center.y,4),crossing.id).toBe(true);}
 }
 for(const key of ['objects','streets','sites','surfaces','terrain','floors','economy','routes','spawn','player'] as const)expect(current[key],key).toEqual(prior[key]);
 expect(sceneContactData(current).contacts).toEqual(sceneContactData(prior).contacts);
 const legacy=createLegacyWorld();expect(legacy.revisionId).toBe('r24');expect(legacy.crossings).toEqual([]);expect(legacy.roadMaskRef.kind).toBe('generated-spline-loop');
});

it('keeps all crossing paint single-owned and clears centerlines, stop bars and bicycle glyphs using shared footprints',()=>{
 const current=scene(),steps=streetPlanSteps(current);let step=steps.next();while(!step.done)step=steps.next();const plan=step.value;
 const zebras=plan.layers.find(p=>p.name==='pedestrian-crossings')!.polygons,clearance=current.crossings.flatMap(c=>crossingPolygons(current,{...c,width:c.width+16}));
 const bounded=zebras.map(p=>({p,b:polygonBounds(p)}));let duplicateArea=0;
 for(let i=0;i<bounded.length;i++)for(let j=0;j<i;j++)if(overlaps(bounded[i]!.b,bounded[j]!.b))duplicateArea+=polygonArea(partition(bounded[i]!.p,bounded[j]!.p).inside);
 expect(duplicateArea).toBeLessThan(.001);
 for(const name of ['street-centerlines','crossing-stop-lines','cycle-symbols']){const layer=plan.layers.find(p=>p.name===name)!;expect(layer.polygons.length,name).toBeGreaterThan(0);expect(overlapArea(layer.polygons,clearance),name).toBeLessThan(.001);}
 for(const crossing of current.crossings){const arms=crossingPolygons(current,crossing);expect(arms.length,crossing.id).toBeGreaterThan(0);for(const arm of arms)expect(overlapArea(zebras,[arm]),crossing.id).toBeGreaterThan(1);}
});

it('keeps the missing-crossing detour on supported pavement and uses the 164-unit north crossing in both directions',()=>{
 const current=scene(),prior=preCrossingAccessScene(current),a={x:11118,y:5126},b={x:11282,y:5126},r=current.economy!.repairs.find(r=>r.id==='classroom_furniture')!;
 expect(repairSegment(prior,r,a,b,undefined)).toBe(false);const old=repairPath(prior,r,a,b)!;expect(pathLength(a,old)).toBe(1788);
 let previous=a;for(const point of old){expect(repairSegment(prior,r,previous,point,undefined)).toBe(true);previous=point;}
 for(const [from,to] of [[a,b],[b,a]] as const){expect(repairSegment(current,r,from,to,undefined)).toBe(true);const path=repairPath(current,r,from,to)!;expect(path).toEqual([to]);expect(pathLength(from,path)).toBe(164);}
});

it('walks the complete new crossing through normal controls and retains an already parked car',()=>{
 const current=scene(),world:World={scene:current,roadMask:buildMaskForScene(current),driveMask:buildPaperMask(14000,11000),carRadius:11};
 const foot=toggleRide(createCarAtSpawn(current),world);expect(foot.control.kind).toBe('foot');expect(foot.vehicles.some(v=>v.id===null)).toBe(true);
 let state=crossingReviewStart(foot,world);expect(state.vehicles).toEqual(foot.vehicles);
 const path=crossingReviewPath(state,world);expect(path).toEqual([{x:11282,y:5126}]);
 for(let frame=0;frame<240;frame++){const input=loftReviewInput(state,path,0);for(let tick=0;tick<4;tick++)state=stepInteractive(state,input,1/120,world);}
 expect(path).toEqual([]);expect(Math.hypot(state.x-11282,state.y-5126)).toBeLessThan(.5);expect(state.grounded).toBe(true);expect(state.control.kind).toBe('foot');expect(state.vehicles).toEqual(foot.vehicles);
});

it('shortens all fourteen station jobs while retaining every old target and clear outbound and return paths',()=>{
 const current=scene(),prior=preCrossingAccessScene(current),home=current.objects.find(o=>o.id==='market_neighbor')!;let checked=0;
 for(const r of current.economy!.repairs){
  const targets=repairTargets(current,r);expect(targets).toEqual(repairTargets(prior,r));
  for(const target of targets.filter(t=>t.objectId.startsWith('station_quarter_'))){
   const before=repairApproach(prior,r,target,home)!,trip=repairApproach(current,r,target,home)!;expect(before,target.objectId).toBeDefined();expect(trip,target.objectId).toBeDefined();
   const oldLength=pathLength(home,before.path),newLength=pathLength(home,trip.path);expect(oldLength,target.objectId).toBeGreaterThan(17000);expect(newLength,target.objectId).toBeLessThan(10000);expect(newLength,target.objectId).toBeLessThan(oldLength*.57);
   for(const [start,path] of [[home,trip.path],[trip.end,repairPath(current,r,trip.end,home)!],[home,before.path]] as const){
    expect(path,target.objectId).toBeDefined();expect(path.length).toBeLessThanOrEqual(COMMERCE_LIMITS.repairPath);let previous=start;
    for(const point of path){expect(repairSegment(current,r,previous,point,undefined),target.objectId).toBe(true);previous=point;}
   }
   checked++;
  }
 }
 expect(checked).toBe(14);
});

it('keeps the unchanged population and maintenance budgets with the expanded public graph',()=>{
 const current=scene(),prior=preCrossingAccessScene(current),graph=ambientGraph(current);expect(graph.nodes.length).toBeGreaterThan(ambientGraph(prior).nodes.length);
 expect(graph.nodes.length).toBeLessThanOrEqual(AMBIENT_LIMITS.graphNodes);expect(graph.nodes.reduce((n,p)=>n+p.links.length,0)).toBeLessThanOrEqual(AMBIENT_LIMITS.graphNodes*4);
 expect(current.objects).toHaveLength(1813);expect(current.sites).toHaveLength(221);expect(current.surfaces).toHaveLength(61);expect(current.objects.filter(o=>o.ambient)).toHaveLength(189);expect(AMBIENT_LIMITS.members).toBe(192);
 expect(COMMERCE_LIMITS.repairGrounds).toBe(12);expect(COMMERCE_LIMITS.repairNodes).toBe(4096);expect(COMMERCE_LIMITS.repairNetworkNodes).toBe(8192);expect(COMMERCE_LIMITS.repairNetworkLinks).toBe(32768);
 for(const service of repairNavigation(current).services){expect(service.nodes.length,service.id).toBeLessThanOrEqual(COMMERCE_LIMITS.repairNetworkNodes);expect(service.nodes.reduce((n,p)=>n+p.links.length,0),service.id).toBeLessThanOrEqual(COMMERCE_LIMITS.repairNetworkLinks);}
});
