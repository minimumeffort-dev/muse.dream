import {it,expect} from 'vitest';
import source from '../docs/examples/timber-recovery.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {breakOnContact} from '../src/sim/impacts';
import {queryStaticContacts} from '../src/scene/contacts';
import {advanceGrowth} from '../src/sim/growth';
import {encodeSave,decodeSave,SAVE_VERSION} from '../src/sim/save';
import {navigationTarget} from '../src/game/navigation';
import type {Scene} from '../src/scene/schema';
const identity={sceneId:'timber',revisionId:'r1',sourceHash:'timber'},scene=compileDreamScene(source,identity),tree=scene.objects.find(o=>o.id==='remote_tree')!;
const world=(s=scene):World=>({scene:s,roadMask:buildMaskForScene(s),driveMask:buildPaperMask(s.canonical.width,s.canonical.height),carRadius:11});
const start=(s=scene):CarState=>({...createCarAtSpawn(s),control:{kind:'foot'},vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}],x:560,y:740,elevation:0,surface:'paper',broken:[tree.id]});
const step=(s:CarState,doc=scene,action?:import('../src/sim/commerce').CommerceAction)=>stepCommerce({...s,timeS:s.timeS+.25},{commerce:action},.25,doc);
const a=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const stock=(s:CarState)=>s.economy!.markets[0]!.stock;
function playerAtTask(doc=scene){let s=step(start(doc),doc,{kind:'repair',repair:'tree_care'});expect(a(s).repair?.recover).toBe(true);return {...s,x:a(s).repair!.at.x,y:a(s).repair!.at.y};}
function playerComplete(doc=scene){let s=playerAtTask(doc);for(let i=0;i<8;i++)s=step(s,doc);expect(a(s).repair?.phase).toBe('home');return s;}

