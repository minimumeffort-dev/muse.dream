import {it,expect} from 'vitest';
import source from '../docs/examples/orchard-replanting.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {encodeSave,decodeSave} from '../src/sim/save';
import {resetCar} from '../src/sim/car';
import {actorPose,repairForActor} from '../src/sim/actors';
import {advanceGrowth} from '../src/sim/growth';
import {repairTargets} from '../src/sim/repair';
import {growthScale} from '../src/scene/growth';
import {objectContacts,queryStaticContacts} from '../src/scene/contacts';
import {createCarAtSpawn,carFootprintClear,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {breakOnContact,advanceImpactMotion} from '../src/sim/impacts';
const identity={sceneId:'orchard',revisionId:'r1',sourceHash:'orchard'},scene=compileDreamScene(source,identity),tree=scene.objects.find(o=>o.id==='remote_tree')!;
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const start=():CarState=>({...createCarAtSpawn(scene),control:{kind:'foot'},vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}],x:560,y:740,elevation:0,surface:'paper',broken:[tree.id]});
const step=(s:CarState)=>stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);
function planted(){let s=start();for(let i=0;i<1000 && !s.growing?.length;i++)s=step(s);expect(s.growing).toHaveLength(1);return s;}
it('compiles bounded planting and ordered service choices with precise rejected fields',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(scene.economy!.accounts.find(a=>a.id==='regular')!.repairs).toEqual(['yard_furniture','tree_care']);
 for(const bad of [source.replace('regrow_s=30','regrow_s=29'),source.replace('seed_scale=.2','seed_scale=.9'),source.replace('regrow_s=30,',''),source.replace('kind=tree,input=sapling','kind=table,input=sapling'),source.replace('repairs=[yard_furniture,tree_care]','repairs=[tree_care,tree_care]'),source.replace('repairs=[yard_furniture,tree_care]','repair=tree_care,repairs=[tree_care]')])expect(()=>compileDreamScene(bad,identity)).toThrow();
});
it('gives a shared-duty worker the same moving body and work pose as its saved journey',()=>{
 let s=start();const actor=scene.objects.find(o=>o.id==='customer')!;let moved=false,worked=false;
 for(let i=0;i<1000 && !s.growing?.length;i++){s=step(s);const task=s.economy!.accounts.find(a=>a.id==='regular')!.repair;if(!task)continue;
  const pose=actorPose(scene,actor,s.timeS,s);expect(repairForActor(s,scene,actor.id)).toBe(task);expect([pose.x,pose.y,pose.headingRad,pose.speed]).toEqual([task.x,task.y,task.headingRad,task.speed]);
  expect(pose.activity).toBe(task.phase==='work' ? 'perform' : 'patrol');moved ||= Math.hypot(pose.x-actor.x,pose.y-actor.y)>20;worked ||= task.phase==='work';
 }expect(moved).toBe(true);expect(worked).toBe(true);
});
it('uses a finite sapling and wage, returns home and grows the same tree to maturity',()=>{
 let s=planted();expect(s.broken).not.toContain(tree.id);expect(growthScale(scene,s,tree.id)).toBeCloseTo(.2);expect(s.economy!.markets[0]!.stock.sapling).toBe(1);expect(s.economy!.accounts.find(a=>a.id==='regular')!.credits).toBe(24);
 for(let i=0;i<500;i++){s=step(s);checkEconomyState(s,scene);}expect(s.growing).toEqual([]);expect(growthScale(scene,s,tree.id)).toBe(1);expect(s.economy!.accounts.find(a=>a.id==='regular')!.repair).toBeUndefined();expect(s.economy!.repaired.tree_care).toBe(1);
});
it('grows matching contacts, waits for a safely standing player and resumes when space clears',()=>{
 let s=planted();const mature=objectContacts(scene,tree)[0]!,young=queryStaticContacts(scene,tree.x,tree.y,1,s).find(c=>c.id===tree.id)!;expect(young.r).toBeCloseTo(mature.r*.2);expect(young.top).toBeCloseTo(mature.top*.2);
 s={...s,x:tree.x+young.r+4+.1001,y:tree.y};expect(carFootprintClear({...world,carRadius:4,bodyHeight:18},s.x,s.y,0,s.timeS,s)).toBe(true);const progress=s.growing![0]!.progressS;for(let i=0;i<12;i++)s=step(s);expect(s.growing![0]!.progressS).toBe(progress);
 s={...s,x:560,y:740};s=step(s);expect(s.growing![0]!.progressS).toBeGreaterThan(progress);checkEconomyState(s,scene);
});
it('destroys a growing tree at its current size without restarting its growth or enlarging debris',()=>{
 let s=planted();s={...s,control:{kind:'car'},vehicles:[],x:tree.x-20,y:tree.y,vx:300,vy:0};const contacts=queryStaticContacts(scene,tree.x,tree.y,1,s).filter(c=>c.id===tree.id);breakOnContact(s,world,tree.x-10,tree.y,contacts);expect(s.broken).toContain(tree.id);expect(s.growing).toEqual([]);expect(s.debris).toHaveLength(1);expect(s.debris[0]!.sizeScale).toBeCloseTo(.2);
 for(let i=0;i<240;i++)advanceImpactMotion(s,world,1/120,false);expect(s.debris[0]!.settled).toBe(true);expect(s.debris[0]!.topple!.pivot[0]-tree.x).toBeCloseTo(tree.scale*4*.2);expect(s.growing).toEqual([]);
});

