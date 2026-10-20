import {it,expect} from 'vitest';
import source from '../docs/examples/courier-resupply.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason,hasMilestone,initialEconomy} from '../src/sim/commerce';
import {actorPose,workJourneyForActor} from '../src/sim/actors';
import {stepNpcs} from '../src/sim/npcs';
import {encodeSave,decodeSave} from '../src/sim/save';
import {onWalkway} from '../src/scene/sites';
import {deliveryArea} from '../src/sim/courier';
import {indoorServiceUpgrade} from '../src/sim/indoor-service-upgrade';
import {workSegment} from '../src/sim/work-navigation';
import {repairNavigation,primeRepairNavigation} from '../src/sim/repair';
const scene=compileDreamScene(source,{sceneId:'courier',revisionId:'r1',sourceHash:'courier'}),d=scene.economy!.deliveries[0]!;
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const start=():CarState=>({...createCarAtSpawn(scene),control:{kind:'foot'},x:560,y:740,elevation:0,surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}],broken:['yard_table','remote_table']});
const worker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!;
const step=(s:CarState)=>stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);
it('retargets real pickup, cargo and home journeys when the receiving counter moves, paying once',()=>{
 const moved=compileDreamScene(source.replace('at=[580,710]','at=[600,710]').replace('at=[620,730]','at=[630,750]'),{sceneId:'courier',revisionId:'r2',sourceHash:'moved'}),nextWorld={...world,scene:moved};
 const phases=new Map<string,CarState>();let state=start();
 for(let i=0;i<2200 && phases.size<3;i++){state=step(state);const phase=worker(state).courier?.phase;if(phase && !phases.has(phase))phases.set(phase,structuredClone(state));}
 expect([...phases.keys()]).toEqual(['pickup','dropoff','home']);
 for(const [phase,before] of phases){
  let next=indoorServiceUpgrade(before,scene,nextWorld);checkEconomyState(next,moved);
  expect(next.economy!.markets,phase).toEqual(before.economy!.markets);expect(worker(next).delivery,phase).toEqual(worker(before).delivery);
  expect(worker(next).credits,phase).toBe(worker(before).credits);expect(worker(next).courier!.distance,phase).toBe(worker(before).courier!.distance);
  next=decodeSave(encodeSave(next,next.timeS,nextWorld),nextWorld).state;
  for(let i=0;i<2200 && worker(next).courier;i++)next=stepCommerce({...next,timeS:next.timeS+.25},{},.25,moved);
  expect(worker(next).courier,phase).toBeUndefined();expect(next.economy!.delivered.kits_run,phase).toBe(1);expect(worker(next).completed.delivery.kits_run,phase).toBe(1);checkEconomyState(next,moved);
 }
});
it('validates bounded courier policies, grounded endpoints and connected public walking',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));
 for(const [a,b] of [['deliveries=[kits_run]','deliveries=[missing]'],['deliveries=[kits_run]','deliveries=[kits_run,kits_run]'],['deliveries=[kits_run]','deliveries=[]'],['actor=customer','actor=depot_keeper'],['on=work_yard,grounds=[remote_yard]','on=work_yard,grounds=[work_yard]'],['on=work_yard,grounds=[remote_yard]','on=remote_yard,grounds=[work_yard]'],['at=[1120,970]','at=[1120,1100]']] as const)expect(()=>compileDreamScene(source.replace(a,b),{sceneId:'bad',revisionId:'r1',sourceHash:'bad'}),b).toThrow();
 expect(()=>compileDreamScene(source.replace('[[1080,884],[1260,884]','[[1080,910],[1260,910]'),{sceneId:'gap',revisionId:'r1',sourceHash:'gap'})).toThrow('connected');
 expect(()=>compileDreamScene(source.replace('at=[1160,970]','at=[760,780]')+'\nhill depot_peak(at=[1120,970],radius=[120,120],height=320);',{sceneId:'peak',revisionId:'r1',sourceHash:'peak'})).toThrow('needs connected delivery grounds');
 expect(workSegment(scene,deliveryArea(d),{x:1100,y:810},{x:1100,y:900},start())).toBe(false);
 const packet=repairNavigation(scene),copy={...scene};expect(packet.services.filter(s=>s.id.startsWith('delivery/'))).toHaveLength(1);expect(()=>primeRepairNavigation(copy,packet)).not.toThrow();
});
it('repairs first, walks for conserved supplies, hands them over once and returns without teleporting',()=>{
 let s=start(),last={x:620,y:730},crossed=false,phases=new Set<string>(),paid=0,collect=0,started=false;
 for(let i=0;i<2200;i++){
  const before=s;s=step(s);const a=worker(s),t=a.courier??a.repair;
  if(t){expect(Math.hypot(t.x-last.x,t.y-last.y)).toBeLessThanOrEqual(3.501);last={x:t.x,y:t.y};if(t.y>816 && t.y<884){expect(onWalkway(scene,t.x,t.y,4)).toBe(true);crossed=true;}}
  if(a.courier){started=true;phases.add(a.courier.phase);expect(s.economy!.repaired.yard_furniture).toBe(2);const p=actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s);expect(workJourneyForActor(s,scene,'customer')).toBe(a.courier);expect([p.x,p.y]).toEqual([a.courier.x,a.courier.y]);if(a.courier.phase==='pickup'){expect(a.delivery).toBeUndefined();expect(s.economy!.markets[1]!.stock.kit).toBe(12);} }
  if(!worker(before).delivery && a.delivery)collect++;
  if((s.economy!.delivered.kits_run??0)>(before.economy!.delivered.kits_run??0))paid++;
  checkEconomyState(s,scene);
  if(a.courier && i%17===0){const restored=decodeSave(encodeSave(s,s.timeS,world),world).state;expect(restored).toEqual(s);const old=s.npcs;expect(stepNpcs(s,.25,scene).find(n=>n.id==='customer')).toEqual(old.find(n=>n.id==='customer'));}
  if(started && !a.courier)break;
 }
 expect(phases).toEqual(new Set(['pickup','dropoff','home']));expect(crossed).toBe(true);expect(collect).toBe(1);expect(paid).toBe(1);expect(s.economy!.delivered.kits_run).toBe(1);expect(s.economy!.markets[0]!.stock.kit).toBe(3);expect(s.economy!.markets[1]!.stock.kit).toBe(10);expect(s.economy!.markets[1]!.credits).toBe(6);expect(worker(s).courier).toBeUndefined();expect(worker(s).credits).toBe(32);checkEconomyState(s,scene);
});
it('waits at a blocked crossing, retains the real pickup phase through saves, and resumes',()=>{
 let s=start();for(let i=0;i<1400 && !worker(s).courier;i++)s=step(s);expect(worker(s).courier?.phase).toBe('pickup');
 s={...s,vehicles:[{id:null,x:900,y:850,elevation:0,headingRad:0,distance:0}]};for(let i=0;i<420;i++)s=step(s);
 expect(worker(s).courier?.phase).toBe('pickup');expect(worker(s).delivery).toBeUndefined();expect(worker(s).courier!.y).toBeLessThan(840);expect(s.economy!.markets[1]!.stock.kit).toBe(12);
 const backup=encodeSave(s,s.timeS,world),saved=JSON.parse(backup);
 for(const mutate of [(j:any)=>{j.state.economy.accounts.find((a:any)=>a.id==='regular').courier.phase='dropoff';},(j:any)=>{j.state.economy.accounts.find((a:any)=>a.id==='regular').courier.at={x:300,y:300};},(j:any)=>{j.state.economy.accounts.find((a:any)=>a.id==='regular').courier.path=[{x:1100,y:900}];}]){const bad=structuredClone(saved);mutate(bad);expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow('invalid');}
 s={...decodeSave(backup,world).state,vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]};for(let i=0;i<1500 && worker(s).courier;i++)s=step(s);expect(s.economy!.delivered.kits_run).toBe(1);expect(worker(s).courier).toBeUndefined();checkEconomyState(s,scene);
});
it('rechecks a shelf filled by another delivery and walks home without minting or refunding uncollected cargo',()=>{
 const otherSource=source.replace(' repair yard_furniture(', ' delivery other(label="Another courier",from=depot,to=corner,good=kit,quantity=2,pay=4,price=3,capacity=1);\n repair yard_furniture('),other=compileDreamScene(otherSource,{sceneId:'other',revisionId:'r1',sourceHash:'other'});
 const tick=(s:CarState,commerce?:import('../src/sim/commerce').CommerceAction)=>stepCommerce({...s,timeS:s.timeS+.25},{commerce},.25,other);
 let s:CarState={...start(),economy:initialEconomy(other)};for(let i=0;i<1400 && !worker(s).courier;i++)s=tick(s);expect(worker(s).courier?.phase).toBe('pickup');
 const atHome={x:s.x,y:s.y};s=tick({...s,x:1120,y:970},{kind:'collect',delivery:'other'});expect(s.economy!.accounts[0]!.delivery?.id).toBe('other');s=tick({...s,x:580,y:710},{kind:'deliver'});s={...s,...atHome};expect(s.economy!.markets[0]!.stock.kit).toBe(3);
 const before=structuredClone(s.economy!.markets),credits=worker(s).credits;for(let i=0;i<1500 && worker(s).courier;i++)s=tick(s);
 expect(worker(s).courier).toBeUndefined();expect(s.economy!.delivered.kits_run).toBe(0);expect(s.economy!.delivered.other).toBe(1);expect(s.economy!.markets).toEqual(before);expect(worker(s).credits).toBe(credits);checkEconomyState(s,other);
});
it('reserves one courier slot without reserving goods or a wage on the walk to pickup',()=>{
 let s=start();for(let i=0;i<1400 && !worker(s).courier;i++)s=step(s);expect(worker(s).courier?.phase).toBe('pickup');
 expect(s.economy!.markets[1]!.stock.kit).toBe(12);expect(s.economy!.markets[1]!.credits).toBe(0);expect(s.economy!.markets[0]!.credits).toBeGreaterThanOrEqual(92);
 const inDepot={...s,x:1120,y:970};expect(commerceReason(inDepot,scene,'pocket',{kind:'collect',delivery:'kits_run'})).toBe('busy');
 const packet=repairNavigation(scene);expect(packet.services.filter(s=>s.id.startsWith('delivery/'))).toHaveLength(1);
});

it('records a physical NPC handoff for that courier without qualifying the player',()=>{
 const doc=compileDreamScene(source.replace('economy(){','economy(){milestone supplied(label="Bring repair supplies",kind=delivery,task=kits_run,count=1);'),{sceneId:'personal-courier',revisionId:'r1',sourceHash:'personal-courier'});let s:CarState={...start(),economy:initialEconomy(doc)};
 for(let i=0;i<2200 && !s.economy!.delivered.kits_run;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,doc);
 expect(worker(s).completed.delivery.kits_run).toBe(1);expect(s.economy!.accounts[0]!.completed.delivery.kits_run).toBe(0);expect(hasMilestone(s,doc,'regular','supplied')).toBe(true);expect(hasMilestone(s,doc,'pocket','supplied')).toBe(false);checkEconomyState(s,doc);
});
