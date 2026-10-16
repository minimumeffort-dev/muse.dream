import {describe,it,expect} from 'vitest';
import {Vector3,Mesh} from 'three';
import {compileDream,compileDreamWorld,formatDream,checkDream} from '../src/scene/dream';
import {voxelSchema,meshVoxels,voxelOccupancy,voxelSlices} from '../src/scene/voxels';
import {partGeometry,voxelGeometry} from '../src/scene/object-geometry';
import {objectDslSchema} from '../src/scene/object-dsl';
import {objectFragments} from '../src/scene/fragments';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {parseScene} from '../src/scene/schema';
import {createCarAtSpawn,stepCar} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {WorldDebris} from '../src/game/debris';
import {buildDamageObject,updateDamage} from '../src/game/damage';
import source from '../docs/examples/voxel-wall.dream?raw';

const block=(grid:[number,number,number]=[16,16,16])=>voxelSchema.parse({grid,operations:[{mode:'fill',shape:'box',from:[0,0,0],to:grid}]});
describe('bounded voxel construction and greedy surface meshing',()=>{
 it('reduces a solid 4096-cell cube from 24576 cube faces to six exterior quads',()=>{
  const volume=block(),mesh=meshVoxels(volume);
  expect(mesh.cells).toBe(4096);expect(mesh.exposedFaces).toBe(1536);expect(mesh.quads).toBe(6);expect(mesh.positions.length).toBe(108);
  expect(meshVoxels(volume)).toBe(mesh);
  const g=voxelGeometry(volume);g.computeBoundingBox();expect(g.boundingBox!.min.toArray()).toEqual([-.5,-.5,-.5]);expect(g.boundingBox!.max.toArray()).toEqual([.5,.5,.5]);
  g.translate(100,0,0);expect(voxelGeometry(volume).getAttribute('position').getX(0)).toBe(-.5);
 });
 it('emits outward, consistently wound faces for all six directions',()=>{
  const m=meshVoxels(block()),a=new Vector3(),b=new Vector3(),c=new Vector3();
  for(let i=0;i<m.positions.length;i+=9){a.fromArray(m.positions,i);b.fromArray(m.positions,i+3);c.fromArray(m.positions,i+6);const cross=b.sub(a).cross(c.sub(a)).normalize();expect(cross.dot(new Vector3().fromArray(m.normals,i))).toBeCloseTo(1);}
 });
 it('matches every exposed unit face without overlap or internal faces after ordered CSG',()=>{
  const volume=voxelSchema.parse({grid:[7,5,6],operations:[
   {mode:'fill',shape:'box',from:[0,0,0],to:[7,5,6]},
   {mode:'cut',shape:'box',from:[2,0,0],to:[4,4,6]},
   {mode:'cut',shape:'ellipsoid',from:[0,2,1],to:[7,5,5]},
   {mode:'fill',shape:'box',from:[3,0,0],to:[4,1,6]},
  ]}),cells=voxelOccupancy(volume),m=meshVoxels(volume),expected=new Set<string>(),actual=new Set<string>();
  const occupied=(p:number[])=>p.every((n,a)=>n>=0 && n<volume.grid[a]!) && !!cells[p[0]!+7*(p[1]!+5*p[2]!)];
  for(let z=0;z<6;z++)for(let y=0;y<5;y++)for(let x=0;x<7;x++)if(occupied([x,y,z]))for(let d=0;d<3;d++)for(const sign of [-1,1]){
   const n=[x,y,z];n[d]=n[d]!+sign;if(!occupied(n))expected.add([d,sign,x,y,z].join('/'));
  }
  for(let q=0;q<m.quads;q++){
   const coords=Array.from({length:6},(_,i)=>[0,1,2].map(a=>(m.positions[q*18+i*3+a]!+.5)*volume.grid[a]!));
   const normal=Array.from(m.normals.slice(q*18,q*18+3)),d=normal.findIndex(n=>n!==0),sign=normal[d]!,u=(d+1)%3,w=(d+2)%3,plane=Math.round(coords[0]![d]!)-Number(sign>0);
   const low=coords.reduce((a,p)=>a.map((n,i)=>Math.min(n,p[i]!))),high=coords.reduce((a,p)=>a.map((n,i)=>Math.max(n,p[i]!)));
   for(let j=Math.round(low[w]!);j<Math.round(high[w]!);j++)for(let i=Math.round(low[u]!);i<Math.round(high[u]!);i++){
    const p=[0,0,0];p[d]=plane;p[u]=i;p[w]=j;const key=[d,sign,...p].join('/');expect(actual.has(key)).toBe(false);actual.add(key);
   }
  }
  expect(actual).toEqual(expected);expect(m.exposedFaces).toBe(expected.size);
 });
 it('compiles, formats and expands an LLM-sized fill/cut program with stable part IDs',()=>{
  const spec=compileDream(source)[0]!,again=compileDream(formatDream(source))[0]!;
  expect(again).toEqual(spec);expect(spec.parts).toHaveLength(1);expect(spec.parts[0]!.shape).toBe('voxel');expect(spec.parts[0]!.voxels!.operations).toHaveLength(7);
  expect(objectFragments(spec)).toHaveLength(4);expect(partGeometry(spec.parts[0]!).getAttribute('position').count).toBeGreaterThan(36);
 });
 it.each([
  ['grid=[30,16,4]','grid=[33,16,4]'],['grid=[30,16,4]','grid=[30.5,16,4]'],
  ['to=[30,16,4]','to=[31,16,4]'],['from=[12,0,0]','from=[12,-1,0]'],
  ['chunks=[2,2,1]','chunks=[4,4,1]'],['chunks=[2,2,1]','chunks=[4,1,1]'],
  ['material=masonry','material=missing'],['fill solid(from=','fill solid(shape=script,from='],
  ['impact(mode=break(speed=90,scatter=50,lift=55,spin=3,lifetime=6,pattern=crumble));',''],
 ] as const)('rejects malformed or unsupported voxel data (%s)',(a,b)=>{expect(checkDream(source.replace(a,b)).ok).toBe(false);});
 it('rejects empty volumes, empty fracture chunks, excessive work and misuse on primitive parts',()=>{
  expect(voxelSchema.safeParse({grid:[2,2,2],operations:[{mode:'cut',shape:'box',from:[0,0,0],to:[2,2,2]}]}).success).toBe(false);
  expect(voxelSchema.safeParse({grid:[4,4,4],chunks:[2,1,1],operations:[{mode:'fill',shape:'box',from:[0,0,0],to:[2,4,4]}]}).success).toBe(false);
  expect(voxelSchema.safeParse({grid:[32,32,32],operations:Array.from({length:33},()=>({mode:'fill',shape:'box',from:[0,0,0],to:[32,32,32]}))}).success).toBe(false);
  const spec=compileDream(source)[0]!;expect(objectDslSchema.safeParse({...spec,parts:[{...spec.parts[0],shape:'box'}]}).success).toBe(false);
  expect(objectDslSchema.safeParse({...spec,parts:[{...spec.parts[0],deform:{seed:1,amount:.1}}]}).success).toBe(false);
 });
 it('partitions occupied cells exactly once and exposes the newly cut fracture faces',()=>{
  const volume=voxelSchema.parse({...block([8,8,8]),chunks:[2,2,2]}),whole=meshVoxels(volume),pieces=voxelSlices(volume).map(s=>meshVoxels(volume,s));
  expect(pieces.reduce((n,m)=>n+m.cells,0)).toBe(whole.cells);expect(pieces.every(m=>m.quads===6 && m.cells===64)).toBe(true);
  expect(pieces.reduce((n,m)=>n+m.exposedFaces,0)).toBeGreaterThan(whole.exposedFaces);
 });
 it('breaks a voxel wall through the actual car sim, renders only each chunk, and restarts intact',()=>{
  // Retain the vertex-painted fragment regression; materials.test.ts covers brick cut faces.
  const spec=compileDream(source.replace('style=brick','style=toon'))[0]!,object={id:'wall',kind:'custom',labelText:spec.displayName,x:480,y:360,scale:1,spec},scene=parseScene({...createFixtureScene(),objects:[object],regions:[],terrain:{hills:[]}});
  const world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};let state={...createCarAtSpawn(scene),x:445,y:360,vx:240,headingRad:0};
  state=stepCar(state,{throttle:1,steer:0},1/120,world);expect(state.broken).toContain('wall');expect(state.debris).toHaveLength(4);
  const intact=buildDamageObject(scene.objects[0]!);updateDamage(intact,'wall',state);expect(intact.visible).toBe(false);
  const debris=new WorldDebris(scene);debris.update(state);expect(debris.group.children.filter(c=>c.visible)).toHaveLength(4);
  const chunks=debris.group.children.flatMap(c=>c.children.filter((m):m is Mesh=>m instanceof Mesh));
  expect(chunks).toHaveLength(4);expect(chunks.every(m=>m.geometry.getAttribute('color').count===m.geometry.getAttribute('position').count)).toBe(true);
  debris.update(createCarAtSpawn(scene));expect(debris.group.children.every(c=>!c.visible)).toBe(true);
  updateDamage(intact,'wall',createCarAtSpawn(scene));expect(intact.visible).toBe(true);
 });
});

