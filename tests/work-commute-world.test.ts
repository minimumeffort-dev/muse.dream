import {afterAll,it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {commuteArea} from '../src/sim/courier';
import {actorPose} from '../src/sim/actors';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {homeMealReviewSteps} from '../src/game/home-review';
import {workCommuteReviewSteps} from '../src/game/work-commute-review';
const scene=createWorldScene(),snapshot=JSON.stringify(scene),prior=c.preWorkCommuteScene(scene);
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.WORK_COMMUTE_COMPATIBILITY,previousWorkCommuteSaveCompatibility:c.HOME_MEALS_COMPATIBILITY};
const old:World={...world,scene:prior,saveCompatibility:c.HOME_MEALS_COMPATIBILITY,previousWorkCommuteSaveCompatibility:undefined};
const regular=(s:ReturnType<typeof createCarAtSpawn>)=>s.economy!.accounts.find(a=>a.id==='regular')!;
afterAll(()=>expect(JSON.stringify(scene)).toBe(snapshot));
it('pins r95 exactly while declaring resident work without new geometry, people or money',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(40);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.WORK_COMMUTE_COMPATIBILITY);expect(await c.sha256(c.preWorkCommuteCompatibilitySource(scene))).toBe(c.HOME_MEALS_COMPATIBILITY);expect(await c.sha256(c.preHomeMealsCompatibilitySource(scene))).toBe(c.HOME_INTERIOR_COMPATIBILITY);
 expect(scene.objects).toEqual(prior.objects);expect(scene.routes).toEqual(prior.routes);expect(scene.economy!.markets).toEqual(prior.economy!.markets);expect(commuteArea(scene,scene.economy!.accounts.find(a=>a.id==='regular')!)).toMatchObject({radius:4.1,height:18});
});
it('connects an actual meal, purchased demand, doorway/street travel, paid work and a continuous return',()=>{
 const steps=workCommuteReviewSteps(createCarAtSpawn(scene),world);let r=steps.next();while(!r.done)r=steps.next();let s=r.value;
 expect(regular(s).commute?.phase).toBe('work');expect(regular(s).work?.id).toBe('bake');expect(s.economy!.consumed.lunch).toBe(1);expect(regular(s).credits).toBe(22);checkEconomyState(s,scene);
 const home=regular(s).commute!.home,original=s,job=scene.economy!.jobs.find(j=>j.id==='bake')!,before=regular(s).completed.work.bake!,text=encodeSave(s,s.timeS,world);let replay=decodeSave(text,world).state;
 for(let i=0;i<120*180 && regular(s).commute;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);}
 expect(replay).toEqual(s);expect(regular(s).commute).toBeUndefined();expect(regular(s).credits).toBe(22+job.pay);expect(regular(s).completed.work.bake).toBe(before+1);expect(regular(original).credits).toBe(22);const pose=actorPose(scene,scene.objects.find(o=>o.id==='market_commuter')!,s.timeS,s);expect(Math.hypot(pose.x-home.x,pose.y-home.y)).toBeLessThan(.01);checkEconomyState(s,scene);
});
it('keeps an r95 occupied home meal exact and retains its old slot without seeding work or wages',()=>{
 const steps=homeMealReviewSteps(createCarAtSpawn(prior),old);let r=steps.next();while(!r.done)r=steps.next();const s=r.value,text=encodeSave(s,s.timeS,old),loaded=decodeSave(text,world);
 expect(loaded.state).toEqual(JSON.parse(text).state);expect(loaded.migrated).toBe(true);expect(regular(loaded.state).commute).toBeUndefined();expect(regular(loaded.state).credits).toBe(22);expect(()=>decodeSave(text,{...world,previousWorkCommuteSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.HOME_MEALS_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,s.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
