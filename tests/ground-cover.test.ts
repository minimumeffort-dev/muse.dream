import {it,expect,vi} from 'vitest';
import * as THREE from 'three';
import source from '../src/scene/ground-cover.dream?raw';
import example from '../docs/examples/ground-cover.dream?raw';
import old from './fixtures/ground-cover-r77.json';
import {compileDream} from '../src/scene/dream';
import {createFixtureScene} from '../src/scene/fixture';
import {groundCoverGeometry} from '../src/game/ground-cover';
import {buildEnvironmentSteps} from '../src/game/environment';
import {finishBuild} from '../src/game/batching';
import {packChunk,unpackChunk,disposeChunk} from '../src/game/chunk-packet';
import {voxelSurfaceBase,surfaceHeight} from '../src/game/surface';
import {geometryMemory} from '../src/game/geometry-memory';
const specs=compileDream(source),fixture=createFixtureScene();
const cover=(root:THREE.Group)=>{const meshes:THREE.InstancedMesh[]=[];root.traverse(n=>{if(n instanceof THREE.InstancedMesh && n.name.startsWith('ground-cover-'))meshes.push(n);});return meshes;};
const poses=(root:THREE.Group,name:string)=>{const result:number[][]=[],m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();for(const mesh of cover(root).filter(m=>m.name===`ground-cover-${name}`))for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);m.decompose(p,q,s);result.push([p.x,p.z,s.x]);}return result.sort((a,b)=>a[0]!-b[0]!||a[1]!-b[1]!);};
it('compiles the exact reusable example and keeps grass tips below the solid flower center',()=>{
 expect(example).toBe(source);expect(specs.map(s=>s.parts.length)).toEqual([3,5,8]);
 for(const cell of [undefined,1]){
  const grass=groundCoverGeometry('grass',cell),flower=groundCoverGeometry('flower',cell);grass.computeBoundingBox();flower.computeBoundingBox();expect(grass.boundingBox!.min.y).toBeCloseTo(0,6);expect(flower.boundingBox!.min.y).toBeCloseTo(0,6);expect(grass.boundingBox!.max.y).toBeCloseTo(4.5,6);expect(flower.boundingBox!.max.y).toBeCloseTo(6.6,6);
  const white=new THREE.Color('#ffffff'),colors=flower.getAttribute('color'),p=flower.getAttribute('position'),petalY:number[]=[];for(let i=0;i<p.count;i++)if(new THREE.Color().fromBufferAttribute(colors,i).equals(white))petalY.push(p.getY(i));expect(Math.min(...petalY)).toBeGreaterThan(grass.boundingBox!.max.y+.5);
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(flower,material);mesh.updateMatrixWorld();const hit=new THREE.Raycaster(new THREE.Vector3(0,20,0),new THREE.Vector3(0,-1,0)).intersectObject(mesh)[0]!;expect(hit.point.y).toBeCloseTo(6.6,5);expect(Math.max(...new THREE.Color().fromBufferAttribute(colors,hit.face!.a).toArray().map((v,i)=>Math.abs(v-new THREE.Color('#d9aa45').toArray()[i]!)))).toBeLessThan(1e-6);
  expect((grass.index?.count??grass.getAttribute('position').count)/3).toBe(36);expect((flower.index?.count??p.count)/3).toBe(124);grass.dispose();flower.dispose();material.dispose();
 }
 const flower=specs[1]!,stalk=flower.parts[0]!;for(const leaf of flower.parts.filter(p=>p.shape==='prism'&&p.outline?.length===3)){const root=new THREE.Vector3(-.5,0,0).multiply(new THREE.Vector3(...leaf.size)).applyEuler(new THREE.Euler(...(leaf.rotation??[0,0,0]))).add(new THREE.Vector3(...leaf.position));expect(Math.abs(root.x)).toBeLessThan(stalk.size[0]/2);expect(Math.abs(root.z)).toBeLessThan(stalk.size[2]/2);expect(root.y).toBeGreaterThan(0);expect(root.y).toBeLessThan(6.4);}
});
it('retains every released seeded position and scale, with upright roots fitted to the visible ground',()=>{
 for(const voxelWorld of [undefined,{groundCell:8 as const,heightStep:1,objectCell:1}]){
  const scene={...fixture,voxelWorld},before=JSON.stringify(scene),root=finishBuild(buildEnvironmentSteps(scene));
  for(const name of ['grass','flower'] as const){const actual=poses(root,name);expect(actual.length).toBe(old[name].length);for(const [i,point]of actual.entries()){expect(point.slice(0,2)).toEqual(old[name][i]!.slice(0,2));expect(point[2]).toBeCloseTo(old[name][i]![2]!,6);}}
  const matrix=new THREE.Matrix4();for(const mesh of cover(root))for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const x=matrix.elements[12]!+scene.canonical.width/2,y=matrix.elements[14]!+scene.canonical.height/2,base=voxelWorld ? Math.floor(voxelSurfaceBase(scene,matrix.elements[12]!,matrix.elements[14]!)/voxelWorld.heightStep)*voxelWorld.heightStep : surfaceHeight(scene,x,y);expect(matrix.elements[13]).toBeCloseTo(base-.12,5);expect(matrix.elements[1]).toBe(0);expect(matrix.elements[6]).toBe(0);}
  expect(JSON.stringify(scene)).toBe(before);disposeChunk(root);
 }
});
it('plants roots into the actual rendered hill triangles and voxel column tops',()=>{
 for(const voxelWorld of [undefined,{groundCell:8 as const,heightStep:1,objectCell:1}]){
  const scene={...fixture,terrain:{...fixture.terrain,hills:[{id:'cover-hill',x:480,y:360,radiusX:600,radiusY:400,height:75}]},voxelWorld},root=finishBuild(buildEnvironmentSteps(scene));root.updateMatrixWorld(true);
  const ground=root.children.filter(n=>n instanceof THREE.Mesh && (n.material as THREE.Material).userData.streamMaterial?.kind==='ground'),m=new THREE.Matrix4();let checked=0;
  for(const mesh of cover(root))for(let i=0;i<mesh.count;i+=17){mesh.getMatrixAt(i,m);const x=m.elements[12]!,z=m.elements[14]!,hit=new THREE.Raycaster(new THREE.Vector3(x,500,z),new THREE.Vector3(0,-1,0)).intersectObjects(ground,false)[0]!;expect(hit).toBeDefined();expect(m.elements[13]!-hit.point.y).toBeCloseTo(-.12,4);checked++;}expect(checked).toBeGreaterThan(15);disposeChunk(root);
 }
});
it('rebuilds identical chunks and retains vertex paint through worker transfer without sharing owned buffers',()=>{
 const region={x0:0,y0:0,x1:800,y1:800},scene={...fixture,voxelWorld:{groundCell:8 as const,heightStep:1,objectCell:1}},a=finishBuild(buildEnvironmentSteps(scene,region)),b=finishBuild(buildEnvironmentSteps(scene,region)),packet=packChunk(a).packet,received=unpackChunk(structuredClone(packet),()=>{throw Error('unexpected water');});
 for(const name of ['grass','flower'])expect(poses(received,name)).toEqual(poses(a,name));
 const first=cover(a),copy=cover(received);expect(first.length).toBe(copy.length);for(const [i,mesh]of first.entries()){const next=copy[i]!;for(const channel of ['position','normal','color'])expect(next.geometry.getAttribute(channel).array).toEqual(mesh.geometry.getAttribute(channel).array);expect(next.geometry.getAttribute('color').array.buffer).not.toBe(mesh.geometry.getAttribute('color').array.buffer);expect(next.instanceColor?.array).toEqual(mesh.instanceColor?.array);expect((next.material as THREE.MeshToonMaterial).vertexColors).toBe(true);}
 const owned=first[0]!.geometry,dispose=vi.spyOn(owned,'dispose');expect(geometryMemory(a).bytes).toBeGreaterThan(0);disposeChunk(a);expect(dispose).toHaveBeenCalledOnce();expect(geometryMemory(a).bytes).toBe(0);for(const name of ['grass','flower'])expect(poses(b,name)).toEqual(poses(received,name));disposeChunk(b);disposeChunk(received);
 const g=groundCoverGeometry('grass',1),h=groundCoverGeometry('grass',1);expect(g.getAttribute('position').array.buffer).not.toBe(h.getAttribute('position').array.buffer);g.getAttribute('position').setX(0,999);expect(h.getAttribute('position').getX(0)).not.toBe(999);g.dispose();h.dispose();
});
