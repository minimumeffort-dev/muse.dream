import {saveCompatibilitySource} from './fixtures/pre-city-world';
import {it,expect} from 'vitest';
import {createWorldScene} from './fixtures/pre-city-world';
import {MATCH_COMPATIBILITY,BUSINESS_COMPATIBILITY,SCHOOL_REPAIR_COMPATIBILITY,SOCIAL_COMPATIBILITY,preMatchScene,preBusinessScene,preBusinessCompatibilitySource,sha256} from '../src/scene/save-compatibility';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {commerceReason} from '../src/sim/commerce';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {SAVE_VERSION,decodeSave,encodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {repairNavigation} from '../src/sim/repair';
import {inheritPriorRepairCoverage} from '../src/scene/commerce';
import {preBusinessState} from './pre-business-state';
import prior from './fixtures/save-v14-r65-return.json';
import owned from './fixtures/save-v15-r66-business.json';

const scene=createWorldScene(),world:World={scene,saveCompatibility:MATCH_COMPATIBILITY,previousMatchSaveCompatibility:BUSINESS_COMPATIBILITY,previousBusinessSaveCompatibility:SCHOOL_REPAIR_COMPATIBILITY,previousSchoolRepairSaveCompatibility:SOCIAL_COMPATIBILITY,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};

it('registers exactly the new depot capability and zero-funded owner with unchanged geometry and walking networks',async()=>{
 const old=preBusinessScene(scene);inheritPriorRepairCoverage(old,scene);expect(await sha256(saveCompatibilitySource(scene))).toBe(MATCH_COMPATIBILITY);expect(await sha256(preBusinessCompatibilitySource(scene))).toBe(SCHOOL_REPAIR_COMPATIBILITY);
 expect(preMatchScene(scene).objects).toEqual(old.objects);expect(scene.objects).toHaveLength(1700);expect(sceneContactData(scene)).toEqual(sceneContactData(old));expect(ambientGraph(scene)).toEqual(ambientGraph(old));expect(repairNavigation(scene)).toEqual(repairNavigation(old));
 expect(scene.economy!.accounts).toEqual([...old.economy!.accounts,{id:'depot_owner',actor:'station_resident',credits:0,capacity:4,satiety:65,drainPerS:0,shop:false}]);
 expect(scene.economy!.markets[0]).toEqual({...old.economy!.markets[0],owner:'depot_owner',sale:15});
});

it('migrates the actual repaired-bench return without resetting a prior field, clock, seat, balance or job',()=>{
 const text=JSON.stringify(prior),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);expect(copy.worldTime).toBe(prior.worldTime);expect(preBusinessState(copy.state)).toEqual(prior.state);
 const seller=copy.state.economy!.accounts.find(a=>a.id==='depot_owner')!,initial=createCarAtSpawn(scene).economy!.accounts.find(a=>a.id==='depot_owner')!;
 expect(seller).toEqual({...initial,decisionAtS:copy.state.timeS});expect(copy.state.economy!.markets.find(m=>m.id==='station_supplies')!.owner).toBe('depot_owner');
 const current=encodeSave(copy.state,copy.worldTime,world);expect(JSON.parse(current).version).toBe(SAVE_VERSION);expect(decodeSave(current,world).state).toEqual(copy.state);expect(decodeSave(current,world).migrated).toBe(false);
});

it('retains the old format-14 slot and blocks corrupt or unrelated worlds before adding owner records',()=>{
 const text=JSON.stringify(prior),key=`business.v14.${scene.sceneId}.${SCHOOL_REPAIR_COMPATIBILITY}`,rows=new Map([[key,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},saves=gameSave(world,()=>storage,'business');
 expect(preBusinessState(saves.restored?.state)).toEqual(prior.state);expect(saves.write(saves.restored!.state,prior.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);rows.set(saves.key,'broken');expect(gameSave(world,()=>storage,'business').blocked).toBe(true);
 expect(()=>decodeSave(text,{...world,previousBusinessSaveCompatibility:undefined})).toThrow('different world');expect(()=>decodeSave(text,{...world,saveCompatibility:'f'.repeat(64)})).toThrow('different world');
 const bad=structuredClone(prior);bad.state.economy.accounts[0]!.credits++;expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow('invalid');
});

it('replays the actual native purchase and cash transfers through save/load without repaying the seller',()=>{
 const restored=decodeSave(JSON.stringify(owned),world);expect(restored.migrated).toBe(true);
 const e=restored.state.economy!,company=e.markets.find(m=>m.id==='station_supplies')!,seller=e.accounts.find(a=>a.id==='depot_owner')!,player=e.accounts.find(a=>a.id==='pocket')!;
 expect(company.owner).toBe('pocket');expect(company.credits).toBe(3);expect(seller.credits).toBe(15);expect(player.credits).toBe(2);
 expect(commerceReason(restored.state,scene,player.id,{kind:'acquire',market:company.id})).toBe('not_for_sale');
 let original=restored.state,copy=decodeSave(encodeSave(original,restored.worldTime,world),world).state;
 for(let i=0;i<240;i++){original=stepInteractive(original,{steer:0,throttle:0},1/120,world);copy=stepInteractive(copy,{steer:0,throttle:0},1/120,world);}
 expect(copy).toEqual(original);expect(copy.economy!.accounts.find(a=>a.id==='depot_owner')!.credits).toBe(15);expect(copy.economy!.markets.find(m=>m.id===company.id)!.owner).toBe('pocket');
});
