import {beforeAll,afterEach,it,expect} from 'vitest';
import native from '../docs/evidence/service-visits/native-cancelled.json';
import beforeMeal from './fixtures/residential-before-meal.json';
import returnedMeal from '../docs/evidence/residential-room/meal-returned.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,carFootprintClear,type CarState,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {sceneContactData,objectContacts} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {sceneFloors,interiorVisibility} from '../src/scene/floors';
import {objectPlacement} from '../src/scene/placement';
import {worldSeats} from '../src/scene/seating';
import {repairTargets,repairApproach,repairArea} from '../src/sim/repair';
import {workPath} from '../src/sim/work-navigation';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {decodeSave,encodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {bodyWorld,toggleRide} from '../src/sim/interaction';
import {residentialRoomReviewSteps} from '../src/game/residential-room-review';
let scene:ReturnType<typeof createWorldScene>,prior:typeof scene,world:World,old:World,snapshot:string;
beforeAll(()=>{
 scene=createWorldScene();prior=c.preResidentialRoomScene(scene);snapshot=JSON.stringify(scene);
 world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.RESIDENTIAL_ROOM_COMPATIBILITY,previousResidentialRoomSaveCompatibility:c.SERVICE_VISITS_COMPATIBILITY,previousResidentialRoomContacts:sceneContactData(prior),previousResidentialRoomNavigation:ambientGraph(prior)};
 old={...world,scene:prior,saveCompatibility:c.SERVICE_VISITS_COMPATIBILITY,previousResidentialRoomSaveCompatibility:undefined};
},60000);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const ids=['station_quarter_lounge_seat','station_quarter_lounge_table','station_quarter_lounge_planter','station_quarter_lounge_north','station_quarter_lounge_shelf'];
const account=(s:CarState,id='office_clerk')=>s.economy!.accounts.find(a=>a.id===id)!;
const tick=(s:CarState,doc=scene)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc),population:stepAmbient(s,.25,doc)},{},.25,doc);
const run=async(steps:Generator<CarState,CarState>)=>{let r=steps.next(),i=0;while(!r.done){if(++i%120===0)await new Promise(resolve=>setTimeout(resolve,0));r=steps.next();}return r.value;};

it('opens a connected residential floor within existing construction budgets and preserves exact r119',async()=>{
 expect(scene.revisionId).toBe('r120');expect(c.SAVE_SIMULATION_VERSION).toBe(60);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.RESIDENTIAL_ROOM_COMPATIBILITY);expect(await c.sha256(c.preResidentialRoomCompatibilitySource(scene))).toBe(c.SERVICE_VISITS_COMPATIBILITY);
 expect(scene.objects.length-prior.objects.length).toBe(5);expect(sceneContactData(scene).contacts.length-sceneContactData(prior).contacts.length).toBe(23);expect(scene.floors!.length-prior.floors!.length).toBe(2);expect(ambientGraph(scene)).toEqual(ambientGraph(prior));
 for(const key of ['goods','markets','jobs','deliveries','visits'] as const)expect(scene.economy![key]).toEqual(prior.economy![key]);
 expect(scene.objects.filter(o=>o.role==='npc' || o.ambient || o.parked)).toEqual(prior.objects.filter(o=>o.role==='npc' || o.ambient || o.parked));
 const home=scene.objects.find(o=>o.id==='station_quarter_residences')!,spec=home.spec as import('../src/scene/object-dsl').ObjectDslV2,stairs=spec.stairways![0]!,contacts=objectContacts(scene,home).slice(stairs.contactStart,stairs.contactStart+stairs.steps);
 expect(home.scale).toBe(prior.objects.find(o=>o.id===home.id)!.scale);expect(spec.parts).toHaveLength(32);expect(spec.contacts).toHaveLength(32);expect(stairs.steps).toBe(15);
 for(let i=1;i<contacts.length;i++){expect(contacts[i]!.top-contacts[i-1]!.top).toBeCloseTo(1.8333333333333333);expect(contacts[i]!.top-contacts[i-1]!.top).toBeLessThan(2);}
 const lights=spec.parts.filter(p=>p.material.nightColor==='#f4d398');expect(lights).toHaveLength(1);
 for(const p of lights)expect(spec.contacts!.some(c=>c.size && Math.abs(p.position[1]+p.size[1]/2-c.position[1])<1e-8 && Math.abs(p.position[0]-c.position[0])+p.size[0]/2<=c.size[0]/2 && Math.abs(p.position[2]-c.position[2])+p.size[2]/2<=c.size[1]/2)).toBe(true);
 for(const id of ids){const o=scene.objects.find(o=>o.id===id)!;expect(o.floor).toBe('home_lounge');expect(objectPlacement(scene,o).base).toBeCloseTo(sceneFloors(scene).find(f=>f.id==='home_lounge')!.elevation);}
});

