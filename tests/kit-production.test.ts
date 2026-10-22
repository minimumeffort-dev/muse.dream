import {expect,it} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';

it('pins the r85 policy and exact prior r84 world',async()=>{
 const scene=createWorldScene(),prior=c.preKitProductionScene(scene);
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.KIT_PRODUCTION_COMPATIBILITY);
 expect(await c.sha256(c.preKitProductionCompatibilitySource(scene))).toBe(c.STRIKE_COMPATIBILITY);
 expect(scene.objects).toBe(prior.objects);expect(scene.surfaces).toBe(prior.surfaces);
 expect(scene.economy!.accounts.find(a=>a.id==='baker')!.works).toEqual(['assemble_kit','pack_lunch','large_bake','bake']);
 expect(scene.economy!.jobs.find(j=>j.id==='assemble_kit')!.target).toBe(12);
 expect(prior.economy!.jobs.find(j=>j.id==='assemble_kit')!.target).toBe(4);
});

import source from '../docs/examples/repair-production.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import type {Scene} from '../src/scene/schema';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepInteractive,toggleRide} from '../src/sim/interaction';
import {stepCommerce,commerceReason,checkEconomyState} from '../src/sim/commerce';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {handReviewSteps} from '../src/game/review-start';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {ambientGraph} from '../src/scene/ambient-navigation';
const compile=(text=source)=>compileDreamScene(text,{sceneId:'kit-production',revisionId:'test',sourceHash:'kit-production'});
const example=compile();let live:Scene|undefined;const liveScene=()=>live??=createWorldScene();
const world=(scene=example):World=>({scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11});
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const market=(s:CarState,id='corner')=>s.economy!.markets.find(m=>m.id===id)!;
const step=(s:CarState,scene=example)=>stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);
const foot=(scene=example)=>({...toggleRide(createCarAtSpawn(scene),world(scene)),x:570,y:755,elevation:0,headingRad:0});

it('compiles a complete repair-production example with canonical existing vocabulary',()=>{
 expect(checkDream(source).ok).toBe(true);expect(formatDream(formatDream(source))).toBe(formatDream(source));
 expect(example.economy!.accounts.find(a=>a.id==='cook')!.works).toEqual(['pack_lunch','assemble_kit']);
});

it('repairs broken food equipment using NPC-made kits, then resumes food production',()=>{
 const w=world();let s=stepInteractive(foot(),{throttle:0,steer:0,strikePressed:true},1/120,w),made=false,repaired=false;
 expect(s.broken).toContain('food_table');
 for(let i=0;i<120*30;i++){
  s=stepInteractive(s,{throttle:0,steer:0},1/120,w);
  made ||= account(s,'cook').completed.work.assemble_kit!>0;
  repaired ||= !s.broken.includes('food_table');
  if(repaired && account(s,'cook').completed.work.pack_lunch!>0)break;
 }
 expect(made).toBe(true);expect(repaired).toBe(true);expect(account(s,'caretaker').completed.repair.workshop_repairs).toBe(1);
 expect(account(s,'cook').completed.work.pack_lunch).toBeGreaterThan(0);expect(s.economy!.repaired.workshop_repairs).toBe(1);checkEconomyState(s,example);
 expect(decodeSave(encodeSave(s,40,w),w).state).toEqual(JSON.parse(JSON.stringify(s)));
});

it('keeps shared finite input, wage and capacity checks for automatic workshop work',()=>{
 for(const [field,value] of [['quantity=8,limit=8','quantity=0,limit=8'],['credits=100,radius=70','credits=0,radius=70']] as const){
  const scene=compile(source.replace('works=[pack_lunch,assemble_kit]','works=[assemble_kit]').replaceAll(field,value));let s=foot(scene);
  for(let i=0;i<24;i++)s=step(s,scene);
  expect(account(s,'cook').completed.work.assemble_kit).toBe(0);expect(account(s,'cook').work).toBeUndefined();checkEconomyState(s,scene);
 }
 const scene=compile(source.replace('works=[pack_lunch,assemble_kit]','works=[assemble_kit]'));let s=step(foot(scene),scene);
 expect(account(s,'cook').work?.id).toBe('assemble_kit');expect(market(s).stock).toMatchObject({boards:6,fasteners:7,kit:0});
 expect(commerceReason(s,scene,'pocket',{kind:'work',job:'assemble_kit'})).toBe('busy');
 const packet=encodeSave(s,4,world(scene));expect(decodeSave(packet,world(scene)).state).toEqual(JSON.parse(packet).state);
 for(let i=0;i<30;i++)s=step(s,scene);
 expect(market(s).stock.kit).toBe(2);expect(account(s,'cook').completed.work.assemble_kit).toBe(2);expect(account(s,'cook').credits).toBe(6);checkEconomyState(s,scene);
});

