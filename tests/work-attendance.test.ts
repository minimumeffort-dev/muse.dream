import {it,expect} from 'vitest';
import source from '../docs/examples/scheduled-workday.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {stepNpcs} from '../src/sim/npcs';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {encodeSave,decodeSave} from '../src/sim/save';
import {attendanceOpen,attendanceEnd} from '../src/sim/attendance';
import {actorPose} from '../src/sim/actors';
const compile=(text=source)=>compileDreamScene(text,{sceneId:'attendance',revisionId:'r1',sourceHash:'attendance'}),scene=compile();
const world=(doc=scene):World=>({scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(4000,2400),carRadius:11});
const worker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!,pocket=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='pocket')!;
const start=(doc=scene):CarState=>({...createCarAtSpawn(doc),control:{kind:'foot'},x:900,y:730,elevation:0,vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]});
const tick=(s:CarState,doc=scene,commerce?:import('../src/sim/commerce').CommerceAction)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc)},{commerce},.25,doc);
function idle(doc=scene){let s=start(doc);for(let i=0;i<400 && worker(s).commute?.phase!=='idle';i++)s=tick(s,doc);expect(worker(s).commute?.phase).toBe('idle');return s;}
it('compiles a bounded daily attendance policy and rejects missing clock, commute or multiple workplaces',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(compile(source.replace('attendance=[8,17]','attendance=[4*2,17]')).economy!.accounts.find(a=>a.id==='regular')!.attendance).toEqual([8,17]);
 for(const [from,to] of [['attendance=[8,17]','attendance=[17,17]'],['attendance=[8,17]','attendance=[-1,17]'],['commute=true','commute=false'],['daylight(cycle_s=240,start_hour=8);','']] as const)expect(checkDream(source.replace(from,to)).ok).toBe(false);
 const extra='place branch_vendor(object=pedestrian,at=[640,710],role=npc,behavior=welcome);economy(){market branch(label="Branch",actor=branch_vendor,credits=100,radius=70){lot b(good=bread,quantity=0,limit=16,price=5);lot f(good=flour,quantity=0,limit=12);}work other_job(label="Other job",market=branch,input=flour,take=1,output=bread,make=2,seconds=2,pay=3,effort=12,capacity=1,target=4);';
 const multi=source.replace('economy(){',extra).replace('works=[bake]','works=[bake,other_job]'),bad=checkDream(multi);expect(bad.ok).toBe(false);if(!bad.ok)expect(bad.diagnostics[0]!.path).toContain('attendance');expect(checkDream(multi.replace(',attendance=[8,17]','')).ok).toBe(true);
 expect(attendanceOpen(scene,[22,6],0)).toBe(false);expect(attendanceEnd({...scene,daylight:{cycleSeconds:240,startHour:23}},[22,6],0)).toBeCloseTo(70);expect(attendanceEnd({...scene,daylight:{cycleSeconds:240,startHour:0}},[0,24],0)).toBe(240);
});
it('arrives with full shelves, waits without pay or reservations, and walks home after the same workday',()=>{
 let s=idle(),home=worker(s).commute!.home,clock=structuredClone(s.npcs.find(n=>n.id==='customer')),snapshot=JSON.stringify(scene),position=actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s);
 expect(worker(s).credits).toBe(20);expect(s.economy!.markets[0]!.credits).toBe(100);expect(s.economy!.markets[0]!.stock).toEqual({bread:4,flour:12});expect(worker(s).work).toBeUndefined();
 for(let i=0;i<40;i++){s=tick(s);expect(s.npcs.find(n=>n.id==='customer')).toEqual(clock);}expect(actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s)).toMatchObject({x:position.x,y:position.y,activity:'idle',speed:0});
 for(let i=0;i<600 && worker(s).commute;i++)s=tick(s);expect(worker(s).commute).toBeUndefined();expect(worker(s).credits).toBe(20);expect(worker(s).completed.work.bake).toBe(0);expect(actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s)).toMatchObject(home);expect(JSON.stringify(scene)).toBe(snapshot);checkEconomyState(s,scene);
});
it('uses real player purchases to create work, pays once per batch and stays on duty between jobs',()=>{
 let s=idle();s=tick({...s,x:580,y:760},scene,{kind:'buy',market:'corner',good:'bread'});for(let i=0;i<4 && !worker(s).work;i++)s=tick(s);expect(worker(s).commute?.phase).toBe('work');expect(worker(s).work?.id).toBe('bake');expect(pocket(s).credits).toBe(15);
 for(let i=0;i<12;i++)s=tick(s);expect(worker(s).credits).toBe(23);expect(worker(s).completed.work.bake).toBe(1);expect(worker(s).commute?.phase).toBe('idle');expect(s.economy!.markets[0]!.stock.bread).toBe(5);
 for(let i=0;i<16;i++)s=tick(s);expect(worker(s).credits).toBe(23);expect(worker(s).commute?.phase).toBe('idle');
 for(let i=0;i<2;i++)s=tick(s,scene,{kind:'buy',market:'corner',good:'bread'});for(let i=0;i<20 && worker(s).completed.work.bake!<2;i++)s=tick(s);expect(worker(s).credits).toBe(26);expect(worker(s).commute?.phase).toBe('idle');expect(s.economy!.markets[0]!.stock.flour).toBe(10);checkEconomyState(s,scene);
});
it('finishes a committed batch after the attendance window closes and then returns without another job',()=>{
 let s=idle();while(s.timeS<88.25)s=tick(s);s=tick({...s,x:580,y:760},scene,{kind:'buy',market:'corner',good:'bread'});for(let i=0;i<4 && !worker(s).work;i++)s=tick(s);expect(worker(s).work).toBeDefined();const deadline=attendanceEnd(scene,[8,17],worker(s).commute!.dutyAtS!);
 while(s.timeS<deadline+.25)s=tick(s);expect(worker(s).work).toBeDefined();expect(worker(s).credits).toBe(20);for(let i=0;i<120 && worker(s).commute;i++)s=tick(s);expect(worker(s).credits).toBe(23);expect(worker(s).completed.work.bake).toBe(1);expect(worker(s).commute).toBeUndefined();checkEconomyState(s,scene);
});
it('preserves outbound, unpaid waiting, paid work and return through reload, rejecting invented duty or wait poses',()=>{
 let s=start(),bought=false;const seen=new Set<string>();
 for(let i=0;i<600;i++){
  s=tick(s);const trip=worker(s).commute;if(!trip){if(seen.has('home'))break;continue;}
  if(!seen.has(trip.phase)){seen.add(trip.phase);const text=encodeSave(s,s.timeS,world());expect(decodeSave(text,world()).state).toEqual(JSON.parse(text).state);expect(resetCar(s,scene).economy).toEqual(s.economy);
   for(const mutate of [(t:any)=>t.dutyAtS=s.timeS+1,(t:any)=>t.dutyAtS=-1,(t:any)=>{delete t.dutyAtS;t.phase='idle';}]){const bad=JSON.parse(text);mutate(bad.state.economy.accounts.find((a:any)=>a.id==='regular').commute);expect(()=>decodeSave(JSON.stringify(bad),world())).toThrow();}
  }
  if(trip.phase==='idle' && !bought){s=tick({...s,x:580,y:760},scene,{kind:'buy',market:'corner',good:'bread'});bought=true;}
 }
 expect([...seen].sort()).toEqual(['home','idle','out','work']);
});
it('returns for an affordable meal without losing its earned wages or reserving another job',()=>{
 const doc=compile(source.replace('attendance=[8,17]','attendance=[8,22],meal=bakery_break').replace('satiety=65,drain_s=.05,works=','satiety=65,drain_s=.25,works='));let s=idle(doc),returned=false;
 for(let i=0;i<600 && !worker(s).meal;i++){s=tick(s,doc);returned ||= worker(s).commute?.phase==='home';}expect(returned).toBe(true);expect(worker(s).meal?.phase).toBe('out');expect(worker(s).commute).toBeUndefined();expect(worker(s).credits).toBe(20);checkEconomyState(s,doc);
});

