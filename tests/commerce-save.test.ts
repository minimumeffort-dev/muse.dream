import {it,expect} from 'vitest';
import {ambientNavigation} from '../src/scene/ambient-navigation';
import type {CarState} from '../src/sim/car';
import type {Scene} from '../src/scene/schema';
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
import {saveCompatibilitySource,preCommerceCompatibilitySource,sha256,registeredLegacySource,supportsPreCommerceUpgrade,preDeliveryCompatibilitySource,DELIVERY_COMPATIBILITY,PARKING_COMPATIBILITY,REPAIR_COMPATIBILITY,SUPPLY_COMPATIBILITY,NATURAL_COMPATIBILITY,PLANT_COMPATIBILITY,preFinishScene,preFinishCompatibilitySource,prePlantScene,prePlantCompatibilitySource,VERGE_COMPATIBILITY,preVergeScene,POOL_COMPATIBILITY,preVergeCompatibilitySource,prePoolCompatibilitySource,NETWORK_COMPATIBILITY,preNetworkCompatibilitySource,preSupplyCompatibilitySource,preRepairCompatibilitySource,preParkingScene,preParkingCompatibilitySource} from '../src/scene/save-compatibility';

function expectPopulation(state:CarState,previous:any,scene:Scene){
 const prior=preVergeScene(scene),normalize=(population:any,world:Scene)=>{const nodes=ambientNavigation(world).nodes;return {...population,members:population.members.map((m:any)=>({...m,node:m.node<0 ? m.node : nodes[m.node],previous:m.previous<0 ? m.previous : nodes[m.previous]})).map(({node,previous,...m}:any)=>({...m,node:node && typeof node==='object' ? {x:node.x,y:node.y} : node,previous:previous && typeof previous==='object' ? {x:previous.x,y:previous.y} : previous}))};};
 expect(normalize(state.population,scene)).toEqual(normalize(previous,prior));
}
function priorPlantingEconomy(e:any){
 const remove=(r:any,...ids:string[])=>Object.fromEntries(Object.entries(r).filter(([key])=>!ids.includes(key)));
 return {...e,accounts:e.accounts.map((a:any)=>({...a,inventory:remove(a.inventory,'sapling')})),markets:e.markets.map((m:any)=>({...m,stock:remove(m.stock,'sapling')})),consumed:remove(e.consumed,'sapling'),repaired:remove(e.repaired,'orchard_trees'),delivered:remove(e.delivered,'saplings_run')};
}
function expectState(state:CarState,previous:any,scene:Scene){const {population,...actual}=state,{population:old,...rest}=previous;expect({...actual,economy:priorPlantingEconomy(actual.economy)}).toEqual(rest);expectPopulation(state,old,scene);}

