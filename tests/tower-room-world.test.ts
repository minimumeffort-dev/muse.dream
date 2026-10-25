import {beforeAll,afterEach,it,expect} from 'vitest';
import native from './fixtures/tower-room-r113-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,carFootprintClear,type World,type CarState} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {sceneContactData,objectContacts} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {sceneFloors,interiorVisibility} from '../src/scene/floors';
import {worldSeats} from '../src/scene/seating';
import {objectPlacement} from '../src/scene/placement';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {checkEconomyState,stepCommerce} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {repairTargets,repairApproach,repairArea} from '../src/sim/repair';
import {workPath} from '../src/sim/work-navigation';
import {towerRoomReviewSteps} from '../src/game/tower-room-review';
import {stepInteractive,bodyWorld,toggleRide} from '../src/sim/interaction';
let scene:ReturnType<typeof createWorldScene>,prior:typeof scene,world:World,old:World,snapshot:string;
beforeAll(()=>{
 scene=createWorldScene();prior=c.preTowerRoomScene(scene);snapshot=JSON.stringify(scene);
 world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.TOWER_ROOM_COMPATIBILITY,previousTowerRoomSaveCompatibility:c.CROWD_FLOW_COMPATIBILITY,previousTowerRoomContacts:sceneContactData(prior),previousTowerRoomNavigation:ambientGraph(prior)};
 old={...world,scene:prior,saveCompatibility:c.CROWD_FLOW_COMPATIBILITY,previousTowerRoomSaveCompatibility:undefined};
},60000);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const furniture=['station_quarter_gallery_south','station_quarter_gallery_north','station_quarter_gallery_table'];
const run=async(steps:Generator<CarState,CarState>)=>{let r=steps.next(),n=0;while(!r.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));r=steps.next();}return r.value;};

it('registers exact r113 and adds supported rooms without actors, resources or public-network changes',async()=>{
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.TOWER_ROOM_COMPATIBILITY);
 expect(await c.sha256(c.preTowerRoomCompatibilitySource(scene))).toBe(c.CROWD_FLOW_COMPATIBILITY);
 expect(await c.sha256(c.preCrowdFlowCompatibilitySource(scene))).toBe(c.WALKING_LINKS_COMPATIBILITY);
 expect(scene.revisionId).toBe('r114');expect(scene.objects.length-prior.objects.length).toBe(3);expect(scene.floors!.length-prior.floors!.length).toBe(2);
 expect(scene.economy!.accounts).toEqual(prior.economy!.accounts);expect(scene.economy!.markets).toEqual(prior.economy!.markets);expect(scene.economy!.jobs).toEqual(prior.economy!.jobs);
 expect(scene.objects.filter(o=>o.role==='npc' || o.ambient)).toEqual(prior.objects.filter(o=>o.role==='npc' || o.ambient));expect(ambientGraph(scene)).toEqual(ambientGraph(prior));
 const office=scene.objects.find(o=>o.id==='station_quarter_offices')!,spec=office.spec as import('../src/scene/object-dsl').ObjectDslV2;
 expect(office.scale).toBe(prior.objects.find(o=>o.id===office.id)!.scale);expect(spec.parts).toHaveLength(29);expect(spec.contacts).toHaveLength(28);expect(spec.stairways![0]!.steps).toBe(12);
 for(const id of furniture){const o=scene.objects.find(o=>o.id===id)!;expect(o.floor).toBe('office_mezzanine');expect(objectPlacement(scene,o).base).toBeCloseTo(sceneFloors(scene).find(f=>f.id===o.floor)!.elevation);}
});

it('walks through the door, up the stairs, sits, reloads and walks back to the street',async()=>{
 const seated=await run(towerRoomReviewSteps(createCarAtSpawn(scene),world)),floor=sceneFloors(scene).find(f=>f.id==='office_mezzanine')!;
 expect(seated.seated?.objectId).toBe('station_quarter_gallery_north');expect(seated.elevation).toBeCloseTo(floor.elevation);expect(seated.control.kind).toBe('foot');
 const restored=decodeSave(encodeSave(seated,seated.timeS,world),world).state;expect(restored).toEqual(JSON.parse(JSON.stringify(seated)));expect(toggleRide(restored,world).seated).toBeUndefined();
 const returned=await run(towerRoomReviewSteps(createCarAtSpawn(scene),world,'return'));expect(returned.elevation).toBeCloseTo(0);expect(returned.seated).toBeUndefined();expect(returned.control.kind).toBe('foot');checkEconomyState(returned,scene);
});