it('walks ordinary controls upstairs, sits, reloads and returns through the same stairs',async()=>{
 const seated=await run(residentialRoomReviewSteps(createCarAtSpawn(scene),world)),floor=sceneFloors(scene).find(f=>f.id==='home_lounge')!;
 expect(seated.seated?.objectId).toBe(ids[0]);expect(seated.elevation).toBeCloseTo(floor.elevation);expect(seated.control.kind).toBe('foot');
 const restored=decodeSave(encodeSave(seated,seated.timeS,world),world).state;expect(restored).toEqual(JSON.parse(JSON.stringify(seated)));expect(toggleRide(restored,world).seated).toBeUndefined();
 const returned=await run(residentialRoomReviewSteps(createCarAtSpawn(scene),world,'return'));expect(returned.elevation).toBeCloseTo(0);expect(returned.seated).toBeUndefined();checkEconomyState(returned,scene);
});

it('walks the resident upstairs to recover energy, saves the actual claim and returns without spending or teleporting',()=>{
 let s=createCarAtSpawn(scene),climbed=false,sat=false,saved=false;const floor=sceneFloors(scene).find(f=>f.id==='home_lounge')!;let previous={x:11700,y:4700};
 for(let i=0;i<800;i++){
  s=tick(s);const a=account(s),t=a.resting;if(t){expect(Math.hypot(t.x-previous.x,t.y-previous.y)).toBeLessThanOrEqual(3.501);previous=t;climbed ||= (t.elevation??0)>4 && (t.elevation??0)<floor.elevation-2;
   if(t.phase==='sit'){sat=true;expect(t.seat?.objectId).toBe(ids[0]);expect(t.elevation).toBeCloseTo(floor.elevation);if(!saved){s=decodeSave(encodeSave(s,s.timeS,world),world).state;saved=true;}}
  }if(sat && !a.resting)break;
 }
 expect(climbed && sat && saved).toBe(true);expect(account(s).resting).toBeUndefined();expect(account(s).energy).toBeGreaterThan(85);expect(account(s).credits).toBe(0);checkEconomyState(s,scene);
});

it('keeps the lobby fallback and connects every new furnishing to finite caretaker supply and a supported return',()=>{
 expect(scene.economy!.rests!.find(r=>r.id==='office_home_rest')!.seats).toEqual([ids[0],'station_quarter_home_seat']);expect(scene.economy!.meals.find(m=>m.id==='office_lunch')!.seats).toEqual([ids[0],'station_quarter_home_seat']);
 const service=scene.economy!.repairs.find(r=>r.id==='classroom_furniture')!,start=scene.objects.find(o=>o.id==='vendor')!,targets=repairTargets(scene,service);
 for(const id of ids){const target=targets.find(t=>t.objectId===id)!;expect(target,id).toBeDefined();const approach=repairApproach(scene,service,target,start);expect(approach,id).toBeDefined();expect(approach!.end.elevation).toBeGreaterThan(29);expect(workPath(scene,repairArea(scene,service),approach!.end,start)).toBeDefined();}
 expect(service.input).toBe('timber');expect(service.take).toBe(1);expect(service.pay).toBe(4);
});

