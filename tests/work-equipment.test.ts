import {expect,it} from 'vitest';
import source from '../docs/examples/work-equipment.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepCommerce,commerceReason,checkEconomyState,refundDamagedWork} from '../src/sim/commerce';
import {equipmentReviewSteps,npcReviewStart} from '../src/game/review-start';
import {toggleRide,stepInteractive} from '../src/sim/interaction';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {dreamAgentContext} from '../src/scene/dream-agent';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientGraph} from '../src/scene/ambient-navigation';
const scene=compileDreamScene(source,{sceneId:'equipment',revisionId:'test',sourceHash:'equipment'});
const manual=()=>parseScene({...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>({...a,work:undefined,repair:undefined}))}});
const start=(doc=scene):CarState=>({...toggleRide(createCarAtSpawn(doc),body(doc)),x:555,y:750,elevation:0});
const step=(s:CarState,job?:string,dt=.25,doc:Scene=scene)=>stepCommerce({...s,timeS:s.timeS+dt},job ? {commerce:{kind:'work',job}} : {},dt,doc);
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const ledger=(s:CarState)=>({stock:s.economy!.markets[0]!.stock,cash:s.economy!.markets[0]!.credits,credits:s.economy!.accounts.map(a=>a.credits)});
const body=(doc:Scene):World=>({scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(doc.canonical.width,doc.canonical.height),carRadius:11});

it('checks physical placement references, bounds and duplicates and keeps the LLM contract canonical',()=>{
 expect(scene.economy!.jobs.map(j=>j.equipment)).toEqual([['food_table'],['kit_bench']]);
 expect(formatDream(formatDream(source))).toBe(formatDream(source));
 expect(dreamAgentContext(['commerce']).contract.commands.work!.fields.equipment).toBe('symbols?');
 expect(dreamAgentContext(['commerce']).instructions).toContain('work.equipment');
 for(const field of ['[]','[food_table,food_table]','[food_table,kit_bench,food_table,kit_bench,food_table]','[missing]','[neighbor]','[work_table]']){
  const result=checkDream(source.replace('equipment=[food_table]',`equipment=${field}`));expect(result.ok,field).toBe(false);
 }
 expect(()=>compileDreamScene(source.replace('at=[590,755]','at=[900,900]'),{sceneId:'bad',revisionId:'test',sourceHash:'bad'})).toThrow('market reach');
});

it('blocks only the affected production while trade, food and the other workplace remain usable',()=>{
 const doc=manual(),s={...start(doc),broken:['food_table']};
 expect(commerceReason(s,doc,'pocket',{kind:'work',job:'pack_lunch'})).toBe('equipment');
 expect(commerceReason(s,doc,'cook',{kind:'work',job:'pack_lunch'})).toBe('equipment');
 expect(commerceReason(s,doc,'pocket',{kind:'work',job:'assemble_kit'})).toBeUndefined();
 expect(commerceReason(s,doc,'pocket',{kind:'buy',market:'corner',good:'bread'})).toBeUndefined();
 const blocked=step(s,'pack_lunch',.25,doc);expect(ledger(blocked)).toEqual(ledger(s));expect(account(blocked).work).toBeUndefined();checkEconomyState(blocked,doc);
 const zone={...start(doc),brokenZones:[{objectId:'food_table',zoneId:'top'}]};expect(commerceReason(zone,doc,'pocket',{kind:'work',job:'pack_lunch'})).toBe('equipment');
});

it('refunds all ingredients and wages once for player and NPC immediately, including at completion time',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>a.id==='caretaker' ? {...a,repair:undefined} : a)}}),initial=start(doc),working=step(initial,'assemble_kit',.25,doc);expect(account(working).work).toBeDefined();expect(account(working,'cook').work).toBeDefined();
 for(const dt of [1/120,2]){
  let next=step({...working,broken:['food_table','kit_bench']},undefined,dt,doc);expect(ledger(next)).toEqual(ledger(initial));
  expect(account(next).work).toBeUndefined();expect(account(next,'cook').work).toBeUndefined();expect(next.economy!.batches).toEqual(initial.economy!.batches);
  expect(next.economy!.events.filter(e=>e.kind==='cancel' && e.reason==='equipment')).toHaveLength(2);
  next=step(next,undefined,.25,doc);expect(ledger(next)).toEqual(ledger(initial));expect(account(next).completed).toEqual(account(initial).completed);checkEconomyState(next,scene);
 }
});

it('lets the existing caretaker restore equipment and producers resume through the same finite ledger',()=>{
 const doc=scene,w=body(doc);let s={...start(doc),broken:['food_table']},seen=false,resumed=false;
 for(let i=0;i<120*20;i++){
  s=stepInteractive(s,{steer:0,throttle:0},1/120,w);seen ||= account(s,'caretaker').repair?.objectId==='food_table';
  if(seen && !s.broken.includes('food_table') && account(s,'cook').completed.work.pack_lunch!>0){resumed=true;break;}
 }
 expect(seen).toBe(true);expect(resumed).toBe(true);expect(s.economy!.repaired.workshop_repairs).toBe(1);expect(account(s,'caretaker').credits).toBe(2);checkEconomyState(s,doc);
 const packet=encodeSave(s,50,w);expect(decodeSave(packet,w).state).toEqual(JSON.parse(JSON.stringify(s)));
});

