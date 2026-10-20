import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {SERVICE_COMPATIBILITY,CHARACTERS_COMPATIBILITY,preServiceScene,preServiceCompatibilitySource,saveCompatibilitySource,sha256} from '../src/scene/save-compatibility';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {sceneInteriors,walkingHeight} from '../src/scene/interiors';
import {repairTargets} from '../src/scene/commerce';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {stepCommerce,commerceReason,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {decodeSave,encodeSave} from '../src/sim/save';
import {npcReviewStart} from '../src/game/review-start';
import {gameSave} from '../src/game/save';
const scene=createWorldScene(),previous=preServiceScene(scene),hall=sceneInteriors(scene).find(f=>f.object.id==='market_hall')!;
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:SERVICE_COMPATIBILITY,previousServiceSaveCompatibility:CHARACTERS_COMPATIBILITY,previousServiceNavigation:ambientGraph(previous)};
const oldWorld:World={...world,scene:previous,saveCompatibility:CHARACTERS_COMPATIBILITY,previousServiceSaveCompatibility:undefined,previousServiceNavigation:undefined};
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;

it('registers the exact previous world, reuses physical assets and keeps every maintenance target',async()=>{
 expect(await sha256(saveCompatibilitySource(scene))).toBe(SERVICE_COMPATIBILITY);expect(await sha256(preServiceCompatibilitySource(scene))).toBe(CHARACTERS_COMPATIBILITY);
 expect(scene.objects.length).toBe(previous.objects.length);expect(sceneContactData(scene)).toEqual(sceneContactData(previous));
 for(const id of ['vendor','market_neighbor']){const o=scene.objects.find(o=>o.id===id)!;expect(hall.contains(o.x,o.y,4)).toBe(true);}
 for(const r of scene.economy!.repairs)expect(repairTargets(scene,r).map(t=>[t.objectId,t.zoneId])).toEqual(repairTargets(previous,previous.economy!.repairs.find(p=>p.id===r.id)!).map(t=>[t.objectId,t.zoneId]));
 expect(scene.surfaces.find(s=>s.id==='orchard_path')!.walkable).toBe(true);
});

it('requires entering the hall for service and uses its real floor for a normal purchase',()=>{
 const outside={...createCarAtSpawn(scene),control:{kind:'foot' as const},x:6400,y:4350,elevation:0};
 expect(commerceReason(outside,scene,'pocket',{kind:'buy',market:'market_stall',good:'bread'})).toBe('range');
 const inside=npcReviewStart(createCarAtSpawn(scene),world,'vendor');expect(inside.control.kind).toBe('foot');expect(hall.contains(inside.x,inside.y,4)).toBe(true);expect(inside.elevation).toBeCloseTo(hall.floor);
 const bought=stepInteractive(inside,{steer:0,throttle:0,commerce:{kind:'buy',market:'market_stall',good:'bread'}},1/120,world);
 expect(account(bought).credits).toBe(15);expect(account(bought).inventory.bread).toBe(1);checkEconomyState(bought,scene);
});

