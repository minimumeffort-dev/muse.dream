import {it,expect,afterEach} from 'vitest';
import source from '../docs/examples/service-work.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason,serviceProgress} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {workstation} from '../src/scene/workstations';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
const text=source.replace('target=3','target=1,period_s=30').replace(',works=[stocktake],commute=true,on=plaza','');
const scene=compileDreamScene(text,{sceneId:'recurring-work',revisionId:'r1',sourceHash:'recurring-work'}),snapshot=JSON.stringify(scene),job=scene.economy!.jobs[0]!,station=workstation(scene,job.station)!;
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11,saveCompatibility:'a'.repeat(64)};
const start=():CarState=>{const s=createCarAtSpawn(scene);return {...s,control:{kind:'foot'},x:station.x,y:station.y,elevation:station.elevation,vehicles:[{id:null,x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,distance:s.distance}]};};
const step=(s:CarState,action?:Parameters<typeof commerceReason>[3])=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene)},{commerce:action},.25,scene);
const until=(s:CarState,time:number)=>{while(s.timeS<time-1e-8)s=step(s);return s;};
const player=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='pocket')!;
const finish=(s:CarState)=>{s=step(s,{kind:'work',job:job.id});return until(s,s.timeS+2);};
it('compiles one bounded service period and retains it through canonical formatting',()=>{
 expect(job.period_s).toBe(30);expect(formatDream(formatDream(text))).toBe(formatDream(text));expect(checkDream(text).ok).toBe(true);
});
it.each(['0','29.9','86400.1','-1'])('rejects an out-of-range service period: %s',value=>{
 const result=checkDream(text.replace('period_s=30','period_s='+value));expect(result.ok).toBe(false);if(!result.ok){expect(result.diagnostics[0]!.code).toBe('E_ECONOMY');expect(result.diagnostics[0]!.path).toContain('period_s');}
});
it('forbids periodic recipe work',()=>expect(checkDream(text.replace('kind=service','kind=recipe,input=flour,take=1,output=bread,make=1')).ok).toBe(false));
it('renews only available work, keeps lifetime history and all resources, and does not accumulate missed periods',()=>{
 const initial=start();let s=finish(initial);expect(serviceProgress(s.economy!,job)).toEqual({completed:1,remaining:0,nextAtS:30});expect(commerceReason(s,scene,'pocket',{kind:'work',job:job.id})).toBe('quota');
 const ledger=structuredClone(s.economy!);s=until(s,29.75);expect(s.economy!.serviceWindows!.stocktake).toEqual({period:0,completed:1});s=step(s);
 expect(serviceProgress(s.economy!,job)).toEqual({completed:0,remaining:1,nextAtS:60});expect(s.economy!.batches).toEqual(ledger.batches);expect(s.economy!.markets).toEqual(ledger.markets);expect(player(s).credits).toBe(player({...s,economy:ledger}).credits);
 s=finish(s);expect(s.economy!.batches.stocktake).toBe(2);expect(player(s).completed.work.stocktake).toBe(2);expect(player(s).credits).toBe(26);
 s=until(s,300);expect(serviceProgress(s.economy!,job)).toEqual({completed:0,remaining:1,nextAtS:330});expect(player(s).credits).toBe(26);checkEconomyState(s,scene);expect(initial.economy!.serviceWindows!.stocktake!.completed).toBe(0);
});
it.each(['complete','cancel','damage'] as const)('carries one paid reservation across a boundary without duplicate pay or slots: %s',mode=>{
 let s=until(start(),mode==='cancel'?29:28);s=step(s,{kind:'work',job:job.id});s=until(s,29.75);expect(player(s).work?.doneAtS).toBe(mode==='cancel'?31:30);expect(serviceProgress(s.economy!,job).remaining).toBe(0);
 let restored=decodeSave(encodeSave(s,s.timeS,world),world).state;
 if(mode==='damage'){s={...s,broken:['prep_table']};restored={...restored,broken:['prep_table']};}
 const action=mode==='cancel' ? {kind:'cancel' as const} : undefined;s=step(s,action);restored=step(restored,action);expect(restored).toEqual(s);
 const paid=mode==='complete';expect(player(s).credits).toBe(paid?23:20);expect(s.economy!.markets[0]!.credits).toBe(paid?97:100);expect(s.economy!.batches.stocktake).toBe(paid?1:0);expect(serviceProgress(s.economy!,job)).toEqual({completed:paid?1:0,remaining:paid?0:1,nextAtS:60});checkEconomyState(s,scene);
});
it('does not refill treasury, ingredients, needs or lifetime progress on R, and starts a new world empty',()=>{
 let s=until(finish(start()),30);expect(resetCar(s,scene).economy).toEqual(s.economy);expect(resetCar(s,scene,true).economy!.serviceWindows!.stocktake).toEqual({period:0,completed:0});
 // Move the last finite wage to the worker, retaining the conserved credit total.
 s=structuredClone(s);player(s).credits+=s.economy!.markets[0]!.credits;s.economy!.markets[0]!.credits=0;
 expect(commerceReason(s,scene,'pocket',{kind:'work',job:job.id})).toBe('treasury');s=until(s,60);expect(commerceReason(s,scene,'pocket',{kind:'work',job:job.id})).toBe('treasury');checkEconomyState(s,scene);
});
it.each(['missing','unknown','future','negative','excess','history'] as const)('rejects inconsistent recurring-service save data: %s',kind=>{
 const s=finish(start()),packet=JSON.parse(encodeSave(s,s.timeS,world)),e=packet.state.economy;
 if(kind==='missing')delete e.serviceWindows;else if(kind==='unknown')e.serviceWindows.missing={period:0,completed:0};else if(kind==='future')e.serviceWindows.stocktake.period=1;else if(kind==='negative')e.serviceWindows.stocktake.completed=-1;else if(kind==='excess')e.serviceWindows.stocktake.completed=2;else{e.serviceWindows.stocktake.completed=1;e.batches.stocktake=0;player(packet.state).completed.work.stocktake=0;}
 expect(()=>decodeSave(JSON.stringify(packet),world)).toThrow(/supported Muse Dream backup|invalid world state/);
});
it('lets the same NPC keep working in later periods, with finite wages and unpaid waiting',()=>{
 const doc=compileDreamScene(text.replace('satiety=65,drain_s=.05);\n market corner','satiety=65,drain_s=.05,works=[stocktake],commute=true,on=plaza);\n market corner'),{sceneId:'recurring-npc',revisionId:'r1',sourceHash:'recurring-npc'});let s=createCarAtSpawn(doc);
 for(let i=0;i<600;i++)s=stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc)},{},.25,doc);
 const a=s.economy!.accounts.find(a=>a.id==='regular')!;expect(a.completed.work.stocktake).toBeGreaterThan(1);expect(a.credits).toBe(20+3*a.completed.work.stocktake!);expect(player(s).credits).toBe(20);checkEconomyState(s,doc);
});

it('initializes a valid prototype-named service without inherited quota values',()=>{
 const doc=compileDreamScene(text.replaceAll('stocktake','constructor'),{sceneId:'named-service',revisionId:'r1',sourceHash:'named-service'}),s=createCarAtSpawn(doc);
 expect(s.economy!.serviceWindows!.constructor).toEqual({period:0,completed:0});checkEconomyState(s,doc);
});
