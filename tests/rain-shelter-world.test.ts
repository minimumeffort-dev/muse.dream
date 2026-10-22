import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {shelterReviewSteps} from '../src/game/shelter-review';
import {attendanceReviewSteps} from '../src/game/attendance-review';
import {sampleWeather} from '../src/scene/weather';
import {sheltered} from '../src/sim/shelter';
import {actorPose} from '../src/sim/actors';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
const scene=c.preBondScene(createWorldScene()),prior=c.preShelterScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.SHELTER_COMPATIBILITY,previousShelterSaveCompatibility:c.ATTENDANCE_COMPATIBILITY},old:World={...world,scene:prior,saveCompatibility:c.ATTENDANCE_COMPATIBILITY,previousShelterSaveCompatibility:undefined};
const worker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!,run=<T>(steps:Generator<void,T>)=>{let r=steps.next();while(!r.done)r=steps.next();return r.value;};
it('pins r101 and exact r100 while retaining physical objects, resources and the daylight clock',async()=>{
 expect(JSON.parse(c.preBondCompatibilitySource(scene)).simulationVersion).toBe(45);expect(await c.sha256(c.preBondCompatibilitySource(scene))).toBe(c.SHELTER_COMPATIBILITY);expect(await c.sha256(c.preShelterCompatibilitySource(scene))).toBe(c.ATTENDANCE_COMPATIBILITY);expect(await c.sha256(c.preAttendanceCompatibilitySource(scene))).toBe(c.FLOORS_COMPATIBILITY);
 expect(prior.weather!.cycleSeconds).toBe(600);expect(scene.weather!.cycleSeconds).toBe(360);expect(scene.objects).toBe(prior.objects);expect(scene.routes).toBe(prior.routes);expect(scene.terrain).toBe(prior.terrain);expect(scene.daylight).toBe(prior.daylight);expect(scene.economy!.markets).toEqual(prior.economy!.markets);
});
it('takes a healthy off-duty resident upstairs through rain, keeps a single claim and replays the return',()=>{
 let s=run(shelterReviewSteps(createCarAtSpawn(scene),world,'out'));expect(worker(s).energy).toBeGreaterThan(25);expect(sampleWeather(scene.weather,s.timeS).raining).toBe(true);const before=worker(s).credits,seen=new Set<string>(),source=JSON.stringify(scene);
 let replay:CarState|undefined;
 for(let i=0;i<120*150 && worker(s).resting;i++){
  const t=worker(s).resting!;if(!seen.has(t.phase)){seen.add(t.phase);const text=encodeSave(s,s.timeS,world);expect(decodeSave(text,world).state).toEqual(JSON.parse(text).state);checkEconomyState(s,scene);}
  if(t.phase==='sit'){const pose=actorPose(scene,scene.objects.find(o=>o.id==='market_commuter')!,s.timeS,s);expect(pose.elevation).toBeGreaterThan(30);expect(sheltered(scene,pose,4,18,s)).toBe(true);if(s.timeS<510)expect(sampleWeather(scene.weather,s.timeS).raining).toBe(true);if(!replay)replay=decodeSave(encodeSave(s,s.timeS,world),world).state;}
  s=stepInteractive(s,{steer:0,throttle:0},1/120,world);if(replay)replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);
 }
 expect([...seen].sort()).toEqual(['home','out','sit']);expect(worker(s).resting).toBeUndefined();expect(worker(s).credits).toBe(before);expect(s.economy).toEqual(replay!.economy);expect(s.npcs).toEqual(replay!.npcs);expect(JSON.stringify(scene)).toBe(source);
});
it('restores old r100 upstairs claims and ledgers exactly and retains the original storage slot',()=>{
 let s=createCarAtSpawn(prior);for(let i=0;i<120*240 && worker(s).resting?.phase!=='sit';i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,old);expect(worker(s).resting?.seat?.objectId).toBe('home_upper_settee');
 const text=encodeSave(s,s.timeS,old),restored=decodeSave(text,world).state;expect(restored).toEqual(JSON.parse(text).state);expect(()=>decodeSave(text,{...world,previousShelterSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.ATTENDANCE_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(restored);expect(slot.write(restored,s.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
it('preserves an r100 paid batch and pays its original reserved wage once under the new policy',()=>{
 const s=run(attendanceReviewSteps(createCarAtSpawn(prior),old,'closing')),text=encodeSave(s,s.timeS,old);let restored=decodeSave(text,world).state;expect(restored).toEqual(JSON.parse(text).state);const before=worker(s).credits,done=worker(s).completed.work.bake!;
 for(let i=0;i<120*15 && worker(restored).work;i++)restored=stepInteractive(restored,{steer:0,throttle:0},1/120,world);expect(worker(restored).credits).toBe(before+3);expect(worker(restored).completed.work.bake).toBe(done+1);checkEconomyState(restored,scene);
});
