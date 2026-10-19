import {it,expect} from 'vitest';
import {Vector3} from 'three';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {sceneContactData} from '../src/scene/contacts';
import {assemblyBounds} from '../src/scene/measure';
import {isParkedVehicle,controlFor} from '../src/scene/agents';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,carFootprintClear,type World} from '../src/sim/car';
import {toggleRide,stepInteractive,bodyWorld,nearbyRide} from '../src/sim/interaction';
import {vehicleReviewStart,cargoReviewStart,npcReviewStart} from '../src/game/review-start';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
const scene=createWorldScene(),previous={...c.preFleetScene(scene),revisionId:'r74',sourceHash:'handmade-city-life-v74'},pairs=[['Invitation','PEOPLE'],['People','JUNCTION'],['Junction','SPACING'],['Spacing','PARK'],['Park','CITY'],['City','MATCH'],['Match','BUSINESS'],['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));
const world:World={...lineage,scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.FLEET_COMPATIBILITY,previousFleetSaveCompatibility:c.TREE_COMPATIBILITY,previousTreeSaveCompatibility:c.COVERAGE_COMPATIBILITY,previousCoverageSaveCompatibility:c.INVITATION_COMPATIBILITY,previousPeopleNavigation:ambientGraph(c.prePeopleScene(scene)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(scene)),previousParkNavigation:ambientGraph(c.preParkScene(scene)),previousCityNavigation:ambientGraph(c.preCityScene(scene))};
const oldWorld:World={...world,scene:previous,saveCompatibility:c.TREE_COMPATIBILITY,previousFleetSaveCompatibility:undefined,previousPeopleNavigation:ambientGraph(c.prePeopleScene(previous)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(previous)),previousParkNavigation:ambientGraph(c.preParkScene(previous)),previousCityNavigation:ambientGraph(c.preCityScene(previous))};
const fleet=scene.objects.filter(o=>o.spec && 'measure' in o.spec && ['pickup','truck'].includes(o.spec.measure?.kind??''));
it('adds connected utility parking without displacing an old object, changing a pedestrian node or raising live budgets',async()=>{
 expect(fleet).toHaveLength(4);expect(fleet.every(isParkedVehicle)).toBe(true);expect(fleet.map(controlFor)).toEqual(['car','car','car','car']);
 expect(scene.objects).toHaveLength(1773);expect(scene.objects.filter(isParkedVehicle)).toHaveLength(91);
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.FLEET_COMPATIBILITY);expect(await c.sha256(c.preFleetCompatibilitySource(scene))).toBe(c.TREE_COMPATIBILITY);
 expect(previous.objects).toHaveLength(1769);expect(previous.surfaces).toHaveLength(47);expect(scene.surfaces).toHaveLength(51);
 expect(ambientGraph(scene).nodes).toEqual(ambientGraph(previous).nodes);expect(ambientGraph(scene).starts).toEqual(ambientGraph(previous).starts);
 const ids=new Set(fleet.map(o=>o.id));expect(sceneContactData(scene).contacts.filter(c=>!c.id || !ids.has(c.id))).toEqual(sceneContactData(previous).contacts);
 for(const object of fleet){const spec=object.spec!;if(!('dslVersion' in spec))throw Error('Expected a composed vehicle');const bounds=assemblyBounds(spec);expect(bounds.getSize(new Vector3()).x*object.scale/10).toBeCloseTo(object.spec!.displayName==='Field pickup' ? 4.95 : 6.6);}
});
it('boards, drives, exits, reboards and restores every utility vehicle through the existing controls',()=>{
 const start=createCarAtSpawn(scene),immutable=JSON.stringify(scene);
 for(const object of fleet){
  const foot=vehicleReviewStart(start,world,object.id);expect(foot.control.kind,object.id).toBe('foot');expect(nearbyRide(foot,world)?.id,object.id).toBe(object.id);
  let state=toggleRide(foot,world);expect(state.control).toEqual({kind:'vehicle',id:object.id});
  for(let n=0;n<120;n++)state=stepInteractive(state,{steer:0,throttle:1},1/120,world);
  expect(Math.hypot(state.x-object.x,state.y-object.y),object.id).toBeGreaterThan(20);
  const exit=toggleRide(state,world);expect(exit.control.kind,object.id).toBe('foot');expect(exit.vehicles.find(v=>v.id===object.id)).toMatchObject({x:state.x,y:state.y,distance:state.distance});
  expect(carFootprintClear(bodyWorld(exit,world),exit.x,exit.y,exit.elevation,exit.timeS,exit)).toBe(true);
  const restored=decodeSave(encodeSave(exit,exit.timeS,world),world).state;expect(restored.vehicles).toEqual(exit.vehicles);expect(toggleRide(restored,world).control).toEqual({kind:'vehicle',id:object.id});
 }
 expect(JSON.stringify(scene)).toBe(immutable);
});
it('keeps released progress, old slots and clocks, and only recovers a pose obstructed by a new seed',()=>{
 const before=createCarAtSpawn(previous),text=encodeSave(before,19,oldWorld),loaded=decodeSave(text,world);expect(loaded.state).toEqual(JSON.parse(text).state);expect(loaded.worldTime).toBe(19);expect(loaded.migrated).toBe(true);
 const oldKey=`muse-dream.save.v17.${scene.sceneId}.${c.TREE_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.state).toEqual(loaded.state);expect(slot.write(loaded.state,19)).toBe(true);expect(rows.get(oldKey)).toBe(text);expect(rows.size).toBe(2);
 expect(()=>decodeSave(text,{...world,previousFleetSaveCompatibility:undefined})).toThrow('different world');
 const blocked={...before,x:fleet[0]!.x,y:fleet[0]!.y},recovered=decodeSave(encodeSave(blocked,19,oldWorld),world).state;
 expect(carFootprintClear(bodyWorld(recovered,world),recovered.x,recovered.y,recovered.elevation,recovered.timeS,recovered)).toBe(true);expect(recovered.economy).toEqual(blocked.economy);expect(recovered.timeS).toBe(blocked.timeS);
});
it('replays the complete historical backup chain into the fleet without rebasing unrelated state',async()=>{
 const parking=c.preParkingScene(c.preCityScene(scene)),empty=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:empty,previousSaveSource:c.registeredLegacySource(empty),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures={...import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('./fixtures/hosted-meal-r71-save-v16.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/hosted-meals/native-*.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-repairs/native-work.json',{query:'?raw',import:'default',eager:true}),...import.meta.glob('../docs/evidence/city-trees/native-*.json',{query:'?raw',import:'default',eager:true})} as Record<string,string>;
 let count=0;for(const [name,text] of Object.entries(fixtures)){if(JSON.parse(text).kind!=='dream-save')continue;const before=decodeSave(text,{...oldWorld,...legacy}),after=decodeSave(text,{...world,...legacy});expect(after.state,name).toEqual(before.state);expect(after.worldTime,name).toBe(before.worldTime);count++;}
 expect(count).toBeGreaterThanOrEqual(34);
},60000);

it('carries real sealed delivery cargo through a truck journey, save, exit and one paid handover',()=>{
 let state=cargoReviewStart(createCarAtSpawn(scene),world,'school_run');const account=state.economy!.accounts.find(a=>a.delivery?.id==='school_run')!;expect(account).toBeDefined();const playerId=account.id;
 const player=(s:typeof state)=>s.economy!.accounts.find(a=>a.id===playerId)!;
 const cargo=structuredClone(player(state).delivery),credits=player(state).credits;
 state=vehicleReviewStart(state,world,'station_parcel_truck');state=toggleRide(state,world);expect(state.control).toEqual({kind:'vehicle',id:'station_parcel_truck'});
 for(let n=0;n<120;n++)state=stepInteractive(state,{steer:0,throttle:1},1/120,world);
 state=decodeSave(encodeSave(state,state.timeS,world),world).state;expect(player(state).delivery).toEqual(cargo);
 state=toggleRide(state,world);expect(state.control.kind).toBe('foot');const target=npcReviewStart(createCarAtSpawn(scene),world,'teacher'),parked=structuredClone(state.vehicles);state={...state,x:target.x,y:target.y,elevation:target.elevation,vx:0,vy:0};
 state=stepInteractive(state,{steer:0,throttle:0,commerce:{kind:'deliver'}},1/120,world);
 expect(player(state).delivery).toBeUndefined();expect(player(state).credits).toBe(credits+5);expect(state.economy!.delivered.school_run).toBe(1);expect(state.vehicles).toEqual(parked);
 const paid=player(state).credits;state=stepInteractive(state,{steer:0,throttle:0,commerce:{kind:'deliver'}},1/120,world);expect(player(state).credits).toBe(paid);
});

it('gives a newly introduced truck nearby clear parking while retaining an old bicycle pose exactly',()=>{
 const bike=previous.objects.find(o=>isParkedVehicle(o) && controlFor(o)==='bicycle')!,truck=fleet.find(o=>o.id==='station_parcel_truck')!;
 const before={...createCarAtSpawn(previous),vehicles:[{id:bike.id,x:truck.x,y:truck.y,elevation:0,headingRad:0,distance:23}]},text=encodeSave(before,18,oldWorld),after=decodeSave(text,world).state;
 expect(after.vehicles.find(v=>v.id===bike.id)).toEqual(before.vehicles[0]);const shifted=after.vehicles.find(v=>v.id===truck.id)!;expect(shifted).toBeDefined();expect(Math.hypot(shifted.x-truck.x,shifted.y-truck.y)).toBeLessThanOrEqual(320);
 const occupied={...after,...after.vehicles[0]!,control:{kind:'vehicle' as const,id:bike.id},vehicles:after.vehicles.filter(v=>v.id!==bike.id)};
 expect(carFootprintClear(bodyWorld(occupied,world),occupied.x,occupied.y,occupied.elevation,occupied.timeS,occupied)).toBe(true);
 expect(decodeSave(encodeSave(after,18,world),world).state.vehicles).toEqual(after.vehicles);
});