it('compiles bounded recovery pairs, existing output lots and canonical field order',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(scene.economy!.repairs.find(r=>r.id==='tree_care')).toMatchObject({recover:'boards',amount:1});
 for(const [from,to] of [['recover=boards,amount=1','recover=boards'],['recover=boards,amount=1','amount=1'],['amount=1','amount=0'],['amount=1','amount=33'],['recover=boards','recover=missing'],['recover=boards','recover=lunch']] as const)expect(()=>compileDreamScene(source.replace(from,to),identity)).toThrow();
});
it('recovers once, carries timber home and deposits it without another wage or input',()=>{
 let s=start(),sawCargo=false,completed=false;const beforeCredits=a(s,'regular').credits;
 for(let i=0;i<1200;i++){
  s=step(s);checkEconomyState(s,scene);const worker=a(s,'regular');
  if(worker.repair?.phase==='home' && worker.repair.recover){sawCargo=true;expect(stock(s).boards).toBe(0);expect(worker.credits).toBe(beforeCredits+4);expect(s.economy!.recovered!.tree_care).toBe(1);}
  if(s.economy!.recovered!.tree_care===1 && !worker.repair){completed=true;break;}
 }
 expect(sawCargo).toBe(true);expect(completed).toBe(true);expect(stock(s).boards).toBe(1);expect(stock(s).sapling).toBe(1);expect(a(s,'regular').credits).toBe(beforeCredits+4);expect(s.economy!.repaired.tree_care).toBe(1);
});
it('keeps player recovery sealed through R, forbids abandoning it and returns it once at the counter',()=>{
 let s=playerComplete();expect(stock(s).boards).toBe(0);expect(a(s).credits).toBe(24);expect(commerceReason(s,scene,'pocket',{kind:'deliver'})).toBe('range');
 const guide=navigationTarget(s,scene);expect(guide).toMatchObject({kind:'delivery',x:580,y:710});
 const cancelled=step(s,scene,{kind:'cancel'});expect(a(cancelled).repair).toEqual(a(s).repair);expect(stock(cancelled).boards).toBe(0);s=resetCar(cancelled,scene);expect(a(s).repair?.recover).toBe(true);
 s=step({...s,control:{kind:'foot'},x:560,y:740,elevation:0},scene,{kind:'deliver'});expect(a(s).repair).toBeUndefined();expect(stock(s).boards).toBe(1);expect(a(s).credits).toBe(24);expect(navigationTarget(s,scene)).toBeUndefined();
 s=step(s,scene,{kind:'deliver'});expect(stock(s).boards).toBe(1);expect(a(s).credits).toBe(24);checkEconomyState(s,scene);
});
it('reserves output space and refunds interrupted recovery without generating timber',()=>{
 let s=step(start(),scene,{kind:'repair',repair:'tree_care'});expect(a(s).repair?.recover).toBe(true);s=step(s,scene,{kind:'cancel'});expect(a(s).repair).toBeUndefined();expect(stock(s).sapling).toBe(2);expect(s.economy!.recovered!.tree_care).toBe(0);expect(stock(s).boards).toBe(0);expect(a(s).credits).toBe(20);checkEconomyState(s,scene);
});
it('still replants when timber storage is full, without minting or discarding tracked stock',()=>{
 const full=compileDreamScene(source.replace('good=boards,quantity=0,limit=8','good=boards,quantity=8,limit=8'),identity);let s=step(start(full),full,{kind:'repair',repair:'tree_care'});expect(a(s).repair?.recover).toBeUndefined();s={...s,x:a(s).repair!.at.x,y:a(s).repair!.at.y};for(let i=0;i<8;i++)s=step(s,full);
 expect(a(s).repair).toBeUndefined();expect(s.growing).toHaveLength(1);expect(stock(s).boards).toBe(8);expect(s.economy!.recovered!.tree_care).toBe(0);checkEconomyState(s,full);
});
it('does not recover mature timber from a felled sapling, and renews the source only after actual growth',()=>{
 let s=playerComplete();expect(s.economy!.recoverySpent).toContain(tree.id);
 const young={...s,control:{kind:'car'} as const,vehicles:[],x:tree.x-20,y:tree.y,vx:300,vy:0};breakOnContact(young,world(),tree.x-10,tree.y,queryStaticContacts(scene,tree.x,tree.y,1,young));expect(young.broken).toContain(tree.id);expect(young.growing).toEqual([]);expect(young.economy!.recoverySpent).toContain(tree.id);
 // Finish the prior physical return before taking the next repair.
 let next=step({...young,control:{kind:'foot'},x:560,y:740,vx:0,vy:0,elevation:0},scene,{kind:'deliver'});next=step(next,scene,{kind:'repair',repair:'tree_care'});expect(a(next).repair?.recover).toBeUndefined();checkEconomyState(next,scene);
 s=step({...s,x:560,y:740},scene,{kind:'deliver'});for(let i=0;i<140;i++)s=step(s);expect(s.growing).toEqual([]);expect(s.economy!.recoverySpent).not.toContain(tree.id);checkEconomyState(s,scene);
});
it('keeps sealed output and reserved capacity while a closed return counter makes an NPC wait',()=>{
 const closed=compileDreamScene(source.replace('actor=neighbor,credits=100,radius=70','actor=neighbor,credits=100,radius=70,hours=[6,22]'),identity);let s=start(closed),waited=false;
 for(let i=0;i<1400;i++){s=step(s,closed);checkEconomyState(s,closed);if(a(s,'regular').repair?.phase==='home' && s.timeS<200 && a(s,'regular').repair!.path.length===0){waited=true;expect(stock(s).boards).toBe(0);}if(stock(s).boards===1)break;}
 expect(waited).toBe(true);expect(s.timeS).toBeGreaterThanOrEqual(200);expect(stock(s).boards).toBe(1);expect(a(s,'regular').credits).toBe(24);
});
it('rejects extra output, growing-source eligibility and unknown source membership',()=>{
 const s=playerComplete();for(const alter of [(p:CarState)=>p.economy!.recovered!.tree_care=2,(p:CarState)=>p.economy!.recoverySpent=[],(p:CarState)=>p.economy!.recoverySpent=['missing']]){const copy=structuredClone(s);alter(copy);expect(()=>checkEconomyState(copy,scene)).toThrow();}
 const clear=advanceGrowth({...s,timeS:s.timeS+31,x:560,y:740},31,scene);expect(clear.economy!.recoverySpent).not.toContain(tree.id);expect(s.economy!.recoverySpent).toContain(tree.id);
});

