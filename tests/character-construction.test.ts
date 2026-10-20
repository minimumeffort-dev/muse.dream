import {it,expect} from 'vitest';
import type {ObjectDslV2} from '../src/scene/object-dsl';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import prior from '../src/scene/compatibility/r80-characters.json';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {decodeSave,encodeSave} from '../src/sim/save';
import {stepInteractive} from '../src/sim/interaction';
import {gameSave} from '../src/game/save';
const scene=c.preServiceScene(createWorldScene()),previous=c.preCharactersScene(scene),ids=new Set(prior.placements.map(p=>p.id));
const pairs=[['Furniture', 'BOTANY'], ['Botany', 'CANOPY'], ['Canopy', 'FLEET'], ['Fleet', 'TREE'], ['Tree', 'COVERAGE'], ['Coverage', 'INVITATION'], ['Invitation', 'PEOPLE'], ['People', 'JUNCTION'], ['Junction', 'SPACING'], ['Spacing', 'PARK'], ['Park', 'CITY'], ['City', 'MATCH'], ['Match', 'BUSINESS'], ['Business', 'SCHOOL_REPAIR'], ['SchoolRepair', 'SOCIAL'], ['Social', 'SHIFT'], ['Shift', 'HOURS'], ['Hours', 'SEATING'], ['Seating', 'KITCHEN'], ['Kitchen', 'MEAL'], ['Meal', 'PROGRESS'], ['Progress', 'RECIPE'], ['Recipe', 'EGRESS'], ['Egress', 'INTERIOR'], ['Interior', 'COURIER'], ['Courier', 'NATURAL'], ['Finish', 'PLANT'], ['Plant', 'VERGE'], ['Verge', 'POOL'], ['Pool', 'NETWORK'], ['Network', 'SUPPLY'], ['Supply', 'REPAIR'], ['Repair', 'PARKING'], ['Parking', 'DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));

const world:World={...lineage,scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.CHARACTERS_COMPATIBILITY,previousCharactersSaveCompatibility:c.FIXTURES_COMPATIBILITY,previousFixturesSaveCompatibility:c.WILDLIFE_COMPATIBILITY,previousWildlifeSaveCompatibility:c.FURNITURE_COMPATIBILITY,previousWildlifeContacts:sceneContactData(c.preWildlifeScene(scene))};
const oldWorld:World={...world,scene:previous,saveCompatibility:c.FIXTURES_COMPATIBILITY,previousCharactersSaveCompatibility:undefined};
it('refines all 133 person placements and both squads while keeping exact bodies, scales, joints and navigation',async()=>{
 const before=new Map(previous.objects.map(o=>[o.id,o]));expect(ids.size).toBe(133);
 for(const o of scene.objects.filter(o=>ids.has(o.id))){const old=before.get(o.id)!;expect(o.spec,o.id).not.toEqual(old.spec);expect(o.scale,o.id).toBe(old.scale);expect((o.spec as ObjectDslV2).body,o.id).toEqual((old.spec as ObjectDslV2).body);expect(o.spec && 'joints' in o.spec ? o.spec.joints : [],o.id).toEqual(old.spec && 'joints' in old.spec ? old.spec.joints : []);expect({...o,spec:old.spec},o.id).toEqual(old);}
 expect(scene.objects.filter(o=>!ids.has(o.id))).toEqual(previous.objects.filter(o=>!ids.has(o.id)));expect(scene.player).toEqual(previous.player);
 expect(sceneContactData(scene)).toEqual(sceneContactData(previous));expect(ambientGraph(scene)).toEqual(ambientGraph(previous));
 expect(scene.sports.map(s=>s.match?.teams.map(t=>t.specs))).not.toEqual(previous.sports.map(s=>s.match?.teams.map(t=>t.specs)));
 expect(await c.sha256(c.preEquipmentCompatibilitySource(scene))).toBe(c.CHARACTERS_COMPATIBILITY);expect(await c.sha256(c.preCharactersCompatibilitySource(scene))).toBe(c.FIXTURES_COMPATIBILITY);
});
it('keeps every historical backup and current repair ledger exact through the character layer',async()=>{
 const parking=c.preParkingScene(c.preCityScene(previous)),empty=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:empty,previousSaveSource:c.registeredLegacySource(empty),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures={...import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('./fixtures/hosted-meal-r71-save-v16.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/hosted-meals/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-repairs/native-work.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-trees/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/utility-fleet/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/tree-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/plant-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/ground-cover/native-save.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/furniture-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/wildlife-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/street-furniture/native-*.json',{query:'?raw',import:'default',eager:true})} as Record<string,string>;

 let count=0;for(const [name,text] of Object.entries(fixtures)){if(JSON.parse(text).kind!=='dream-save')continue;const before=decodeSave(text,{...oldWorld,...legacy}),after=decodeSave(text,{...world,...legacy});expect(after.state,name).toEqual(before.state);expect(after.worldTime,name).toBe(before.worldTime);count++;}
 expect(count).toBeGreaterThanOrEqual(57);
 for(const [name,text]of Object.entries(fixtures).filter(([name])=>name.includes('/street-furniture/'))){const before=decodeSave(text,oldWorld),after=decodeSave(text,world);expect(stepInteractive(after.state,{steer:0,throttle:0},1/120,world),name).toEqual(stepInteractive(before.state,{steer:0,throttle:0},1/120,oldWorld));}
});
it('isolates review slots and retains the old original when saving an upgraded world',()=>{
 const text=encodeSave(createCarAtSpawn(previous),12,oldWorld),before=decodeSave(text,oldWorld),after=decodeSave(text,world);expect(after.state).toEqual(before.state);expect(after.worldTime).toBe(12);expect(after.migrated).toBe(true);expect(()=>decodeSave(text,{...world,previousCharactersSaveCompatibility:undefined})).toThrow('different world');
 const oldKey=`muse-dream.save.v17.${scene.sceneId}.${c.FIXTURES_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},slot=gameSave(world,()=>storage);expect(slot.restored?.migrated).toBe(true);expect(slot.write(after.state,12)).toBe(true);expect(rows.get(oldKey)).toBe(text);expect(decodeSave(rows.get(slot.key)!,world).migrated).toBe(false);expect(gameSave(world,()=>storage,'muse-dream.review-characters-r81').restored).toBeUndefined();
});
