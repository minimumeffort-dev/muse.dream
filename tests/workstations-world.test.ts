import {bondReviewSteps} from '../src/game/bond-review';
import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {workstations} from '../src/scene/workstations';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stationReviewSteps} from '../src/game/station-review';
import {npcReviewStart} from '../src/game/review-start';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {actorPose} from '../src/sim/actors';
import {nearbyNpc,npcSpeech} from '../src/sim/npcs';
const scene=c.preGestureScene(createWorldScene()),previous=c.preStationScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.STATION_COMPATIBILITY,previousStationSaveCompatibility:c.BOND_COMPATIBILITY},old={...world,scene:previous,saveCompatibility:c.BOND_COMPATIBILITY,previousStationSaveCompatibility:undefined};
const run=<T>(g:Generator<void,T>)=>{let r=g.next();while(!r.done)r=g.next();return r.value;},pocket=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='pocket')!;
it('registers exact r102 and earlier fingerprints without changing geometry or initial resources',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(47);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.STATION_COMPATIBILITY);expect(await c.sha256(c.preStationCompatibilitySource(scene))).toBe(c.BOND_COMPATIBILITY);expect(await c.sha256(c.preBondCompatibilitySource(scene))).toBe(c.SHELTER_COMPATIBILITY);
 expect(scene.objects).toBe(previous.objects);expect(scene.terrain).toBe(previous.terrain);expect(scene.economy!.accounts).toBe(previous.economy!.accounts);expect(scene.economy!.markets).toBe(previous.economy!.markets);expect(scene.economy!.jobs.every(j=>j.station==='bakery_prep')).toBe(true);
});
it('walks the real player to the fitted table, keeps the position through a pending save and pays one batch',()=>{
 const snapshot=JSON.stringify(scene);let s=run(stationReviewSteps(createCarAtSpawn(scene),world));const station=workstations(scene)[0]!;expect(Math.hypot(s.x-station.x,s.y-station.y)).toBeLessThan(.5);
 for(let i=0;i<240;i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,world);expect(Math.hypot(s.x-station.x,s.y-station.y)).toBeLessThan(.5);
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'work',job:'bake'}},1/120,world);expect(pocket(s).work?.id).toBe('bake');const packet=encodeSave(s,s.timeS,world);let replay=decodeSave(packet,world).state;
 for(let i=0;i<120*8;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);}expect(replay).toEqual(s);expect(pocket(s).credits).toBe(23);expect(pocket(s).completed.work.bake).toBe(1);checkEconomyState(s,scene);expect(JSON.stringify(scene)).toBe(snapshot);
});
it('walks the existing baker to the station without teleporting, extra stock or an added rig',()=>{
 const s=run(stationReviewSteps(createCarAtSpawn(scene),world,'npc')),a=s.economy!.accounts.find(a=>a.id==='baker')!,station=workstations(scene)[0]!;
 expect(a.commute?.phase).toBe('work');expect(a.commute!.distance).toBeGreaterThan(20);expect(Math.hypot(a.commute!.x-station.x,a.commute!.y-station.y)).toBeLessThan(.1);expect(a.credits).toBe(0);expect(a.work?.id).toBe('pack_lunch');checkEconomyState(s,scene);expect(decodeSave(encodeSave(s,s.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(s)));
 expect(nearbyNpc(s,scene)?.id).toBe('vendor');const previous=s.npcs.find(n=>n.id==='vendor')!,pose=actorPose(scene,scene.objects.find(o=>o.id==='vendor')!,s.timeS,s),talked=stepInteractive(s,{steer:0,throttle:0,talkPressed:true},1/120,world),clock=talked.npcs.find(n=>n.id==='vendor')!;
 expect(clock.known).toBe(true);expect(clock.routeTimeS).toBe(previous.routeTimeS);expect(clock.animationTimeS).toBe(previous.animationTimeS);expect(talked.economy!.accounts.find(a=>a.id==='baker')!.work).toEqual(a.work);expect(npcSpeech(talked,scene)?.npcId).toBe('vendor');
 const after=actorPose(scene,scene.objects.find(o=>o.id==='vendor')!,talked.timeS,talked);expect([after.x,after.y,after.headingRad]).toEqual([pose.x,pose.y,pose.headingRad]);checkEconomyState(talked,scene);
});
it('refunds only incompatible r102 batches once and keeps the source slot, pose, clocks and personal history',()=>{
 let s=npcReviewStart(createCarAtSpawn(previous),old,'vendor');s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'work',job:'bake'}},1/120,old);expect(pocket(s).work).toBeDefined();
 const packet=encodeSave(s,41,old),before=JSON.stringify(s),result=decodeSave(packet,world),r=result.state;expect(JSON.stringify(s)).toBe(before);expect(result.migrated).toBe(true);expect(result.worldTime).toBe(41);expect(r.timeS).toBe(s.timeS);expect([r.x,r.y,r.elevation]).toEqual([s.x,s.y,s.elevation]);expect(pocket(r).work).toBeUndefined();expect(pocket(r).credits).toBe(pocket(s).credits);expect(pocket(r).completed).toEqual(pocket(s).completed);expect(r.npcs).toEqual(s.npcs);expect(r.economy!.events.some(e=>e.kind==='cancel' && e.reason==='station')).toBe(true);checkEconomyState(r,scene);
 const text=encodeSave(r,41,world);expect(decodeSave(text,world).state).toEqual(JSON.parse(text).state);expect(()=>decodeSave(packet,{...world,previousStationSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.BOND_COMPATIBILITY}`,rows=new Map([[key,packet]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(r);expect(slot.write(r,41)).toBe(true);expect(rows.get(key)).toBe(packet);expect(rows.size).toBe(2);
});

it('retains the live shared-meal recipe route with the new physical station and no seeded qualification',()=>{
 const s=run(bondReviewSteps(createCarAtSpawn(scene),world,'paid'));expect(pocket(s).credits).toBe(15);expect(pocket(s).completed.work.bake).toBe(0);expect(pocket(s).completed.work.large_bake).toBe(1);expect(s.economy!.socialHistory!.baker!.meals).toBe(1);checkEconomyState(s,scene);
});
