import {it,expect} from 'vitest';
import type {SceneObject} from '../src/scene/schema';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {assemblyBounds} from '../src/scene/measure';
import {objectFragments} from '../src/scene/fragments';
import {impactBudget} from '../src/scene/damage-pool';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {breakOnContact,advanceImpactMotion} from '../src/sim/impacts';
import {objectContacts} from '../src/scene/contacts';
import {objectPlacement} from '../src/scene/placement';
import {decodeSave,encodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
const scene=c.preBotanyScene(createWorldScene()),previous={...c.preCanopyScene(scene),sourceHash:'handmade-city-life-v75',revisionId:'r75'},pairs=[['Fleet','TREE'],['Tree','COVERAGE'],['Coverage','INVITATION'],['Invitation','PEOPLE'],['People','JUNCTION'],['Junction','SPACING'],['Spacing','PARK'],['Park','CITY'],['City','MATCH'],['Match','BUSINESS'],['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));
const shared={...lineage,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11},world:World={...shared,scene,saveCompatibility:c.CANOPY_COMPATIBILITY,previousCanopySaveCompatibility:c.FLEET_COMPATIBILITY,previousCanopyContacts:sceneContactData(c.preCanopyScene(scene)),previousPeopleNavigation:ambientGraph(c.prePeopleScene(scene)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(scene)),previousParkNavigation:ambientGraph(c.preParkScene(scene)),previousCityNavigation:ambientGraph(c.preCityScene(scene))},oldWorld:World={...world,scene:previous,saveCompatibility:c.FLEET_COMPATIBILITY,previousCanopySaveCompatibility:undefined,previousPeopleNavigation:ambientGraph(c.prePeopleScene(previous)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(previous)),previousParkNavigation:ambientGraph(c.preParkScene(previous)),previousCityNavigation:ambientGraph(c.preCityScene(previous))};
const treeSpec=(o:SceneObject)=>o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.measure?.kind==='tree' ? o.spec : undefined;
const trees=scene.objects.filter(o=>treeSpec(o));
it('refines all live tree templates with unchanged bodies, scales, world members and pedestrian nodes',async()=>{
 expect(trees).toHaveLength(345);expect(scene.objects.map(o=>o.id)).toEqual(previous.objects.map(o=>o.id));
 const old=new Map(previous.objects.map(o=>[o.id,o]));
 for(const o of scene.objects){const p=old.get(o.id)!;if(!trees.includes(o)){expect(o).toEqual(p);continue;}
  const spec=treeSpec(o)!,prior=treeSpec(p)!;expect(o.scale).toBe(p.scale);expect(spec.body).toEqual(prior.body);expect(spec.impact).toEqual(prior.impact);expect(spec.measure).toEqual(prior.measure);expect(spec.parts.length).toBeLessThanOrEqual(32);
  expect(Math.hypot(o.x-p.x,o.y-p.y)).toBeLessThan(2e-6);
  const a=assemblyBounds(spec),b=assemblyBounds(prior);expect(a.min.distanceTo(b.min)).toBeLessThan(4e-6);expect(a.max.distanceTo(b.max)).toBeLessThan(4e-6);
  expect(objectFragments(spec).map(f=>f.id)).toEqual(objectFragments(prior).map(f=>f.id));
 }
 expect(impactBudget(scene)).toEqual(impactBudget(previous));expect(ambientGraph(scene).nodes).toEqual(ambientGraph(previous).nodes);expect(ambientGraph(scene).starts).toEqual(ambientGraph(previous).starts);
 expect(await c.sha256(c.preEquipmentCompatibilitySource(scene))).toBe(c.CANOPY_COMPATIBILITY);expect(await c.sha256(c.preCanopyCompatibilitySource(scene))).toBe(c.FLEET_COMPATIBILITY);
});
it('keeps a falling tree, cargo, economy and every historical backup field through the registered visual upgrade',async()=>{
 const parking=c.preParkingScene(c.preCityScene(previous)),empty=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:empty,previousSaveSource:c.registeredLegacySource(empty),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures={...import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('./fixtures/hosted-meal-r71-save-v16.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/hosted-meals/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-repairs/native-work.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-trees/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/utility-fleet/native-*.json',{query:'?raw',import:'default',eager:true})} as Record<string,string>;
 let count=0;for(const [name,text]of Object.entries(fixtures)){if(JSON.parse(text).kind!=='dream-save')continue;const old=decodeSave(text,{...oldWorld,...legacy}),next=decodeSave(text,{...world,...legacy});expect(next.state,name).toEqual(old.state);expect(next.worldTime,name).toBe(old.worldTime);count++;}expect(count).toBeGreaterThanOrEqual(36);
 const tree=previous.objects.find(o=>o.id==='garden_rowan_north')!,contact=objectContacts(previous,tree)[0]!,state={...createCarAtSpawn(previous),x:tree.x-contact.r-10,y:tree.y,elevation:objectPlacement(previous,tree).base,vx:200,vy:0};breakOnContact(state,oldWorld,tree.x-contact.r,tree.y,[contact]);advanceImpactMotion(state,oldWorld,.2,false);
 const text=encodeSave(state,27,oldWorld),next=decodeSave(text,world);expect(next.state).toEqual(JSON.parse(text).state);expect(next.state.broken).toContain(tree.id);
 expect(()=>decodeSave(text,{...world,previousCanopySaveCompatibility:undefined})).toThrow('different world');
 const oldKey=`muse-dream.save.v17.${scene.sceneId}.${c.FLEET_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(next.state,27)).toBe(true);expect(rows.get(oldKey)).toBe(text);
});
