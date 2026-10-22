import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stationReviewSteps} from '../src/game/station-review';
import {repairReviewSteps} from '../src/game/review-start';
import {stepInteractive} from '../src/sim/interaction';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
const scene=createWorldScene(),prior=c.preGestureScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.GESTURE_COMPATIBILITY,previousGestureSaveCompatibility:c.STATION_COMPATIBILITY},old={...world,scene:prior,saveCompatibility:c.STATION_COMPATIBILITY,previousGestureSaveCompatibility:undefined};
const run=<T>(g:Generator<void,T>)=>{let r=g.next();while(!r.done)r=g.next();return r.value;};
it('registers only visual metadata over exact r103, preserving the earlier world projections and all physical resources',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(47);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.GESTURE_COMPATIBILITY);expect(await c.sha256(c.preGestureCompatibilitySource(scene))).toBe(c.STATION_COMPATIBILITY);expect(await c.sha256(c.preStationCompatibilitySource(scene))).toBe(c.BOND_COMPATIBILITY);
 expect(scene.objects).toBe(prior.objects);expect(scene.terrain).toBe(prior.terrain);expect(scene.economy!.accounts).toBe(prior.economy!.accounts);expect(scene.economy!.markets).toBe(prior.economy!.markets);expect(scene.economy!.gestures).toHaveLength(5);expect(scene.economy!.jobs.map(j=>j.gesture)).toEqual(['kneading','kneading','folding','fastening','tending']);expect(scene.economy!.repairs.filter(r=>r.gesture)).toHaveLength(4);
});
it.each(['job','repair'] as const)('preserves every saved field and pending %s through the registered visual upgrade',kind=>{
 const initial=createCarAtSpawn(prior);let s:CarState=kind==='job' ? run(stationReviewSteps(initial,old,'work')) : run(repairReviewSteps(initial,old,'school-bench','work'));
 const text=encodeSave(s,s.timeS,old),result=decodeSave(text,world);expect(result.migrated).toBe(true);expect(result.state).toEqual(JSON.parse(text).state);expect(result.worldTime).toBe(s.timeS);
 let replay=result.state;for(let i=0;i<120*8;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,old);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);}expect(replay).toEqual(s);
 expect(()=>decodeSave(text,{...world,previousGestureSaveCompatibility:undefined})).toThrow('different world');expect(()=>decodeSave(text,{...world,saveCompatibility:'unregistered'})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.STATION_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(result.state);expect(slot.write(result.state,result.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
