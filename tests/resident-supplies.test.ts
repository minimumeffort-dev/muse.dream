import {it,expect} from 'vitest';
import {setImmediate as yieldTick} from 'node:timers/promises';
import example from '../docs/examples/neighborhood-courier.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {sceneContactData} from '../src/scene/contacts';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {actorPose} from '../src/sim/actors';
import {stepNpcs} from '../src/sim/npcs';
import {workshopReviewSteps} from '../src/game/review-start';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import type {Scene} from '../src/scene/schema';
let live:Scene|undefined;const current=()=>live??=c.preRecoveryScene(createWorldScene());
const world=(scene:Scene):World=>({scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11});
const account=(s:CarState,id:string)=>s.economy!.accounts.find(a=>a.id===id)!;
const market=(s:CarState,id:string)=>s.economy!.markets.find(m=>m.id===id)!;
const finish=(steps:Generator<void,CarState>)=>{let r=steps.next();while(!r.done)r=steps.next();return r.value;};

it('pins the exact r86 world, unchanged contacts and walking graph, and one existing resident with two destinations',async()=>{
 const scene=current(),prior=c.preResidentSupplyScene(scene);
 expect(await c.sha256(c.preRecoveryCompatibilitySource(scene))).toBe(c.RESIDENT_SUPPLY_COMPATIBILITY);
 expect(await c.sha256(c.preResidentSupplyCompatibilitySource(scene))).toBe(c.WORKSHOP_SUPPLY_COMPATIBILITY);
 expect(await c.sha256(c.preWorkshopSupplyCompatibilitySource(scene))).toBe(c.KIT_PRODUCTION_COMPATIBILITY);
 expect(scene.objects).toHaveLength(prior.objects.length);expect(scene.surfaces).toBe(prior.surfaces);
 expect(sceneContactData(scene)).toEqual(sceneContactData(prior));expect(ambientGraph(scene)).toEqual(ambientGraph(prior));
 expect(scene.economy!.accounts.find(a=>a.id==='porter')).toMatchObject({actor:'school_student',credits:0,deliveries:['fasteners_run','school_run']});
 expect(prior.economy!.accounts.some(a=>a.id==='porter')).toBe(false);expect(JSON.parse(c.preRecoveryCompatibilitySource(scene)).simulationVersion).toBe(34);
});

it('lets a remote-home courier procure both recipe inputs and return through the shared finite transactions',()=>{
 expect(formatDream(formatDream(example))).toBe(formatDream(example));const scene=compileDreamScene(example,{sceneId:'remote-home',revisionId:'r1',sourceHash:'remote-home'}),w=world(scene);let s=createCarAtSpawn(scene),crossed=false;const savedPhases=new Set<string>();
 for(let tick=0;tick<3600;tick++){
  s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);const t=account(s,'supply_helper').courier;
  if(t && t.y>816 && t.y<884)crossed=true;
  if(t?.id==='fasteners_run' && !savedPhases.has(t.phase)){savedPhases.add(t.phase);expect(decodeSave(encodeSave(s,s.timeS,w),w).state).toEqual(JSON.parse(JSON.stringify(s)));}
  if(account(s,'baker').completed.work.assemble_kit===2)break;
 }
 expect(savedPhases).toEqual(new Set(['pickup','dropoff','home']));expect(crossed).toBe(true);expect(s.economy!.delivered.boards_run).toBe(1);expect(s.economy!.delivered.fasteners_run).toBe(1);
 expect(account(s,'supply_helper').credits).toBe(8);expect(market(s,'depot').stock).toMatchObject({boards:14,fasteners:14});expect(market(s,'corner').stock.kit).toBe(2);
 checkEconomyState(s,scene);expect(decodeSave(encodeSave(s,s.timeS,w),w).state).toEqual(JSON.parse(JSON.stringify(s)));
 expect(()=>compileDreamScene(example.replace('at=[1210,970]','at=[1210,1120]'),{sceneId:'gap',revisionId:'r1',sourceHash:'gap'})).toThrow('connected');
 expect(()=>compileDreamScene(example.replace('actor=helper','actor=depot_keeper'),{sceneId:'vendor',revisionId:'r1',sourceHash:'vendor'})).toThrow('non-vendor');
});

