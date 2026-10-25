import {it,expect} from 'vitest';
import source from '../docs/examples/seated-breaks.dream?raw';
import soloSource from '../docs/examples/resting.dream?raw';
import {compileDreamScene} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {checkSeatingState} from '../src/sim/seating';
const compile=(text:string)=>compileDreamScene(text,{sceneId:'seated-recovery',revisionId:'test',sourceHash:'seated-recovery'});
const scene=compile(source),account=(s:CarState,id='friend_account')=>s.economy!.accounts.find(a=>a.id===id)!;
const tick=(s:CarState,doc=scene)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc)},{},.25,doc);
function until(s:CarState,test:(s:CarState)=>boolean,doc=scene){for(let i=0;i<600 && !test(s);i++)s=tick(s,doc);expect(test(s)).toBe(true);return s;}
it('recovers a seated meal companion through the same rest rate without adding another trip or inventing energy for other accounts',()=>{
 const s=until(createCarAtSpawn(scene),s=>s.economy!.gathering?.phase==='eat'),before=JSON.stringify(s),next=tick(s);
 expect(account(next).energy).toBeCloseTo(account(s).energy!+1.25);expect(account(next).resting).toBeUndefined();expect(account(next,'regular').energy).toBeUndefined();expect(next.economy!.markets).toEqual(s.economy!.markets);expect(next.economy!.consumed).toEqual(s.economy!.consumed);expect(JSON.stringify(s)).toBe(before);checkEconomyState(next,scene);checkSeatingState(next,scene);
});
it('drains energy on the approach and return instead of recovering merely from a reserved seat',()=>{
 let s=until(createCarAtSpawn(scene),s=>s.economy!.gathering?.phase==='out');expect(account(tick(s)).energy).toBeCloseTo(account(s).energy!-.0125);
 s=until(s,s=>s.economy!.gathering?.phase==='home');expect(account(tick(s)).energy).toBeCloseTo(account(s).energy!-.0125);expect(s.economy!.consumed.bread).toBe(2);
});
it('stops recovery on broken seating, refunds held food once and retains energy on R',()=>{
 let s=until(createCarAtSpawn(scene),s=>s.economy!.gathering?.phase==='eat');const energy=account(s).energy!;s=tick({...s,broken:['lunch_bench']});expect(account(s).energy).toBeCloseTo(energy-.0125);expect(s.economy!.gathering?.phase).toBe('home');expect(account(s,'regular').inventory.bread).toBe(2);expect(s.economy!.consumed.bread).toBe(0);expect(resetCar(s,scene).economy).toEqual(s.economy);checkEconomyState(s,scene);checkSeatingState(s,scene);
});
it('recovers during a real solo food trip without changing its paid portion or completion',()=>{
 const doc=compile(soloSource.replace('energy=20','energy=60').replace('satiety=65,drain_s=.05,works=[bake],commute=true,on=plaza','satiety=25,drain_s=.05,meal=bakery_break'));
 let s=until(createCarAtSpawn(doc),s=>s.economy!.accounts.find(a=>a.id==='regular')!.meal?.phase==='eat',doc),a=account(s,'regular'),next=tick(s,doc);expect(account(next,'regular').energy).toBeCloseTo(a.energy!+1.25);expect(account(next,'regular').inventory.bread).toBe(1);expect(account(next,'regular').credits).toBe(15);
 s=until(next,s=>!account(s,'regular').meal,doc);expect(s.economy!.consumed.bread).toBe(1);expect(account(s,'regular').inventory.bread).toBe(0);checkEconomyState(s,doc);checkSeatingState(s,doc);
});

it('recovers on a social seat outside the automatic rest preference and clamps at 100',()=>{
 const doc=compile(source.replace('place lunch_bench(object=slatted_bench,at=[690,775],role=prop);','place lunch_bench(object=slatted_bench,at=[690,775],role=prop);\nplace rest_bench(object=slatted_bench,at=[690,715],role=prop);').replace('until=85,seats=[lunch_bench]','until=85,seats=[rest_bench]'));
 let s=until(createCarAtSpawn(doc),s=>s.economy!.gathering?.phase==='eat',doc);expect(s.economy!.gathering!.guestTrip.seat.objectId).toBe('lunch_bench');account(s).energy=99.5;s=tick(s,doc);expect(account(s).energy).toBe(100);checkEconomyState(s,doc);checkSeatingState(s,doc);
});

it('keeps a standing meal on ordinary time drain and freezes recovery when no simulation time passes',()=>{
 const doc=compile(soloSource.replace('energy=20','energy=60').replace('satiety=65,drain_s=.05,works=[bake],commute=true,on=plaza','satiety=25,drain_s=.05,meal=bakery_break').replace('eat_s=4,seats=[lunch_bench]','eat_s=4'));
 const s=until(createCarAtSpawn(doc),s=>account(s,'regular').meal?.phase==='eat',doc);expect(account(s,'regular').meal!.seat).toBeUndefined();expect(account(tick(s,doc),'regular').energy).toBeCloseTo(account(s,'regular').energy!-.0125);expect(stepCommerce(s,{},0,doc)).toBe(s);
});
