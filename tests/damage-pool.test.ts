import {it,expect} from 'vitest';
import * as THREE from 'three';
import {compileDream,compileDreamScene} from '../src/scene/dream';
import {parseScene,sceneSchema,type SceneObject} from '../src/scene/schema';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {createCarAtSpawn,stepCar,type World} from '../src/sim/car';
import {encodeSave,decodeSave} from '../src/sim/save';
import {buildPaperMask} from '../src/sim/mask';
import {breakOnContact,advanceImpactMotion} from '../src/sim/impacts';
import {objectContacts} from '../src/scene/contacts';
import {impactBudget} from '../src/scene/damage-pool';
import {WorldScenery} from '../src/game/scenery';
import {WorldDebris} from '../src/game/debris';
import {geometryMemory} from '../src/game/geometry-memory';
import {buildLightPools,updateLightPools} from '../src/game/daylight';
const text='dream 2;material metal(style=toon,colors=[#35464c,#25363d]);object light(label="Lamp"){measure(kind=lamp,axis=y,meters=4);body(interaction=solid,radius=4,height=40);contact pole_body(at=[0,0,0],radius=1.4,height=40);lamp(at=[0,38,0],radius=25,color=#ffd18a);impact(mode=topple(speed=95,duration=1,lifetime=8));part pole(shape=box,material=metal,at=[0,20,0],size=[2,40,2]);part cap(shape=box,material=metal,at=[0,39,0],size=[5,2,5]);}';
const spec=compileDream(text)[0]!,objects:SceneObject[]=Array.from({length:400},(_,i)=>({id:'lamp_'+i,kind:'custom',labelText:'Lamp',x:40+i%30*28,y:50+Math.floor(i/30)*42,scale:1,spec,role:'prop'}));
const scene=parseScene({...createFixtureScene(),damagePool:true,objects,terrain:{hills:[]},regions:[]}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
it('accepts hundreds of independently damageable instances under one shared template and retains strict legacy limits',()=>{
 expect(impactBudget(scene)).toMatchObject({templates:1,fragments:1,pooledTemplates:1,resident:0});expect(scene.objects).toHaveLength(400);expect(sceneSchema.safeParse({...scene,damagePool:false}).success).toBe(false);
 expect(sceneSchema.safeParse({...scene,objects:objects.slice(0,129).map((o,i)=>({...o,spec:{...spec,displayName:'Different '+i}}))}).success).toBe(false);
 const base='world(size=[4000,2400],spawn=[525,609],heading_deg=0,damage_pool=true);road circuit(width=118,points=[[300,590],[660,590],[810,500],[810,220],[660,130],[300,130],[150,220],[150,500]]);checkpoint start(at=[480,612.5],dir=[1,0],width=100);checkpoint next(at=[750,520],dir=[1,0],width=100);';expect(compileDreamScene(text+base,{sceneId:'pool',revisionId:'r1',sourceHash:'pool'}).damagePool).toBe(true);
 expect(()=>compileDream(text.replace('pole_body(at=[0,0,0]','pole_body(at=[1,0,0]'))).toThrow();expect(()=>compileDream(text.replace('contact pole_body(', 'contact duplicate(at=[0,0,0],radius=1,height=40);contact pole_body('))).toThrow();
});
it('retains all damage while evicting only the oldest cosmetic assemblies under stress',()=>{
 let state=createCarAtSpawn(scene);const original=state.broken;
 for(const o of scene.objects){state.x=o.x-11;state.y=o.y;state.vx=200;state.vy=0;state.elevation=0;breakOnContact(state,world,o.x,o.y,objectContacts(scene,o));expect(state.debris.length).toBeLessThanOrEqual(128);expect(new Set(state.debris.map(p=>p.objectId)).size).toBeLessThanOrEqual(24);}
 expect(state.broken).toHaveLength(400);expect(original).toEqual([]);expect(state.debris).toHaveLength(24);expect(state.debris[0]!.objectId).toBe('lamp_376');
 const loaded=decodeSave(encodeSave({...state,x:525,y:609,vx:0,vy:0},state.timeS,world),world).state;expect(loaded.broken).toEqual(state.broken);expect(loaded.debris).toEqual(state.debris);
 expect(()=>encodeSave({...loaded,debris:Array.from({length:25},(_,i)=>({...state.debris[0]!,objectId:'lamp_'+i}))},state.timeS,world)).toThrow('budget');
});
it('instances intact damageable geometry, hides colour/shadows and restores the original instance',()=>{
 const scenery=new WorldScenery(scene);expect(scenery.objectCount).toBe(400);const meshes=scenery.group.children.filter(n=>n instanceof THREE.InstancedMesh) as THREE.InstancedMesh[],m=meshes[0]!,matrix=new THREE.Matrix4();m.getMatrixAt(0,matrix);const rest=matrix.clone();scenery.setHidden(new Set(['lamp_0']));m.getMatrixAt(0,matrix);expect(matrix.elements.every(v=>v===0 || v===1)).toBe(true);scenery.setHidden(new Set());m.getMatrixAt(0,matrix);expect(matrix).toEqual(rest);
});
it('switches only a damaged lamp pool off and restores it without rebuilding geometry or lights',()=>{
 const lights=buildLightPools({...scene,objects:scene.objects.slice(0,2)}),attributes:THREE.BufferAttribute[]=[];lights.traverse(n=>{if(n instanceof THREE.Mesh)attributes.push(n.geometry.getAttribute('enabled') as THREE.BufferAttribute);});
 const before=geometryMemory(lights);updateLightPools(lights,['lamp_0']);expect(attributes.some(a=>Array.from(a.array).includes(0))).toBe(true);expect(attributes.some(a=>Array.from(a.array).includes(1))).toBe(true);updateLightPools(lights,[]);expect(attributes.every(a=>Array.from(a.array).every(v=>v===1))).toBe(true);expect(geometryMemory(lights)).toEqual(before);
});
it('shares fracture meshes by template, releases completed transforms and disposes idle geometry',()=>{
 const state=createCarAtSpawn(scene);for(const o of scene.objects.slice(0,2)){state.x=o.x-11;state.y=o.y;state.vx=200;state.vy=0;breakOnContact(state,world,o.x,o.y,objectContacts(scene,o));}
 const debris=new WorldDebris(scene);debris.update(state);expect(debris.stats).toMatchObject({templates:1,pieces:2});const geometries=()=>{const g:THREE.BufferGeometry[]=[];debris.group.traverse(n=>{if(n instanceof THREE.Mesh)g.push(n.geometry);});return g;};expect(new Set(geometries()).size).toBe(geometries().length/2);
 debris.update({...state,timeS:9,debris:[]});expect(debris.stats).toMatchObject({templates:1,pieces:0});expect(geometryMemory(debris.group,...debris.cachedRoots).bytes).toBeGreaterThan(0);debris.update({...state,timeS:11,debris:[]});expect(debris.stats).toMatchObject({templates:0,pieces:0});expect(geometryMemory(debris.group,...debris.cachedRoots).bytes).toBe(0);
});
it('reuses unchanged damage arrays while driving, and copies them only on impact',()=>{
 const empty={...world,scene:{...scene,objects:[]}},initial=createCarAtSpawn(empty.scene),next=stepCar(initial,{throttle:0,steer:0},1/120,empty);expect(next.broken).toBe(initial.broken);expect(next.brokenZones).toBe(initial.brokenZones);
});


it('streams through many template records without retaining more than 24 mesh templates or 128 fragment meshes',()=>{
 const variants=parseScene({...scene,objects:objects.slice(0,128).map((o,i)=>({...o,spec:{...spec,displayName:'Lamp '+i}}))}),w={...world,scene:variants},visual=new WorldDebris(variants);let state=createCarAtSpawn(variants);
 for(const o of variants.objects){state={...state,timeS:state.timeS+.05,x:o.x-11,y:o.y,vx:200,vy:0,elevation:0};breakOnContact(state,w,o.x,o.y,objectContacts(variants,o));visual.update(state);expect(visual.stats.templates).toBeLessThanOrEqual(24);expect(visual.stats.pieces).toBeLessThanOrEqual(128);expect(visual.stats.cachedFragments).toBeLessThanOrEqual(128);}
 expect(state.broken).toHaveLength(128);visual.update({...state,debris:[],timeS:state.timeS+11});expect(visual.stats).toEqual({templates:0,pieces:0,cachedFragments:0});
});

it('keeps the mesh cache within 128 pieces while many eight-part templates fracture in succession',()=>{
 const fracture={...spec,lamp:undefined,impact:{kind:'break' as const,speed:95,scatter:20,lift:30,spin:1,lifetime:8},parts:Array.from({length:8},(_,i)=>({...spec.parts[0]!,id:'section_'+i,fragment:undefined,position:[i*2-7,20,0] as [number,number,number]}))};
 const variants=parseScene({...scene,objects:objects.slice(0,40).map((o,i)=>({...o,spec:{...fracture,displayName:'Fracture '+i}}))}),w={...world,scene:variants},visual=new WorldDebris(variants);let state=createCarAtSpawn(variants);
 for(const o of variants.objects){state={...state,timeS:state.timeS+.05,x:o.x-11,y:o.y,vx:200,vy:0,elevation:0};breakOnContact(state,w,o.x,o.y,objectContacts(variants,o));visual.update(state);expect(state.debris.length).toBeLessThanOrEqual(128);expect(visual.stats.cachedFragments).toBeLessThanOrEqual(128);expect(visual.stats.templates).toBeLessThanOrEqual(24);}
 expect(state.broken).toHaveLength(40);expect(state.debris).toHaveLength(128);visual.dispose();expect(geometryMemory(visual.group,...visual.cachedRoots).bytes).toBe(0);
});

it('uses the whole-body hinge envelope when a narrow contact sits inside a wider foot',()=>{
 const wide=compileDream(text.replace('part pole(', 'part foot(shape=box,material=metal,at=[0,1,0],size=[4,2,4]);part pole('))[0]!,target={...objects[0]!,spec:wide},s={...scene,objects:[target]},w={...world,scene:s},state=createCarAtSpawn(s);
 state.x=target.x-11;state.y=target.y;state.vx=200;state.elevation=0;breakOnContact(state,w,target.x,target.y,objectContacts(s,target));
 for(let i=0;i<240;i++)advanceImpactMotion(state,w,1/120,false);
 expect(state.debris[0]!.topple!.angle).toBeGreaterThan(1);expect(state.debris[0]!.settled).toBe(true);expect(objectContacts(s,target)[0]!.r).toBe(1.4);
});