describe('voxel trust boundary and fragment budgets',()=>{
 it('rejects excessive aggregate cells and chunk counts without increasing existing limits',()=>{
  const spec=compileDream(source)[0]!,part=spec.parts[0]!;
  const large={...part,voxels:{...block([32,32,32])}};
  expect(objectDslSchema.safeParse({...spec,parts:Array.from({length:3},(_,i)=>({...large,id:'part'+i}))}).success).toBe(false);
  expect(objectDslSchema.safeParse({...spec,parts:Array.from({length:3},(_,i)=>({...part,id:'part'+i}))}).success).toBe(false);
  const chunks={...part,voxels:{...block([8,8,8]),chunks:[2,2,2]}};
  const base={...createFixtureScene(),regions:[],terrain:{hills:[]}};
  const item={id:'wall',kind:'custom',labelText:spec.displayName,x:480,y:360,scale:1,spec:{...spec,parts:[chunks]}};
  expect(()=>parseScene({...base,objects:Array.from({length:17},(_,i)=>({...item,id:'wall'+i}))})).toThrow('128 destruction fragments');
 });
 it('rejects duplicate operations, forbidden contexts and voxel vocabulary in Dream 1',()=>{
  expect(checkDream(source.replace('cut opening','fill solid')).ok).toBe(false);
  expect(checkDream(source.replace('cut opening(from=[12,0,0],to=[18,10,4]);','part bad(shape=box,material=masonry,at=[0,0,0],size=[1,1,1]);')).ok).toBe(false);
  expect(checkDream(source.replace('dream 2;','dream 1;')).ok).toBe(false);
 });
});


