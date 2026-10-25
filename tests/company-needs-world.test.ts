import {it,expect} from 'vitest';
import backup from './fixtures/company-r107-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {companionReviewSteps} from '../src/game/companion-review';
import {bondReviewSteps} from '../src/game/bond-review';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
// The r108 company fixture precedes upstairs social preferences and the station quarter.
const scene=c.preUpstairsSocialScene(createWorldScene()),prior=c.preCompanyScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.COMPANY_COMPATIBILITY,previousCompanySaveCompatibility:c.LOFT_COMPATIBILITY},text=JSON.stringify(backup);
const account=(s:ReturnType<typeof createCarAtSpawn>,id:string)=>s.economy!.accounts.find(a=>a.id===id)!;
it('pins exact r107 while retaining all geometry, stock, money, actor budgets and prepared pedestrian/contact data',async()=>{
 expect(await c.sha256(c.preSeatedRestCompatibilitySource(scene))).toBe(c.COMPANY_COMPATIBILITY);expect(await c.sha256(c.preCompanyCompatibilitySource(scene))).toBe(c.LOFT_COMPATIBILITY);expect(await c.sha256(c.preLoftCompatibilitySource(scene))).toBe(c.PEER_RECIPE_COMPATIBILITY);
 expect(scene.objects).toEqual(prior.objects);expect(scene.economy!.markets).toEqual(prior.economy!.markets);expect(scene.economy!.accounts.map(({company,...a})=>a)).toEqual(prior.economy!.accounts);expect(sceneContactData(prior)).toEqual(sceneContactData(scene));expect(ambientGraph(prior)).toEqual(ambientGraph(scene));expect(scene.economy!.accounts.filter(a=>a.company).map(a=>a.id)).toEqual(['pocket','baker','regular']);
});
it('migrates the actual browser backup by initializing only the three new needs at saved time, retaining the old slot',()=>{
 const restored=decodeSave(text,world),expected={...backup.state,economy:{...backup.state.economy,accounts:backup.state.economy.accounts.map(a=>{const need=scene.economy!.accounts.find(s=>s.id===a.id)!.company;return need ? {...a,company:need.initial} : a;})}};expect(restored.migrated).toBe(true);expect(restored.state).toEqual(expected);expect(restored.worldTime).toBe(backup.worldTime);expect(()=>decodeSave(text,{...world,previousCompanySaveCompatibility:undefined})).toThrow('different world');
 const oldKey=`muse-dream.save.v19.${scene.sceneId}.${c.LOFT_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(expected);expect(slot.write(restored.state,restored.worldTime)).toBe(true);expect(rows.get(oldKey)).toBe(text);expect(rows.size).toBe(2);expect(decodeSave(encodeSave(restored.state,restored.worldTime,world),world).state).toEqual(expected);
 const forged=JSON.parse(text);forged.state.economy.accounts[0].company=100;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid');
});
it('connects real wages, purchases, off-duty choice and shared seating to both residents company, without rewarding the player',async()=>{
 const snapshot=JSON.stringify(scene),steps=companionReviewSteps(createCarAtSpawn(scene),world,'eat');let result=steps.next(),n=0;while(!result.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));result=steps.next();}let s=result.value;const t=s.economy!.gathering!,host=account(s,t.host).company!,guest=account(s,t.guest).company!,player=account(s,'pocket').company!,credits=account(s,t.host).credits,stock=s.economy!.markets.find(m=>m.id==='market_stall')!.stock.bread;
 expect(t.host).toBe('baker');expect(t.guest).toBe('regular');expect(host).toBeLessThan(40);expect(t.portions).toBe(2);expect(account(s,t.host).completed.work.pack_lunch).toBeGreaterThan(0);let copy=decodeSave(encodeSave(s,s.timeS,world),world).state;
 for(let i=0;i<120*10;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);copy=stepInteractive(copy,{steer:0,throttle:0},1/120,world);}expect(copy).toEqual(s);expect(s.economy!.gathering?.phase).toBe('home');expect(account(s,t.host).company).toBeCloseTo(host+34.5,1);expect(account(s,t.guest).company).toBeCloseTo(guest+34.5,1);expect(account(s,'pocket').company).toBeCloseTo(player-.5,1);expect(account(s,t.host).credits).toBe(credits);expect(s.economy!.markets.find(m=>m.id==='market_stall')!.stock.bread).toBe(stock);expect(s.economy!.peerHistory?.['hall_break/baker/regular']?.meals).toBe(1);checkEconomyState(s,scene);expect(JSON.stringify(scene)).toBe(snapshot);
},60000);

it('lets the actual player buy food, meet and sit with the baker, then restores both through the same completed activity',async()=>{
 const steps=bondReviewSteps(createCarAtSpawn(scene),world,'meal');let result=steps.next(),n=0;while(!result.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));result=steps.next();}let s=result.value;const pocket=account(s,'pocket').company!,host=account(s,'baker').company!,other=account(s,'regular').company!,credits=account(s,'pocket').credits,history=s.economy!.socialHistory?.baker?.meals??0;expect(s.economy!.shared?.phase).toBe('eat');expect(s.economy!.shared?.portions).toBe(2);
 for(let i=0;i<120*10;i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,world);expect(account(s,'pocket').company).toBeCloseTo(pocket+34.5,1);expect(account(s,'baker').company).toBeCloseTo(host+34.5,1);expect(account(s,'regular').company).toBeCloseTo(other-.5,1);expect(account(s,'pocket').credits).toBe(credits);expect(s.economy!.socialHistory?.baker?.meals).toBe(history+1);expect(decodeSave(encodeSave(s,s.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(s)));checkEconomyState(s,scene);
},60000);
