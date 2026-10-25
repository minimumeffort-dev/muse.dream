import {afterEach,expect,it} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {toggleRide} from '../src/sim/interaction';
import {encodeSave} from '../src/sim/save';
import {strikeTarget} from '../src/sim/strike';
import {checkEconomyState} from '../src/sim/commerce';
import {stationMaintenanceReviewStart,stationMaintenanceReviewSteps,stationRepairObject,type StationRepairTarget} from '../src/game/station-maintenance-review';

let live:World|undefined,snapshot:string;
function world(){if(!live){const scene=createWorldScene();snapshot=JSON.stringify(scene);live={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11};}return live;}
afterEach(()=>{if(live)expect(JSON.stringify(live.scene)).toBe(snapshot);});

it('starts beside real contacts without seeding damage, credit or losing an already parked car',()=>{
 const w=world(),initial=createCarAtSpawn(w.scene);
 for(const target of ['bench','lamp','lobby'] as StationRepairTarget[]){
  const state=stationMaintenanceReviewStart(initial,w,target);
  expect(strikeTarget(state,w)?.id).toBe(stationRepairObject(target));
  expect(state.broken).toEqual(initial.broken);expect(state.economy).toEqual(initial.economy);
 }
 const foot=toggleRide(initial,w),alreadyWalking=stationMaintenanceReviewStart(foot,w);
 expect(alreadyWalking.vehicles).toEqual(foot.vehicles);expect(()=>encodeSave(alreadyWalking,alreadyWalking.timeS,w)).not.toThrow();
});

it('uses a real car impact for the stronger tree, then exits without changing its threshold',async()=>{
 const w=world(),steps=stationMaintenanceReviewSteps(createCarAtSpawn(w.scene),w,'tree','damaged');let result=steps.next();while(!result.done){result=steps.next();await new Promise(resolve=>setTimeout(resolve,0));}
 expect(result.value.control.kind).toBe('foot');expect(result.value.broken).toContain('station_quarter_tree_east');
 expect(w.scene.interactionRules.find(r=>r.kind==='tree')!.impact).toMatchObject({kind:'topple',speed:110});
 expect(()=>encodeSave(result.value,result.value.timeS,w)).not.toThrow();
});

it('hands a true impact to the repair dispatcher through the full fixed tick, without paying for travel',async()=>{
 const w=world(),steps=stationMaintenanceReviewSteps(createCarAtSpawn(w.scene),w,'bench','damaged');let result=steps.next();while(!result.done){result=steps.next();await new Promise(resolve=>setTimeout(resolve,0));}
 let state=result.value;const account=()=>state.economy!.accounts.find(a=>a.id==='caretaker')!;
 expect(state.broken).toContain('station_quarter_bench_nw');const before=account().credits;
 for(let i=0;i<120*20;i++){state=stepInteractive(state,{steer:0,throttle:0},1/120,w);if(i%120===0)await new Promise(resolve=>setTimeout(resolve,0));}
 expect(account().repair).toMatchObject({objectId:'station_quarter_bench_nw',phase:'out'});
 expect(account().repair!.distance).toBeGreaterThan(100);expect(account().completed.repair.classroom_furniture).toBe(0);expect(account().credits).toBe(before);
 expect(state.broken).toContain('station_quarter_bench_nw');checkEconomyState(state,w.scene);
},60000);
