import {describe,it,expect} from 'vitest';
import {Vector3} from 'three';
import {interactiveWorld} from '../src/scene/interactive-world';
import {compileDream,formatDream} from '../src/scene/dream';
import {objectDslSchema,hasAnimatedJoints} from '../src/scene/object-dsl';
import {HUMANOID_BONES} from '../src/scene/humanoid';
import {buildObject} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import {CharacterAnimator,solveLeg,strideFoot,type CharacterInput} from '../src/game/character-animation';
import {gaitStride,humanoidSoles} from '../src/game/humanoid-gait';
import source from '../docs/examples/humanoid.dream?raw';
const spec=interactiveWorld.assemblies.find(s=>s.displayName==='Explorer')!;
const input:CharacterInput={speed:55,grounded:true,swimming:false,verticalSpeed:0,time:0,enabled:true};
function rig(scale=1){
 const group=compactObject(buildObject({id:'person',kind:'custom',labelText:'Explorer',x:0,y:0,scale,spec}));
 const animation=new CharacterAnimator(group,spec);
 const bone=(name:string)=>group.getObjectByName(spec.joints!.find(j=>j.bone===name)!.id)!;
 return {group,animation,bone};
}
function advance(r:ReturnType<typeof rig>,state:Partial<CharacterInput>,seconds=2,fps=60){for(let f=0;f<seconds*fps;f++)r.animation.update({...input,...state,time:f/fps},1/fps);}

