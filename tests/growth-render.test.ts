import {it,expect} from 'vitest';
import * as THREE from 'three';
import source from '../docs/examples/orchard-replanting.dream?raw';
import {compileDreamScene} from '../src/scene/dream';
import {WorldScenery} from '../src/game/scenery';
import {freezeStatic} from '../src/game/batching';
import {packChunk,unpackChunk,disposeChunk} from '../src/game/chunk-packet';
import {geometryMemory} from '../src/game/geometry-memory';
import {toonMaterial} from '../src/game/shaders';
import {buildDamageObject,updateDamage} from '../src/game/damage';
import {WorldDebris} from '../src/game/debris';
import {createCarAtSpawn} from '../src/sim/car';
import {breakOnContact} from '../src/sim/impacts';
import {queryStaticContacts} from '../src/scene/contacts';
import {buildPaperMask} from '../src/sim/mask';
import {buildMaskForScene} from '../src/scene/fixture';
const scene=compileDreamScene(source,{sceneId:'growing-render',revisionId:'r1',sourceHash:'growing-render'}),tree=scene.objects.find(o=>o.id==='remote_tree')!;
function size(group:THREE.Group){group.updateMatrixWorld(true);return new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());}
function checkSize(actual:THREE.Vector3,expected:THREE.Vector3,scale:number){for(const key of ['x','y','z'] as const)expect(actual[key]).toBeCloseTo(expected[key]*scale,3);}
it('scales complete streamed trees about their root without new buffers, shadow drift or stale bounds',()=>{
 const original=new WorldScenery(scene,[tree]),bytes=geometryMemory(original.group).bytes,full=size(original.group),packet=packChunk(original.group).packet,group=unpackChunk(packet,()=>toonMaterial('#fff')),copy=WorldScenery.fromChunk(scene,group,packet.occlusion);
 freezeStatic(group);
 for(const value of [.2,.5,1]){copy.setGrowth(new Map(value===1 ? [] : [[tree.id,value]]));checkSize(size(group),full,value);expect(geometryMemory(group).bytes).toBe(bytes);
  group.traverse(node=>{if(!(node instanceof THREE.InstancedMesh))return;const matrix=new THREE.Matrix4();node.getMatrixAt(0,matrix);const positions=node.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){const p=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(matrix);expect(node.boundingSphere!.distanceToPoint(p)).toBeLessThan(.001);}});
 }
 copy.setGrowth(new Map([[tree.id,.2]]));copy.setHidden(new Set([tree.id]));copy.setGrowth(new Map([[tree.id,.5]]));copy.setHidden(new Set());checkSize(size(group),full,.5);copy.setGrowth(new Map());checkSize(size(group),full,1);disposeChunk(group);disposeChunk(original.group);
});
it('keeps resident trees and repeated debris at the same captured growth scale',()=>{
 const group=buildDamageObject(tree),full=size(group),base=createCarAtSpawn(scene);updateDamage(group,tree.id,base,.2);checkSize(size(group),full,.2);updateDamage(group,tree.id,base,.5);checkSize(size(group),full,.5);updateDamage(group,tree.id,base,1);checkSize(size(group),full,1);
 const world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11},s={...base,x:tree.x-20,y:tree.y,vx:300,vy:0,growing:[{objectId:tree.id,serviceId:'tree_care',plantedAtS:0,progressS:0}]};breakOnContact(s,world,tree.x-10,tree.y,queryStaticContacts(scene,tree.x,tree.y,1,s));const debris=new WorldDebris(scene);debris.update(s);expect(debris.stats.pieces).toBe(1);expect(debris.group.children[0]!.scale.x).toBeCloseTo(tree.scale*.2);const bytes=geometryMemory(debris.group).bytes;debris.update({...s,timeS:1});expect(geometryMemory(debris.group).bytes).toBe(bytes);debris.dispose();disposeChunk(group);
});
