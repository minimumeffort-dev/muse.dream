import {it,expect} from 'vitest';
import type {SceneObject} from '../src/scene/schema';
import priorPlants from '../src/scene/compatibility/r76-plants.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {assemblyBounds} from '../src/scene/measure';
import {impactBudget} from '../src/scene/damage-pool';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {breakOnContact,advanceImpactMotion} from '../src/sim/impacts';
import {objectContacts} from '../src/scene/contacts';
import {objectPlacement} from '../src/scene/placement';
import {decodeSave,encodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
const scene=c.preFurnitureScene(createWorldScene()),previous={...c.preBotanyScene(scene),sourceHash:'handmade-city-life-v76',revisionId:'r76'},pairs=[['Canopy','FLEET'],['Fleet','TREE'],['Tree','COVERAGE'],['Coverage','INVITATION'],['Invitation','PEOPLE'],['People','JUNCTION'],['Junction','SPACING'],['Spacing','PARK'],['Park','CITY'],['City','MATCH'],['Match','BUSINESS'],['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));
const shared={...lineage,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11},world:World={...shared,scene,saveCompatibility:c.BOTANY_COMPATIBILITY,previousBotanySaveCompatibility:c.CANOPY_COMPATIBILITY,previousBotanyContacts:sceneContactData(c.preBotanyScene(scene)),previousCanopyContacts:sceneContactData(c.preCanopyScene(scene)),previousPeopleNavigation:ambientGraph(c.prePeopleScene(scene)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(scene)),previousParkNavigation:ambientGraph(c.preParkScene(scene)),previousCityNavigation:ambientGraph(c.preCityScene(scene))},oldWorld:World={...world,scene:previous,saveCompatibility:c.CANOPY_COMPATIBILITY,previousBotanySaveCompatibility:undefined,previousCanopyContacts:sceneContactData(c.preCanopyScene(previous)),previousPeopleNavigation:ambientGraph(c.prePeopleScene(previous)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(previous)),previousParkNavigation:ambientGraph(c.preParkScene(previous)),previousCityNavigation:ambientGraph(c.preCityScene(previous))};
const ids=new Set(priorPlants.placements.map(p=>p.id)),plantSpec=(o:SceneObject)=>o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 ? o.spec : undefined;
it('refines all 460 plants while preserving physical measures, contacts, reservations and the complete pedestrian graph',async()=>{
 const plants=scene.objects.filter(o=>ids.has(o.id)),old=new Map(previous.objects.map(o=>[o.id,o]));expect(plants).toHaveLength(460);expect(scene.objects).toHaveLength(1773);
 for(const o of plants){const p=old.get(o.id)!,spec=plantSpec(o)!,prior=plantSpec(p)!;const {clearanceRadius,...body}=spec.body;expect(body).toEqual(prior.body);expect(spec.measure).toEqual(prior.measure);expect(spec.impact).toEqual(prior.impact);expect(spec.parts.length).toBeLessThanOrEqual(32);
  expect(o.scale).toBeCloseTo(p.scale,6);expect(Math.hypot(o.x-p.x,o.y-p.y)).toBeLessThan(2e-5);expect(spec.body.colliderRadius*o.scale).toBeCloseTo(prior.body.colliderRadius*p.scale,6);expect(spec.body.colliderHeight!*o.scale).toBeCloseTo(prior.body.colliderHeight!*p.scale,5);
  const a=assemblyBounds(spec),b=assemblyBounds(prior),axis=spec.measure!.axis;expect((a.max[axis]-a.min[axis])*o.scale).toBeCloseTo((b.max[axis]-b.min[axis])*p.scale,5);expect(a.min.y-b.min.y).toBeCloseTo(0,5);
 }
 expect(impactBudget(scene)).toEqual(impactBudget(previous));expect(sceneContactData(scene).contacts).toEqual(sceneContactData(previous).contacts);expect(ambientGraph(scene)).toEqual(ambientGraph(c.preBotanyScene(scene)));
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.BOTANY_COMPATIBILITY);expect(await c.sha256(c.preBotanyCompatibilitySource(scene))).toBe(c.CANOPY_COMPATIBILITY);
});
it('keeps every historical state and isolates review-prefix migrations through the registered visual upgrade',async()=>{
 const parking=c.preParkingScene(c.preCityScene(previous)),empty=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:empty,previousSaveSource:c.registeredLegacySource(empty),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures={...import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('./fixtures/hosted-meal-r71-save-v16.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/hosted-meals/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-repairs/native-work.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-trees/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/utility-fleet/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/tree-construction/native-*.json',{query:'?raw',import:'default',eager:true})} as Record<string,string>;
 let count=0;for(const [name,text]of Object.entries(fixtures)){if(JSON.parse(text).kind!=='dream-save')continue;const old=decodeSave(text,{...oldWorld,...legacy}),next=decodeSave(text,{...world,...legacy});expect(next.state,name).toEqual(old.state);expect(next.worldTime,name).toBe(old.worldTime);count++;}expect(count).toBeGreaterThanOrEqual(37);
 const tree=previous.objects.find(o=>o.id==='garden_rowan_north')!,contact=objectContacts(previous,tree)[0]!,state={...createCarAtSpawn(previous),x:tree.x-contact.r-10,y:tree.y,elevation:objectPlacement(previous,tree).base,vx:200,vy:0};breakOnContact(state,oldWorld,tree.x-contact.r,tree.y,[contact]);advanceImpactMotion(state,oldWorld,.2,false);
 const text=encodeSave(state,27,oldWorld),next=decodeSave(text,world);expect(next.state).toEqual(JSON.parse(text).state);expect(next.state.broken).toContain(tree.id);
 expect(()=>decodeSave(text,{...world,previousBotanySaveCompatibility:undefined})).toThrow('different world');
 for(const prefix of ['muse-dream.save','muse-dream.review-botany']){
  const oldKey=`${prefix}.v17.${scene.sceneId}.${c.CANOPY_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},slot=gameSave(world,()=>storage,prefix);expect(slot.restored?.migrated).toBe(true);expect(slot.write(next.state,27)).toBe(true);expect(rows.get(oldKey)).toBe(text);
  if(prefix!=='muse-dream.save'){rows.delete(oldKey);rows.delete(slot.key);rows.set(`muse-dream.save.v17.${scene.sceneId}.${c.CANOPY_COMPATIBILITY}`,text);const isolated=gameSave(world,()=>storage,prefix);expect(isolated.restored).toBeUndefined();expect(isolated.blocked).toBe(false);}
 }
});