describe('Dream humanoid bindings',()=>{
 it('compiles and formats a complete rig without label-based lookup',()=>{
  const [person]=compileDream(formatDream(source));
  expect(person!.joints!.map(j=>j.bone).sort()).toEqual([...HUMANOID_BONES].sort());
  expect(hasAnimatedJoints({...person!,displayName:'Something else'})).toBe(true);
  expect(person!.parts.length).toBeLessThanOrEqual(32);
  expect(person!.joints).toHaveLength(12);
 });
 it.each(['missing','duplicate','wrong parent','zero limb','rotated','custom motion','unbound part','wrong body'])('rejects %s rigs before rendering',kind=>{
  const p=structuredClone(spec),j=p.joints!.find(j=>j.bone==='left_knee')!;
  if(kind==='missing')delete j.bone;
  if(kind==='duplicate')j.bone='right_knee';
  if(kind==='wrong parent')j.parent=p.joints!.find(j=>j.bone==='spine')!.id;
  if(kind==='zero limb')j.position[1]=0;
  if(kind==='rotated')j.rotation=[0,0,.1];
  if(kind==='custom motion')j.animation={axis:'z',amplitudeRad:.1,speed:1,phase:0};
  if(kind==='unbound part')delete p.parts[0]!.parent;
  if(kind==='wrong body')p.body.interaction='solid';
  expect(objectDslSchema.safeParse(p).success).toBe(false);
 });
});
describe('articulated locomotion',()=>{
 it('keeps rigid arms over an authored work surface at different headings and holds the pose while paused',()=>{
  for(const heading of [0,Math.PI/2,Math.PI]){
   const r=rig(.306),target=new Vector3(5,9,0).applyAxisAngle(new Vector3(0,1,0),-heading);
   r.group.rotation.y=-heading;
   advance(r,{speed:0,working:true,workTarget:target,travel:{x:0,y:0,z:0,heading}},2);
   r.group.updateMatrixWorld(true);
   for(const [side,sign] of [['left',1],['right',-1]] as const){
    const elbow=r.bone(`${side}_elbow`),hand=new Vector3(0,-9.5*1.05,0).applyMatrix4(elbow.matrixWorld),expected=target.clone().add(new Vector3(0,0,sign*3.5*.306).applyAxisAngle(new Vector3(0,1,0),-heading));
    expect(hand.distanceTo(expected)).toBeLessThan(.25);
    expect(elbow.getWorldPosition(new Vector3()).distanceTo(r.bone(`${side}_shoulder`).getWorldPosition(new Vector3()))).toBeCloseTo(9.5*.306,10);
   }
   const before=r.bone('right_elbow').getWorldQuaternion(r.bone('right_elbow').quaternion.clone());
   r.animation.update({...input,speed:0,time:119/60,working:true,workTarget:target,travel:{x:0,y:0,z:0,heading}},0);r.group.updateMatrixWorld(true);
   expect(r.bone('right_elbow').getWorldQuaternion(before.clone()).angleTo(before)).toBeLessThan(.001);
  }
 });
 it('releases a work target continuously when a batch finishes',()=>{
  const r=rig(.306),target=new Vector3(5,9,0),travel={x:0,y:0,z:0,heading:0};
  advance(r,{speed:0,working:true,workTarget:target,travel},2);r.group.updateMatrixWorld(true);
  const elbow=r.bone('right_elbow'),hand=()=>new Vector3(0,-9.5*1.05,0).applyMatrix4(elbow.matrixWorld);let previous=hand();
  for(let f=0;f<60;f++){r.animation.update({...input,speed:0,time:2+f/60,working:false,travel},1/60);r.group.updateMatrixWorld(true);const p=hand();expect(p.distanceTo(previous)).toBeLessThan(.65);previous=p;}
 });
 it('holds grounded feet through acceleration, curved travel and a stop',()=>{
  const r=rig(.306),previous=new Map<string,Vector3>();let x=0,z=0,maxDrift=0,contacts=0;
  for(let f=0;f<960;f++){
   const t=f/120,speed=t<1 ? t*14 : t<5 ? 14 : 0,heading=Math.min(Math.PI/2,Math.max(0,t-2)*.5);
   x+=Math.cos(heading)*speed/120;z+=Math.sin(heading)*speed/120;
   r.group.position.set(x,0,z);r.group.rotation.y=-heading;
   r.animation.update({...input,speed,time:t,travel:{x,z,heading}},1/120);r.group.updateMatrixWorld(true);
   for(const side of ['left','right']){
    const ankle=r.bone(`${side}_ankle`),flat=new Vector3(0,1,0).applyQuaternion(ankle.getWorldQuaternion(ankle.quaternion.clone())).y>1-1e-12;
    const foot=ankle.getWorldPosition(new Vector3()),old=previous.get(side);
    if(flat && old){maxDrift=Math.max(maxDrift,Math.hypot(foot.x-old.x,foot.z-old.z));contacts++;}
    if(flat)previous.set(side,foot);else previous.delete(side);
   }
  }
  expect(contacts).toBeGreaterThan(200);expect(maxDrift).toBeLessThan(.002);
 });
 it('keeps planted feet through a reversal rather than discarding their contacts',()=>{
  for(const fps of [30,60,144]){
   const r=rig(.306),previous=new Map<string,Vector3>();let x=0,maxDrift=0,contacts=0;
   for(let f=0;f<fps*3;f++){
    const heading=f>fps ? Math.PI : 0;x+=Math.cos(heading)*14/fps;r.group.position.x=x;r.group.rotation.y=-heading;
    r.animation.update({...input,speed:14,time:f/fps,travel:{x,z:0,heading}},1/fps);r.group.updateMatrixWorld(true);
    for(const side of ['left','right']){
     const ankle=r.bone(`${side}_ankle`),flat=new Vector3(0,1,0).applyQuaternion(ankle.getWorldQuaternion(ankle.quaternion.clone())).y>1-1e-12,foot=ankle.getWorldPosition(new Vector3()),old=previous.get(side);
     if(flat && old){maxDrift=Math.max(maxDrift,Math.hypot(foot.x-old.x,foot.z-old.z));contacts++;}
     if(flat)previous.set(side,foot);else previous.delete(side);
    }
   }
   expect(contacts).toBeGreaterThan(40);expect(maxDrift).toBeLessThan(.002);
  }
 });
 it.each([30,60,144])('does not teleport the returning foot during a mid-step reversal at %i fps',fps=>{
  const r=rig(.306),previous=new Map<string,Vector3>();let x=0,maxStep=0;
  for(let f=0;f<fps*4;f++){
   const heading=f/fps>=1.15 ? Math.PI : 0;x+=Math.cos(heading)*14/fps;r.group.position.x=x;r.group.rotation.y=-heading;
   r.animation.update({...input,speed:14,time:f/fps,travel:{x,z:0,heading}},1/fps);r.group.updateMatrixWorld(true);
   expect(r.bone('root').position.y).toBeGreaterThan(16);
   for(const side of ['left','right']){
    const foot=r.bone(`${side}_ankle`).getWorldPosition(new Vector3()),old=previous.get(side);
    if(old)maxStep=Math.max(maxStep,Math.hypot(foot.x-old.x,foot.z-old.z));previous.set(side,foot);
   }
  }
  expect(maxStep*fps).toBeLessThan(69);
 });
 it('takes walking steps in proportion to the resolved human rather than a short shuffle',()=>{
  const strideMeters=gaitStride(0)*.306/10;
  expect(strideMeters).toBeGreaterThan(1.1);expect(strideMeters).toBeLessThan(1.4);
  expect(2*1.4/strideMeters).toBeGreaterThan(2);expect(2*1.4/strideMeters).toBeLessThan(2.6);
 });
 it.each(['reduced motion','seated'])('restarts over the support foot after %s at an arbitrary old phase',mode=>{
  const r=rig(.306),previous=new Map<string,Vector3>();let x=0,maxDrift=0;
  const walk=(time:number)=>{x+=14/60;r.group.position.x=x;r.animation.update({...input,speed:14,time,travel:{x,z:0,heading:0}},1/60);r.group.updateMatrixWorld(true);};
  for(let f=0;f<38;f++)walk(f/60);
  for(let f=0;f<120;f++)r.animation.update({...input,speed:0,time:1+f/60,travel:{x,z:0,heading:0},...(mode==='seated' ? {sittingHeight:18} : {enabled:false})},1/60);
  for(let f=0;f<180;f++){
   walk(3+f/60);
   for(const side of ['left','right']){
    const ankle=r.bone(`${side}_ankle`),flat=new Vector3(0,1,0).applyQuaternion(ankle.getWorldQuaternion(ankle.quaternion.clone())).y>1-1e-12,foot=ankle.getWorldPosition(new Vector3()),old=previous.get(side);
    if(flat && old)maxDrift=Math.max(maxDrift,Math.hypot(foot.x-old.x,foot.z-old.z));
    if(flat)previous.set(side,foot);else previous.delete(side);
   }
  }
  expect(maxDrift).toBeLessThan(.002);
 });
 it('uses observed travel instead of requested speed and preserves planted feet while paused',()=>{
  const r=rig(.306),travel={x:10,z:20,heading:.4};r.group.position.set(10,0,20);r.group.rotation.y=-.4;
  advance(r,{speed:55,travel},2);r.group.updateMatrixWorld(true);
  const foot=r.bone('left_ankle').getWorldPosition(new Vector3()),before=r.bone('left_hip').quaternion.clone();
  r.animation.update({...input,speed:55,travel},0);r.group.updateMatrixWorld(true);
  expect(r.bone('left_hip').quaternion.angleTo(before)).toBeLessThan(1e-6);expect(r.bone('left_ankle').getWorldPosition(new Vector3()).distanceTo(foot)).toBeLessThan(1e-8);
  expect(Math.abs(r.bone('left_hip').rotation.z)).toBeLessThan(.04);
 });
 it('keeps the stance foot on its support plane and lifts the returning foot',()=>{
  for(const run of [0,1]){
   expect(strideFoot(.2,run).y).toBe(0);
   expect(strideFoot(.8,run).y).toBeGreaterThan(1);
   for(let i=0;i<200;i++){
    const f=strideFoot(i/200,run),next=strideFoot((i+1)/200,run);
    expect(Math.hypot(f.x-next.x,f.y-next.y)).toBeLessThan(1.1);
   }
  }
 });
 it.each([.2,.306,1,2])('plants the stance foot in world space at scale %s',scale=>{
  for(const speed of [4,14,35,55,95]){
   const r=rig(scale);advance(r,{speed},3,120);
   const previous=new Map<string,Vector3>();let planted=0,maxDrift=0;
   for(let f=0;f<720;f++){
    r.group.position.x+=speed/120;r.animation.update({...input,speed,time:3+f/120},1/120);r.group.updateMatrixWorld(true);
    for(const side of ['left','right']){
     const ankle=r.bone(`${side}_ankle`),flat=Math.abs(ankle.getWorldQuaternion(ankle.quaternion.clone()).z)<1e-6;
     const foot=ankle.getWorldPosition(new Vector3()),old=previous.get(side);
     if(flat && old){maxDrift=Math.max(maxDrift,foot.distanceTo(old));planted++;}
     if(flat)previous.set(side,foot);else previous.delete(side);
    }
   }
   expect(planted).toBeGreaterThan(100);expect(maxDrift).toBeLessThan(.002);
  }
 });
 it('solves reachable feet without scaling or reversing knees',()=>{
  for(const x of [-9,0,9]){
   const {hip,knee}=solveLeg(x,-19,11.5,10.5);
   expect(knee).toBeLessThan(0);
   expect(11.5*Math.sin(hip)+10.5*Math.sin(hip+knee)).toBeCloseTo(x,8);
   expect(-11.5*Math.cos(hip)-10.5*Math.cos(hip+knee)).toBeCloseTo(-19,8);
  }
 });
 it('has a distinct bent-elbow running pose and settles after stopping',()=>{
  const walk=rig(),run=rig();advance(walk,{speed:14});advance(run,{speed:95});
  expect(run.bone('left_elbow').rotation.z).toBeGreaterThan(walk.bone('left_elbow').rotation.z+.4);
  advance(run,{speed:0});
  expect(Math.abs(run.bone('left_hip').rotation.z)).toBeLessThan(.03);
  expect(run.bone('root').position.y).toBeCloseTo(25,3);
 });
 it('works with planted feet, rigid arms and a reduced-motion rest, then returns to idle',()=>{
  const r=rig(),position=r.bone('left_knee').position.clone();advance(r,{speed:0,working:true});
  expect(r.bone('left_shoulder').rotation.z).toBeGreaterThan(.75);expect(r.bone('right_elbow').rotation.z).toBeGreaterThan(.5);expect(r.bone('left_knee').position).toEqual(position);
  advance(r,{speed:0,working:true,enabled:false});expect(Math.abs(r.bone('left_shoulder').rotation.z)).toBeLessThan(.01);
  advance(r,{speed:0});expect(Math.abs(r.bone('right_shoulder').rotation.z)).toBeLessThan(.01);
 });
 it('raises a hand for a meal without moving the planted feet and respects reduced motion',()=>{
  const r=rig(),ankle=r.bone('right_ankle').position.clone();advance(r,{speed:0,eating:true});
  expect(r.bone('right_elbow').rotation.z).toBeGreaterThan(1.3);expect(r.bone('right_shoulder').rotation.z).toBeGreaterThan(.6);expect(r.bone('right_ankle').position).toEqual(ankle);
  advance(r,{speed:0,eating:true,enabled:false});const rest=rig();advance(rest,{speed:0,enabled:false});expect(r.bone('right_elbow').rotation.z).toBeCloseTo(rest.bone('right_elbow').rotation.z,8);
  advance(r,{speed:0});expect(Math.abs(r.bone('right_shoulder').rotation.z)).toBeLessThan(.01);
 });
 it('keeps segment lengths and all original mesh dimensions through a stride',()=>{
  const r=rig(),scale=r.bone('left_knee').scale.clone();
  for(let f=0;f<120;f++){
   r.animation.update({...input,speed:95,time:f/60},1/60);r.group.updateMatrixWorld(true);
   const a=r.bone('left_hip').getWorldPosition(new Vector3()),b=r.bone('left_knee').getWorldPosition(new Vector3()),c=r.bone('left_ankle').getWorldPosition(new Vector3());
   expect(a.distanceTo(b)).toBeCloseTo(11.5,8);expect(b.distanceTo(c)).toBeCloseTo(10.5,8);
   expect(r.bone('left_knee').scale.equals(scale)).toBe(true);
  }
 });
 it('keeps both soles above the support plane throughout walk and run cycles',()=>{
  const soles=humanoidSoles(spec);
  for(const speed of [14,55,95]){
   const r=rig();
   for(let f=0;f<240;f++){
    r.animation.update({...input,speed,time:f/60},1/60);r.group.updateMatrixWorld(true);
    for(const [i,side] of ['left','right'].entries())for(const x of [soles[i]![0],soles[i]![1]])for(const z of [-3.1,3.1]){
     const corner=new Vector3(x,soles[i]![2],z).applyMatrix4(r.bone(side+'_ankle').matrixWorld);
     expect(corner.y).toBeGreaterThanOrEqual(-.01);
    }
   }
  }
 });
 it('treads upright at rest and alternates a prone crawl while moving',()=>{
  const tread=rig(),swim=rig();advance(tread,{speed:0,swimming:true});advance(swim,{speed:48,swimming:true});
  expect(Math.abs(tread.bone('root').rotation.z)).toBeLessThan(.15);
  expect(swim.bone('root').rotation.z).toBeCloseTo(-Math.PI/2,2);
  expect(swim.bone('left_shoulder').quaternion.angleTo(swim.bone('right_shoulder').quaternion)).toBeGreaterThan(2);
 });
 it('passes a stroke wrap and water transitions without a pose snap',()=>{
  const r=rig();advance(r,{speed:48,swimming:true});
  let previous=r.bone('left_shoulder').quaternion.clone();
  for(let f=0;f<360;f++){
   r.animation.update({...input,speed:f<180?48:55,swimming:f<180,time:f/60},1/60);
   const current=r.bone('left_shoulder').quaternion;
   expect(current.angleTo(previous)).toBeLessThan(.25);previous.copy(current);
  }
 });
 it.each([30,60,144])('keeps the same cadence and pose at %i rendered fps',fps=>{
  const reference=rig(),actual=rig();advance(reference,{speed:95},3,240);advance(actual,{speed:95},3,fps);
  for(const bone of ['root','left_hip','left_knee','left_shoulder'])expect(actual.bone(bone).quaternion.angleTo(reference.bone(bone).quaternion)).toBeLessThan(.1);
 });
 it('freezes while paused and settles reduced motion to an unchanging supported pose',()=>{
  const r=rig();advance(r,{speed:95});const before=r.bone('left_knee').quaternion.clone();r.animation.update(input,0);
  expect(r.bone('left_knee').quaternion.angleTo(before)).toBeLessThan(1e-6);
  r.animation.update({...input,enabled:false},1/60);const still=r.bone('left_knee').quaternion.clone();
  for(let i=0;i<120;i++)r.animation.update({...input,enabled:false,time:i},1/60);
  expect(r.bone('left_knee').quaternion.angleTo(still)).toBeLessThan(1e-6);
 });
 it('retains jump, landing and sport poses, then clears them when reset',()=>{
  const r=rig();advance(r,{grounded:false,verticalSpeed:80});expect(r.bone('left_knee').rotation.z).toBeLessThan(-.8);
  advance(r,{speed:0,sport:{kind:'basketball',possessed:true,charging:true,shotAge:Infinity}});
  expect(r.bone('left_shoulder').rotation.z).toBeGreaterThan(2);
  r.animation.reset();expect(r.bone('left_shoulder').rotation.z).toBeCloseTo(0,8);expect(r.bone('root').position.y).toBe(25);
 });
});


