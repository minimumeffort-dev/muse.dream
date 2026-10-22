import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {sceneInteriors,portalPoints,walkingHeight,occupiedInterior} from '../src/scene/interiors';
import {worldSeats,seatAccessClear} from '../src/scene/seating';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,carFootprintClear,type CarState,type World} from '../src/sim/car';
import {stepInteractive,toggleRide,bodyWorld} from '../src/sim/interaction';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {repairTargets} from '../src/sim/repair';
import {actorPose} from '../src/sim/actors';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {schoolReviewSteps} from '../src/game/school-review';
import {npcReviewStart} from '../src/game/review-start';
const scene=createWorldScene(),old=c.preSchoolInteriorScene(scene);
const world=(s=scene):World=>({scene:s,roadMask:buildMaskForScene(s),driveMask:buildPaperMask(14000,11000),carRadius:11});
const current={...world(),saveCompatibility:c.SCHOOL_INTERIOR_COMPATIBILITY,previousSchoolInteriorSaveCompatibility:c.NURSERY_COMPATIBILITY},previous={...world(old),saveCompatibility:c.NURSERY_COMPATIBILITY};
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
let prepared:CarState|undefined;
const ready=()=>{if(!prepared){const steps=schoolReviewSteps(createCarAtSpawn(scene),current);let r=steps.next();while(!r.done)r=steps.next();prepared=r.value;}return structuredClone(prepared);};
const tick=(s:CarState,w:World=current)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,w.scene),population:stepAmbient(s,.25,w.scene)},{},.25,w.scene);
let oldPrepared:CarState|undefined;
const oldReady=()=>{
 if(!oldPrepared){
  let s=npcReviewStart(createCarAtSpawn(old),previous,'vendor');
  for(let i=0;i<2;i++)s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'buy',market:'market_stall',good:'bread'}},1/120,previous);
  const parked=s.vehicles;s={...npcReviewStart(s,previous,'teacher'),vehicles:parked};s=stepInteractive(s,{steer:0,throttle:0,talkPressed:true},1/120,previous);
  for(let i=0;i<120*300 && account(s,'school_staff').shift?.phase!=='rest';i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,previous);
  oldPrepared=s;
 }
 return structuredClone(oldPrepared);
};
it('opens a measured school room without moving existing scenery, retaining the exact r90 save projection',async()=>{
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.SCHOOL_INTERIOR_COMPATIBILITY);expect(await c.sha256(c.preSchoolInteriorCompatibilitySource(scene))).toBe(c.NURSERY_COMPATIBILITY);
 expect(await c.sha256(c.preNurseryCompatibilitySource(scene))).toBe(c.HARDWARE_COMPATIBILITY);
 const f=sceneInteriors(scene).find(f=>f.object.id==='garden_school')!;expect(f.floor).toBe(2);expect(f.ceiling-f.floor).toBe(32);expect(f.object.spec).toMatchObject({dslVersion:2});
 expect(scene.objects.filter(o=>!old.objects.some(p=>p.id===o.id))).toHaveLength(5);expect(scene.objects.filter(o=>o.id!=='garden_school' && old.objects.some(p=>p.id===o.id))).toEqual(old.objects.filter(o=>o.id!=='garden_school'));
 const service=scene.economy!.repairs.find(r=>r.id==='classroom_furniture')!;expect(repairTargets(scene,service).map(t=>t.objectId).sort()).toEqual(['hall_table_east','school_common_bench','school_reading_bench','school_rear_bench','school_table_east','school_table_west']);
 for(const seat of worldSeats(scene).filter(s=>s.objectId.startsWith('school_') && s.objectId!=='school_bench')){expect(seatAccessClear(scene,seat)).toBe(true);expect(seat.elevation).toBe(2);}
});
it('walks through the real opening while walls and its narrower-than-car doorway retain collisions',()=>{
 const room=sceneInteriors(scene).find(f=>f.object.id==='garden_school')!,door=portalPoints(room,room.room.portals[0]!,24),initial=createCarAtSpawn(scene);
 let s:CarState={...initial,control:{kind:'foot' as const},...door.outside,elevation:0,vx:0,vy:0,vehicles:[{id:null,x:initial.x,y:initial.y,elevation:initial.elevation,headingRad:0,distance:0}]};
 const a=Math.atan2(180,480);for(let i=0;i<120;i++)s=stepInteractive(s,{steer:-Math.sin(a),throttle:-Math.cos(a)},1/120,current);
 expect(occupiedInterior(scene,s.x,s.y,s.elevation)?.object.id).toBe('garden_school');expect(s.elevation).toBe(2);
 expect(carFootprintClear(current,door.center.x,door.center.y,2,s.timeS)).toBe(false);expect(carFootprintClear(bodyWorld(s,current),4317,3650,2,s.timeS,s)).toBe(false);
});
it('connects real food purchases, teacher attendance, an indoor shared meal, remembered history and reload',()=>{
 let s=ready();expect(s.seated?.objectId).toBe('school_common_bench');expect(account(s).inventory.bread).toBe(2);expect(account(s).credits).toBe(10);expect(account(s,'school_staff').shift?.phase).toBe('rest');
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'share',partner:'school_staff'}},1/120,current);expect(s.economy!.shared?.partner).toBe('school_staff');
 s=decodeSave(encodeSave(s,s.timeS,current),current).state;
 for(let i=0;i<100 && s.economy!.shared;i++)s=tick(s);
 expect(s.economy!.shared).toBeUndefined();expect(s.economy!.socialHistory?.school_staff?.meals).toBe(1);expect(account(s).inventory.bread).toBe(0);expect(s.economy!.consumed.bread).toBeGreaterThanOrEqual(2);checkEconomyState(s,scene);
 expect(decodeSave(encodeSave(s,s.timeS,current),current).state.economy!.socialHistory).toEqual(s.economy!.socialHistory);
});
it('dispatches the existing caretaker indoors with a real kit, one wage, full-shelf recovery limits and a restorable seat',()=>{
 let s=npcReviewStart(createCarAtSpawn(scene),current,'teacher');s={...s,broken:['school_common_bench']};const before=s.economy!.repaired.classroom_furniture!;let dispatched=false;
 for(let i=0;i<2800;i++){
  s=tick(s);if(account(s,'caretaker').repair?.id==='classroom_furniture')dispatched=true;
  if(s.economy!.repaired.classroom_furniture!>before && !account(s,'caretaker').repair)break;
 }
 expect(dispatched,JSON.stringify({time:s.timeS,worker:account(s,'caretaker'),markets:s.economy!.markets,events:s.economy!.events})).toBe(true);expect(s.broken).not.toContain('school_common_bench');expect(s.economy!.repaired.classroom_furniture).toBe(1);expect(account(s,'caretaker').completed.repair.classroom_furniture).toBe(1);expect(s.economy!.recovered!.classroom_furniture).toBe(0);checkEconomyState(s,scene);
 expect(decodeSave(encodeSave(s,s.timeS,current),current).state.economy!.repaired.classroom_furniture).toBe(1);
});
it('migrates an r90 teacher break without teleporting, preserving money, food, clocks and the original slot',()=>{
 let s=oldReady();
 expect(account(s,'school_staff').shift?.phase).toBe('rest');const text=encodeSave(s,s.timeS,previous),next=decodeSave(text,current),teacher=scene.objects.find(o=>o.id==='teacher')!;
 expect(actorPose(scene,teacher,next.state.timeS,next.state)).toMatchObject({x:4320,y:3860});expect(account(next.state,'school_staff').shift?.at).toEqual({x:4390,y:3590});expect(account(next.state,'school_staff').shift?.phase).toBe('out');expect(next.state.timeS).toBe(s.timeS);expect(next.state.economy!.markets).toEqual(s.economy!.markets);expect(account(next.state).inventory).toEqual(account(s).inventory);
 const key=`muse-dream.save.v19.${old.sceneId}.${c.NURSERY_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(current,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(next.state);expect(slot.write(next.state,next.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 expect(()=>decodeSave(text,{...current,previousSchoolInteriorSaveCompatibility:undefined})).toThrow('different world');
});

it('preserves an unfinished outdoor school meal and returns the companion to the new indoor break spot',()=>{
 let s=oldReady();const seat=worldSeats(old).find(s=>s.objectId==='school_bench' && s.seatId==='left')!;
 s=toggleRide({...s,...seat.approach,elevation:walkingHeight(old,seat.approach.x,seat.approach.y)},previous);
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'share',partner:'school_staff'}},1/120,previous);expect(s.economy!.shared?.phase).toBe('out');
 for(const phase of ['out','eat'] as const){
  for(let i=0;i<80 && s.economy!.shared?.phase!==phase;i++)s=tick(s,previous);
  expect(s.economy!.shared?.phase).toBe(phase);const meal=s.economy!.shared!,text=encodeSave(s,s.timeS,previous),migrated=decodeSave(text,current).state;
  expect(migrated.economy!.shared).toMatchObject({phase,x:meal.x,y:meal.y,portions:2,startedAtS:meal.startedAtS,home:{x:4390,y:3590}});
  if(phase==='eat'){
   let next=migrated;for(let i=0;i<320 && next.economy!.shared;i++)next=tick(next);
   expect(next.economy!.shared).toBeUndefined();expect(next.economy!.socialHistory?.school_staff?.meals).toBe(1);expect(account(next,'school_staff').shift?.at).toEqual({x:4390,y:3590});
   expect(encodeSave(next,next.timeS,current)).toBeTypeOf('string');
  }
 }
});

it('restores a teacher journey when a saved car temporarily blocks the new entrance',()=>{
 let s=oldReady();s={...s,vehicles:s.vehicles.map(v=>v.id===null ? {...v,x:4430,y:3544,elevation:0,headingRad:Math.PI/2} : v)};
 const loaded=decodeSave(encodeSave(s,s.timeS,previous),current).state;
 expect(account(loaded,'school_staff').shift).toMatchObject({phase:'out',x:4320,y:3860,at:{x:4390,y:3590}});
 expect(account(loaded,'school_staff').shift!.path.length).toBeGreaterThan(0);expect(loaded.vehicles).toEqual(s.vehicles);expect(loaded.timeS).toBe(s.timeS);
 expect(encodeSave(loaded,loaded.timeS,current)).toBeTypeOf('string');
});
