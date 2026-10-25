import {beforeAll,afterEach,it,expect} from 'vitest';
import native from './fixtures/service-work-r114-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,type World,type CarState} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {decodeSave,encodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {stationReviewSteps} from '../src/game/station-review';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState,serviceRemaining,commerceReason} from '../src/sim/commerce';
let scene:ReturnType<typeof createWorldScene>,prior:typeof scene,world:World,old:World,snapshot:string;
beforeAll(()=>{
 scene={...c.preOfficeWorkScene(createWorldScene()),revisionId:'r115'};prior=c.preServiceWorkScene(scene);snapshot=JSON.stringify(scene);
 world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.SERVICE_WORK_COMPATIBILITY,previousServiceWorkSaveCompatibility:c.TOWER_ROOM_COMPATIBILITY};
 old={...world,scene:prior,saveCompatibility:c.TOWER_ROOM_COMPATIBILITY,previousServiceWorkSaveCompatibility:undefined};
},60000);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const addCounters=(s:CarState)=>({...s,economy:{...s.economy!,batches:{...s.economy!.batches,stocktake:0},unattributed:{...s.economy!.unattributed,work:{...s.economy!.unattributed.work,stocktake:0}},accounts:s.economy!.accounts.map(a=>({...a,completed:{...a.completed,work:{...a.completed.work,stocktake:0}}}))}});
const run=async(steps:Generator<void,CarState>)=>{let r=steps.next(),n=0;while(!r.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));r=steps.next();}return r.value;};

it('registers only the new finite task and worker preference, preserving physical world and resources',async()=>{
 expect(JSON.parse(c.preOfficeWorkCompatibilitySource(scene)).simulationVersion).toBe(56);expect(scene.revisionId).toBe('r115');expect(await c.sha256(c.preOfficeWorkCompatibilitySource(scene))).toBe(c.SERVICE_WORK_COMPATIBILITY);expect(await c.sha256(c.preServiceWorkCompatibilitySource(scene))).toBe(c.TOWER_ROOM_COMPATIBILITY);
 expect(scene.objects).toEqual(prior.objects);expect(scene.terrain).toEqual(prior.terrain);expect(scene.economy!.markets).toEqual(prior.economy!.markets);expect(scene.economy!.goods).toEqual(prior.economy!.goods);
 expect(scene.economy!.jobs).toHaveLength(prior.economy!.jobs.length+1);expect(scene.economy!.accounts.find(a=>a.id==='regular')!.works).toEqual(['stocktake','large_bake','bake']);
});

it('validates the actual native r114 backup and initializes only zero service counters',()=>{
 const text=JSON.stringify(native),before=decodeSave(text,old),loaded=decodeSave(text,world);expect(before.state).toEqual(native.state);expect(loaded.state).toEqual(addCounters(before.state));expect(loaded.worldTime).toBe(native.worldTime);expect(loaded.migrated).toBe(true);expect(loaded.state.timeS).toBe(native.state.timeS);
 const again=decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world);expect(again.state).toEqual(loaded.state);expect(again.migrated).toBe(false);
 expect(()=>decodeSave(text,{...world,previousServiceWorkSaveCompatibility:undefined})).toThrow('different world');const bad=structuredClone(native);bad.state.economy!.accounts[0]!.credits++;expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow('invalid world state');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.TOWER_ROOM_COMPATIBILITY}`,rows=new Map([[key,text]]),saves=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(saves.restored!.state).toEqual(loaded.state);expect(saves.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});

it('walks to the live workstation and completes all three shared tasks without creating stock',async()=>{
 let s=await run(stationReviewSteps(createCarAtSpawn(scene),world,'ready','stocktake'));const player=()=>s.economy!.accounts.find(a=>a.id==='pocket')!,job=scene.economy!.jobs.find(j=>j.id==='stocktake')!,stock=structuredClone(s.economy!.markets.map(m=>m.stock)),before=player().credits;
 for(let batch=0;batch<3;batch++){
  expect(commerceReason(s,scene,'pocket',{kind:'work',job:job.id})).toBeUndefined();s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'work',job:job.id}},1/120,world);expect(player().work?.id).toBe(job.id);
  s=decodeSave(encodeSave(s,s.timeS,world),world).state;
  for(let i=0;i<500 && player().work;i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,world);
  expect(player().completed.work.stocktake).toBe(batch+1);expect(player().credits).toBe(before+(batch+1)*job.pay);
 }
 expect(serviceRemaining(s.economy!,job)).toBe(0);expect(commerceReason(s,scene,'pocket',{kind:'work',job:job.id})).toBe('quota');expect(s.economy!.markets.map(m=>m.stock)).toEqual(stock);checkEconomyState(s,scene);
},60000);

it('preserves an in-flight old recipe and every existing ledger before future service decisions',async()=>{
 const before=await run(stationReviewSteps(createCarAtSpawn(prior),old,'work')),loaded=decodeSave(encodeSave(before,before.timeS,old),world);expect(before.economy!.accounts.find(a=>a.id==='pocket')!.work?.id).toBe('bake');expect(loaded.state).toEqual(addCounters(before));expect(loaded.worldTime).toBe(before.timeS);
});
