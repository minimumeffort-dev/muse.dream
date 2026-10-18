import {it,expect} from 'vitest';
import source from '../docs/examples/work-progression.dream?raw';
import deliverySource from '../docs/examples/market-delivery.dream?raw';
import {compileDreamScene,compileDreamWorld,formatDream,checkDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {createCarAtSpawn,resetCar,type CarState} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason,hasMilestone,type CommerceAction} from '../src/sim/commerce';
import {stepNpcs,npcSpeech,nearbyNpc} from '../src/sim/npcs';
import {encodeSave,decodeSave} from '../src/sim/save';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {dreamAgentContext} from '../src/scene/dream-agent';
const scene=compileDreamScene(source,{sceneId:'progression',revisionId:'r1',sourceHash:'progression'});
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const start=(doc=scene):CarState=>({...createCarAtSpawn(doc),control:{kind:'foot'},x:580,y:750,elevation:0,surface:'paper'});
const step=(s:CarState,action?:CommerceAction,doc=scene,dt=.25)=>stepCommerce({...s,timeS:s.timeS+dt},{commerce:action},dt,doc);
const manual=()=>parseScene({...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>({...a,works:undefined,shop:false}))}});
const finish=(s:CarState,doc:Scene)=>{for(let i=0;i<12 && account(s).work;i++)s=step(s,undefined,doc);return s;};
it('compiles, formats and exports milestone and ordered-work vocabulary, with located invalid references',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(compileDreamScene(formatDream(source),{sceneId:'progression',revisionId:'r1',sourceHash:'progression'})).toEqual(scene);
 expect(dreamAgentContext(['commerce']).contract.commands).toHaveProperty('milestone');
 for(const bad of [source.replace('task=bake','task=missing'),source.replace('kind=work,task=bake','kind=delivery,task=bake'),source.replace('count=3','count=0'),source.replace('count=3','count=1.5'),source.replace('count=3','count=1000000001'),source.replace('works=[large_bake,bake]','work=bake,works=[bake]'),source.replace('works=[large_bake,bake]','works=[bake,bake]'),source.replace('works=[large_bake,bake]','works=[bake,missing]'),source.replace('event=interact,to=recognized','event=near_player,to=recognized'),source.replace('requires=practiced_baker','requires=missing'),source.replace('target=7);','target=7,requires=practiced_baker);')])expect(checkDream(bad).ok,bad).toBe(false);
 const bad=checkDream(source.replace('task=bake','task=missing'));if(!bad.ok)expect(bad.diagnostics[0]!.path).toContain('/milestone:practiced_baker/task');
 expect(()=>compileDreamWorld(source.replace('target=7);','target=7,requires=other);').replace(' milestone practiced_baker',' milestone other(label="Other",kind=work,task=large_bake,count=1);\n milestone practiced_baker'))).toThrow('cycle');
 expect(()=>compileDreamScene(source.replace('behavior=customer_wait','behavior=welcome'),{sceneId:'bad',revisionId:'r1',sourceHash:'bad'})).toThrow('receiving market actor');
 expect(()=>compileDreamScene(source.slice(0,source.indexOf('economy(){')),{sceneId:'bad',revisionId:'r1',sourceHash:'bad'})).toThrow('economy milestone');
});
it('unlocks skilled work only after three personally completed batches, with atomic blocked requests and no credit for cancel',()=>{
 const doc=manual();let s=start(doc);const accepted=JSON.stringify(doc),initial=structuredClone(s);
 expect(commerceReason(s,doc,'pocket',{kind:'work',job:'large_bake'})).toBe('qualification');s=step(s,{kind:'work',job:'large_bake'},doc);expect(s.economy!.markets).toEqual(initial.economy!.markets);expect(account(s).credits).toBe(20);
 s=step(s,{kind:'work',job:'bake'},doc);s=step(s,{kind:'cancel'},doc);expect(account(s).completed.work.bake).toBe(0);
 for(let n=1;n<=3;n++){s=step(s,{kind:'work',job:'bake'},doc);expect(account(s).completed.work.bake).toBe(n-1);s=finish(s,doc);expect(account(s).completed.work.bake).toBe(n);checkEconomyState(s,doc);expect(hasMilestone(s,doc,'pocket','practiced_baker')).toBe(n===3);}
 expect(commerceReason(s,doc,'pocket',{kind:'work',job:'large_bake'})).toBeUndefined();s=finish(step(s,{kind:'work',job:'large_bake'},doc),doc);expect(account(s).completed.work.large_bake).toBe(1);expect(account(s).credits).toBe(34);expect(s.economy!.markets[0]!.stock.bread).toBe(12);checkEconomyState(s,doc);
 expect(resetCar(s,doc).economy).toEqual(s.economy);expect(resetCar(s,doc,true).economy).toEqual(initial.economy);expect(JSON.stringify(doc)).toBe(accepted);
});
it('lets NPCs earn their own qualifications and select eligible ordered work without unlocking the player',()=>{
 let s=start();for(let i=0;i<30;i++)s=step(s);
 expect(account(s,'baker').completed.work).toEqual({bake:3,large_bake:1});expect(account(s,'baker').credits).toBe(14);expect(s.economy!.batches).toEqual({bake:3,large_bake:1});expect(account(s).completed.work.bake).toBe(0);expect(commerceReason(s,scene,'pocket',{kind:'work',job:'large_bake'})).toBe('qualification');checkEconomyState(s,scene);
 const fresh=start();expect(fresh.economy!.batches.bake).toBe(0);expect(fresh.economy!.unattributed.work.bake).toBe(0);
});
it('recognizes the player contribution through a guarded conversation while retaining familiarity, range and sight rules',()=>{
 const doc=manual();let s=start(doc);expect(stepNpcs(s,.01,doc,true)[0]!.stateId).toBe('hello');
 for(let i=0;i<3;i++)s=finish(step(s,{kind:'work',job:'bake'},doc),doc);
 s={...s,npcs:stepNpcs(s,.01,doc,true)};expect(s.npcs[0]!.stateId).toBe('recognized');expect(npcSpeech(s,doc)?.text).toContain('larger batch');expect(s.npcs[0]!.known).toBe(true);
 expect(nearbyNpc({...start(doc),grounded:false},doc)).toBeUndefined();expect(nearbyNpc({...start(doc),control:{kind:'car'}},doc)).toBeUndefined();expect(nearbyNpc({...start(doc),x:1000},doc)).toBeUndefined();
 const noFallback=compileDreamScene(source.replace('on talk(event=interact,to=hello,radius=55,familiar=false);on again(event=interact,to=returning,radius=55,familiar=true);','').replace(/\n  state (hello|returning|about)\([\s\S]*?\n  }/g,''),{sceneId:'guarded',revisionId:'r1',sourceHash:'guarded'});
 expect(nearbyNpc(start(noFallback),noFallback)).toBeUndefined();
});
it('acknowledges a completed delivery, not collection, cancellation an unfinished handoff',()=>{
 const text=deliverySource.replace('economy(){','economy(){milestone supplied(label="Supply the canteen",kind=delivery,task=lunch_run,count=1);');
 const base=compileDreamScene(text,{sceneId:'thanks',revisionId:'r1',sourceHash:'thanks'}),recipient=base.economy!.markets.find(m=>m.id==='lunch_counter')!.actor;
 const b={id:'thanks',start:'wait',states:[{id:'wait',action:'idle',transitions:[{id:'thank',event:'interact',radius:70,to:'helped',requires:'supplied'}]},{id:'helped',action:'idle',say:'Thank you for the bread.',transitions:[{id:'back',event:'after',to:'wait',seconds:6}]}]};
 const doc=parseScene({...base,behaviors:[...base.behaviors,b],objects:base.objects.map(o=>o.id===recipient ? {...o,behavior:b.id} : o)});let s=start(doc),idx=s.npcs.findIndex(n=>n.id===recipient);
 s=step(s,{kind:'collect',delivery:'lunch_run'},doc);expect(account(s).completed.delivery.lunch_run).toBe(0);s=step(s,{kind:'cancel'},doc);expect(hasMilestone(s,doc,'pocket','supplied')).toBe(false);
 s=step(s,{kind:'collect',delivery:'lunch_run'},doc);s=step({...s,x:1100},{kind:'deliver'},doc);expect(account(s).completed.delivery.lunch_run).toBe(1);s={...s,npcs:stepNpcs(s,.01,doc,true)};expect(s.npcs[idx]!.stateId).toBe('helped');expect(npcSpeech({...s,timeS:s.timeS+.01},doc)?.text).toContain('Thank you');checkEconomyState(s,doc);
 const again=step(s,{kind:'deliver'},doc);expect(account(again).completed.delivery.lunch_run).toBe(1);
});
it('persists personal completion and qualified active work, rejects forged history and replays one reward',()=>{
 const doc=manual(),world={scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(4000,2400),carRadius:11};let s=start(doc);s.vehicles=[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}];
 for(let i=0;i<3;i++)s=finish(step(s,{kind:'work',job:'bake'},doc),doc);s=step(s,{kind:'work',job:'large_bake'},doc);const packet=encodeSave(s,45,world),copy=decodeSave(packet,world);expect(copy.state.economy).toEqual(s.economy);const complete=finish(copy.state,doc);expect(account(complete).completed.work.large_bake).toBe(1);checkEconomyState(complete,doc);
 for(const change of [(e:any)=>{e.accounts[0].completed.work.bake++;},(e:any)=>{e.accounts[0].completed.work.unknown=0;},(e:any)=>{e.unattributed.work.bake=-1;e.accounts[0].completed.work.bake++;},(e:any)=>{e.accounts[0].completed.work.bake=2.5;e.unattributed.work.bake=.5;},(e:any)=>{delete e.accounts[0].completed;},(e:any)=>{e.accounts[0].completed.work.bake=0;e.accounts[1].completed.work.bake=3;}]){const bad=JSON.parse(packet);change(bad.state.economy);expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow();}
});
