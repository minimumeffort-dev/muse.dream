import {it,expect} from 'vitest';
import oldSave from './fixtures/save-v2-r44.json';
import source from '../docs/examples/market-work.dream?raw';
import {createWorldScene} from '../src/scene/world-fixture';
import {compileDreamScene} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {toggleRide} from '../src/sim/interaction';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {saveCompatibilitySource,preCommerceCompatibilitySource,sha256,registeredLegacySource,supportsPreCommerceUpgrade} from '../src/scene/save-compatibility';

it('round-trips reserved work, balances, materials, needs and shared NPC decisions without catch-up',()=>{
 const scene=compileDreamScene(source,{sceneId:'market-save',revisionId:'r1',sourceHash:'current'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const start={...toggleRide(createCarAtSpawn(scene),world),control:{kind:'foot' as const},x:580,y:750,elevation:0,surface:'paper' as const};
 const state=stepCommerce({...start,timeS:.25},{commerce:{kind:'work',job:'bake'}},.25,scene),restored=decodeSave(encodeSave(state,40,world),world).state;
 expect(restored.economy).toEqual(state.economy);checkEconomyState(restored,scene);
 let a=state,b=restored;for(let i=0;i<8;i++){a=stepCommerce({...a,timeS:a.timeS+.25},{},.25,scene);b=stepCommerce({...b,timeS:b.timeS+.25},{},.25,scene);}expect(b).toEqual(a);expect(b.economy!.batches.bake).toBe(1);
});

it('upgrades actual r44 browser saves into the registered first market while preserving their physical world',async()=>{
 const scene=createWorldScene('first-market'),saveCompatibility=await sha256(saveCompatibilitySource(scene)),previousSaveCompatibility=await sha256(preCommerceCompatibilitySource(scene)),emptyEconomySaveCompatibility=await sha256(preCommerceCompatibilitySource(scene,2)),previousSaveSource=registeredLegacySource(emptyEconomySaveCompatibility);
 expect(saveCompatibility).toBe('7e7924b86ad629d97771b9717f6817a25105005329ace6032573df39b4469ada');expect(supportsPreCommerceUpgrade(scene,saveCompatibility)).toBe(true);expect(previousSaveSource).toBe(oldSave.sourceHash);
 const world:World={scene,saveCompatibility,previousSaveCompatibility,emptyEconomySaveCompatibility,previousSaveSource,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const old=JSON.stringify(oldSave),copy=decodeSave(old,world);expect(copy.migrated).toBe(true);expect(copy.state.x).toBe(oldSave.state.x);expect(copy.state.vehicles).toEqual(oldSave.state.vehicles);expect(copy.state.npcs).toEqual(oldSave.state.npcs);expect(copy.state.population).toEqual(oldSave.state.population);expect(copy.worldTime).toBe(oldSave.worldTime);expect(copy.state.economy!.atS).toBe(oldSave.state.timeS);expect(copy.state.economy!.accounts[0]!.credits).toBe(20);checkEconomyState(copy.state,scene);
 const legacy={...oldSave,version:1} as any;delete legacy.compatibilityHash;expect(decodeSave(JSON.stringify(legacy),world).state.economy).toEqual(copy.state.economy);
 const key=`muse-dream.save.v2.${scene.sceneId}.${oldSave.compatibilityHash}`,rows=new Map([[key,old]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}};
 const slot=gameSave(world,()=>storage);expect(slot.restored?.migrated).toBe(true);expect(slot.write(slot.restored!.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(old);expect(JSON.parse(rows.get(slot.key)!).version).toBe(3);
 const changed={...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>({...a,credits:a.credits+1}))}};
 expect(supportsPreCommerceUpgrade(changed,await sha256(saveCompatibilitySource(changed)))).toBe(false);
 const unsupported={...world,scene:changed,previousSaveCompatibility:undefined,emptyEconomySaveCompatibility:undefined,previousSaveSource:undefined};expect(()=>decodeSave(old,unsupported)).toThrow('different world');
});
