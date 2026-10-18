import {it,expect} from 'vitest';
import {Vector3,Raycaster,Mesh,DoubleSide} from 'three';
import {interactiveWorld} from '../src/scene/interactive-world';
import {buildObject} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import {CharacterAnimator} from '../src/game/character-animation';
import {FootPlants} from '../src/game/humanoid-gait';
import {characterGround,prepareCharacterGround,primeCharacterGround} from '../src/game/character-ground';
import {compileDreamScene} from '../src/scene/dream';
import {buildStreets} from '../src/game/streets';
import {drivingHeight,terrainHeight} from '../src/scene/terrain';
import {createCarAtSpawn} from '../src/sim/car';
import city from '../docs/examples/city-cycle-lanes.dream?raw';

const spec=interactiveWorld.assemblies.find(s=>s.displayName==='Explorer')!;
function rig(scale=.306){
 const group=compactObject(buildObject({id:'person',kind:'custom',labelText:'Explorer',x:0,y:0,scale,spec}));
 const animation=new CharacterAnimator(group,spec),ankles=['left','right'].map(side=>group.getObjectByName(spec.joints!.find(j=>j.bone===side+'_ankle')!.id)!);
 return {group,animation,ankles};
}

it.each([30,60,144])('keeps a planted ankle in all three world axes while walking uphill at %i rendered steps per second',fps=>{
 const {group,animation,ankles}=rig(),old=new Map<number,Vector3>();let contacts=0,verticalDrift=0;
 const ground=(x:number,_z:number)=>({height:x*.2,slopeX:.2,slopeZ:0});
 for(let f=0;f<fps*4;f++){
  const x=14*f/fps,y=ground(x,0).height;group.position.set(x,y,0);
  const input={speed:14,grounded:true,swimming:false,verticalSpeed:0,time:f/fps,enabled:true,travel:{x,y,z:0,heading:0},ground};
  animation.update(input,1/fps);group.updateMatrixWorld(true);
  for(const [i,ankle] of ankles.entries()){
   const at=ankle.getWorldPosition(new Vector3()),previous=old.get(i);
   if(previous && Math.hypot(at.x-previous.x,at.z-previous.z)<.00001){contacts++;verticalDrift=Math.max(verticalDrift,Math.abs(at.y-previous.y));}
   old.set(i,at);
  }
 }
 expect(contacts).toBeGreaterThan(fps);expect(verticalDrift).toBeLessThan(.002);
});

it('keeps the planted normal and heading fixed through a cross-slope turn, with no new support queries during stance or pause',()=>{
 let calls=0;const ground=()=>{calls++;return {height:4,slopeX:.2,slopeZ:-.3};},plants=new FootPlants(.05),pose={x:0,y:4,z:0,heading:0};
 plants.begin(pose,.3,1/60,ground);plants.sample(0,pose,.3,2,4,true,0,1,16);
 const turn={...pose,heading:.8,y:4.5};plants.begin(turn,.3,1/60,ground);const foot={...plants.sample(0,turn,.3,2,4,true,0,1,16)};
 expect(foot.rise*.3+turn.y).toBeCloseTo(4);expect(foot.yaw).toBeCloseTo(.8);
 expect(Math.cos(.8)*foot.slopeX-Math.sin(.8)*foot.slopeZ).toBeCloseTo(.2);
 expect(Math.sin(.8)*foot.slopeX+Math.cos(.8)*foot.slopeZ).toBeCloseTo(-.3);expect(calls).toBe(1);
 plants.begin(turn,.3,0,ground);expect(plants.sample(0,turn,.3,2,4,true,0,1,16)).toEqual(foot);expect(calls).toBe(1);
});

it('limits returning support probes to 20 Hz and refuses to pull a grounded body down an unsupported cliff',()=>{
 let calls=0;const ground=()=>{calls++;return {height:-100,slopeX:0,slopeZ:0};},plants=new FootPlants(.05);
 for(let f=0;f<120;f++){
  const pose={x:f/120,y:0,z:0,heading:0};plants.begin(pose,.3,1/120,ground);
  const foot=plants.sample(0,pose,.3,3,4,true,0,1,16);expect(Math.abs(foot.rise)).toBeLessThan(.01);expect(foot.lift).toBeGreaterThan(0);
 }
 expect(calls).toBe(20);
});

