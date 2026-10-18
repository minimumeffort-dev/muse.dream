import {it,expect} from 'vitest';
import source from '../docs/examples/market-production.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {encodeSave,decodeSave} from '../src/sim/save';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {repairNavigation,primeRepairNavigation} from '../src/sim/repair';
const scene=compileDreamScene(source,{sceneId:'kitchen',revisionId:'r1',sourceHash:'kitchen'});
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const start=():CarState=>({...createCarAtSpawn(scene),control:{kind:'foot'},x:900,y:730,elevation:0,surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]});
const account=(s:CarState,id:string)=>s.economy!.accounts.find(a=>a.id===id)!;
function step(s:CarState,action?:import('../src/sim/commerce').CommerceAction){return stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene)},{commerce:action},.25,scene);}
it('compiles independent kitchen, hungry customer and flour courier without repairs or ambient actors',()=>{
 expect(scene.economy!.repairs).toHaveLength(0);expect(scene.objects.every(o=>!o.ambient)).toBe(true);expect(ambientGraph(scene).nodes.length).toBeGreaterThan(0);
 expect(formatDream(formatDream(source))).toBe(formatDream(source));const packet=repairNavigation(scene);expect(packet.services.length).toBe(2);expect(()=>primeRepairNavigation({...scene},packet)).not.toThrow();
 expect(()=>compileDreamScene(source.replace('at=[900,850]','at=[900,950]'),{sceneId:'gap',sourceHash:'gap',revisionId:'r1'})).toThrow();
});
it('makes lunch from staff-produced bread, sells and consumes one meal, and resumes the customer routine',()=>{
 let s=start(),sawBaking=false,sawPacking=false,sawEating=false;for(let i=0;i<240;i++){
  s=step(s);sawBaking ||= account(s,'baker').work?.id==='bake';sawPacking ||= account(s,'baker').work?.id==='pack_lunch';sawEating ||= account(s,'regular').meal?.phase==='eat';checkEconomyState(s,scene);
 }
 expect(sawBaking && sawPacking && sawEating).toBe(true);expect(account(s,'regular').credits).toBe(12);expect(account(s,'regular').meal).toBeUndefined();expect(s.economy!.consumed.lunch).toBe(1);expect(account(s,'baker').completed.work.pack_lunch).toBe(3);expect(account(s,'pocket').completed.work.pack_lunch).toBe(0);
});
it('uses the same capacity for a player job, reserves and refunds all ingredients, and finishes without double pay after reload',()=>{
 let s=start();s=step(s);expect(account(s,'baker').work?.id).toBe('bake');s={...s,x:580,y:750};expect(commerceReason(s,scene,'pocket',{kind:'work',job:'bake'})).toBe('busy');
 for(let i=0;i<28 && account(s,'baker').work?.id!=='pack_lunch';i++)s=step(s);expect(account(s,'baker').work?.id).toBe('pack_lunch');
 expect(commerceReason(s,scene,'pocket',{kind:'work',job:'pack_lunch'})).toBe('busy');s=step(s,{kind:'work',job:'bake'});expect(account(s,'pocket').work?.id).toBe('bake');
 const cancelled=step(s,{kind:'cancel'});expect(account(cancelled,'pocket').work).toBeUndefined();expect(account(cancelled,'pocket').completed.work.bake).toBe(0);expect(cancelled.economy!.markets[0]!.stock.flour).toBe(s.economy!.markets[0]!.stock.flour!+1);expect(cancelled.economy!.markets[0]!.credits).toBe(s.economy!.markets[0]!.credits+3);checkEconomyState(cancelled,scene);
 const saved=decodeSave(encodeSave(s,s.timeS,world),world).state,balance=account(s,'pocket').credits;let copy=saved;for(let i=0;i<10;i++)copy=step(copy);expect(account(copy,'pocket').completed.work.bake).toBe(1);expect(account(copy,'pocket').credits).toBe(balance+3);checkEconomyState(copy,scene);
});
it('physically resupplies finite flour and preserves pickup/cargo/return across saves',()=>{
 let s=start(),pickup=false,carrying=false,returning=false;for(let i=0;i<2200;i++){
  s=step(s);const courier=account(s,'supply_helper').courier;
  if(courier && !({pickup,dropoff:carrying,home:returning})[courier.phase]){
   const text=encodeSave(s,s.timeS,world);expect(decodeSave(text,world).state).toEqual(JSON.parse(JSON.stringify(s)));
   if(courier.phase==='pickup')pickup=true;if(courier.phase==='dropoff')carrying=true;if(courier.phase==='home')returning=true;
  }
  if(s.economy!.delivered.flour_run===1 && (!courier || returning && courier.phase==='pickup' && courier.distance===0)){if(courier)expect({x:courier.x,y:courier.y}).toEqual({x:620,y:730});break;}
 }
 expect(pickup && carrying && returning).toBe(true);expect(s.economy!.delivered.flour_run).toBe(1);expect(account(s,'supply_helper').credits).toBe(4);expect(s.economy!.markets.find(m=>m.id==='depot')!.stock.flour).toBe(10);checkEconomyState(s,scene);
});

it('prepares food-only public walking without a courier, repair service or cosmetic population',()=>{
 const meals=source.replace('deliveries=[flour_run]','shop=true').replace(/ delivery flour_run[^\n]+\n/,'').replace('markets=[corner],on=plaza,eat_s=4','markets=[depot],on=plaza,grounds=[depot_yard],eat_s=4').replace('lot flour_store(good=flour,quantity=12,limit=12);','lot flour_store(good=flour,quantity=12,limit=12);lot lunches(good=lunch,quantity=1,limit=4,price=8);');
 const doc=compileDreamScene(meals,{sceneId:'meals_only',revisionId:'r1',sourceHash:'meals_only'});expect(doc.economy!.deliveries).toHaveLength(0);expect(doc.economy!.repairs).toHaveLength(0);expect(doc.objects.every(o=>!o.ambient)).toBe(true);expect(ambientGraph(doc).nodes.length).toBeGreaterThan(0);expect(repairNavigation(doc).services).toHaveLength(1);
});
