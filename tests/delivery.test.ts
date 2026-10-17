import {it,expect} from 'vitest';
import source from '../docs/examples/market-delivery.dream?raw';
import {compileDreamScene,compileDreamWorld,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason,deliveryTarget} from '../src/sim/commerce';
import {parseScene} from '../src/scene/schema';
const scene=compileDreamScene(source,{sceneId:'delivery',revisionId:'r1',sourceHash:'delivery'});
const start=()=>({...createCarAtSpawn(scene),control:{kind:'foot' as const},x:580,y:750,elevation:0,surface:'paper' as const});
const step=(s:CarState,commerce?:Parameters<typeof stepCommerce>[1]['commerce'],dt=.25,doc=scene)=>stepCommerce({...s,timeS:s.timeS+dt},{commerce},dt,doc);
const pocket=(s:CarState)=>s.economy!.accounts[0]!,stock=(s:CarState,id:string)=>s.economy!.markets.find(m=>m.id===id)!;
it('compiles the reusable delivery declaration and rejects references, bounds and overlapping destinations',()=>{
 expect(scene.economy!.deliveries[0]!.quantity).toBe(2);expect(formatDream(formatDream(source))).toBe(formatDream(source));
 expect(()=>compileDreamWorld(source.replace('to=lunch_counter','to=missing'))).toThrow('destination');
 expect(()=>compileDreamWorld(source.replace('quantity=2,pay=4','quantity=33,pay=4'))).toThrow();
 expect(()=>compileDreamScene(source.replace('at=[1100,730]','at=[620,730]'),{sceneId:'bad',revisionId:'r1',sourceHash:'bad'})).toThrow('separate interaction');
});
it('reserves actual cargo, destination wages and both shelves, then pays only at the destination',()=>{
 const before=start(),copy=structuredClone(before);let s=step(before,{kind:'collect',delivery:'lunch_run'});
 expect(pocket(s).credits).toBe(20);expect(pocket(s).inventory.bread).toBe(0);expect(stock(s,'corner').stock.bread).toBe(5);expect(stock(s,'lunch_counter').credits).toBe(36);expect(stock(s,'lunch_counter').stock.bread).toBe(0);checkEconomyState(s,scene);expect(before).toEqual(copy);
 expect(commerceReason(s,scene,'pocket',{kind:'deliver'})).toBe('range');expect(commerceReason(s,scene,'pocket',{kind:'sell',market:'corner',good:'bread'})).toBe('busy');
 s=step({...s,x:1100,y:750},{kind:'deliver'});expect(pocket(s).credits).toBe(24);expect(pocket(s).delivery).toBeUndefined();expect(stock(s,'lunch_counter').stock.bread).toBe(2);expect(s.economy!.delivered.lunch_run).toBe(1);checkEconomyState(s,scene);
 s=step(s,{kind:'deliver'});expect(pocket(s).credits).toBe(24);expect(s.economy!.delivered.lunch_run).toBe(1);
 for(let i=0;i<8;i++)s=step(s);expect(s.economy!.accounts.find(a=>a.id==='lunch_staff')!.satiety).toBeGreaterThan(60);expect(stock(s,'lunch_counter').stock.bread).toBe(1);checkEconomyState(s,scene);
});
it('keeps cargo through travel, vehicle ownership and R, and resets it on Start over',()=>{
 let s=step(start(),{kind:'collect',delivery:'lunch_run'}),cargo=pocket(s).delivery;
 s=step({...s,x:1800,control:{kind:'car'}});expect(pocket(s).delivery).toEqual(cargo);expect(deliveryTarget(s,scene)?.market.id).toBe('lunch_counter');
 s=step(resetCar(s,scene));expect(pocket(s).delivery).toEqual(cargo);expect(resetCar(s,scene,true).economy).toEqual(createCarAtSpawn(scene).economy);
});
it('refunds cargo and wages exactly once, even after travelling away',()=>{
 let s=step(start(),{kind:'collect',delivery:'lunch_run'});s=step({...s,x:1800,control:{kind:'car'}},{kind:'cancel'});
 expect(pocket(s).delivery).toBeUndefined();expect(pocket(s).credits).toBe(20);expect(stock(s,'corner').stock.bread).toBe(7);expect(stock(s,'lunch_counter').credits).toBe(40);checkEconomyState(s,scene);
 const copy=structuredClone(s.economy);s=step(s,{kind:'cancel'});expect(s.economy!.markets).toEqual(copy!.markets);expect(s.economy!.delivered.lunch_run).toBe(0);
});
it('rejects full bags, full recipients and unaffordable or overbooked shipments without partial reservation',()=>{
 const s=start();pocket(s).inventory.bread=7;expect(commerceReason(s,scene,'pocket',{kind:'collect',delivery:'lunch_run'})).toBe('full');
 pocket(s).inventory.bread=0;stock(s,'lunch_counter').credits=3;expect(commerceReason(s,scene,'pocket',{kind:'collect',delivery:'lunch_run'})).toBe('treasury');
 stock(s,'lunch_counter').credits=40;stock(s,'lunch_counter').stock.bread=7;expect(commerceReason(s,scene,'pocket',{kind:'collect',delivery:'lunch_run'})).toBe('capacity');
 const valid=step(start(),{kind:'collect',delivery:'lunch_run'}),a=valid.economy!.accounts.find(a=>a.id==='baker')!;a.delivery={...pocket(valid).delivery!};expect(()=>checkEconomyState(valid,scene)).toThrow();
});
it('rejects missing, future, oversized, mixed or unbacked cargo on restore',()=>{
 const valid=step(start(),{kind:'collect',delivery:'lunch_run'});checkEconomyState(valid,scene);
 for(const mutate of [(s:CarState)=>{pocket(s).delivery!.id='missing';},(s:CarState)=>{pocket(s).delivery!.startedAtS=999;},(s:CarState)=>{pocket(s).inventory.bread=7;},(s:CarState)=>{pocket(s).work={id:'bake',doneAtS:2};},(s:CarState)=>{stock(s,'corner').stock.bread!++;},(s:CarState)=>{s.economy!.delivered={};},(s:CarState)=>{s.economy!.delivered.lunch_run=1e9;}]){const s=structuredClone(valid);mutate(s);expect(()=>checkEconomyState(s,scene)).toThrow();}
});
it('retains capacity to refund cargo while other transactions and work use the same stock',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,markets:scene.economy!.markets.map(m=>m.id==='corner' ? {...m,lots:m.lots.map(l=>l.good==='bread' ? {...l,quantity:16} : l)} : m)}});
 let s=step({...start(),economy:createCarAtSpawn(doc).economy},{kind:'collect',delivery:'lunch_run'},.25,doc);checkEconomyState(s,doc);
 // The source has 13 units after the shopper buys one, with two reserved refund slots.
 expect(stock(s,'corner').stock.bread).toBe(13);s=step(s,{kind:'cancel'},.25,doc);expect(stock(s,'corner').stock.bread).toBe(15);checkEconomyState(s,doc);
});

