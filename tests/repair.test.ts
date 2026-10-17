import {it,expect} from 'vitest';
import source from '../docs/examples/market-repair.dream?raw';
import {compileDreamScene,compileDreamWorld,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason,initialEconomy} from '../src/sim/commerce';
import {stepNpcs,nearbyNpc} from '../src/sim/npcs';
import {actorPose} from '../src/sim/actors';
import {breakOnContact} from '../src/sim/impacts';
import {objectContacts} from '../src/scene/contacts';
import {repairPath,repairSegment} from '../src/sim/repair';
import {encodeSave,decodeSave} from '../src/sim/save';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {dreamAgentContext} from '../src/scene/dream-agent';
const scene=compileDreamScene(source,{sceneId:'repairs',revisionId:'r1',sourceHash:'repairs'});
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
const start=():CarState=>({...createCarAtSpawn(scene),vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}],control:{kind:'foot'},x:580,y:750,elevation:0,surface:'paper',broken:['yard_table']});
const step=(s:CarState,commerce?:Parameters<typeof stepCommerce>[1]['commerce'],dt=.25)=>stepCommerce({...s,timeS:s.timeS+dt},{commerce},dt,scene);
const a=(s:CarState,id='regular')=>s.economy!.accounts.find(a=>a.id===id)!;
const market=(s:CarState)=>s.economy!.markets[0]!;
it('compiles, formats and exposes bounded repair vocabulary and rejects invalid ownership/references',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(dreamAgentContext(['commerce']).contract.commands).toHaveProperty('repair');
 for(const [from,to] of [['on=work_yard','on=missing'],['kind=table','kind=bench'],['input=kit','input=missing'],['seconds=2','seconds=0'],['repair=yard_tables','repair=missing'],['actor=customer,credits=20','actor=neighbor,credits=20']])expect(()=>compileDreamScene(source.replace(from!,to!),{sceneId:'bad',revisionId:'r1',sourceHash:'bad'})).toThrow();
 expect(()=>compileDreamWorld(source.replace('take=1,seconds=2','take=40,seconds=2'))).toThrow();
});
it('walks to damage, works, restores contacts and returns without teleporting or minting supplies/pay',()=>{
 let s=start();const original=s,untouched=structuredClone(s);s=step(s);expect(a(s).repair?.phase).toBe('out');expect(market(s).stock.kit).toBe(2);expect(a(s).credits).toBe(20);checkEconomyState(s,scene);
 let previous=actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s),worked=false;
 for(let i=0;i<100;i++){const old=s;s=step(s);const pose=actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s);expect(Math.hypot(pose.x-previous.x,pose.y-previous.y)).toBeLessThanOrEqual(3.501);previous=pose;worked ||= a(s).repair?.phase==='work';checkEconomyState(s,scene);expect(old.economy).not.toBe(s.economy);}
 expect(worked).toBe(true);expect(s.broken).toEqual([]);expect(a(s).repair).toBeUndefined();expect(a(s).credits).toBe(24);expect(s.economy!.repaired.yard_tables).toBe(1);expect(market(s).stock.kit).toBe(2);expect(original).toEqual(untouched);
});
it('lets the player claim the same kit and wage, pauses while travelling and refunds cancellation once',()=>{
 let s=step(start(),{kind:'repair',repair:'yard_tables'});expect(a(s,'pocket').repair).toBeDefined();expect(a(s).repair).toBeUndefined();
 for(let i=0;i<12;i++)s=step(s);expect(a(s,'pocket').repair?.progressS).toBe(0);checkEconomyState(s,scene);
 const t=a(s,'pocket').repair!;s={...s,x:t.at.x,y:t.at.y};for(let i=0;i<8;i++)s=step(s);expect(s.broken).toEqual([]);expect(a(s,'pocket').credits).toBe(24);checkEconomyState(s,scene);
 s={...s,broken:['yard_table'],x:580,y:750};s=step(s,{kind:'repair',repair:'yard_tables'});s=step(s,{kind:'cancel'});expect(a(s,'pocket').credits).toBe(24);expect(market(s).stock.kit).toBe(2);checkEconomyState(s,scene);
});
it('waits for a body in the restoration footprint and preserves repair progress through R and reload',()=>{
 let s=step(start());s={...s,x:720,y:750};for(let i=0;i<45;i++)s=step(s);expect(s.broken).toEqual(['yard_table']);expect(a(s).repair?.progressS).toBe(2);expect(a(s).credits).toBe(20);checkEconomyState(s,scene);
 const saved=encodeSave(s,10,world),copy=decodeSave(saved,world).state;expect(copy.economy).toEqual(s.economy);expect(resetCar(copy,scene).economy).toEqual(copy.economy);
 s=step({...copy,x:580,y:750});expect(s.broken).toEqual([]);expect(a(s).credits).toBe(24);expect(resetCar(s,scene,true).economy!.repaired.yard_tables).toBe(0);checkEconomyState(s,scene);
});
it('retains identical mid-journey replay and rejects forged pay, targets, progress and paths',()=>{
 let s=step(start());for(let i=0;i<4;i++)s=step(s);const text=encodeSave(s,4,world),restored=decodeSave(text,world).state;let b=restored;for(let i=0;i<75;i++){s=step(s);b=step(b);}expect(b).toEqual(s);
 for(const mutate of [(s:CarState)=>{a(s).credits++;},(s:CarState)=>{a(s).repair!.objectId='missing';},(s:CarState)=>{a(s).repair!.progressS=100;},(s:CarState)=>{a(s).repair!.path=[{x:580,y:590}];}]){const bad=JSON.parse(text);mutate(bad.state);expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow('invalid world state');}
});
it('cannot reserve unavailable supplies, double claim damage, or route out of its declared dry work area',()=>{
 const s=start();market(s).stock.kit=0;expect(commerceReason(s,scene,'pocket',{kind:'repair',repair:'yard_tables'})).toBe('input');
 const claimed=step(start());expect(commerceReason({...claimed,x:580,y:750},scene,'pocket',{kind:'repair',repair:'yard_tables'})).toBe('damage');
 const r=scene.economy!.repairs[0]!;expect(repairPath(scene,r,{x:580,y:750},{x:580,y:590},s)).toBeUndefined();expect(repairSegment(scene,r,{x:580,y:750},{x:900,y:750},s)).toBe(false);
});

