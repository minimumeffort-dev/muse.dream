import {it,expect} from 'vitest';
import source from '../docs/examples/work-commute.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason,refundDamagedWork} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {actorPose} from '../src/sim/actors';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
const compile=(text=source)=>compileDreamScene(text,{sceneId:'work-trip',revisionId:'r1',sourceHash:'work-trip'});
const scene=compile(),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const diner=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!;
const start=(s=scene):CarState=>({...createCarAtSpawn(s),control:{kind:'foot'},x:900,y:730,elevation:0,surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]});
const step=(s:CarState,doc=scene,commerce?:import('../src/sim/commerce').CommerceAction)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc)},{commerce},.25,doc);
it('compiles opt-in work travel and rejects invalid roles, ownership, grounds and routes',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));
 for(const [a,b] of [['commute=true','commute=false'],['commute=true,on=plaza','commute=true'],['works=[bake]','works=[]'],['actor=customer','actor=player'],['commute=true','commute=true,shop=true'],['on=plaza','on=missing'],['on=plaza','on=plaza,grounds=[plaza]'],['on=plaza','on=plaza,grounds=[missing]'],['kind=walk,mode=shuttle','kind=street,mode=shuttle']] as const)expect(checkDream(source.replace(a,b)).ok,b).toBe(false);
 expect(()=>compile(source.replace('[780,730]','[1200,730]'))).toThrow();
});
it('walks to work before reserving stock or wages, receives one paid batch and returns to the interrupted route',()=>{
 const snapshot=JSON.stringify(scene);let s=step(start());const trip=diner(s).commute!,home={...trip.home},clock=structuredClone(s.npcs.find(n=>n.id==='customer'));
 expect(trip.phase).toBe('out');expect(commerceReason(s,scene,'pocket',{kind:'work',job:'bake'})).toBe('range');expect(diner(s).work).toBeUndefined();expect(diner(s).credits).toBe(20);expect(s.economy!.markets[0]!.credits).toBe(100);expect(s.economy!.markets[0]!.stock.flour).toBe(12);
 const first=trip.x;let worked=false,paid=false;
 for(let i=0;i<300 && diner(s).commute;i++){
  s=step(s);checkEconomyState(s,scene);expect(s.npcs.find(n=>n.id==='customer')).toEqual(clock);
  if(diner(s).commute?.phase==='work'){worked=true;expect(diner(s).work?.id).toBe('bake');expect(diner(s).credits).toBe(20);expect(s.economy!.markets[0]!.credits).toBe(97);expect(s.economy!.markets[0]!.stock.flour).toBe(11);}
  if(diner(s).commute?.phase==='home')paid=true;
 }
 expect(worked && paid).toBe(true);expect(diner(s).commute).toBeUndefined();expect(diner(s).credits).toBe(23);expect(diner(s).completed.work.bake).toBe(1);expect(s.economy!.batches.bake).toBe(1);expect(s.economy!.markets[0]!.stock.bread).toBe(4);
 const object=scene.objects.find(o=>o.id==='customer')!,p=actorPose(scene,object,s.timeS,s);expect([p.x,p.y]).toEqual([home.x,home.y]);expect(first).toBe(home.x);s=step(s);const next=actorPose(scene,object,s.timeS,s);expect(Math.hypot(next.x-home.x,next.y-home.y)).toBeLessThanOrEqual(2.51);expect(JSON.stringify(scene)).toBe(snapshot);
});
it('rechecks the same capacity as the player on arrival and returns without an unearned wage',()=>{
 let s=step(start());for(let i=0;i<100 && Math.hypot(diner(s).commute!.x-diner(s).commute!.at.x,diner(s).commute!.y-diner(s).commute!.at.y)>8;i++)s=step(s);
 s=step({...s,x:580,y:760},scene,{kind:'work',job:'bake'});expect(s.economy!.accounts[0]!.work?.id).toBe('bake');
 for(let i=0;i<240 && diner(s).commute;i++)s=step(s);
 expect(diner(s).credits).toBe(20);expect(diner(s).completed.work.bake).toBe(0);expect(s.economy!.accounts[0]!.credits).toBe(23);expect(s.economy!.batches.bake).toBe(1);checkEconomyState(s,scene);
});
it('persists outbound, active-work and return ownership and rejects forged paths and jobs',()=>{
 let s=step(start());const seen=new Set<string>();
 for(let i=0;i<240 && diner(s).commute;i++){
  const phase=diner(s).commute!.phase;if(!seen.has(phase)){
   seen.add(phase);const text=encodeSave(s,s.timeS,world),packet=JSON.parse(text);expect(decodeSave(text,world).state).toEqual(packet.state);expect(resetCar(s,scene).economy).toEqual(s.economy);
   for(const mutate of [(t:any)=>t.id='missing',(t:any)=>t.home.x+=1,(t:any)=>t.at.x+=1000,(t:any)=>t.routeAtS=s.timeS+5,(t:any)=>t.path=[{x:300,y:300}]]){const bad=structuredClone(packet);mutate(bad.state.economy.accounts.find((a:any)=>a.id==='regular').commute);expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow();}
   if(phase==='work'){const bad=structuredClone(packet);delete bad.state.economy.accounts.find((a:any)=>a.id==='regular').commute;expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow('invalid');}
  }
  s=step(s);
 }
 expect([...seen].sort()).toEqual(['home','out','work']);
});
it('holds a blocked walk without paying or advancing the program and resumes when the player clears it',()=>{
 let s=step(start()),t=diner(s).commute!;s={...s,x:t.x-5,y:t.y};const x=t.x;
 for(let i=0;i<5;i++)s=step(s);expect(diner(s).commute!.x).toBe(x);expect(diner(s).credits).toBe(20);expect(diner(s).work).toBeUndefined();
 s={...s,x:900,y:730};for(let i=0;i<300 && diner(s).commute;i++)s=step(s);expect(diner(s).credits).toBe(23);checkEconomyState(s,scene);
});
it('takes an available hungry meal before work and keeps food and commute claims separate',()=>{
 const both=compile(source.replace('satiety=65,drain_s=.05,works=','satiety=25,drain_s=.05,meal=bakery_break,works='));let s=step(start(both),both);expect(diner(s).meal?.phase).toBe('out');expect(diner(s).commute).toBeUndefined();
 for(let i=0;i<500 && !diner(s).commute;i++){s=step(s,both);checkEconomyState(s,both);expect(!(diner(s).meal && diner(s).commute)).toBe(true);}
 expect(diner(s).commute?.phase).toBe('out');expect(s.economy!.consumed.bread).toBe(1);expect(diner(s).credits).toBe(15);
});