it('lets a hungry resident earn a feasible wage when a meal is unaffordable',()=>{
 const doc=compile(source.replace('account regular(actor=customer,credits=20,capacity=4,satiety=65','account regular(actor=customer,credits=0,capacity=4,satiety=25').replace('attendance=[8,17]','attendance=[8,17],meal=bakery_break').replace('capacity=1,target=4);','capacity=1,target=5);'));let s=start(doc);
 for(let i=0;i<400 && !worker(s).work;i++)s=tick(s,doc);expect(worker(s).commute?.phase).toBe('work');expect(worker(s).credits).toBe(0);expect(worker(s).meal).toBeUndefined();
 for(let i=0;i<20 && worker(s).work;i++)s=tick(s,doc);expect(worker(s).credits).toBe(3);expect(worker(s).completed.work.bake).toBe(1);expect(worker(s).commute?.phase).toBe('idle');expect(worker(s).meal).toBeUndefined();checkEconomyState(s,doc);
});
it('returns for ordinary seated energy recovery and never holds a rest claim while still attending work',()=>{
 const plan='rest after_work(energy=40,drain_s=.25,recover_s=5,below=25,until=85,seats=[lunch_bench],on=plaza);';
 const doc=compile(source.replace('economy(){','economy(){\n '+plan).replace('commute=true,attendance=[8,17]','rest=after_work,commute=true,attendance=[8,22]'));let s=idle(doc),returned=false;
 for(let i=0;i<600 && !worker(s).resting;i++){s=tick(s,doc);returned ||= worker(s).commute?.phase==='home';}expect(returned).toBe(true);expect(worker(s).resting?.phase).toBe('out');expect(worker(s).commute).toBeUndefined();expect(worker(s).credits).toBe(20);checkEconomyState(s,doc);
});
it('waits for real supplies without minting wages',()=>{
 const doc=compile(source.replace('flour,quantity=12','flour,quantity=0'));let s=idle(doc);for(let i=0;i<12;i++)s=tick(s,doc);expect(worker(s).credits).toBe(20);expect(worker(s).work).toBeUndefined();expect(s.economy!.batches.bake).toBe(0);checkEconomyState(s,doc);
});
it('uses its own completed work to unlock the next preferred job without another commute or free credit',()=>{
 const extra='milestone practice(label="Practice",kind=work,task=bake,count=1);work large(label="Large batch",market=corner,input=flour,take=2,output=bread,make=5,seconds=3,pay=5,effort=16,capacity=1,target=6,requires=practice);';
 const doc=compile(source.replace('works=[bake]','works=[large,bake]').replace('economy(){','economy(){\n '+extra));let s=idle(doc);const home={...worker(s).commute!.home},departure=worker(s).commute!.dutyAtS;s=tick({...s,x:580,y:760},doc,{kind:'buy',market:'corner',good:'bread'});
 for(let i=0;i<40 && worker(s).completed.work.large!<1;i++)s=tick(s,doc);expect(worker(s).completed.work).toEqual({bake:1,large:1});expect(worker(s).credits).toBe(28);expect(worker(s).commute).toMatchObject({phase:'idle',home,dutyAtS:departure});checkEconomyState(s,doc);
});

