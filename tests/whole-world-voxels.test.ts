import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {worldSource,worldModules,createWorldScene} from '../src/scene/world-fixture';
import {compileDreamWorld,formatDream,checkDream,compileDream} from '../src/scene/dream';
import {partGeometry} from '../src/scene/object-geometry';
import {voxelSurface,voxelTerrainTile} from '../src/game/voxel-columns';
import {buildObject,animateObject} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import {measuredScale} from '../src/scene/measure';
import {createFixtureScene} from '../src/scene/fixture';
import {parseScene} from '../src/scene/schema';
import {terrainHeight} from '../src/scene/terrain';
import {voxelSurfaceBase} from '../src/game/surface';
import {WorldParticles} from '../src/game/particles';

const policy={objectCell:1,groundCell:8 as const,heightStep:1};
function assertVoxelNormals(g:THREE.BufferGeometry){
 const n=g.getAttribute('normal'),p=g.getAttribute('position');expect(p.count).toBeGreaterThan(0);
 for(let i=0;i<n.count;i++)expect([Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i))].sort()).toEqual([0,0,1]);
 for(let i=0;i<p.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);expect(b.sub(a).cross(c.sub(a)).normalize().dot(new THREE.Vector3().fromBufferAttribute(n,i))).toBeCloseTo(1,5);}
}
describe('whole-world voxel construction',()=>{
 it('applies the world policy to every linked template, placement, player and flock, without changing physics',()=>{
  const voxel=createWorldScene(),smooth=compileDreamWorld(worldSource.replace(/^voxel_world.*\n/m,''),worldModules);
  expect(voxel.voxelWorld).toEqual(policy);expect(voxel.player?.dslVersion===2 && voxel.player.voxelSize).toBe(1);
  expect(voxel.objects.every(o=>o.spec && 'voxelSize' in o.spec && o.spec.voxelSize===1)).toBe(true);
  expect(voxel.flocks.every(f=>'voxelSize' in f.spec && f.spec.voxelSize===1)).toBe(true);
  expect(voxel.objects.map(o=>[o.id,o.x,o.y,o.scale,o.spec && 'body' in o.spec ? o.spec.body : undefined])).toEqual(smooth.objects.map(o=>[o.id,o.x,o.y,o.scale,o.spec && 'body' in o.spec ? o.spec.body : undefined]));
 });
 it('voxelizes every shaped part in the complete library, retaining holes, thin fittings and rigid animation frames',()=>{
  const world=compileDreamWorld(worldSource,worldModules);let parts=0;
  for(const spec of world.assemblies){
   expect(spec.voxelSize).toBe(1);
   for(const part of spec.parts){try{const g=partGeometry(part,spec.voxelSize);assertVoxelNormals(g);expect(g.userData.voxel).toBeDefined();g.dispose();parts++;}catch(error){throw new Error(`${spec.displayName}/${part.id}: ${error}`);}}
  }
  expect(parts).toBeGreaterThan(1000);
  const spec=world.assemblies.find(s=>s.displayName==='Meadow bicycle')!,group=compactObject(buildObject({id:'bike',kind:'custom',labelText:spec.displayName,x:0,y:0,scale:measuredScale(spec),spec}));
  animateObject(group,1,true,30,0,Infinity);expect(group.getObjectByName(spec.joints!.find(j=>j.animation && 'kind' in j.animation && j.animation.kind==='roll')!.id)).toBeDefined();
 });
 it('greedily merges flat ground, emits only real height steps and shares seam heights across neighboring tiles',()=>{
  const flat=voxelTerrainTile(0,0,policy,()=>0,()=>new THREE.Color('#52744c'));
  expect(flat.userData.voxel.columns).toBe(2500);expect(flat.userData.voxel.quads).toBe(1);assertVoxelNormals(flat);
  const slope=(x:number)=>x*.05,left=voxelTerrainTile(0,0,policy,slope,()=>new THREE.Color('#52744c')),right=voxelTerrainTile(400,0,policy,slope,()=>new THREE.Color('#52744c'));
  assertVoxelNormals(left);assertVoxelNormals(right);
  const seam=(g:THREE.BufferGeometry)=>{const p=g.getAttribute('position'),n=g.getAttribute('normal');return Array.from({length:p.count},(_,i)=>i).filter(i=>p.getX(i)===400 && n.getY(i)===1).map(i=>p.getY(i));};
  expect(Math.abs(Math.max(...seam(left))-Math.min(...seam(right)))).toBeLessThanOrEqual(1);
 });
 it('retains half-unit paint and its lift, attributes, and outward solid column faces',()=>{
  const source=new THREE.PlaneGeometry(20,.5).rotateX(-Math.PI/2).translate(0,1.86,.25);
  const geometry=voxelSurface(source,{cell:.5,step:1,lift:1.86,thickness:.08});assertVoxelNormals(geometry);geometry.computeBoundingBox();
  expect(geometry.boundingBox!.max.y).toBeCloseTo(1.86);expect(geometry.boundingBox!.min.z).toBe(0);expect(geometry.boundingBox!.max.z).toBe(.5);
  expect(geometry.getAttribute('uv').count).toBe(geometry.getAttribute('position').count);
 });
 it('keeps all vertices of a water column on one wave anchor',()=>{
  const source=new THREE.PlaneGeometry(16,16).rotateX(-Math.PI/2),g=voxelSurface(source,{cell:8,step:1,lift:0,thickness:2,maxMerge:1,rigid:true});
  const anchor=g.getAttribute('voxelAnchor');expect(anchor.count).toBe(g.getAttribute('position').count);
  for(let i=0;i<anchor.count;i+=6)for(let j=1;j<6;j++){expect(anchor.getX(i+j)).toBe(anchor.getX(i));expect(anchor.getY(i+j)).toBe(anchor.getY(i));}
 });
 it('keeps hillside pavement and paint on their supporting ground columns',()=>{
  const doc=parseScene({...createFixtureScene(),voxelWorld:policy,terrain:{hills:[{id:'hill',x:480,y:360,radiusX:250,radiusY:250,height:80}]}});
  const ground=voxelTerrainTile(0,0,policy,(x,z)=>terrainHeight(doc.terrain,x+480,z+360),()=>new THREE.Color('#52744c'));
  const raw=new THREE.PlaneGeometry(100,100).rotateX(-Math.PI/2).translate(50,1.25,50);
  const road=voxelSurface(raw,{cell:2,step:1,lift:1.25,thickness:1.25,baseAt:(x,z)=>voxelSurfaceBase(doc,x,z)});
  const ray=new THREE.Raycaster(),material=new THREE.MeshBasicMaterial();
  const top=(g:THREE.BufferGeometry,x:number,z:number)=>{ray.set(new THREE.Vector3(x,200,z),new THREE.Vector3(0,-1,0));return ray.intersectObject(new THREE.Mesh(g,material))[0]!.point.y;};
  for(const [x,z] of [[3,5],[33,47],[91,79]])expect(top(road,x!,z!)-top(ground,x!,z!)).toBeCloseTo(1.25,4);
 });
 it('uses one instanced cube draw for particles while retaining the fixed pool',()=>{
  const doc=parseScene({...createFixtureScene(),voxelWorld:policy}),pool=new WorldParticles(doc);
  expect(pool.mesh).toBeInstanceOf(THREE.Mesh);expect(pool.mesh.geometry).toBeInstanceOf(THREE.InstancedBufferGeometry);
  expect((pool.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(288);
  expect(pool.mesh.geometry.getAttribute('offset')).toBeInstanceOf(THREE.InstancedBufferAttribute);
 });
 it('preserves a curb taper independently of quantized ground height',()=>{
  const source=new THREE.PlaneGeometry(8,4).rotateX(-Math.PI/2).translate(4,3.1,2);
  const geometry=voxelSurface(source,{cell:1,step:1,lift:3.1,thickness:3.6,baseAt:()=>10.8,liftAt:x=>1.25+1.85*x/8});
  const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');let checked=0;
  for(let i=0;i<p.count;i+=6)if(n.getY(i)===1){const center=(Math.min(...Array.from({length:6},(_,j)=>p.getX(i+j)))+Math.max(...Array.from({length:6},(_,j)=>p.getX(i+j))))/2;expect(p.getY(i)).toBeCloseTo(10+1.25+1.85*center/8,4);checked++;}
  expect(checked).toBeGreaterThan(1);assertVoxelNormals(geometry);
 });
 it('round trips the directive and rejects invalid grids and work before rendering',()=>{
  expect(compileDreamWorld(formatDream(worldSource),worldModules).layout?.voxelWorld).toEqual(policy);
  for(const replacement of ['object_cell=0','ground_cell=1','height_step=0','object_cell=999'])expect(checkDream(worldSource.replace(/object_cell=1|ground_cell=8|height_step=1/,replacement),worldModules).ok).toBe(false);
  expect(()=>compileDream('dream 2;voxel_world(object_cell=1,ground_cell=8,height_step=1);')).toThrow();
 });
});
