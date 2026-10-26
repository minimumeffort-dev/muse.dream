import {it,expect,afterEach} from 'vitest';
import source from '../docs/examples/service-visits.dream?raw';
import {worldModules} from '../src/scene/world-fixture';
import {compileDreamScene,checkDream} from '../src/scene/dream';
import {parseScene} from '../src/scene/schema';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,commerceReason,checkEconomyState,serviceRemaining} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {workstation} from '../src/scene/workstations';
import {worldSeats} from '../src/scene/seating';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {actorPose} from '../src/sim/actors';
import {seatClaimed} from '../src/sim/seating';
import {toggleRide} from '../src/sim/interaction';
const scene=compileDreamScene(source,{sceneId:'service-visits',revisionId:'r1',sourceHash:'service-visits'},worldModules);
const manual=compileDreamScene(source.replace(',visit=records_trip',''),{sceneId:'manual-service',revisionId:'r1',sourceHash:'manual-service'},worldModules);
const noWorker=(doc=manual)=>parseScene({...doc,economy:{...doc.economy!,accounts:doc.economy!.accounts.map(a=>{if(a.id!=='worker')return a;const {work,commute,attendance,on,grounds,...idle}=a;return idle;})}});
const scenes=[scene,manual],snapshots=scenes.map(s=>JSON.stringify(s));afterEach(()=>scenes.forEach((s,i)=>expect(JSON.stringify(s)).toBe(snapshots[i])));
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const world=(doc=manual):World=>({scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(2400,1800),carRadius:11,saveCompatibility:'a'.repeat(64)});
const seated=(doc=manual):CarState=>{const s=createCarAtSpawn(doc),seat=worldSeats(doc).find(s=>s.objectId==='upstairs_north')!;return toggleRide({...s,control:{kind:'foot'},grounded:true,x:seat.approach.x,y:seat.approach.y,elevation:seat.approach.elevation!,vehicles:[{id:null,x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,distance:s.distance}]},world(doc));};
const step=(s:CarState,doc=manual,action?:Parameters<typeof commerceReason>[3])=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc)},{commerce:action},.25,doc);
it('accepts an explicit paid service, connected waiting furniture and a bounded visiting policy',()=>{expect(checkDream(source,worldModules).ok).toBe(true);expect(scene.economy!.visits![0]!.work).toBe('check_records');expect(scene.economy!.jobs[0]!.fee).toBe(8);});
it.each([
 ['fee=8,',''],['fee=8,','fee=0,'],['waiting=[upstairs_north]','waiting=[missing]'],['wait_s=120','wait_s=5'],['cooldown_s=60','cooldown_s=29'],['visit=records_trip','visit=missing'],['kind=service','kind=recipe'],
])('rejects invalid fee, waiting furniture, timing, policy or work: %s',(from,to)=>{const changed=source.replace(from,to);expect(changed).not.toBe(source);expect(checkDream(changed,worldModules).ok).toBe(false);});
it('does no unpaid-demand work before a customer requests it',()=>{let s=createCarAtSpawn(manual);for(let i=0;i<120;i++)s=step(s);expect(s.economy!.batches.check_records).toBe(0);expect(account(s,'worker').credits).toBe(0);checkEconomyState(s,manual);});
it('holds the fee, reserves one shared task, pays once and remembers the customer through reload',()=>{
 let s=step(seated(),manual,{kind:'request',job:'check_records'});expect(account(s).credits).toBe(12);expect(account(s).request?.id).toBe('check_records');expect(s.economy!.markets[0]!.credits).toBe(60);expect(serviceRemaining(s.economy!,manual.economy!.jobs[0]!)).toBe(1);checkEconomyState(s,manual);
 s=decodeSave(encodeSave(s,s.timeS,world()),world()).state;let assigned=false;
 for(let i=0;i<500;i++){s=step(s);assigned ||= !!account(s).request?.worker;if(s.economy!.served!.check_records===1)break;}
 expect(assigned).toBe(true);expect(account(s).request).toBeUndefined();expect(account(s).credits).toBe(12);expect(account(s).visits!.check_records!.completed).toBe(1);expect(account(s,'worker').credits).toBe(4);expect(s.economy!.markets[0]!.credits).toBe(64);expect(s.economy!.batches.check_records).toBe(1);expect(commerceReason(s,manual,'pocket',{kind:'request',job:'check_records'})).toBe('cooldown');checkEconomyState(s,manual);
 expect(decodeSave(encodeSave(s,s.timeS,world()),world()).state).toEqual(JSON.parse(encodeSave(s,s.timeS,world())).state);
});
it.each(['cancel','stand','damage','seat_damage'] as const)('refunds customer and worker exactly once after %s',kind=>{
 let s=step(seated(),manual,{kind:'request',job:'check_records'});for(let i=0;i<500 && !account(s,'worker').work;i++)s=step(s);expect(account(s,'worker').work).toBeDefined();
 if(kind==='stand')s={...s,seated:undefined};if(kind==='damage')s={...s,broken:['desk']};if(kind==='seat_damage')s={...s,seated:undefined,broken:['upstairs_north']};s=step(s,manual,kind==='cancel'?{kind:'cancel'}:undefined);
 expect(account(s).request).toBeUndefined();expect(account(s).credits).toBe(20);expect(account(s,'worker').credits).toBe(0);expect(account(s,'worker').work).toBeUndefined();expect(s.economy!.markets[0]!.credits).toBe(60);expect(s.economy!.served!.check_records).toBe(0);const before=s.economy!.markets[0]!.credits;s=step(s);expect(s.economy!.markets[0]!.credits).toBe(before);checkEconomyState(s,manual);
});
it('times out an unserved request without minting money or completion',()=>{const doc=noWorker();let s=step(seated(doc),doc,{kind:'request',job:'check_records'});for(let i=0;i<485;i++)s=step(s,doc);expect(account(s).request).toBeUndefined();expect(account(s).credits).toBe(20);expect(s.economy!.served!.check_records).toBe(0);expect(s.economy!.markets[0]!.credits).toBe(60);checkEconomyState(s,doc);});
it('walks, waits, pays, sits and returns a real NPC without teleporting or resetting its program',()=>{
 let s=createCarAtSpawn(scene),returned=false;const phases=new Set<string>(),object=scene.objects.find(o=>o.id==='customer')!;let previous=actorPose(scene,object,s.timeS,s);
 for(let i=0;i<1000;i++){s=step(s,scene);const a=account(s,'visitor'),p=actorPose(scene,object,s.timeS,s);expect(Math.hypot(p.x-previous.x,p.y-previous.y,p.elevation-previous.elevation)).toBeLessThan(16);previous=p;
  if(a.visiting?.phase==='out')expect(seatClaimed(s,a.visiting.seat!)).toBe(false);
  if(a.visiting&&!phases.has(a.visiting.phase)){phases.add(a.visiting.phase);s=decodeSave(encodeSave(s,s.timeS,world(scene)),world(scene)).state;}
  if(a.visits!.check_records!.completed===1&&!a.visiting){returned=true;break;}
 }
 expect([...phases]).toEqual(['out','wait','home']);expect(returned).toBe(true);expect(account(s,'visitor').credits).toBe(12);expect(account(s,'worker').credits).toBe(4);expect(account(s).credits).toBe(20);checkEconomyState(s,scene);
});
it('lets the player perform the same paid task for an NPC customer',()=>{
 const doc=noWorker(scene),station=workstation(doc,'records')!;let s=createCarAtSpawn(doc);s={...s,control:{kind:'foot'},grounded:true,x:station.x,y:station.y,elevation:station.elevation,vehicles:[{id:null,x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,distance:s.distance}]};
 for(let i=0;i<500&&!account(s,'visitor').request;i++)s=step(s,doc);expect(account(s,'visitor').request).toBeDefined();s=step(s,doc,{kind:'work',job:'check_records'});expect(account(s,'visitor').request?.worker).toBe('pocket');for(let i=0;i<24;i++)s=step(s,doc);
 expect(account(s).credits).toBe(24);expect(account(s,'visitor').credits).toBe(12);expect(s.economy!.markets[0]!.credits).toBe(64);expect(s.economy!.served!.check_records).toBe(1);checkEconomyState(s,doc);
});

