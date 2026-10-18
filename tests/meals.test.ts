import {it,expect} from 'vitest';
import source from '../docs/examples/meal-trips.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {actorPose} from '../src/sim/actors';
import {encodeSave,decodeSave} from '../src/sim/save';
import {repairNavigation,primeRepairNavigation} from '../src/sim/repair';
const scene=compileDreamScene(source,{sceneId:'meals',revisionId:'r1',sourceHash:'meals'});
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const start=():CarState=>({...createCarAtSpawn(scene),control:{kind:'foot'},x:900,y:730,elevation:0,surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]});
const diner=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!;
function step(s:CarState,commerce?:import('../src/sim/commerce').CommerceAction){const next={...s,npcs:stepNpcs(s,.25,scene),timeS:s.timeS+.25};return stepCommerce(next,{commerce},.25,scene);}
it('accepts bounded meal plans and rejects invalid references, ownership, geometry and budgets',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));
 for(const [a,b] of [['meal=bakery_break','meal=missing'],['meal=bakery_break','meal=bakery_break,shop=true'],['meal=bakery_break','meal=bakery_break,work=bake'],['markets=[corner]','markets=[corner,corner]'],['markets=[corner]','markets=[]'],['markets=[corner]','markets=[missing]'],['good=bread,markets','good=flour,markets'],['eat_s=4','eat_s=0'],['eat_s=4','eat_s=13'],['on=plaza','on=missing'],['on=plaza','on=plaza,grounds=[plaza]'],['actor=customer','actor=player'],['actor=customer','actor=neighbor']] as const)expect(()=>compileDreamScene(source.replace(a,b),{sceneId:'bad',revisionId:'r1',sourceHash:'bad'}),b).toThrow();
 expect(()=>compileDreamScene(source.replace('at=[760,730]','at=[1200,730]'),{sceneId:'gap',revisionId:'r1',sourceHash:'gap'})).toThrow('connected meal');
 const p=repairNavigation(scene);expect(p.services).toHaveLength(1);expect(()=>primeRepairNavigation({...scene},p)).not.toThrow();
});
it('walks, buys and eats one finite meal, then returns without changing routine memory',()=>{
 let s=step(start());expect(diner(s).meal?.phase).toBe('out');expect(resetCar(s,scene).economy).toEqual(s.economy);expect(diner(start()).meal).toBeUndefined();expect(diner(s).credits).toBe(20);expect(diner(s).inventory.bread).toBe(0);const home=diner(s).meal!.home,clock=structuredClone(s.npcs.find(n=>n.id==='customer'));
 let ate=false,bought=false,checkedEat=false;for(let i=0;i<160 && diner(s).meal;i++){
  s=step(s);checkEconomyState(s,scene);expect(s.npcs.find(n=>n.id==='customer')).toEqual(clock);
  if(diner(s).meal?.phase==='eat'){bought=true;expect(diner(s).credits).toBe(15);expect(diner(s).inventory.bread).toBe(1);if(!checkedEat){expect(decodeSave(encodeSave(s,s.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(s)));checkedEat=true;}}
  if(diner(s).meal?.phase==='home'){ate=true;expect(diner(s).inventory.bread).toBe(0);expect(diner(s).satiety).toBeGreaterThan(60);}
 }
 expect(bought && ate && checkedEat).toBe(true);expect(diner(s).meal).toBeUndefined();expect(diner(s).credits).toBe(15);const pose=actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s);expect(pose.x).toBe(home.x);expect(pose.y).toBe(home.y);
 const e=s.economy!;expect(e.events.filter(e=>e.account==='regular' && e.kind==='buy')).toHaveLength(1);expect(e.events.filter(e=>e.account==='regular' && e.kind==='eat')).toHaveLength(1);
});
it('waits for stock or funds and rechecks a competing purchase on arrival without a free meal or refund',()=>{
 let s=step(start());const market=s.economy!.markets.find(m=>m.id==='corner')!,pocket=s.economy!.accounts[0]!;pocket.inventory.bread=market.stock.bread!;market.stock.bread=0;
 for(let i=0;i<120 && diner(s).meal;i++)s=step(s);
 expect(diner(s).meal).toBeUndefined();expect(diner(s).credits).toBe(20);expect(diner(s).inventory.bread).toBe(0);checkEconomyState(s,scene);
 const broke=start();broke.economy!.markets[0]!.credits+=20;diner(broke).credits=0;for(let i=0;i<12;i++)s=step(i?s:broke);expect(diner(s).meal).toBeUndefined();checkEconomyState(s,scene);
});
it('persists outbound and return paths and rejects forged meal phases, clocks and destinations',()=>{
 let s=step(start());for(let i=0;i<8;i++)s=step(s);const text=encodeSave(s,s.timeS,world),saved=JSON.parse(text);expect(decodeSave(text,world).state).toEqual(saved.state);
 for(const mutate of [(m:any)=>{m.phase='eat';},(m:any)=>{m.market='missing';},(m:any)=>{m.home.x+=1;},(m:any)=>{m.path=[{x:500,y:500}];},(m:any)=>{m.eatUntilS=1000;},(m:any)=>{m.id='missing';}]){const bad=structuredClone(saved);mutate(bad.state.economy.accounts.find((a:any)=>a.id==='regular').meal);expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow();}
 let a=s,b=decodeSave(text,world).state;for(let i=0;i<160;i++){a=step(a);b=step(b);}expect(b).toEqual(a);checkEconomyState(b,scene);
});
it('waits for physical contacts without losing the trip or buying at a distance',()=>{
 let s=step(start());for(let i=0;i<8;i++)s=step(s);const m=diner(s).meal!,before={x:m.x,y:m.y};s={...s,x:before.x-8,y:before.y};for(let i=0;i<8;i++)s=step(s);expect(diner(s).meal?.phase).toBe('out');expect(diner(s).credits).toBe(20);expect(commerceReason(s,scene,'regular',{kind:'work',job:'bake'})).toBe('busy');checkEconomyState(s,scene);
});
it('selects the first affordable stocked market in authored order and shares the final unit across customers',()=>{
 const changed=source.replace('markets=[corner]','markets=[corner,other]').replace('quantity=8,limit=16','quantity=0,limit=16').replace('economy(){','place other_keeper(object=pedestrian,at=[720,780],role=npc,behavior=welcome);\neconomy(){\n market other(label="Other shop",actor=other_keeper,credits=0,radius=70){lot shelf(good=bread,quantity=1,limit=4,price=6);}')
 .replace('account regular(actor=customer','account second(actor=other_guest,credits=20,capacity=4,satiety=25,drain_s=.05,meal=bakery_break);\n account regular(actor=customer').replace('economy(){','place other_guest(object=pedestrian,at=[800,760],role=npc,behavior=welcome);\neconomy(){');
 const other=compileDreamScene(changed,{sceneId:'two',revisionId:'r1',sourceHash:'two'});let s:CarState={...createCarAtSpawn(other),control:{kind:'foot'},x:900,y:730,elevation:0,surface:'paper'};
 for(let i=0;i<160;i++){s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,other);if(i===0){const trips=s.economy!.accounts.filter(a=>a.meal);expect(trips).toHaveLength(2);expect(trips.every(a=>a.meal!.market==='other')).toBe(true);}checkEconomyState(s,other);}
 const buyers=s.economy!.accounts.filter(a=>['regular','second'].includes(a.id));expect(buyers.map(a=>a.credits).sort((a,b)=>a-b)).toEqual([14,20]);expect(buyers.every(a=>!a.meal && !a.inventory.bread)).toBe(true);expect(s.economy!.consumed.bread).toBe(1);expect(s.economy!.markets.find(m=>m.id==='other')!.credits).toBe(6);
});
