import {beforeAll,afterEach,it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {workPath,workSegment} from '../src/sim/work-navigation';
import {repairArea,repairApproach,repairTargets,repairNavigation,primeRepairNavigation} from '../src/sim/repair';
import {sceneContactData,primeSceneContacts} from '../src/scene/contacts';
import {ambientGraph,primeAmbientNavigation} from '../src/scene/ambient-navigation';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {playerRadius} from '../src/scene/measure';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {stationMaintenanceReviewSteps} from '../src/game/station-maintenance-review';
import {distanceToRoad} from '../src/scene/road';
import {COMMERCE_LIMITS} from '../src/scene/commerce';
import type {Point} from '../src/scene/schema';

let scene:ReturnType<typeof createWorldScene>,snapshot:string;
beforeAll(()=>{scene=createWorldScene();snapshot=JSON.stringify(scene);},60000);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const probes=[
 {id:'river',a:{x:8100,y:4288},b:{x:8309,y:4282},length:235.5674327288312},
 {id:'civic',a:{x:6695.551119409912,y:4282},b:{x:6900,y:4288},length:229.85714705456837},
];
const length=(start:Point,path:Point[])=>{let total=0;for(const end of path){total+=Math.hypot(end.x-start.x,end.y-start.y);start=end;}return total;};
const service=()=>scene.economy!.repairs.find(r=>r.id==='classroom_furniture')!;

it('uses the short supported route at both previously detouring corners in either direction',()=>{
 const area=repairArea(scene,service());
 for(const {id,a,b,length:expected} of probes)for(const [from,to] of [[a,b],[b,a]]){
  const path=workPath(scene,area,from!,to!)!;expect(path,id).toBeDefined();expect(length(from!,path),id).toBeCloseTo(expected,6);
  let p=from!;for(const q of path){expect(workSegment(scene,area,p,q,undefined),id).toBe(true);p=q;}
  expect(path).toHaveLength(new Set(path.map(p=>p.x+','+p.y)).size);
 }
});

it('keeps current contacts live after warming a path through the new corner link',()=>{
 const area=repairArea(scene,service()),{a,b}=probes[1]!,ordinary=workPath(scene,area,a,b)!;
 const obstacle={x:6735,y:4310},state={...createCarAtSpawn(scene),control:{kind:'foot' as const},x:900,y:600,vehicles:[{id:null,...obstacle,elevation:0,headingRad:0,distance:0}]};
 const detour=workPath(scene,area,a,b,state)!;expect(detour).toBeDefined();expect(length(a,detour)).toBeGreaterThan(length(a,ordinary)+100);
 let p=a;for(const q of detour){expect(distanceToRoad([p,q],obstacle.x,obstacle.y)).toBeGreaterThanOrEqual(playerRadius(scene)+COMMERCE_LIMITS.repairRadius-.001);p=q;}
 expect(workPath(scene,area,a,b)).toEqual(ordinary);
});

it('retains all accepted targets and fits all prepared journey graphs inside unchanged bounds',()=>{
 expect(scene.objects).toHaveLength(1816);expect(scene.sites).toHaveLength(221);expect(scene.surfaces).toHaveLength(61);expect(scene.crossings).toHaveLength(62);expect(sceneContactData(scene).contacts).toHaveLength(3476);
 expect(COMMERCE_LIMITS.repairNetworkNodes).toBe(8192);expect(COMMERCE_LIMITS.repairNetworkLinks).toBe(32768);
 const home=scene.objects.find(o=>o.id==='market_neighbor')!;let targets=0,originalTargets=0;
 for(const s of scene.economy!.repairs)for(const target of repairTargets(scene,s).filter(t=>t.objectId.startsWith('station_quarter_'))){
  const approach=repairApproach(scene,s,target,home)!;expect(approach,target.objectId).toBeDefined();if(scene.objects.find(o=>o.id===target.objectId)!.floor!=='office_mezzanine'){expect(length(home,approach.path)).toBeLessThan(8000);originalTargets++;}targets++;
 }
 expect(targets).toBe(17);expect(originalTargets).toBe(14);
 const packet=repairNavigation(scene);for(const s of packet.services){expect(s.nodes.length,s.id).toBeLessThanOrEqual(8192);expect(s.nodes.reduce((n,p)=>n+p.links.length,0),s.id).toBeLessThanOrEqual(32768);}
});

it('carries the same shorter routes through worker graph preparation without changing source data',()=>{
 const copy=structuredClone(scene);primeSceneContacts(copy,structuredClone(sceneContactData(scene)));primeAmbientNavigation(copy,structuredClone(ambientGraph(scene)));primeRepairNavigation(copy,structuredClone(repairNavigation(scene)));
 const area=repairArea(scene,service());for(const {a,b} of probes)expect(workPath(copy,area,a,b)).toEqual(workPath(scene,area,a,b));
 expect(copy).toEqual(scene);
});

it('reaches the corner review through a real strike, finite dispatch and ordinary fixed ticks',async()=>{
 const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11},steps=stationMaintenanceReviewSteps(createCarAtSpawn(scene),world,'bench','corner');let result=steps.next(),yields=0;
 while(!result.done){if(++yields%120===0)await new Promise(resolve=>setTimeout(resolve,0));result=steps.next();}
 const state=result.value,worker=state.economy!.accounts.find(a=>a.id==='caretaker')!,task=worker.repair!;expect(state.broken).toContain('station_quarter_bench_nw');expect(task).toMatchObject({id:'classroom_furniture',objectId:'station_quarter_bench_nw',phase:'out'});expect(Math.hypot(task.x-6695.551119409912,task.y-4282)).toBeLessThan(40);expect(task.distance).toBeGreaterThan(300);expect(worker.credits).toBe(0);expect(state.timeS).toBeLessThan(180);
},60000);
