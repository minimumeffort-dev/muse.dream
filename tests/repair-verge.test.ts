import {it,expect} from 'vitest';
import source from '../docs/examples/street-verge-repairs.dream?raw';
import fullVerge from '../docs/examples/full-verge-repairs.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {repairTargets,repairCoverage,inheritPriorRepairCoverage} from '../src/scene/commerce';
import {repairApproach,repairSegment,repairNetwork} from '../src/sim/repair';
import {pavementInsetPoint} from '../src/scene/pavement';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {onWalkway} from '../src/scene/sites';
const identity={sceneId:'verge',revisionId:'r1',sourceHash:'verge'},scene=compileDreamScene(source,identity),r=scene.economy!.repairs[0]!;
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11},worker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!;
const start=():CarState=>({...createCarAtSpawn(scene),control:{kind:'foot'},vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}],x:560,y:740,elevation:0,surface:'paper',broken:['remote_lamp']});
const step=(s:CarState)=>stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);
it('keeps released access geometry on prior copies while current worlds retain full-body joins',()=>{
 const current=compileDreamScene(fullVerge,identity),prior=structuredClone(current);inheritPriorRepairCoverage(prior);
 const service=current.economy!.repairs[0]!,home=current.objects.find(o=>o.id==='customer')!,target=repairTargets(current,service).find(t=>t.objectId==='remote_lamp')!;
 expect(repairApproach(current,service,target,home)).toBeDefined();expect(repairApproach(prior,service,target,home)).toBeUndefined();
 const inherited=structuredClone(prior);inheritPriorRepairCoverage(inherited,prior);expect(repairCoverage(inherited,service)).toEqual(repairCoverage(prior,service));
 const live=structuredClone(prior);inheritPriorRepairCoverage(live,current);expect(repairApproach(live,service,target,home)).toBeDefined();
 expect(()=>inheritPriorRepairCoverage(current)).toThrow('before preparing work areas');
});
it('declares bounded street coverage and rejects unknown, duplicate or unsupported sidewalk references',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(r.streets).toEqual(['main']);expect(repairTargets(scene,r).map(t=>t.objectId).sort()).toEqual(['remote_lamp','yard_crate','yard_lamp']);expect(repairCoverage(scene,r).access.length).toBeGreaterThan(0);
 for(const invalid of [source.replace('streets=[main]','streets=[]'),source.replace('streets=[main]','streets=[main,main]'),source.replace('streets=[main]','streets=[missing]'),source.replace('verge=24','verge=33'),source.replace('streets=[main],','')])expect(()=>compileDreamScene(invalid,identity)).toThrow();
 const nav=repairNetwork(scene,r);expect(nav.length).toBeLessThanOrEqual(8192);expect(nav.reduce((n,p)=>n+p.links.length,0)).toBeLessThanOrEqual(32768);
});
it('reaches a street lamp, repairs with finite supplies and returns while retaining valid saves',()=>{
 let s=start(),crossed=false,worked=false,offPavement=false,last={x:620,y:730};
 for(let i=0;i<800;i++){s=step(s);const task=worker(s).repair;if(task){expect(Math.hypot(task.x-last.x,task.y-last.y)).toBeLessThanOrEqual(3.501);last={x:task.x,y:task.y};crossed ||= Math.abs(task.y-850)<7 && Math.abs(task.x-900)<=6.01;worked ||= task.phase==='work';offPavement ||= task.phase==='work' && !onWalkway(scene,task.x,task.y,4);if(task.y>816 && task.y<884)expect(onWalkway(scene,task.x,task.y,4)).toBe(true);}checkEconomyState(s,scene);if(i%8===0)s=decodeSave(encodeSave(s,s.timeS,world),world).state;}
 expect(crossed).toBe(true);expect(worked).toBe(true);expect(offPavement).toBe(true);expect(s.broken).toEqual([]);expect(worker(s).repair).toBeUndefined();expect(worker(s).credits).toBe(24);expect(s.economy!.repaired.yard_furniture).toBe(1);expect(s.economy!.markets[0]!.stock.kit).toBe(2);
});
it('pauses a verge repair for a parked vehicle and resumes the saved claim without reserving another kit',()=>{
 let s=start();for(let i=0;i<800 && worker(s).repair?.phase!=='work';i++)s=step(s);
 const task=worker(s).repair!;expect(task.phase).toBe('work');const stock=s.economy!.markets[0]!.stock.kit;
 s={...s,vehicles:[{id:null,x:task.x,y:task.y,elevation:0,headingRad:0,distance:0}]};for(let i=0;i<40;i++)s=step(s);
 expect(s.broken).toEqual(['remote_lamp']);expect(worker(s).repair!.phase).toBe('work');expect(worker(s).credits).toBe(20);expect(s.economy!.markets[0]!.stock.kit).toBe(stock);
 s=decodeSave(encodeSave(s,s.timeS,world),world).state;s={...s,vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]};
 for(let i=0;i<800;i++)s=step(s);expect(s.broken).toEqual([]);expect(worker(s).repair).toBeUndefined();expect(worker(s).credits).toBe(24);expect(s.economy!.markets[0]!.stock.kit).toBe(stock);checkEconomyState(s,scene);
});
it('keeps unpainted roads and distant grass outside the work approaches',()=>{
 expect(repairSegment(scene,r,{x:1160,y:810},{x:1160,y:910},start())).toBe(false);expect(repairSegment(scene,r,{x:1500,y:1000},{x:1500,y:1000},undefined,true)).toBe(false);
});
it('insets convex pavement in either winding and refuses a piece too thin for the worker',()=>{
 const polygon=[{x:0,y:0},{x:30,y:0},{x:30,y:20},{x:0,y:20}],p=pavementInsetPoint(polygon,{x:15,y:-1},4)!;
 expect(p.x).toBeCloseTo(15);expect(p.y).toBeCloseTo(4.01);const reversed=pavementInsetPoint([...polygon].reverse(),{x:15,y:-1},4)!;expect(reversed.x).toBeCloseTo(p.x);expect(reversed.y).toBeCloseTo(p.y);expect(pavementInsetPoint(polygon.map(v=>({...v,y:v.y/4})),{x:15,y:-1},4)).toBeUndefined();
});

it('carries the whole worker across an outer-verge join without a road or grass shortcut',()=>{
 const doc=compileDreamScene(fullVerge,identity),service=doc.economy!.repairs[0]!,target=repairTargets(doc,service).find(t=>t.objectId==='remote_lamp')!,home=doc.objects.find(o=>o.id==='customer')!;
 const approach=repairApproach(doc,service,target,home);expect(approach).toBeDefined();let previous:{x:number;y:number}=home;
 for(const p of approach!.path){expect(repairSegment(doc,service,previous,p,undefined,true)).toBe(true);previous=p;}
 expect(repairSegment(doc,service,{x:1160,y:810},{x:1160,y:930},undefined,true)).toBe(false);expect(repairSegment(doc,service,{x:1160,y:935},{x:1160,y:935},undefined,true)).toBe(false);
});
