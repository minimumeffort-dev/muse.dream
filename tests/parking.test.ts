import {describe,it,expect} from 'vitest';
import {compileDreamWorld,checkDream,formatDream} from '../src/scene/dream';
import {parseScene} from '../src/scene/schema';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {isParkedVehicle,isResidentActor,controlFor} from '../src/scene/agents';
import {hasAnimatedJoints} from '../src/scene/object-dsl';
import {createCarAtSpawn,resetCar,carFootprintClear,type World,type CarState} from '../src/sim/car';
import {nearbyRide,toggleRide,stepInteractive,bodyWorld} from '../src/sim/interaction';
import {buildPaperMask} from '../src/sim/mask';
import {routeObjects,actorContacts,actorPoses} from '../src/sim/actors';
import {encodeSave,decodeSave} from '../src/sim/save';
import * as THREE from 'three';
import {WorldParking} from '../src/game/parking';
import {WorldScenery} from '../src/game/scenery';
import {packChunk,unpackChunk,disposeChunk} from '../src/game/chunk-packet';
import {compactObject} from '../src/game/compact-object';
import {animateObject,buildObject} from '../src/game/world3d';
import {terrainNormal,worldPosition} from '../src/game/environment';
import {createWorldScene} from '../src/scene/world-fixture';
import {vehicleReviewStart} from '../src/game/review-start';

const model=`dream 2;
material blue(style=toon,colors=[#537eaa,#3c5f87]);
object vehicle(label="Test car"){
 body(interaction=solid,radius=10,height=16);rideable(at=[0,10,0],control=car);
 part shell(shape=box,material=blue,at=[0,6,0],size=[24,10,12]);
 joint axle(at=[7,3,0],motion=roll(axis=z,radius=3)){
  part tire(shape=cylinder,material=blue,at=[0,0,7],size=[6,2,6],rot_deg=[90,0,0]);
 }
}`;
const source=model+'place first(object=vehicle,at=[400,400],role=controllable,parked=true);place second(object=vehicle,at=[740,400],role=controllable,parked=true);';
function setup(text=source):World{const data=compileDreamWorld(text),scene=parseScene({...createFixtureScene(),objects:data.objects,terrain:{hills:[]},regions:[]});return {scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};}
function onFoot(world:World):CarState{const s=createCarAtSpawn(world.scene);return {...s,control:{kind:'foot' as const},x:365,y:400,elevation:0,vehicles:[{id:null,x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,distance:0}]};}

