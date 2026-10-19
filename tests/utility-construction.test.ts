import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {Vector3,Raycaster,Mesh} from 'three';
import releasedRocks from './fixtures/r74-rock-studies.json';
import catalogue from '../src/scene/world/creations.dream?raw';
import source from '../docs/examples/utility-vehicles.dream?raw';
import {compileDreamWorld,formatDream,checkDream} from '../src/scene/dream';
import {interactiveWorld} from '../src/scene/interactive-world';
import {assemblyBounds,measuredScale} from '../src/scene/measure';
import {buildObject,animateObject} from '../src/game/world3d';
import {disposeChunk} from '../src/game/chunk-packet';
const specs=compileDreamWorld(source).assemblies;
it('rejects utility categories outside their measured envelope or along the wrong axis',()=>{
 for(const [from,to] of [['meters=4.95','meters=3.99'],['meters=4.95','meters=6.81'],['meters=6.6','meters=5.49'],['meters=6.6','meters=12.01'],['kind=pickup,axis=x','kind=pickup,axis=y'],['kind=truck,axis=x','kind=truck,axis=z']]){
  const result=checkDream(source.replace(from!,to!));expect(result.ok).toBe(false);if(!result.ok)expect(result.diagnostics[0]!.path).toContain('measure');
 }
});
it('keeps the seated passenger below the supported cab roof at an independent human scale',()=>{
 const traveler=interactiveWorld.assemblies.find(s=>s.displayName==='Traveler')!,head=assemblyBounds(traveler).max.y*measuredScale(traveler);
 for(const spec of specs){
  expect(spec.parts).toHaveLength(32);expect(spec.joints).toHaveLength(2);expect(spec.measure?.axis).toBe('x');
  const seat=spec.rideable!.seat,roofs=spec.parts.filter(p=>!p.parent && p.shape==='box' && p.size[1]<2 && p.position[1]>seat[1] && Math.abs(p.position[0]-seat[0])<p.size[0]/2 && Math.abs(p.position[2]-seat[2])<p.size[2]/2);
  expect(roofs).toHaveLength(1);const ceiling=(roofs[0]!.position[1]-roofs[0]!.size[1]/2)*measuredScale(spec);
  expect(ceiling-seat[1]*measuredScale(spec)-head,spec.displayName).toBeGreaterThan(.2);
  expect(assemblyBounds(spec).min.y).toBeCloseTo(0);
 }
 expect(compileDreamWorld(formatDream(source)).assemblies).toEqual(specs);
 expect(readFileSync('src/scene/world/street_assets.dream','utf8').endsWith(source.replace(/^dream 2;\n/,''))).toBe(true);
});
it('retains round tires and hubs at the live voxel size, with fixed coaxial centers while rolling',()=>{
 for(const raw of specs){
  const spec={...raw,voxelSize:1},group=buildObject({id:'vehicle',kind:'custom',labelText:spec.displayName,x:0,y:0,scale:measuredScale(spec),spec});group.updateMatrixWorld(true);
  const discs=spec.parts.filter(p=>p.shape==='prism' && p.parent && Math.abs(p.size[0]-p.size[1])<1e-8),centers=new Map<string,Vector3>();expect(discs).toHaveLength(10);
  for(const part of discs){const mesh=group.getObjectByName(part.id) as Mesh;centers.set(part.id,mesh.getWorldPosition(new Vector3()));
   for(let n=0;n<16;n++)for(const radius of [.485,.505]){
    const angle=(n+.5)*Math.PI/8,origin=mesh.localToWorld(new Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,2)),toward=mesh.localToWorld(new Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,0));
    const hits=new Raycaster(origin,toward.sub(origin).normalize()).intersectObject(mesh,false);expect(hits.length>0,part.id+': '+radius).toBe(radius<.5);
   }
  }
  for(const distance of [3,17,44]){animateObject(group,0,true,distance);group.updateMatrixWorld(true);for(const part of discs)expect(group.getObjectByName(part.id)!.getWorldPosition(new Vector3()).distanceTo(centers.get(part.id)!)).toBeLessThan(1e-8);}
  disposeChunk(group);
 }
});

it('retains both released rock studies exactly in the optional catalogue without consuming live definition slots',()=>{
 const library=compileDreamWorld(catalogue).assemblies;
 for(const released of releasedRocks)expect(library.find(s=>s.displayName===released.displayName)).toEqual(released);
});
