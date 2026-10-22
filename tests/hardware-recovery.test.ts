import {expect,it} from 'vitest';
import source from '../docs/examples/hardware-recovery.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {repairTargets} from '../src/scene/commerce';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepInteractive,toggleRide} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {workshopReviewSteps,recoveryReviewSteps} from '../src/game/review-start';
import type {Scene} from '../src/scene/schema';
const example=compileDreamScene(source,{sceneId:'hardware',revisionId:'test',sourceHash:'hardware'});
let scene:Scene|undefined;const live=()=>scene??=createWorldScene();
const world=(s=live()):World=>({scene:s,roadMask:buildMaskForScene(s),driveMask:buildPaperMask(s.canonical.width,s.canonical.height),carRadius:11});
const current=()=>({...world(),saveCompatibility:c.HARDWARE_COMPATIBILITY,previousHardwareSaveCompatibility:c.RECOVERY_COMPATIBILITY});
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const market=(s:CarState,id='market_stall')=>s.economy!.markets.find(m=>m.id===id)!;
let reviewed:CarState|undefined;
const review=()=>{if(!reviewed){const steps=workshopReviewSteps(createCarAtSpawn(live()),current());let r=steps.next();while(!r.done)r=steps.next();reviewed=r.value;}return structuredClone(reviewed);};