it('replays the accepted city courier at 4 Hz, feeds school staff and pays each handoff once',async()=>{
 const scene=current(),w={...world(scene),saveCompatibility:c.RESIDENT_SUPPLY_COMPATIBILITY};let s=finish(workshopReviewSteps(createCarAtSpawn(scene),w));
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'cancel'}},1/120,w);s=resetCar(s,scene);
 expect(market(s,'station_supplies').stock.fasteners).toBe(16);expect(market(s,'market_stall').stock.fasteners).toBe(6);
 const phases=new Set<string>();let previous=actorPose(scene,scene.objects.find(o=>o.id==='school_student')!,s.timeS,s),schoolMeal=false,porterMeal=false,returned=false;
 // Exercise commerce and NPC ownership at their 4 Hz boundary; cosmetic crowd/vehicle physics are covered separately.
 for(let tick=0;tick<14400;tick++){
  if(tick%1200===0)await yieldTick();
  const before=s,old=account(s,'porter');s=stepCommerce({...s,npcs:stepNpcs(s,.25,scene),timeS:s.timeS+.25},{},.25,scene);const a=account(s,'porter'),pose=actorPose(scene,scene.objects.find(o=>o.id==='school_student')!,s.timeS,s);
  expect(Math.hypot(pose.x-previous.x,pose.y-previous.y)).toBeLessThanOrEqual(3.501);previous=pose;
  if(account(s,'school_staff').satiety>account(before,'school_staff').satiety)schoolMeal=true;
  if(a.satiety>old.satiety)porterMeal=true;
  if(a.courier?.id==='fasteners_run' && !phases.has(a.courier.phase)){
   phases.add(a.courier.phase);checkEconomyState(s,scene);
  }
  if(s.economy!.delivered.fasteners_run!>before.economy!.delivered.fasteners_run!){expect(a.credits-old.credits).toBe(4);expect(market(s,'station_supplies').credits-market(before,'station_supplies').credits).toBe(2);}
  if(old.courier?.id==='fasteners_run' && old.courier.phase==='home' && a.courier?.id!=='fasteners_run'){returned=true;break;}
 }
 expect(returned).toBe(true);expect(phases).toEqual(new Set(['pickup','dropoff','home']));expect(s.economy!.delivered.school_run).toBeGreaterThanOrEqual(1);expect(s.economy!.delivered.fasteners_run).toBe(1);
 expect(account(s,'porter').completed.delivery.fasteners_run).toBe(1);expect(account(s,'pocket').completed.delivery.fasteners_run).toBe(0);expect(market(s,'market_stall').stock.fasteners).toBe(8);expect(market(s,'station_supplies').stock.fasteners).toBe(14);expect(schoolMeal).toBe(true);expect(porterMeal).toBe(true);
 console.info('resident-supply-replay',JSON.stringify({atS:s.timeS,delivered:s.economy!.delivered,porterCredits:account(s,'porter').credits,schoolCredits:account(s,'school_staff').credits,schoolMeal,porterMeal,phases:[...phases]}));
 checkEconomyState(s,scene);
});

it('initializes only the new resident account at saved time and keeps r86 cargo, clocks, ledgers and original slot',()=>{
 const scene=current(),prior=c.preResidentSupplyScene(scene),old={...world(prior),saveCompatibility:c.WORKSHOP_SUPPLY_COMPATIBILITY};const before=finish(workshopReviewSteps(createCarAtSpawn(prior),old)),text=encodeSave(before,before.timeS,old);
 const w={...world(scene),saveCompatibility:c.RESIDENT_SUPPLY_COMPATIBILITY,previousResidentSupplySaveCompatibility:c.WORKSHOP_SUPPLY_COMPATIBILITY};const loaded=decodeSave(text,w),s=loaded.state;
 expect({...s,economy:{...s.economy!,accounts:s.economy!.accounts.filter(a=>a.id!=='porter')}}).toEqual(JSON.parse(text).state);
 expect(account(s,'porter')).toMatchObject({credits:0,satiety:65,decisionAtS:before.economy!.atS});expect(Object.values(account(s,'porter').inventory)).toEqual(Array(8).fill(0));expect(Object.values(account(s,'porter').completed.delivery).every(n=>n===0)).toBe(true);
 expect(loaded.worldTime).toBe(before.timeS);expect(loaded.migrated).toBe(true);expect(decodeSave(encodeSave(s,s.timeS,w),w).migrated).toBe(false);
 expect(()=>decodeSave(text,{...w,previousResidentSupplySaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v18.${scene.sceneId}.${c.WORKSHOP_SUPPLY_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(w,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.state).toEqual(s);expect(slot.write(s,s.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 const older=c.preWorkshopSupplyScene(scene),olderWorld={...world(older),saveCompatibility:c.KIT_PRODUCTION_COMPATIBILITY},chain={...w,previousWorkshopSupplySaveCompatibility:c.KIT_PRODUCTION_COMPATIBILITY};const from85=decodeSave(encodeSave(createCarAtSpawn(older),0,olderWorld),chain).state;expect(account(from85,'porter').credits).toBe(0);expect(market(from85,'station_supplies').stock).toMatchObject({boards:16,fasteners:16});checkEconomyState(from85,scene);
});