it('completes the live hand flow and replenishes exactly its consumed kit from real boards and fasteners',()=>{
 const scene=liveScene(),w=world(scene),steps=handReviewSteps(createCarAtSpawn(scene),w,true);let result=steps.next();while(!result.done)result=steps.next();let s=result.value,reserved:CarState|undefined;
 for(let tick=0;tick<600*4;tick++){
  s=stepInteractive(s,{throttle:0,steer:0,...(tick===120 ? {strikePressed:true} : {}),...(tick===240 ? {commerce:{kind:'repair',repair:'market_tables'} as const} : tick===1320 ? {commerce:{kind:'work',job:'bake'} as const} : {})},1/120,w);
  if(account(s,'baker').work?.id==='assemble_kit')reserved??=s;
 }
 expect(reserved).toBeDefined();expect(market(reserved!,'market_stall').stock).toMatchObject({boards:7,fasteners:7,timber:11});
 expect(account(s,'baker').completed.work.assemble_kit).toBe(1);expect(market(s,'market_stall').stock).toMatchObject({boards:7,fasteners:7,timber:12});
 expect(account(s).credits).toBe(27);expect(account(s).completed.work.bake).toBe(1);expect(account(s).completed.repair.market_tables).toBe(1);
 expect(s.broken).not.toContain('hall_table_east');checkEconomyState(s,scene);checkEconomyState(reserved!,scene);
 expect(resetCar(s,scene).economy).toEqual(s.economy);expect(decodeSave(encodeSave(reserved!,50,w),w).state).toEqual(JSON.parse(JSON.stringify(reserved)));
});

it('retains the complete r84 ledger, work and hand cooldown, then preserves the original save slot',async()=>{
 const scene=liveScene(),prior=c.preKitProductionScene(scene),old={...world(prior),saveCompatibility:c.STRIKE_COMPATIBILITY},steps=handReviewSteps(createCarAtSpawn(prior),old,true);let result=steps.next();while(!result.done)result=steps.next();
 const text=encodeSave(result.value,99,old),w={...world(scene),saveCompatibility:c.KIT_PRODUCTION_COMPATIBILITY,previousKitProductionSaveCompatibility:c.STRIKE_COMPATIBILITY},restored=decodeSave(text,w);
 expect(restored.migrated).toBe(true);expect(restored.state).toEqual(JSON.parse(text).state);expect(restored.worldTime).toBe(99);
 expect(decodeSave(encodeSave(restored.state,99,w),w).migrated).toBe(false);expect(()=>decodeSave(text,{...w,previousKitProductionSaveCompatibility:undefined})).toThrow('different world');
 expect(()=>decodeSave(text,{...w,saveCompatibility:'f'.repeat(64)})).toThrow('different world');
 const key=`muse-dream.save.v18.${scene.sceneId}.${c.STRIKE_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(w,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));
 expect(slot.restored!.state).toEqual(restored.state);expect(slot.write(restored.state,99)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 const native={...w,previousStrikeSaveCompatibility:c.EQUIPMENT_COMPATIBILITY,previousEquipmentSaveCompatibility:c.SERVICE_COMPATIBILITY,previousServiceSaveCompatibility:c.CHARACTERS_COMPATIBILITY,previousServiceNavigation:ambientGraph(c.preServiceScene(prior))};let count=0;
 const fixtures=import.meta.glob('../docs/evidence/character-construction/native-*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
 for(const text of Object.values(fixtures)){if(JSON.parse(text).kind!=='dream-save')continue;const loaded=decodeSave(text,native);expect(loaded.migrated).toBe(true);expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,native),native).state).toEqual(JSON.parse(JSON.stringify(loaded.state)));count++;}expect(count).toBeGreaterThanOrEqual(4);
});
