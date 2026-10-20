import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import prior from '../src/scene/compatibility/r78-wildlife.json';
import {assemblyBounds,assemblyHorizontalRadius} from '../src/scene/measure';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {ambientObjects} from '../src/sim/ambient';
import {sceneContactData} from '../src/scene/contacts';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {stepInteractive} from '../src/sim/interaction';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {drivingHeight} from '../src/scene/terrain';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
const scene=c.preFixturesScene(createWorldScene()),previous=c.preWildlifeScene(scene);
const pairs=[['Furniture', 'BOTANY'], ['Botany', 'CANOPY'], ['Canopy', 'FLEET'], ['Fleet', 'TREE'], ['Tree', 'COVERAGE'], ['Coverage', 'INVITATION'], ['Invitation', 'PEOPLE'], ['People', 'JUNCTION'], ['Junction', 'SPACING'], ['Spacing', 'PARK'], ['Park', 'CITY'], ['City', 'MATCH'], ['Match', 'BUSINESS'], ['Business', 'SCHOOL_REPAIR'], ['SchoolRepair', 'SOCIAL'], ['Social', 'SHIFT'], ['Shift', 'HOURS'], ['Hours', 'SEATING'], ['Seating', 'KITCHEN'], ['Kitchen', 'MEAL'], ['Meal', 'PROGRESS'], ['Progress', 'RECIPE'], ['Recipe', 'EGRESS'], ['Egress', 'INTERIOR'], ['Interior', 'COURIER'], ['Courier', 'NATURAL'], ['Finish', 'PLANT'], ['Plant', 'VERGE'], ['Verge', 'POOL'], ['Pool', 'NETWORK'], ['Network', 'SUPPLY'], ['Supply', 'REPAIR'], ['Repair', 'PARKING'], ['Parking', 'DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));
const world:World={...lineage,scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.WILDLIFE_COMPATIBILITY,previousWildlifeSaveCompatibility:c.FURNITURE_COMPATIBILITY,previousWildlifeContacts:sceneContactData(previous),previousFurnitureContacts:sceneContactData(c.preFurnitureScene(scene)),previousBotanyContacts:sceneContactData(c.preBotanyScene(scene)),previousCanopyContacts:sceneContactData(c.preCanopyScene(scene)),previousPeopleNavigation:ambientGraph(c.prePeopleScene(scene)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(scene)),previousParkNavigation:ambientGraph(c.preParkScene(scene)),previousCityNavigation:ambientGraph(c.preCityScene(scene))};
const oldWorld:World={...world,scene:previous,saveCompatibility:c.FURNITURE_COMPATIBILITY,previousWildlifeSaveCompatibility:undefined};
const ids=new Set(prior.placements.map(p=>p.id));
it('rebuilds all nine animal exports, sixty roamers, two route animals and every flock without moving a neighbor or changing physical scale',async()=>{
 expect(prior.templates).toHaveLength(9);const current=scene.objects.filter(o=>ids.has(o.id)),old=new Map(previous.objects.map(o=>[o.id,o]));expect(current).toHaveLength(62);expect(current.filter(o=>o.ambient)).toHaveLength(60);
 for(const o of current){const p=old.get(o.id)!,spec=o.spec!,s=p.spec!;if(!('dslVersion' in spec)||spec.dslVersion!==2||!('dslVersion' in s)||s.dslVersion!==2)throw Error('expected v2');const {clearanceRadius,...body}=spec.body;expect(body).toEqual(s.body);expect(spec.measure).toEqual(s.measure);expect([o.x,o.y,o.scale,o.headingRad]).toEqual([p.x,p.y,p.scale,p.headingRad]);expect(o.ambient?.motion).toEqual(p.ambient?.motion);
  expect(assemblyHorizontalRadius(spec,o.scale)).toBeCloseTo(assemblyHorizontalRadius(s,p.scale),8);expect(assemblyBounds(spec).min.y).toBeCloseTo(assemblyBounds(s).min.y,8);expect(spec.parts.length).toBeLessThanOrEqual(32);expect(spec.joints?.length??0).toBeLessThanOrEqual(12);
 }
 expect(scene.objects.filter(o=>!ids.has(o.id))).toEqual(previous.objects.filter(o=>!ids.has(o.id)));expect(scene.objects).toHaveLength(1773);expect(scene.flocks.reduce((n,f)=>n+f.count,0)).toBe(256);
 expect(scene.flocks.map(({spec,...f})=>f)).toEqual(previous.flocks.map(({spec,...f})=>f));expect(sceneContactData(scene).contacts).toEqual(sceneContactData(previous).contacts);expect(ambientGraph(scene)).toEqual(ambientGraph(previous));
 expect(await c.sha256(c.preEquipmentCompatibilitySource(scene))).toBe(c.WILDLIFE_COMPATIBILITY);expect(await c.sha256(c.preWildlifeCompatibilitySource(scene))).toBe(c.FURNITURE_COMPATIBILITY);
});
it('retains every crowd clock and the same deterministic movement/reaction decisions across the visual upgrade',()=>{
 const animal=scene.objects.find(o=>o.id==='wildlife_infill_001')!,initial={...createCarAtSpawn(previous),x:animal.x-45,y:animal.y,elevation:drivingHeight(scene.terrain,animal.x-45,animal.y)};let before=initial,after=decodeSave(encodeSave(initial,3,oldWorld),world).state;
 for(let i=0;i<100;i++){before=stepInteractive(before,{throttle:0,steer:0},.05,oldWorld);after=stepInteractive(after,{throttle:0,steer:0},.05,world);expect(after.population).toEqual(before.population);}
 const index=ambientObjects(scene).findIndex(o=>o.id===animal.id);expect(after.population!.members[index]!.distance).toBeGreaterThan(0);expect(decodeSave(encodeSave(after,8,world),world).state).toEqual(after);
});
it('replays all historical backups and isolates review slots while preserving the released state exactly',async()=>{
 const parking=c.preParkingScene(c.preCityScene(previous)),empty=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:empty,previousSaveSource:c.registeredLegacySource(empty),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures={...import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('./fixtures/hosted-meal-r71-save-v16.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/hosted-meals/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-repairs/native-work.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-trees/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/utility-fleet/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/tree-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/plant-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/ground-cover/native-save.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/furniture-construction/native-*.json',{query:'?raw',import:'default',eager:true})} as Record<string,string>;
 let count=0;for(const [name,text]of Object.entries(fixtures)){if(JSON.parse(text).kind!=='dream-save')continue;const a=decodeSave(text,{...oldWorld,...legacy}),b=decodeSave(text,{...world,...legacy});expect(b.state,name).toEqual(a.state);expect(b.worldTime,name).toBe(a.worldTime);count++;}expect(count).toBeGreaterThanOrEqual(49);
 const text=encodeSave(createCarAtSpawn(previous),3,oldWorld),restored=decodeSave(text,world);expect(()=>decodeSave(text,{...world,previousWildlifeSaveCompatibility:undefined})).toThrow('different world');
 for(const prefix of ['muse-dream.save','muse-dream.review-wildlife']){const oldKey=`${prefix}.v17.${scene.sceneId}.${c.FURNITURE_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},slot=gameSave(world,()=>storage,prefix);expect(slot.restored?.migrated).toBe(true);expect(slot.write(restored.state,3)).toBe(true);expect(rows.get(oldKey)).toBe(text);if(prefix!=='muse-dream.save'){rows.delete(oldKey);rows.delete(slot.key);rows.set(`muse-dream.save.v17.${scene.sceneId}.${c.FURNITURE_COMPATIBILITY}`,text);expect(gameSave(world,()=>storage,prefix).restored).toBeUndefined();}}
});
