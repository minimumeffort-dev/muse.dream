import {it,expect} from 'vitest';
import source from '../docs/examples/workshop-supplies.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import type {Scene} from '../src/scene/schema';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState,commerceReason} from '../src/sim/commerce';
import {workshopReviewSteps,handReviewSteps} from '../src/game/review-start';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
let live:Scene|undefined;const current=()=>live??=createWorldScene();
const world=(scene:Scene):World=>({scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11});
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const market=(s:CarState,id:string)=>s.economy!.markets.find(m=>m.id===id)!;

it('pins the exact r85 projection and leaves geometry, old stock and runtime bounds intact',async()=>{
 const scene=current(),prior=c.preWorkshopSupplyScene(scene);
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.WORKSHOP_SUPPLY_COMPATIBILITY);expect(await c.sha256(c.preWorkshopSupplyCompatibilitySource(scene))).toBe(c.KIT_PRODUCTION_COMPATIBILITY);
 expect(scene.objects).toBe(prior.objects);expect(scene.surfaces).toBe(prior.surfaces);expect(scene.economy!.accounts.find(a=>a.id==='caretaker')!.deliveries).toEqual(['kits_run','saplings_run','flour_run','boards_run']);
 expect(scene.economy!.markets.find(m=>m.id==='station_supplies')!.lots.slice(-2).map(l=>[l.good,l.quantity])).toEqual([['boards',16],['fasteners',16]]);
 expect(prior.economy!.deliveries).toHaveLength(4);expect(c.SAVE_SIMULATION_VERSION).toBe(34);
});

it('walks NPC board and fastener cargo to a real counter, then crafts kits through the shared finite recipe',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));const scene=compileDreamScene(source,{sceneId:'workshop',revisionId:'test',sourceHash:'workshop'}),w=world(scene);let s=createCarAtSpawn(scene),seen=false;
 for(let tick=0;tick<120*360;tick++){
  s=stepInteractive(s,{throttle:0,steer:0},1/120,w);seen ||= !!account(s,'supply_helper').delivery;
  if(account(s,'baker').completed.work.assemble_kit===2)break;
 }
 expect(seen).toBe(true);expect(s.economy!.delivered.boards_run).toBe(1);expect(s.economy!.delivered.fasteners_run).toBe(1);expect(market(s,'depot').stock).toMatchObject({boards:14,fasteners:14});expect(market(s,'depot').credits).toBe(4);
 expect(account(s,'supply_helper').credits).toBe(8);expect(market(s,'corner').stock.kit).toBe(2);checkEconomyState(s,scene);expect(decodeSave(encodeSave(s,400,w),w).state).toEqual(JSON.parse(JSON.stringify(s)));
});

it('uses real consumption, collection and handoff in the live world without paying twice or losing cargo on R',()=>{
 const scene=current(),w=world(scene),steps=workshopReviewSteps(createCarAtSpawn(scene),w);let result=steps.next();while(!result.done)result=steps.next();let s=result.value;
 expect(account(s).delivery?.id).toBe('fasteners_run');expect(market(s,'station_supplies').stock.fasteners).toBe(14);expect(market(s,'market_stall').stock.fasteners).toBe(6);expect(account(s).completed.repair.market_tables).toBe(2);expect(account(s,'baker').completed.work.assemble_kit).toBe(2);checkEconomyState(s,scene);
 const packet=encodeSave(s,100,w),restored=decodeSave(packet,w).state;expect(restored).toEqual(JSON.parse(packet).state);
 const before=account(s).credits;s=stepInteractive(s,{throttle:0,steer:0,commerce:{kind:'deliver'}},1/120,w);
 expect(account(s).delivery).toBeUndefined();expect(account(s).credits).toBe(before+4);expect(account(s).completed.delivery.fasteners_run).toBe(1);expect(market(s,'market_stall').stock.fasteners).toBe(8);expect(market(s,'station_supplies').credits).toBe(2);
 expect(commerceReason(s,scene,'pocket',{kind:'deliver'})).toBe('range');const again=stepInteractive(s,{throttle:0,steer:0,commerce:{kind:'deliver'}},1/120,w);expect(account(again).credits).toBe(account(s).credits);checkEconomyState(again,scene);
});

it('initializes only the two new supplier lots and delivery counters on a registered r85 save',()=>{
 const scene=current(),prior=c.preWorkshopSupplyScene(scene),old={...world(prior),saveCompatibility:c.KIT_PRODUCTION_COMPATIBILITY},steps=handReviewSteps(createCarAtSpawn(prior),old,true);let r=steps.next();while(!r.done)r=steps.next();const text=encodeSave(r.value,88,old);
 const w={...world(scene),saveCompatibility:c.WORKSHOP_SUPPLY_COMPATIBILITY,previousWorkshopSupplySaveCompatibility:c.KIT_PRODUCTION_COMPATIBILITY},loaded=decodeSave(text,w),state=loaded.state,e=state.economy!;
 const strip=(s:CarState)=>({...s,economy:{...s.economy!,delivered:Object.fromEntries(Object.entries(s.economy!.delivered).filter(([id])=>!id.endsWith('_run')||!['boards_run','fasteners_run'].includes(id))),unattributed:{...s.economy!.unattributed,delivery:Object.fromEntries(Object.entries(s.economy!.unattributed.delivery).filter(([id])=>!['boards_run','fasteners_run'].includes(id)))},accounts:s.economy!.accounts.map(a=>({...a,completed:{...a.completed,delivery:Object.fromEntries(Object.entries(a.completed.delivery).filter(([id])=>!['boards_run','fasteners_run'].includes(id)))}})),markets:s.economy!.markets.map(m=>m.id==='station_supplies' ? {...m,stock:Object.fromEntries(Object.entries(m.stock).filter(([id])=>!['boards','fasteners'].includes(id)))} : m)}});
 expect(strip(state)).toEqual(JSON.parse(text).state);expect(loaded.worldTime).toBe(88);expect(market(state,'station_supplies').stock).toMatchObject({boards:16,fasteners:16});expect(e.accounts.every(a=>a.completed.delivery.boards_run===0 && a.completed.delivery.fasteners_run===0)).toBe(true);
 expect(decodeSave(encodeSave(state,88,w),w).migrated).toBe(false);expect(()=>decodeSave(text,{...w,previousWorkshopSupplySaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v18.${scene.sceneId}.${c.KIT_PRODUCTION_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(w,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.state).toEqual(state);expect(slot.write(state,88)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