it('rejects a reserved wage that would overflow its account even when total cash is conserved',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>a.actor==='player' ? {...a,credits:999996} : a)}});
 const state=step({...start(),economy:createCarAtSpawn(doc).economy},{kind:'collect',delivery:'lunch_run'},.25,doc);expect(pocket(state).delivery).toBeDefined();checkEconomyState(state,doc);
 pocket(state).credits++;stock(state,'corner').credits--;expect(()=>checkEconomyState(state,doc)).toThrow('Invalid saved delivery');
});

it('allows an owned meal during a delivery without consuming sealed cargo of the same good',()=>{
 let s=step(start(),{kind:'buy',market:'corner',good:'bread'});s=step(s,{kind:'collect',delivery:'lunch_run'});const cargo=structuredClone(pocket(s).delivery),before=pocket(s).satiety;
 s=step(s,{kind:'eat',good:'bread'});expect(pocket(s).satiety).toBeGreaterThan(before);expect(pocket(s).inventory.bread).toBe(0);expect(pocket(s).delivery).toEqual(cargo);checkEconomyState(s,scene);
});

it('escrows a finite supplier invoice, pays both parties once and refunds the whole reservation on cancel',()=>{
 const doc=compileDreamScene(source.replace('quantity=2,pay=4,capacity=1','quantity=2,pay=4,price=3,capacity=1'),{sceneId:'procurement',revisionId:'r1',sourceHash:'procurement'});
 const initial={...start(),economy:createCarAtSpawn(doc).economy};
 let s=step(initial,{kind:'collect',delivery:'lunch_run'},.25,doc);
 expect(stock(s,'lunch_counter').credits).toBe(30);expect(stock(s,'corner').credits).toBe(105);checkEconomyState(s,doc);
 const cancelled=step(s,{kind:'cancel'},.25,doc);expect(stock(cancelled,'lunch_counter').credits).toBe(40);expect(stock(cancelled,'corner').credits).toBe(105);checkEconomyState(cancelled,doc);
 s=step({...s,x:1100,y:750},{kind:'deliver'},.25,doc);expect(stock(s,'corner').credits).toBe(111);expect(pocket(s).credits).toBe(24);expect(stock(s,'lunch_counter').stock.bread).toBe(2);checkEconomyState(s,doc);
 s=step(s,{kind:'deliver'},.25,doc);expect(stock(s,'corner').credits).toBe(111);checkEconomyState(s,doc);
});
it('reserves supplier treasury headroom during other purchases and rejects an unaffordable invoice atomically',()=>{
 const doc=compileDreamScene(source.replace('quantity=2,pay=4,capacity=1','quantity=2,pay=4,price=3,capacity=1').replace('actor=neighbor,credits=100','actor=neighbor,credits=999994'),{sceneId:'limits',revisionId:'r1',sourceHash:'limits'});
 const initial={...start(),economy:createCarAtSpawn(doc).economy};
 // The hungry shopper has not bought yet; the reserved six-credit invoice fills the supplier treasury.
 expect(commerceReason(initial,doc,'pocket',{kind:'collect',delivery:'lunch_run'})).toBeUndefined();
 let s=step(initial,{kind:'collect',delivery:'lunch_run'},.25,doc);expect(commerceReason(s,doc,'regular',{kind:'buy',market:'corner',good:'bread'})).toBe('treasury');checkEconomyState(s,doc);
 stock(initial,'lunch_counter').credits=9;expect(commerceReason(initial,doc,'pocket',{kind:'collect',delivery:'lunch_run'})).toBe('treasury');
 const over=source.replace('quantity=2,pay=4,capacity=1','quantity=2,pay=999999,price=3,capacity=1');expect(()=>compileDreamWorld(over)).toThrow('invoice and wage');
});
