import {it,expect} from 'vitest';
import source from '../docs/examples/worker-rations.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState} from '../src/sim/car';
import {stepCommerce,commerceReason,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {encodeSave,decodeSave} from '../src/sim/save';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {dreamAgentContext} from '../src/scene/dream-agent';
const compile=(text=source)=>compileDreamScene(text,{sceneId:'rations',revisionId:'test',sourceHash:'rations'}),scene=compile();
const world=(s=scene)=>({scene:s,roadMask:buildMaskForScene(s),driveMask:buildPaperMask(4000,2400),carRadius:11});
const a=(s:CarState,id='regular')=>s.economy!.accounts.find(a=>a.id===id)!,stock=(s:CarState)=>s.economy!.markets.find(m=>m.id==='corner')!;
const tick=(s:CarState,sc=scene,commerce?:import('../src/sim/commerce').CommerceAction)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,sc),population:stepAmbient(s,.25,sc)},{commerce},.25,sc);
it('roundtrips the shared command contract and rejects missing, unpriced, non-food or incompatible policies',()=>{
 const distant=source.replace('good=bread,market=corner','good=bread,market=depot').replace('lot kit_store(good=kit,quantity=12,limit=12);','lot kit_store(good=kit,quantity=12,limit=12);lot food(good=bread,quantity=4,limit=4,price=5);');
 expect(()=>compile(distant)).toThrow('ration supply');
 const blocked=source+'\nobject partition(label="Partition"){measure(kind=custom,axis=y,meters=2.5);body(interaction=solid,radius=8,height=25);part wall(shape=box,material=blue,at=[0,12.5,0],size=[2,25,20]);}place divider(object=partition,at=[600,720]);';
 expect(()=>compile(blocked)).toThrow('ration supply');
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(dreamAgentContext(['commerce']).contract.commands).toHaveProperty('ration');
 for(const [from,to] of [['ration=field_snack','ration=unknown'],['below=60','below=96'],['good=bread,market=corner','good=flour,market=corner'],['good=bread,market=corner','good=bread,market=depot'],['shop=true,ration=field_snack,repair=yard_furniture,deliveries=[kits_run]','shop=true,ration=field_snack'],['account pocket(actor=player','account pocket(ration=field_snack,actor=player']] as const)expect(()=>compile(source.replace(from,to))).toThrow();
});
it('buys one actual portion, respects finite cash/stock and retains room for every declared task',()=>{
 let s=createCarAtSpawn(scene);for(let i=0;i<8;i++)s=tick(s);expect(a(s).inventory.bread).toBe(1);expect(a(s).credits).toBe(15);expect(stock(s).stock.bread).toBe(7);checkEconomyState(s,scene);
 for(const [from,to] of [['credits=20,capacity=4,satiety=65','credits=0,capacity=4,satiety=65'],['quantity=8,limit=16','quantity=0,limit=16'],['quantity=2,pay=4','quantity=4,pay=4']] as const){
  const sc=compile(source.replace(from,to).replace('quantity=3,limit=3',from==='quantity=2,pay=4' ? 'quantity=3,limit=4' : 'quantity=3,limit=3'));let q=createCarAtSpawn(sc);for(let i=0;i<8;i++)q=tick(q,sc);expect(a(q).inventory.bread).toBe(0);checkEconomyState(q,sc);
 }
});
it('eats owned provisions during a repair journey without cancelling its claim, and reloads the held food',()=>{
 let s={...createCarAtSpawn(scene),broken:['remote_table']};for(let i=0;i<8;i++)s=tick(s);expect(a(s).repair).toBeDefined();expect(a(s).inventory.bread).toBe(1);
 s=decodeSave(encodeSave(s,s.timeS,world()),world()).state;
 let ate=false;for(let i=0;i<900;i++){const before=a(s).repair;s=tick(s);if(a(s).inventory.bread===0 && s.economy!.events.some(e=>e.account==='regular'&&e.kind==='eat')){expect(a(s).repair?.objectId).toBe(before?.objectId);ate=true;break;}}
 expect(ate).toBe(true);expect(resetCar(s,scene).economy).toEqual(s.economy);expect(a(s).satiety).toBeGreaterThan(60);expect(s.economy!.consumed.bread).toBeGreaterThanOrEqual(1);checkEconomyState(s,scene);
 expect(decodeSave(encodeSave(s,s.timeS,world()),world()).state.economy).toEqual(s.economy);
});
it('lets the player eat during a paid batch without spending its held ingredients or losing its wage',()=>{
 let s:CarState={...createCarAtSpawn(scene),control:{kind:'foot' as const},x:580,y:750,elevation:0};s=tick(s,scene,{kind:'buy',market:'corner',good:'bread'});s=tick(s,scene,{kind:'work',job:'bake'});
 const task=a(s,'pocket').work,flour=stock(s).stock.flour,cash=a(s,'pocket').credits;expect(task).toBeDefined();expect(commerceReason(s,scene,'pocket',{kind:'eat',good:'bread'})).toBeUndefined();
 s=tick(s,scene,{kind:'eat',good:'bread'});expect(a(s,'pocket').work).toEqual(task);expect(stock(s).stock.flour).toBe(flour);expect(a(s,'pocket').credits).toBe(cash);
 for(let i=0;i<12;i++)s=tick(s);expect(a(s,'pocket').completed.work.bake).toBe(1);expect(a(s,'pocket').credits).toBe(cash+3);checkEconomyState(s,scene);
});
it('never eats sealed food cargo and keeps its invoice, destination and claim while consuming a separate owned portion',()=>{
 const sc=compile(source.replace('lot kit_store(good=kit','lot kit_store(good=bread').replace('good=kit,quantity=2,pay=4','good=bread,quantity=2,pay=4').replace('Bring repair kits','Deliver bread'));
 let s=createCarAtSpawn(sc),collected=false,ate=false;
 for(let i=0;i<1200;i++){
  const before=a(s).delivery;s=tick(s,sc);if(a(s).delivery)collected=true;
  if(before && a(s).inventory.bread===0 && s.economy!.events.some(e=>e.account==='regular' && e.kind==='eat')){expect(a(s).delivery).toEqual(before);expect(a(s).courier?.id).toBe('kits_run');ate=true;break;}
 }
 expect(collected && ate).toBe(true);expect(s.economy!.delivered.kits_run).toBe(0);expect(commerceReason(s,sc,'regular',{kind:'eat',good:'bread'})).toBe('stock');checkEconomyState(s,sc);
});
it('does not buy at a closed counter and allocates one available portion once under deterministic contention',()=>{
 const shut=compile((source+'\ndaylight(cycle_s=600,start_hour=20);').replace('credits=100,radius=70','credits=100,radius=70,hours=[8,17]'));
 let q=createCarAtSpawn(shut);for(let i=0;i<8;i++)q=tick(q,shut);expect(a(q).inventory.bread).toBe(0);expect(a(q).credits).toBe(20);checkEconomyState(q,shut);
 const sc=compile(source.replace('quantity=8,limit=16','quantity=1,limit=16').replace('economy(){','place helper(object=pedestrian,at=[640,730],role=npc,behavior=welcome);\neconomy(){\n account helper_fund(actor=helper,credits=20,capacity=4,satiety=65,drain_s=.05,ration=field_snack,repair=yard_furniture);'));
 const first=tick(createCarAtSpawn(sc),sc),second=tick(createCarAtSpawn(sc),sc);expect(first).toEqual(second);expect(a(first).inventory.bread!+a(first,'helper_fund').inventory.bread!).toBe(1);expect(stock(first).stock.bread).toBe(0);checkEconomyState(first,sc);
});

