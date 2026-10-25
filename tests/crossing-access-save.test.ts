import {beforeAll,afterEach,it,expect} from 'vitest';
import backup from './fixtures/crossing-access-r112-save-v19.json';
import olderBackup from './fixtures/station-maintenance-r111-save-v19.json';
import oldestBackup from './fixtures/upstairs-social-r109-save-v19.json';
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
import {repairTargets,repairPath} from '../src/sim/repair';
import {stepAmbient,ambientObjects} from '../src/sim/ambient';
import {stepNpcs} from '../src/sim/npcs';

let scene:ReturnType<typeof createWorldScene>,previous:typeof scene,world:World,oldWorld:World,snapshot:string,oldSnapshot:string;
const crossings=new Set(['crossing_medical_access','crossing_copper_access','crossing_weavers_access','crossing_terrace_access']);
beforeAll(()=>{
 scene=createWorldScene();previous=c.preCrossingAccessScene(scene);snapshot=JSON.stringify(scene);oldSnapshot=JSON.stringify(previous);
 const beforeDistrict=c.preDistrictScene(scene);
 world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.CROSSING_ACCESS_COMPATIBILITY,previousCrossingAccessSaveCompatibility:c.STATION_MAINTENANCE_COMPATIBILITY,previousCrossingAccessContacts:sceneContactData(previous),previousCrossingAccessNavigation:ambientGraph(previous),previousStationMaintenanceSaveCompatibility:c.DISTRICT_COMPATIBILITY,previousDistrictSaveCompatibility:c.UPSTAIRS_SOCIAL_COMPATIBILITY,previousDistrictContacts:sceneContactData(beforeDistrict),previousDistrictNavigation:ambientGraph(beforeDistrict),previousUpstairsSocialSaveCompatibility:c.SEATED_REST_COMPATIBILITY,previousSeatedRestSaveCompatibility:c.COMPANY_COMPATIBILITY};
 oldWorld={...world,scene:previous,saveCompatibility:c.STATION_MAINTENANCE_COMPATIBILITY,previousCrossingAccessSaveCompatibility:undefined,previousCrossingAccessContacts:undefined,previousCrossingAccessNavigation:undefined};
},60000);
afterEach(()=>{if(scene)expect(JSON.stringify(scene)).toBe(snapshot);if(previous)expect(JSON.stringify(previous)).toBe(oldSnapshot);});
const caretaker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='caretaker')!;
const advance=(s:CarState,doc:typeof scene)=>stepCommerce({...s,population:stepAmbient(s,.25,doc),npcs:stepNpcs(s,.25,doc),timeS:s.timeS+.25},{},.25,doc);
const withoutDerivedIndices=(state:CarState)=>({...state,population:state.population && {...state.population,members:state.population.members.map(({node,previous,...m})=>m)}});
const pathLength=(start:{x:number;y:number},path:{x:number;y:number}[])=>{let total=0,p=start;for(const q of path){total+=Math.hypot(q.x-p.x,q.y-p.y);p=q;}return total;};

it('registers the exact r113 crossing-only revision and retains every older physical fingerprint',async()=>{
 expect(SAVE_VERSION).toBe(19);expect(JSON.parse(c.preWalkingLinksCompatibilitySource(scene)).simulationVersion).toBe(53);
 expect(await c.sha256(c.preWalkingLinksCompatibilitySource(scene))).toBe(c.CROSSING_ACCESS_COMPATIBILITY);
 expect(await c.sha256(c.preCrossingAccessCompatibilitySource(scene))).toBe(c.STATION_MAINTENANCE_COMPATIBILITY);
 expect(await c.sha256(c.preStationMaintenanceCompatibilitySource(scene))).toBe(c.DISTRICT_COMPATIBILITY);
 expect(await c.sha256(c.preDistrictCompatibilitySource(scene))).toBe(c.UPSTAIRS_SOCIAL_COMPATIBILITY);
 expect(await c.sha256(c.preUpstairsSocialCompatibilitySource(scene))).toBe(c.SEATED_REST_COMPATIBILITY);
 expect(scene.crossings.filter(s=>crossings.has(s.id)).map(s=>s.id).sort()).toEqual([...crossings].sort());
 expect(scene.crossings.filter(s=>!crossings.has(s.id))).toEqual(previous.crossings);expect(previous.crossings).toHaveLength(58);expect(scene.crossings).toHaveLength(62);
 expect({...scene,crossings:previous.crossings}).toEqual(previous);
 expect(scene.objects).toHaveLength(1813);expect(scene.sites).toHaveLength(221);expect(scene.surfaces).toHaveLength(61);
 expect(sceneContactData(scene)).toEqual(sceneContactData(previous));expect(sceneContactData(scene).contacts).toHaveLength(3458);
 expect(ambientGraph(scene).nodes).not.toEqual(ambientGraph(previous).nodes);
 expect(ambientObjects(scene).map(o=>o.id)).toEqual(ambientObjects(previous).map(o=>o.id));
});