it('connects every upstairs furnishing to ordinary conserved maintenance through the same stairs',()=>{
 const service=scene.economy!.repairs.find(r=>r.id==='classroom_furniture')!,targets=repairTargets(scene,service),start=scene.objects.find(o=>o.id==='vendor')!;
 for(const id of furniture){
  const target=targets.find(t=>t.objectId===id)!;expect(target,id).toBeDefined();const approach=repairApproach(scene,service,target,start);expect(approach,id).toBeDefined();
  expect(approach!.end.elevation).toBeGreaterThan(40);expect(approach!.path.some(p=>(p.elevation??0)>5 && (p.elevation??0)<40)).toBe(true);
  expect(workPath(scene,repairArea(scene,service),approach!.end,start)).toBeDefined();
 }
 expect(service.input).toBe('timber');expect(service.pay).toBe(4);expect(service.take).toBe(1);
});

it('hides upstairs furniture from the lobby and keeps its contact and damage on the retained slab',()=>{
 const object=scene.objects.find(o=>o.id===furniture[2])!,floor=sceneFloors(scene).find(f=>f.id===object.floor)!;
 expect(interiorVisibility(scene,{x:object.x,y:object.y,elevation:2}).object(object)).toBe(true);expect(interiorVisibility(scene,{x:object.x,y:object.y,elevation:floor.elevation}).object(object)).toBe(false);
 expect(objectContacts(scene,object)[0]!.bottom).toBeCloseTo(floor.elevation);
});

it('retains old slots and every unchanged saved field before using the new room',()=>{
 const before=createCarAtSpawn(prior),text=encodeSave(before,17,old),loaded=decodeSave(text,world);expect(loaded.state).toEqual(before);expect(loaded.worldTime).toBe(17);expect(loaded.migrated).toBe(true);
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.CROWD_FLOW_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(before);expect(slot.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 expect(()=>decodeSave(text,{...world,previousTowerRoomSaveCompatibility:undefined})).toThrow('different world');
});

it('preserves every field and clock in the actual native r113 backup',()=>{
 const text=JSON.stringify(native),before=decodeSave(text,old),after=decodeSave(text,world);
 expect(after.state).toEqual(before.state);expect(after.state).toEqual(native.state);expect(after.worldTime).toBe(native.worldTime);expect(after.migrated).toBe(true);
 expect(decodeSave(encodeSave(after.state,after.worldTime,world),world).state).toEqual(after.state);
 const forged=structuredClone(native);forged.state.economy!.accounts[0]!.credits++;
 expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');
});

it('walks the caretaker upstairs, consumes one kit, pays once and preserves a repair across reload',async()=>{
 const target='station_quarter_gallery_table';let state:CarState={...createCarAtSpawn(scene),broken:[target]},saved=false,climbed=false,paid=false;
 const caretaker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='caretaker')!;
 const floor=sceneFloors(scene).find(f=>f.id==='office_mezzanine')!.elevation;
 for(let i=0;i<12000;i++){
  state=stepCommerce({...state,timeS:state.timeS+.25,npcs:stepNpcs(state,.25,scene),population:stepAmbient(state,.25,scene)},{},.25,scene);
  const a=caretaker(state),t=a.repair;
  if(t?.objectId===target){
   if((t.elevation??0)>8 && (t.elevation??0)<floor-4)climbed=true;
   if(t.phase==='work' && !saved){expect(t.elevation).toBeCloseTo(floor);const packet=encodeSave(state,state.timeS,world);state=decodeSave(packet,world).state;saved=true;}
  }
  if(!state.broken.includes(target)){paid=true;expect(a.completed.repair.classroom_furniture).toBe(1);expect(a.credits).toBe(4);break;}
  if(i%120===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 expect(climbed && saved && paid).toBe(true);expect(state.economy!.repaired.classroom_furniture).toBe(1);checkEconomyState(state,scene);
},60000);

it('recovers only a released lobby pose newly occupied by stairs without losing its floor, money or time',()=>{
 const initial=createCarAtSpawn(prior),office=scene.objects.find(o=>o.id==='station_quarter_offices')!,before:CarState={...initial,control:{kind:'foot'},x:office.x+27*office.scale,y:office.y,elevation:.5*office.scale,vehicles:[{id:null,x:initial.x,y:initial.y,elevation:initial.elevation,headingRad:initial.headingRad,distance:initial.distance}]};
 expect(carFootprintClear(bodyWorld(before,old),before.x,before.y,before.elevation,0,before)).toBe(true);expect(carFootprintClear(bodyWorld(before,world),before.x,before.y,before.elevation,0,before)).toBe(false);
 const loaded=decodeSave(encodeSave(before,21,old),world).state;expect(loaded.economy).toEqual(before.economy);expect(loaded.timeS).toBe(before.timeS);expect(loaded.elevation).toBeCloseTo(before.elevation);expect(Math.hypot(loaded.x-before.x,loaded.y-before.y)).toBeGreaterThan(0);expect(Math.hypot(loaded.x-before.x,loaded.y-before.y)).toBeLessThanOrEqual(32);expect(carFootprintClear(bodyWorld(loaded,world),loaded.x,loaded.y,loaded.elevation,0,loaded)).toBe(true);
});
