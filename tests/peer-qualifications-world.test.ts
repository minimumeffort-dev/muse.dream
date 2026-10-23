import {it,expect} from 'vitest';
import backup from './fixtures/companion-r105-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {peerRecipeReviewSteps} from '../src/game/peer-recipe-review';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState,hasMilestone,workQualified} from '../src/sim/commerce';
const scene=createWorldScene(),prior=c.prePeerRecipeScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.PEER_RECIPE_COMPATIBILITY,previousPeerRecipeSaveCompatibility:c.COMPANION_COMPATIBILITY};
const old={...world,scene:prior,saveCompatibility:c.COMPANION_COMPATIBILITY,previousPeerRecipeSaveCompatibility:undefined},text=JSON.stringify(backup),account=(s:ReturnType<typeof createCarAtSpawn>,id='baker')=>s.economy!.accounts.find(a=>a.id===id)!;
const run=async<T>(g:Generator<unknown,T>)=>{let r=g.next(),n=0;while(!r.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));r=g.next();}return r.value;};
it('registers exact r105 and r104 without changing geometry, starting resources or existing production choices',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(49);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.PEER_RECIPE_COMPATIBILITY);expect(await c.sha256(c.prePeerRecipeCompatibilitySource(scene))).toBe(c.COMPANION_COMPATIBILITY);expect(await c.sha256(c.preCompanionCompatibilitySource(scene))).toBe(c.GESTURE_COMPATIBILITY);
 expect(scene.objects).toBe(prior.objects);expect(scene.terrain).toBe(prior.terrain);expect(scene.streets).toBe(prior.streets);expect(scene.economy!.markets).toBe(prior.economy!.markets);
 expect(scene.economy!.accounts.find(a=>a.id==='baker')!.works).toEqual(['large_bake',...prior.economy!.accounts.find(a=>a.id==='baker')!.works!]);expect(scene.economy!.accounts.map(({works,...a})=>a)).toEqual(prior.economy!.accounts.map(({works,...a})=>a));
});
it('preserves the actual paused r105 browser backup and original slot, deriving eligibility only for its actual participants',()=>{
 const restored=decodeSave(text,world);expect(restored.migrated).toBe(true);expect(restored.state).toEqual(backup.state);expect(restored.worldTime).toBe(backup.worldTime);expect(hasMilestone(restored.state,scene,'baker','bakers_pair')).toBe(true);expect(hasMilestone(restored.state,scene,'regular','bakers_pair')).toBe(true);expect(hasMilestone(restored.state,scene,'pocket','bakers_pair')).toBe(false);
 expect(()=>decodeSave(text,{...world,previousPeerRecipeSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.COMPANION_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(restored.state);expect(slot.write(restored.state,restored.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
it('lets the existing baker take and complete one real larger batch after returning, with only two ordinary batches and no player meal',async()=>{
 const source=JSON.stringify(scene);let s=await run(peerRecipeReviewSteps(decodeSave(text,world).state,world));expect(s.economy!.gathering).toBeUndefined();expect(account(s).work?.id).toBe('large_bake');expect(account(s).completed.work.bake).toBe(2);expect(s.economy!.socialHistory?.baker).toBeUndefined();expect(account(s).credits).toBe(3);expect(account(s,'pocket').credits).toBe(20);
 const oldState=decodeSave(text,old).state,job=scene.economy!.jobs.find(j=>j.id==='large_bake')!;expect(workQualified(oldState,prior,'baker',prior.economy!.jobs.find(j=>j.id===job.id)!)).toBe(false);
 const pending=encodeSave(s,s.timeS,world);let replay=decodeSave(pending,world).state;const stock={...s.economy!.markets.find(m=>m.id==='market_stall')!.stock};
 for(let i=0;i<120*12;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);}expect(replay).toEqual(s);expect(account(s).completed.work.large_bake).toBe(1);expect(account(s).completed.work.bake).toBe(2);expect(account(s).credits).toBe(8);expect(s.economy!.markets.find(m=>m.id==='market_stall')!.stock.bread).toBe(stock.bread!+5);expect(account(s,'pocket').credits).toBe(20);checkEconomyState(s,scene);expect(JSON.stringify(scene)).toBe(source);
},60000);
