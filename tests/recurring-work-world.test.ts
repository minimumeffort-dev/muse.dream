import {readFileSync} from 'node:fs';
import {beforeAll,afterEach,it,expect} from 'vitest';
import native from '../docs/evidence/office-food/native-fed.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {type World,type CarState} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {stepCommerce,checkEconomyState,serviceProgress} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {decodeSave,encodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
let scene:ReturnType<typeof createWorldScene>,prior:typeof scene,world:World,old:World,snapshot:string;
beforeAll(()=>{scene={...c.preServiceVisitsScene(createWorldScene()),revisionId:'r118',sourceHash:'handmade-city-life-v118'};prior=c.preRecurringWorkScene(scene);snapshot=JSON.stringify(scene);world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.RECURRING_WORK_COMPATIBILITY,previousRecurringWorkSaveCompatibility:c.OFFICE_FOOD_COMPATIBILITY};old={...world,scene:prior,saveCompatibility:c.OFFICE_FOOD_COMPATIBILITY,previousRecurringWorkSaveCompatibility:undefined};},60000);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const clerk=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='office_clerk')!;
it('registers one recurring quota while keeping exact earlier world identity, geometry and resources',async()=>{
 expect(JSON.parse(c.preServiceVisitsCompatibilitySource(scene)).simulationVersion).toBe(59);expect(scene.revisionId).toBe('r118');expect(await c.sha256(c.preServiceVisitsCompatibilitySource(scene))).toBe(c.RECURRING_WORK_COMPATIBILITY);expect(await c.sha256(c.preRecurringWorkCompatibilitySource(scene))).toBe(c.OFFICE_FOOD_COMPATIBILITY);
 for(const k of ['objects','surfaces','streets','floors','routes','behaviors'] as const)expect(scene[k]).toEqual(prior[k]);expect(scene.economy).toEqual({...prior.economy,jobs:prior.economy!.jobs.map(j=>j.id==='check_records'?{...j,period_s:600}:j)});
});
it('preserves every actual r117 saved field and clock, conservatively initializes usage, and retains the original slot',()=>{
 const text=JSON.stringify(native),before=decodeSave(text,old),loaded=decodeSave(text,world),copy=structuredClone(loaded.state);delete copy.economy!.serviceWindows;expect(copy).toEqual(before.state);expect(loaded.worldTime).toBe(native.worldTime);expect(loaded.state.economy!.serviceWindows).toEqual({check_records:{period:1,completed:4}});
 expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);expect(()=>decodeSave(text,{...world,previousRecurringWorkSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.OFFICE_FOOD_COMPATIBILITY}`,rows=new Map([[key,text]]),saves=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(saves.restored!.state).toEqual(loaded.state);expect(saves.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
it('keeps an already exhausted earlier quota exhausted until the next actual simulation window',()=>{
 const trace=JSON.parse(readFileSync(new URL('./fixtures/office-food/fresh.json',import.meta.url),'utf8')),s=decodeSave(JSON.stringify(trace.points.at(-1).packet),world).state,j=scene.economy!.jobs.find(j=>j.id==='check_records')!;
 expect(s.timeS).toBe(1743);expect(clerk(s).completed.work.check_records).toBe(6);expect(serviceProgress(s.economy!,j)).toEqual({completed:6,remaining:0,nextAtS:1800});checkEconomyState(s,scene);
});
it('continues the actual paid meal save through later-period office work without replaying wages or manufacturing stock',async()=>{
 let s=decodeSave(JSON.stringify(native),world).state,loaded:CarState|undefined;const before=clerk(s).credits,total=clerk(s).completed.work.check_records!;
 for(let i=0;i<3600;i++){
  s=stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene),population:stepAmbient(s,.25,scene)},{},.25,scene);
  if(!loaded && clerk(s).work){const text=encodeSave(s,s.timeS,world);loaded=decodeSave(text,world).state;expect(loaded).toEqual(JSON.parse(text).state);}
  if(clerk(s).completed.work.check_records!>6)break;if(i%120===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 const a=clerk(s);expect(loaded).toBeDefined();expect(a.completed.work.check_records).toBeGreaterThan(6);expect(a.credits).toBe(before+(a.completed.work.check_records!-total)*4);expect(s.economy!.serviceWindows!.check_records!.period).toBeGreaterThanOrEqual(2);checkEconomyState(s,scene);
},60000);