it('round-trips reserved work, balances, materials, needs and shared NPC decisions without catch-up',()=>{
 const scene=compileDreamScene(source,{sceneId:'market-save',revisionId:'r1',sourceHash:'current'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const start={...toggleRide(createCarAtSpawn(scene),world),control:{kind:'foot' as const},x:580,y:750,elevation:0,surface:'paper' as const};
 const state=stepCommerce({...start,timeS:.25},{commerce:{kind:'work',job:'bake'}},.25,scene),restored=decodeSave(encodeSave(state,40,world),world).state;
 expect(restored.economy).toEqual(state.economy);checkEconomyState(restored,scene);
 let a=state,b=restored;for(let i=0;i<8;i++){a=stepCommerce({...a,timeS:a.timeS+.25},{},.25,scene);b=stepCommerce({...b,timeS:b.timeS+.25},{},.25,scene);}expect(b).toEqual(a);expect(b.economy!.batches.bake).toBe(1);
});

it('upgrades actual r44 browser saves into the registered first market while preserving their physical world',async()=>{
 const scene=createWorldScene('first-market'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousSaveCompatibility=await sha256(preCommerceCompatibilitySource(preParkingScene(scene))),emptyEconomySaveCompatibility=await sha256(preCommerceCompatibilitySource(preParkingScene(scene),2)),previousSaveSource=registeredLegacySource(emptyEconomySaveCompatibility);
 expect(saveCompatibility).toBe(NATURAL_COMPATIBILITY);expect(supportsPreCommerceUpgrade(scene,saveCompatibility)).toBe(true);expect(previousSaveSource).toBe(oldSave.sourceHash);
 const world:World={scene,saveCompatibility,previousFinishSaveCompatibility:PLANT_COMPATIBILITY,previousPlantSaveCompatibility:VERGE_COMPATIBILITY,previousVergeSaveCompatibility:POOL_COMPATIBILITY,previousRepairSaveCompatibility:PARKING_COMPATIBILITY,previousParkingSaveCompatibility:DELIVERY_COMPATIBILITY,previousSaveCompatibility,emptyEconomySaveCompatibility,previousSaveSource,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const old=JSON.stringify(oldSave),copy=decodeSave(old,world);expect(copy.migrated).toBe(true);expect(copy.state.x).toBe(oldSave.state.x);expect(copy.state.vehicles).toEqual(oldSave.state.vehicles);expect(copy.state.npcs).toEqual(oldSave.state.npcs);expectPopulation(copy.state,oldSave.state.population,scene);expect(copy.worldTime).toBe(oldSave.worldTime);expect(copy.state.economy!.atS).toBe(oldSave.state.timeS);expect(copy.state.economy!.accounts[0]!.credits).toBe(20);checkEconomyState(copy.state,scene);
 const legacy={...oldSave,version:1} as any;delete legacy.compatibilityHash;expect(decodeSave(JSON.stringify(legacy),world).state.economy).toEqual(copy.state.economy);
 const key=`muse-dream.save.v2.${scene.sceneId}.${oldSave.compatibilityHash}`,rows=new Map([[key,old]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}};
 const slot=gameSave(world,()=>storage);expect(slot.restored?.migrated).toBe(true);expect(slot.write(slot.restored!.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(old);expect(JSON.parse(rows.get(slot.key)!).version).toBe(8);
 const changed={...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>({...a,credits:a.credits+1}))}};
 expect(supportsPreCommerceUpgrade(changed,await sha256(saveCompatibilitySource(changed)))).toBe(false);
 const unsupported={...world,scene:changed,previousSaveCompatibility:undefined,emptyEconomySaveCompatibility:undefined,previousSaveSource:undefined};expect(()=>decodeSave(old,unsupported)).toThrow('different world');
});

it('migrates an actual reserved format 3 batch without resetting stock, credits, needs or work time',async()=>{
 const scene=createWorldScene('delivery-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousMarketSaveCompatibility=await sha256(preDeliveryCompatibilitySource(preParkingScene(scene)));
 expect(previousMarketSaveCompatibility).toBe(marketSave.compatibilityHash);expect(saveCompatibility).toBe(NATURAL_COMPATIBILITY);
 const world:World={scene,saveCompatibility,previousFinishSaveCompatibility:PLANT_COMPATIBILITY,previousPlantSaveCompatibility:VERGE_COMPATIBILITY,previousVergeSaveCompatibility:POOL_COMPATIBILITY,previousRepairSaveCompatibility:PARKING_COMPATIBILITY,previousParkingSaveCompatibility:DELIVERY_COMPATIBILITY,previousMarketSaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const fresh=createCarAtSpawn(scene),profile=cargoReviewStart(fresh,world,'school_run');expect(cargoReviewStart(fresh,world,null)).toBe(fresh);expect(profile.control.kind).toBe('car');expect(profile.economy!.accounts[0]!.delivery?.id).toBe('school_run');checkEconomyState(profile,scene);
 const text=JSON.stringify(marketSave),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);expect(copy.state.economy!.accounts[0]).toMatchObject(marketSave.state.economy.accounts[0]!);expect(copy.state.economy!.accounts[0]!.inventory.timber).toBe(0);expect(copy.state.economy!.markets.find(m=>m.id==='market_stall')).toMatchObject(marketSave.state.economy.markets[0]!);expectPopulation(copy.state,marketSave.state.population,scene);expect(copy.state.economy!.delivered).toEqual({flour_run:0,school_run:0,kits_run:0,saplings_run:0});checkEconomyState(copy.state,scene);
 let s=copy.state;for(let i=0;i<28;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);expect(s.economy!.accounts[0]!.credits).toBe(marketSave.state.economy.accounts[0]!.credits+3);expect(s.economy!.batches.bake).toBe(marketSave.state.economy.batches.bake+1);checkEconomyState(s,scene);
 const rows=new Map([[`muse-dream.save.v3.${scene.sceneId}.${previousMarketSaveCompatibility}`,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.size).toBe(2);expect(JSON.parse(rows.get(slot.key)!).version).toBe(8);
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
 expect(previousParkingSaveCompatibility).toBe(deliverySave.compatibilityHash);expect(saveCompatibility).toBe(NATURAL_COMPATIBILITY);
 const world:World={scene,saveCompatibility,previousFinishSaveCompatibility:PLANT_COMPATIBILITY,previousPlantSaveCompatibility:VERGE_COMPATIBILITY,previousVergeSaveCompatibility:POOL_COMPATIBILITY,previousRepairSaveCompatibility:PARKING_COMPATIBILITY,previousParkingSaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const text=JSON.stringify(deliverySave),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);for(const a of deliverySave.state.economy.accounts)expect(copy.state.economy!.accounts.find(b=>b.id===a.id)).toMatchObject(a);for(const m of deliverySave.state.economy.markets)expect(copy.state.economy!.markets.find(n=>n.id===m.id)).toMatchObject(m);expect(copy.state.economy!.repaired).toEqual({market_tables:0,orchard_trees:0});expect(copy.state.vehicles).toEqual(deliverySave.state.vehicles);expectPopulation(copy.state,deliverySave.state.population,scene);expect(copy.state.npcs).toEqual(deliverySave.state.npcs);expect(copy.worldTime).toBe(deliverySave.worldTime);
 const parked=scene.objects.find(o=>o.parked)!;
 const forged={...deliverySave,state:{...deliverySave.state,control:{kind:'vehicle',id:parked.id}}};expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');
 const key=`muse-dream.save.v4.${scene.sceneId}.${previousParkingSaveCompatibility}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(JSON.parse(rows.get(slot.key)!).version).toBe(8);
 rows.set(slot.key,'corrupt');expect(gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:()=>{}})).blocked).toBe(true);
 expect(()=>decodeSave(text,{...world,previousParkingSaveCompatibility:undefined})).toThrow('different world');
});

 it('upgrades the actual format 5 parked bicycle without losing fleet ownership, needs, accounts or memory',async()=>{
 const {default:old}=await import('./fixtures/save-v5-r47.json');
 const scene=createWorldScene('repair-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousRepairSaveCompatibility=await sha256(preRepairCompatibilitySource(scene));
 expect(previousRepairSaveCompatibility).toBe(old.compatibilityHash);expect(saveCompatibility).toBe(NATURAL_COMPATIBILITY);
 const world:World={scene,saveCompatibility,previousFinishSaveCompatibility:PLANT_COMPATIBILITY,previousPlantSaveCompatibility:VERGE_COMPATIBILITY,previousVergeSaveCompatibility:POOL_COMPATIBILITY,previousRepairSaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const text=JSON.stringify(old),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);expect(copy.state.vehicles).toEqual(old.state.vehicles);expect(copy.state.npcs).toEqual(old.state.npcs);expectPopulation(copy.state,old.state.population,scene);
 for(const a of old.state.economy.accounts)expect(copy.state.economy!.accounts.find(b=>b.id===a.id)).toMatchObject(a);for(const m of old.state.economy.markets)expect(copy.state.economy!.markets.find(n=>n.id===m.id)).toMatchObject(m);expect(copy.state.economy!.repaired).toEqual({market_tables:0,orchard_trees:0});checkEconomyState(copy.state,scene);
 const key=`muse-dream.save.v5.${scene.sceneId}.${previousRepairSaveCompatibility}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(JSON.parse(rows.get(slot.key)!).version).toBe(8);
 const forged=structuredClone(old);forged.state.economy.accounts[0]!.credits++;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');expect(()=>decodeSave(text,{...world,previousRepairSaveCompatibility:undefined})).toThrow('different world');
 });

it('upgrades a real r48 in-progress repair without resetting its ledger, clock, needs, parked vehicles or memories',async()=>{
 const {default:old}=await import('./fixtures/save-v6-r48.json');
 const scene=createWorldScene('supply-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousSupplySaveCompatibility=await sha256(preSupplyCompatibilitySource(scene));
 expect(previousSupplySaveCompatibility).toBe(old.compatibilityHash);expect(previousSupplySaveCompatibility).toBe(REPAIR_COMPATIBILITY);expect(saveCompatibility).toBe(NATURAL_COMPATIBILITY);
 const world:World={scene,saveCompatibility,previousFinishSaveCompatibility:PLANT_COMPATIBILITY,previousPlantSaveCompatibility:VERGE_COMPATIBILITY,previousVergeSaveCompatibility:POOL_COMPATIBILITY,previousSupplySaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const text=JSON.stringify(old),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);expect(copy.state.vehicles).toEqual(old.state.vehicles);expect(copy.state.npcs).toEqual(old.state.npcs);expectPopulation(copy.state,old.state.population,scene);expect(copy.worldTime).toBe(old.worldTime);
 expect(priorPlantingEconomy(copy.state.economy).accounts).toEqual(old.state.economy.accounts);expect(priorPlantingEconomy(copy.state.economy).repaired).toEqual(old.state.economy.repaired);expect(copy.state.economy!.delivered).toEqual({...old.state.economy.delivered,kits_run:0,saplings_run:0});expect(copy.state.economy!.markets.find(m=>m.id==='station_supplies')!.stock).toEqual({flour:80,timber:32,sapling:18});checkEconomyState(copy.state,scene);
 let s=copy.state;for(let i=0;i<32;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);
 expect(s.economy!.repaired.market_tables).toBe(1);expect(s.broken).not.toContain('picnic_table');expect(s.economy!.accounts.find(a=>a.id==='caretaker')!.credits).toBe(4);checkEconomyState(s,scene);
 const {default:completed}=await import('./fixtures/save-v6-r48-complete.json'),finished=decodeSave(JSON.stringify(completed),world);expect(finished.state.economy!.repaired.market_tables).toBe(1);expect(finished.state.economy!.markets.find(m=>m.id==='market_stall')!.stock.timber).toBe(11);expect(finished.state.economy!.accounts.find(a=>a.id==='caretaker')!.credits).toBe(4);checkEconomyState(finished.state,scene);
 const key=`muse-dream.save.v6.${scene.sceneId}.${previousSupplySaveCompatibility}`,rows=new Map([[key,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},slot=gameSave(world,()=>storage);
 expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);rows.set(slot.key,'corrupt');expect(gameSave(world,()=>storage).blocked).toBe(true);
 const forged=structuredClone(old);forged.state.economy.repaired.market_tables++;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');expect(()=>decodeSave(text,{...world,previousSupplySaveCompatibility:undefined})).toThrow('different world');
});

it('keeps an actual r49 world intact when adding connected service grounds, including paid procurement and completed repairs',async()=>{
 const {default:old}=await import('./fixtures/save-v6-r49.json'),scene=createWorldScene('network-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousNetworkSaveCompatibility=await sha256(preNetworkCompatibilitySource(scene));
 expect(saveCompatibility).toBe(NATURAL_COMPATIBILITY);expect(previousNetworkSaveCompatibility).toBe(old.compatibilityHash);expect(previousNetworkSaveCompatibility).toBe(SUPPLY_COMPATIBILITY);
 const world:World={scene,saveCompatibility,previousFinishSaveCompatibility:PLANT_COMPATIBILITY,previousPlantSaveCompatibility:VERGE_COMPATIBILITY,previousVergeSaveCompatibility:POOL_COMPATIBILITY,previousNetworkSaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11},text=JSON.stringify(old),copy=decodeSave(text,world);
 expect(copy.migrated).toBe(true);expectState(copy.state,old.state,scene);expect(copy.worldTime).toBe(old.worldTime);expect(copy.state.economy!.delivered.kits_run).toBe(1);expect(copy.state.economy!.repaired.market_tables).toBe(2);checkEconomyState(copy.state,scene);
 const key=`muse-dream.save.v6.${scene.sceneId}.${previousNetworkSaveCompatibility}`,rows=new Map([[key,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},slot=gameSave(world,()=>storage);expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);rows.set(slot.key,'broken');expect(gameSave(world,()=>storage).blocked).toBe(true);
 const forged=structuredClone(old);forged.state.economy.repaired.market_tables++;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');expect(()=>decodeSave(text,{...world,previousNetworkSaveCompatibility:undefined})).toThrow('different world');
});


it('preserves an actual r50 saved repair and return world through pooled lamp destruction',async()=>{
 const {default:old}=await import('./fixtures/save-v6-r50.json'),scene=createWorldScene('pool-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousPoolSaveCompatibility=await sha256(prePoolCompatibilitySource(scene));
 expect(saveCompatibility).toBe(NATURAL_COMPATIBILITY);expect(previousPoolSaveCompatibility).toBe(NETWORK_COMPATIBILITY);expect(previousPoolSaveCompatibility).toBe(old.compatibilityHash);
 const world:World={scene,saveCompatibility,previousFinishSaveCompatibility:PLANT_COMPATIBILITY,previousPlantSaveCompatibility:VERGE_COMPATIBILITY,previousVergeSaveCompatibility:POOL_COMPATIBILITY,previousPoolSaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11},text=JSON.stringify(old),copy=decodeSave(text,world);
 expect(copy.migrated).toBe(true);expectState(copy.state,old.state,scene);expect(copy.worldTime).toBe(old.worldTime);
 const key=`muse-dream.save.v6.${scene.sceneId}.${previousPoolSaveCompatibility}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(JSON.parse(rows.get(slot.key)!).version).toBe(8);expect(rows.get(key)).toBe(text);
 const forged=structuredClone(old);forged.state.economy.repaired.market_tables++;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');expect(()=>decodeSave(text,{...world,previousPoolSaveCompatibility:undefined})).toThrow('different world');
});

it('rebases actual r51 pedestrian references while preserving damage, the active worker and every other saved field',async()=>{
 const {default:old}=await import('./fixtures/save-v7-r51.json'),scene=createWorldScene('verge-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousVergeSaveCompatibility=await sha256(preVergeCompatibilitySource(scene));
 expect(saveCompatibility).toBe(NATURAL_COMPATIBILITY);expect(previousVergeSaveCompatibility).toBe(POOL_COMPATIBILITY);expect(previousVergeSaveCompatibility).toBe(old.compatibilityHash);
 const world:World={scene,saveCompatibility,previousFinishSaveCompatibility:PLANT_COMPATIBILITY,previousPlantSaveCompatibility:VERGE_COMPATIBILITY,previousVergeSaveCompatibility,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11},text=JSON.stringify(old),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);expectState(copy.state,old.state,scene);expect(copy.worldTime).toBe(old.worldTime);checkEconomyState(copy.state,scene);
 const before=ambientNavigation(preVergeScene(scene)).nodes,after=ambientNavigation(scene).nodes;expect(after.length).toBeGreaterThan(before.length);expect(copy.state.population!.members.some((m,i)=>m.node!==old.state.population.members[i]!.node)).toBe(true);
 const forged=structuredClone(old);forged.state.population.members.find(m=>m.node>=0)!.node=before.length;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');expect(()=>decodeSave(text,{...world,previousVergeSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v7.${scene.sceneId}.${previousVergeSaveCompatibility}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);rows.set(slot.key,'broken');expect(gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:()=>{}})).blocked).toBe(true);
});

it('upgrades actual r52 progress with only finite saplings and empty new ledgers initialized',async()=>{
 const {default:old}=await import('./fixtures/save-v7-r52.json'),scene=createWorldScene('plant-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousPlantSaveCompatibility=await sha256(prePlantCompatibilitySource(scene));expect(saveCompatibility).toBe(NATURAL_COMPATIBILITY);expect(previousPlantSaveCompatibility).toBe(VERGE_COMPATIBILITY);expect(previousPlantSaveCompatibility).toBe(old.compatibilityHash);
 const world:World={scene,saveCompatibility,previousFinishSaveCompatibility:PLANT_COMPATIBILITY,previousPlantSaveCompatibility,previousVergeSaveCompatibility:POOL_COMPATIBILITY,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11},text=JSON.stringify(old),copy=decodeSave(text,world),e=copy.state.economy!;expect(copy.migrated).toBe(true);expect({...copy.state,economy:priorPlantingEconomy(e)}).toEqual(old.state);expect(copy.worldTime).toBe(old.worldTime);expect(copy.state.growing).toBeUndefined();expect(e.accounts.every(a=>a.inventory.sapling===0)).toBe(true);expect(e.markets.find(m=>m.id==='market_stall')!.stock.sapling).toBe(6);expect(e.markets.find(m=>m.id==='station_supplies')!.stock.sapling).toBe(18);expect(e.repaired.orchard_trees).toBe(0);expect(e.delivered.saplings_run).toBe(0);checkEconomyState(copy.state,scene);
 const key=`muse-dream.save.v7.${scene.sceneId}.${previousPlantSaveCompatibility}`,rows=new Map([[key,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},slot=gameSave(world,()=>storage);expect(slot.restored?.migrated).toBe(true);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(JSON.parse(rows.get(slot.key)!).version).toBe(8);expect(rows.get(key)).toBe(text);rows.set(slot.key,'broken');expect(gameSave(world,()=>storage).blocked).toBe(true);
 const forged=structuredClone(old);(forged.state.economy.accounts[0]!.inventory as any).sapling=1;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');expect(()=>decodeSave(text,{...world,previousPlantSaveCompatibility:undefined})).toThrow('different world');
});


it('preserves an actual r53 growing tree, return journey and every ledger through the natural-ground upgrade',async()=>{
 const {default:old}=await import('./fixtures/save-v8-r53.json'),scene=createWorldScene('natural-upgrade'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousFinishSaveCompatibility=await sha256(preFinishCompatibilitySource(scene));
 expect(saveCompatibility).toBe(NATURAL_COMPATIBILITY);expect(previousFinishSaveCompatibility).toBe(PLANT_COMPATIBILITY);expect(previousFinishSaveCompatibility).toBe(old.compatibilityHash);
 const world:World={scene,saveCompatibility,previousFinishSaveCompatibility,previousPlantSaveCompatibility:VERGE_COMPATIBILITY,previousVergeSaveCompatibility:POOL_COMPATIBILITY,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11},text=JSON.stringify(old),copy=decodeSave(text,world);
 expect(copy.migrated).toBe(true);expect(copy.state).toEqual(old.state);expect(copy.worldTime).toBe(old.worldTime);expect(copy.state.growing).toHaveLength(1);expect(copy.state.economy!.repaired.orchard_trees).toBe(1);expect(ambientNavigation(scene).nodes).toEqual(ambientNavigation(preFinishScene(scene)).nodes);checkEconomyState(copy.state,scene);
 const key=`muse-dream.save.v8.${scene.sceneId}.${previousFinishSaveCompatibility}`,rows=new Map([[key,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},slot=gameSave(world,()=>storage);expect(slot.restored?.state).toEqual(old.state);expect(slot.write(copy.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);rows.set(slot.key,'broken');expect(gameSave(world,()=>storage).blocked).toBe(true);
 expect(()=>decodeSave(text,{...world,previousFinishSaveCompatibility:undefined})).toThrow('different world');
});
