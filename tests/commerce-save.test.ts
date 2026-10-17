import {it,expect} from 'vitest';
import oldSave from './fixtures/save-v2-r44.json';
import marketSave from './fixtures/save-v3-r45.json';
import source from '../docs/examples/market-work.dream?raw';
import deliverySource from '../docs/examples/market-delivery.dream?raw';
import {createWorldScene} from '../src/scene/world-fixture';
import {compileDreamScene} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {toggleRide} from '../src/sim/interaction';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {encodeSave,decodeSave} from '../src/sim/save';
import {cargoReviewStart} from '../src/game/review-start';
import {gameSave} from '../src/game/save';
import {saveCompatibilitySource,preCommerceCompatibilitySource,sha256,registeredLegacySource,supportsPreCommerceUpgrade,preDeliveryCompatibilitySource,DELIVERY_COMPATIBILITY} from '../src/scene/save-compatibility';

it('round-trips reserved work, balances, materials, needs and shared NPC decisions without catch-up',()=>{
 const scene=compileDreamScene(source,{sceneId:'market-save',revisionId:'r1',sourceHash:'current'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const start={...toggleRide(createCarAtSpawn(scene),world),control:{kind:'foot' as const},x:580,y:750,elevation:0,surface:'paper' as const};
 const state=stepCommerce({...start,timeS:.25},{commerce:{kind:'work',job:'bake'}},.25,scene),restored=decodeSave(encodeSave(state,40,world),world).state;
 expect(restored.economy).toEqual(state.economy);checkEconomyState(restored,scene);
 let a=state,b=restored;for(let i=0;i<8;i++){a=stepCommerce({...a,timeS:a.timeS+.25},{},.25,scene);b=stepCommerce({...b,timeS:b.timeS+.25},{},.25,scene);}expect(b).toEqual(a);expect(b.economy!.batches.bake).toBe(1);
});

it('upgrades actual r44 browser saves into the registered first market while preserving their physical world',async()=>{
 const scene=createWorldScene('first-market'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousSaveCompatibility=await sha256(preCommerceCompatibilitySource(scene)),emptyEconomySaveCompatibility=await sha256(preCommerceCompatibilitySource(scene,2)),previousSaveSource=registeredLegacySource(emptyEconomySaveCompatibility);
 expect(saveCompatibility).toBe(DELIVERY_COMPATIBILITY);expect(supportsPreCommerceUpgrade(scene,saveCompatibility)).toBe(true);expect(previousSaveSource).toBe(oldSave.sourceHash);
 const world:World={scene,saveCompatibility,previousSaveCompatibility,emptyEconomySaveCompatibility,previousSaveSource,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const old=JSON.stringify(oldSave),copy=decodeSave(old,world);expect(copy.migrated).toBe(true);expect(copy.state.x).toBe(oldSave.state.x);expect(copy.state.vehicles).toEqual(oldSave.state.vehicles);expect(copy.state.npcs).toEqual(oldSave.state.npcs);expect(copy.state.population).toEqual(oldSave.state.population);expect(copy.worldTime).toBe(oldSave.worldTime);expect(copy.state.economy!.atS).toBe(oldSave.state.timeS);expect(copy.state.economy!.accounts[0]!.credits).toBe(20);checkEconomyState(copy.state,scene);
 const legacy={...oldSave,version:1} as any;delete legacy.compatibilityHash;expect(decodeSave(JSON.stringify(legacy),world).state.economy).toEqual(copy.state.economy);
 const key=`muse-dream.save.v2.${scene.sceneId}.${oldSave.compatibilityHash}`,rows=new Map([[key,old]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}};
 const slot=gameSave(world,()=>storage);expect(slot.restored?.migrated).toBe(true);expect(slot.write(slot.restored!.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(old);expect(JSON.parse(rows.get(slot.key)!).version).toBe(4);
 const changed={...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>({...a,credits:a.credits+1}))}};
 expect(supportsPreCommerceUpgrade(changed,await sha256(saveCompatibilitySource(changed)))).toBe(false);
 const unsupported={...world,scene:changed,previousSaveCompatibility:undefined,emptyEconomySaveCompatibility:undefined,previousSaveSource:undefined};expect(()=>decodeSave(old,unsupported)).toThrow('different world');
});

it('migrates an actual reserved format 3 batch without resetting stock, credits, needs or work time',async()=>{
 const scene=createWorldScene('delivery-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousMarketSaveCompatibility=await sha256(preDeliveryCompatibilitySource(scene));
 expect(previousMarketSaveCompatibility).toBe(marketSave.compatibilityHash);expect(saveCompatibility).toBe(DELIVERY_COMPATIBILITY);
 const world:World={scene,saveCompatibility,previousMarketSaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const fresh=createCarAtSpawn(scene),profile=cargoReviewStart(fresh,world,'school_run');expect(cargoReviewStart(fresh,world,null)).toBe(fresh);expect(profile.control.kind).toBe('car');expect(profile.economy!.accounts[0]!.delivery?.id).toBe('school_run');checkEconomyState(profile,scene);
 const text=JSON.stringify(marketSave),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);expect(copy.state.economy!.accounts[0]).toEqual(marketSave.state.economy.accounts[0]);expect(copy.state.economy!.markets.find(m=>m.id==='market_stall')).toEqual(marketSave.state.economy.markets[0]);expect(copy.state.population).toEqual(marketSave.state.population);expect(copy.state.economy!.delivered).toEqual({flour_run:0,school_run:0});checkEconomyState(copy.state,scene);
 let s=copy.state;for(let i=0;i<28;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);expect(s.economy!.accounts[0]!.credits).toBe(marketSave.state.economy.accounts[0]!.credits+3);expect(s.economy!.batches.bake).toBe(marketSave.state.economy.batches.bake+1);checkEconomyState(s,scene);
 const rows=new Map([[`muse-dream.save.v3.${scene.sceneId}.${previousMarketSaveCompatibility}`,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.size).toBe(2);expect(JSON.parse(rows.get(slot.key)!).version).toBe(4);
 const changed={...world,previousMarketSaveCompatibility:undefined};expect(()=>decodeSave(text,changed)).toThrow('different world');
});

it('round-trips sealed cargo through pause, vehicle travel and completion without creating stock or wages',()=>{
 const scene=compileDreamScene(deliverySource,{sceneId:'cargo-save',revisionId:'r1',sourceHash:'cargo'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 let state={...toggleRide(createCarAtSpawn(scene),world),x:580,y:750};state=stepCommerce({...state,timeS:.25},{commerce:{kind:'collect',delivery:'lunch_run'}},.25,scene);
 const copy=decodeSave(encodeSave(state,20,world),world);expect(copy.state.economy).toEqual(state.economy);expect(copy.state.economy!.accounts[0]!.delivery?.id).toBe('lunch_run');
 const delivered=stepCommerce({...copy.state,x:1100,y:750,timeS:.5},{commerce:{kind:'deliver'}},.25,scene);expect(delivered.economy!.accounts[0]!.credits).toBe(24);expect(delivered.economy!.delivered.lunch_run).toBe(1);checkEconomyState(delivered,scene);
});
