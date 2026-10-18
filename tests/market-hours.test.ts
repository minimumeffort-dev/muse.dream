import {preBusinessState} from './pre-business-state';
import {it,expect} from 'vitest';
import source from '../docs/examples/market-hours.dream?raw';
import previous from './fixtures/save-v12-r61-seated.json';
import {compileDreamScene,formatDream,checkDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {dayHour,sampleDaylight} from '../src/scene/daylight';
import {marketIsOpen,marketOpening} from '../src/sim/market-hours';
import {marketHoursText} from '../src/game/commerce';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepCommerce,commerceReason,checkEconomyState,type CommerceAction} from '../src/sim/commerce';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {createWorldScene} from '../src/scene/world-fixture';
import {MATCH_COMPATIBILITY,BUSINESS_COMPATIBILITY,SCHOOL_REPAIR_COMPATIBILITY,SOCIAL_COMPATIBILITY,SHIFT_COMPATIBILITY,HOURS_COMPATIBILITY,SEATING_COMPATIBILITY,preHoursCompatibilitySource,saveCompatibilitySource,sha256} from '../src/scene/save-compatibility';

const scene=compileDreamScene(source,{sceneId:'hours',revisionId:'r1',sourceHash:'hours'});
const start=(doc=scene):CarState=>({...createCarAtSpawn(doc),control:{kind:'foot'},x:580,y:750,elevation:0,surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]});
const step=(s:CarState,action?:CommerceAction,doc=scene)=>stepCommerce({...s,timeS:s.timeS+.25},{commerce:action},.25,doc);
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const worldFor=(doc:Scene):World=>({scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(doc.canonical.width,doc.canonical.height),carRadius:11});

it('compiles numeric hours, formats canonically and rejects invalid intervals and missing clocks',()=>{
 expect(scene.economy!.markets[0]!.hours).toEqual([6,22]);expect(scene.economy!.markets[1]!.hours).toEqual([22,6]);
 expect(formatDream(formatDream(source))).toBe(formatDream(source));
 expect(compileDreamScene(source.replace('hours=[6,22]','hours=[3*2,22]'),{sceneId:'expr',revisionId:'r1',sourceHash:'expr'}).economy!.markets[0]!.hours).toEqual([6,22]);
 for(const value of ['[6,6]','[24,6]','[-1,6]','[6,25]','[6]','[6,22,23]','"06:00"'])expect(()=>compileDreamScene(source.replace('hours=[6,22]',`hours=${value}`),{sceneId:'bad',revisionId:'r1',sourceHash:'bad'}),value).toThrow();
 const invalid=checkDream(source.replace('hours=[6,22]','hours=[6,25]'));expect(invalid).toMatchObject({ok:false,diagnostics:[{code:'E_ECONOMY',path:'dream/economy/market:corner/hours'}]});
 expect(()=>parseScene({...scene,daylight:undefined})).toThrow('hours require');
 expect(()=>compileDreamScene(source.replace('daylight(cycle_s=120,start_hour=21.5);',''),{sceneId:'bad',revisionId:'r1',sourceHash:'bad'})).toThrow('hours require');
});

it('shares the sky arithmetic, supports overnight and all-day windows, and uses half-open boundaries',()=>{
 const doc={daylight:{cycleSeconds:240,startHour:0}},day={hours:[6,22] as [number,number]},night={hours:[22,6] as [number,number]};
 for(const hour of [0,5.999,6,12,21.999,22,23.999,24,30,46]){
  const time=hour*10,h=hour%24;expect(dayHour(doc.daylight,time)).toBeCloseTo(h);expect(sampleDaylight(doc.daylight,time).hour).toBe(dayHour(doc.daylight,time));
  expect(marketIsOpen(doc,day,time)).toBe(h>=6 && h<22);expect(marketIsOpen(doc,night,time)).toBe(h>=22 || h<6);
  expect(marketIsOpen(doc,{hours:[0,24]},time)).toBe(true);expect(marketIsOpen({}, {},time)).toBe(true);
 }
 expect(marketOpening(doc,day,220)).toEqual({hour:6,seconds:80});expect(marketOpening(doc,day,60)).toBeUndefined();
 expect(marketHoursText(doc,day,220)).toBe('22:00 · Closed · opens 06:00 (1m 20s)');expect(marketHoursText(doc,day,60)).toBe('06:00 · Open until 22:00');
});