it('restores the actual native r112 backup by changing only derived pedestrian indices and retaining the old slot',()=>{
 const text=JSON.stringify(backup),before=decodeSave(text,oldWorld),loaded=decodeSave(text,world);
 expect(before.state).toEqual(backup.state);expect(withoutDerivedIndices(loaded.state)).toEqual(withoutDerivedIndices(before.state));
 expect(loaded.worldTime).toBe(backup.worldTime);expect(loaded.sourceHash).toBe(backup.sourceHash);expect(loaded.migrated).toBe(true);
 const oldNodes=ambientGraph(previous).nodes,nodes=ambientGraph(scene).nodes;
 expect(loaded.state.population!.members.some((m,i)=>m.node!==before.state.population!.members[i]!.node)).toBe(true);
 for(const [i,m] of loaded.state.population!.members.entries()){
  const old=before.state.population!.members[i]!;
  for(const field of ['node','previous'] as const){if(old[field]<0)expect(m[field]).toBe(old[field]);else{expect(m[field]).toBeGreaterThanOrEqual(0);expect({x:nodes[m[field]]!.x,y:nodes[m[field]]!.y}).toEqual({x:oldNodes[old[field]]!.x,y:oldNodes[old[field]]!.y});}}
 }
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.STATION_MAINTENANCE_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));
 expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
 expect(()=>decodeSave(text,{...world,previousCrossingAccessSaveCompatibility:undefined})).toThrow('different world');
 expect(()=>decodeSave(text,{...world,saveCompatibility:'f'.repeat(64)})).toThrow('different world');
});

it('preserves an unfinished paid station repair coordinate path while future routes use the shorter crossing',()=>{
 const service=previous.economy!.repairs.find(r=>r.id==='classroom_furniture')!,target=repairTargets(previous,service).find(t=>t.objectId==='station_quarter_bench_nw')!;
 expect(target).toBeDefined();let state:CarState={...createCarAtSpawn(previous),broken:[target.objectId]};
 for(let tick=0;tick<240 && !(caretaker(state).repair?.id===service.id && caretaker(state).repair?.phase==='out');tick++)state=advance(state,previous);
 const trip=caretaker(state).repair!;expect(trip).toMatchObject({id:service.id,objectId:target.objectId,phase:'out'});expect(trip.path.length).toBeGreaterThan(0);checkEconomyState(state,previous);
 const loaded=decodeSave(encodeSave(state,state.timeS,oldWorld),world);expect(withoutDerivedIndices(loaded.state)).toEqual(withoutDerivedIndices(state));expect(caretaker(loaded.state).repair).toEqual(trip);expect(loaded.worldTime).toBe(state.timeS);checkEconomyState(loaded.state,scene);
 const home=previous.objects.find(o=>o.id==='market_neighbor')!,oldPath=repairPath(previous,service,home,trip.at)!,nextPath=repairPath(scene,scene.economy!.repairs.find(r=>r.id===service.id)!,home,trip.at)!;
 expect(oldPath).toBeDefined();expect(nextPath).toBeDefined();expect(pathLength(home,oldPath)).toBeCloseTo(19619.94299730439,6);expect(pathLength(home,nextPath)).toBeLessThan(10000);
 expect(pathLength(home,nextPath)).toBeLessThan(pathLength(home,oldPath)*.5);
 const beforeStep=advance(state,previous),afterStep=advance(loaded.state,scene);expect(caretaker(afterStep).repair).toEqual(caretaker(beforeStep).repair);expect(afterStep.economy).toEqual(beforeStep.economy);
 expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
});

it('preserves the earlier native backup chain and all state outside derived crowd indices',()=>{
 for(const source of [olderBackup,oldestBackup]){
  const text=JSON.stringify(source),before=decodeSave(text,oldWorld),loaded=decodeSave(text,world);
  expect(withoutDerivedIndices(loaded.state)).toEqual(withoutDerivedIndices(before.state));expect(loaded.worldTime).toBe(before.worldTime);expect(loaded.migrated).toBe(true);
  expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
 }
});