it('uses rendered pavement and bridge support beneath cosmetic bicycle stencils, survives transfer, and rejects malformed cache data atomically',()=>{
 const scene=compileDreamScene(city,{sceneId:'feet',revisionId:'r1',sourceHash:'feet-test'}),source=JSON.stringify(scene),data=prepareCharacterGround(scene),copy=structuredClone(scene);
 primeCharacterGround(copy,structuredClone(data));const original=characterGround(scene),received=characterGround(copy),streets=buildStreets(scene);
 streets.updateMatrixWorld(true);streets.traverse(n=>{if(n instanceof Mesh){const mats=Array.isArray(n.material) ? n.material : [n.material];mats.forEach(m=>{m.side=DoubleSide;});}});
 for(const [x,y] of [[1400,800],[1470,850],[1490,850],[2500,400]]){
  const physical=drivingHeight(scene.terrain,x!,y!),ray=new Raycaster(new Vector3(x!-scene.canonical.width/2,500,y!-scene.canonical.height/2),new Vector3(0,-1,0)),hit=ray.intersectObjects(streets.children.filter(c=>c.name!=='cycle-symbols'),true)[0]!;
  const actual={...original(x!,y!,physical+.2,1)};expect(hit).toBeDefined();expect(actual.height-.2).toBeCloseTo(hit.point.y,4);expect(received(x!,y!,physical+.2,1)).toEqual(actual);
 }
 const before={...received(1470,850,.2,1)};
 for(const mutate of [(d:typeof data)=>{d.sourceHash='stale';},(d:typeof data)=>{d.width++;},(d:typeof data)=>{d.patches[0]!.lift=NaN;},(d:typeof data)=>{d.patches[0]!.polygon[0]!.x=Infinity;},(d:typeof data)=>{d.patches[0]!.polygon=[];}]){
  const bad=structuredClone(data);mutate(bad);expect(()=>primeCharacterGround(copy,bad)).toThrow('prepared character ground');expect(characterGround(copy)(1470,850,.2,1)).toEqual(before);
 }
 expect(JSON.stringify(scene)).toBe(source);
 streets.traverse(n=>{if(n instanceof Mesh){n.geometry.dispose();(Array.isArray(n.material) ? n.material : [n.material]).forEach(m=>m.dispose());}});
});

it('fits voxel terraces instead of using the smooth physical hill, without changing the physical heightfield',()=>{
 const scene=compileDreamScene(city,{sceneId:'voxel-feet',revisionId:'r1',sourceHash:'voxel-feet-test'});
 scene.voxelWorld={groundCell:8,heightStep:1} as typeof scene.voxelWorld;scene.terrain.hills=[{id:'hill',x:3000,y:1500,radiusX:800,radiusY:800,height:100}];
 const ground=characterGround(scene),x=3202,y=1502,physical=drivingHeight(scene.terrain,x,y),top=Math.floor(terrainHeight(scene.terrain,3204,1500));
 expect(ground(x,y,physical+.2,1)).toMatchObject({height:top+.2,slopeX:0,slopeZ:0});expect(drivingHeight(scene.terrain,x,y)).toBe(physical);
});

it('uses reachable authored step caps, yields to damage and ignores unreachable caps',()=>{
 const source=city+`material stone(style=toon,colors=[#887766,#6f5b4b]);object step(label="Step"){
 measure(kind=custom,axis=x,meters=2);body(interaction=solid,radius=10,height=4);
 impact(mode=topple(speed=80,duration=1,lifetime=4));fragment slab(){part slab(shape=box,material=stone,at=[0,2,0],size=[20,4,20]);}}
 place garden_step(object=step,at=[3000,2000],role=prop);`;
 const scene=compileDreamScene(source,{sceneId:'step-feet',revisionId:'r1',sourceHash:'step-feet-test'}),ground=characterGround(scene),state=createCarAtSpawn(scene);
 expect(ground(3000,2000,4.2,1,state)).toMatchObject({height:5.7,slopeX:0,slopeZ:0,surfaceOffset:1.5});
 expect(ground(3000,2000,-8,1,state).height).toBe(.2);
 state.broken.push('garden_step');expect(ground(3000,2000,4.2,1,state).height).toBe(.2);
});

it('fits reduced-motion rest to pavement and carries its visual lift through takeoff without changing seats',()=>{
 const {group,animation}=rig(),ground=()=>({height:1.8,slopeX:0,slopeZ:0,surfaceOffset:1.6});group.position.y=.2;
 const input={speed:0,grounded:true,swimming:false,verticalSpeed:0,time:0,enabled:false,travel:{x:0,y:.2,z:0,heading:0},ground};
 animation.update(input,1/60);group.updateMatrixWorld(true);const root=group.getObjectByName(spec.joints!.find(j=>j.bone==='root')!.id)!;
 expect(root.position.y).toBeCloseTo(25+1.6/group.scale.x);
 animation.reset();for(let i=0;i<60;i++)animation.update({...input,enabled:true},1/60);
 const before=root.position.y;animation.update({...input,enabled:true,grounded:false,verticalSpeed:30},1/60);expect(root.position.y).toBeCloseTo(before,2);
 animation.update({...input,sittingHeight:12},1/60);expect(root.position.y).toBeCloseTo(15);
});
