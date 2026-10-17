import {it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {tiledMesh,tiledMeshSteps} from '../src/game/batching';
import {voxelSurface,voxelTerrainTile} from '../src/game/voxel-columns';
import {assemblyBounds} from '../src/scene/measure';
import {mockCastle} from '../src/scene/mock-objects';
import {loadingScreen} from '../src/game/loading';
import {geometryMemory} from '../src/game/geometry-memory';

it('staged tiling yields and produces exactly the synchronous buffers and bounds',()=>{
 const source=new THREE.PlaneGeometry(900,450,9,6).rotateX(-Math.PI/2),material=new THREE.MeshBasicMaterial();
 source.userData.voxelOptions={cell:8,step:1,lift:0,thickness:2};
 const plain=source.clone();plain.userData=source.userData;
 const steps=tiledMeshSteps(source,material);let result=steps.next(),yields=0;
 while(!result.done){yields++;result=steps.next();}
 const sync=tiledMesh(plain,material),staged=result.value;
 expect(yields).toBeGreaterThan(4);expect(staged.children.length).toBe(sync.children.length);
 for(const [i,child] of staged.children.entries()){
  const a=(child as THREE.Mesh).geometry,b=(sync.children[i] as THREE.Mesh).geometry;
  expect(a.index!.array).toEqual(b.index!.array);
  for(const [name,attr] of Object.entries(a.attributes))expect(attr.array).toEqual(b.getAttribute(name).array);
  expect(a.boundingSphere).toEqual(b.boundingSphere);
 }
});
it('column indexing retains analytic UVs, negative coordinates and large index ranges',()=>{
 const source=new THREE.PlaneGeometry(160,160).rotateX(-Math.PI/2).translate(-80,0,-80);
 const g=voxelSurface(source,{cell:1,step:1,lift:0,thickness:2,maxMerge:1});
 expect(g.index!.array).toBeInstanceOf(Uint32Array);
 const p=g.getAttribute('position'),uv=g.getAttribute('uv'),n=g.getAttribute('normal');
 expect(p.count).toBe(g.userData.voxel.quads*4);expect(g.index!.count).toBe(g.userData.voxel.quads*6);
 for(let i=0;i<p.count;i++){
  expect(uv.getX(i)).toBeCloseTo((p.getX(i)+160)/160,5);
  expect(uv.getY(i)).toBeCloseTo(-p.getZ(i)/160,5);
 }
 expect(n.count).toBe(p.count);expect(Array.from(g.index!.array).reduce((a,b)=>Math.max(a,b),0)).toBeLessThan(p.count);
});
it('shared assembly bounds retain exact geometry and return independent copies',()=>{
 const original=structuredClone(mockCastle),first=assemblyBounds(original),copy=structuredClone(original);
 expect(assemblyBounds(copy)).toEqual(first);
 const changed=structuredClone(original);changed.parts[0]!.size[0]*=20;expect(assemblyBounds(changed)).not.toEqual(first);
 first.min.x=-99999;expect(assemblyBounds(original).min.x).not.toBe(-99999);
});

it('terrain column keys retain fractional origins across the world center',()=>{
 const geometry=voxelTerrainTile(-196,-196,{groundCell:8,heightStep:1,objectCell:1},()=>0,()=>new THREE.Color('#52744c'));
 expect(geometry.userData.voxel).toMatchObject({columns:2500,quads:1});
 geometry.computeBoundingBox();expect(geometry.boundingBox!.min.toArray()).toEqual([-196,0,-196]);
 expect(geometry.boundingBox!.max.toArray()).toEqual([204,0,204]);
});

it('invalid numeric geometry cannot poison the shared bounds of a valid default',()=>{
 const valid=structuredClone(mockCastle);valid.parts=[{...valid.parts[0]!,shape:'cylinder'}];
 const invalid={...valid,parts:[{...valid.parts[0]!,taper:NaN}]};
 const error=vi.spyOn(console,'error').mockImplementation(()=>{});
 try {assemblyBounds(invalid);const bounds=assemblyBounds(valid);expect([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite)).toBe(true);}
 finally {error.mockRestore();}
});

it('loading yields between stages, completes only on ready and exposes recoverable failures',async()=>{
 vi.useFakeTimers();
 const elements=new Map<string,any>();for(const id of ['#loading','#loading-status','#loading-retry','#loading-track','#game'])elements.set(id,{dataset:{},hidden:true,textContent:'',setAttribute:vi.fn()});
 const body={dataset:{loading:'loading'}};
 vi.stubGlobal('document',{querySelector:(id:string)=>elements.get(id),body});
 const error=vi.spyOn(console,'error').mockImplementation(()=>{});
 try {
  const loading=loadingScreen(),stage=loading.stage('Building terrain');
  expect(elements.get('#loading-status').textContent).toBe('Building terrain');
  expect(body.dataset.loading).toBe('loading');await vi.advanceTimersByTimeAsync(1);await stage;
  const build=loading.build('Building assets',(function*(){yield;return 42;})());
  await vi.advanceTimersByTimeAsync(1);expect(await build).toBe(42);
  loading.ready();expect(body.dataset.loading).toBe('ready');expect(elements.get('#loading').hidden).toBe(true);
  expect(JSON.parse(elements.get('#loading').dataset.result).phases.map((p:any)=>p.label)).toEqual(['Building terrain','Building assets']);
  const failed=loadingScreen();failed.fail(new Error('WebGL unavailable'));
  expect(body.dataset.loading).toBe('error');expect(elements.get('#loading-retry').hidden).toBe(false);
  expect(elements.get('#loading').hidden).toBe(false);
  expect(elements.get('#loading-status').textContent).toContain('Reload');expect(vi.getTimerCount()).toBe(0);
 } finally {error.mockRestore();vi.unstubAllGlobals();vi.useRealTimers();}
});

it('memory accounting shares geometry buffers but includes every instance buffer',()=>{
 const group=new THREE.Group(),g=new THREE.BoxGeometry(1,1,1),m=new THREE.MeshBasicMaterial();
 group.add(new THREE.InstancedMesh(g,m,2),new THREE.InstancedMesh(g,m,3));
 const expected=Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+g.index!.array.byteLength+5*16*4;
 expect(geometryMemory(group)).toMatchObject({bytes:expected,geometries:1,uniqueTriangles:12});
});

it('staged surface clipping preserves terrain, holes, normals and UVs',async()=>{
 const {surfaceGeometry,surfaceGeometrySteps}=await import('../src/game/surface');
 const {createFixtureScene}=await import('../src/scene/fixture');
 const doc=createFixtureScene(),polygons=[[{x:90,y:90},{x:330,y:90},{x:330,y:330},{x:90,y:330}]],cutouts=[[{x:180,y:180},{x:240,y:180},{x:240,y:240},{x:180,y:240}]];
 const sync=surfaceGeometry(doc,polygons,1.6,undefined,undefined,cutouts),steps=surfaceGeometrySteps(doc,polygons,1.6,undefined,undefined,cutouts);
 let result=steps.next(),yields=0;while(!result.done){yields++;result=steps.next();}
 expect(yields).toBeGreaterThan(10);for(const [name,attr] of Object.entries(sync.attributes))expect(result.value.getAttribute(name).array).toEqual(attr.array);
});
it('distant clipping outlines do not change local union/subtraction results',async()=>{
 const {subtractPolygons,unionPolygons}=await import('../src/scene/polygons');
 const rect=(x:number,y:number)=>[{x,y},{x:x+10,y},{x:x+10,y:y+10},{x,y:y+10}];
 const input=[rect(0,0),rect(5,5)],holes=[rect(8,-5)],distant=Array.from({length:100},(_,i)=>rect(100+i*20,100));
 expect(subtractPolygons(input,[...distant,...holes])).toEqual(subtractPolygons(input,holes));
 expect(unionPolygons(input,[...holes,...distant])).toEqual(unionPolygons(input,holes));
});