it('blocks player and NPC counter transactions while closed, but keeps owned food and refunds usable',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>({...a,works:undefined,meal:undefined,deliveries:undefined}))}});
 let s=start(doc);s=step(s,{kind:'buy',market:'corner',good:'bread'},doc);expect(account(s).inventory.bread).toBe(1);
 for(let i=0;i<9;i++)s=step(s,undefined,doc);expect(s.timeS).toBe(2.5);
 const before=structuredClone(s.economy!.markets);
 for(const action of [{kind:'buy',market:'corner',good:'bread'},{kind:'sell',market:'corner',good:'bread'},{kind:'work',job:'bake'}] as CommerceAction[]){
  expect(commerceReason(s,doc,'pocket',action)).toBe('closed');expect(commerceReason(s,doc,'baker',action)).toBe('closed');s=step(s,action,doc);
 }
 expect(s.economy!.markets).toEqual(before);expect(account(s).inventory.bread).toBe(1);expect(account(s).credits).toBe(15);
 s=step(s,{kind:'eat',good:'bread'},doc);expect(account(s).inventory.bread).toBe(0);expect(account(s).satiety).toBeGreaterThan(90);checkEconomyState(s,doc);
});

it('finishes a batch committed before closing exactly once and refuses another until reopening',()=>{
 let s=start();for(let i=0;i<7;i++)s=step(s);
 s=step(s,{kind:'work',job:'bake'});expect(account(s).work).toBeDefined();const done=account(s).work!.doneAtS;
 while(s.timeS<done+.5)s=step(s);
 expect(marketIsOpen(scene,scene.economy!.markets[0]!,s.timeS)).toBe(false);expect(account(s).credits).toBe(23);expect(account(s).completed.work.bake).toBe(1);expect(account(s).work).toBeUndefined();
 expect(commerceReason(s,scene,'pocket',{kind:'work',job:'bake'})).toBe('closed');
 const paid=account(s).credits;for(let i=0;i<10;i++)s=step(s);expect(account(s).credits).toBe(paid);checkEconomyState(s,scene);
 let cancelled=start();for(let i=0;i<7;i++)cancelled=step(cancelled);cancelled=step(cancelled,{kind:'work',job:'bake'});while(cancelled.timeS<2.5)cancelled=step(cancelled);
 cancelled=step(cancelled,{kind:'cancel'});expect(account(cancelled).work).toBeUndefined();expect(account(cancelled).completed.work.bake).toBe(0);expect(account(cancelled).credits).toBe(20);checkEconomyState(cancelled,scene);
});

it('waits at a closed supplier without cargo, saves the wait, and collects only when it opens',()=>{
 const doc=parseScene({...scene,daylight:{cycleSeconds:600,startHour:21.9},economy:{...scene.economy!,markets:scene.economy!.markets.map(m=>({...m,hours:[6,22]}))}}),world=worldFor(doc);
 let s=start(doc),waiting=false;
 for(let i=0;i<780;i++){
  s=step(s,undefined,doc);const t=account(s,'supply_helper').courier;
  if(t?.phase==='pickup' && Math.hypot(t.x-t.at.x,t.y-t.at.y)<=.1){waiting=true;break;}
 }
 expect(waiting).toBe(true);expect(marketIsOpen(doc,doc.economy!.markets[1]!,s.timeS)).toBe(false);expect(account(s,'supply_helper').delivery).toBeUndefined();
 const stocks=structuredClone(s.economy!.markets),saved=encodeSave(s,s.timeS,world),restored=decodeSave(saved,world);expect(restored.state).toEqual(s);
 s=step(s,undefined,doc);expect(s.economy!.markets).toEqual(stocks);expect(account(s,'supply_helper').delivery).toBeUndefined();
 const position={x:account(s,'supply_helper').courier!.x,y:account(s,'supply_helper').courier!.y};
 while(!marketIsOpen(doc,doc.economy!.markets[1]!,s.timeS)){s=step(s,undefined,doc);if(!marketIsOpen(doc,doc.economy!.markets[1]!,s.timeS))expect(account(s,'supply_helper').courier).toMatchObject(position);}
 expect(account(s,'supply_helper').delivery?.id).toBe('flour_run');expect(account(s,'supply_helper').courier?.phase).toBe('dropoff');checkEconomyState(s,doc);
});

it('keeps reserved cargo and pay at a closed destination, then hands over once during service',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>a.id==='supply_helper' ? {...a,deliveries:undefined} : a)}});
 let s=start(doc);for(let i=0;i<10;i++)s=step(s,undefined,doc);
 s=step({...s,x:1120,y:970},{kind:'collect',delivery:'flour_run'},doc);expect(account(s).delivery?.id).toBe('flour_run');
 s={...s,x:580,y:750};const before=structuredClone(s.economy!.markets);expect(commerceReason(s,doc,'pocket',{kind:'deliver'})).toBe('closed');
 s=step(s,{kind:'deliver'},doc);expect(s.economy!.markets).toEqual(before);expect(account(s).delivery).toBeDefined();expect(account(s).credits).toBe(20);
 while(!marketIsOpen(doc,doc.economy!.markets[0]!,s.timeS))s=step(s,undefined,doc);
 s=step(s,{kind:'deliver'},doc);expect(account(s).delivery).toBeUndefined();expect(account(s).credits).toBe(24);expect(s.economy!.delivered.flour_run).toBe(1);
 s=step(s,{kind:'deliver'},doc);expect(account(s).credits).toBe(24);expect(s.economy!.delivered.flour_run).toBe(1);checkEconomyState(s,doc);
});