it('requires a real seat and finite customer money, business float and one shared request',()=>{
 let s=seated();expect(commerceReason({...s,seated:undefined},manual,'pocket',{kind:'request',job:'check_records'})).toBe('seat');
 const poor=structuredClone(s);account(poor).credits=7;expect(commerceReason(poor,manual,'pocket',{kind:'request',job:'check_records'})).toBe('funds');
 const broke=structuredClone(s);broke.economy!.markets[0]!.credits=3;expect(commerceReason(broke,manual,'pocket',{kind:'request',job:'check_records'})).toBe('treasury');
 s=step(s,manual,{kind:'request',job:'check_records'});const held=account(s).credits;s=step(s,manual,{kind:'request',job:'check_records'});expect(account(s).credits).toBe(held);expect(s.economy!.accounts.filter(a=>a.request)).toHaveLength(1);expect(serviceRemaining(s.economy!,manual.economy!.jobs[0]!)).toBe(1);
});
it('rejects forged service ownership, history, fees, deadlines and retained seats on restore',()=>{
 const s=step(seated(),manual,{kind:'request',job:'check_records'}),saved=encodeSave(s,s.timeS,world());
 const mutations=[
  (s:CarState)=>{s.economy!.served!.check_records=1;},
  (s:CarState)=>{account(s).visits!.check_records!.completed=1;},
  (s:CarState)=>{account(s).visits!.check_records!.nextAtS=s.timeS+61;},
  (s:CarState)=>{account(s).request!.worker='pocket';},
  (s:CarState)=>{account(s).request!.deadlineS++;},
  (s:CarState)=>{account(s).request!.seat.seatId='missing';},
  (s:CarState)=>{account(s).credits+=8;},
  (s:CarState)=>{s.seated=undefined;},
 ];
 for(const mutate of mutations){const packet=JSON.parse(saved);mutate(packet.state);expect(()=>decodeSave(JSON.stringify(packet),world())).toThrow();}
});

