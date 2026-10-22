import {afterAll,it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {stepInteractive,toggleRide} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {checkSeatingState} from '../src/sim/seating';
import {actorPose} from '../src/sim/actors';
import {repairNavigation} from '../src/sim/repair';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {workCommuteReviewSteps} from '../src/game/work-commute-review';
import {restReviewSteps} from '../src/game/rest-review';
const scene=createWorldScene(),snapshot=JSON.stringify(scene),prior=c.preRestScene(scene);
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.REST_COMPATIBILITY,previousRestSaveCompatibility:c.WORK_COMMUTE_COMPATIBILITY,previousWorkCommuteSaveCompatibility:c.HOME_MEALS_COMPATIBILITY};
const old:World={...world,scene:prior,saveCompatibility:c.WORK_COMMUTE_COMPATIBILITY,previousRestSaveCompatibility:undefined};
const regular=(s:ReturnType<typeof createCarAtSpawn>)=>s.economy!.accounts.find(a=>a.id==='regular')!;
const player=(s:ReturnType<typeof createCarAtSpawn>)=>s.economy!.accounts.find(a=>a.id==='pocket')!;
const run=<T>(steps:Generator<void,T>)=>{let r=steps.next();while(!r.done)r=steps.next();return r.value;};
afterAll(()=>expect(JSON.stringify(scene)).toBe(snapshot));
it('registers exact r96 without changing physical data, resources, jobs or actor budgets',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(41);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.REST_COMPATIBILITY);expect(await c.sha256(c.preRestCompatibilitySource(scene))).toBe(c.WORK_COMMUTE_COMPATIBILITY);expect(await c.sha256(c.preWorkCommuteCompatibilitySource(scene))).toBe(c.HOME_MEALS_COMPATIBILITY);
 for(const key of ['objects','routes','streets','terrain','player'] as const)expect(scene[key]).toEqual(prior[key]);expect(scene.economy!.markets).toEqual(prior.economy!.markets);expect(scene.economy!.jobs).toEqual(prior.economy!.jobs);expect(repairNavigation(scene).services).toEqual(repairNavigation(prior).services);expect(prior.economy!.rests).toBeUndefined();expect(prior.economy!.accounts.every(a=>!a.rest)).toBe(true);
});
it('shares home seating for real energy recovery after a finite meal and replays the complete return exactly',()=>{
 let s=run(restReviewSteps(createCarAtSpawn(scene),world));expect(regular(s).resting?.phase).toBe('sit');expect(regular(s).resting?.seat?.seatId).toBe('left');expect(regular(s).energy).toBeLessThan(85);expect(regular(s).credits).toBe(22);expect(s.economy!.consumed.lunch).toBe(1);expect(regular(s).work).toBeUndefined();
 s=toggleRide(s,world);expect(s.seated).toEqual({objectId:'home_settee',seatId:'right'});const before=player(s).energy!,home={...regular(s).resting!.home},oldState=s,text=encodeSave(s,s.timeS,world);let replay=decodeSave(text,world).state;
 for(let i=0;i<120*100 && regular(s).resting;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);}
 expect(s).toEqual(replay);expect(regular(s).resting).toBeUndefined();expect(regular(s).energy).toBeGreaterThan(80);expect(player(s).energy).toBeGreaterThan(before);expect(regular(s).credits).toBe(22);expect(s.economy!.consumed.lunch).toBe(1);expect(regular(oldState).energy).toBeLessThan(85);
 const p=actorPose(scene,scene.objects.find(o=>o.id==='market_commuter')!,s.timeS,s);expect(Math.hypot(p.x-home.x,p.y-home.y)).toBeLessThan(.01);checkEconomyState(s,scene);checkSeatingState(s,scene);
 const forged=JSON.parse(text);forged.state.economy.accounts.find((a:any)=>a.id==='regular').resting.seat={objectId:'home_settee',seatId:'right'};expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow();
});
it('preserves an r96 paid-work commitment and its entire ledger while initializing only the new need',()=>{
 const s=run(workCommuteReviewSteps(createCarAtSpawn(prior),old)),text=encodeSave(s,s.timeS,old),loaded=decodeSave(text,world);expect(loaded.migrated).toBe(true);expect(regular(loaded.state).work).toEqual(regular(s).work);expect(regular(loaded.state).commute).toEqual(regular(s).commute);expect(regular(loaded.state).energy).toBe(35);expect(player(loaded.state).energy).toBe(65);expect(regular(loaded.state).resting).toBeUndefined();
 const stripped={...loaded.state,economy:{...loaded.state.economy!,accounts:loaded.state.economy!.accounts.map(a=>{const {energy,...original}=a;return original;})}};expect(stripped).toEqual(JSON.parse(text).state);expect(()=>decodeSave(text,{...world,previousRestSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.WORK_COMMUTE_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,s.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
