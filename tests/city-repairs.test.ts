import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {sceneContactData,primeSceneContacts} from '../src/scene/contacts';
import {repairTargets,repairNavigation,primeRepairNavigation,repairNetwork} from '../src/sim/repair';
import {repairCoverage,inheritPriorRepairCoverage} from '../src/scene/commerce';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {decodeSave,encodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {drivingReviewStart} from '../src/game/review-start';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import pending from '../docs/evidence/hosted-meals/native-pending.json?raw';
import outward from '../docs/evidence/hosted-meals/native-out.json?raw';
import eating from '../docs/evidence/hosted-meals/native-eating.json?raw';
import completed from '../docs/evidence/hosted-meals/native-completed.json?raw';
import working from '../docs/evidence/city-repairs/native-work.json?raw';
const scene=createWorldScene(),previous=c.preCoverageScene(scene),pairs=[['Invitation','PEOPLE'],['People','JUNCTION'],['Junction','SPACING'],['Spacing','PARK'],['Park','CITY'],['City','MATCH'],['Match','BUSINESS'],['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));
inheritPriorRepairCoverage(previous);
const world:World={...lineage,scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.TREE_COMPATIBILITY,previousTreeSaveCompatibility:c.COVERAGE_COMPATIBILITY,previousCoverageSaveCompatibility:c.INVITATION_COMPATIBILITY,previousPeopleNavigation:ambientGraph(c.prePeopleScene(scene)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(scene)),previousParkNavigation:ambientGraph(c.preParkScene(scene)),previousCityNavigation:ambientGraph(c.preCityScene(scene))},oldWorld={...world,scene:previous,saveCompatibility:c.INVITATION_COMPATIBILITY,previousCoverageSaveCompatibility:undefined};
it('serves all 413 city lamps through the existing worker, stock, wages and bounded host-prepared geometry',()=>{
 const r=scene.economy!.repairs.find(r=>r.id==='market_tables')!,targets=repairTargets(scene,r),lamps=scene.objects.filter(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='lamp');
 expect(targets).toHaveLength(431);expect(lamps).toHaveLength(413);expect(lamps.every(o=>targets.some(t=>t.objectId===o.id))).toBe(true);expect(r.streets).toEqual(scene.streets.map(s=>s.id));expect(r).toMatchObject({input:'timber',take:1,pay:4,seconds:8,dispatch_s:12});expect(c.preTreeScene(scene).objects).toEqual(previous.objects);expect(scene.economy!.accounts).toBe(previous.economy!.accounts);expect(scene.economy!.markets).toBe(previous.economy!.markets);
 const packet=structuredClone(repairNavigation(scene)),copy=structuredClone(scene);primeSceneContacts(copy,structuredClone(sceneContactData(scene)));primeRepairNavigation(copy,packet);
 expect(repairCoverage(copy,r)).toEqual(repairCoverage(scene,r));expect(repairNetwork(copy,r)).toBe(packet.services.find(s=>s.id===r.id)!.nodes);expect(repairNetwork(copy,r).length).toBeLessThanOrEqual(8192);expect(repairNetwork(copy,r).reduce((n,p)=>n+p.links.length,0)).toBeLessThanOrEqual(32768);
});
it('uses clear inspection starts at the airport instead of silently falling back beside a bus',()=>{
 const start=createCarAtSpawn(scene),airport=drivingReviewStart(start,world,'airport'),lamp=drivingReviewStart(start,world,'airport-lamp'),target=scene.objects.find(o=>o.id==='airport_lamps_1_5_r')!;
 expect([airport.x,airport.y]).toEqual([2000,9250]);expect([lamp.x,lamp.y]).toEqual([target.x,target.y-140]);expect(lamp.headingRad).toBe(Math.PI/2);
});
it('keeps all 33 prior backups and exact ledgers while registering only this coverage upgrade',async()=>{
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.TREE_COMPATIBILITY);expect(await c.sha256(c.preCoverageCompatibilitySource(scene))).toBe(c.INVITATION_COMPATIBILITY);
 const parking=c.preParkingScene(c.preCityScene(scene)),hash=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:hash,previousSaveSource:c.registeredLegacySource(hash),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures=import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;expect(Object.keys(fixtures)).toHaveLength(28);
 const oldR71=import.meta.glob('./fixtures/hosted-meal-r71-save-v16.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
 for(const [id,text] of Object.entries({...fixtures,...oldR71,pending,outward,eating,completed})){const old=decodeSave(text,{...oldWorld,...legacy}),next=decodeSave(text,{...world,...legacy});expect(next.state,id).toEqual(old.state);expect(next.worldTime,id).toBe(old.worldTime);expect(next.migrated,id).toBe(true);if(id.endsWith('save-v6-r50.json'))expect(next.state.economy!.accounts.find(a=>a.id==='caretaker')!.repair!.path.slice(17,19)).toEqual([{x:7000,y:5240},{x:6978.159691943924,y:5258.00587471854}]);}
 const key=`muse-dream.save.v17.${scene.sceneId}.${c.INVITATION_COMPATIBILITY}`,rows=new Map([[key,eating]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(slot.restored!.state,slot.restored!.worldTime)).toBe(true);expect(rows.size).toBe(2);expect(rows.get(key)).toBe(eating);expect(decodeSave(rows.get(slot.key)!,world).migrated).toBe(false);
 expect(()=>decodeSave(eating,{...world,previousCoverageSaveCompatibility:undefined})).toThrow('different world');expect(()=>decodeSave(eating,{...world,saveCompatibility:'f'.repeat(64)})).toThrow();expect(decodeSave(encodeSave(slot.restored!.state,77,world),world).worldTime).toBe(77);
},60000);
it('resumes the native airport repair once, retains the return journey and conserves the whole world ledger',()=>{
 const restored=decodeSave(working,world),initial=restored.state,worker=(s:typeof initial)=>s.economy!.accounts.find(a=>a.id==='caretaker')!;
 expect(worker(initial).repair).toMatchObject({objectId:'airport_lamps_1_5_r',phase:'work'});expect(initial.broken).toContain('airport_lamps_1_5_r');expect(restored.migrated).toBe(true);
 let state=initial;for(let i=0;i<120*9;i++)state=stepInteractive(state,{steer:0,throttle:0},1/120,world);
 expect(state.broken).not.toContain('airport_lamps_1_5_r');expect(state.economy!.repaired.market_tables).toBe(1);expect(worker(state).credits).toBe(4);expect(worker(state).completed.repair.market_tables).toBe(1);expect(worker(state).repair?.phase).toBe('home');
 checkEconomyState(state,scene);const next=decodeSave(encodeSave(state,restored.worldTime+state.timeS-initial.timeS,world),world);
 expect(next.state.economy).toEqual(JSON.parse(JSON.stringify(state.economy)));expect(next.state.broken).toEqual(state.broken);expect(next.state.population).toEqual(state.population);expect(next.state.npcs).toEqual(state.npcs);
});