it('leaves a travelling target free for the player and returns unpaid if its only seat stays occupied',()=>{
 const doc=parseScene({...scene,objects:scene.objects.map(o=>o.id==='upstairs_north' ? {...o,spec:{...o.spec,seats:(o.spec as import('../src/scene/object-dsl').ObjectDslV2).seats!.slice(0,1)}} : o)});
 let s=step(createCarAtSpawn(doc),doc);expect(account(s,'visitor').visiting?.phase).toBe('out');expect(seatClaimed(s,account(s,'visitor').visiting!.seat!)).toBe(false);
 const pose=seated(doc);s={...s,control:pose.control,seated:pose.seated,x:pose.x,y:pose.y,elevation:pose.elevation,headingRad:pose.headingRad,pitch:pose.pitch,bank:pose.bank,vx:0,vy:0,vz:0,vehicles:pose.vehicles};let waited=false,returned=false;
 for(let i=0;i<1500;i++){s=step(s,doc);const a=account(s,'visitor');if(a.visiting?.arrivedAtS!==undefined){waited=true;expect(a.visiting.phase).toBe('out');expect(a.request).toBeUndefined();}if(waited&&a.visiting?.phase==='home'){returned=true;break;}}
 expect(waited&&returned).toBe(true);expect(account(s,'visitor').credits).toBe(20);expect(account(s).credits).toBe(20);expect(s.economy!.served!.check_records).toBe(0);checkEconomyState(s,doc);expect(encodeSave(s,s.timeS,world(doc))).toBeTypeOf('string');
});

it.each(['stand','reset'] as const)('refunds a request before an immediate save after %s, without mutating its source',mode=>{
 let s=step(seated(),manual,{kind:'request',job:'check_records'});for(let i=0;i<500&&!account(s,'worker').work;i++)s=step(s);expect(account(s,'worker').work).toBeDefined();const snapshot=JSON.stringify(s),next=mode==='stand' ? toggleRide(s,world()) : resetCar(s,manual);
 expect(next.economy!.atS).toBe(s.economy!.atS);expect(account(next).credits).toBe(20);expect(account(next).request).toBeUndefined();expect(account(next,'worker').work).toBeUndefined();expect(next.economy!.markets[0]!.credits).toBe(60);checkEconomyState(next,manual);expect(encodeSave(next,next.timeS,world())).toBeTypeOf('string');expect(JSON.stringify(s)).toBe(snapshot);const fresh=resetCar(s,manual,true);expect(account(fresh).credits).toBe(20);expect(account(fresh).visits!.check_records!.completed).toBe(0);
});
