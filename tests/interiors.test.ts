import impactSource from '../src/scene/impact-creations.dream?raw';
import {repairSpaceClear} from '../src/sim/repair';
import {workGround} from '../src/scene/interiors';
import {workPath} from '../src/sim/work-navigation';
import {interactionSight} from '../src/sim/sight';
import {buildLightPools,WorldDaylight} from '../src/game/daylight';
import {Scene as ThreeScene,HemisphereLight,DirectionalLight} from 'three';
import {describe,it,expect} from 'vitest';
import {OrthographicCamera,Vector3,Mesh} from 'three';
import source from '../src/scene/world/market_interior.dream?raw';
import {compileDream,compileDreamWorld,checkDream,formatDream} from '../src/scene/dream';
import {contactOverlaps,contactSeparation,segmentContactDistance} from '../src/scene/contact-geometry';
import {sceneInteriors,walkingHeight,interiorProblems,occupiedInterior,portalPoints} from '../src/scene/interiors';
import {sceneContactData,primeSceneContacts,objectContacts} from '../src/scene/contacts';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {parseScene} from '../src/scene/schema';
import {validateScenePlayability} from '../src/scene/validate';
import {measuredScale} from '../src/scene/measure';
import {createCarAtSpawn,carFootprintClear,stepCar,type CarState} from '../src/sim/car';
import {bodyWorld,stepInteractive,FOOT_HEIGHT,toggleRide} from '../src/sim/interaction';
import {buildPaperMask} from '../src/sim/mask';
import {objectPlacement} from '../src/scene/placement';
import {WorldScenery} from '../src/game/scenery';
import {packChunk,unpackChunk,disposeChunk} from '../src/game/chunk-packet';
const spec=compileDream(source)[0]!,object={id:'hall',kind:'custom' as const,labelText:'Market',x:480,y:360,scale:measuredScale(spec),spec};
const scene=parseScene({...createFixtureScene(),objects:[object],regions:[],terrain:{hills:[]}}),world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
const room=sceneInteriors(scene)[0]!,dt=1/120;
function foot(x:number,y:number):CarState{return {...createCarAtSpawn(scene),control:{kind:'foot'},x,y,elevation:walkingHeight(scene,x,y),vx:0,vy:0,vehicles:[{id:null,x:800,y:650,elevation:0,headingRad:0,distance:0}]};}
function walk(s:CarState,x:number,y:number,seconds:number){const angle=Math.atan2(180,480),c=Math.cos(angle),si=Math.sin(angle),length=Math.hypot(x,y);for(let i=0;i<seconds/dt;i++)s=stepInteractive(s,{steer:(x*c-y*si)/length,throttle:(-x*si-y*c)/length},dt,world);return s;}

