import {it,expect} from 'vitest';
import {OrthographicCamera,Vector3,Mesh} from 'three';
import source from '../docs/examples/stairs-home.dream?raw';
import {compileDream,checkDream,formatDream} from '../src/scene/dream';
import {measuredScale} from '../src/scene/measure';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {parseScene} from '../src/scene/schema';
import {sceneInteriors,walkingHeight} from '../src/scene/interiors';
import {createCarAtSpawn,carFootprintClear,type CarState} from '../src/sim/car';
import {stepInteractive,bodyWorld} from '../src/sim/interaction';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {WorldScenery} from '../src/game/scenery';
import {packChunk,unpackChunk,disposeChunk} from '../src/game/chunk-packet';
const spec=compileDream(source)[0]!,scale=measuredScale(spec),object={id:'house',kind:'custom' as const,labelText:'House',x:480,y:360,scale,spec};
const scene=parseScene({...createFixtureScene(),objects:[object],regions:[],terrain:{hills:[]}}),world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11},room=sceneInteriors(scene)[0]!,dt=1/120;
function foot(x=6,z=-14):CarState{const p=room.toWorld(x,z);return {...createCarAtSpawn(scene),...p,control:{kind:'foot'},elevation:room.floor,vx:0,vy:0,vehicles:[{id:null,x:800,y:650,elevation:0,headingRad:0,distance:0}]};}
function walk(s:CarState,x:number,z:number,seconds=6){const p=room.toWorld(x,z),a=Math.atan2(180,480);for(let i=0;i<seconds/dt;i++){const dx=p.x-s.x,dy=p.y-s.y,d=Math.hypot(dx,dy);if(d<.7)break;s=stepInteractive(s,{steer:(dx*Math.cos(a)-dy*Math.sin(a))/d,throttle:(-dx*Math.sin(a)-dy*Math.cos(a))/d},dt,world);}return s;}
it('builds one bounded voxel stair and identical rotated tread contacts from one Dream command',()=>{
 expect(compileDream(formatDream(source))).toEqual(compileDream(source));const stair=spec.parts.find(p=>p.voxels?.grid.join(',')==='1,12,12')!;expect(stair).toBeDefined();expect(stair.voxels!.operations).toHaveLength(12);
 const treads=spec.contacts!.filter(c=>c.size?.[0]===4);expect(treads).toHaveLength(12);for(const [i,c] of treads.entries()){expect(c.height).toBeCloseTo(8.5*(i+1)/12);expect(c.size![1]).toBeCloseTo(22/12);}
 const rotated=compileDream(source.replace('at=[6,.5,0],size=[4,8.5,22],steps=12);','at=[0,.5,0],size=[4,1,8],steps=2,heading_deg=90);'))[0]!;expect(rotated.contacts!.filter(c=>c.size?.[0]===4)[0]).toMatchObject({headingRad:Math.PI/2});expect(rotated.parts.find(p=>p.voxels?.grid.join(',')==='1,2,2')!.rotation![1]).toBeCloseTo(-Math.PI/2);
 for(const bad of [source.replace(' contact c_landing(at=[6,8.5,13.5],size=[6,5],height=.5);',''),source.replace('size=[12,32]','size=[18,32]'),source.replace('steps=12','steps=0'),source.replace('steps=12','steps=2.5'),source.replace('size=[4,8.5,22]','size=[1,8.5,22]'),source.replace('size=[4,8.5,22]','size=[4,40,22]'),source.replace('material=home_wood,at=[6,.5,0],size=[4,8.5,22]','material=missing,at=[6,.5,0],size=[4,8.5,22]')])expect(checkDream(bad).ok).toBe(false);
});
it('walks up, crosses the landing, persists upstairs, and walks down without changing the downstairs floor',()=>{
 let s=walk(foot(),6,13.5);expect(s.elevation).toBeCloseTo(room.floor+8.5*scale);expect(s.grounded).toBe(true);s=walk(s,0,13.5);expect(Math.abs(s.x-480)).toBeLessThan(.7);expect(s.elevation).toBeCloseTo(9*scale);
 const text=encodeSave(s,12,world),loaded=decodeSave(text,world).state;expect(loaded).toEqual(JSON.parse(text).state);s=walk(loaded,6,13.5);s=walk(s,6,-14);expect(s.elevation).toBeCloseTo(room.floor);expect(s.y).toBeLessThan(room.toWorld(6,-13).y);
 expect(walkingHeight(scene,480,360)).toBeCloseTo(room.floor);expect(carFootprintClear(bodyWorld(foot(0,0),world),480,360,room.floor,0)).toBe(true);
});
it('keeps the upper floor solid underfoot and hides it only when the player is below after streaming',()=>{
 const built=new WorldScenery(scene),packed=packChunk(built.group),root=unpackChunk(packed.packet,()=>{throw Error('No water');}),streamed=WorldScenery.fromChunk(scene,root,packed.packet.occlusion),camera=new OrthographicCamera(-200,200,200,-200,1,2000);camera.position.set(0,300,-300);camera.lookAt(0,20,0);camera.updateMatrixWorld();
 const player=new Vector3(0,room.floor+8.5,0);streamed.update(camera,player,1/30,true);let n=0;root.traverse(node=>{if(node instanceof Mesh && node.userData.cutaway==='above'){expect(node.geometry.getAttribute('visibility').getX(0)).toBe(0);n++;}});expect(n).toBeGreaterThan(1);
 player.y=9*scale+8.5;streamed.update(camera,player,1/30,true);let floors=0;root.traverse(node=>{if(node instanceof Mesh && node.userData.cutaway==='above' && node.userData.cutawayHeight<9){expect(node.geometry.getAttribute('visibility').getX(0)).toBe(1);floors++;}});expect(floors).toBe(1);disposeChunk(root);disposeChunk(built.group);
});

it('hits the upper slab from below on a jump instead of snapping through it',()=>{
 let s=foot(0,0);s=stepInteractive(s,{steer:0,throttle:0,jump:true},dt,world);let peak=s.elevation;for(let i=0;i<240;i++){s=stepInteractive(s,{steer:0,throttle:0},dt,world);peak=Math.max(peak,s.elevation);}expect(peak+17.5).toBeLessThanOrEqual(8.5*scale+.05);expect(peak).toBeGreaterThan(room.floor+8);expect(s.elevation).toBeCloseTo(room.floor);
});
