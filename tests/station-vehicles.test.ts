import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {Box3,Mesh,Quaternion,Raycaster,Vector3} from 'three';
import source from '../src/scene/world/station_vehicles.dream?raw';
import {compileDreamWorld,formatDream} from '../src/scene/dream';
import {assemblyBounds,measuredScale} from '../src/scene/measure';
import {controlOf,type ObjectDslV2} from '../src/scene/object-dsl';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {parseScene} from '../src/scene/schema';
import {validateScenePlayability} from '../src/scene/validate';
import {createCarAtSpawn,carFootprintClear,type World} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {nearbyRide,toggleRide,stepInteractive,bodyWorld} from '../src/sim/interaction';
import {encodeSave,decodeSave} from '../src/sim/save';
import {vehicleReviewStart} from '../src/game/review-start';
import {buildObject,animateObject} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import {disposeChunk} from '../src/game/chunk-packet';

const specs=compileDreamWorld(source).assemblies;
const item=(spec:ObjectDslV2)=>({id:'vehicle',kind:'custom' as const,labelText:spec.displayName,x:0,y:0,scale:1,spec:{...spec,voxelSize:1}});

describe('station fleet construction',()=>{
 it('keeps the runnable example identical and preserves explicit physical size and driver capability',()=>{
  expect(readFileSync('docs/examples/station-vehicles.dream','utf8')).toBe(source);
  expect(compileDreamWorld(formatDream(source)).assemblies).toEqual(specs);
  expect(specs.map(s=>s.displayName)).toEqual(['Station taxi','Station cargo van']);
  for(const spec of specs){
   const scale=measuredScale(spec),bounds=assemblyBounds(spec);
   expect(spec.parts).toHaveLength(32);expect(spec.joints).toHaveLength(2);
   expect(controlOf(spec)).toBe('car');expect(spec.contacts).toBeUndefined();
   expect(spec.measure).toEqual({kind:'car',axis:'x',meters:spec.displayName==='Station taxi' ? 4.8 : 5.2});
   expect(bounds.getSize(new Vector3()).x*scale).toBeCloseTo(spec.measure!.meters*10);
   expect(bounds.min.y).toBeCloseTo(0);expect(bounds.max.y).toBeCloseTo(spec.body.colliderHeight!);
   expect(Math.hypot(bounds.max.x,Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)))).toBeLessThan(spec.body.colliderRadius+.8);
   expect(spec.parts.filter(p=>p.material.nightColor).length).toBeGreaterThanOrEqual(4);
   const seat=spec.rideable!.seat;expect(seat[1]).toBeGreaterThan(3);expect(seat[1]).toBeLessThan(bounds.max.y-5);
   expect(seat[0]).toBeGreaterThan(bounds.min.x+5);expect(seat[0]).toBeLessThan(bounds.max.x-5);
  }
 });
 it.each(specs)('$displayName has open arches, attached suspension and coaxial tires through rolling',spec=>{
  const group=buildObject(item(spec));group.updateMatrixWorld(true);
  const shell=group.getObjectByName(spec.parts.find(p=>!p.parent && p.shape==='prism' && p.size[0]>40)!.id)!;
  const suspension=group.getObjectByName(spec.parts.find(p=>p.shape==='voxel' && p.size[0]>30)!.id)!;
  for(const joint of spec.joints!){
   const node=group.getObjectByName(joint.id)!,center=node.getWorldPosition(new Vector3()),radius=joint.animation && 'radius' in joint.animation ? joint.animation.radius : 0;
   expect(radius).toBeGreaterThan(3);
   for(let angle=0;angle<Math.PI*2;angle+=Math.PI/36){
    const ray=new Raycaster(new Vector3(center.x+Math.cos(angle)*radius,center.y+Math.sin(angle)*radius,30),new Vector3(0,0,-1));
    expect(ray.intersectObject(shell),`${spec.displayName}: wheel clips shell at ${angle}`).toHaveLength(0);
   }
   expect(new Raycaster(new Vector3(center.x,center.y,30),new Vector3(0,0,-1)).intersectObject(suspension).length).toBeGreaterThan(0);
   const descendants=node.children.map(part=>({part,center:part.getWorldPosition(new Vector3())}));
   for(const {part,center:partCenter} of descendants){
    expect(Math.abs(new Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new Quaternion())).z)).toBeCloseTo(1);
    expect(partCenter.clone().sub(center).cross(new Vector3(0,0,1)).length()).toBeLessThan(1e-7);
   }
   animateObject(group,2,true,13);group.updateMatrixWorld(true);
   expect(node.getWorldPosition(new Vector3()).distanceTo(center)).toBeLessThan(1e-8);
   for(const {part,center:partCenter} of descendants)expect(part.getWorldPosition(new Vector3()).distanceTo(partCenter)).toBeLessThan(1e-8);
   animateObject(group,0,true,0);group.updateMatrixWorld(true);
  }
  const archBounds=new Box3().setFromObject(shell,true),supportBounds=new Box3().setFromObject(suspension,true);
  expect(archBounds.intersectsBox(supportBounds)).toBe(true);
  disposeChunk(group);
 });
 it.each(specs)('$displayName retains identical bounds and wheel poses after mesh compaction',spec=>{
  const raw=buildObject(item(spec)),batched=compactObject(buildObject(item(spec)));
  let meshes=0;batched.traverse(n=>{if(n instanceof Mesh)meshes++;});expect(meshes).toBeLessThanOrEqual(4);
  for(const distance of [0,3,25,90]){
   for(const group of [raw,batched]){animateObject(group,1,true,distance);group.rotation.set(.1,.6,-.1);group.updateMatrixWorld(true);}
   const a=new Box3().setFromObject(raw,true),b=new Box3().setFromObject(batched,true);
   expect(a.min.distanceTo(b.min)).toBeLessThan(.0001);expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
  }
  disposeChunk(raw);disposeChunk(batched);
 });
 it.each(specs)('$displayName boards, drives, parks, restores and reboards through existing controls',spec=>{
  const data=compileDreamWorld(source+`place parked(object=${spec.displayName==='Station taxi' ? 'station_taxi':'station_cargo_van'},at=[480,360],role=controllable,parked=true);`);
  const scene=parseScene({...createFixtureScene(),objects:data.objects,terrain:{hills:[]},regions:[]});
  const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
  expect(validateScenePlayability(scene,world.roadMask,11)).toEqual([]);
  const immutable=JSON.stringify(scene),foot=vehicleReviewStart(createCarAtSpawn(scene),world,'parked');
  expect(foot.control.kind).toBe('foot');expect(nearbyRide(foot,world)?.id).toBe('parked');
  let driven=toggleRide(foot,world);expect(driven.control).toEqual({kind:'vehicle',id:'parked'});
  for(let n=0;n<120;n++)driven=stepInteractive(driven,{throttle:1,steer:.1},1/120,world);
  expect(Math.hypot(driven.x-480,driven.y-360)).toBeGreaterThan(20);
  const exited=toggleRide(driven,world);expect(exited.control.kind).toBe('foot');
  expect(carFootprintClear(bodyWorld(exited,world),exited.x,exited.y,exited.elevation,exited.timeS,exited)).toBe(true);
  const restored=decodeSave(encodeSave(exited,exited.timeS,world),world).state;
  expect(restored.vehicles).toEqual(exited.vehicles);expect(toggleRide(restored,world).control).toEqual({kind:'vehicle',id:'parked'});
  expect(JSON.stringify(scene)).toBe(immutable);
 });
});