it('fits a seated pelvis above the sitting surface and leaves both soles on the floor in reduced motion',()=>{
 const r=rig();advance(r,{speed:0,sittingHeight:18,enabled:false});r.group.updateMatrixWorld(true);
 expect(r.bone('root').position.y).toBeCloseTo(21);
 for(const side of ['left','right']){const ankle=r.bone(`${side}_ankle`).getWorldPosition(new Vector3());expect(ankle.y).toBeCloseTo(3);expect(ankle.x).toBeGreaterThan(8);}
 const first=r.bone('left_knee').quaternion.toArray();advance(r,{speed:0,sittingHeight:18,enabled:false,eating:true},3);expect(r.bone('left_knee').quaternion.toArray()).toEqual(first);
});

it('extends the striking arm without moving planted feet or changing rigid lengths, and rests for reduced motion',()=>{
 const resting=rig(),hitting=rig();advance(resting,{speed:0});advance(hitting,{speed:0});
 resting.animation.update({...input,speed:0,time:2},1/60);hitting.animation.update({...input,speed:0,time:2,striking:.5},1/60);
 resting.group.updateMatrixWorld(true);hitting.group.updateMatrixWorld(true);
 const at=(r:ReturnType<typeof rig>,bone:string)=>r.bone(bone).getWorldPosition(new Vector3());
 expect(at(hitting,'right_elbow').x).toBeGreaterThan(at(resting,'right_elbow').x+1);
 for(const side of ['left','right'])expect(at(hitting,side+'_ankle').distanceTo(at(resting,side+'_ankle'))).toBeLessThan(1e-8);
 expect(at(hitting,'right_shoulder').distanceTo(at(hitting,'right_elbow'))).toBeCloseTo(at(resting,'right_shoulder').distanceTo(at(resting,'right_elbow')),10);
 const reduced=rig(),idle=rig();reduced.animation.update({...input,speed:0,enabled:false,striking:.5},1/60);idle.animation.update({...input,speed:0,enabled:false},1/60);
 expect(reduced.bone('right_shoulder').quaternion.toArray()).toEqual(idle.bone('right_shoulder').quaternion.toArray());
});
