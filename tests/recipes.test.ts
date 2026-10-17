import {expect,it} from 'vitest';
import source from '../docs/examples/multi-input-work.dream?raw';
import {compileDreamScene,compileDreamWorld,formatDream,checkDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {createCarAtSpawn,resetCar,type CarState} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason,type CommerceAction} from '../src/sim/commerce';
import {toggleRide} from '../src/sim/interaction';
import {encodeSave,decodeSave} from '../src/sim/save';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {dreamAgentContext} from '../src/scene/dream-agent';
const scene=compileDreamScene(source,{sceneId:'recipes',revisionId:'r1',sourceHash:'recipes'});
const start=(doc=scene):CarState=>({...createCarAtSpawn(doc),control:{kind:'foot'},x:580,y:750,elevation:0,surface:'paper'});
const step=(s:CarState,action?:CommerceAction,dt=.25,doc=scene)=>stepCommerce({...s,timeS:s.timeS+dt},{commerce:action},dt,doc);
const a=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const stock=(s:CarState)=>s.economy!.markets[0]!.stock;
const manual=()=>parseScene({...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>({...a,work:undefined}))}});
it('compiles, formats and exposes bounded ingredients in the commerce agent packet',()=>{
 expect(scene.economy!.jobs[0]!.ingredients).toEqual([{good:'bread',take:1},{good:'vegetables',take:1}]);
 expect(formatDream(formatDream(source))).toBe(formatDream(source));
 expect(dreamAgentContext(['commerce']).contract.commands).toHaveProperty('ingredient');
 for(const replacement of [
  'ingredient(good=bread,take=1);ingredient(good=bread,take=1);',
  'ingredient(good=missing,take=1);','ingredient(good=lunch,take=1);',
  'ingredient(good=bread,take=0);','ingredient(good=bread,take=17);',
  'ingredient(good=bread,take=1);'.repeat(5),''
 ])expect(()=>compileDreamWorld(source.replace('ingredient(good=bread,take=1);\n  ingredient(good=vegetables,take=1);',replacement))).toThrow();
 expect(()=>compileDreamWorld(source.replace('output=lunch','input=bread,take=1,output=lunch'))).toThrow('never both');
 expect(()=>compileDreamWorld(source.replace('output=lunch','take=1,output=lunch').replace('{\n  ingredient(good=bread,take=1);\n  ingredient(good=vegetables,take=1);\n }',';'))).toThrow('input and take');
 const bad=checkDream(source.replace('good=vegetables,take=1','good=missing,take=1'));expect(bad.ok).toBe(false);if(!bad.ok)expect(bad.diagnostics[0]!.path).toContain('/ingredient/good');
});
it('reserves both inputs and wage atomically, with output only at completion',()=>{
 const doc=manual(),initial=start(doc);let s=step(initial,{kind:'work',job:'pack_lunch'},.25,doc);
 expect(stock(s)).toMatchObject({bread:7,vegetables:7,lunch:0});expect(a(s).credits).toBe(20);checkEconomyState(s,doc);
 for(let i=0;i<7;i++)s=step(s,undefined,.25,doc);
 expect(stock(s)).toMatchObject({bread:7,vegetables:7,lunch:1});expect(a(s).credits).toBe(23);expect(s.economy!.batches.pack_lunch).toBe(1);checkEconomyState(s,doc);expect(stock(initial)).toMatchObject({bread:8,vegetables:8,lunch:0});
 s=step(s,{kind:'buy',market:'corner',good:'lunch'},.25,doc);s=step(s,{kind:'eat',good:'lunch'},.25,doc);expect(a(s).satiety).toBe(100);expect(s.economy!.consumed.lunch).toBe(1);checkEconomyState(s,doc);
});
it('rejects a missing later ingredient without deducting the first ingredient or wage',()=>{
 const doc=parseScene({...manual(),economy:{...manual().economy!,markets:scene.economy!.markets.map(m=>({...m,lots:m.lots.map(l=>l.good==='vegetables' ? {...l,quantity:0} : l)}))}}),initial=start(doc);
 expect(commerceReason(initial,doc,'pocket',{kind:'work',job:'pack_lunch'})).toBe('input');const next=step(initial,{kind:'work',job:'pack_lunch'},.25,doc);
 expect(stock(next)).toEqual(stock(initial));expect(next.economy!.markets[0]!.credits).toBe(initial.economy!.markets[0]!.credits);expect(a(next).work).toBeUndefined();checkEconomyState(next,doc);
});
it('returns every reserved input exactly once on cancel, moving away, boarding and recovery',()=>{
 const doc=manual();for(const mode of ['cancel','move','board','reset']){let s=step(start(doc),{kind:'work',job:'assemble_kit'},.25,doc);expect(stock(s)).toMatchObject({boards:6,fasteners:7,kit:0});
  if(mode==='move')s={...s,x:1000};if(mode==='board')s={...s,control:{kind:'car'}};if(mode==='reset')s=resetCar(s,doc);
  s=step(s,mode==='cancel' ? {kind:'cancel'} : undefined,.01,doc);s=step(s,{kind:'cancel'},.25,doc);
  expect(stock(s)).toMatchObject({boards:8,fasteners:8,kit:0});expect(a(s).credits).toBe(20);expect(s.economy!.markets[0]!.credits).toBe(100);checkEconomyState(s,doc);
 }
});
it('keeps the second ingredient refund place unavailable to another seller',()=>{
 const base=manual(),doc=parseScene({...base,economy:{...base.economy!,accounts:base.economy!.accounts.map(a=>a.id==='cook' ? {...a,shop:true,credits:2,satiety:25} : a),markets:[{id:'supply',label:'Produce source',actor:'customer',credits:0,radius:70,lots:[{id:'greens',good:'vegetables',quantity:1,limit:1,price:1}]},...base.economy!.markets.map(m=>({...m,lots:m.lots.map(l=>l.good==='vegetables' ? {...l,limit:8} : l)}))]}});
 const s=step(start(doc),{kind:'work',job:'pack_lunch'},.25,doc),corner=s.economy!.markets.find(m=>m.id==='corner')!;
 // The cook buys from the first source through the normal NPC transaction.
 expect(a(s,'cook').inventory.vegetables).toBe(1);expect(corner.stock.vegetables).toBe(7);checkEconomyState(s,doc);
 expect(commerceReason(s,doc,'cook',{kind:'sell',market:'corner',good:'vegetables'})).toBe('capacity');
 const cancelled=step(s,{kind:'cancel'},.25,doc);expect(cancelled.economy!.markets.find(m=>m.id==='corner')!.stock.vegetables).toBe(8);checkEconomyState(cancelled,doc);
});
it('uses the same recipe reservations and finite inputs for an automatic NPC',()=>{
 let s=start();for(let i=0;i<24;i++)s=step(s);
 expect(s.economy!.batches.pack_lunch).toBe(2);expect(stock(s)).toMatchObject({bread:6,vegetables:6,lunch:2});expect(a(s,'cook').credits).toBe(6);checkEconomyState(s,scene);
});
it('restores an in-progress multi-input job, completes it once and rejects forged supplies',()=>{
 const doc=manual(),world={scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(4000,2400),carRadius:11};let s=step({...toggleRide(createCarAtSpawn(doc),world),x:580,y:750,elevation:0},{kind:'work',job:'assemble_kit'},.25,doc);
 const saved=encodeSave(s,42,world),copy=decodeSave(saved,world);expect(copy.state).toEqual(s);expect(copy.worldTime).toBe(42);s=copy.state;
 for(let i=0;i<8;i++)s=step(s,undefined,.25,doc);expect(stock(s)).toMatchObject({boards:6,fasteners:7,kit:1});expect(a(s).credits).toBe(23);checkEconomyState(s,doc);
 const forged=JSON.parse(saved);forged.state.economy.markets[0].stock.fasteners++;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');
});
