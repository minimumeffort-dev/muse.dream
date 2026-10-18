import {saveCompatibilitySource} from './fixtures/pre-city-world';
import {preBusinessState} from './pre-business-state';
import {it,expect} from 'vitest';
import {createWorldScene} from './fixtures/pre-city-world';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {repairTargets,repairNetwork,repairSegment,repairSpaceClear} from '../src/sim/repair';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {npcReviewStart,repairReviewSteps} from '../src/game/review-start';
import {MATCH_COMPATIBILITY,BUSINESS_COMPATIBILITY,SCHOOL_REPAIR_COMPATIBILITY,SOCIAL_COMPATIBILITY,preMatchScene,preSchoolRepairScene,preSchoolRepairCompatibilitySource,sha256} from '../src/scene/save-compatibility';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {worldSeats} from '../src/scene/seating';
import {walkingHeight} from '../src/scene/interiors';
import {stepInteractive,toggleRide} from '../src/sim/interaction';
import prior from './fixtures/save-v14-r64-shared-meal.json';
const scene=createWorldScene(),service=scene.economy!.repairs.find(r=>r.id==='market_tables')!,target=repairTargets(scene,service).find(t=>t.objectId==='school_bench')!;
const world:World={scene,saveCompatibility:MATCH_COMPATIBILITY,previousMatchSaveCompatibility:BUSINESS_COMPATIBILITY,previousBusinessSaveCompatibility:SCHOOL_REPAIR_COMPATIBILITY,previousSchoolRepairSaveCompatibility:SOCIAL_COMPATIBILITY,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
const worker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='caretaker')!,market=(s:CarState)=>s.economy!.markets.find(m=>m.id==='market_stall')!,pocket=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='pocket')!;
const tick=(s:CarState,commerce?:import('../src/sim/commerce').CommerceAction)=>stepCommerce({...s,npcs:stepNpcs(s,.25,scene),population:stepAmbient(s,.25,scene),timeS:s.timeS+.25},{commerce},.25,scene);
it('adds exactly the school bench to existing coverage with unchanged geometry, public navigation and finite graph limits',async()=>{
 const old=preSchoolRepairScene(scene),before=repairTargets(old,old.economy!.repairs.find(r=>r.id===service.id)!);
 expect(await sha256(saveCompatibilitySource(scene))).toBe(MATCH_COMPATIBILITY);expect(await sha256(preSchoolRepairCompatibilitySource(scene))).toBe(SOCIAL_COMPATIBILITY);
 expect(repairTargets(scene,service)).toHaveLength(89);expect(before).toHaveLength(88);expect(repairTargets(scene,service).filter(t=>!before.some(b=>b.objectId===t.objectId&&b.zoneId===t.zoneId)).map(t=>t.objectId)).toEqual(['school_bench']);
 expect(preMatchScene(scene).objects).toEqual(old.objects);expect(sceneContactData(scene)).toEqual(sceneContactData(old));expect(ambientGraph(scene)).toEqual(ambientGraph(old));
 const graph=repairNetwork(scene,service);expect(graph.length).toBe(4305);expect(graph.reduce((n,p)=>n+p.links.length,0)).toBe(14368);expect(service.grounds).toEqual(['park_seating','station_seating','market_hall','school_yard','school_yard_access','school_yard_return']);
});
it('walks the complete route, reserves and consumes one kit, waits for a parked car, saves each phase and pays once',()=>{
 let s={...npcReviewStart(createCarAtSpawn(scene),world,'vendor'),broken:['school_bench']},previous={x:scene.objects.find(o=>o.id==='market_neighbor')!.x,y:scene.objects.find(o=>o.id==='market_neighbor')!.y},waited=false,arrived=false,returned=false,paidOnce=false;const phases=new Set<string>();
 for(let i=0;i<3600;i++){
  s=tick(s);const task=worker(s).repair;
  if(task){expect(Math.hypot(task.x-previous.x,task.y-previous.y)).toBeLessThanOrEqual(3.500001);expect(repairSegment(scene,service,previous,task,undefined,true)).toBe(true);previous={x:task.x,y:task.y};
   if(!phases.has(task.phase)){phases.add(task.phase);s=decodeSave(encodeSave(s,s.timeS,world),world).state;}
   if(task.phase==='home'&&!paidOnce){expect(worker(s).credits).toBe(4);expect(s.economy!.repaired.market_tables).toBe(1);paidOnce=true;}
   if(task.phase==='work'&&!waited){arrived=true;const original=s.vehicles;s={...s,vehicles:s.vehicles.map(v=>v.id===null ? {...v,x:target.contact.x,y:target.contact.y,elevation:walkingHeight(scene,target.contact.x,target.contact.y)} : v)};expect(repairSpaceClear(scene,target,s)).toBe(false);for(let j=0;j<48;j++)s=tick(s);expect(s.broken).toContain('school_bench');expect(s.economy!.repaired.market_tables).toBe(0);expect(worker(s).credits).toBe(0);s=decodeSave(encodeSave(s,s.timeS,world),world).state;s={...s,vehicles:original};waited=true;}
  }else if(arrived){returned=true;break;}
  if(i%80===0)checkEconomyState(s,scene);
 }
 // On reaching home, the hungry caretaker buys two-credit vegetables with the earned wage.
 expect([...phases]).toEqual(['out','work','home']);expect(arrived&&waited&&returned&&paidOnce).toBe(true);expect(s.broken).not.toContain('school_bench');expect(s.economy!.repaired.market_tables).toBe(1);expect(worker(s).completed.repair.market_tables).toBe(1);expect(worker(s).credits).toBe(2);expect(worker(s).inventory.vegetables).toBe(1);expect(market(s).stock.timber).toBe(11);expect(worldSeats(scene).filter(s=>s.objectId==='school_bench')).toHaveLength(2);checkEconomyState(s,scene);
});
it('lets the player claim the same service before dispatch and refunds once on cancellation',()=>{
 let s={...npcReviewStart(createCarAtSpawn(scene),world,'vendor'),broken:['school_bench']};expect(commerceReason(s,scene,'pocket',{kind:'repair',repair:service.id})).toBeUndefined();s=tick(s,{kind:'repair',repair:service.id});expect(pocket(s).repair?.objectId).toBe('school_bench');expect(market(s).stock.timber).toBe(11);expect(worker(s).repair).toBeUndefined();
 s=decodeSave(encodeSave(s,s.timeS,world),world).state;s=tick(s,{kind:'cancel'});s=tick(s,{kind:'cancel'});expect(pocket(s).repair).toBeUndefined();expect(pocket(s).credits).toBe(20);expect(market(s).stock.timber).toBe(12);expect(s.broken).toContain('school_bench');expect(s.economy!.repaired.market_tables).toBe(0);checkEconomyState(s,scene);
 s=tick(s,{kind:'repair',repair:service.id});const task=pocket(s).repair!;s={...s,x:task.at.x,y:task.at.y,elevation:walkingHeight(scene,task.at.x,task.at.y)};for(let i=0;i<40;i++)s=tick(s);
 expect(s.broken).not.toContain('school_bench');expect(pocket(s).credits).toBe(24);expect(pocket(s).completed.repair.market_tables).toBe(1);expect(worker(s).repair).toBeUndefined();checkEconomyState(s,scene);
 const seat=worldSeats(scene).find(s=>s.objectId==='school_bench')!;s=toggleRide({...s,x:seat.approach.x,y:seat.approach.y,elevation:walkingHeight(scene,seat.approach.x,seat.approach.y)},world);expect(s.seated).toEqual({objectId:seat.objectId,seatId:seat.seatId});expect(encodeSave(s,s.timeS,world)).toBeTypeOf('string');
});
it('keeps r64 shared meals, history, damage and every saved field exact, and preserves its original format-14 slot',()=>{
 const old={...prior,state:{...prior.state,broken:['school_bench']}};const text=JSON.stringify(old),restored=decodeSave(text,world);expect(restored.migrated).toBe(true);expect(preBusinessState(restored.state)).toEqual(old.state);expect(restored.worldTime).toBe(old.worldTime);expect(decodeSave(encodeSave(restored.state,restored.worldTime,world),world).migrated).toBe(false);
 const key=`school.v14.${scene.sceneId}.${SOCIAL_COMPATIBILITY}`,rows=new Map([[key,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},saves=gameSave(world,()=>storage,'school');expect(preBusinessState(saves.restored?.state)).toEqual(old.state);expect(saves.write(restored.state,restored.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);rows.set(saves.key,'corrupt');expect(gameSave(world,()=>storage,'school').blocked).toBe(true);
 expect(()=>decodeSave(text,{...world,previousSchoolRepairSaveCompatibility:undefined})).toThrow();expect(()=>decodeSave(text,{...world,saveCompatibility:'f'.repeat(64)})).toThrow();
});
it('prepares the native review through real driving, impact, dispatch and every pedestrian step',()=>{
 const steps=repairReviewSteps(createCarAtSpawn(scene),world,'school-bench','approach');let result=steps.next();while(!result.done)result=steps.next();const s=result.value,task=worker(s).repair!;
 expect(s.control.kind).toBe('foot');expect(s.broken).toContain('school_bench');expect(task.objectId).toBe('school_bench');expect(task.phase).toBe('out');expect(task.distance).toBeGreaterThan(2000);expect(Math.hypot(task.x-task.at.x,task.y-task.at.y)).toBeLessThan(60);expect(s.timeS).toBeGreaterThan(180);expect(encodeSave(s,s.timeS,world)).toBeTypeOf('string');
 let completed=s;for(let i=0;i<2400;i++)completed=stepInteractive(completed,{steer:0,throttle:0},1/120,world);expect(completed.broken).not.toContain('school_bench');expect(completed.economy!.repaired.market_tables).toBe(1);
},60000);

it('retains an earned shared-meal memory exactly through the coverage upgrade',()=>{
 const previous={...world,scene:preSchoolRepairScene(scene),saveCompatibility:SOCIAL_COMPATIBILITY,previousSchoolRepairSaveCompatibility:undefined};let state=decodeSave(JSON.stringify(prior),previous).state;
 for(let i=0;i<922;i++)state=stepInteractive(state,{steer:0,throttle:0},1/120,previous);
 expect(state.economy!.socialHistory!.baker!.meals).toBe(1);const restored=decodeSave(encodeSave(state,state.timeS,previous),world);expect(restored.migrated).toBe(true);expect(preBusinessState(restored.state)).toEqual(JSON.parse(JSON.stringify(state)));
});

it('replays the actual native repaired-bench return while retaining its usable seat and one paid repair',async()=>{
 const original=(await import('./fixtures/save-v14-r65-return.json')).default;let state=decodeSave(JSON.stringify(original),world).state;const priorDistance=worker(state).repair!.distance;
 for(let i=0;i<1200;i++)state=stepInteractive(state,{steer:0,throttle:0},1/120,world);
 expect(state.broken).not.toContain('school_bench');expect(state.seated?.objectId).toBe('school_bench');expect(state.economy!.repaired.market_tables).toBe(1);expect(worker(state).credits).toBe(4);expect(worker(state).repair!.distance).toBeGreaterThan(priorDistance);expect(decodeSave(encodeSave(state,state.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(state)));
});