it('keeps conversation clocks and memory during maintenance, then resumes without a position jump',()=>{
 let s=step(start());const n=s.npcs.find(n=>n.id==='customer')!;n.known=true;const snapshot={...n};
 for(let i=0;i<4;i++){s={...step(s),npcs:stepNpcs(s,.25,scene)};expect(s.npcs.find(n=>n.id==='customer')).toEqual(snapshot);}
 for(let i=0;i<100;i++)s=step(s);expect(a(s).repair).toBeUndefined();expect(s.npcs.find(n=>n.id==='customer')!.known).toBe(true);const next=stepNpcs(s,.25,scene).find(n=>n.id==='customer')!;expect(next.elapsedS).toBeGreaterThan(snapshot.elapsedS);
});
it('counts repair supplies against carrying capacity and respects a finite dispatch delay',()=>{
 const full=start();a(full,'pocket').inventory.bread=8;expect(commerceReason(full,scene,'pocket',{kind:'repair',repair:'yard_tables'})).toBe('full');
 const delayed=compileDreamScene(source.replace('dispatch_s=0','dispatch_s=3'),{sceneId:'delay',revisionId:'r1',sourceHash:'delay'});let s={...createCarAtSpawn(delayed),broken:['yard_table']};
 for(let i=0;i<12;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,delayed);expect(a(s).repair).toBeUndefined();expect(market(s).stock.kit).toBe(3);s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,delayed);expect(a(s).repair).toBeDefined();checkEconomyState(s,delayed);
});