it('pins the exact r88 world and applies one hardware return policy to every existing fixture target',async()=>{
 const s=live(),prior=c.preHardwareScene(s),r=s.economy!.repairs.find(r=>r.id==='market_tables')!;
 expect(await c.sha256(c.saveCompatibilitySource(s))).toBe(c.HARDWARE_COMPATIBILITY);expect(await c.sha256(c.preHardwareCompatibilitySource(s))).toBe(c.RECOVERY_COMPATIBILITY);
 expect(s.objects).toBe(prior.objects);expect(s.surfaces).toBe(prior.surfaces);expect(sceneContactData(s)).toEqual(sceneContactData(prior));expect(ambientGraph(s)).toEqual(ambientGraph(prior));
 expect(r).toMatchObject({recover:'fasteners',amount:1});expect(repairTargets(s,r)).toHaveLength(449);expect(s.objects).toHaveLength(1773);expect(c.SAVE_SIMULATION_VERSION).toBe(35);
});
it('connects actual NPC repair, carried hardware and paid kit production in a runnable Dream world',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));const w=world(example);
 let s={...toggleRide(createCarAtSpawn(example),w),x:570,y:755,elevation:0,headingRad:0},carried=false,returned=false;
 s=stepInteractive(s,{steer:0,throttle:0,strikePressed:true},1/120,w);expect(s.broken).toContain('food_table');
 for(let i=0;i<120*50;i++){
  s=stepInteractive(s,{steer:0,throttle:0},1/120,w);const a=account(s,'caretaker');
  if(a.repair?.phase==='home' && a.repair.recover){carried=true;expect(s.economy!.recovered!.workshop_repairs).toBe(1);}
  if(s.economy!.recovered!.workshop_repairs===1 && !a.repair){returned=true;break;}
 }
 expect(carried).toBe(true);expect(returned).toBe(true);expect(s.broken).not.toContain('food_table');expect(account(s,'caretaker').credits).toBe(2);
 expect(market(s,'corner').stock.fasteners).toBe(8-s.economy!.batches.assemble_kit!+1);checkEconomyState(s,example);
 expect(decodeSave(encodeSave(s,s.timeS,w),w).state).toEqual(JSON.parse(JSON.stringify(s)));
});
it('retains full-store fallback, then carries a later fixture fastener through R and reload until one real handoff',()=>{
 let s=review();const w=current();expect(s.economy!.repaired.market_tables).toBe(2);expect(s.economy!.recovered).toEqual({market_tables:1,orchard_trees:0});
 expect(account(s).repair).toMatchObject({id:'market_tables',phase:'home',recover:true});expect(account(s).credits).toBe(28);expect(market(s).stock).toMatchObject({boards:6,fasteners:6,timber:12});
 const packet=encodeSave(s,s.timeS,w);expect(decodeSave(packet,w).state).toEqual(JSON.parse(packet).state);expect(resetCar(s,live()).economy).toEqual(s.economy);
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'deliver'}},1/120,w);expect(account(s).repair).toBeUndefined();expect(market(s).stock.fasteners).toBe(7);expect(account(s).credits).toBe(28);
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'deliver'}},1/120,w);expect(market(s).stock.fasteners).toBe(7);expect(account(s).credits).toBe(28);checkEconomyState(s,live());
});
it('migrates existing sealed timber without changing any old field, retroactive output or original slot',()=>{
 const prior=c.preHardwareScene(live()),old={...world(prior),saveCompatibility:c.RECOVERY_COMPATIBILITY},steps=recoveryReviewSteps(createCarAtSpawn(prior),old);let r=steps.next();while(!r.done)r=steps.next();
 const text=encodeSave(r.value,123,old),w=current(),loaded=decodeSave(text,w),{market_tables,...recovered}=loaded.state.economy!.recovered!;
 expect(market_tables).toBe(0);expect({...loaded.state,economy:{...loaded.state.economy,recovered}}).toEqual(JSON.parse(text).state);expect(loaded.worldTime).toBe(123);expect(loaded.migrated).toBe(true);
 expect(decodeSave(encodeSave(loaded.state,123,w),w).migrated).toBe(false);expect(()=>decodeSave(text,{...w,previousHardwareSaveCompatibility:undefined})).toThrow('different world');expect(()=>decodeSave(text,{...w,saveCompatibility:'f'.repeat(64)})).toThrow('different world');
 const key=`muse-dream.save.v19.${prior.sceneId}.${c.RECOVERY_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(w,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.state).toEqual(loaded.state);expect(slot.write(loaded.state,123)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
it('retains the r87 growth upgrade boundary and rejects invented recovered hardware',()=>{
 const prior=c.preRecoveryScene(live()),old={...world(prior),saveCompatibility:c.RESIDENT_SUPPLY_COMPATIBILITY},packet=JSON.parse(encodeSave(createCarAtSpawn(prior),0,old));packet.version=18;
 const w={...current(),previousRecoverySaveCompatibility:c.RESIDENT_SUPPLY_COMPATIBILITY},loaded=decodeSave(JSON.stringify(packet),w);expect(loaded.state.economy!.recovered).toEqual({orchard_trees:0,market_tables:0});expect(loaded.state.economy!.recoverySpent).toEqual([]);
 const forged=review();forged.economy!.recovered!.market_tables=2;expect(()=>encodeSave(forged,forged.timeS,current())).toThrow();
});
it('retains real fastener procurement in the prior world and shows recovered output in the current review',()=>{
 const prior=c.preHardwareScene(live()),w={...world(prior),saveCompatibility:c.RECOVERY_COMPATIBILITY},steps=workshopReviewSteps(createCarAtSpawn(prior),w);let r=steps.next();while(!r.done)r=steps.next();let s=r.value;
 expect(account(s).repair).toBeUndefined();expect(account(s).delivery?.id).toBe('fasteners_run');expect(market(s).stock.fasteners).toBe(6);
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'deliver'}},1/120,w);expect(account(s).delivery).toBeUndefined();expect(market(s).stock.fasteners).toBe(8);expect(account(s).credits).toBe(32);checkEconomyState(s,prior);
 expect(account(review()).repair).toMatchObject({id:'market_tables',phase:'home',recover:true});
});
it('keeps current timber recovery working beside the new fixture counter',()=>{
 const w=current(),steps=recoveryReviewSteps(createCarAtSpawn(live()),w);let r=steps.next();while(!r.done)r=steps.next();let s=r.value;
 expect(account(s).repair).toMatchObject({id:'orchard_trees',phase:'home',recover:true});expect(s.economy!.recovered).toEqual({market_tables:0,orchard_trees:1});expect(market(s).stock.boards).toBe(7);
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'deliver'}},1/120,w);expect(market(s).stock.boards).toBe(8);expect(account(s).repair).toBeUndefined();checkEconomyState(s,live());
});
