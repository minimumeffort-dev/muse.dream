import {it,expect} from 'vitest';
import backup from './fixtures/upstairs-social-r109-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {companionReviewSteps} from '../src/game/companion-review';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {actorPose} from '../src/sim/actors';
const scene=c.preDistrictScene(createWorldScene()),prior=c.preUpstairsSocialScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.UPSTAIRS_SOCIAL_COMPATIBILITY,previousUpstairsSocialSaveCompatibility:c.SEATED_REST_COMPATIBILITY,previousSeatedRestSaveCompatibility:c.COMPANY_COMPATIBILITY},text=JSON.stringify(backup);
it('pins exact r109, preserving the city geometry, resources, contacts and public pedestrian graph',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(53);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.UPSTAIRS_SOCIAL_COMPATIBILITY);expect(await c.sha256(c.preUpstairsSocialCompatibilitySource(scene))).toBe(c.SEATED_REST_COMPATIBILITY);expect(await c.sha256(c.preSeatedRestCompatibilitySource(scene))).toBe(c.COMPANY_COMPATIBILITY);expect(await c.sha256(c.preCompanyCompatibilitySource(scene))).toBe(c.LOFT_COMPATIBILITY);
 expect(scene.objects).toEqual(prior.objects);expect(scene.economy!.accounts).toEqual(prior.economy!.accounts);expect(scene.economy!.markets).toEqual(prior.economy!.markets);expect(sceneContactData(scene)).toEqual(sceneContactData(prior));expect(ambientGraph(scene)).toEqual(ambientGraph(prior));
});
it('retains every field and original slot from the actual r109 native browser backup',()=>{
 const loaded=decodeSave(text,world);expect(loaded.migrated).toBe(true);expect(loaded.state).toEqual(backup.state);expect(loaded.worldTime).toBe(backup.worldTime);expect(()=>decodeSave(text,{...world,previousUpstairsSocialSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.SEATED_REST_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(backup.state);expect(slot.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
});
it('connects the real baker and commuter to upstairs seats through ordinary fixed ticks, reload and a physical return',async()=>{
 const snapshot=JSON.stringify(scene),steps=companionReviewSteps(createCarAtSpawn(scene),world,'eat');let result=steps.next(),n=0;while(!result.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));result=steps.next();}let s=result.value;const t=s.economy!.gathering!;expect(t.hostTrip.seat.objectId).toBe('home_upper_settee');expect(t.guestTrip.seat.objectId).toBe('home_upper_settee');expect(t.hostTrip.elevation).toBeGreaterThan(20);expect(t.guestTrip.elevation).toBeGreaterThan(20);
 const host=s.economy!.accounts.find(a=>a.id===t.host)!,credits=host.credits,history=s.economy!.peerHistory?.[`hall_break/${t.host}/${t.guest}`]?.meals??0,consumed=s.economy!.consumed.bread!;let copy=decodeSave(encodeSave(s,s.timeS,world),world).state;
 for(let i=0;i<120*10;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);copy=stepInteractive(copy,{steer:0,throttle:0},1/120,world);}expect(copy).toEqual(s);expect(s.economy!.gathering?.phase).toBe('home');expect(s.economy!.consumed.bread).toBe(consumed+2);expect(s.economy!.peerHistory?.[`hall_break/${t.host}/${t.guest}`]?.meals).toBe(history+1);expect(s.economy!.accounts.find(a=>a.id===t.host)!.credits).toBe(credits);
 for(let i=0;i<120*120 && s.economy!.gathering;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);if(i%1200===0)await new Promise(resolve=>setTimeout(resolve,0));}expect(s.economy!.gathering).toBeUndefined();const baker=scene.objects.find(o=>o.id==='vendor')!;expect(actorPose(scene,baker,s.timeS,s).elevation).toBeLessThan(20);checkEconomyState(s,scene);expect(JSON.stringify(scene)).toBe(snapshot);
},60000);

it('keeps an old in-progress downstairs meal on its original seats instead of retargeting it upstairs',async()=>{
 const oldWorld={...world,scene:prior,saveCompatibility:c.SEATED_REST_COMPATIBILITY},steps=companionReviewSteps(createCarAtSpawn(prior),oldWorld,'out');let result=steps.next(),n=0;while(!result.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));result=steps.next();}
 const state=result.value,t=state.economy!.gathering!;expect(t.hostTrip.seat.objectId).toBe('hall_bench');
 // r109's ordinary ground journeys did not serialize optional layer fields.
 for(const trip of [t.hostTrip,t.guestTrip]){expect(trip.elevation).toBeLessThan(20);delete trip.elevation;delete trip.home.elevation;}
 const text=encodeSave(state,state.timeS,oldWorld),loaded=decodeSave(text,world);expect(loaded.migrated).toBe(true);expect(loaded.state).toEqual(state);expect(loaded.state.economy!.gathering!.hostTrip.seat.objectId).toBe('hall_bench');expect(loaded.state.economy!.gathering!.portions).toBe(2);checkEconomyState(loaded.state,scene);
},60000);
