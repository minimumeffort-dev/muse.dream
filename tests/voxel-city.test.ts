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
 it('uses voxels across architecture, transit, boat fittings, benches and a paired park boundary',()=>{
  const objects=scene.objects.filter(o=>o.spec && 'parts' in o.spec && o.spec.parts.some(p=>'voxels' in p && p.voxels));
  expect(objects).toHaveLength(201);expect(new Set(objects.map(o=>o.spec!.displayName)).size).toBe(17);
  const expected=compileDream(wall)[0]!;
  for(const id of ['park_wall_west','park_wall_east'])expect(scene.objects.find(o=>o.id===id)!.spec).toEqual({...expected,voxelSize:scene.voxelWorld?.objectCell});
  const reactive=scene.objects.filter(o=>o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && (o.spec.impact || o.spec.breakZones));
  expect(reactive).toHaveLength(422);expect(impactBudget(scene)).toMatchObject({resident:12,residentFragments:27,pooledTemplates:10});
  expect(scene.sports.map(s=>s.ballId).sort()).toEqual(['court_ball','pitch_ball']);
  expect(reactive.reduce((n,o)=>n+((o.spec as ObjectDslV2).impact?.kind==='bounce' ? 0 : objectFragments(o.spec as ObjectDslV2).length),0)).toBe(473);
 });
 it('allows a real off-road car impact to release four chunks and continues driving',()=>{
  const world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11};
  let state=drivingReviewStart(createCarAtSpawn(scene),world,'voxels');expect(state.x).toBe(7440);
  for(let i=0;i<300 && !state.broken.includes('park_wall_west');i++)state=stepCar(state,{throttle:1,steer:0},1/120,world);
  expect(state.broken).toContain('park_wall_west');expect(state.debris.filter(d=>d.objectId==='park_wall_west')).toHaveLength(4);
  const x=state.x;for(let i=0;i<60;i++)state=stepCar(state,{throttle:1,steer:0},1/120,world);expect(state.x).toBeGreaterThan(x+10);
  expect(state.nextCheckpoint).toBe(1);expect(resetCar(state,scene).broken).toContain('park_wall_west');expect(resetCar(state,scene,true).broken).toEqual([]);
 });
});
