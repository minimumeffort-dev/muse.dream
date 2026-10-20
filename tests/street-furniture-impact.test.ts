import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import prior from '../src/scene/compatibility/r79-street-furniture.json';
import {pooledImpact,impactBudget} from '../src/scene/damage-pool';
import {objectContacts,sceneContactData} from '../src/scene/contacts';
import {objectPlacement} from '../src/scene/placement';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {repairTargets,repairApproach} from '../src/sim/repair';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {breakOnContact} from '../src/sim/impacts';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {drivingReviewStart,repairReviewSteps} from '../src/game/review-start';
import {buildToppleChunk} from '../src/game/chunk-builder';
import {disposeChunk} from '../src/game/chunk-packet';
const scene=c.preCharactersScene(createWorldScene()),previous=c.preFixturesScene(scene),ids=new Set(prior.placements.map(p=>p.id));
const pairs=[['Furniture', 'BOTANY'], ['Botany', 'CANOPY'], ['Canopy', 'FLEET'], ['Fleet', 'TREE'], ['Tree', 'COVERAGE'], ['Coverage', 'INVITATION'], ['Invitation', 'PEOPLE'], ['People', 'JUNCTION'], ['Junction', 'SPACING'], ['Spacing', 'PARK'], ['Park', 'CITY'], ['City', 'MATCH'], ['Match', 'BUSINESS'], ['Business', 'SCHOOL_REPAIR'], ['SchoolRepair', 'SOCIAL'], ['Social', 'SHIFT'], ['Shift', 'HOURS'], ['Hours', 'SEATING'], ['Seating', 'KITCHEN'], ['Kitchen', 'MEAL'], ['Meal', 'PROGRESS'], ['Progress', 'RECIPE'], ['Recipe', 'EGRESS'], ['Egress', 'INTERIOR'], ['Interior', 'COURIER'], ['Courier', 'NATURAL'], ['Finish', 'PLANT'], ['Plant', 'VERGE'], ['Verge', 'POOL'], ['Pool', 'NETWORK'], ['Network', 'SUPPLY'], ['Supply', 'REPAIR'], ['Repair', 'PARKING'], ['Parking', 'DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));
const world:World={...lineage,scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.FIXTURES_COMPATIBILITY,previousFixturesSaveCompatibility:c.WILDLIFE_COMPATIBILITY,previousWildlifeSaveCompatibility:c.FURNITURE_COMPATIBILITY,previousWildlifeContacts:sceneContactData(c.preWildlifeScene(scene))};
const oldWorld:World={...world,scene:previous,saveCompatibility:c.WILDLIFE_COMPATIBILITY,previousFixturesSaveCompatibility:undefined};
it('makes every street tub and produce stall a pooled toppler without changing construction, contacts or neighbors',async()=>{
 const current=scene.objects.filter(o=>ids.has(o.id)),old=new Map(previous.objects.map(o=>[o.id,o]));
 expect(prior.templates).toHaveLength(2);expect(current).toHaveLength(18);
 for(const o of current){const spec=o.spec!,before=old.get(o.id)!;expect(pooledImpact(scene,o),o.id).toBe(true);
  expect(spec && 'impact' in spec ? spec.impact : undefined).toMatchObject({kind:'topple'});
  const strip=(s:typeof spec)=>{const {impact,parts,...rest}=s as any;return {...rest,parts:parts.map(({fragment,...p}:any)=>p)};};
  expect(strip(spec),o.id).toEqual(strip(before.spec!));expect([o.x,o.y,o.scale]).toEqual([before.x,before.y,before.scale]);}
 expect(scene.objects.filter(o=>!ids.has(o.id))).toEqual(previous.objects.filter(o=>!ids.has(o.id)));
 expect(sceneContactData(scene).contacts).toEqual(sceneContactData(previous).contacts);expect(ambientGraph(scene)).toEqual(ambientGraph(previous));
 expect(impactBudget(scene)).toEqual({templates:32,fragments:74,resident:12,residentFragments:27,pooledTemplates:20});
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.FIXTURES_COMPATIBILITY);expect(await c.sha256(c.preFixturesCompatibilitySource(scene))).toBe(c.WILDLIFE_COMPATIBILITY);
});
it('topples each tub and stall on a car hit and routes the existing caretaker to every one',()=>{
 const first=createCarAtSpawn(scene);
 for(const o of scene.objects.filter(o=>ids.has(o.id))){const contact=objectContacts(scene,o)[0]!,state={...first,x:o.x-contact.r-10,y:o.y,elevation:objectPlacement(scene,o).base,vx:200,vy:0,broken:[],debris:[],impacts:[]};breakOnContact(state,world,o.x-contact.r,o.y,[contact]);expect(state.broken,o.id).toEqual([o.id]);expect(state.debris,o.id).toHaveLength(1);}
 expect(first.broken).toEqual([]);
 const service=scene.economy!.repairs.find(r=>r.id==='market_tables')!,targets=repairTargets(scene,service),home=scene.objects.find(o=>o.id==='market_neighbor')!;
 expect(targets).toHaveLength(449);
 for(const t of targets.filter(t=>ids.has(t.objectId)))expect(repairApproach(scene,service,t,home),t.objectId).toBeDefined();
 expect(targets.filter(t=>ids.has(t.objectId))).toHaveLength(18);
 for(const id of ['market_stall_east','destination_planters_1_5_r']){const chunk=buildToppleChunk(scene,id);expect(chunk.children.length,id).toBeGreaterThan(0);disposeChunk(chunk);}
 const stall=scene.objects.find(o=>o.id==='market_stall_east')!,start=drivingReviewStart(createCarAtSpawn(scene),world,'street-stall');expect([start.x,start.y]).toEqual([stall.x+140,stall.y]);
});
it('upgrades an exact r79 save in a new slot while preserving the original',()=>{
 const text=encodeSave(createCarAtSpawn(previous),5,oldWorld),restored=decodeSave(text,world);
 expect(restored.migrated).toBe(true);expect(restored.state).toEqual(decodeSave(text,oldWorld).state);expect(restored.worldTime).toBe(5);
 expect(()=>decodeSave(text,{...world,previousFixturesSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v17.${scene.sceneId}.${c.WILDLIFE_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));
 expect(slot.restored?.migrated).toBe(true);expect(slot.write(restored.state,5)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);expect(decodeSave(rows.get(slot.key)!,world).migrated).toBe(false);
});


it.each(['street-stall','street-tub'] as const)('repairs a genuinely hit %s once, preserving work and paid return through save/reload',scenario=>{
 const steps=repairReviewSteps(createCarAtSpawn(scene),world,scenario,'work');let step=steps.next();while(!step.done)step=steps.next();let state=step.value;
 const id=scenario==='street-stall' ? 'market_stall_east' : 'destination_planters_4_5_r',worker=(s:typeof state)=>s.economy!.accounts.find(a=>a.id==='caretaker')!;
 expect(state.broken).toContain(id);expect(worker(state).repair).toMatchObject({objectId:id,phase:'work'});checkEconomyState(state,scene);
 const credits=worker(state).credits,before=state.economy!.repaired.market_tables!,timber=state.economy!.markets.find(m=>m.id==='market_stall')!.stock.timber;
 for(let i=0;i<240;i++)state=stepInteractive(state,{steer:0,throttle:0},1/120,world);
 const work=encodeSave(state,17,world),restored=decodeSave(work,world);expect(restored.state).toEqual(state);state=restored.state;
 for(let i=0;i<120*10;i++)state=stepInteractive(state,{steer:0,throttle:0},1/120,world);
 expect(state.broken).not.toContain(id);expect(worker(state).credits).toBe(credits+4);expect(state.economy!.repaired.market_tables).toBe(before+1);expect(worker(state).completed.repair.market_tables).toBe(before+1);expect(worker(state).repair?.phase).toBe('home');expect(state.economy!.markets.find(m=>m.id==='market_stall')!.stock.timber).toBe(timber);checkEconomyState(state,scene);
 const paid=encodeSave(state,27,world);expect(decodeSave(paid,world).state).toEqual(state);state=decodeSave(paid,world).state;
 for(let i=0;i<120*5;i++)state=stepInteractive(state,{steer:0,throttle:0},1/120,world);
 expect(worker(state).credits).toBe(credits+4);expect(state.economy!.repaired.market_tables).toBe(before+1);checkEconomyState(state,scene);
},60000);


it('keeps the complete historical save chain exact through the new fixture layer',async()=>{
 const parking=c.preParkingScene(c.preCityScene(previous)),empty=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:empty,previousSaveSource:c.registeredLegacySource(empty),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures={...import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('./fixtures/hosted-meal-r71-save-v16.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/hosted-meals/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-repairs/native-work.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-trees/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/utility-fleet/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/tree-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/plant-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/ground-cover/native-save.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/furniture-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/wildlife-construction/native-*.json',{query:'?raw',import:'default',eager:true})} as Record<string,string>;
 let count=0;for(const [name,text]of Object.entries(fixtures)){if(JSON.parse(text).kind!=='dream-save' || JSON.parse(text).compatibilityHash===c.FIXTURES_COMPATIBILITY)continue;const before=decodeSave(text,{...oldWorld,...legacy}),after=decodeSave(text,{...world,...legacy});expect(after.state,name).toEqual(before.state);expect(after.worldTime,name).toBe(before.worldTime);count++;}expect(count).toBeGreaterThanOrEqual(52);
 const text=encodeSave(createCarAtSpawn(previous),4,oldWorld),oldKey=`muse-dream.save.v17.${scene.sceneId}.${c.WILDLIFE_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}};
 expect(gameSave(world,()=>storage,'muse-dream.review-fixtures-r80-stall').restored).toBeUndefined();expect(rows.get(oldKey)).toBe(text);
});