it('uses the declared threshold and task capacity instead of the legacy shopper fallback',()=>{
 const hungry=source.replace('credits=20,capacity=4,satiety=65','credits=20,capacity=4,satiety=39');
 const sc=compile(hungry.replace('below=60','below=0'));let s=createCarAtSpawn(sc);for(let i=0;i<8;i++)s=tick(s,sc);
 expect(a(s).inventory.bread).toBe(1);expect(s.economy!.consumed.bread).toBe(0);checkEconomyState(s,sc);
 const full=compile(hungry.replace('quantity=2,pay=4','quantity=4,pay=4').replace('quantity=3,limit=3','quantity=3,limit=4'));s=createCarAtSpawn(full);for(let i=0;i<8;i++)s=tick(s,full);
 expect(a(s).inventory.bread).toBe(0);expect(a(s).credits).toBe(20);checkEconomyState(s,full);
});

it('keeps the player repair reservation intact while eating',()=>{
 const sc=compile(source.replace(',ration=field_snack,repair=yard_furniture,deliveries=[kits_run]',''));
 let s:CarState={...createCarAtSpawn(sc),control:{kind:'foot'},x:580,y:750,elevation:0};s=tick(s,sc,{kind:'buy',market:'corner',good:'bread'});s={...s,broken:['yard_table']};s=tick(s,sc,{kind:'repair',repair:'yard_furniture'});
 const claim=a(s,'pocket').repair,kit=stock(s).stock.kit;expect(claim).toBeDefined();s=tick(s,sc,{kind:'eat',good:'bread'});
 expect(a(s,'pocket').repair?.objectId).toBe(claim!.objectId);expect(stock(s).stock.kit).toBe(kit);expect(a(s,'pocket').inventory.bread).toBe(0);checkEconomyState(s,sc);
});