it('shares the real work-capacity limit with the player while remaining unpaid at the workplace',()=>{
 const doc=compile(source.replace('seconds=2,pay=3','seconds=20,pay=3'));let s=tick({...start(doc),x:580,y:760},doc,{kind:'work',job:'bake'});for(let i=0;i<100 && worker(s).commute?.phase!=='idle';i++)s=tick(s,doc);expect(worker(s).commute?.phase).toBe('idle');expect(pocket(s).work?.id).toBe('bake');expect(commerceReason(s,doc,'regular',{kind:'work',job:'bake'})).toBe('busy');expect(worker(s).credits).toBe(20);for(let i=0;i<50 && pocket(s).work;i++)s=tick(s,doc);expect(pocket(s).credits).toBe(23);expect(worker(s).credits).toBe(20);checkEconomyState(s,doc);
});
it('refunds an interrupted batch once and returns the scheduled worker without mutating the prior frame',()=>{
 const doc=compile(source.replace('at=[690,775]','at=[620,760]').replace('capacity=1,target=4);','capacity=1,target=4,equipment=[lunch_bench]);'));let s=idle(doc);s=tick({...s,x:580,y:760},doc,{kind:'buy',market:'corner',good:'bread'});for(let i=0;i<4 && !worker(s).work;i++)s=tick(s,doc);expect(worker(s).work).toBeDefined();const before=JSON.stringify(s),damaged={...s,broken:['lunch_bench']},next=tick(damaged,doc);expect(JSON.stringify(s)).toBe(before);expect(worker(next).commute?.phase).toBe('home');expect(worker(next).work).toBeUndefined();expect(worker(next).credits).toBe(20);expect(next.economy!.markets[0]!).toMatchObject({credits:105,stock:{bread:3,flour:12}});expect(tick(next,doc).economy!.markets[0]!).toMatchObject({credits:105,stock:{bread:3,flour:12}});checkEconomyState(next,doc);
});
