import {it,expect} from 'vitest';
import source from '../docs/examples/service-work.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {parseScene} from '../src/scene/schema';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,commerceReason,checkEconomyState,serviceRemaining,type CommerceAction} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {workstation} from '../src/scene/workstations';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
const scene=compileDreamScene(source,{sceneId:'service-work',revisionId:'r1',sourceHash:'service-work'}),job=scene.economy!.jobs[0]!,station=workstation(scene,job.station)!;
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11,saveCompatibility:'a'.repeat(64)};
const start=():CarState=>{const s=createCarAtSpawn(scene);return {...s,control:{kind:'foot'},x:station.x,y:station.y,elevation:station.elevation,vehicles:[{id:null,x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,distance:s.distance}]};};
const step=(s:CarState,action?:CommerceAction,doc=scene)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc),population:stepAmbient(s,.25,doc)},{commerce:action},.25,doc);
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const market=(s:CarState)=>s.economy!.markets[0]!;

it('compiles and formats a bounded physical service without manufacturing goods',()=>{
 expect(job.kind).toBe('service');expect(job.output).toBeUndefined();expect(job.make).toBeUndefined();expect(job.input).toBeUndefined();expect(job.ingredients).toBeUndefined();expect(job.target).toBe(3);
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(checkDream(source).ok).toBe(true);
});

it.each([
 ['kind=service,',''],['kind=service,','kind=recipe,'],['kind=service,','kind=service,output=bread,make=1,'],
 ['kind=service,','kind=service,input=flour,take=1,'],['station=preparation',''],['equipment=[prep_table],',''],['capacity=1','capacity=2'],['target=3','target=0'],
])('rejects inconsistent service or incomplete recipe fields: %s → %s',(from,to)=>{
 const changed=source.replace(from,to).replace(/,\)/g,')');expect(changed).not.toBe(source);const result=checkDream(changed);expect(result.ok).toBe(false);if(!result.ok)expect(result.diagnostics[0]!.code).toBe('E_ECONOMY');
});

it('reserves a shared task and wage, includes the first step, and changes no goods on completion',()=>{
 const initial=start(),stock=structuredClone(market(initial).stock),inventory=structuredClone(initial.economy!.accounts.map(a=>a.inventory));let s=step(initial,{kind:'work',job:job.id});
 expect(account(s).work?.doneAtS).toBe(2);expect(serviceRemaining(s.economy!,job)).toBe(2);expect(account(s).credits).toBe(20);expect(market(s).credits).toBe(97);
 for(let i=0;i<7;i++)s=step(s);
 expect(s.timeS).toBe(2);expect(account(s).credits).toBe(23);expect(account(s).completed.work.stocktake).toBe(1);expect(s.economy!.batches.stocktake).toBe(1);expect(account(s).work).toBeUndefined();
 expect(market(s).stock).toEqual(stock);expect(s.economy!.accounts.map(a=>a.inventory)).toEqual(inventory);checkEconomyState(s,scene);expect(account(initial).credits).toBe(20);
});

it.each(['cancel','move','sit','damage','reset'] as const)('refunds once and releases its quota reservation after %s',mode=>{
 let s=step(start(),{kind:'work',job:job.id});
 if(mode==='move')s={...s,x:s.x+20};if(mode==='sit')s={...s,seated:{objectId:'lunch_bench',seatId:'left'}};if(mode==='damage')s={...s,broken:['prep_table']};if(mode==='reset')s=resetCar(s,scene);
 s=step(s,mode==='cancel' ? {kind:'cancel'} : undefined);expect(account(s).work).toBeUndefined();expect(account(s).credits).toBe(20);expect(market(s).credits).toBe(100);expect(serviceRemaining(s.economy!,job)).toBe(3);expect(s.economy!.batches.stocktake).toBe(0);
 const after=structuredClone(market(s));s=step(s,{kind:'cancel'});expect(market(s)).toEqual(after);
});

it('lets the commuter claim and complete the same finite tasks without paying for travel or waiting',()=>{
 let s={...start(),x:900,y:900},out=false,worked=false,returned=false;
 const initialStock=structuredClone(market(s).stock);
 for(let i=0;i<800;i++){
  s=step(s);const a=account(s,'regular');
  if(a.commute?.phase==='out' && !worked){out=true;expect(a.credits).toBe(20);expect(market(s).credits).toBe(100);expect(a.work).toBeUndefined();}
  worked ||= !!a.work;
  if(s.economy!.batches.stocktake===3 && !a.commute){returned=true;break;}
 }
 expect(out && worked && returned).toBe(true);expect(account(s,'regular').credits).toBe(29);expect(account(s,'regular').completed.work.stocktake).toBe(3);expect(market(s).credits).toBe(91);expect(market(s).stock).toEqual(initialStock);
 const credits=account(s,'regular').credits;for(let i=0;i<80;i++)s=step(s);expect(account(s,'regular').credits).toBe(credits);expect(s.economy!.batches.stocktake).toBe(3);checkEconomyState(s,scene);
});

it('shares a one-task quota between player and NPC, releases it on cancel and rejects impossible saved quotas',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,jobs:[{...job,target:1}]}}),last=doc.economy!.jobs[0]!;
 let s=step(start(),{kind:'work',job:job.id},doc);expect(serviceRemaining(s.economy!,last)).toBe(0);checkEconomyState(s,doc);
 s=step(s,{kind:'cancel'},doc);expect(serviceRemaining(s.economy!,last)).toBe(1);
 for(const kind of ['done','pending'] as const){const bad=structuredClone(s);bad.economy!.batches.stocktake=1;account(bad).completed.work.stocktake=1;if(kind==='done'){bad.economy!.batches.stocktake=2;account(bad).completed.work.stocktake=2;}else{account(bad).work={id:job.id,doneAtS:bad.timeS+2};market(bad).credits-=job.pay;}expect(()=>checkEconomyState(bad,doc)).toThrow('work capacity');}
});

it('replays a pending paid service without changing goods or paying twice, retaining completion after R',()=>{
 let s=step(start(),{kind:'work',job:job.id}),loaded=decodeSave(encodeSave(s,s.timeS,world),world).state;
 for(let i=0;i<12;i++){s=step(s);loaded=step(loaded);}expect(loaded).toEqual(s);expect(account(s).credits).toBe(23);expect(s.economy!.batches.stocktake).toBe(1);
 const reset=resetCar(s,scene);expect(reset.economy!.batches.stocktake).toBe(1);expect(resetCar(s,scene,true).economy!.batches.stocktake).toBe(0);
});

it('keeps physical proximity and treasury checks for service work',()=>{
 const s=start();expect(commerceReason({...s,x:s.x+5},scene,'pocket',{kind:'work',job:job.id})).toBe('station');
 expect(commerceReason({...s,control:{kind:'car'}},scene,'pocket',{kind:'work',job:job.id})).toBe('range');
 const poor=structuredClone(s);market(poor).credits=0;expect(commerceReason(poor,scene,'pocket',{kind:'work',job:job.id})).toBe('treasury');
});
