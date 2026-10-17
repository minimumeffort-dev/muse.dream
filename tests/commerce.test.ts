import {it,expect} from 'vitest';
import source from '../docs/examples/market-work.dream?raw';
import {compileDreamScene,compileDreamWorld,formatDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {createCarAtSpawn,resetCar,type CarState} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason,type CommerceAction} from '../src/sim/commerce';
import {dreamAgentContext} from '../src/scene/dream-agent';

const scene=compileDreamScene(source,{sceneId:'market',revisionId:'r1',sourceHash:'market-source'});
const start=(s=scene):CarState=>({...createCarAtSpawn(s),control:{kind:'foot'},x:580,y:750,elevation:0,surface:'paper'});
const step=(s:CarState,action?:CommerceAction,dt=.25,doc=scene)=>stepCommerce({...s,timeS:s.timeS+dt},{commerce:action},dt,doc);
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const market=(s:CarState)=>s.economy!.markets[0]!;

it('compiles, formats and scopes the complete bounded commerce example',()=>{
 expect(scene.economy!.goods.map(g=>g.id)).toEqual(['bread','flour']);expect(formatDream(formatDream(source))).toBe(formatDream(source));
 const packet=dreamAgentContext(['commerce']);expect(packet.contract.commands).toHaveProperty('work');expect(packet.instructions).toContain('## commerce');expect(packet.contract.commands).not.toHaveProperty('scenario');
 expect(()=>compileDreamWorld(source.replace('pay=3','pay=-3'))).toThrow('greater than');
 expect(()=>compileDreamWorld(source.replace('input=flour','input=missing'))).toThrow('input');
 expect(()=>compileDreamScene(source.replace('actor=neighbor,credits=100','actor=missing,credits=100'),{sceneId:'bad',revisionId:'r1',sourceHash:'bad'})).toThrow('stationary NPC');
});
it('uses the same finite stock and conserved money for player and NPC purchases and meals',()=>{
 const initial=start(),saved=structuredClone(initial);let s=step(initial,{kind:'buy',market:'corner',good:'bread'});
 expect(account(s).credits).toBe(15);expect(account(s).inventory.bread).toBe(1);expect(account(s,'regular').credits).toBe(15);expect(account(s,'regular').inventory.bread).toBe(1);expect(market(s).stock.bread).toBe(6);expect(market(s).credits).toBe(110);
 s=step(s,{kind:'eat',good:'bread'});expect(account(s).satiety).toBeCloseTo(84.975);expect(account(s).inventory.bread).toBe(0);
 for(let i=0;i<5;i++)s=step(s);expect(account(s,'regular').inventory.bread).toBe(0);expect(account(s,'regular').satiety).toBeGreaterThan(60);checkEconomyState(s,scene);expect(initial).toEqual(saved);
});
it('lets non-food goods be owned and sold back with conserved money',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,goods:scene.economy!.goods.map(g=>({...g,food:0}))}});let s=step(start(doc),{kind:'buy',market:'corner',good:'bread'},.25,doc);
 expect(account(s).inventory.bread).toBe(1);expect(commerceReason(s,doc,'pocket',{kind:'eat',good:'bread'})).toBe('not_food');
 s=step(s,{kind:'sell',market:'corner',good:'bread'},.25,doc);expect(account(s).credits).toBe(20);expect(account(s).inventory.bread).toBe(0);expect(market(s).stock.bread).toBe(8);checkEconomyState(s,doc);
});
it('keeps room for refunds while wages and input are reserved',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,markets:scene.economy!.markets.map(m=>({...m,credits:999_996}))}});let s=step(start(doc),{kind:'work',job:'bake'},.25,doc);
 expect(account(s,'regular').inventory.bread).toBe(0);expect(market(s).credits).toBe(999_993);
 s=step(s,{kind:'cancel'},.25,doc);expect(market(s).credits).toBe(999_996);expect(market(s).stock.flour).toBe(12);checkEconomyState(s,doc);
});
it('reserves wages, input and output room, then completes one paid batch including its initiating step',()=>{
 let s=step(start(),{kind:'work',job:'bake'});expect(account(s).work?.doneAtS).toBe(2);expect(market(s).credits).toBe(102);expect(market(s).stock.flour).toBe(11);expect(account(s).credits).toBe(20);checkEconomyState(s,scene);
 for(let i=0;i<7;i++)s=step(s);expect(s.timeS).toBe(2);expect(account(s).work).toBeUndefined();expect(account(s).credits).toBe(23);expect(market(s).stock.bread).toBe(9);expect(s.economy!.batches.bake).toBe(1);expect(account(s).satiety).toBeCloseTo(27.9);checkEconomyState(s,scene);
});
it('refunds exactly once on cancellation, moving away, boarding or R; Start over resets the economy',()=>{
 for(const mode of ['cancel','move','board','reset'] as const){let s=step(start(),{kind:'work',job:'bake'});
  if(mode==='move')s={...s,x:1000};if(mode==='board')s={...s,control:{kind:'car'}};if(mode==='reset')s=resetCar(s,scene);
  s=step(s,mode==='cancel' ? {kind:'cancel'} : undefined,.01);expect(account(s).work).toBeUndefined();expect(market(s).stock.flour).toBe(12);expect(market(s).credits).toBe(105);expect(account(s).credits).toBe(20);checkEconomyState(s,scene);
  s=step(s,{kind:'cancel'});expect(market(s).stock.flour).toBe(12);expect(market(s).credits).toBe(105);
  expect(resetCar(s,scene,true).economy).toEqual(createCarAtSpawn(scene).economy);
 }
});
it('rejects unaffordable, full, airborne, vehicle, non-food and unknown requests without partial transfers',()=>{
 let s=start();expect(commerceReason({...s,control:{kind:'car'}},scene,'pocket',{kind:'buy',market:'corner',good:'bread'})).toBe('range');
 expect(commerceReason({...s,grounded:false},scene,'pocket',{kind:'work',job:'bake'})).toBe('range');expect(commerceReason(s,scene,'pocket',{kind:'eat',good:'flour'})).toBe('not_food');
 account(s).credits=0;expect(commerceReason(s,scene,'pocket',{kind:'buy',market:'corner',good:'bread'})).toBe('funds');
 account(s).credits=20;account(s).inventory.bread=8;expect(commerceReason(s,scene,'pocket',{kind:'buy',market:'corner',good:'bread'})).toBe('full');
 const before=account(s).credits;s=step(s,{kind:'buy',market:'missing',good:'bread'});expect(account(s).credits).toBe(before);expect(account(s).inventory.bread).toBe(8);
});
it('runs stationary NPC staff through the same paid work and food rules with finite ingredients',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,markets:scene.economy!.markets.map(m=>({...m,lots:m.lots.map(l=>l.good==='bread' ? {...l,quantity:1} : l)}))}});let s=start(doc);
 for(let i=0;i<48;i++)s=step(s,undefined,.25,doc);
 expect(s.economy!.batches.bake).toBeGreaterThan(0);expect(account(s,'baker').credits).toBeGreaterThan(0);expect(market(s).stock.flour).toBeLessThan(12);expect(account(s,'regular').satiety).toBeGreaterThan(60);checkEconomyState(s,doc);
});
it('rejects forged balances, missing members, stale clocks, duplicate jobs and broken material conservation',()=>{
 const valid=step(start(),{kind:'work',job:'bake'});checkEconomyState(valid,scene);
 for(const mutate of [(s:CarState)=>{account(s).credits++;},(s:CarState)=>{market(s).stock.flour!++;},(s:CarState)=>{s.economy!.atS=1000;},(s:CarState)=>{s.economy!.accounts.pop();},(s:CarState)=>{account(s,'baker').work={...account(s).work!};}]){const s=structuredClone(valid);mutate(s);expect(()=>checkEconomyState(s,scene)).toThrow();}
});