it('relocates a saved paid worker safely while retaining the exact job, reservations and time',()=>{
 let s=npcReviewStart(createCarAtSpawn(previous),oldWorld,'vendor');
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'work',job:'bake'}},1/120,oldWorld);
 for(let i=0;i<120;i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,oldWorld);
 expect(account(s).work?.id).toBe('bake');const text=encodeSave(s,s.timeS,oldWorld),before=decodeSave(text,oldWorld),after=decodeSave(text,world);
 expect(after.migrated).toBe(true);expect(after.worldTime).toBe(before.worldTime);expect(after.state.timeS).toBe(before.state.timeS);expect(after.state.economy).toEqual(before.state.economy);
 expect(hall.contains(after.state.x,after.state.y,4)).toBe(true);expect(after.state.elevation).toBeCloseTo(hall.floor);
 let next=after.state;for(let i=0;i<720 && account(next).work;i++)next=stepInteractive(next,{steer:0,throttle:0},1/120,world);
 expect(account(next).work).toBeUndefined();expect(account(next).completed.work.bake).toBe(1);expect(account(next).credits).toBe(account(before.state).credits+3);
 expect(decodeSave(encodeSave(next,next.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(next)));
 const oldKey=`muse-dream.save.v17.${scene.sceneId}.${CHARACTERS_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));
 expect(slot.restored?.migrated).toBe(true);expect(slot.write(after.state,after.worldTime)).toBe(true);expect(rows.get(oldKey)).toBe(text);
 expect(()=>decodeSave(text,{...world,previousServiceSaveCompatibility:undefined})).toThrow('different world');
});

it('upgrades real r81 native backups without resetting the ledger, damage, vehicles or clocks',()=>{
 const fixtures=import.meta.glob('../docs/evidence/character-construction/native-*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;let count=0;
 for(const [name,text] of Object.entries(fixtures)){
  if(JSON.parse(text).kind!=='dream-save')continue;const before=decodeSave(text,oldWorld),after=decodeSave(text,world);
  expect(after.state.timeS,name).toBe(before.state.timeS);expect(after.worldTime,name).toBe(before.worldTime);
  for(const field of ['markets','consumed','batches','delivered','repaired','socialHistory','invitation','events'] as const)expect(after.state.economy![field],name).toEqual(before.state.economy![field]);
  for(const field of ['props','broken','debris','vehicles','sports','npcs'] as const)expect(after.state[field],name).toEqual(before.state[field]);
  for(const a of before.state.economy!.accounts){const b=account(after.state,a.id);expect({...b,repair:undefined,courier:undefined,meal:undefined,shift:undefined},name).toEqual({...a,repair:undefined,courier:undefined,meal:undefined,shift:undefined});}
  expect(decodeSave(encodeSave(after.state,after.worldTime,world),world).state,name).toEqual(JSON.parse(JSON.stringify(after.state)));count++;
 }
 expect(count).toBeGreaterThanOrEqual(4);
});

it('keeps a saved hungry customer physically on the journey and charges once at the new counter',()=>{
 let s=createCarAtSpawn(previous);
 for(let i=0;i<1200 && !account(s,'regular').meal;i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,oldWorld);
 const old=account(s,'regular').meal!;expect(old.phase).toBe('out');
 let next=decodeSave(encodeSave(s,s.timeS,oldWorld),world).state;const moved=account(next,'regular').meal!;
 expect([moved.x,moved.y,moved.distance,moved.home]).toEqual([old.x,old.y,old.distance,old.home]);expect(moved.at).not.toEqual(old.at);expect(account(next,'regular').credits).toBe(account(s,'regular').credits);
 for(let i=0;i<9000 && account(next,'regular').meal?.phase!=='eat';i++)next=stepInteractive(next,{steer:0,throttle:0},1/120,world);
 expect(account(next,'regular').meal?.phase).toBe('eat');expect(account(next,'regular').credits).toBe(22);expect(account(next,'regular').inventory.lunch).toBe(1);
 expect(decodeSave(encodeSave(next,next.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(next)));
});
it('routes the hungry customer through the doorway, buys one real lunch and reaches a seat',()=>{
 let s=createCarAtSpawn(scene),entered=false,bought=false,seated=false;
 for(let i=0;i<600 && !seated;i++){
  s=stepCommerce({...s,npcs:stepNpcs(s,.25,scene),timeS:s.timeS+.25},{},.25,scene);
  const meal=account(s,'regular').meal;
  if(meal){entered ||= hall.contains(meal.x,meal.y,4);seated ||= meal.phase==='eat' && !!meal.seat;}
  bought ||= s.economy!.events.some(e=>e.account==='regular' && e.kind==='buy' && e.ref==='lunch');
 }
 expect(entered).toBe(true);expect(bought).toBe(true);expect(seated).toBe(true);expect(account(s,'regular').credits).toBe(22);checkEconomyState(s,scene);
});
