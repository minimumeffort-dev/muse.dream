import {beforeAll,afterEach,it,expect} from 'vitest';
import backup from './fixtures/station-maintenance-r111-save-v19.json';
import olderBackup from './fixtures/upstairs-social-r109-save-v19.json';
import oldRepairs from '../src/scene/compatibility/r111-maintenance.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World,type CarState} from '../src/sim/car';
import {encodeSave,decodeSave,SAVE_VERSION} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {repairTargets} from '../src/sim/repair';
import {stepAmbient} from '../src/sim/ambient';
import {stepNpcs} from '../src/sim/npcs';

let scene:ReturnType<typeof createWorldScene>,previous:typeof scene,world:World,oldWorld:World,snapshot:string,oldSnapshot:string;
const grounds=new Set(['station_repair_work','station_tree_work_west','station_tree_work_center','station_tree_work_east']);
beforeAll(()=>{
 scene=createWorldScene();previous=c.preStationMaintenanceScene(scene);snapshot=JSON.stringify(scene);oldSnapshot=JSON.stringify(previous);
 const beforeDistrict=c.preDistrictScene(previous);
 world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.STATION_MAINTENANCE_COMPATIBILITY,previousStationMaintenanceSaveCompatibility:c.DISTRICT_COMPATIBILITY,previousDistrictSaveCompatibility:c.UPSTAIRS_SOCIAL_COMPATIBILITY,previousDistrictContacts:sceneContactData(beforeDistrict),previousDistrictNavigation:ambientGraph(beforeDistrict),previousUpstairsSocialSaveCompatibility:c.SEATED_REST_COMPATIBILITY,previousSeatedRestSaveCompatibility:c.COMPANY_COMPATIBILITY};
 oldWorld={...world,scene:previous,saveCompatibility:c.DISTRICT_COMPATIBILITY,previousStationMaintenanceSaveCompatibility:undefined};
},60000);
afterEach(()=>{if(scene)expect(JSON.stringify(scene)).toBe(snapshot);if(previous)expect(JSON.stringify(previous)).toBe(oldSnapshot);});
const caretaker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='caretaker')!;
const advance=(s:CarState,doc:typeof scene)=>stepCommerce({...s,population:stepAmbient(s,.25,doc),npcs:stepNpcs(s,.25,doc),timeS:s.timeS+.25},{},.25,doc);

it('projects exact r111 services and keeps physical state, contacts, public navigation and earlier fingerprints unchanged',async()=>{
 expect(SAVE_VERSION).toBe(19);expect(c.SAVE_SIMULATION_VERSION).toBe(53);
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.STATION_MAINTENANCE_COMPATIBILITY);
 expect(await c.sha256(c.preStationMaintenanceCompatibilitySource(scene))).toBe(c.DISTRICT_COMPATIBILITY);
 expect(await c.sha256(c.preDistrictCompatibilitySource(scene))).toBe(c.UPSTAIRS_SOCIAL_COMPATIBILITY);
 expect(await c.sha256(c.preUpstairsSocialCompatibilitySource(scene))).toBe(c.SEATED_REST_COMPATIBILITY);
 const added=scene.surfaces.filter(s=>grounds.has(s.id));expect(added).toHaveLength(4);expect(added.every(s=>s.finish==='terrain' && !s.walkable)).toBe(true);
 expect(scene.surfaces.filter(s=>!grounds.has(s.id))).toEqual(previous.surfaces);expect(previous.surfaces).toHaveLength(57);
 expect(scene.objects).toEqual(previous.objects);expect(scene.objects).toHaveLength(1813);expect(scene.floors).toEqual(previous.floors);expect(scene.terrain).toEqual(previous.terrain);expect(scene.routes).toEqual(previous.routes);
 expect(previous.economy!.repairs.filter(r=>oldRepairs.some(old=>old.id===r.id))).toEqual(oldRepairs);
 expect(scene.economy!.accounts).toEqual(previous.economy!.accounts);expect(scene.economy!.markets).toEqual(previous.economy!.markets);expect(scene.economy!.jobs).toEqual(previous.economy!.jobs);
 expect(sceneContactData(scene)).toEqual(sceneContactData(previous));expect(ambientGraph(scene)).toEqual(ambientGraph(previous));
 expect(createCarAtSpawn(scene)).toEqual(createCarAtSpawn(previous));
});

it('retains every field and old slot of the actual r111 native backup without replay, initialization or resource changes',()=>{
 const text=JSON.stringify(backup),before=decodeSave(text,oldWorld),loaded=decodeSave(text,world);
 expect(before.state).toEqual(backup.state);expect(loaded.state).toEqual(before.state);expect(loaded.worldTime).toBe(backup.worldTime);expect(loaded.sourceHash).toBe(backup.sourceHash);expect(loaded.migrated).toBe(true);
 expect(loaded.state.economy!.accounts.find(a=>a.id==='baker')!.work).toBeDefined();expect(loaded.state.economy!.accounts.find(a=>a.id==='porter')!.courier).toBeDefined();
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.DISTRICT_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));
 expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
 expect(()=>decodeSave(text,{...world,previousStationMaintenanceSaveCompatibility:undefined})).toThrow('different world');
 expect(()=>decodeSave(text,{...world,saveCompatibility:'f'.repeat(64)})).toThrow('different world');
});

it('keeps an existing paid school repair, its reserved resources and old station damage exact through the policy upgrade',()=>{
 const service=previous.economy!.repairs.find(r=>r.id==='classroom_furniture')!,target=repairTargets(previous,service).find(t=>t.objectId==='school_common_bench')!;
 expect(target).toBeDefined();expect(target.objectId.startsWith('station_quarter_')).toBe(false);
 let state:CarState={...createCarAtSpawn(previous),broken:[target.objectId,'station_quarter_bench_nw','station_quarter_tree_west']};
 for(let tick=0;tick<240 && !(caretaker(state).repair?.id===service.id && caretaker(state).repair?.phase==='out');tick++)state=advance(state,previous);
 expect(caretaker(state).repair).toMatchObject({id:service.id,objectId:target.objectId,phase:'out'});expect(caretaker(state).repair!.path.length).toBeGreaterThan(0);checkEconomyState(state,previous);
 const text=encodeSave(state,state.timeS,oldWorld),loaded=decodeSave(text,world);expect(loaded.state).toEqual(state);expect(loaded.worldTime).toBe(state.timeS);checkEconomyState(loaded.state,scene);
 expect(loaded.state.broken).toEqual(state.broken);expect(loaded.state.economy!.repaired).toEqual(state.economy!.repaired);expect(loaded.state.growing).toEqual(state.growing);
 const beforeStep=advance(state,previous),afterStep=advance(loaded.state,scene);
 expect(afterStep).toEqual(beforeStep);expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
});

it('preserves the earlier registered native backup chain while adding only the current coverage projection',()=>{
 const text=JSON.stringify(olderBackup),before=decodeSave(text,oldWorld),loaded=decodeSave(text,world);
 expect(loaded.state).toEqual(before.state);expect(loaded.worldTime).toBe(before.worldTime);expect(loaded.migrated).toBe(true);
 expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
});
