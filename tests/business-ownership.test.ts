import {it,expect} from 'vitest';
import source from '../docs/examples/business-ownership.dream?raw';
import production from '../docs/examples/market-production.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,commerceReason,checkEconomyState,businessPrice,type CommerceAction} from '../src/sim/commerce';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {npcReviewStart} from '../src/game/review-start';
import {encodeSave,decodeSave} from '../src/sim/save';

const compile=(s:string)=>compileDreamScene(s,{sceneId:'business',revisionId:'r1',sourceHash:'business-source'});
const example=compile(source);
const quiet=parseScene({...example,economy:{...example.economy!,accounts:example.economy!.accounts.map(a=>({...a,shop:false,work:undefined}))}});
const world=(scene:Scene):World=>({scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11});
const start=(scene=quiet)=>npcReviewStart(createCarAtSpawn(scene),world(scene),'neighbor');
const tick=(s:CarState,doc=quiet,commerce?:CommerceAction)=>{const next=stepCommerce({...s,timeS:s.timeS+.25},{commerce},.25,doc);checkEconomyState(next,doc);return next;};
const pocket=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const company=(s:CarState,id='corner')=>s.economy!.markets.find(m=>m.id===id)!;

it('compiles bounded reusable owner and sale fields with field-specific repair diagnostics',()=>{
 expect(example.economy!.markets[0]).toMatchObject({owner:'baker',sale:15});expect(formatDream(formatDream(source))).toBe(formatDream(source));
 for(const [from,to,path] of [['owner=baker','owner=missing','owner'],['sale=15','sale=0','sale'],['sale=15','sale=1.5','sale'],['sale=15','sale=1000001','sale'],['owner=baker','owner=pocket','sale'],['owner=baker,','', 'sale']] as const){
  expect(checkDream(source.replace(from,to))).toMatchObject({ok:false,diagnostics:[{path:'dream/economy/market:corner/'+path}]});
 }
 const owned=compile(source.replace('owner=baker,sale=15','owner=pocket'));expect(company(start(owned)).owner).toBe('pocket');
});

it('pays the seller once, includes available cash in the price and keeps stock, work and the accepted scene',()=>{
 const before=JSON.stringify(quiet),initial=start();let s=tick(initial,quiet,{kind:'acquire',market:'corner'});
 expect(pocket(s).credits).toBe(15);expect(pocket(s,'baker').credits).toBe(25);expect(company(s)).toMatchObject({owner:'pocket',acquiredAtS:.25,credits:10});
 expect(company(s).stock).toEqual(company(initial).stock);expect(businessPrice(quiet.economy!.markets[0]!,company(s))).toBeUndefined();
 expect(commerceReason(s,quiet,'pocket',{kind:'acquire',market:'corner'})).toBe('not_for_sale');
 s=tick(s,quiet,{kind:'acquire',market:'corner'});expect(pocket(s,'baker').credits).toBe(25);expect(company(initial).owner).toBe('baker');expect(JSON.stringify(quiet)).toBe(before);
});

it('moves only owned available cash, refuses malformed requests atomically and preserves ownership through recovery',()=>{
 let s=tick(start(),quiet,{kind:'acquire',market:'corner'});s=tick(s,quiet,{kind:'deposit',market:'corner',amount:5});
 expect(pocket(s).credits).toBe(10);expect(company(s).credits).toBe(15);s=tick(s,quiet,{kind:'withdraw',market:'corner',amount:8});
 expect(pocket(s).credits).toBe(18);expect(company(s).credits).toBe(7);
 for(const amount of [0,-1,.5,NaN,Infinity,1000001]){const old=structuredClone(s);expect(commerceReason(s,quiet,'pocket',{kind:'deposit',market:'corner',amount})).toBe('amount');s=tick(s,quiet,{kind:'deposit',market:'corner',amount});expect(company(s)).toEqual(company(old));expect(pocket(s).credits).toBe(pocket(old).credits);}
 expect(commerceReason(s,quiet,'regular',{kind:'withdraw',market:'corner',amount:1})).toBe('ownership');
 expect(commerceReason(s,quiet,'pocket',{kind:'withdraw',market:'corner',amount:8})).toBe('treasury');
 expect(commerceReason({...s,control:{kind:'car'}},quiet,'pocket',{kind:'withdraw',market:'corner',amount:1})).toBe('range');
 expect(commerceReason({...s,x:2000},quiet,'pocket',{kind:'deposit',market:'corner',amount:1})).toBe('range');
 expect(resetCar(s,quiet).economy).toEqual(s.economy);expect(resetCar(s,quiet,true).economy).toEqual(createCarAtSpawn(quiet).economy);
 const loaded=decodeSave(encodeSave(s,7,world(quiet)),world(quiet));expect(loaded.state.economy).toEqual(s.economy);expect(loaded.worldTime).toBe(7);
});

it('lets committed staff finish under a new owner and protects the seller’s pending wage headroom',()=>{
 const doc=compile(source.replace('credits=0,capacity=4','credits=999976,capacity=4').replace('target=4','target=10').replace('satiety=25','satiety=65'));
 let s=tick(start(doc),doc);expect(pocket(s,'baker').work?.id).toBe('bake');expect(company(s).credits).toBe(7);
 expect(commerceReason(s,doc,'pocket',{kind:'acquire',market:'corner'})).toBe('headroom');
 const exact=compile(source.replace('credits=0,capacity=4','credits=999975,capacity=4').replace('target=4','target=10').replace('satiety=25','satiety=65'));
 s=tick(start(exact),exact);s=tick(s,exact,{kind:'acquire',market:'corner'});expect(company(s).owner).toBe('pocket');
 for(let i=0;i<6;i++)s=tick(s,exact);expect(pocket(s,'baker').credits).toBe(1000000);expect(s.economy!.batches.bake).toBe(1);
});

