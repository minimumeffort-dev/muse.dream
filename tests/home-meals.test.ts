import {afterAll,it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {occupiedInterior} from '../src/scene/interiors';
import {actorPose} from '../src/sim/actors';
import {seatClaimed} from '../src/sim/seating';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {homeMealReviewSteps} from '../src/game/home-review';
const scene=c.preWorkCommuteScene(createWorldScene()),snapshot=JSON.stringify(scene),prior=c.preHomeMealsScene(scene);
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.HOME_MEALS_COMPATIBILITY,previousHomeMealsSaveCompatibility:c.HOME_INTERIOR_COMPATIBILITY};
const old:World={...world,scene:prior,saveCompatibility:c.HOME_INTERIOR_COMPATIBILITY,previousHomeMealsSaveCompatibility:undefined};
const diner=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!;
const tick=(s:CarState,w=world)=>stepInteractive(s,{steer:0,throttle:0},1/120,w);
const quarter=(s:CarState,w:World)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,w.scene),population:stepAmbient(s,.25,w.scene)},{},.25,w.scene);
afterAll(()=>expect(JSON.stringify(scene)).toBe(snapshot));
it('pins r94 exactly while adding preferred home seating and a clear NPC approach',async()=>{
 expect(await c.sha256(c.preWorkCommuteCompatibilitySource(scene))).toBe(c.HOME_MEALS_COMPATIBILITY);expect(await c.sha256(c.preHomeMealsCompatibilitySource(scene))).toBe(c.HOME_INTERIOR_COMPATIBILITY);expect(await c.sha256(c.preHomeInteriorCompatibilitySource(scene))).toBe(c.WEATHER_COMPATIBILITY);
 expect(scene.routes).toEqual(prior.routes);expect(scene.economy!.accounts).toEqual(prior.economy!.accounts);expect(scene.objects).toHaveLength(prior.objects.length);expect(scene.economy!.meals.find(m=>m.id==='market_break')!.seats).toEqual(['home_settee','hall_bench']);
});
it('buys lunch, walks through the home doorway and shares separate cushions with the player',()=>{
 const steps=homeMealReviewSteps(createCarAtSpawn(scene),world);let r=steps.next();while(!r.done)r=steps.next();let s=r.value;
 const meal=diner(s).meal!;expect(meal.phase).toBe('eat');expect(meal.seat).toEqual({objectId:'home_settee',seatId:'right'});expect(s.seated).toEqual({objectId:'home_settee',seatId:'left'});expect(seatClaimed(s,meal.seat!)).toBe(true);
 const actor=scene.objects.find(o=>o.id==='market_commuter')!,pose=actorPose(scene,actor,s.timeS,s);expect(occupiedInterior(scene,pose.x,pose.y,pose.elevation)?.object.id).toBe('oldtown_044');expect(pose.seatHeight).toBeGreaterThan(3);expect(diner(s).credits).toBe(22);expect(diner(s).inventory.lunch).toBe(1);expect(s.economy!.consumed.lunch).toBe(0);checkEconomyState(s,scene);
 const text=encodeSave(s,s.timeS,world),restored=decodeSave(text,world).state;expect(restored).toEqual(JSON.parse(text).state);expect(resetCar(s,scene).economy).toEqual(s.economy);
 let replay=restored;for(let i=0;i<120*30 && diner(s).meal;i++){s=tick(s);replay=tick(replay);}
 expect(replay).toEqual(s);expect(diner(s).meal).toBeUndefined();expect(diner(s).credits).toBe(22);expect(diner(s).inventory.lunch).toBe(0);expect(s.economy!.consumed.lunch).toBe(1);expect(s.seated).toEqual({objectId:'home_settee',seatId:'left'});checkEconomyState(s,scene);
});
it('keeps old reserved hall meals, their money, food and timers exactly through upgrade and storage',()=>{
 let s=createCarAtSpawn(prior);for(let i=0;i<600 && diner(s).meal?.phase!=='seat';i++)s=quarter(s,old);
 expect(diner(s).meal?.seat?.objectId).toBe('hall_bench');expect(diner(s).meal?.phase).toBe('seat');
 for(const phase of ['seat','eat'] as const){
  if(phase==='eat')for(let i=0;i<200 && diner(s).meal?.phase!=='eat';i++)s=quarter(s,old);
  expect(diner(s).meal?.phase).toBe(phase);const text=encodeSave(s,s.timeS,old),loaded=decodeSave(text,world);expect(loaded.migrated).toBe(true);expect(loaded.state).toEqual(JSON.parse(text).state);expect(decodeSave(encodeSave(loaded.state,s.timeS,world),world).state).toEqual(loaded.state);
  expect(()=>decodeSave(text,{...world,previousHomeMealsSaveCompatibility:undefined})).toThrow('different world');
  const key=`muse-dream.save.v19.${scene.sceneId}.${c.HOME_INTERIOR_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,s.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 }
 const credits=diner(s).credits;let next=decodeSave(encodeSave(s,s.timeS,old),world).state;for(let i=0;i<400 && diner(next).meal;i++)next=quarter(next,world);expect(diner(next).meal).toBeUndefined();expect(diner(next).credits).toBe(credits);expect(diner(next).inventory.lunch).toBe(0);expect(next.economy!.consumed.lunch).toBe(1);checkEconomyState(next,scene);
});