describe('upright rectangle contacts',()=>{
 it('keeps roadside rectangles from filling the road with their broad-phase circle',()=>{
  const spec=compileDream('dream 2;material brick(style=toon,colors=[#995b4c,#995b4c]);object wall(label="Roadside wall"){measure(kind=custom,axis=x,meters=12);body(interaction=solid,radius=4,height=20);contact c_wall(at=[0,0,0],size=[120,2],height=20);part wall(shape=box,material=brick,at=[0,10,0],size=[120,20,2]);}')[0]!;
  const doc=parseScene({...createFixtureScene(),objects:[{id:'roadside',kind:'custom',labelText:'Wall',x:480,y:660,scale:2,spec}]}),mask=buildMaskForScene(doc),world={scene:doc,roadMask:mask,driveMask:buildPaperMask(960,720),carRadius:11};
  expect(carFootprintClear(world,480,592,0,0)).toBe(true);
  expect(validateScenePlayability(doc,mask,11)).toEqual([]);
 });
 it('keeps empty doorway/corner space clear and resolves outward from rotated faces',()=>{
  const c={x:0,y:0,r:Math.hypot(10,2),bottom:0,top:30,box:{halfX:10,halfY:2,headingRad:Math.PI/2}};
  expect(contactOverlaps(c,5,0,2)).toBe(false);expect(contactOverlaps(c,3,0,2)).toBe(true);
  const p=contactSeparation(c,1,0);expect(p.distance).toBeCloseTo(-1);expect(p.nx).toBeCloseTo(1);expect(p.ny).toBeCloseTo(0);
  expect(segmentContactDistance(c,{x:4,y:-30},{x:4,y:30})).toBeCloseTo(2);
  expect(segmentContactDistance(c,{x:-4,y:0},{x:4,y:0})).toBe(0);
  expect(segmentContactDistance(c,{x:4,y:12},{x:6,y:14})).toBeCloseTo(Math.sqrt(8));
  expect(segmentContactDistance(c,{x:0,y:0},{x:0,y:0})).toBe(0);
 });
 it('retains circles and rejects ambiguous/moving rectangle data at the language boundary',()=>{
  const c={x:0,y:0,r:3,bottom:0,top:10};expect(contactOverlaps(c,4,0,2)).toBe(true);expect(segmentContactDistance(c,{x:5,y:-5},{x:5,y:5})).toBe(2);
  expect(checkDream(source).ok).toBe(true);expect(compileDream(formatDream(source))).toEqual(compileDream(source));
  for(const bad of [source.replace('size=[63,38],height=.5','size=[63,38],radius=2,height=.5'),source.replace('size=[63,38],height=.5','height=.5'),source.replace('size=[63,38],height=.5','radius=2,height=2,heading_deg=10'),source.replace('size=[63,38],height=.5','size=[0,38],height=.5'),source.replace('width=4,height=6','width=70,height=6'),source.replace('size=[63,38],height=.5','size=[60,38],height=.5'),source.replace('at=[0,21.5,0],size=[65,40]','at=[0,22,0],size=[65,40]')])expect(checkDream(bad).ok,bad).toBe(false);
  const prepared=sceneContactData(scene);expect(()=>primeSceneContacts(scene,prepared)).not.toThrow();expect(()=>primeSceneContacts(scene,{...prepared,contacts:prepared.contacts.map((c,i)=>i ? c : {...c,box:{halfX:NaN,halfY:1,headingRad:0}})})).toThrow();
 });
});
describe('enterable ground floors',()=>{
 it('steps through the real doorway, supports jumps, hits the ceiling and leaves through the same opening',()=>{
  expect(interiorProblems(scene)).toEqual([]);const p=portalPoints(room,room.room.portals[0]!);let s=foot(p.outside.x,p.outside.y);
  s=walk(s,0,1,1);expect(s.y).toBeGreaterThan(p.inside.y);expect(s.elevation).toBeCloseTo(room.floor);expect(occupiedInterior(scene,s.x,s.y,s.elevation)?.object.id).toBe('hall');
  s=stepInteractive(s,{steer:0,throttle:0,jump:true},dt,world);expect(s.grounded).toBe(false);let peak=s.elevation;
  for(let i=0;i<240;i++){s=stepInteractive(s,{steer:0,throttle:0},dt,world);peak=Math.max(peak,s.elevation);}expect(peak).toBeGreaterThan(room.floor+10);expect(s.elevation).toBeCloseTo(room.floor);
  let high={...s,elevation:room.ceiling-FOOT_HEIGHT-.1,vz:100,grounded:false};high=stepCar(high,{steer:0,throttle:0},dt,bodyWorld(high,world));expect(high.elevation+FOOT_HEIGHT).toBeLessThanOrEqual(room.ceiling+.05);expect(high.vz).toBeLessThanOrEqual(0);
  for(let i=0;i<360;i++){const dx=480-s.x,dy=p.outside.y-8-s.y;if(Math.hypot(dx,dy)<1)break;s=walk(s,dx,dy,dt);}expect(s.y).toBeLessThan(p.outside.y);expect(s.elevation).toBeCloseTo(0);
 });
 it('blocks solid walls and cars at the narrow entrance without filling the room',()=>{
  const p=portalPoints(room,room.room.portals[0]!);const car={...createCarAtSpawn(scene),x:p.outside.x,y:p.outside.y,headingRad:Math.PI/2,elevation:0};let s=car;
  for(let i=0;i<240;i++)s=stepCar(s,{steer:0,throttle:1},dt,world);expect(s.y).toBeLessThan(p.center.y);
  const start=foot(430,p.outside.y),blocked=walk(start,0,1,1);expect(blocked.y).toBeLessThan(p.center.y);
  const inside=foot(480,360);expect(carFootprintClear(bodyWorld(inside,world),inside.x,inside.y,inside.elevation,0,inside)).toBe(true);
  const back=walk(inside,0,1,3);expect(back.y).toBeLessThan(room.polygon[2]!.y-3);expect(back.elevation).toBeCloseTo(room.floor);
 });
 it('fits ordinary placed contents to the floor and rejects a blocked portal',()=>{
  const inside=parseScene({...scene,objects:[...scene.objects,{id:'crate',kind:'tire-stack',labelText:'Crate',x:500,y:360,scale:1}]});
  expect(objectPlacement(inside,inside.objects[1]!).base).toBeCloseTo(room.floor);
  const blocked=parseScene({...scene,objects:[...scene.objects,{id:'blocker',kind:'tire-stack',labelText:'Crate',x:480,y:portalPoints(room,room.room.portals[0]!).center.y,scale:1}]});expect(interiorProblems(blocked).some(m=>m.includes('portal'))).toBe(true);
 });
 it('restores a broken table above its supporting floor while still rejecting real obstructions',()=>{
  const table=compileDreamWorld(impactSource).assemblies.find(s=>s.displayName==='Breakaway table')!,t={id:'table',kind:'custom' as const,labelText:'Table',x:500,y:360,scale:measuredScale(table),spec:table},doc=parseScene({...scene,objects:[object,t]}),target={objectId:t.id,contact:objectContacts(doc,t)[0]!},state={...foot(440,300),broken:[t.id]};
  expect(repairSpaceClear(doc,target,state)).toBe(true);
  const occupied={...state,x:500,y:360,elevation:room.floor};expect(repairSpaceClear(doc,target,occupied)).toBe(false);
 });
 it('uses the declared floor as a work ground, including rotated buildings',()=>{
  expect(workGround(scene,'hall')!.points).toEqual(room.polygon);
  expect(workPath(scene,{id:'inside',grounds:['hall'],access:[],network:false},{x:480,y:310},{x:480,y:400})).toEqual([{x:480,y:400}]);
  const rotated=parseScene({...scene,objects:[{...object,headingRad:Math.PI/2}]}),f=sceneInteriors(rotated)[0]!;
  expect(interiorProblems(rotated)).toEqual([]);const p=portalPoints(f,f.room.portals[0]!);expect(p.outside.x).toBeGreaterThan(p.inside.x);expect(p.outside.y).toBeCloseTo(p.inside.y);
 });
 it('boards and leaves a parked bicycle on the supported floor without losing vehicle ownership',()=>{
  const bike=compileDream('dream 2;material red(style=toon,colors=[#aa503f,#aa503f]);object bike(label="Bike"){measure(kind=bicycle,axis=x,meters=2);body(interaction=solid,radius=10,height=14);rideable(at=[0,10,0],control=bicycle);part frame(shape=box,material=red,at=[0,5,0],size=[28,10,8]);}')[0]!;
  const doc=parseScene({...scene,objects:[object,{id:'bike',kind:'custom',labelText:'Bike',x:480,y:360,scale:measuredScale(bike),spec:bike,role:'controllable',parked:true}]}),w={...world,scene:doc},s=foot(505,360),riding=toggleRide(s,w);expect(riding.control).toEqual({kind:'vehicle',id:'bike'});expect(riding.elevation).toBeCloseTo(room.floor);
  const walking=toggleRide(riding,w);expect(walking.control).toEqual({kind:'foot'});expect(walking.elevation).toBeCloseTo(room.floor);expect(walking.vehicles.find(v=>v.id==='bike')!.elevation).toBeCloseTo(room.floor);
 });
 it('uses the opening for trade/conversation sight and keeps indoor pools on the physical floor at day and night',()=>{
  const p=portalPoints(room,room.room.portals[0]!);const s=foot(480,300);
  expect(interactionSight(scene,{x:480,y:300,elevation:room.floor},{...p.outside,elevation:0},s)).toBe(true);
  expect(interactionSight(scene,{x:430,y:300,elevation:room.floor},{x:430,y:270,elevation:0},s)).toBe(false);
  const root=new ThreeScene(),sky=new HemisphereLight(),sun=new DirectionalLight(),fill=new DirectionalLight(),lighting=new WorldDaylight({...scene,daylight:{cycleSeconds:600,startHour:12}},root,sky,sun,fill);
  for(const t of [0,250]){lighting.update(t);expect(lighting.pools.visible).toBe(true);}
  let vertices=0;lighting.pools.traverse(n=>{if(!(n instanceof Mesh))return;const p=n.geometry.getAttribute('position'),indoor=n.geometry.getAttribute('roomLight');for(let i=0;i<p.count;i++){expect(p.getY(i)).toBeCloseTo(room.floor+2.05,4);expect(indoor.getX(i)).toBe(1);vertices++;}});expect(vertices).toBeGreaterThan(0);
 });
 it('preserves shell groups through compaction, instancing and worker transfer, keeping the occupied floor opaque',()=>{
  const built=new WorldScenery(scene),packed=packChunk(built.group),root=unpackChunk(packed.packet,()=>{throw Error('No water');}),streamed=WorldScenery.fromChunk(scene,root,packed.packet.occlusion);
  const camera=new OrthographicCamera(-200,200,200,-200,1,2000);camera.position.set(0,300,-300);camera.lookAt(0,20,0);camera.updateMatrixWorld();
  const player=new Vector3(0,room.floor+8.5,0);streamed.update(camera,player,1/30,true);
  let hidden=0,opaque=0,upper=0;root.traverse(n=>{if(!(n instanceof Mesh))return;const visibility=n.geometry.getAttribute('visibility');if(!visibility)return;const tag=n.userData.cutaway;if(tag==='roof' || tag==='front' || tag==='above'){expect(visibility.getX(0)).toBe(0);hidden++;if(tag==='above')upper++;}else{expect(visibility.getX(0)).toBe(1);opaque++;}});expect(hidden).toBeGreaterThan(1);expect(opaque).toBeGreaterThan(0);expect(upper).toBeGreaterThan(0);
  player.set(14.5*object.scale,9*object.scale+8.5,-5*object.scale);streamed.update(camera,player,1/30,true);root.traverse(n=>{if(n instanceof Mesh && n.userData.cutaway==='above')expect(n.geometry.getAttribute('visibility').getX(0)).toBe(1);});
  player.set(300,150,300);streamed.update(camera,player,1/30,true);root.traverse(n=>{if(n instanceof Mesh && n.geometry.getAttribute('visibility'))expect(n.geometry.getAttribute('visibility').getX(0)).toBe(1);});disposeChunk(root);disposeChunk(built.group);
 });
});