describe('voxel surface and linked-source limits',()=>{
 it('rejects a separated-cell surface before it can exceed the render budget',()=>{
  const operations=block([32,32,32]).operations;
  for(let axis=0;axis<3;axis++)for(let i=0;i<16;i++){
   const from:[number,number,number]=[0,0,0],to:[number,number,number]=[32,32,32];from[axis]=i*2+1;to[axis]=i*2+2;
   operations.push({mode:'cut',shape:'box',from,to});
  }
  const result=voxelSchema.safeParse({grid:[32,32,32],operations});expect(result.success).toBe(false);
  if(!result.success)expect(result.error.message).toContain('8192');
 });
 it('bounds allocated cells across distinct linked assembly definitions, including imports',()=>{
  const library=(count:number)=>'dream 2;material stone(style=toon,colors=[#888888,#888888]);'+Array.from({length:count},(_,i)=>
   `object block_${i}(label="Block"){body(interaction=decor,radius=8,height=16);repeat parts(index=p,count=2){voxels solid(material=stone,at=[0,16,0],size=[32,32,32],grid=[32,32,32]){fill volume(from=[0,0,0],to=[32,32,32]);}}}`).join('');
  expect(()=>compileDreamWorld('dream 2;include left(module=left);include right(module=right);',{left:library(9),right:library(8)})).toThrow('1048576 voxel cells');
 });
});
