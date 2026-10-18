import {it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {compileDream} from '../src/scene/dream';
import {parseScene,sceneSchema,type SceneObject} from '../src/scene/schema';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {breakOnContact,advanceImpactMotion} from '../src/sim/impacts';
import {objectContacts} from '../src/scene/contacts';
import {pooledImpact,impactBudget} from '../src/scene/damage-pool';
import {WorldScenery} from '../src/game/scenery';
import {WorldDebris} from '../src/game/debris';
import {buildToppleChunk} from '../src/game/chunk-builder';
import {packChunk,unpackChunk,disposeChunk,type ChunkPacket} from '../src/game/chunk-packet';
import {worldTime,worldMotion,nightFactor} from '../src/game/shaders';
import {geometryMemory} from '../src/game/geometry-memory';

const source=`dream 2;
material bark(style=wood,colors=[#80543a,#bca27a]);
material leaf(style=toon,colors=[#5d8c42,#345d31],night=#203a1c);
object tree(label="Wind tree"){
 body(interaction=solid,radius=4,height=50);
 impact(mode=topple(speed=95,duration=1,lifetime=8));
 fragment whole(){
  part trunk(shape=cylinder,material=bark,at=[0,18,0],size=[4,36,4]);
  part crown(shape=icosphere,material=leaf,at=[0,38,0],size=[24,24,24],motion=sway(deg=2,hz=.2));
 }
}`;
const spec=compileDream(source)[0]!;
const objects:SceneObject[]=[0,1].map(i=>({id:'tree_'+i,kind:'custom',labelText:'Tree',x:301.12345+i*80,y:300,scale:1,headingRad:.3,spec,role:'prop'}));
const scene=parseScene({...createFixtureScene(),damagePool:true,objects,terrain:{hills:[]},regions:[]});
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
function impact(){const state=createCarAtSpawn(scene);for(const o of scene.objects){state.x=o.x-11;state.y=o.y;state.elevation=0;state.vx=200;state.vy=0;breakOnContact(state,world,o.x,o.y,objectContacts(scene,o));}return state;}
const meshes=(root:THREE.Object3D)=>{const all:THREE.Mesh[]=[];root.traverse(n=>{if(n instanceof THREE.Mesh)all.push(n);});return all;};
const compile=(material:THREE.Material)=>{const shader={uniforms:{},vertexShader:'#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <clipping_planes_fragment>'} as any;material.onBeforeCompile(shader,null as any);return shader;};
function packet(){const root=buildToppleChunk(scene,objects[0]!.id),{packet,transfer}=packChunk(root);const copy=structuredClone(packet,{transfer});disposeChunk(root);return copy;}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

it('allows only whole-object sway on pooled static props, without granting new actor or fragment budgets',()=>{
 expect(pooledImpact(scene,scene.objects[0]!)).toBe(true);expect(impactBudget(scene)).toMatchObject({pooledTemplates:1,resident:0,fragments:1});
 expect(sceneSchema.safeParse({...scene,objects:Array.from({length:400},(_,i)=>({...objects[0],id:'tree_'+i}))}).success).toBe(true);
 for(const changed of [{...scene,damagePool:false},{...scene,objects:[{...objects[0],role:'npc'}]}])expect(sceneSchema.safeParse(changed).success).toBe(false);
 expect(()=>compileDream(source.replace('sway(deg=2,hz=.2)','spin(axis=y,deg_s=20)'))).toThrow('static fragments');
 expect(()=>compileDream(source.replace('topple(speed=95,duration=1,lifetime=8)','break(speed=95,scatter=20,lift=30,spin=1,lifetime=8)'))).toThrow('static fragments');
 expect(()=>compileDream(source.replace('fragment whole(){','{'))).toThrow();
 for(const id of ['missing','',null])expect(()=>buildToppleChunk(scene,id as string)).toThrow('invalid topple prototype');
 expect(()=>buildToppleChunk({...scene,damagePool:false},objects[0]!.id)).toThrow('invalid topple prototype');
});

it('copies complete prepared surfaces, retaining material finishes and the exact wind phase in colour and shadows',()=>{
 const original=new WorldScenery(scene),packed=packChunk(original.group).packet,root=unpackChunk(structuredClone(packed),()=>{throw Error('water');}),scenery=WorldScenery.fromChunk(scene,root,packed.occlusion),before=JSON.stringify(scene),state=impact();
 const visual=new WorldDebris(scene,o=>scenery.objectMeshes(o.id));scenery.setHidden(new Set(state.broken));scenery.setGrowth(new Map([[objects[0]!.id,.2]]));visual.update(state);
 expect(visual.ready).toBe(true);expect(visual.stats).toMatchObject({templates:1,pieces:2,cachedFragments:1});
 const copies=meshes(visual.group),resident=scenery.objectMeshes(objects[0]!.id)!;
 for(let i=0;i<resident.length;i++){
  const a=resident[i]!,b=copies[i]!;expect(b.geometry).not.toBe(a.geometry);expect(b.geometry.getAttribute('visibility')).toBeUndefined();
  expect(b.geometry.index?.array).toEqual(a.geometry.index?.array);
  for(const [name,attribute] of Object.entries(a.geometry.attributes))if(name!=='visibility'){expect(b.geometry.getAttribute(name).array).toEqual(attribute.array);expect(b.geometry.getAttribute(name).array.buffer).not.toBe(attribute.array.buffer);}
  const shader=compile(b.material as THREE.Material);expect(shader.vertexShader).not.toContain('instanceMatrix');expect(shader.fragmentShader).not.toContain('sceneryVisibility');
  if(b.customDepthMaterial){
   const depth=compile(b.customDepthMaterial);expect(shader.uniforms.scenerySeed.value).toBe(Math.fround(objects[0]!.x-480));expect(depth.uniforms.scenerySeed).toBe(shader.uniforms.scenerySeed);
   expect(shader.uniforms.sceneryTime).toBe(worldTime);expect(shader.uniforms.sceneryMotion).toBe(worldMotion);
   for(const statement of ['objectNormal=rigidRotate','float sceneryAngle='])expect(depth.vertexShader.split('\n').find((line:string)=>line.startsWith(statement))).toBe(shader.vertexShader.split('\n').find((line:string)=>line.startsWith(statement)));
   expect(shader.uniforms.nightFactor).toBe(nightFactor);
  }else expect(shader.fragmentShader).toContain('vSurfacePosition');
 }
 const wind=copies.filter(m=>m.customDepthMaterial);expect(wind).toHaveLength(2);expect(compile(wind[1]!.material as THREE.Material).uniforms.scenerySeed.value).toBe(Math.fround(objects[1]!.x-480));expect((wind[0]!.material as THREE.Material).customProgramCacheKey()).toBe((wind[1]!.material as THREE.Material).customProgramCacheKey());
 expect(copies[0]!.geometry).toBe(copies[resident.length]!.geometry);
 const dimensions=geometryMemory(visual.group,...visual.cachedRoots);disposeChunk(root);disposeChunk(original.group);visual.update(state);expect(geometryMemory(visual.group,...visual.cachedRoots)).toEqual(dimensions);
 for(let i=0;i<240;i++)advanceImpactMotion(state,world,1/120,false);visual.update(state);expect(state.debris.every(p=>p.settled)).toBe(true);expect(JSON.stringify(scene)).toBe(before);
 let disposed=0;for(const mesh of copies){(mesh.material as THREE.Material).addEventListener('dispose',()=>disposed++);mesh.customDepthMaterial?.addEventListener('dispose',()=>disposed++);}
 visual.update({...state,debris:[],timeS:9});expect(disposed).toBe(copies.length+wind.length);visual.update({...state,debris:[],timeS:20});expect(geometryMemory(visual.group,...visual.cachedRoots).bytes).toBe(0);
});

it('waits for one offscreen worker prototype, then uses the latest physical pose without allocating per tree',async()=>{
 let release!:(packet:ChunkPacket)=>void;const load=vi.fn(()=>new Promise<ChunkPacket>(resolve=>{release=resolve;})),visual=new WorldDebris(scene,()=>undefined,load),state=impact();
 visual.update(state);visual.update(state);expect(visual.ready).toBe(false);expect(visual.group.children).toHaveLength(0);await tick();expect(load).toHaveBeenCalledOnce();
 release(packet());await tick();expect(visual.ready).toBe(true);for(let i=0;i<120;i++)advanceImpactMotion(state,world,1/120,false);visual.update(state);
 expect(visual.stats).toMatchObject({templates:1,pieces:2});expect(visual.group.children[0]!.position.y).toBe(state.debris[0]!.elevation+1.5);expect(visual.group.children[0]!.quaternion.toArray()).toEqual(state.debris[0]!.rotation);visual.dispose();expect(geometryMemory(visual.group,...visual.cachedRoots).bytes).toBe(0);
});

it('cancels obsolete preparation on reduced motion, reset and disposal, ignores late packets and exposes failures',async()=>{
 const pending:{signal:AbortSignal;resolve:(packet:ChunkPacket)=>void}[]=[],visual=new WorldDebris(scene,()=>undefined,(_id,signal)=>new Promise(resolve=>pending.push({signal,resolve}))),state=impact();
 visual.update(state);await tick();visual.update(state,true);expect(pending[0]!.signal.aborted).toBe(true);pending[0]!.resolve(packet());await tick();expect(visual.stats.templates).toBe(0);expect(visual.ready).toBe(true);
 visual.update({...state,timeS:1});await tick();visual.update({...state,timeS:0,debris:[]});expect(pending[1]!.signal.aborted).toBe(true);pending[1]!.resolve(packet());await tick();expect(visual.stats.templates).toBe(0);
 visual.update(state);await tick();visual.dispose();expect(pending[2]!.signal.aborted).toBe(true);pending[2]!.resolve(packet());await tick();visual.update(state);expect(visual.stats).toEqual({templates:0,pieces:0,cachedFragments:0});
 const failed=new WorldDebris(scene,()=>undefined,async()=>{throw Error('tree meshing failed');});failed.update(state);await tick();expect(failed.error?.message).toBe('tree meshing failed');expect(failed.ready).toBe(false);failed.dispose();
});