it('dispatches the caretaker upstairs, spends a kit, pays once and walks home across a saved work phase',async()=>{
 let s:CarState={...createCarAtSpawn(scene),broken:[ids[1]!]},climbed=false,saved=false,paid=false;const floor=sceneFloors(scene).find(f=>f.id==='home_lounge')!;
 for(let i=0;i<12000;i++){
  s=tick(s);const a=account(s,'caretaker'),t=a.repair;
  if(t && t.objectId===ids[1]){climbed ||= (t.elevation??0)>5 && (t.elevation??0)<floor.elevation-2;if(t.phase==='work' && !saved){expect(t.elevation).toBeCloseTo(floor.elevation);s=decodeSave(encodeSave(s,s.timeS,world),world).state;saved=true;}}
  paid ||= !s.broken.includes(ids[1]!);if(paid && !account(s,'caretaker').repair)break;if(i%120===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 expect(climbed && saved && paid).toBe(true);expect(account(s,'caretaker').repair).toBeUndefined();expect(account(s,'caretaker').completed.repair.classroom_furniture).toBe(1);expect(account(s,'caretaker').credits).toBe(4);expect(s.economy!.repaired.classroom_furniture).toBe(1);checkEconomyState(s,scene);
},60000);

it('earns real service wages, buys station bread and carries the paid meal upstairs before eating',async()=>{
 let s=decodeSave(JSON.stringify(beforeMeal),world).state,eating=false,finished=false,saved=false;const floor=sceneFloors(scene).find(f=>f.id==='home_lounge')!;
 expect(account(s).meal?.phase).toBe('seat');expect(account(s).credits).toBe(3);expect(account(s).completed.work.check_records).toBe(2);
 for(let i=0;i<2000;i++){
  s=tick(s);const a=account(s);
  if(a.meal?.phase==='eat'){eating=true;expect(a.meal.seat?.objectId).toBe(ids[0]);expect(a.meal.elevation).toBeCloseTo(floor.elevation);expect(a.inventory.bread).toBe(1);expect(a.completed.work.check_records).toBeGreaterThan(0);if(!saved){s=decodeSave(encodeSave(s,s.timeS,world),world).state;saved=true;}}
  if(eating && !a.meal){finished=true;break;}if(i%120===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 expect(eating && finished && saved).toBe(true);expect(account(s).inventory.bread).toBe(0);expect(s.economy!.consumed.bread).toBeGreaterThan(0);expect(s.economy!.served!.check_records).toBeGreaterThan(0);checkEconomyState(s,scene);expect(JSON.parse(encodeSave(s,s.timeS,world))).toEqual(returnedMeal);
},60000);

it('retains physical upper support and hides lounge contents only from below',()=>{
 const o=scene.objects.find(o=>o.id===ids[1])!,floor=sceneFloors(scene).find(f=>f.id==='home_lounge')!;
 expect(interiorVisibility(scene,{x:o.x,y:o.y,elevation:2}).object(o)).toBe(true);expect(interiorVisibility(scene,{x:o.x,y:o.y,elevation:floor.elevation}).object(o)).toBe(false);expect(objectContacts(scene,o)[0]!.bottom).toBeCloseTo(floor.elevation);
});

it('preserves every actual native r119 field, clock and original slot through the construction upgrade',()=>{
 const text=JSON.stringify(native),before=decodeSave(text,old),loaded=decodeSave(text,world);expect(loaded.state).toEqual(before.state);expect(loaded.worldTime).toBe(before.worldTime);expect(loaded.migrated).toBe(true);expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.SERVICE_VISITS_COMPATIBILITY}`,rows=new Map([[key,text]]),save=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(save.restored!.state).toEqual(before.state);expect(save.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 expect(()=>decodeSave(text,{...world,previousResidentialRoomSaveCompatibility:undefined})).toThrow('different world');const forged=structuredClone(native);forged.state.economy.accounts[0]!.credits++;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');
});

it('recovers only a previously clear grounded pose obstructed by the new stairs',()=>{
 const initial=createCarAtSpawn(prior),home=scene.objects.find(o=>o.id==='station_quarter_residences')!,s:CarState={...initial,control:{kind:'foot'},x:home.x+31*home.scale,y:home.y,elevation:.5*home.scale,vehicles:[{id:null,x:initial.x,y:initial.y,elevation:initial.elevation,headingRad:initial.headingRad,distance:0}]};
 expect(carFootprintClear(bodyWorld(s,old),s.x,s.y,s.elevation,0,s)).toBe(true);expect(carFootprintClear(bodyWorld(s,world),s.x,s.y,s.elevation,0,s)).toBe(false);
 const loaded=decodeSave(encodeSave(s,33,old),world);expect(loaded.state.economy).toEqual(s.economy);expect(loaded.worldTime).toBe(33);expect(loaded.state.timeS).toBe(s.timeS);expect(Math.hypot(loaded.state.x-s.x,loaded.state.y-s.y)).toBeLessThanOrEqual(32);expect(carFootprintClear(bodyWorld(loaded.state,world),loaded.state.x,loaded.state.y,loaded.state.elevation,0,loaded.state)).toBe(true);
});
