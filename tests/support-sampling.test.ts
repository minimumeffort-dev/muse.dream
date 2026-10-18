import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import golden from './fixtures/object-support-r69.json';
import {createFixtureScene} from '../src/scene/fixture';
import type {SceneObject} from '../src/scene/schema';
import {objectSupport} from '../src/scene/object-support';

it('retains the ordered underside samples of the released buildings, vehicles, people, voxels and legacy shapes',()=>{
 const scene=createFixtureScene();expect(golden.profiles).toHaveLength(12);expect(golden.numericGrid).toBe(1e-8);
 for(const {object,count,sha256} of golden.profiles){
  const points=objectSupport(scene,object as SceneObject);
  expect(points,object.id).toHaveLength(count);expect(new Set(points).size,object.id).toBe(count);
  expect(createHash('sha256').update(JSON.stringify(points.map(p=>[p.x,p.y,p.z].map(n=>Math.round(n*1e8)/1e8)))).digest('hex'),object.id).toBe(sha256);
 }
});
