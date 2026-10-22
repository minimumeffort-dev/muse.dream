import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {sceneContactData,objectContacts} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,carFootprintClear,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {toggleRide,stepInteractive,bodyWorld} from '../src/sim/interaction';
import {breakOnContact,advanceImpactMotion} from '../src/sim/impacts';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {upstairsReviewSteps} from '../src/game/upstairs-review';
import {worldSeats} from '../src/scene/seating';
import {sceneFloors,interiorVisibility} from '../src/scene/floors';
const scene=c.preAttendanceScene(createWorldScene()),prior=c.preFloorsScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.FLOORS_COMPATIBILITY,previousFloorsSaveCompatibility:c.STAIRS_COMPATIBILITY,previousFloorsContacts:sceneContactData(prior),previousFloorsNavigation:ambientGraph(prior)},old:World={...world,scene:prior,saveCompatibility:c.STAIRS_COMPATIBILITY,previousFloorsSaveCompatibility:undefined};
const account=(s:ReturnType<typeof createCarAtSpawn>,id='regular')=>s.economy!.accounts.find(a=>a.id===id)!;
const tick=(s:ReturnType<typeof createCarAtSpawn>,doc=scene)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc),population:stepAmbient(s,.25,doc)},{},.25,doc);
const run=<T>(steps:Generator<void,T>)=>{let r=steps.next();while(!r.done)r=steps.next();return r.value;};
it('pins r99 and the exact r98 projection without adding resources, actors or rigs',async()=>{
 expect(JSON.parse(c.preAttendanceCompatibilitySource(scene)).simulationVersion).toBe(43);expect(await c.sha256(c.preAttendanceCompatibilitySource(scene))).toBe(c.FLOORS_COMPATIBILITY);expect(await c.sha256(c.preFloorsCompatibilitySource(scene))).toBe(c.STAIRS_COMPATIBILITY);expect(await c.sha256(c.preStairsCompatibilitySource(scene))).toBe(c.REST_COMPATIBILITY);
 expect(scene.objects.length-prior.objects.length).toBe(3);expect(scene.economy!.accounts).toEqual(prior.economy!.accounts);expect(scene.economy!.markets).toEqual(prior.economy!.markets);expect(scene.routes).toEqual(prior.routes);expect(ambientGraph(scene)).toEqual(ambientGraph(prior));
});
it('walks upstairs to rest, saves every travel phase and returns without a teleport or changing scene data',()=>{
 let s=createCarAtSpawn(scene),seen=false,returned=false;const phases=new Set<string>(),snapshot=JSON.stringify(scene);
 for(let i=0;i<2400;i++){s=tick(s);const t=account(s).resting;if(t){if(!phases.has(t.phase) || (t.elevation??0)>8 && (t.elevation??0)<30){const text=encodeSave(s,s.timeS,world);expect(decodeSave(text,world).state).toEqual(JSON.parse(text).state);}phases.add(t.phase);if(t.phase==='sit'){seen=true;expect(t.seat?.objectId).toBe('home_upper_settee');}}else if(seen){returned=true;break;}}
 expect(returned).toBe(true);expect([...phases]).toEqual(['out','sit','home']);expect(account(s).energy).toBeGreaterThan(80);expect(JSON.stringify(scene)).toBe(snapshot);checkEconomyState(s,scene);
});
it('shares the upper settee, releases damage claims and keeps fragments on the retained floor',()=>{
 let s=run(upstairsReviewSteps(createCarAtSpawn(scene),world));s=toggleRide(s,world);expect(s.seated?.objectId).toBe('home_upper_settee');const floor=sceneFloors(scene)[0]!.elevation;
 expect(s.elevation).toBeCloseTo(floor);expect(decodeSave(encodeSave(s,s.timeS,world),world).state.seated).toEqual(s.seated);
 const o=scene.objects.find(o=>o.id==='home_upper_settee')!,below=interiorVisibility(scene,{x:o.x,y:o.y,elevation:2});expect(below.object(o)).toBe(true);expect(interiorVisibility(scene,s).object(o)).toBe(false);
 const distance=Math.hypot(o.x-s.x,o.y-s.y);s={...s,vx:(o.x-s.x)/distance*200,vy:(o.y-s.y)/distance*200};breakOnContact(s,world,o.x,o.y,objectContacts(scene,o));expect(s.broken).toContain(o.id);expect(s.debris.length).toBeGreaterThan(0);s=stepInteractive({...s,vx:0,vy:0},{steer:0,throttle:0},1/120,world);expect(s.seated).toBeUndefined();expect(s.elevation).toBeCloseTo(floor);
 for(const piece of s.debris){piece.vx=0;piece.vy=0;}for(let i=0;i<600;i++)advanceImpactMotion(s,world,1/120,false);expect(s.debris.every(p=>p.elevation>=floor-.05)).toBe(true);
});
it('repairs upstairs with conserved finite supplies and reloads while working there',()=>{
 let s={...createCarAtSpawn(scene),broken:['home_upper_table']},saved=false;const initial=scene.economy!.repairs.find(r=>r.id==='home_furniture')!;
 for(let i=0;i<3000 && (s.broken.length || account(s,'caretaker').repair);i++){s=tick(s);const t=account(s,'caretaker').repair;if(t?.phase==='work' && !saved){expect(t.elevation).toBeGreaterThan(30);s=decodeSave(encodeSave(s,s.timeS,world),world).state;saved=true;}}
 expect(saved).toBe(true);expect(s.broken).toEqual([]);expect(s.economy!.repaired.home_furniture).toBe(1);expect(account(s,'caretaker').completed.repair.home_furniture).toBe(1);expect(initial.take).toBe(1);checkEconomyState(s,scene);
});
it('keeps an old rest commitment and its original save slot before applying the new preference',()=>{
 let s=createCarAtSpawn(prior);for(let i=0;i<2400 && account(s).resting?.phase!=='sit';i++)s=tick(s,prior);expect(account(s).resting?.seat?.objectId).toBe('home_settee');
 const text=encodeSave(s,s.timeS,old),restored=decodeSave(text,world).state;expect(restored).toEqual(JSON.parse(text).state);expect(()=>decodeSave(text,{...world,previousFloorsSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.STAIRS_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(restored);expect(slot.write(restored,s.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});

it('recovers only an old upstairs pose enclosed by new furniture, preserving its floor and ledger',()=>{
 const initial=createCarAtSpawn(prior),o=scene.objects.find(o=>o.id==='home_upper_table')!,s={...initial,control:{kind:'foot' as const},x:o.x,y:o.y,elevation:sceneFloors(scene)[0]!.elevation,vehicles:[{id:null,x:initial.x,y:initial.y,elevation:initial.elevation,headingRad:initial.headingRad,distance:0}]};
 expect(carFootprintClear(bodyWorld(s,old),s.x,s.y,s.elevation,s.timeS,s)).toBe(true);expect(carFootprintClear(bodyWorld(s,world),s.x,s.y,s.elevation,s.timeS,s)).toBe(false);
 const restored=decodeSave(encodeSave(s,s.timeS,old),world).state;expect(restored.elevation).toBeCloseTo(s.elevation);expect(Math.hypot(restored.x-s.x,restored.y-s.y)).toBeLessThanOrEqual(32);expect(carFootprintClear(bodyWorld(restored,world),restored.x,restored.y,restored.elevation,restored.timeS,restored)).toBe(true);expect(restored.economy).toEqual(s.economy);expect(restored.timeS).toBe(s.timeS);
});

it('reaches the upstairs table by ordinary walking and breaks it with the shared on-foot strike',()=>{
 let s=run(upstairsReviewSteps(createCarAtSpawn(scene),world,false,true));s=stepInteractive(s,{steer:0,throttle:0,strikePressed:true},1/120,world);expect(s.broken).toContain('home_upper_table');checkEconomyState(s,scene);
});
