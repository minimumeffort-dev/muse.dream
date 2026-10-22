import {expect,it} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import type {Scene} from '../src/scene/schema';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {encodeSave,decodeSave,SAVE_VERSION} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {nurseryReviewSteps,workshopReviewSteps} from '../src/game/review-start';
let live:Scene|undefined,ready:CarState|undefined;
const scene=()=>live??=c.preSchoolInteriorScene(createWorldScene()),world=(s=scene()):World=>({scene:s,roadMask:buildMaskForScene(s),driveMask:buildPaperMask(s.canonical.width,s.canonical.height),carRadius:11});
const current=()=>({...world(),saveCompatibility:c.NURSERY_COMPATIBILITY,previousNurserySaveCompatibility:c.HARDWARE_COMPATIBILITY});
const player=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='pocket')!,market=(s:CarState)=>s.economy!.markets.find(m=>m.id==='market_stall')!;
const review=()=>{if(!ready){const steps=nurseryReviewSteps(createCarAtSpawn(scene()),current(),false);let r=steps.next();while(!r.done)r=steps.next();ready=r.value;}return structuredClone(ready);};
it('pins r89 exactly while reusing the complete world, population and finite supplies',async()=>{
 const s=scene(),prior=c.preNurseryScene(s);expect(await c.sha256(c.preSchoolInteriorCompatibilitySource(s))).toBe(c.NURSERY_COMPATIBILITY);expect(await c.sha256(c.preNurseryCompatibilitySource(s))).toBe(c.HARDWARE_COMPATIBILITY);
 expect(await c.sha256(c.preHardwareCompatibilitySource(s))).toBe(c.RECOVERY_COMPATIBILITY);expect(await c.sha256(c.preRecoveryCompatibilitySource(s))).toBe(c.RESIDENT_SUPPLY_COMPATIBILITY);
 expect(s.objects).toBe(prior.objects);expect(s.surfaces).toBe(prior.surfaces);expect(s.behaviors).toBe(prior.behaviors);expect(sceneContactData(s)).toEqual(sceneContactData(prior));expect(ambientGraph(s)).toEqual(ambientGraph(prior));
 expect(s.economy!.jobs.slice(0,-1)).toEqual(prior.economy!.jobs);expect(s.economy!.jobs.at(-1)!.id).toBe('propagate_saplings');
 expect(s.economy!.markets).toBe(prior.economy!.markets);expect(s.economy!.accounts.find(a=>a.id==='baker')!.works).toEqual(['assemble_kit','propagate_saplings','pack_lunch','bake']);expect(s.economy!.accounts).toHaveLength(prior.economy!.accounts.length);expect(SAVE_VERSION).toBe(19);expect(JSON.parse(c.preSchoolInteriorCompatibilitySource(s)).simulationVersion).toBe(36);
});
it('consumes a real planted sapling, returns its timber, then permits the player to replace the seed stock through paid work',()=>{
 let s=review(),w=current();expect(player(s).repair).toBeUndefined();expect(market(s).stock).toMatchObject({sapling:5,boards:8});expect(player(s).credits).toBe(30);
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'work',job:'propagate_saplings'}},1/120,w);expect(player(s).work?.id).toBe('propagate_saplings');expect(market(s).stock.sapling).toBe(4);
 const text=encodeSave(s,s.timeS,w);s=decodeSave(text,w).state;
 for(let i=0;i<120*13;i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,w);
 expect(player(s).work).toBeUndefined();expect(market(s).stock.sapling).toBe(6);expect(player(s).credits).toBe(32);expect(player(s).completed.work.propagate_saplings).toBe(1);expect(s.economy!.batches.propagate_saplings).toBe(1);checkEconomyState(s,scene());
});
it('prepares the in-game nursery recording with actual reserved seed and wage',()=>{
 const w=current(),steps=nurseryReviewSteps(createCarAtSpawn(scene()),w);let r=steps.next();while(!r.done)r=steps.next();const s=r.value;
 expect(player(s).work).toMatchObject({id:'propagate_saplings'});expect(market(s).stock.sapling).toBe(4);expect(player(s).credits).toBe(30);checkEconomyState(s,scene());
});
it('adds only zero nursery counters to a real r89 hardware return and retains the original slot',()=>{
 const prior=c.preNurseryScene(scene()),old={...world(prior),saveCompatibility:c.HARDWARE_COMPATIBILITY},steps=workshopReviewSteps(createCarAtSpawn(prior),old);let r=steps.next();while(!r.done)r=steps.next();const text=encodeSave(r.value,234,old),w=current(),loaded=decodeSave(text,w);
 const strip=(s:CarState)=>{const e=structuredClone(s.economy!);delete e.batches.propagate_saplings;delete e.unattributed.work.propagate_saplings;for(const a of e.accounts)delete a.completed.work.propagate_saplings;return {...s,economy:e};};
 expect(strip(loaded.state)).toEqual(JSON.parse(text).state);expect(loaded.state.economy!.batches.propagate_saplings).toBe(0);expect(loaded.worldTime).toBe(234);expect(loaded.migrated).toBe(true);expect(player(loaded.state).repair?.recover).toBe(true);
 expect(decodeSave(encodeSave(loaded.state,234,w),w).migrated).toBe(false);expect(()=>decodeSave(text,{...w,previousNurserySaveCompatibility:undefined})).toThrow('different world');expect(()=>decodeSave(text,{...w,saveCompatibility:'f'.repeat(64)})).toThrow('different world');
 const key=`muse-dream.save.v19.${prior.sceneId}.${c.HARDWARE_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(w,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,234)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
it('keeps the registered hardware and timber migration chain intact without retroactive materials',()=>{
 const prior=c.preHardwareScene(scene()),old={...world(prior),saveCompatibility:c.RECOVERY_COMPATIBILITY},w={...current(),previousHardwareSaveCompatibility:c.RECOVERY_COMPATIBILITY},loaded=decodeSave(encodeSave(createCarAtSpawn(prior),0,old),w);
 expect(loaded.state.economy!.recovered).toEqual({orchard_trees:0,market_tables:0});expect(loaded.state.economy!.batches.propagate_saplings).toBe(0);expect(loaded.state.economy!.recoverySpent).toEqual([]);expect(loaded.state.timeS).toBe(0);
});
