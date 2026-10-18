import {it,expect} from 'vitest';
import source from '../docs/examples/neighborhood-repairs.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {encodeSave,decodeSave} from '../src/sim/save';
import {repairNetwork,repairSegment} from '../src/sim/repair';
import {onWalkway} from '../src/scene/sites';
const scene=compileDreamScene(source,{sceneId:'network',revisionId:'r1',sourceHash:'network'}),r=scene.economy!.repairs[0]!;
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
const start=():CarState=>({...createCarAtSpawn(scene),control:{kind:'foot'},vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}],x:560,y:740,elevation:0,surface:'paper',broken:['remote_table']});
const worker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!;
const step=(s:CarState)=>stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);
it('accepts bounded unique grounds and rejects a physically disconnected yard at complete-world acceptance',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(r.grounds).toEqual(['remote_yard']);
 for(const grounds of ['[]','[work_yard]','[remote_yard,remote_yard]','[missing]'])expect(()=>compileDreamScene(source.replace('grounds=[remote_yard]',`grounds=${grounds}`),{sceneId:'bad',revisionId:'r1',sourceHash:'bad'}),grounds).toThrow();
 const gap=source.replace('[[1080,884],[1260,884]','[[1080,910],[1260,910]');expect(()=>compileDreamScene(gap,{sceneId:'gap',revisionId:'r1',sourceHash:'gap'})).toThrow('clear connection');
 const nodes=repairNetwork(scene,r);expect(nodes.length).toBeLessThanOrEqual(8192);expect(nodes.reduce((n,p)=>n+p.links.length,0)).toBeLessThanOrEqual(32768);
});
it('walks on public pavement, crosses at the authored zebra, repairs and returns with serializable progress throughout',()=>{
 let s=start(),crossed=false,travelled=false,worked=false,last={x:620,y:730};
 for(let i=0;i<850;i++){
  s=step(s);const t=worker(s).repair;
  if(t){expect(Math.hypot(t.x-last.x,t.y-last.y)).toBeLessThanOrEqual(3.501);last={x:t.x,y:t.y};if(t.y>816 && t.y<884){expect(onWalkway(scene,t.x,t.y,4)).toBe(true);travelled=true;}if(Math.abs(t.y-850)<7 && Math.abs(t.x-900)<=6.01)crossed=true;worked ||= t.phase==='work';for(const p of t.path)expect(Object.keys(p).sort()).toEqual(['x','y']);}
  checkEconomyState(s,scene);expect(()=>encodeSave(s,s.timeS,world)).not.toThrow();
 }
 expect(travelled).toBe(true);expect(crossed).toBe(true);expect(worked).toBe(true);expect(s.broken).toEqual([]);expect(worker(s).repair).toBeUndefined();expect(worker(s).credits).toBe(24);expect(s.economy!.repaired.yard_furniture).toBe(1);expect(s.economy!.markets[0]!.stock.kit).toBe(2);
});
it('waits at a vehicle blocking the crossing and resumes the saved journey after it is moved',()=>{
 let s=start();for(let i=0;i<4;i++)s=step(s);
 s={...s,vehicles:[{id:null,x:900,y:850,elevation:0,headingRad:0,distance:0}]};for(let i=0;i<400;i++)s=step(s);
 expect(s.broken).toEqual(['remote_table']);expect(worker(s).credits).toBe(20);expect(worker(s).repair!.y).toBeLessThan(840);
 const saved=decodeSave(encodeSave(s,s.timeS,world),world).state;s={...saved,vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]};
 for(let i=0;i<850;i++)s=step(s);expect(s.broken).toEqual([]);expect(s.economy!.repaired.yard_furniture).toBe(1);expect(worker(s).repair).toBeUndefined();checkEconomyState(s,scene);
});
it('does not accept a straight shortcut through an unpainted carriageway',()=>{
 expect(repairSegment(scene,r,{x:1160,y:810},{x:1160,y:910},start())).toBe(false);
});

it('primes bounded worker-owned navigation atomically and rejects malformed topology',async()=>{
 const {repairNavigation,primeRepairNavigation}=await import('../src/sim/repair');const packet=repairNavigation(scene),copy={...scene};primeRepairNavigation(copy,packet);expect(repairNetwork(copy,r)).toBe(packet.services[0]!.nodes);
 for(const mutate of [(p:typeof packet)=>{p.sourceHash='other';},(p:typeof packet)=>{p.services[0]!.id='unknown';},(p:typeof packet)=>{p.services[0]!.nodes[0]!.x=NaN;},(p:typeof packet)=>{p.services[0]!.nodes[0]!.links=[0];},(p:typeof packet)=>{p.services[0]!.nodes[0]!.links=[8192];},(p:typeof packet)=>{p.services=[];}]){const bad=structuredClone(packet);mutate(bad);expect(()=>primeRepairNavigation(copy,bad)).toThrow('Invalid prepared');expect(repairNetwork(copy,r)).toBe(packet.services[0]!.nodes);}
});

it('connects adjoining work grounds through a full-cylinder portal and rejects a real gap',()=>{
 const joined=source.replace('at=[1160,970]','at=[1160,1130]').replace('grounds=[remote_yard]','grounds=[remote_yard,outer_bed]')+'\nsurface outer_bed(color=#819461,points=[[1080,1010],[1260,1010],[1260,1190],[1080,1190]]);';
 const accepted=compileDreamScene(joined,{sceneId:'joined-work',revisionId:'r1',sourceHash:'joined'});expect(accepted.surfaces.find(s=>s.id==='outer_bed')).toBeDefined();
 expect(()=>compileDreamScene(joined.replace('[[1080,1010],[1260,1010]','[[1080,1040],[1260,1040]'),{sceneId:'gap',revisionId:'r1',sourceHash:'gap'})).toThrow('clear connection');
});

it('primes exact target/contact order and access footprints atomically, rejecting damaged worker caches',async()=>{
 const {repairNavigation,primeRepairNavigation,repairArea}=await import('../src/sim/repair');const {repairTargets,repairCoverage}=await import('../src/scene/commerce'),packet=repairNavigation(scene),copy={...scene};primeRepairNavigation(copy,packet);
 expect(repairTargets(copy,r)).toEqual(repairTargets(scene,r));expect(repairCoverage(copy,r).access).toEqual(repairCoverage(scene,r).access);expect(repairArea(copy,r).access).toBe(packet.services[0]!.coverage!.access);
 const valid=repairCoverage(copy,r),nodes=repairNetwork(copy,r);
 for(const change of [(p:typeof packet)=>{p.services[0]!.coverage=undefined;},(p:typeof packet)=>{p.services[0]!.coverage!.targets[0]!.objectId='missing';},(p:typeof packet)=>{p.services[0]!.coverage!.targets.push(p.services[0]!.coverage!.targets[0]!);},(p:typeof packet)=>{p.services[0]!.coverage!.targets[0]!.contact.r++;},(p:typeof packet)=>{p.services[0]!.coverage!.targets[0]!.contact.bottom=NaN;},(p:typeof packet)=>{p.services[0]!.coverage!.access=[[{x:0,y:0},{x:1,y:1},{x:2,y:2}]];},(p:typeof packet)=>{p.services[0]!.coverage!.access=[[{x:0,y:0},{x:1,y:1},{x:NaN,y:2}]];}]){
  const invalid=structuredClone(packet);change(invalid);expect(()=>primeRepairNavigation(copy,invalid)).toThrow('prepared repair coverage');expect(repairCoverage(copy,r)).toBe(valid);expect(repairNetwork(copy,r)).toBe(nodes);
 }
});
