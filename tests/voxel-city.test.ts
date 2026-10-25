import {describe,it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {createCarAtSpawn,stepCar,resetCar} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {impactBudget} from '../src/scene/damage-pool';
import {objectFragments} from '../src/scene/fragments';
import {drivingReviewStart} from '../src/game/review-start';
import type {ObjectDslV2} from '../src/scene/object-dsl';
import {compileDream} from '../src/scene/dream';
import wall from '../docs/examples/voxel-wall.dream?raw';

const scene=createWorldScene();
describe('voxel city integration',()=>{
 it('uses voxels across architecture, transit, boat fittings, people and paired park boundaries',()=>{
  const objects=scene.objects.filter(o=>o.spec && 'parts' in o.spec && o.spec.parts.some(p=>'voxels' in p && p.voxels));
  const people=scene.objects.filter(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='person'),infrastructure=objects.filter(o=>!people.includes(o));
  const added=(o:{id:string})=>o.id.startsWith('station_quarter_');
  expect(infrastructure).toHaveLength(206);expect(infrastructure.filter(o=>!added(o))).toHaveLength(200);expect(new Set(infrastructure.map(o=>o.spec!.displayName)).size).toBe(22);expect(new Set(infrastructure.filter(o=>!added(o)).map(o=>o.spec!.displayName)).size).toBe(18);expect(new Set(infrastructure.filter(added).map(o=>o.spec!.displayName)).size).toBe(4);
  expect(infrastructure.filter(added).map(o=>o.id)).toEqual(['station_quarter_residences','station_quarter_offices','station_quarter_taxi_0','station_quarter_taxi_1','station_quarter_van_0','station_quarter_van_1']);
  expect(people).toHaveLength(141);expect(people.filter(o=>!added(o))).toHaveLength(133);expect(people.filter(added)).toHaveLength(8);expect(people.every(o=>objects.includes(o))).toBe(true);expect(objects).toHaveLength(infrastructure.length+people.length);
  expect(infrastructure.some(o=>o.id==='market_hall')).toBe(true);
  const benches=scene.objects.filter(o=>o.spec?.displayName==='Slatted park bench');expect(benches).toHaveLength(19);expect(benches.filter(o=>!added(o))).toHaveLength(13);expect(benches.filter(added)).toHaveLength(6);expect(benches.every(o=>'voxelSize' in o.spec! && o.spec.voxelSize===scene.voxelWorld?.objectCell)).toBe(true);
  const expected=compileDream(wall)[0]!;
  for(const id of ['park_wall_west','park_wall_east'])expect(scene.objects.find(o=>o.id===id)!.spec).toEqual({...expected,voxelSize:scene.voxelWorld?.objectCell});
  const reactive=scene.objects.filter(o=>o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && (o.spec.impact || o.spec.breakZones));
  expect(reactive).toHaveLength(832);expect(reactive.filter(o=>!added(o))).toHaveLength(818);expect(reactive.filter(added)).toHaveLength(14);expect(reactive.map(o=>o.id)).toEqual(expect.arrayContaining(['hall_workbench','home_upper_settee','home_upper_table','home_upper_planter','home_settee','home_table','home_planter']));expect(impactBudget(scene)).toMatchObject({resident:12,residentFragments:27,pooledTemplates:21});
  expect(scene.sports.map(s=>s.ballId).sort()).toEqual(['court_ball','pitch_ball']);
  const fragments=(objects:typeof reactive)=>objects.reduce((n,o)=>n+((o.spec as ObjectDslV2).impact?.kind==='bounce' ? 0 : objectFragments(o.spec as ObjectDslV2).length),0);
  expect(fragments(reactive)).toBe(1052);expect(fragments(reactive.filter(o=>!added(o)))).toBe(1002);expect(fragments(reactive.filter(added))).toBe(50);
 });
 it('allows a real off-road car impact to release four chunks and continues driving',()=>{
  const world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11};
  let state=drivingReviewStart(createCarAtSpawn(scene),world,'voxels');expect(state.x).toBe(7440);
  for(let i=0;i<300 && !state.broken.includes('park_wall_west');i++)state=stepCar(state,{throttle:1,steer:0},1/120,world);
  expect(state.broken).toContain('park_wall_west');expect(state.debris.filter(d=>d.objectId==='park_wall_west')).toHaveLength(4);
  const x=state.x;for(let i=0;i<60;i++)state=stepCar(state,{throttle:1,steer:0},1/120,world);expect(state.x).toBeGreaterThan(x+10);
  expect(state.nextCheckpoint).toBe(0);expect(resetCar(state,scene).broken).toContain('park_wall_west');expect(resetCar(state,scene,true).broken).toEqual([]);
 });
});
