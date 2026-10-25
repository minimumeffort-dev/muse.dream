import {beforeAll,afterEach,it,expect} from 'vitest';
import pending from './fixtures/short-links-r113-save-v19.json';
import native from './fixtures/short-links-native-r113-save-v19.json';
import previousNative from './fixtures/crossing-access-r112-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {encodeSave,decodeSave,SAVE_VERSION} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepAmbient} from '../src/sim/ambient';
import {stepNpcs} from '../src/sim/npcs';
import {repairPath} from '../src/sim/repair';

let scene:ReturnType<typeof createWorldScene>,world:World,prior:World,snapshot:string;
beforeAll(()=>{
 scene={...c.preTowerRoomScene(createWorldScene()),revisionId:'r113'};snapshot=JSON.stringify(scene);const oldCrossing=c.preCrossingAccessScene(scene),oldDistrict=c.preDistrictScene(scene);
 world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.WALKING_LINKS_COMPATIBILITY,previousWalkingLinksSaveCompatibility:c.CROSSING_ACCESS_COMPATIBILITY,previousCrossingAccessSaveCompatibility:c.STATION_MAINTENANCE_COMPATIBILITY,previousCrossingAccessContacts:sceneContactData(oldCrossing),previousCrossingAccessNavigation:ambientGraph(oldCrossing),previousStationMaintenanceSaveCompatibility:c.DISTRICT_COMPATIBILITY,previousDistrictSaveCompatibility:c.UPSTAIRS_SOCIAL_COMPATIBILITY,previousDistrictContacts:sceneContactData(oldDistrict),previousDistrictNavigation:ambientGraph(oldDistrict),previousUpstairsSocialSaveCompatibility:c.SEATED_REST_COMPATIBILITY,previousSeatedRestSaveCompatibility:c.COMPANY_COMPATIBILITY};
 prior={...world,saveCompatibility:c.CROSSING_ACCESS_COMPATIBILITY,previousWalkingLinksSaveCompatibility:undefined};
},60000);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const worker=(state:CarState)=>state.economy!.accounts.find(a=>a.id==='caretaker')!;
const advance=(state:CarState)=>stepCommerce({...state,population:stepAmbient(state,.25,scene),npcs:stepNpcs(state,.25,scene),timeS:state.timeS+.25},{},.25,scene);
const length=(start:{x:number;y:number},path:{x:number;y:number}[])=>{let total=0;for(const end of path){total+=Math.hypot(end.x-start.x,end.y-start.y);start=end;}return total;};

it('registers only simulation 54 over the exact existing r113 world and retains all earlier fingerprints',async()=>{
 expect(SAVE_VERSION).toBe(19);expect(JSON.parse(c.preCrowdFlowCompatibilitySource(scene)).simulationVersion).toBe(54);expect(scene.revisionId).toBe('r113');
 const current=c.preCrowdFlowCompatibilitySource(scene),old=c.preWalkingLinksCompatibilitySource(scene);expect(await c.sha256(current)).toBe(c.WALKING_LINKS_COMPATIBILITY);expect(await c.sha256(old)).toBe(c.CROSSING_ACCESS_COMPATIBILITY);
 expect(JSON.parse(current)).toEqual({...JSON.parse(old),simulationVersion:54});
 expect(await c.sha256(c.preCrossingAccessCompatibilitySource(scene))).toBe(c.STATION_MAINTENANCE_COMPATIBILITY);expect(await c.sha256(c.preStationMaintenanceCompatibilitySource(scene))).toBe(c.DISTRICT_COMPATIBILITY);expect(await c.sha256(c.preDistrictCompatibilitySource(scene))).toBe(c.UPSTAIRS_SOCIAL_COMPATIBILITY);
});

it('retains every native saved field, pending work and clock while keeping the original slot',()=>{
 const text=JSON.stringify(native),loaded=decodeSave(text,world);expect(loaded.state).toEqual(native.state);expect(loaded.worldTime).toBe(native.worldTime);expect(loaded.migrated).toBe(true);
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.CROSSING_ACCESS_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));
 expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
 expect(()=>decodeSave(text,{...world,previousWalkingLinksSaveCompatibility:undefined})).toThrow('different world');
 const forged=structuredClone(native);forged.state.economy!.accounts[0]!.credits++;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');
});

it('keeps the original paid repair path and escrow while future plans use the shorter connection',()=>{
 const loaded=decodeSave(JSON.stringify(pending),world);expect(loaded.state).toEqual(pending.state);expect(loaded.worldTime).toBe(pending.worldTime);checkEconomyState(loaded.state,scene);
 const task=worker(loaded.state).repair!;expect(task).toMatchObject({id:'classroom_furniture',objectId:'station_quarter_bench_nw',phase:'out'});expect(task.path).toHaveLength(44);expect(length(task,task.path)).toBeCloseTo(9546.475120381727,6);
 const service=scene.economy!.repairs.find(r=>r.id===task.id)!,home=scene.objects.find(o=>o.id==='market_neighbor')!,future=repairPath(scene,service,home,task.at)!;expect(length(home,future)).toBeCloseTo(7479.139198148574,6);
 const next=advance(loaded.state);expect(worker(next).repair!.path).toEqual(task.path);expect(worker(next).repair!.distance).toBeGreaterThan(task.distance);expect(worker(next).credits).toBe(worker(loaded.state).credits);expect(next.economy!.repaired).toEqual(loaded.state.economy!.repaired);
 const replay=advance(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state);expect(replay).toEqual(next);
});

it('preserves the older registered migration chain and chooses the shorter route for a new finite dispatch',()=>{
 const text=JSON.stringify(previousNative),before=decodeSave(text,prior),after=decodeSave(text,world);expect(after.state).toEqual(before.state);expect(after.worldTime).toBe(before.worldTime);
 let state={...createCarAtSpawn(scene),broken:['station_quarter_bench_nw']};for(let tick=0;tick<240 && worker(state).repair?.phase!=='out';tick++)state=advance(state);
 expect(worker(state).repair).toMatchObject({id:'classroom_furniture',objectId:'station_quarter_bench_nw',phase:'out'});expect(length(worker(state).repair!,worker(state).repair!.path)).toBeLessThan(8000);checkEconomyState(state,scene);
 expect(decodeSave(encodeSave(state,state.timeS,world),world).state).toEqual(state);
});
