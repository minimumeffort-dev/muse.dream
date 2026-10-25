import {it,expect} from 'vitest';
import backup from './fixtures/workshop-r106-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {checkEconomyState} from '../src/sim/commerce';
import {workstation} from '../src/scene/workstations';
import {workPath} from '../src/sim/work-navigation';
import {commuteArea} from '../src/sim/courier';
import {stepInteractive} from '../src/sim/interaction';
import {actorPose} from '../src/sim/actors';
import {loftReviewSteps} from '../src/game/loft-review';
import {walkingHeight} from '../src/scene/interiors';
const live=createWorldScene(),scene=c.preCompanyScene(live),prior=c.preLoftScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.LOFT_COMPATIBILITY,previousLoftSaveCompatibility:c.PEER_RECIPE_COMPATIBILITY},old={...world,scene:prior,saveCompatibility:c.PEER_RECIPE_COMPATIBILITY,previousLoftSaveCompatibility:undefined},text=JSON.stringify(backup),account=(s:ReturnType<typeof createCarAtSpawn>,id='baker')=>s.economy!.accounts.find(a=>a.id===id)!;
it('registers exact r106 while keeping all starting resources and the actor budget, with a connected capped workshop loft',async()=>{
 expect(await c.sha256(c.preCompanyCompatibilitySource(live))).toBe(c.LOFT_COMPATIBILITY);expect(await c.sha256(c.preLoftCompatibilitySource(scene))).toBe(c.PEER_RECIPE_COMPATIBILITY);expect(await c.sha256(c.prePeerRecipeCompatibilitySource(scene))).toBe(c.COMPANION_COMPATIBILITY);
 expect(scene.economy!.markets).toEqual(prior.economy!.markets);expect(scene.economy!.goods).toEqual(prior.economy!.goods);expect(scene.economy!.accounts.map(({grounds,...a})=>a)).toEqual(prior.economy!.accounts.map(({grounds,...a})=>a));expect(scene.objects.filter(o=>o.role==='npc')).toEqual(prior.objects.filter(o=>o.role==='npc'));
 const hall=scene.objects.find(o=>o.id==='market_hall')!.spec as import('../src/scene/object-dsl').ObjectDslV2;expect(hall.parts).toHaveLength(29);expect(hall.contacts).toHaveLength(32);expect(hall.stairways?.[0]!.steps).toBe(17);const station=workstation(scene,'workshop_prep')!,baker=scene.economy!.accounts.find(a=>a.id==='baker')!,p=workPath(scene,commuteArea(scene,baker),scene.objects.find(o=>o.id===baker.actor)!,station);expect(p).toBeDefined();expect(p!.some(p=>p.elevation!==undefined && p.elevation>8 && p.elevation<station.elevation-4)).toBe(true);
});
it('preserves the actual r106 browser backup, clocks and original slot without credit, food or progress rebasing',()=>{
 const result=decodeSave(text,world);expect(result.migrated).toBe(true);expect(result.state).toEqual(backup.state);expect(result.worldTime).toBe(backup.worldTime);expect(()=>decodeSave(text,{...world,previousLoftSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.PEER_RECIPE_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(result.state);expect(slot.write(result.state,result.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
it('walks the existing baker to upstairs kit work after finite fixture maintenance, then pays and replays a real batch',async()=>{
 const snapshot=JSON.stringify(scene);let s={...createCarAtSpawn(scene),broken:['market_planter','picnic_table','produce_crate']},seen=false,climbed=false;
 const station=workstation(scene,'workshop_prep')!;for(let i=0;i<120*600;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);if(i%30===0)checkEconomyState(s,scene);if(i%2400===0)await new Promise(resolve=>setTimeout(resolve,0));const a=account(s),t=a.commute;if(t?.id==='assemble_kit' && (t.elevation??0)>8 && (t.elevation??0)<station.elevation-4)climbed=true;if(a.work?.id==='assemble_kit'){seen=true;break;}}
 expect(climbed && seen).toBe(true);const p=actorPose(scene,scene.objects.find(o=>o.id==='vendor')!,s.timeS,s);expect(p.elevation).toBe(station.elevation);expect(p.elevation-walkingHeight(scene,p.x,p.y)).toBeGreaterThan(30);const pay=account(s).credits,count=account(s).completed.work.assemble_kit!;let replay=decodeSave(encodeSave(s,s.timeS,world),world).state;
 for(let i=0;i<120*8;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,world);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);}expect(replay).toEqual(s);expect(account(s).completed.work.assemble_kit).toBe(count+1);expect(account(s).credits).toBe(pay+3);checkEconomyState(s,scene);expect(JSON.stringify(scene)).toBe(snapshot);
},60000);

it('lets the player physically repair, return hardware, climb and complete a conserved upstairs batch',async()=>{
 const steps=loftReviewSteps(createCarAtSpawn(scene),world,'paid');let result=steps.next(),n=0;while(!result.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));result=steps.next();}const state=result.value,a=account(state,'pocket');expect(a.completed.repair.market_tables).toBe(2);expect(a.completed.work.assemble_kit).toBe(1);expect(a.credits).toBe(31);expect(state.elevation).toBeCloseTo(workstation(scene,'workshop_prep')!.elevation);expect(decodeSave(encodeSave(state,state.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(state)));checkEconomyState(state,scene);
},60000);
it('refunds a displaced r106 kit commitment once without resetting other resources, progress or time',async()=>{
 let s={...createCarAtSpawn(prior),broken:['market_planter','picnic_table','produce_crate']};for(let i=0;i<120*180 && account(s).work?.id!=='assemble_kit';i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,old);if(i%2400===0)await new Promise(resolve=>setTimeout(resolve,0));}expect(account(s).work?.id).toBe('assemble_kit');const packet=encodeSave(s,s.timeS,old),before=account(s),stock=s.economy!.markets.find(m=>m.id==='market_stall')!,result=decodeSave(packet,world).state,next=account(result);expect(result.timeS).toBe(s.timeS);expect(next.work).toBeUndefined();expect(next.commute?.phase).toBe('home');expect(next.completed).toEqual(before.completed);expect(next.credits).toBe(before.credits);expect(account(result,'pocket')).toEqual(account(s,'pocket'));expect(result.economy!.markets.find(m=>m.id==='market_stall')).toMatchObject({credits:stock.credits+3,stock:{boards:stock.stock.boards!+1,fasteners:stock.stock.fasteners!+1}});const once=decodeSave(encodeSave(result,result.timeS,world),world).state;expect(once).toEqual(JSON.parse(JSON.stringify(result)));checkEconomyState(result,scene);
},60000);
it('recovers only an unsafe old player pose locally when the new stairs occupy it, retaining all ledgers',()=>{
 const saved=decodeSave(text,old).state,unsafe={...saved,x:6506.071428571428,y:4510,elevation:walkingHeight(prior,6506.071428571428,4510)},packet=encodeSave(unsafe,unsafe.timeS,old),result=decodeSave(packet,world).state;expect(result.economy).toEqual(unsafe.economy);expect(result.timeS).toBe(unsafe.timeS);expect(Math.hypot(result.x-unsafe.x,result.y-unsafe.y)).toBeGreaterThan(0);expect(Math.hypot(result.x-unsafe.x,result.y-unsafe.y)).toBeLessThanOrEqual(32);expect(decodeSave(encodeSave(result,result.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(result)));
});