it('requires every listed item and refunds a prior commitment without advancing clocks or touching its source',()=>{
 const doc=manual(),initial=start(doc),working=step(initial,'pack_lunch',.25,doc),broken={...working,timeS:working.timeS+.1,broken:['food_table']};
 const migrated=refundDamagedWork(broken,doc);expect(migrated.timeS).toBe(broken.timeS);expect(migrated.economy!.atS).toBe(broken.economy!.atS);expect(ledger(migrated)).toEqual(ledger(initial));expect(account(broken).work).toBeDefined();
 expect(refundDamagedWork(migrated,doc)).toBe(migrated);checkEconomyState(migrated,doc);
 const all=parseScene({...doc,economy:{...doc.economy!,jobs:doc.economy!.jobs.map(j=>({...j,equipment:['food_table','kit_bench']}))}});
 expect(commerceReason({...start(all),broken:['kit_bench']},all,'pocket',{kind:'work',job:'pack_lunch'})).toBe('equipment');
});

it('pins r82 exactly, preserves old progress and refuses unregistered upgrade targets',async()=>{
 const current=c.preStrikeScene(createWorldScene()),old=c.preEquipmentScene(current);
 expect(await c.sha256(c.preStrikeCompatibilitySource(current))).toBe(c.EQUIPMENT_COMPATIBILITY);expect(await c.sha256(c.preEquipmentCompatibilitySource(current))).toBe(c.SERVICE_COMPATIBILITY);
 expect(current.economy!.jobs.filter(j=>['bake','large_bake','pack_lunch'].includes(j.id)).map(j=>j.equipment)).toEqual([['hall_table_east'],['hall_table_east'],['hall_table_east']]);expect(current.objects).toBe(old.objects);expect(current.surfaces).toBe(old.surfaces);
 const w:World={...body(current),saveCompatibility:c.EQUIPMENT_COMPATIBILITY,previousEquipmentSaveCompatibility:c.SERVICE_COMPATIBILITY},oldWorld={...body(old),saveCompatibility:c.SERVICE_COMPATIBILITY};
 let s=npcReviewStart(createCarAtSpawn(old),oldWorld,'vendor');s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'work',job:'bake'}},1/120,oldWorld);
 const prior={...s,broken:['hall_table_east']},packet=encodeSave(prior,71,oldWorld),restored=decodeSave(packet,w);
 expect(restored.migrated).toBe(true);expect(restored.worldTime).toBe(71);expect(restored.state.timeS).toBe(prior.timeS);expect(restored.state.broken).toEqual(prior.broken);expect(account(restored.state).work).toBeUndefined();expect(account(restored.state).completed.work.bake).toBe(0);expect(account(restored.state).credits).toBe(account(prior).credits);checkEconomyState(restored.state,current);
 expect(decodeSave(encodeSave(restored.state,71,w),w).state).toEqual(JSON.parse(JSON.stringify(restored.state)));
 expect(()=>decodeSave(packet,{...w,previousEquipmentSaveCompatibility:undefined})).toThrow('different world');
 const graph=ambientGraph(c.preServiceScene(old)),nativeWorld={...w,previousServiceSaveCompatibility:c.CHARACTERS_COMPATIBILITY,previousServiceNavigation:graph};
 const fixtures=import.meta.glob('../docs/evidence/character-construction/native-*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;let count=0;
 for(const text of Object.values(fixtures)){if(JSON.parse(text).kind!=='dream-save')continue;const copy=decodeSave(text,nativeWorld);expect(copy.migrated).toBe(true);expect(decodeSave(encodeSave(copy.state,copy.worldTime,nativeWorld),nativeWorld).state).toEqual(JSON.parse(JSON.stringify(copy.state)));count++;}expect(count).toBeGreaterThanOrEqual(4);
});

it('records a real table collision and caretaker approach before the native review starts',()=>{
 const doc=createWorldScene(),world=body(doc),steps=equipmentReviewSteps(createCarAtSpawn(doc),world);let result=steps.next();while(!result.done)result=steps.next();
 expect(result.value.broken).toContain('hall_table_east');expect(account(result.value,'caretaker').repair).toMatchObject({objectId:'hall_table_east',phase:'work'});
 expect(commerceReason(result.value,doc,'pocket',{kind:'work',job:'bake'})).toBe('equipment');
 expect(result.value.economy!.events.some(e=>e.kind==='cancel' && e.reason==='equipment')).toBe(true);
 checkEconomyState(result.value,doc);
});
