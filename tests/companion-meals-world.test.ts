import {gameSave} from '../src/game/save';
import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {companionReviewSteps} from '../src/game/companion-review';
import {sharedMealReviewSteps} from '../src/game/review-start';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {encodeSave,decodeSave} from '../src/sim/save';
import {worldSeats} from '../src/scene/seating';
const scene=createWorldScene(),previous=c.preCompanionScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.COMPANION_COMPATIBILITY,previousCompanionSaveCompatibility:c.GESTURE_COMPATIBILITY},old={...world,scene:previous,saveCompatibility:c.GESTURE_COMPATIBILITY,previousCompanionSaveCompatibility:undefined};
const run=async<T>(g:Generator<unknown,T>)=>{let r=g.next(),n=0;while(!r.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));r=g.next();}return r.value;};
it('registers exact r104 with unchanged mesh/body/resources and two standard bench seats 84cm apart',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(48);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.COMPANION_COMPATIBILITY);expect(await c.sha256(c.preCompanionCompatibilitySource(scene))).toBe(c.GESTURE_COMPATIBILITY);expect(await c.sha256(c.preGestureCompatibilitySource(scene))).toBe(c.STATION_COMPATIBILITY);
 expect(scene.objects).toHaveLength(previous.objects.length);for(let i=0;i<scene.objects.length;i++){const a=scene.objects[i]!.spec,b=previous.objects[i]!.spec;expect(a && 'parts' in a ? a.parts : a).toBe(b && 'parts' in b ? b.parts : b);}
 expect(scene.economy!.markets).toBe(previous.economy!.markets);expect(scene.economy!.accounts).toBe(previous.economy!.accounts);const seats=worldSeats(scene).filter(s=>s.objectId==='hall_bench');expect(Math.hypot(seats[0]!.x-seats[1]!.x,seats[0]!.y-seats[1]!.y)).toBeCloseTo(8.4);
});
it('earns real wages, buys food and completes a resident meeting without touching the player or their relationship credit',async()=>{
 const snapshot=JSON.stringify(scene);let s=await run(companionReviewSteps(createCarAtSpawn(scene),world,'eat'));const guest=s.economy!.gathering!.guest;expect(['caretaker','regular']).toContain(guest);expect(s.economy!.gathering).toMatchObject({host:'baker',phase:'eat',portions:2});expect(s.economy!.accounts.find(a=>a.id==='baker')!.completed.work.pack_lunch!+s.economy!.accounts.find(a=>a.id==='baker')!.completed.work.bake!).toBeGreaterThan(0);expect(s.npcs.some(n=>n.known)).toBe(false);
 let restored=decodeSave(encodeSave(s,s.timeS,world),world).state;for(let i=0;i<120*60;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);restored=stepInteractive(restored,{steer:0,throttle:0},1/120,world);}expect(restored).toEqual(s);expect(s.economy!.gathering).toBeUndefined();expect(s.economy!.peerHistory?.[`hall_break/baker/${guest}`]?.meals).toBe(1);expect(s.economy!.socialHistory).toBeUndefined();expect(s.economy!.accounts.find(a=>a.id==='pocket')!.credits).toBe(20);checkEconomyState(s,scene);expect(JSON.stringify(scene)).toBe(snapshot);
},60000);
it('upgrades a pending r104 shared meal onto the moved anchors without advancing its timer, food or history',async()=>{
 let s=await run(sharedMealReviewSteps(createCarAtSpawn(previous),old,true));
 const invited=decodeSave(encodeSave(s,s.timeS,old),world).state;expect(invited.economy!.invitation).toEqual(s.economy!.invitation);expect(Math.hypot(invited.x-s.x,invited.y-s.y)).toBeCloseTo(.3);
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'accept_share',partner:'baker'}},1/120,old);
 const outbound=decodeSave(encodeSave(s,s.timeS,old),world).state;expect(outbound.economy!.shared!.phase).toBe('out');expect([outbound.economy!.shared!.x,outbound.economy!.shared!.y]).toEqual([s.economy!.shared!.x,s.economy!.shared!.y]);expect(outbound.economy!.shared!.path).toEqual([]);expect(Math.hypot(outbound.economy!.shared!.at.x-s.economy!.shared!.at.x,outbound.economy!.shared!.at.y-s.economy!.shared!.at.y)).toBeCloseTo(.3);
 for(let i=0;i<120*30 && s.economy!.shared?.phase!=='eat';i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,old);expect(s.economy!.shared?.phase).toBe('eat');
 const text=encodeSave(s,s.timeS,old),result=decodeSave(text,world),r=result.state;expect(result.migrated).toBe(true);expect(r.timeS).toBe(s.timeS);expect(r.economy!.shared!.eatUntilS).toBe(s.economy!.shared!.eatUntilS);expect(r.economy!.shared!.portions).toBe(2);expect(r.economy!.consumed).toEqual(s.economy!.consumed);expect(r.economy!.peerHistory).toBeUndefined();expect(Math.hypot(r.x-s.x,r.y-s.y)).toBeCloseTo(.3);checkEconomyState(r,scene);
 expect(()=>decodeSave(text,{...world,previousCompanionSaveCompatibility:undefined})).toThrow('different world');expect(decodeSave(encodeSave(r,r.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(r)));
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.GESTURE_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(r);expect(slot.write(r,r.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
