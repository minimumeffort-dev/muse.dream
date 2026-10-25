import {beforeAll,afterEach,it,expect} from 'vitest';
import native from './fixtures/office-work-r115-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {initialEconomy,stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {actorPose} from '../src/sim/actors';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {officeWorkReviewSteps} from '../src/game/office-work-review';
import {stepInteractive} from '../src/sim/interaction';
import {sceneFloors} from '../src/scene/floors';
let scene:ReturnType<typeof createWorldScene>,prior:typeof scene,world:World,old:World,snapshot:string;
beforeAll(()=>{
 scene=createWorldScene();prior=c.preOfficeWorkScene(scene);snapshot=JSON.stringify(scene);
 world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.OFFICE_WORK_COMPATIBILITY,previousOfficeWorkSaveCompatibility:c.SERVICE_WORK_COMPATIBILITY};
 old={...world,scene:prior,saveCompatibility:c.SERVICE_WORK_COMPATIBILITY,previousOfficeWorkSaveCompatibility:undefined};
},60000);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const clerk=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='office_clerk')!;
const office=(s:CarState)=>s.economy!.markets.find(m=>m.id==='office_business')!;
const run=async(steps:Generator<void,CarState>)=>{let r=steps.next(),n=0;while(!r.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));r=steps.next();}return r.value;};
const tick=(s:CarState)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene),population:stepAmbient(s,.25,scene)},{},.25,scene);

it('registers a supported service office without adding actors, meshes, vehicles, pavement or goods',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(57);expect(scene.revisionId).toBe('r116');expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.OFFICE_WORK_COMPATIBILITY);expect(await c.sha256(c.preOfficeWorkCompatibilitySource(scene))).toBe(c.SERVICE_WORK_COMPATIBILITY);
 expect(scene.objects.map(o=>o.id)).toEqual(prior.objects.map(o=>o.id));expect(scene.surfaces).toEqual(prior.surfaces);expect(scene.behaviors).toEqual(prior.behaviors);expect(scene.economy!.goods).toEqual(prior.economy!.goods);
 const business=scene.economy!.markets.find(m=>m.id==='office_business')!;expect(business.on).toBe('station_quarter_offices');expect(business.lots).toEqual([]);expect(initialEconomy(scene)!.markets.find(m=>m.id===business.id)!.stock).toEqual({});
});

it('keeps every old saved field, physical NPC pose and clock while adding an unpaid relocation and finite office state',()=>{
 const text=JSON.stringify(native),before=decodeSave(text,old),loaded=decodeSave(text,world),s=structuredClone(loaded.state),e=s.economy!;
 expect(loaded.migrated).toBe(true);expect(loaded.worldTime).toBe(native.worldTime);expect(s.timeS).toBe(before.state.timeS);expect(s.npcs).toEqual(before.state.npcs);
 const person=scene.objects.find(o=>o.id==='hospital_visitor')!,previous=prior.objects.find(o=>o.id===person.id)!;
 const pose=actorPose(scene,person,s.timeS,s),was=actorPose(prior,previous,before.state.timeS,before.state);for(const field of ['x','y','elevation','headingRad','speed'] as const)expect(pose[field]).toBe(was[field]);expect(clerk(s).commute?.phase).toBe('home');expect(clerk(s).credits).toBe(0);expect(clerk(s).work).toBeUndefined();expect(office(s).credits).toBe(60);
 e.accounts=e.accounts.filter(a=>a.id!=='office_clerk');e.markets=e.markets.filter(m=>m.id!=='office_business');delete e.batches.check_records;delete e.unattributed.work.check_records;for(const a of e.accounts)delete a.completed.work.check_records;expect(s).toEqual(before.state);
 expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.SERVICE_WORK_COMPATIBILITY}`,rows=new Map([[key,text]]),save=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(save.restored!.state).toEqual(loaded.state);expect(save.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 expect(()=>decodeSave(text,{...world,previousOfficeWorkSaveCompatibility:undefined})).toThrow('different world');
});

it('walks the player upstairs, reserves the same desk, reloads and pays once without producing inventory',async()=>{
 let s=await run(officeWorkReviewSteps(createCarAtSpawn(scene),world));const a=()=>s.economy!.accounts.find(a=>a.id==='pocket')!,before=a().credits,inventory=structuredClone(a().inventory);
 expect(s.elevation).toBeCloseTo(sceneFloors(scene).find(f=>f.id==='office_mezzanine')!.elevation);expect(commerceReason(s,scene,'pocket',{kind:'work',job:'check_records'})).toBeUndefined();
 s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'work',job:'check_records'}},1/120,world);expect(a().work?.id).toBe('check_records');expect(office(s).credits).toBe(56);s=decodeSave(encodeSave(s,s.timeS,world),world).state;
 for(let i=0;i<800&&a().work;i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,world);
 expect(a().credits).toBe(before+4);expect(a().completed.work.check_records).toBe(1);expect(a().inventory).toEqual(inventory);expect(office(s).stock).toEqual({});checkEconomyState(s,scene);
},60000);

it('uses real stairs, wages, energy, a shared home bench and daily attendance without teleporting the clerk',async()=>{
 let s=createCarAtSpawn(scene),climbed=false,paid=false,rested=false,returned=false;const stages=new Set<string>(),person=scene.objects.find(o=>o.id==='hospital_visitor')!;let position=actorPose(scene,person,s.timeS,s);
 for(let i=0;i<5200;i++){
  s=tick(s);const a=clerk(s),p=actorPose(scene,person,s.timeS,s);expect(Math.hypot(p.x-position.x,p.y-position.y)).toBeLessThan(20);position=p;
  climbed ||= !!a.commute && (a.commute.elevation??0)>8 && (a.commute.elevation??0)<48;paid ||= a.credits>0;rested ||= a.resting?.phase==='sit';
  const stage=a.work ? 'work' : a.resting?.phase ? 'rest/'+a.resting.phase : a.commute?.phase;
  if(stage&&!stages.has(stage)){stages.add(stage);s=decodeSave(encodeSave(s,s.timeS,world),world).state;}
  if(a.completed.work.check_records===6&&!a.commute&&!a.resting){returned=true;break;}
  if(i%120===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 expect({climbed,paid,rested,returned},JSON.stringify({time:s.timeS,clerk:clerk(s)})).toEqual({climbed:true,paid:true,rested:true,returned:true});expect(clerk(s).credits).toBe(24);expect(office(s).credits).toBe(36);expect(office(s).stock).toEqual({});checkEconomyState(s,scene);
},60000);