it('refunds interrupted workplace inputs once and releases the commute without mutating the prior frame',()=>{
 const table='object worktable(label="Work table"){measure(kind=table,axis=x,meters=2);body(interaction=solid,radius=12,height=11);impact(mode=break(speed=95,scatter=50,lift=50,spin=3,lifetime=6));part top(shape=box,material=wood,at=[0,10,0],size=[20,2,12]);repeat legs(index=i,count=2){part a(shape=box,material=wood,at=[i*14-7,4,4],size=[2,8,2]);part b(shape=box,material=wood,at=[i*14-7,4,-4],size=[2,8,2]);}}';
 const doc=compile(source.replace('world(size=',table+'\nplace kneading_table(object=worktable,at=[620,760],role=prop);\nworld(size=').replace('target=4);','target=4,equipment=[kneading_table]);'));
 let s=step(start(doc),doc);for(let i=0;i<160 && diner(s).commute?.phase!=='work';i++)s=step(s,doc);
 expect(diner(s).work).toBeDefined();const before=JSON.stringify(s),next=refundDamagedWork({...s,broken:['kneading_table']},doc);
 expect(JSON.stringify(s)).toBe(before);expect(diner(next).work).toBeUndefined();expect(diner(next).commute?.phase).toBe('home');expect(diner(next).credits).toBe(20);expect(next.economy!.markets[0]!).toMatchObject({credits:100,stock:{flour:12,bread:2}});checkEconomyState(next,doc);
 const twice=refundDamagedWork(next,doc);expect(twice.economy).toEqual(next.economy);expect(encodeSave(twice,twice.timeS,{...world,scene:doc})).toBeTypeOf('string');
});


it('retains the ordinary owned-food rule during a work trip',()=>{
 let s=step(start());diner(s).inventory.bread=1;s.economy!.markets[0]!.stock.bread!--;
 expect(commerceReason(s,scene,'regular',{kind:'eat',good:'bread'})).toBeUndefined();
 expect(commerceReason(s,scene,'regular',{kind:'eat',good:'flour'})).toBe('not_food');checkEconomyState(s,scene);
});