it('round-trips reservation, sealed return cargo and immature sources through current saves',()=>{
 let s=playerAtTask();for(const stage of ['reserved','cargo'] as const){if(stage==='cargo')s=playerComplete();const text=encodeSave(s,s.timeS,world()),restored=decodeSave(text,world()).state;expect(restored).toEqual(JSON.parse(text).state);expect(restored.economy!.recoverySpent).toEqual(s.economy!.recoverySpent);const old=JSON.parse(text);old.version=18;expect(()=>decodeSave(JSON.stringify(old),world())).toThrow('supported');}
 expect(SAVE_VERSION).toBe(19);
});
it('uses the same physical return contract for repaired furniture',()=>{
 const doc=compileDreamScene(source.replace('kind=custom,input=kit','kind=custom,recover=boards,amount=1,input=kit'),identity);let s=step({...start(doc),broken:['yard_crate']},doc,{kind:'repair',repair:'yard_furniture'});expect(a(s).repair?.recover).toBe(true);s={...s,x:a(s).repair!.at.x,y:a(s).repair!.at.y};for(let i=0;i<8;i++)s=step(s,doc);
 expect(a(s).repair?.phase).toBe('home');expect(s.economy!.recovered).toMatchObject({yard_furniture:1,tree_care:0});expect(stock(s).boards).toBe(0);s=step({...s,x:560,y:740},doc,{kind:'deliver'});expect(stock(s).boards).toBe(1);expect(stock(s).kit).toBe(2);checkEconomyState(s,doc);
});
it('protects promised shelf space from production and skips recovery when a bag cannot fit the output',()=>{
 const doc=compileDreamScene(source.replace('good=boards,quantity=0,limit=8','good=boards,quantity=7,limit=8').replace(' work bake(', ' work unpack(label="Unpack kit",market=corner,input=kit,take=1,output=boards,make=1,seconds=1,pay=1,effort=1,capacity=1,target=8);\n work bake('),identity);let s=start(doc);expect(commerceReason(s,doc,'baker',{kind:'work',job:'unpack'})).toBeUndefined();s=step(s,doc,{kind:'repair',repair:'tree_care'});expect(a(s).repair?.recover).toBe(true);expect(commerceReason(s,doc,'baker',{kind:'work',job:'unpack'})).toBe('capacity');checkEconomyState(s,doc);
 const small=compileDreamScene(source.replace('capacity=8,satiety=40','capacity=1,satiety=40').replace('amount=1','amount=2'),identity);const carrying=step(start(small),small,{kind:'repair',repair:'tree_care'});expect(a(carrying).repair?.id).toBe('tree_care');expect(a(carrying).repair?.recover).toBeUndefined();checkEconomyState(carrying,small);
});
it('feeds physically recovered timber into the existing paid kit recipe',()=>{
 const doc=compileDreamScene(source.replace(' good boards(label="Timber boards");',' good boards(label="Timber boards");\n good fasteners(label="Fasteners");').replace('good=kit,quantity=3,limit=3','good=kit,quantity=3,limit=4').replace('lot recovered_wood(good=boards,quantity=0,limit=8);','lot recovered_wood(good=boards,quantity=0,limit=8);\n lot hardware(good=fasteners,quantity=1,limit=1);').replace('  work bake(', '  work kit_make(label="Assemble kit",market=corner,output=kit,make=1,seconds=1,pay=3,effort=1,capacity=1,target=4){ingredient(good=boards,take=1);ingredient(good=fasteners,take=1);}\n  work bake('),identity);
 let s=playerComplete(doc);s=step({...s,x:560,y:740},doc,{kind:'deliver'});expect(stock(s).boards).toBe(1);s=step(s,doc,{kind:'work',job:'kit_make'});expect(a(s).work?.id).toBe('kit_make');expect(stock(s).boards).toBe(0);for(let i=0;i<4;i++)s=step(s,doc);expect(stock(s).kit).toBe(4);expect(stock(s).fasteners).toBe(0);expect(a(s).credits).toBe(27);expect(s.economy!.batches.kit_make).toBe(1);checkEconomyState(s,doc);
});
