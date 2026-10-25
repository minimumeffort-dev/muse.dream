import {it,expect,afterEach} from 'vitest';
import source from '../docs/examples/service-office-meals.dream?raw';
import {worldModules} from '../src/scene/world-fixture';
import {compileDreamScene,checkDream} from '../src/scene/dream';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
const scene=compileDreamScene(source,{sceneId:'office-food',revisionId:'r1',sourceHash:'office-food'},worldModules),snapshot=JSON.stringify(scene);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(2400,1800),carRadius:11,saveCompatibility:'a'.repeat(64)};
const worker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='worker')!;
const tick=(s:CarState)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene),population:stepAmbient(s,.25,scene)},{},.25,scene);
it('connects own-service wages to a real stocked food counter, shared seating and an unpaid return',()=>{
 let s=createCarAtSpawn(scene),paid=false,bought=false,ate=false,returned=false;const phases=new Set<string>();
 for(let i=0;i<8000;i++){
  const was=worker(s);s=tick(s);const a=worker(s);paid ||= a.completed.work.check_records!>0;
  if(!was.inventory.bread&&a.inventory.bread){expect(paid).toBe(true);expect(a.credits).toBe(was.credits-5);bought=true;}
  if(was.meal?.phase==='eat'&&was.inventory.bread&&!a.inventory.bread){expect(a.satiety).toBeGreaterThan(was.satiety+44);ate=true;}
  const phase=a.meal?.phase;if(phase&&!phases.has(phase)){phases.add(phase);s=decodeSave(encodeSave(s,s.timeS,world),world).state;}
  if(ate&&!worker(s).meal){returned=true;break;}
 }
 expect({paid,bought,ate,returned,phases:[...phases]}).toEqual({paid:true,bought:true,ate:true,returned:true,phases:['out','seat','eat','home']});
 expect(s.economy!.markets.find(m=>m.id==='shop')!.credits).toBe(5);expect(s.economy!.markets.find(m=>m.id==='shop')!.stock.bread).toBe(3);checkEconomyState(s,scene);
});
it.each([
 ['actor=clerk,on=exchange','actor=clerk'],
 ['drain_s=.02,meal=lunch','drain_s=.02,meal=lunch,shop=true'],
 ['meal=lunch','meal=missing'],
 ['actor=clerk,credits=0','actor=shopkeeper,credits=0'],
])('retains the operator, policy and meal ownership restrictions: %s',(from,to)=>expect(checkDream(source.replace(from,to),worldModules).ok).toBe(false));

it('takes a purchased meal upstairs, persists its elevation and rejects a forged floor',()=>{
 const upstairs=source.replace('grounds=[lobby,entry_work],eat_s=4,seats=[lobby_seat]','grounds=[lobby,entry_work,mezzanine,landing],eat_s=4,seats=[upstairs_north]'),doc=compileDreamScene(upstairs,{sceneId:'upstairs-food',revisionId:'r1',sourceHash:'upstairs-food'},worldModules),w={...world,scene:doc,roadMask:buildMaskForScene(doc)};
 let s=createCarAtSpawn(doc),eating=false;
 for(let i=0;i<8000;i++){
  s=stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc)},{},.25,doc);
  const a=worker(s);if(a.meal?.phase!=='eat')continue;eating=true;expect(a.meal.elevation).toBeGreaterThan(48);expect(a.inventory.bread).toBe(1);
  const text=encodeSave(s,s.timeS,w);expect(decodeSave(text,w).state).toEqual(JSON.parse(text).state);
  const forged=JSON.parse(text);forged.state.economy.accounts.find((a:{id:string})=>a.id==='worker').meal.elevation+=100;expect(()=>decodeSave(JSON.stringify(forged),w)).toThrow('invalid world state');break;
 }
 expect(eating).toBe(true);
});
