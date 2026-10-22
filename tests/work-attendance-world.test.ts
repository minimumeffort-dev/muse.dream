import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {stepInteractive} from '../src/sim/interaction';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {workCommuteReviewSteps} from '../src/game/work-commute-review';
import {attendanceReviewSteps} from '../src/game/attendance-review';
import {attendanceEnd} from '../src/sim/attendance';
const scene=c.preShelterScene(createWorldScene()),prior=c.preAttendanceScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.ATTENDANCE_COMPATIBILITY,previousAttendanceSaveCompatibility:c.FLOORS_COMPATIBILITY},old:World={...world,scene:prior,saveCompatibility:c.FLOORS_COMPATIBILITY,previousAttendanceSaveCompatibility:undefined};
const worker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!,run=<T>(steps:Generator<void,T>)=>{let r=steps.next();while(!r.done)r=steps.next();return r.value;};
it('pins r100 and the exact r99 projection with identical geometry, resources and public graph',async()=>{
 expect(JSON.parse(c.preShelterCompatibilitySource(scene)).simulationVersion).toBe(44);expect(await c.sha256(c.preShelterCompatibilitySource(scene))).toBe(c.ATTENDANCE_COMPATIBILITY);expect(await c.sha256(c.preAttendanceCompatibilitySource(scene))).toBe(c.FLOORS_COMPATIBILITY);expect(await c.sha256(c.preFloorsCompatibilitySource(scene))).toBe(c.STAIRS_COMPATIBILITY);
 expect(scene.objects).toBe(prior.objects);expect(scene.routes).toBe(prior.routes);expect(scene.floors).toBe(prior.floors);expect(scene.economy!.markets).toEqual(prior.economy!.markets);expect(ambientGraph(scene)).toEqual(ambientGraph(prior));
});
it('connects a real meal, upstairs rest, attendance, purchased demand and one paid batch past its closing time',()=>{
 let s=run(attendanceReviewSteps(createCarAtSpawn(scene),world,'closing')),t=worker(s).commute!,end=attendanceEnd(scene,[6,20],t.dutyAtS!);expect(t.phase).toBe('work');expect(worker(s).work!.doneAtS).toBeGreaterThan(end);expect(s.economy!.consumed.lunch).toBe(1);expect(worker(s).energy).toBeGreaterThan(60);
 const before=worker(s).credits,finished=worker(s).completed.work.bake!,text=encodeSave(s,s.timeS,world);let replay=decodeSave(text,world).state;
 for(let i=0;i<120*120 && worker(s).commute;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);}
 expect(worker(s).commute).toBeUndefined();expect(worker(s).credits).toBe(before+3);expect(worker(s).completed.work.bake).toBe(finished+1);expect(s.economy).toEqual(replay.economy);expect(s.npcs).toEqual(replay.npcs);checkEconomyState(s,scene);
});
it('preserves an old upstairs rest commitment and original save slot without seeding attendance or wages',()=>{
 let s=createCarAtSpawn(prior);for(let i=0;i<2400 && worker(s).resting?.phase!=='sit';i++)s=stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,prior),population:stepAmbient(s,.25,prior)},{},.25,prior);
 expect(worker(s).resting?.seat?.objectId).toBe('home_upper_settee');const text=encodeSave(s,s.timeS,old),restored=decodeSave(text,world).state;expect(restored).toEqual(JSON.parse(text).state);expect(worker(restored).commute).toBeUndefined();expect(()=>decodeSave(text,{...world,previousAttendanceSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.FLOORS_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(restored);expect(slot.write(restored,s.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});

it('finishes an old one-batch commute before new attendance decisions without changing reserved resources',()=>{
 let s=run(workCommuteReviewSteps(createCarAtSpawn(prior),old));expect(worker(s).commute?.phase).toBe('work');expect(worker(s).commute?.dutyAtS).toBeUndefined();const before=worker(s).credits,completed=worker(s).completed.work.bake!,text=encodeSave(s,s.timeS,old),restored=decodeSave(text,world).state;expect(restored).toEqual(JSON.parse(text).state);s=restored;
 for(let i=0;i<120*120 && worker(s).commute?.dutyAtS===undefined && worker(s).commute;i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,world);expect(worker(s).credits).toBe(before+3);expect(worker(s).completed.work.bake).toBe(completed+1);checkEconomyState(s,scene);
});