it('holds an NPC shipment at a closed receiver through reload and pays only once after opening',()=>{
 const doc=parseScene({...scene,daylight:{cycleSeconds:600,startHour:12},economy:{...scene.economy!,markets:scene.economy!.markets.map(m=>({...m,hours:m.id==='corner' ? [0,12.1] : undefined}))}}),world=worldFor(doc);
 let s=start(doc),waiting=false;
 for(let i=0;i<1100;i++){
  s=step(s,undefined,doc);const t=account(s,'supply_helper').courier;
  if(t?.phase==='dropoff' && Math.hypot(t.x-t.at.x,t.y-t.at.y)<=.1){waiting=true;break;}
 }
 expect(waiting).toBe(true);expect(marketIsOpen(doc,doc.economy!.markets[0]!,s.timeS)).toBe(false);expect(account(s,'supply_helper').delivery?.id).toBe('flour_run');expect(account(s,'supply_helper').credits).toBe(0);expect(s.economy!.delivered.flour_run).toBe(0);
 const reservation=structuredClone(s.economy!.markets);s=decodeSave(encodeSave(s,s.timeS,world),world).state;s=step(s,undefined,doc);expect(s.economy!.markets).toEqual(reservation);expect(account(s,'supply_helper').courier?.speed).toBe(0);
 while(!s.economy!.delivered.flour_run && s.timeS<310)s=step(s,undefined,doc);
 expect(s.economy!.delivered.flour_run).toBe(1);expect(account(s,'supply_helper').credits).toBe(4);expect(account(s,'supply_helper').delivery).toBeUndefined();expect(account(s,'supply_helper').courier?.phase).toBe('home');checkEconomyState(s,doc);
});

it('returns a meal customer empty-handed if the counter closes during the walk',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,markets:scene.economy!.markets.map(m=>({...m,lots:m.lots.map(l=>l.good==='lunch' ? {...l,quantity:1} : l)}))}});
 let s=step(start(doc),undefined,doc);expect(account(s,'regular').meal?.phase).toBe('out');const credits=account(s,'regular').credits;
 for(let i=0;i<300 && account(s,'regular').meal;i++)s=step(s,undefined,doc);
 expect(account(s,'regular').meal).toBeUndefined();expect(account(s,'regular').credits).toBe(credits);expect(account(s,'regular').inventory.lunch).toBe(0);expect(s.economy!.consumed.lunch).toBe(0);checkEconomyState(s,doc);
 for(let i=0;i<20;i++)s=step(s,undefined,doc);expect(account(s,'regular').meal).toBeUndefined();
});

it('migrates the registered seated r61 world exactly, retains its slot and rejects unrelated changes',async()=>{
 const doc=createWorldScene(),hash=await sha256(saveCompatibilitySource(doc));expect(hash).toBe(MATCH_COMPATIBILITY);expect(await sha256(preHoursCompatibilitySource(doc))).toBe(SEATING_COMPATIBILITY);
 const world={...worldFor(doc),saveCompatibility:hash,previousMatchSaveCompatibility:BUSINESS_COMPATIBILITY,previousBusinessSaveCompatibility:SCHOOL_REPAIR_COMPATIBILITY,previousSchoolRepairSaveCompatibility:SOCIAL_COMPATIBILITY,previousSocialSaveCompatibility:SHIFT_COMPATIBILITY,previousShiftSaveCompatibility:HOURS_COMPATIBILITY,previousHoursSaveCompatibility:SEATING_COMPATIBILITY},text=JSON.stringify(previous),restored=decodeSave(text,world);
 expect(restored.migrated).toBe(true);expect(preBusinessState(restored.state)).toEqual(previous.state);expect(restored.worldTime).toBe(previous.worldTime);expect(decodeSave(encodeSave(restored.state,restored.worldTime,world),world).migrated).toBe(false);
 const oldKey=`hours.v12.${doc.sceneId}.${SEATING_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),storage={getItem:(key:string)=>rows.get(key)??null,setItem:(key:string,value:string)=>{rows.set(key,value);}};
 const saves=gameSave(world,()=>storage,'hours');expect(preBusinessState(saves.restored?.state)).toEqual(previous.state);expect(saves.write(restored.state,restored.worldTime)).toBe(true);expect(rows.get(oldKey)).toBe(text);
 rows.set(saves.key,'corrupt');expect(gameSave(world,()=>storage,'hours').blocked).toBe(true);
 const changed={...doc,economy:{...doc.economy!,markets:doc.economy!.markets.map(m=>({...m,credits:m.credits+1}))}};const changedHash=await sha256(saveCompatibilitySource(changed));expect(()=>decodeSave(text,{...world,scene:changed,saveCompatibility:changedHash})).toThrow('different world');
});