it('restores toppled assemblies and individual break zones while retaining their structural core',()=>{
 for(const zoned of [false,true]){let text=source;
  if(zoned){text=text.replace('fragment leg(){','group leg(){');text=text.replace(' impact(mode=break(speed=60,scatter=30,lift=40,spin=2,lifetime=6));','');text=text.replace('fragment top(){part board(shape=box,material=timber,at=[0,9,0],size=[20,2,12]);}','zone tabletop(at=[0,8,0],radius=12,height=2,mode=break(speed=60,scatter=30,lift=40,spin=2,lifetime=6)){fragment top(){part board(shape=box,material=timber,at=[0,9,0],size=[20,2,12]);}}');}
  else text=text.replace('break(speed=60,scatter=30,lift=40,spin=2,lifetime=6)','topple(speed=60,duration=.7,lifetime=6)').replace('fragment top(){','fragment whole(){group top(){').replace('fragment leg(){','group leg(){').replace('}\nplace yard_table','}}\nplace yard_table');
  const doc=compileDreamScene(text,{sceneId:'variant',revisionId:'r1',sourceHash:'variant'}),w={...world,scene:doc},table=doc.objects.find(o=>o.id==='yard_table')!;
  const zoneId=objectContacts(doc,table).find(c=>c.zoneId)?.zoneId;
  let s={...createCarAtSpawn(doc),x:680,y:750,vx:120,vy:0};breakOnContact(s,w,720,750,objectContacts(doc,table).filter(c=>!zoned || c.zoneId===zoneId));expect(s.debris.length,JSON.stringify({zoned,contacts:objectContacts(doc,table),height:s.elevation})).toBeGreaterThan(0);
  s={...s,control:{kind:'foot'},vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}],x:580,y:750,vx:0};
  if(zoned){expect(s.broken).toEqual([]);expect(s.brokenZones).toEqual([{objectId:'yard_table',zoneId}]);}else expect(s.broken).toEqual(['yard_table']);
  for(let i=0;i<100;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,doc);expect(s.broken).toEqual([]);expect(s.brokenZones).toEqual([]);expect(s.debris).toEqual([]);expect(s.economy!.repaired.yard_tables).toBe(1);checkEconomyState(s,doc);
 }
});

it('uses stable ID ties for equal-distance damage and rejects oversized work-yard navigation',()=>{
 const two=source.replace('surface work_yard','place a_table(object=table,at=[720,710]);\nsurface work_yard'),doc=compileDreamScene(two,{sceneId:'two',revisionId:'r1',sourceHash:'two'});
 const s=stepCommerce({...createCarAtSpawn(doc),broken:['yard_table','a_table'],timeS:.25},{},.25,doc);expect(a(s).repair!.objectId).toBe('a_table');
 expect(()=>compileDreamScene(source.replace('[[530,680],[820,680],[820,820],[530,820]]','[[530,680],[2530,680],[2530,1080],[530,1080]]'),{sceneId:'big',revisionId:'r1',sourceHash:'big'})).toThrow('4096 local navigation samples');
});

it('keeps mid-journey saves inside the speed bound at large simulation clocks',()=>{
 let s=start();s={...s,timeS:100000.003,economy:initialEconomy(scene,100000.003)};
 for(let i=0;i<90;i++){s=step(s,undefined,1/60);if(a(s).repair){expect(a(s).repair!.speed).toBeLessThanOrEqual(14);expect(()=>encodeSave(s,1,world)).not.toThrow();}}
 expect(a(s).repair?.phase).toBe('out');
});

it('completes eight seconds of on-site work on the fractional fixed-tick boundary',()=>{
 const doc=compileDreamScene(source.replace('seconds=2','seconds=8'),{sceneId:'clock',revisionId:'r1',sourceHash:'clock'});let s={...createCarAtSpawn(doc),broken:['yard_table']};
 const tick=()=>{s=stepCommerce({...s,timeS:s.timeS+1/120},{},1/120,doc);};
 for(let i=0;i<2000 && a(s).repair?.phase!=='work';i++)tick();expect(a(s).repair?.progressS).toBeCloseTo(.25);
 for(let i=0;i<31*30;i++)tick();expect(s.economy!.repaired.yard_tables).toBe(1);expect(s.broken).toEqual([]);checkEconomyState(s,doc);
});

it('routes talk to an available person instead of a worker whose program is suspended',()=>{
 const busy={...step(start()),x:620,y:730};expect(nearbyNpc(busy,scene)?.id).toBe('neighbor');
 const npcs=stepNpcs(busy,.25,scene,true);expect(npcs.find(n=>n.id==='neighbor')!.known).toBe(true);expect(npcs.find(n=>n.id==='customer')!.known).toBe(false);
});
