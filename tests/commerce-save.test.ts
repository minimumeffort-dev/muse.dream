import {it,expect} from 'vitest';
import oldSave from './fixtures/save-v2-r44.json';
import marketSave from './fixtures/save-v3-r45.json';
import deliverySave from './fixtures/save-v4-r46.json';
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
import {saveCompatibilitySource,preCommerceCompatibilitySource,sha256,registeredLegacySource,supportsPreCommerceUpgrade,preDeliveryCompatibilitySource,DELIVERY_COMPATIBILITY,PARKING_COMPATIBILITY,REPAIR_COMPATIBILITY,SUPPLY_COMPATIBILITY,preSupplyCompatibilitySource,preRepairCompatibilitySource,preParkingScene,preParkingCompatibilitySource} from '../src/scene/save-compatibility';

it('round-trips reserved work, balances, materials, needs and shared NPC decisions without catch-up',()=>{
 const scene=compileDreamScene(source,{sceneId:'market-save',revisionId:'r1',sourceHash:'current'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const start={...toggleRide(createCarAtSpawn(scene),world),control:{kind:'foot' as const},x:580,y:750,elevation:0,surface:'paper' as const};
 const state=stepCommerce({...start,timeS:.25},{commerce:{kind:'work',job:'bake'}},.25,scene),restored=decodeSave(encodeSave(state,40,world),world).state;
 expect(restored.economy).toEqual(state.economy);checkEconomyState(restored,scene);
 let a=state,b=restored;for(let i=0;i<8;i++){a=stepCommerce({...a,timeS:a.timeS+.25},{},.25,scene);b=stepCommerce({...b,timeS:b.timeS+.25},{},.25,scene);}expect(b).toEqual(a);expect(b.economy!.batches.bake).toBe(1);
});

it('upgrades actual r44 browser saves into the registered first market while preserving their physical world',async()=>{
 const scene=createWorldScene('first-market'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousSaveCompatibility=await sha256(preCommerceCompatibilitySource(preParkingScene(scene))),emptyEconomySaveCompatibility=await sha256(preCommerceCompatibilitySource(preParkingScene(scene),2)),previousSaveSource=registeredLegacySource(emptyEconomySaveCompatibility);
 expect(saveCompatibility).toBe(SUPPLY_COMPATIBILITY);expect(supportsPreCommerceUpgrade(scene,saveCompatibility)).toBe(true);expect(previousSaveSource).toBe(oldSave.sourceHash);
 const world:World={scene,saveCompatibility,previousRepairSaveCompatibility:PARKING_COMPATIBILITY,previousParkingSaveCompatibility:DELIVERY_COMPATIBILITY,previousSaveCompatibility,emptyEconomySaveCompatibility,previousSaveSource,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const old=JSON.stringify(oldSave),copy=decodeSave(old,world);expect(copy.migrated).toBe(true);expect(copy.state.x).toBe(oldSave.state.x);expect(copy.state.vehicles).toEqual(oldSave.state.vehicles);expect(copy.state.npcs).toEqual(oldSave.state.npcs);expect(copy.state.population).toEqual(oldSave.state.population);expect(copy.worldTime).toBe(oldSave.worldTime);expect(copy.state.economy!.atS).toBe(oldSave.state.timeS);expect(copy.state.economy!.accounts[0]!.credits).toBe(20);checkEconomyState(copy.state,scene);
 const legacy={...oldSave,version:1} as any;delete legacy.compatibilityHash;expect(decodeSave(JSON.stringify(legacy),world).state.economy).toEqual(copy.state.economy);
 const key=`muse-dream.save.v2.${scene.sceneId}.${oldSave.compatibilityHash}`,rows=new Map([[key,old]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}};
 const slot=gameSave(world,()=>storage);expect(slot.restored?.migrated).toBe(true);expect(slot.write(slot.restored!.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(old);expect(JSON.parse(rows.get(slot.key)!).version).toBe(6);
 const changed={...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>({...a,credits:a.credits+1}))}};
 expect(supportsPreCommerceUpgrade(changed,await sha256(saveCompatibilitySource(changed)))).toBe(false);
 const unsupported={...world,scene:changed,previousSaveCompatibility:undefined,emptyEconomySaveCompatibility:undefined,previousSaveSource:undefined};expect(()=>decodeSave(old,unsupported)).toThrow('different world');
});

it('migrates an actual reserved format 3 batch without resetting stock, credits, needs or work time',async()=>{
 const scene=createWorldScene('delivery-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousMarketSaveCompatibility=await sha256(preDeliveryCompatibilitySource(preParkingScene(scene)));
 expect(previousMarketSaveCompatibility).toBe(marketSave.compatibilityHash);expect(saveCompatibility).toBe(SUPPLY_COMPATIBILITY);
 const world:World={scene,saveCompatibility,previousRepairSaveCompatibility:PARKING_COMPATIBILITY,previousParkingSaveCompatibility:DELIVERY_COMPATIBILITY,previousMarketSaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const fresh=createCarAtSpawn(scene),profile=cargoReviewStart(fresh,world,'school_run');expect(cargoReviewStart(fresh,world,null)).toBe(fresh);expect(profile.control.kind).toBe('car');expect(profile.economy!.accounts[0]!.delivery?.id).toBe('school_run');checkEconomyState(profile,scene);
 const text=JSON.stringify(marketSave),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);expect(copy.state.economy!.accounts[0]).toMatchObject(marketSave.state.economy.accounts[0]!);expect(copy.state.economy!.accounts[0]!.inventory.timber).toBe(0);expect(copy.state.economy!.markets.find(m=>m.id==='market_stall')).toMatchObject(marketSave.state.economy.markets[0]!);expect(copy.state.population).toEqual(marketSave.state.population);expect(copy.state.economy!.delivered).toEqual({flour_run:0,school_run:0,kits_run:0});checkEconomyState(copy.state,scene);
 let s=copy.state;for(let i=0;i<28;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);expect(s.economy!.accounts[0]!.credits).toBe(marketSave.state.economy.accounts[0]!.credits+3);expect(s.economy!.batches.bake).toBe(marketSave.state.economy.batches.bake+1);checkEconomyState(s,scene);
 const rows=new Map([[`muse-dream.save.v3.${scene.sceneId}.${previousMarketSaveCompatibility}`,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.size).toBe(2);expect(JSON.parse(rows.get(slot.key)!).version).toBe(6);
 const changed={...world,previousMarketSaveCompatibility:undefined};expect(()=>decodeSave(text,changed)).toThrow('different world');
});

it('round-trips sealed cargo through pause, vehicle travel and completion without creating stock or wages',()=>{
 const scene=compileDreamScene(deliverySource,{sceneId:'cargo-save',revisionId:'r1',sourceHash:'cargo'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 let state={...toggleRide(createCarAtSpawn(scene),world),x:580,y:750};state=stepCommerce({...state,timeS:.25},{commerce:{kind:'collect',delivery:'lunch_run'}},.25,scene);
 const copy=decodeSave(encodeSave(state,20,world),world);expect(copy.state.economy).toEqual(state.economy);expect(copy.state.economy!.accounts[0]!.delivery?.id).toBe('lunch_run');
 const delivered=stepCommerce({...copy.state,x:1100,y:750,timeS:.5},{commerce:{kind:'deliver'}},.25,scene);expect(delivered.economy!.accounts[0]!.credits).toBe(24);expect(delivered.economy!.delivered.lunch_run).toBe(1);checkEconomyState(delivered,scene);
});

it('upgrades the actual format 4 delivery backup, rejects forged old ownership and keeps its slot intact',async()=>{
 const scene=createWorldScene('parking-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousParkingSaveCompatibility=await sha256(preParkingCompatibilitySource(scene));
 expect(previousParkingSaveCompatibility).toBe(deliverySave.compatibilityHash);expect(saveCompatibility).toBe(SUPPLY_COMPATIBILITY);
 const world:World={scene,saveCompatibility,previousRepairSaveCompatibility:PARKING_COMPATIBILITY,previousParkingSaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const text=JSON.stringify(deliverySave),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);for(const a of deliverySave.state.economy.accounts)expect(copy.state.economy!.accounts.find(b=>b.id===a.id)).toMatchObject(a);for(const m of deliverySave.state.economy.markets)expect(copy.state.economy!.markets.find(n=>n.id===m.id)).toMatchObject(m);expect(copy.state.economy!.repaired).toEqual({market_tables:0});expect(copy.state.vehicles).toEqual(deliverySave.state.vehicles);expect(copy.state.population).toEqual(deliverySave.state.population);expect(copy.state.npcs).toEqual(deliverySave.state.npcs);expect(copy.worldTime).toBe(deliverySave.worldTime);
 const parked=scene.objects.find(o=>o.parked)!;
 const forged={...deliverySave,state:{...deliverySave.state,control:{kind:'vehicle',id:parked.id}}};expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');
 const key=`muse-dream.save.v4.${scene.sceneId}.${previousParkingSaveCompatibility}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(JSON.parse(rows.get(slot.key)!).version).toBe(6);
 rows.set(slot.key,'corrupt');expect(gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:()=>{}})).blocked).toBe(true);
 expect(()=>decodeSave(text,{...world,previousParkingSaveCompatibility:undefined})).toThrow('different world');
});

 it('upgrades the actual format 5 parked bicycle without losing fleet ownership, needs, accounts or memory',async()=>{
 const {default:old}=await import('./fixtures/save-v5-r47.json');
 const scene=createWorldScene('repair-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousRepairSaveCompatibility=await sha256(preRepairCompatibilitySource(scene));
 expect(previousRepairSaveCompatibility).toBe(old.compatibilityHash);expect(saveCompatibility).toBe(SUPPLY_COMPATIBILITY);
 const world:World={scene,saveCompatibility,previousRepairSaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const text=JSON.stringify(old),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);expect(copy.state.vehicles).toEqual(old.state.vehicles);expect(copy.state.npcs).toEqual(old.state.npcs);expect(copy.state.population).toEqual(old.state.population);
 for(const a of old.state.economy.accounts)expect(copy.state.economy!.accounts.find(b=>b.id===a.id)).toMatchObject(a);for(const m of old.state.economy.markets)expect(copy.state.economy!.markets.find(n=>n.id===m.id)).toMatchObject(m);expect(copy.state.economy!.repaired).toEqual({market_tables:0});checkEconomyState(copy.state,scene);
 const key=`muse-dream.save.v5.${scene.sceneId}.${previousRepairSaveCompatibility}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(JSON.parse(rows.get(slot.key)!).version).toBe(6);
 const forged=structuredClone(old);forged.state.economy.accounts[0]!.credits++;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');expect(()=>decodeSave(text,{...world,previousRepairSaveCompatibility:undefined})).toThrow('different world');
 });

it('upgrades a real r48 in-progress repair without resetting its ledger, clock, needs, parked vehicles or memories',async()=>{
 const {default:old}=await import('./fixtures/save-v6-r48.json');
 const scene=createWorldScene('supply-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousSupplySaveCompatibility=await sha256(preSupplyCompatibilitySource(scene));
 expect(previousSupplySaveCompatibility).toBe(old.compatibilityHash);expect(previousSupplySaveCompatibility).toBe(REPAIR_COMPATIBILITY);expect(saveCompatibility).toBe(SUPPLY_COMPATIBILITY);
 const world:World={scene,saveCompatibility,previousSupplySaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const text=JSON.stringify(old),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);expect(copy.state.vehicles).toEqual(old.state.vehicles);expect(copy.state.npcs).toEqual(old.state.npcs);expect(copy.state.population).toEqual(old.state.population);expect(copy.worldTime).toBe(old.worldTime);
 expect(copy.state.economy!.accounts).toEqual(old.state.economy.accounts);expect(copy.state.economy!.repaired).toEqual(old.state.economy.repaired);expect(copy.state.economy!.delivered).toEqual({...old.state.economy.delivered,kits_run:0});expect(copy.state.economy!.markets.find(m=>m.id==='station_supplies')!.stock).toEqual({flour:80,timber:32});checkEconomyState(copy.state,scene);
 let s=copy.state;for(let i=0;i<32;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);
 expect(s.economy!.repaired.market_tables).toBe(1);expect(s.broken).not.toContain('picnic_table');expect(s.economy!.accounts.find(a=>a.id==='caretaker')!.credits).toBe(4);checkEconomyState(s,scene);
 const {default:completed}=await import('./fixtures/save-v6-r48-complete.json'),finished=decodeSave(JSON.stringify(completed),world);expect(finished.state.economy!.repaired.market_tables).toBe(1);expect(finished.state.economy!.markets.find(m=>m.id==='market_stall')!.stock.timber).toBe(11);expect(finished.state.economy!.accounts.find(a=>a.id==='caretaker')!.credits).toBe(4);checkEconomyState(finished.state,scene);
 const key=`muse-dream.save.v6.${scene.sceneId}.${previousSupplySaveCompatibility}`,rows=new Map([[key,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},slot=gameSave(world,()=>storage);
 expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);rows.set(slot.key,'corrupt');expect(gameSave(world,()=>storage).blocked).toBe(true);
 const forged=structuredClone(old);forged.state.economy.repaired.market_tables++;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');expect(()=>decodeSave(text,{...world,previousSupplySaveCompatibility:undefined})).toThrow('different world');
});
