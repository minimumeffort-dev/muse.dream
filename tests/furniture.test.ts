import {it,expect} from 'vitest';
import type {SceneObject} from '../src/scene/schema';
import priorFurniture from '../src/scene/compatibility/r77-furniture.json';
import {objectFragments} from '../src/scene/fragments';
import {walkingHeight} from '../src/scene/interiors';
import {worldSeats} from '../src/scene/seating';
import {toggleRide,stepInteractive} from '../src/sim/interaction';
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
const scene=createWorldScene(),previous={...c.preFurnitureScene(scene),sourceHash:'handmade-city-life-v77',revisionId:'r77'},pairs=[['Botany','CANOPY'],['Canopy','FLEET'],['Fleet','TREE'],['Tree','COVERAGE'],['Coverage','INVITATION'],['Invitation','PEOPLE'],['People','JUNCTION'],['Junction','SPACING'],['Spacing','PARK'],['Park','CITY'],['City','MATCH'],['Match','BUSINESS'],['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));
const shared={...lineage,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11},world:World={...shared,scene,saveCompatibility:c.FURNITURE_COMPATIBILITY,previousFurnitureSaveCompatibility:c.BOTANY_COMPATIBILITY,previousFurnitureContacts:sceneContactData(c.preFurnitureScene(scene)),previousBotanyContacts:sceneContactData(c.preBotanyScene(scene)),previousCanopyContacts:sceneContactData(c.preCanopyScene(scene)),previousPeopleNavigation:ambientGraph(c.prePeopleScene(scene)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(scene)),previousParkNavigation:ambientGraph(c.preParkScene(scene)),previousCityNavigation:ambientGraph(c.preCityScene(scene))},oldWorld:World={...world,scene:previous,saveCompatibility:c.BOTANY_COMPATIBILITY,previousFurnitureSaveCompatibility:undefined,previousBotanyContacts:sceneContactData(c.preBotanyScene(previous)),previousCanopyContacts:sceneContactData(c.preCanopyScene(previous)),previousPeopleNavigation:ambientGraph(c.prePeopleScene(previous)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(previous)),previousParkNavigation:ambientGraph(c.preParkScene(previous)),previousCityNavigation:ambientGraph(c.preCityScene(previous))};
const ids=new Set(priorFurniture.placements.map(p=>p.id)),plantSpec=(o:SceneObject)=>o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 ? o.spec : undefined;
it('refines all 18 furnishings, retaining layout, seats and break identities while bringing table caps to dining height',async()=>{
 const objects=scene.objects.filter(o=>ids.has(o.id)),old=new Map(previous.objects.map(o=>[o.id,o]));expect(objects).toHaveLength(18);expect(scene.objects).toHaveLength(1773);
 for(const o of objects){const p=old.get(o.id)!,spec=plantSpec(o)!,prior=plantSpec(p)!;const {clearanceRadius,...body}=spec.body;
  expect(body,spec.displayName).toEqual({...prior.body,...(spec.measure?.kind==='table' ? {colliderHeight:19.2} : {})});expect(spec.measure).toEqual(prior.measure);expect(spec.impact).toEqual(prior.impact);expect(spec.seats).toEqual(prior.seats);expect(spec.parts.length).toBeLessThanOrEqual(32);
  expect([o.x,o.y,o.scale]).toEqual([p.x,p.y,p.scale]);const a=assemblyBounds(spec),b=assemblyBounds(prior);expect(a.min.y).toBeCloseTo(b.min.y,5);for(const axis of ['x','z'] as const){expect(a.min[axis]).toBeCloseTo(b.min[axis],5);expect(a.max[axis]).toBeCloseTo(b.max[axis],5);}
  if(spec.measure?.kind==='table'){expect(a.max.y*o.scale).toBeCloseTo(7.822222,5);expect(spec.body.colliderHeight!*o.scale).toBeCloseTo(a.max.y*o.scale,5);}
  if(spec.impact)expect(objectFragments(spec).map(f=>f.id)).toEqual(objectFragments(prior).map(f=>f.id));
 }
 expect(scene.objects.filter(o=>!ids.has(o.id))).toEqual(previous.objects.filter(o=>!ids.has(o.id)));expect(impactBudget(scene)).toEqual(impactBudget(previous));expect(worldSeats(scene)).toEqual(worldSeats(previous));expect(ambientGraph(scene)).toEqual({...ambientGraph(previous),sourceHash:scene.sourceHash});
 const contacts=sceneContactData(scene).contacts,priorContacts=sceneContactData(previous).contacts;expect(contacts.map(({top,...c})=>c)).toEqual(priorContacts.map(({top,...c})=>c));expect(contacts.filter((c,i)=>c.top!==priorContacts[i]!.top).map(c=>c.id).sort()).toEqual(objects.filter(o=>plantSpec(o)?.measure?.kind==='table').map(o=>o.id).sort());
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.FURNITURE_COMPATIBILITY);expect(await c.sha256(c.preFurnitureCompatibilitySource(scene))).toBe(c.BOTANY_COMPATIBILITY);
});
it('keeps every historical state and isolates review-prefix migrations through the registered visual upgrade',async()=>{
 const parking=c.preParkingScene(c.preCityScene(previous)),empty=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:empty,previousSaveSource:c.registeredLegacySource(empty),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures={...import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('./fixtures/hosted-meal-r71-save-v16.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/hosted-meals/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-repairs/native-work.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-trees/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/utility-fleet/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/tree-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/plant-construction/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/ground-cover/native-save.json',{query:'?raw',import:'default',eager:true})} as Record<string,string>;
 let count=0;for(const [name,text]of Object.entries(fixtures)){if(JSON.parse(text).kind!=='dream-save')continue;const old=decodeSave(text,{...oldWorld,...legacy}),next=decodeSave(text,{...world,...legacy});expect(next.state,name).toEqual(old.state);expect(next.worldTime,name).toBe(old.worldTime);count++;}expect(count).toBeGreaterThanOrEqual(46);
 const tree=previous.objects.find(o=>o.spec?.displayName==='Breakaway table')!,contact=objectContacts(previous,tree)[0]!,state={...createCarAtSpawn(previous),x:tree.x-contact.r-10,y:tree.y,elevation:objectPlacement(previous,tree).base,vx:200,vy:0};breakOnContact(state,oldWorld,tree.x-contact.r,tree.y,[contact]);advanceImpactMotion(state,oldWorld,.2,false);
 const text=encodeSave(state,27,oldWorld),next=decodeSave(text,world);expect(next.state).toEqual(JSON.parse(text).state);expect(next.state.broken).toContain(tree.id);
 expect(()=>decodeSave(text,{...world,previousFurnitureSaveCompatibility:undefined})).toThrow('different world');
 for(const prefix of ['muse-dream.save','muse-dream.review-furniture']){
  const oldKey=`${prefix}.v17.${scene.sceneId}.${c.BOTANY_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},slot=gameSave(world,()=>storage,prefix);expect(slot.restored?.migrated).toBe(true);expect(slot.write(next.state,27)).toBe(true);expect(rows.get(oldKey)).toBe(text);
  if(prefix!=='muse-dream.save'){rows.delete(oldKey);rows.delete(slot.key);rows.set(`muse-dream.save.v17.${scene.sceneId}.${c.BOTANY_COMPATIBILITY}`,text);const isolated=gameSave(world,()=>storage,prefix);expect(isolated.restored).toBeUndefined();expect(isolated.blocked).toBe(false);}
 }
});

it('keeps occupied bench seats and lets an old table-top walker settle onto the lower cap',()=>{
 const seat=worldSeats(previous)[0]!,spawn=createCarAtSpawn(previous),foot={...spawn,control:{kind:'foot' as const},x:seat.approach.x,y:seat.approach.y,elevation:walkingHeight(previous,seat.approach.x,seat.approach.y),vehicles:[...spawn.vehicles,{id:null,x:spawn.x,y:spawn.y,elevation:spawn.elevation,headingRad:spawn.headingRad,distance:spawn.distance}]};
 const seated=toggleRide(foot,oldWorld);expect(seated.seated).toBeDefined();const restored=decodeSave(encodeSave(seated,8,oldWorld),world);expect(restored.state).toEqual(seated);expect(stepInteractive(restored.state,{throttle:0,steer:0},1/120,world).seated).toEqual(seated.seated);
 const table=previous.objects.find(o=>o.spec?.displayName==='Breakaway table')!,base=objectPlacement(previous,table).base,top=base+plantSpec(table)!.body.colliderHeight!*table.scale;
 const standing={...foot,x:table.x,y:table.y,elevation:top,grounded:true};let settled=decodeSave(encodeSave(standing,8,oldWorld),world).state;expect(settled).toEqual(standing);
 for(let i=0;i<180;i++)settled=stepInteractive(settled,{throttle:0,steer:0},1/120,world);
 expect(settled.grounded).toBe(true);expect(settled.elevation).toBeCloseTo(base+19.2*table.scale,4);expect(settled.economy!.accounts.map(a=>a.credits)).toEqual(standing.economy!.accounts.map(a=>a.credits));
});
