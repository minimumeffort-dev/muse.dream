import {readFileSync} from 'node:fs';
import {serviceVisitsReviewSteps} from '../src/game/service-visits-review';
import {beforeAll,afterEach,it,expect} from 'vitest';
import native from '../docs/evidence/recurring-work/native-restored.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {decodeSave,encodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
let scene:ReturnType<typeof createWorldScene>,prior:typeof scene,world:World,old:World,snapshot:string;
beforeAll(()=>{scene={...c.preResidentialRoomScene(createWorldScene()),revisionId:'r119',sourceHash:'handmade-city-life-v119'};prior={...c.preServiceVisitsScene(scene),revisionId:'r118',sourceHash:'handmade-city-life-v118'};snapshot=JSON.stringify(scene);world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.SERVICE_VISITS_COMPATIBILITY,previousServiceVisitsSaveCompatibility:c.RECURRING_WORK_COMPATIBILITY};old={...world,scene:prior,saveCompatibility:c.RECURRING_WORK_COMPATIBILITY,previousServiceVisitsSaveCompatibility:undefined};},60000);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const tick=(s:CarState,doc=scene)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc),population:stepAmbient(s,.25,doc)},{},.25,doc);
const account=(s:CarState,id:string)=>s.economy!.accounts.find(a=>a.id===id)!;
it('registers paid customer visits without changing meshes, pavement, goods or existing capital',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(60);expect(scene.revisionId).toBe('r119');expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.SERVICE_VISITS_COMPATIBILITY);expect(await c.sha256(c.preServiceVisitsCompatibilitySource(scene))).toBe(c.RECURRING_WORK_COMPATIBILITY);
 for(const k of ['objects','surfaces','streets','floors','routes','behaviors'] as const)expect(scene[k]).toEqual(prior[k]);expect(scene.economy!.goods).toEqual(prior.economy!.goods);expect(scene.economy!.markets).toEqual(prior.economy!.markets);expect(scene.economy!.accounts).toHaveLength(prior.economy!.accounts.length+1);expect(scene.economy!.visits).toHaveLength(2);
});
it('preserves every actual r118 saved field, clock and original slot while adding only explicit customer state',()=>{
 const text=JSON.stringify(native),before=decodeSave(text,old),loaded=decodeSave(text,world),copy=structuredClone(loaded.state),e=copy.economy!;
 expect(loaded.migrated).toBe(true);expect(loaded.worldTime).toBe(native.worldTime);expect(e.served).toEqual({check_records:0});expect(account(copy,'clinic_visitor').credits).toBe(20);e.accounts=e.accounts.filter(a=>a.id!=='clinic_visitor');for(const a of e.accounts){expect(a.visits).toEqual({check_records:{completed:0,nextAtS:e.atS}});delete a.visits;}delete e.served;expect(copy).toEqual(before.state);
 expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);expect(()=>decodeSave(text,{...world,previousServiceVisitsSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.RECURRING_WORK_COMPATIBILITY}`,rows=new Map([[key,text]]),saves=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(saves.restored!.state).toEqual(loaded.state);expect(saves.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
it('finishes an actually reserved old office job once without inventing a paid customer or replaying its wage',()=>{
 let previous=createCarAtSpawn(prior);for(let i=0;i<1200&&!account(previous,'office_clerk').work;i++)previous=tick(previous,prior);expect(account(previous,'office_clerk').work?.id).toBe('check_records');
 const before=account(previous,'office_clerk'),s=decodeSave(encodeSave(previous,previous.timeS,old),world).state;expect(account(s,'office_clerk').work).toEqual({...before.work,legacy:true});let next=s;
 for(let i=0;i<30;i++)next=tick(next);expect(account(next,'office_clerk').credits).toBe(before.credits+4);expect(account(next,'office_clerk').completed.work.check_records).toBe(before.completed.work.check_records!+1);expect(next.economy!.served!.check_records).toBe(0);expect(next.economy!.accounts.some(a=>a.request)).toBe(false);expect(account(next,'office_clerk').work).toBeUndefined();checkEconomyState(next,scene);
});

it('walks the player upstairs, requests a real service and completes it through the shared clerk',async()=>{
 const steps=serviceVisitsReviewSteps(createCarAtSpawn(scene),world,'served');let r=steps.next(),n=0;while(!r.done){if(++n%120===0)await new Promise(resolve=>setTimeout(resolve,0));r=steps.next();}const s=r.value;
 expect(s.seated?.objectId).toBe('station_quarter_gallery_north');expect(s.elevation).toBeGreaterThan(48);expect(account(s,'pocket').credits).toBe(12);expect(account(s,'pocket').visits!.check_records!.completed).toBe(1);expect(account(s,'office_clerk').credits).toBe(4);expect(s.economy!.markets.find(m=>m.id==='office_business')!.credits).toBe(64);expect(account(s,'pocket').request).toBeUndefined();checkEconomyState(s,scene);expect(decodeSave(encodeSave(s,s.timeS,world),world).state).toEqual(JSON.parse(encodeSave(s,s.timeS,world)).state);
},60000);

type TripRecording={simulationVersion:number;compatibilityHash:string;sourceRevision:string;done:boolean;stepSeconds:number;points:{steps:number;packet:unknown}[]};
const trip=JSON.parse(readFileSync(new URL('./fixtures/service-visits/fresh.json',import.meta.url),'utf8')) as TripRecording;
it('records a complete city visit and physical return with conserved fees, wages and persistent memory',()=>{
 expect(trip.done).toBe(true);expect(trip.simulationVersion).toBe(60);expect(trip.compatibilityHash).toBe(c.SERVICE_VISITS_COMPATIBILITY);expect(trip.sourceRevision).toBe('r119');const last=decodeSave(JSON.stringify(trip.points.at(-1)!.packet),world).state,customer=account(last,'clinic_visitor');expect(customer.visiting).toBeUndefined();expect(customer.request).toBeUndefined();expect(customer.visits!.check_records!.completed).toBe(1);expect(customer.credits).toBe(12);expect(customer.visits!.check_records!.nextAtS).toBeCloseTo(last.timeS+600);expect(last.economy!.served!.check_records).toBe(2);checkEconomyState(last,scene);
});
it.each(trip.points.slice(1).map((to,i)=>({label:i,from:trip.points[i]!,to})))('replays city visit segment $label exactly across save/load',async({from,to})=>{
 let s=decodeSave(JSON.stringify(from.packet),world).state;for(let i=from.steps;i<to.steps;i++){s=tick(s);if(i%120===0)await new Promise(resolve=>setTimeout(resolve,0));}expect(JSON.parse(encodeSave(s,s.timeS,world))).toEqual(to.packet);checkEconomyState(s,scene);
},60000);
