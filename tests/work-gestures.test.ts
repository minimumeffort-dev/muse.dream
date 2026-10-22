import {it,expect} from 'vitest';
import {Vector3} from 'three';
import source from '../docs/examples/work-gestures.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {dreamAgentContext} from '../src/scene/dream-agent';
import {workGestureSchema,sampleWorkGesture} from '../src/scene/work-gestures';
import {CharacterAnimator,type CharacterInput} from '../src/game/character-animation';
import {buildObject} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import {workstations} from '../src/scene/workstations';
import {createCarAtSpawn,type CarState} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
const scene=compileDreamScene(source,{sceneId:'gesture-example',revisionId:'test',sourceHash:'gesture-example'}),[kneading,folding]=scene.economy!.gestures!;
it('accepts a runnable complete example, canonical formatting and scoped model vocabulary',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(scene.economy!.jobs.map(j=>j.gesture)).toEqual(['kneading','folding']);
 const context=JSON.stringify(dreamAgentContext(['commerce']));expect(context).toContain('gesture');expect(context).toContain('cycle_s');expect(context).toContain('left');
 for(const [from,to] of [['gesture=kneading','gesture=missing'],['station=preparation,gesture=kneading','gesture=kneading'],['cycle_s=1.15','cycle_s=.1'],['key(t=0,left=','key(t=0,script="no",left=']])expect(checkDream(source.replace(from!,to!)).ok,to).toBe(false);
});
it.each(['empty','one key','too many','unclosed','unsorted','gap','crossed','fast','nonfinite','duplicate'])('rejects %s motion data at acceptance',kind=>{
 const g=structuredClone(kneading!);
 if(kind==='empty')g.keys=[];if(kind==='one key')g.keys.length=1;if(kind==='too many')g.keys.push(...structuredClone(g.keys));
 if(kind==='unclosed')g.keys.at(-1)!.left[0]+=.1;if(kind==='unsorted')g.keys[1]!.t=-.1;if(kind==='gap')g.keys[1]!.t=.05;
 if(kind==='crossed')g.keys[1]!.left[2]=-.6;if(kind==='fast')g.cycle_s=.6;if(kind==='nonfinite')g.keys[1]!.left[0]=Infinity;
 if(kind==='duplicate')g.keys[1]!.t=0;
 expect(workGestureSchema.safeParse(g).success).toBe(false);
});
it('rejects duplicate/excess programs',()=>{
 const block=source.slice(source.indexOf('gesture kneading('),source.indexOf('gesture folding('));
 expect(checkDream(source.replace('economy(){','economy(){'+block)).ok).toBe(false);
 const extra=Array.from({length:7},(_,i)=>block.replace('gesture kneading(',`gesture other_${i}(`)).join('');
 expect(checkDream(source.replace('economy(){','economy(){'+extra)).ok).toBe(false);
});
it('interpolates within each segment, closes without a velocity jump and derives phase from elapsed work time',()=>{
 const l=new Vector3(),r=new Vector3(),a=new Vector3(),b=new Vector3();
 for(let i=0;i<=500;i++){const t=i/500;kneading!.keys.forEach(k=>expect(k.left.every(Number.isFinite)).toBe(true));sampleWorkGesture(kneading!,t*kneading!.cycle_s,l,r);expect(l.x).toBeGreaterThanOrEqual(-.8);expect(l.x).toBeLessThanOrEqual(.65);expect(l.z).toBeGreaterThanOrEqual(1);expect(r.z).toBeLessThanOrEqual(-1);}
 sampleWorkGesture(kneading!,0,l,r);sampleWorkGesture(kneading!,kneading!.cycle_s,a,b);expect(a).toEqual(l);expect(b).toEqual(r);
 sampleWorkGesture(kneading!,kneading!.cycle_s-1e-5,a,b);expect(a.distanceTo(l)).toBeLessThan(1e-7);
 sampleWorkGesture(kneading!,123.456,l,r);sampleWorkGesture(kneading!,123.456+1000*kneading!.cycle_s,a,b);expect(a.distanceTo(l)).toBeLessThan(1e-10);
 sampleWorkGesture(folding!,0,a,b);expect(a.distanceTo(l)).toBeGreaterThan(1);
});
it('keeps the same economic transitions when gesture metadata is omitted',()=>{
 const point=workstations(scene)[0]!,old={...scene,economy:{...scene.economy!,gestures:undefined,jobs:scene.economy!.jobs.map(j=>({...j,gesture:undefined}))}};
 let a:CarState={...createCarAtSpawn(scene),control:{kind:'foot'},x:point.x,y:point.y,elevation:point.elevation},b=structuredClone(a);
 for(let i=0;i<16;i++){const action=i===0 ? {commerce:{kind:'work' as const,job:'bake'}} : {};a=stepCommerce({...a,timeS:a.timeS+.25},action,.25,scene);b=stepCommerce({...b,timeS:b.timeS+.25},action,.25,old);expect(a).toEqual(b);}
 expect(a.economy!.accounts[0]!.credits).toBe(23);checkEconomyState(a,scene);
});
it.each([0,Math.PI/2,Math.PI])('follows authored targets with rigid arms and planted feet at heading %s',heading=>{
 const object=scene.objects.find(o=>o.id==='neighbor')!,spec=object.spec!,scale=object.scale,group=compactObject(buildObject({...object,x:0,y:0}));group.position.set(0,0,0);group.rotation.y=-heading;
 if(!('dslVersion' in spec) || spec.dslVersion!==2)throw Error('Example requires a Dream 2 humanoid');
 const animation=new CharacterAnimator(group,spec),bone=(name:string)=>group.getObjectByName(spec.joints!.find(j=>j.bone===name)!.id)!,target=new Vector3(5,9,0).applyAxisAngle(new Vector3(0,1,0),-heading);
 const state:CharacterInput={speed:0,grounded:true,swimming:false,verticalSpeed:0,time:0,enabled:true,working:true,travel:{x:0,y:0,z:0,heading},workTarget:target,workGesture:{program:kneading!,elapsedS:0}};
 for(let i=0;i<120;i++)animation.update({...state,time:i/60},1/60);group.updateMatrixWorld(true);const feet=['left','right'].map(side=>bone(side+'_ankle').getWorldPosition(new Vector3()));
 let previous=new Vector3();for(let f=0;f<120;f++){
  const elapsed=f/60;animation.update({...state,time:2+elapsed,workGesture:{program:kneading!,elapsedS:elapsed}},1/60);group.updateMatrixWorld(true);
  for(const side of ['left','right']){const shoulder=bone(side+'_shoulder'),elbow=bone(side+'_elbow'),hand=new Vector3(0,-9.5*1.05,0).applyMatrix4(elbow.matrixWorld);expect(elbow.getWorldPosition(new Vector3()).distanceTo(shoulder.getWorldPosition(new Vector3()))).toBeCloseTo(9.5*scale,8);const l=new Vector3(),r=new Vector3();sampleWorkGesture(kneading!,elapsed,l,r);const expected=target.clone().add((side==='left' ? l : r).applyAxisAngle(new Vector3(0,1,0),-heading));expect(hand.distanceTo(expected)).toBeLessThan(.6);if(side==='right'){if(f)expect(hand.distanceTo(previous)).toBeLessThan(.5);previous=hand;}}
  ['left','right'].forEach((side,i)=>expect(bone(side+'_ankle').getWorldPosition(new Vector3()).distanceTo(feet[i]!)).toBeLessThan(.03));
 }
 const paused=bone('right_elbow').getWorldQuaternion(bone('right_elbow').quaternion.clone());animation.update({...state,time:4,workGesture:{program:folding!,elapsedS:5}},0);group.updateMatrixWorld(true);expect(bone('right_elbow').getWorldQuaternion(paused.clone()).angleTo(paused)).toBeLessThan(.001);
 for(let f=0;f<60;f++){animation.update({...state,time:4+f/60,working:false,workTarget:undefined,workGesture:undefined},1/60);group.updateMatrixWorld(true);const hand=new Vector3(0,-9.5*1.05,0).applyMatrix4(bone('right_elbow').matrixWorld);expect(hand.distanceTo(previous)).toBeLessThan(.8);previous=hand;}
 animation.update({...state,enabled:false},1/60);const rest=bone('right_elbow').quaternion.clone();animation.update({...state,time:99,enabled:false,workGesture:{program:folding!,elapsedS:99}},1/60);expect(bone('right_elbow').quaternion.angleTo(rest)).toBeLessThan(1e-8);
});
