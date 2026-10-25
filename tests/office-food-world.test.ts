import {readFileSync} from 'node:fs';
import {beforeAll,afterEach,it,expect} from 'vitest';
import native from './fixtures/office-food-r116-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {actorPose} from '../src/sim/actors';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
let scene:ReturnType<typeof createWorldScene>,prior:typeof scene,world:World,old:World,snapshot:string;
beforeAll(()=>{scene={...c.preRecurringWorkScene(createWorldScene()),revisionId:'r117',sourceHash:'handmade-city-life-v117'};prior=c.preOfficeFoodScene(scene);snapshot=JSON.stringify(scene);world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.OFFICE_FOOD_COMPATIBILITY,previousOfficeFoodSaveCompatibility:c.OFFICE_WORK_COMPATIBILITY};old={...world,scene:prior,saveCompatibility:c.OFFICE_WORK_COMPATIBILITY,previousOfficeFoodSaveCompatibility:undefined};},60000);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const clerk=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='office_clerk')!;
const tick=(s:CarState)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene),population:stepAmbient(s,.25,scene)},{},.25,scene);
it('adds local food and an existing courier contract without geometry, actors or goods, and versions floor-aware meal saves',async()=>{
 expect(JSON.parse(c.preRecurringWorkCompatibilitySource(scene)).simulationVersion).toBe(58);expect(scene.revisionId).toBe('r117');expect(await c.sha256(c.preRecurringWorkCompatibilitySource(scene))).toBe(c.OFFICE_FOOD_COMPATIBILITY);expect(await c.sha256(c.preOfficeFoodCompatibilitySource(scene))).toBe(c.OFFICE_WORK_COMPATIBILITY);
 for(const k of ['objects','surfaces','streets','floors','routes','behaviors'] as const)expect(scene[k]).toEqual(prior[k]);expect(scene.economy!.goods).toEqual(prior.economy!.goods);expect(scene.economy!.accounts).toHaveLength(prior.economy!.accounts.length);expect(scene.economy!.markets).toHaveLength(prior.economy!.markets.length);
});
it('keeps every old saved field and slot while adding exactly four finite loaves and zero delivery counters',()=>{
 const text=JSON.stringify(native),before=decodeSave(text,old),loaded=decodeSave(text,world),s=structuredClone(loaded.state),e=s.economy!;expect(loaded.worldTime).toBe(native.worldTime);expect(loaded.migrated).toBe(true);expect(e.markets.find(m=>m.id==='station_supplies')!.stock.bread).toBe(4);
 delete e.markets.find(m=>m.id==='station_supplies')!.stock.bread;delete e.delivered.station_bread;delete e.unattributed.delivery.station_bread;for(const a of e.accounts)delete a.completed.delivery.station_bread;expect(s).toEqual(before.state);
 expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.OFFICE_WORK_COMPATIBILITY}`,rows=new Map([[key,text]]),save=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(save.restored!.state).toEqual(loaded.state);expect(save.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);expect(()=>decodeSave(text,{...world,previousOfficeFoodSaveCompatibility:undefined})).toThrow('different world');
});
type Recording={simulationVersion:number;compatibilityHash:string;sourceRevision:string;points:{steps:number;packet:unknown}[]};
const recordings=['fresh','restored'].map(name=>({name,...JSON.parse(readFileSync(new URL('./fixtures/office-food/'+name+'.json',import.meta.url),'utf8')) as Recording}));
const segments=recordings.flatMap(r=>r.points.slice(1).map((to,i)=>({label:r.name+'/'+i,from:r.points[i]!,to,recording:r})));
it.each(segments)('replays the complete city between independent saved checkpoints: $label',async({from,to,recording})=>{
 expect(recording.simulationVersion).toBe(58);expect(recording.compatibilityHash).toBe(c.OFFICE_FOOD_COMPATIBILITY);expect(recording.sourceRevision).toBe(scene.revisionId);const steps=to.steps-from.steps;expect(steps).toBeGreaterThan(0);expect(steps).toBeLessThanOrEqual(800);
 let s=decodeSave(JSON.stringify(from.packet),world).state;const person=scene.objects.find(o=>o.id==='hospital_visitor')!;let p=actorPose(scene,person,s.timeS,s);
 for(let i=0;i<steps;i++){
  const was=clerk(s);s=tick(s);const a=clerk(s),q=actorPose(scene,person,s.timeS,s);expect(Math.hypot(q.x-p.x,q.y-p.y)).toBeLessThan(20);p=q;
  if(!was.inventory.bread&&a.inventory.bread){expect(a.completed.work.check_records).toBeGreaterThan(0);expect(a.credits).toBe(was.credits-5);}
  if(was.meal?.phase==='eat'&&was.inventory.bread&&!a.inventory.bread)expect(a.satiety).toBeGreaterThan(was.satiety+44);
  if(i%120===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 checkEconomyState(s,scene);expect(JSON.parse(encodeSave(s,s.timeS,world))).toEqual(to.packet);
},60000);
it('finishes real work, a bought home meal and funded physical restocking with conserved ledgers',()=>{
 const s=decodeSave(JSON.stringify(recordings[0]!.points.at(-1)!.packet),world).state,a=clerk(s),shop=s.economy!.markets.find(m=>m.id==='station_supplies')!;
 expect(a.completed.work.check_records).toBe(6);expect(a.credits).toBe(19);expect(a.inventory.bread).toBe(0);expect(s.economy!.markets.find(m=>m.id==='office_business')!.credits).toBe(36);expect(s.economy!.delivered.station_bread).toBe(1);expect(s.economy!.accounts.find(a=>a.id==='porter')!.completed.delivery.station_bread).toBe(1);expect(shop.stock.bread).toBe(5);expect(shop.credits).toBe(0);checkEconomyState(s,scene);
});
it('lets the actual older unpaid relocation finish before earning and purchasing food without a free meal',()=>{
 const s=decodeSave(JSON.stringify(recordings[1]!.points.at(-1)!.packet),world).state,a=clerk(s);expect(a.completed.work.check_records).toBe(2);expect(a.credits).toBe(3);expect(a.inventory.bread).toBe(1);expect(a.meal?.phase).toBe('seat');expect(a.commute).toBeUndefined();checkEconomyState(s,scene);
});
it('leaves the registered first-market projection unchanged when it has no delivery fields',()=>{const first=c.preDeliveryScene(scene);expect(c.preOfficeFoodScene(first)).toBe(first);});
