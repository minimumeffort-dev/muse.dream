import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {hasMilestone,workQualified,checkEconomyState} from '../src/sim/commerce';
import {bondReviewSteps} from '../src/game/bond-review';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
const scene=createWorldScene(),prior=c.preBondScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.BOND_COMPATIBILITY,previousBondSaveCompatibility:c.SHELTER_COMPATIBILITY},old:World={...world,scene:prior,saveCompatibility:c.SHELTER_COMPATIBILITY,previousBondSaveCompatibility:undefined};
const run=<T>(g:Generator<void,T>)=>{let r=g.next();while(!r.done)r=g.next();return r.value;},player=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='pocket')!;
it('registers r102, exact r101/r100 and alternative qualifications without moving the world or seeding resources',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(46);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.BOND_COMPATIBILITY);expect(await c.sha256(c.preBondCompatibilitySource(scene))).toBe(c.SHELTER_COMPATIBILITY);expect(await c.sha256(c.preShelterCompatibilitySource(scene))).toBe(c.ATTENDANCE_COMPATIBILITY);expect(scene.objects).toBe(prior.objects);expect(scene.streets).toBe(prior.streets);expect(scene.terrain).toBe(prior.terrain);expect(scene.economy!.accounts).toBe(prior.economy!.accounts);expect(scene.economy!.markets).toBe(prior.economy!.markets);expect(scene.economy!.jobs.find(j=>j.id==='large_bake')!.requires_any).toEqual(['practiced_baker','bakers_table']);expect(prior.economy!.jobs.find(j=>j.id==='large_bake')!.requires).toBe('practiced_baker');
});
it('buys and shares real bread, physically returns to an open counter and replays one relationship-qualified paid job',()=>{
 const source=JSON.stringify(scene);let s=run(bondReviewSteps(createCarAtSpawn(scene),world));expect(s.control.kind).toBe('foot');expect(s.seated).toBeUndefined();expect(player(s).credits).toBe(10);expect(player(s).completed.work.bake).toBe(0);expect(hasMilestone(s,scene,'pocket','bakers_table')).toBe(true);expect(hasMilestone(s,scene,'regular','bakers_table')).toBe(false);expect(s.economy!.socialHistory!.baker!.meals).toBe(1);expect(s.economy!.shared).toBeUndefined();
 const ready=encodeSave(s,s.timeS,world);expect(decodeSave(ready,world).state).toEqual(JSON.parse(ready).state);expect(hasMilestone(resetCar(s,scene),scene,'pocket','bakers_table')).toBe(true);expect(hasMilestone(resetCar(s,scene,true),scene,'pocket','bakers_table')).toBe(false);
 const before={...s.economy!.markets.find(m=>m.id==='market_stall')!.stock};s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'work',job:'large_bake'}},1/120,world);expect(player(s).work?.id).toBe('large_bake');const text=encodeSave(s,s.timeS,world);let replay=decodeSave(text,world).state;expect(replay).toEqual(JSON.parse(text).state);
 for(let i=0;i<120*14;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);}expect(replay.economy).toEqual(s.economy);expect(player(s).credits).toBe(15);expect(player(s).completed.work.large_bake).toBe(1);expect(player(s).completed.work.bake).toBe(0);const stock=s.economy!.markets.find(m=>m.id==='market_stall')!.stock;expect(stock.flour).toBe(before.flour!-2);expect(stock.bread).toBe(before.bread!+5);checkEconomyState(s,scene);expect(JSON.stringify(scene)).toBe(source);
});
it('keeps an exact r101 unfinished shared meal and original slot before earning the new consequence through completion',()=>{
 const s=run(bondReviewSteps(createCarAtSpawn(prior),old,'meal'));expect(s.economy!.shared?.phase).toBe('eat');expect(s.economy!.socialHistory?.baker).toBeUndefined();const text=encodeSave(s,s.timeS,old),restored=decodeSave(text,world).state;expect(restored).toEqual(JSON.parse(text).state);expect(hasMilestone(restored,scene,'pocket','bakers_table')).toBe(false);expect(()=>decodeSave(text,{...world,previousBondSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.SHELTER_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(restored);expect(slot.write(restored,s.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 let next=restored;const credits=player(next).credits;for(let i=0;i<120*12 && !next.economy!.socialHistory?.baker;i++)next=stepInteractive(next,{steer:0,throttle:0},1/120,world);expect(next.economy!.socialHistory!.baker!.meals).toBe(1);expect(hasMilestone(next,scene,'pocket','bakers_table')).toBe(true);expect(player(next).credits).toBe(credits);expect(player(next).completed.work.bake).toBe(0);checkEconomyState(next,scene);
});