it('lets the player plant using the same stock, wages and current-size restoration rules',()=>{
 let s=start();s=stepCommerce({...s,timeS:.25},{commerce:{kind:'repair',repair:'tree_care'}},.25,scene);const player=s.economy!.accounts.find(a=>a.id==='pocket')!;expect(player.repair?.id).toBe('tree_care');expect(s.economy!.accounts.find(a=>a.id==='regular')!.repair).toBeUndefined();
 s={...s,x:player.repair!.at.x,y:player.repair!.at.y};for(let i=0;i<8;i++)s=step(s);expect(s.growing).toHaveLength(1);expect(s.economy!.accounts.find(a=>a.id==='pocket')!.credits).toBe(24);expect(s.economy!.markets[0]!.stock.sapling).toBe(1);checkEconomyState(s,scene);
});
it('skips an unaffordable priority service, then plants without losing either material ledger',()=>{
 const empty=compileDreamScene(source.replace('good=kit,quantity=3,limit=3','good=kit,quantity=0,limit=3'),identity);let s:CarState={...start(),economy:createCarAtSpawn(empty).economy,broken:['yard_crate',tree.id]};
 for(let i=0;i<1000 && !s.growing?.length;i++){s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,empty);checkEconomyState(s,empty);}expect(s.broken).toEqual(['yard_crate']);expect(s.growing).toHaveLength(1);expect(s.economy!.repaired.yard_furniture).toBe(0);expect(s.economy!.repaired.tree_care).toBe(1);expect(s.economy!.markets[0]!.stock.kit).toBe(0);
});
it('round-trips growth, blockers and re-destruction sizes through saves and recovery',()=>{
 let s=planted();for(let i=0;i<5;i++)s=step(s);const saved=encodeSave(s,s.timeS,world),copy=decodeSave(saved,world).state;expect(copy.growing).toEqual(s.growing);expect(copy.economy).toEqual(s.economy);expect(resetCar(copy,scene).growing).toEqual(s.growing);expect(resetCar(copy,scene,true).growing).toBeUndefined();
 let b=copy;for(let i=0;i<20;i++){s=step(s);b=step(b);}expect(b).toEqual(s);
 for(const change of [(p:any)=>p.state.growing[0].progressS=30,(p:any)=>p.state.growing[0].serviceId='yard_furniture',(p:any)=>p.state.growing.push(p.state.growing[0]),(p:any)=>p.state.broken.push(tree.id),(p:any)=>p.version=7]){const p=JSON.parse(saved);change(p);expect(()=>decodeSave(JSON.stringify(p),world)).toThrow();}
 const free=JSON.parse(saved);free.state.economy.repaired.tree_care=0;free.state.economy.markets[0].stock.sapling++;expect(()=>decodeSave(JSON.stringify(free),world)).toThrow();
 s={...s,control:{kind:'car'},vehicles:[],x:tree.x-20,y:tree.y,vx:300,vy:0};breakOnContact(s,world,tree.x-10,tree.y,queryStaticContacts(scene,tree.x,tree.y,1,s));const restored=decodeSave(encodeSave(s,s.timeS,world),world).state;expect(restored.debris).toEqual(s.debris);expect(restored.growing).toEqual([]);
});

it('reserves the bounded growth capacity before collecting supplies and releases it at maturity',()=>{
 const crowded=compileDreamScene(source.replace('good=sapling,quantity=2,limit=2','good=sapling,quantity=34,limit=34').replace('actor=neighbor,credits=100','actor=neighbor,credits=500')+Array.from({length:31},(_,i)=>`\nplace seed_${i}(object=rowan,at=[${900+i*14},920],role=prop);`).join(''),identity),r=crowded.economy!.repairs.find(r=>r.id==='tree_care')!,targets=repairTargets(crowded,r);
 expect(targets).toHaveLength(33);let s:CarState={...start(),timeS:1000,economy:createCarAtSpawn(crowded).economy,broken:[targets[32]!.objectId],growing:targets.slice(0,32).map((t,i)=>({objectId:t.objectId,serviceId:r.id,plantedAtS:0,progressS:i===0 ? 29.9 : 0}))};const e=s.economy!;e.atS=1000;e.repaired.tree_care=32;e.markets[0]!.stock.sapling=2;e.markets[0]!.credits-=128;e.accounts.find(a=>a.id==='regular')!.credits+=128;checkEconomyState(s,crowded);
 expect(commerceReason(s,crowded,'pocket',{kind:'repair',repair:r.id})).toBe('capacity');s=advanceGrowth(s,.25,crowded);expect(s.growing).toHaveLength(31);expect(commerceReason(s,crowded,'pocket',{kind:'repair',repair:r.id})).toBeUndefined();checkEconomyState(s,crowded);
});
