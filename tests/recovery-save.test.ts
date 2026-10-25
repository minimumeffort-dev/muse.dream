import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {recoverySourceIds} from '../src/scene/commerce';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {sceneContactData} from '../src/scene/contacts';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {workshopReviewSteps} from '../src/game/review-start';
import type {Scene} from '../src/scene/schema';
let live:Scene|undefined;const current=()=>live??=c.preHardwareScene(createWorldScene());
const world=(s:Scene):World=>({scene:s,roadMask:buildMaskForScene(s),driveMask:buildPaperMask(s.canonical.width,s.canonical.height),carRadius:11});
const format18=(text:string)=>JSON.stringify({...JSON.parse(text),version:18});
const w=()=>({...world(current()),saveCompatibility:c.RECOVERY_COMPATIBILITY,previousRecoverySaveCompatibility:c.RESIDENT_SUPPLY_COMPATIBILITY});

it('pins r87 exactly and retains geometry, contacts, population graph and the 106 physical sources',async()=>{
 const scene=current(),prior=c.preRecoveryScene(scene);expect(await c.sha256(c.preNurseryCompatibilitySource(scene))).toBe(c.RECOVERY_COMPATIBILITY);expect(await c.sha256(c.preRecoveryCompatibilitySource(scene))).toBe(c.RESIDENT_SUPPLY_COMPATIBILITY);
 expect(scene.objects).toBe(prior.objects);expect(scene.surfaces).toBe(prior.surfaces);expect(sceneContactData(scene)).toEqual(sceneContactData(prior));expect(ambientGraph(scene)).toEqual(ambientGraph(prior));expect(recoverySourceIds(scene).size).toBe(106);expect(JSON.parse(c.preNurseryCompatibilitySource(scene)).simulationVersion).toBe(35);
});
it('migrates a genuine format-18 shape with outstanding cargo without changing any old field or source slot',()=>{
 const scene=current(),prior=c.preRecoveryScene(scene),old={...world(prior),saveCompatibility:c.RESIDENT_SUPPLY_COMPATIBILITY};const steps=workshopReviewSteps(createCarAtSpawn(prior),old);let r=steps.next();while(!r.done)r=steps.next();const text=format18(encodeSave(r.value,r.value.timeS,old)),next=w(),loaded=decodeSave(text,next),state=loaded.state;
 const {recovered,recoverySpent,...economy}=state.economy!;expect({...state,economy}).toEqual(JSON.parse(text).state);expect(recovered).toEqual({orchard_trees:0});expect(recoverySpent).toEqual([]);expect(loaded.worldTime).toBe(r.value.timeS);expect(loaded.migrated).toBe(true);
 expect(decodeSave(encodeSave(state,state.timeS,next),next).migrated).toBe(false);expect(()=>decodeSave(text,{...next,previousRecoverySaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v18.${scene.sceneId}.${c.RESIDENT_SUPPLY_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(next,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.state).toEqual(state);expect(slot.write(state,state.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
it('requires historical broken and growing sources to mature before any new recovery',()=>{
 const scene=current(),prior=c.preRecoveryScene(scene),old={...world(prior),saveCompatibility:c.RESIDENT_SUPPLY_COMPATIBILITY},ids=[...recoverySourceIds(scene)];const s=createCarAtSpawn(prior),e=s.economy!,service=prior.economy!.repairs.find(r=>r.id==='orchard_trees')!,market=e.markets.find(m=>m.id===service.market)!,player=e.accounts.find(a=>a.id==='pocket')!;
 // Construct a valid old growth record: its sapling and wage were consumed once.
 s.broken=[ids[0]!];s.growing=[{objectId:ids[1]!,serviceId:service.id,plantedAtS:0,progressS:0}];e.repaired[service.id]=1;player.completed.repair[service.id]=1;market.stock[service.input]!-=service.take;market.credits-=service.pay;player.credits+=service.pay;
 const text=format18(encodeSave(s,0,old)),loaded=decodeSave(text,w()).state;expect(loaded.economy!.recoverySpent).toEqual(ids.slice(0,2));expect(loaded.growing).toEqual(s.growing);expect(loaded.broken).toEqual(s.broken);expect(loaded.economy!.recovered).toEqual({orchard_trees:0});
});
it('keeps the existing r85 supply and r87 account initialization inside their registered boundaries',()=>{
 const scene=current(),prior=c.preWorkshopSupplyScene(scene),old={...world(prior),saveCompatibility:c.KIT_PRODUCTION_COMPATIBILITY};const next={...w(),previousResidentSupplySaveCompatibility:c.WORKSHOP_SUPPLY_COMPATIBILITY,previousWorkshopSupplySaveCompatibility:c.KIT_PRODUCTION_COMPATIBILITY},loaded=decodeSave(format18(encodeSave(createCarAtSpawn(prior),0,old)),next).state;
 expect(loaded.economy!.markets.find(m=>m.id==='station_supplies')!.stock).toMatchObject({boards:16,fasteners:16});expect(loaded.economy!.accounts.find(a=>a.id==='porter')!.credits).toBe(0);expect(loaded.economy!.recovered).toEqual({orchard_trees:0});expect(loaded.economy!.recoverySpent).toEqual([]);
});

import {recoveryReviewSteps} from '../src/game/review-start';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState,commerceReason} from '../src/sim/commerce';
it('prepares a real live impact, planting, sealed cargo, R and doorway walk before one ordinary handoff',()=>{
 const nextWorld=w(),steps=recoveryReviewSteps(createCarAtSpawn(current()),nextWorld);let r=steps.next();while(!r.done)r=steps.next();let s=r.value;
 const player=()=>s.economy!.accounts.find(a=>a.id==='pocket')!,market=()=>s.economy!.markets.find(m=>m.id==='market_stall')!;
 expect(player().repair).toMatchObject({id:'orchard_trees',recover:true,phase:'home'});expect(s.economy!.recovered).toEqual({orchard_trees:1});expect(market().stock.boards).toBe(7);expect(s.growing?.some(p=>p.objectId==='garden_rowan_north')).toBe(true);
 expect(commerceReason(s,current(),'pocket',{kind:'deliver'})).toBeUndefined();const credits=player().credits,packet=encodeSave(s,s.timeS,nextWorld);expect(decodeSave(packet,nextWorld).state).toEqual(JSON.parse(packet).state);
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'deliver'}},1/120,nextWorld);expect(player().repair).toBeUndefined();expect(market().stock.boards).toBe(8);expect(player().credits).toBe(credits);checkEconomyState(s,current());
});
