import {it,expect} from 'vitest';
import {Euler,Quaternion,Vector3} from 'three';
import {interactiveWorld} from '../src/scene/interactive-world';
import {createFixtureScene} from '../src/scene/fixture';
import {buildObject} from '../src/game/world3d';
import {CharacterAnimator} from '../src/game/character-animation';
import {actorOrientation} from '../src/game/actor-orientation';
import {gaitStride,gaitStance} from '../src/game/humanoid-gait';
import {drivingHeight} from '../src/scene/terrain';
import {terrainNormal} from '../src/game/environment';
import type {ActorPose} from '../src/sim/actors';

it.each([30,60,144])('holds route walkers upright and their planted shoes still on a changing hill at %i fps',fps=>{
 const scene=createFixtureScene(),spec=interactiveWorld.assemblies.find(s=>s.displayName==='Explorer')!,scale=.306;
 scene.terrain.hills=[{id:'walking-hill',x:500,y:360,radiusX:350,radiusY:300,height:70}];
 const group=buildObject({id:'walker',kind:'custom',labelText:'Walker',x:0,y:0,scale,spec}),animation=new CharacterAnimator(group,spec);
 const ankles=['left','right'].map(side=>group.getObjectByName(spec.joints!.find(j=>j.bone===`${side}_ankle`)!.id)!);
 const old=new Map<number,Vector3>();let contacts=0,maxDrift=0;
 for(let frame=0;frame<fps*4;frame++){
  const x=270+14*frame/fps,y=360,elevation=drivingHeight(scene.terrain,x,y),pose:ActorPose={id:'walker',x,y,elevation,headingRad:0,speed:14,distance:x-270,travelled:x-270,kind:'path'};
  group.position.set(x,elevation,y);group.quaternion.copy(actorOrientation(scene,pose,true));
  const ground=(x:number,z:number)=>({height:drivingHeight(scene.terrain,x,z),slopeX:(drivingHeight(scene.terrain,x+.01,z)-drivingHeight(scene.terrain,x-.01,z))/.02,slopeZ:0});
  animation.update({speed:14,grounded:true,swimming:false,verticalSpeed:0,time:frame/fps,enabled:true,travel:{x,y:elevation,z:y,heading:0},ground},1/fps);group.updateMatrixWorld(true);
  const phase=gaitStance(0)/2+14*frame/fps/(scale*gaitStride(0));
  for(const [i,ankle] of ankles.entries()){
   const down=(phase+i*.5)%1<gaitStance(0),at=ankle.getWorldPosition(new Vector3()),previous=old.get(i);
   if(down && previous && frame>fps){contacts++;maxDrift=Math.max(maxDrift,at.distanceTo(previous));}
   if(down)old.set(i,at);else old.delete(i);
  }
 }
 expect(contacts).toBeGreaterThan(fps);expect(maxDrift).toBeLessThan(.002);
});

it.each(['path','rail','water','air'] as const)('preserves %s vehicle orientation and ordinary activity grounding',kind=>{
 const scene=createFixtureScene();scene.terrain.hills=[{id:'hill',x:500,y:360,radiusX:350,radiusY:300,height:70}];
 const pose:ActorPose={id:'vehicle',x:290,y:360,elevation:0,headingRad:.8,speed:14,distance:0,travelled:0,kind};
 const up=new Vector3(0,1,0),normal=terrainNormal(scene,pose.x,pose.y);
 const tilted=up.clone().applyQuaternion(actorOrientation(scene,pose,false));
 expect(tilted.distanceTo(kind==='path' || kind==='rail' ? normal : up)).toBeLessThan(1e-10);
 expect(up.clone().applyQuaternion(actorOrientation(scene,{...pose,activity:'patrol'},false)).distanceTo(up)).toBeLessThan(1e-10);
 expect(actorOrientation(scene,{...pose,activity:'patrol'},false,true).angleTo(actorOrientation(scene,pose,false))).toBeLessThan(1e-7);
 const upright=actorOrientation(scene,pose,true);
 expect(up.clone().applyQuaternion(upright).distanceTo(up)).toBeLessThan(1e-10);
 const forward=new Vector3(1,0,0).applyQuaternion(upright);
 expect(forward.x).toBeCloseTo(Math.cos(pose.headingRad));expect(forward.z).toBeCloseTo(Math.sin(pose.headingRad));
 const bank=.18,pitch=-.24,expected=new Quaternion().setFromUnitVectors(up,kind==='path' || kind==='rail' ? normal : up)
  .multiply(new Quaternion().setFromAxisAngle(up,-pose.headingRad)).multiply(new Quaternion().setFromEuler(new Euler(bank,0,pitch)));
 expect(actorOrientation(scene,{...pose,bank,pitch},false).angleTo(expected)).toBeLessThan(1e-7);
});