it('protects refund room when an owner deposits capital during someone else’s committed work',()=>{
 const doc=compile(source.replace('owner=baker,sale=15','owner=pocket').replace('actor=neighbor,credits=10','actor=neighbor,credits=999998').replace('target=4','target=10').replace('satiety=25','satiety=65'));
 let s=tick(start(doc),doc);expect(company(s).credits).toBe(999995);expect(pocket(s,'baker').work).toBeDefined();
 expect(commerceReason(s,doc,'pocket',{kind:'deposit',market:'corner',amount:3})).toBe('headroom');
 s=tick(s,doc,{kind:'deposit',market:'corner',amount:2});expect(company(s).credits).toBe(999997);
 for(let i=0;i<6;i++)s=tick(s,doc);expect(s.economy!.batches.bake).toBe(1);expect(pocket(s,'baker').credits).toBe(3);
});

it('requires open service to buy but lets a standing owner fund the closed business',()=>{
 const doc=parseScene({...quiet,daylight:{cycleSeconds:120,startHour:21},economy:{...quiet.economy!,markets:quiet.economy!.markets.map(m=>({...m,hours:[6,22]}))}});
 let s=tick(start(doc),doc,{kind:'acquire',market:'corner'});for(let i=0;i<24;i++)s=tick(s,doc);
 expect(commerceReason(s,doc,'pocket',{kind:'deposit',market:'corner',amount:5})).toBeUndefined();s=tick(s,doc,{kind:'deposit',market:'corner',amount:5});expect(company(s).credits).toBe(15);
 const unowned={...s,economy:{...s.economy!,markets:s.economy!.markets.map(m=>({...m,owner:'baker',acquiredAtS:undefined}))}};
 expect(commerceReason(unowned,doc,'pocket',{kind:'acquire',market:'corner'})).toBe('closed');
 for(const pose of [{grounded:false},{surface:'water' as const}])expect(commerceReason({...s,...pose},doc,'pocket',{kind:'withdraw',market:'corner',amount:1})).toBe('range');
});

it('gives the owner real supplier income only after a physical courier hands over conserved stock',()=>{
 const doc=compile(production.replace('actor=depot_keeper,credits=0,radius=70','actor=depot_keeper,credits=999994,radius=70,owner=pocket').replace('quantity=2,pay=4,capacity=1','quantity=2,pay=4,price=3,capacity=1'));
 let s:CarState={...createCarAtSpawn(doc),control:{kind:'foot'},x:1120,y:1000};
 for(let i=0;i<1200 && !pocket(s,'supply_helper').delivery;i++)s=tick(s,doc);
 expect(pocket(s,'supply_helper').delivery?.id).toBe('flour_run');expect(company(s,'depot').credits).toBe(999994);
 expect(commerceReason(s,doc,'pocket',{kind:'deposit',market:'depot',amount:1})).toBe('headroom');
 s=tick(s,doc,{kind:'withdraw',market:'depot',amount:1});s=tick(s,doc,{kind:'deposit',market:'depot',amount:1});
 for(let i=0;i<1200 && !s.economy!.delivered.flour_run;i++)s=tick(s,doc);
 expect(s.economy!.delivered.flour_run).toBe(1);expect(company(s,'depot').credits).toBe(1000000);expect(pocket(s,'supply_helper').credits).toBe(4);
 s=tick(s,doc,{kind:'withdraw',market:'depot',amount:6});expect(company(s,'depot').credits).toBe(999994);expect(pocket(s).credits).toBe(26);
});

it('does not fund wages from nothing, and lets the owner restart production with real capital',()=>{
 const doc=compile(source.replace('owner=baker,sale=15','owner=pocket').replace('actor=neighbor,credits=10','actor=neighbor,credits=0').replace('target=4','target=10').replace('satiety=25','satiety=65'));
 let s=tick(start(doc),doc);expect(pocket(s,'baker').work).toBeUndefined();
 s=tick(s,doc,{kind:'deposit',market:'corner',amount:3});for(let i=0;i<16 && !s.economy!.batches.bake;i++)s=tick(s,doc);
 expect(s.economy!.batches.bake).toBe(1);expect(pocket(s,'baker').credits).toBe(3);expect(pocket(s).credits).toBe(37);expect(company(s).credits).toBe(0);
});

it('rejects malformed saved ownership, purchase times and events rather than silently assigning a business',()=>{
 const valid=tick(start(),quiet,{kind:'acquire',market:'corner'});
 for(const change of [(s:CarState)=>{company(s).owner='missing';},(s:CarState)=>{company(s).acquiredAtS=100;},(s:CarState)=>{company(s).owner='baker';},(s:CarState)=>{company(s).acquiredAtS=undefined;},(s:CarState)=>{s.economy!.events[0]!.ref='missing';},(s:CarState)=>{s.economy!.events[0]!.amount=undefined;}]){
  const s=structuredClone(valid);change(s);expect(()=>encodeSave(s,0,world(quiet))).toThrow();
 }
});
