import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {compileDreamWorld} from '../src/scene/dream';
import {partGeometry} from '../src/scene/object-geometry';
import architecture from '../src/scene/world/architecture.dream?raw';
import type {ObjectPart} from '../src/scene/object-dsl';

const assets=compileDreamWorld(architecture).assemblies;
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
function mesh(part:ObjectPart,voxel?:number){
 const result=new THREE.Mesh(partGeometry(part,voxel),material);
 result.position.fromArray(part.position);result.rotation.set(...(part.rotation??[0,0,0]));result.scale.fromArray(part.size);result.updateMatrixWorld(true);return result;
}

describe('continuous planar voxel roofs',()=>{
 it('keeps every roof panel closed and flat across all ten sloping architecture templates',()=>{
  let checked=0;
  for(const spec of assets){
   const roof=spec.parts.find(p=>['prism','pyramid'].includes(p.shape) && ['#535b64','#aa6b50'].includes(p.material.colorA));if(!roof)continue;
   const actual=mesh(roof,1),expected=mesh(roof),ray=new THREE.Raycaster();
   // Scan between voxel centres as well as through them, at seven roof depths.
   for(let iz=-3;iz<=3;iz++)for(let ix=-36;ix<=36;ix++){
    ray.set(new THREE.Vector3(ix/40*roof.size[0]/2,80,iz/4*roof.size[2]/2),new THREE.Vector3(0,-1,0));
    const reference=ray.intersectObject(expected)[0];if(!reference)continue;
    const hit=ray.intersectObject(actual)[0];expect(hit,spec.displayName).toBeDefined();expect(hit!.point.y,spec.displayName).toBeCloseTo(reference.point.y,5);
   }
   const normal=actual.geometry.getAttribute('normal'),directions=new Set<string>();
   for(let i=0;i<normal.count;i++)if(normal.getY(i)>.1)directions.add([normal.getX(i),normal.getY(i),normal.getZ(i)].map(n=>n.toFixed(3)).join(','));
   expect(directions.size,spec.displayName).toBe(roof.shape==='prism'?2:4);
   expect(actual.geometry.userData.voxel.surface).toBe('planar');
   expect(actual.geometry.getAttribute('position').count).toBeLessThanOrEqual(expected.geometry.index?.count??expected.geometry.getAttribute('position').count);
   actual.geometry.computeBoundingBox();expected.geometry.computeBoundingBox();expect(actual.geometry.boundingBox).toEqual(expected.geometry.boundingBox);
   actual.geometry.dispose();expected.geometry.dispose();checked++;
  }
  expect(checked).toBe(10);
 });
 it('preserves the hollow roof underside and gives cached callers independent buffers',()=>{
  const part=assets[0]!.parts.find(p=>p.shape==='prism')!,a=partGeometry(part,1),b=partGeometry(part,1);
  const shape=new THREE.Mesh(b,material),ray=new THREE.Raycaster(new THREE.Vector3(0,-.25,0),new THREE.Vector3(0,1,0));shape.updateMatrixWorld(true);
  // The underside is above the centre of the hollow shell, rather than a solid cap.
  expect(ray.intersectObject(shape)[0]!.point.y).toBeGreaterThan(.3);
  a.getAttribute('position').setXYZ(0,99,99,99);expect(b.getAttribute('position').getX(0)).not.toBe(99);
  expect(a.userData.voxel.grid.every((n:number)=>n>=4&&n<=32)).toBe(true);
  a.dispose();b.dispose();
 });
});
