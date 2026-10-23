import {it,expect} from 'vitest';
import backup from './fixtures/seated-rest-r108-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,resetCar,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {companionReviewSteps} from '../src/game/companion-review';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
const scene=createWorldScene(),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.SEATED_REST_COMPATIBILITY,previousSeatedRestSaveCompatibility:c.COMPANY_COMPATIBILITY},text=JSON.stringify(backup);
it('pins the rules-only upgrade to exact r108 geometry and policies',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(52);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.SEATED_REST_COMPATIBILITY);expect(await c.sha256(c.preSeatedRestCompatibilitySource(scene))).toBe(c.COMPANY_COMPATIBILITY);expect(await c.sha256(c.preCompanyCompatibilitySource(scene))).toBe(c.LOFT_COMPATIBILITY);expect(backup.compatibilityHash).toBe(c.COMPANY_COMPATIBILITY);
});
it('preserves every field of the actual r108 browser backup and its original storage slot without catch-up',()=>{
 const loaded=decodeSave(text,world);expect(loaded.migrated).toBe(true);expect(loaded.state).toEqual(backup.state);expect(loaded.worldTime).toBe(backup.worldTime);expect(()=>decodeSave(text,{...world,previousSeatedRestSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.COMPANY_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(backup.state);expect(slot.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
 const forged=JSON.parse(text);forged.state.economy.accounts.find((a:{id:string})=>a.id==='regular').energy=101;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('not a supported Muse Dream backup');
});
it('recovers the real commuter while sharing a paid meal, preserves the pending activity through reload and resumes identically',async()=>{
 const snapshot=JSON.stringify(scene),steps=companionReviewSteps(createCarAtSpawn(scene),world,'eat');let result=steps.next(),n=0;while(!result.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));result=steps.next();}let s=result.value;const guest=s.economy!.accounts.find(a=>a.id==='regular')!,energy=guest.energy!,company=guest.company!,credits=guest.credits,consumed=s.economy!.consumed.bread!;expect(s.economy!.gathering?.guest).toBe('regular');expect(guest.resting).toBeUndefined();let replay=decodeSave(encodeSave(s,s.timeS,world),world).state;
 for(let i=0;i<120*2;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);}expect(s.economy!.gathering?.phase).toBe('eat');expect(s.economy!.accounts.find(a=>a.id==='regular')!.energy).toBeCloseTo(Math.min(100,energy+10),1);expect(s.economy!.accounts.find(a=>a.id==='regular')!.company).toBeCloseTo(company-.1,1);expect(replay).toEqual(s);
 for(let i=0;i<120*10;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);}expect(replay).toEqual(s);expect(s.economy!.gathering?.phase).toBe('home');expect(s.economy!.accounts.find(a=>a.id==='regular')!.credits).toBe(credits);expect(s.economy!.consumed.bread).toBe(consumed+2);expect(s.economy!.peerHistory?.['hall_break/baker/regular']?.meals).toBe(1);expect(resetCar(s,scene).economy).toEqual(s.economy);checkEconomyState(s,scene);expect(JSON.stringify(scene)).toBe(snapshot);
},60000);