describe('parked controllable vehicles',()=>{
 it('makes all 81 generated rides boardable and retains the original NPC passenger capabilities',()=>{
  const scene=createWorldScene(),w:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11},start=createCarAtSpawn(scene),parked=scene.objects.filter(isParkedVehicle);
  expect(parked).toHaveLength(81);expect(new Set(parked.map(o=>controlFor(o)))).toEqual(new Set(['car','bicycle','scooter']));
  for(const object of parked){const foot=vehicleReviewStart(start,w,object.id);expect(foot.control.kind,object.id).toBe('foot');expect(toggleRide(foot,w).control,object.id).toEqual({kind:'vehicle',id:object.id});}
  for(const id of ['center_delivery','south_car']){const o=scene.objects.find(o=>o.id===id)!;expect(o.role).toBe('npc');expect(controlFor(o)).toBeUndefined();expect(o.spec && 'rideable' in o.spec && o.spec.rideable && !o.spec.rideable.control).toBe(true);}
 });
 it('adapts an imported seat locally without changing the passenger model or its geometry',()=>{
  const module=model.replace(',control=car',''),text='dream 2;asset passenger(module=models,object=vehicle);asset driver(module=models,object=vehicle,control=car);place first(object=driver,at=[400,400],role=controllable,parked=true);place original(object=passenger,at=[700,400],role=prop);';
  const compiled=compileDreamWorld(text,{models:module}),a=compiled.objects[0]!,b=compiled.objects[1]!;
  expect(controlFor(a)).toBe('car');expect('rideable' in b.spec! && b.spec.rideable?.control).toBeUndefined();
  if(!a.spec || !b.spec || !('dslVersion' in a.spec) || a.spec.dslVersion!==2 || !('dslVersion' in b.spec) || b.spec.dslVersion!==2)throw Error('expected composed vehicles');
  expect(a.spec.parts).toEqual(b.spec.parts);expect(a.spec.joints).toEqual(b.spec.joints);
  expect(()=>compileDreamWorld(text,{models:module.replace('rideable(at=[0,10,0]);','')})).toThrow('existing rideable seat');
 });
 it('keeps explicit ownership and the full rig while reserving one live slot for the fleet',()=>{
  const world=setup(),o=world.scene.objects[0]!;expect(isParkedVehicle(o)).toBe(true);expect(isResidentActor(o)).toBe(false);expect(controlFor(o)).toBe('car');expect(hasAnimatedJoints(o.spec)).toBe(true);
  expect(routeObjects(world.scene)).toHaveLength(0);expect(actorContacts(world.scene,0)).toHaveLength(0);
  expect(compileDreamWorld(formatDream(source)).objects).toEqual(compileDreamWorld(source).objects);
  const many=Array.from({length:30},(_,i)=>({...o,id:'park_'+i}));expect(parseScene({...world.scene,objects:many}).objects).toHaveLength(30);
  expect(()=>parseScene({...world.scene,objects:Array.from({length:257},(_,i)=>({...o,id:'park_'+i}))})).toThrow('256 parked vehicles');
  for(const invalid of [source.replace('role=controllable','role=prop'),source.replace(',control=car',''),source.replace('parked=true','parked=true,pose=rest'),source.replace('control=car','control=boat'),source.replace('control=car','control=plane')])expect(checkDream(invalid).ok).toBe(false);
 });
 it('boards, drives, parks and reboards the same body without leaving its old collider behind',()=>{
  const world=setup(),original=JSON.stringify(world.scene),foot=onFoot(world);
  expect(nearbyRide(foot,world)?.id).toBe('first');let s=toggleRide(foot,world);expect(s.control).toEqual({kind:'vehicle',id:'first'});
  expect(actorPoses(world.scene,0,s).map(p=>p.id)).toEqual(['first']);
  for(let i=0;i<240;i++)s=stepInteractive(s,{throttle:1,steer:0},1/120,world);
  expect(s.x).toBeGreaterThan(450);expect(s.distance).toBeGreaterThan(20);
  const exited=toggleRide(s,world);expect(exited.control.kind).toBe('foot');expect(exited.vehicles.find(v=>v.id==='first')?.x).toBe(s.x);
  expect(carFootprintClear(bodyWorld(exited,world),400,400,0,exited.timeS,exited)).toBe(true);
  expect(carFootprintClear(bodyWorld(exited,world),s.x,s.y,0,exited.timeS,exited)).toBe(false);
  expect(toggleRide(exited,world).control).toEqual({kind:'vehicle',id:'first'});
  const recovered=resetCar(s,world.scene);expect(recovered.vehicles.find(v=>v.id==='first')?.x).toBe(s.x);
  expect(resetCar(recovered,world.scene,true).vehicles).toEqual([]);expect(JSON.stringify(world.scene)).toBe(original);
 });
 it('saves more than 24 moved parking poses without increasing the live actor count',()=>{
  const w=setup(),o=w.scene.objects[0]!,objects=Array.from({length:40},(_,i)=>({...o,id:'park_'+i,x:200+i*14,y:400}));w.scene=parseScene({...w.scene,objects});
  const s=onFoot(w);s.vehicles.push(...objects.map(o=>({id:o.id,x:o.x,y:500,elevation:0,headingRad:0,distance:-17})));
  const copy=decodeSave(encodeSave(s,12,w),w).state;expect(copy.vehicles).toEqual(s.vehicles);expect(actorPoses(w.scene,0,copy)).toHaveLength(0);
  const forged=JSON.parse(encodeSave(s,12,w));forged.version=4;expect(()=>decodeSave(JSON.stringify(forged),w)).toThrow('supported');
 });
 it('hides only moved seeds in colour and shadow geometry, including transferred chunks, and restores exact matrices',()=>{
  const scene=setup().scene,original=new WorldScenery(scene),packet=packChunk(original.group).packet,root=unpackChunk(structuredClone(packet),()=>{throw Error('water');}),scenery=WorldScenery.fromChunk(scene,root,packet.occlusion);
  const before=root.children.map(m=>Array.from((m as THREE.InstancedMesh).instanceMatrix.array));
  scenery.setHidden(new Set(['first']));for(const node of root.children){const mesh=node as THREE.InstancedMesh,matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);expect(matrix.determinant()).toBe(0);mesh.getMatrixAt(1,matrix);expect(matrix.determinant()).not.toBe(0);expect(mesh.visible).toBe(true);}
  scenery.setHidden(new Set(['first','second']));expect(root.children.every(m=>!m.visible)).toBe(true);
  scenery.setHidden(new Set());root.children.forEach((m,i)=>{expect(m.visible).toBe(true);expect(Array.from((m as THREE.InstancedMesh).instanceMatrix.array)).toEqual(before[i]);});disposeChunk(root);disposeChunk(original.group);
 });
 it('instances exact full-rig parked poses, creates one occupied rig and releases local resources on eviction',()=>{
  const w=setup(),s=onFoot(w),object=w.scene.objects[0]!;object.scale=1.7;
  s.vehicles.push({id:'first',x:500,y:500,elevation:32,headingRad:1.2,distance:43});
  const renderer=new WorldParking(w.scene),camera=new THREE.OrthographicCamera(-100,100,100,-100),player=new THREE.Vector3(0,0,0),resident={revision:1,contains:()=>true};camera.position.set(500,1000,500);camera.lookAt(player);camera.updateMatrixWorld();
  renderer.syncActive(s,()=>{});renderer.update(s,resident,camera,player,0,false);expect(renderer.stats.prototypes).toBe(1);expect(renderer.hiddenSeeds.has('first')).toBe(true);
  const expected=compactObject(buildObject(object));animateObject(expected,0,true,43);expected.position.copy(worldPosition(w.scene,500,500));expected.position.y=33.5;expected.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),terrainNormal(w.scene,500,500)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-1.2));expected.updateMatrixWorld(true);
  const parts:THREE.Mesh[]=[];expected.traverse(n=>{if(n instanceof THREE.Mesh)parts.push(n);});const overlay=renderer.group.children[0]!;
  overlay.children.forEach((n,i)=>{const mesh=n as THREE.InstancedMesh,matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);matrix.elements.forEach((v,j)=>expect(v).toBeCloseTo(parts[i]!.matrixWorld.elements[j]!,4));expect(mesh.geometry.getAttribute('position').array).toEqual(parts[i]!.geometry.getAttribute('position').array);});
  const original=renderer.group.children[0];renderer.update({...s,timeS:1},resident,camera,player,0,false);expect(renderer.group.children[0]).toBe(original);
  let released=0;overlay.traverse(n=>{if(n instanceof THREE.Mesh)n.geometry.addEventListener('dispose',()=>released++);});renderer.update(s,{revision:2,contains:()=>false},camera,player,0,false);expect(renderer.stats.prototypes).toBe(0);expect(renderer.stats.instances).toBe(0);expect(released).toBeGreaterThan(0);
  const active={...s,control:{kind:'vehicle' as const,id:'first'},vehicles:s.vehicles.filter(v=>v.id!=='first')},a=renderer.syncActive(active,()=>{});expect(a).toBeTruthy();expect(renderer.syncActive({...active,timeS:2},()=>{})).toBe(a);expect(renderer.stats.active).toBe('first');
  let detached=false;renderer.syncActive(s,()=>{detached=true;});expect(detached).toBe(true);expect(a!.parent).toBeNull();expect(renderer.stats.active).toBe(null);renderer.dispose(()=>{});disposeChunk(expected);
 });
});
