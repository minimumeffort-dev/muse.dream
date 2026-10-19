import {it,expect} from 'vitest';
import {DirectionalLight,InstancedMesh,Matrix4,MeshBasicMaterial,MeshDepthMaterial,OrthographicCamera} from 'three';
import {compileDream,checkDream,formatDream} from '../src/scene/dream';
import {buildObject,animateObject,objectGroundLift} from '../src/game/world3d';
import {ambientMaterial} from '../src/game/shaders';
import {ambientData} from '../src/scene/ambient';
import {measuredScale} from '../src/scene/measure';
import {createFixtureScene} from '../src/scene/fixture';
import {parseScene} from '../src/scene/schema';
import {restingTemplate} from '../src/scene/population';
import {createCarAtSpawn} from '../src/sim/car';
import {AmbientPopulation} from '../src/game/ambient-population';
import source from '../docs/examples/joint-stride.dream?raw';
const spec=compileDream(source)[0]!,rig=spec.joints!,hip=rig[0]!,knee=rig[1]!,glance=rig[2]!,scale=measuredScale(spec);
const make=()=>buildObject({id:'limb',labelText:spec.displayName,kind:'custom',x:0,y:0,scale,spec});
it('compiles bounded distance-driven joints and preserves canonical source',()=>{
 expect(compileDream(formatDream(source))).toEqual([spec]);const scaled=compileDream(source.replace(' joint hip(',' group pace(scale=2){\n joint hip(').replace(' joint glance(',' }\n joint glance('))[0]!;expect(scaled.joints![0]!.animation).toMatchObject({kind:'stride',strideLength:40});expect(hip.animation).toMatchObject({kind:'stride',axis:'z',strideLength:20,phase:0});expect('amplitudeRad' in hip.animation! && hip.animation.amplitudeRad).toBeCloseTo(24*Math.PI/180,12);
 for(const patch of [source.replace('length=20','length=0'),source.replace('length=20','length=129'),source.replace('deg=24','deg=90'),source.replace('phase_deg=0','phase_deg=181'),source.replace('axis=z','axis=q')])expect(checkDream(patch).ok).toBe(false);
 expect(checkDream(source.replace('part body(shape=icosphere,','part body(motion=stride(axis=z,deg=24,length=20,phase_deg=0),shape=icosphere,')).ok).toBe(false);
});
it('paces a rigid limb by local travel and resolved scale, independently of time',()=>{
 const group=make(),angle=(id:string)=>group.getObjectByName(id)!.rotation.z;
 animateObject(group,0,true,5*scale);expect(angle(hip.id)).toBeCloseTo(24*Math.PI/180,8);expect(angle(knee.id)).toBeCloseTo(9.6*Math.PI/180,8);
 const before=group.getObjectByName(hip.id)!.quaternion.clone();animateObject(group,11,true,5*scale);expect(group.getObjectByName(hip.id)!.quaternion.toArray()).toEqual(before.toArray());expect(group.getObjectByName(glance.id)!.rotation.y).not.toBe(0);
 animateObject(group,11,true,20*scale);expect(angle(hip.id)).toBeCloseTo(0,8);group.scale.setScalar(scale*2);animateObject(group,11,true,10*scale);expect(angle(hip.id)).toBeCloseTo(24*Math.PI/180,8);
 animateObject(group,11,false,10*scale);expect(angle(hip.id)).toBeCloseTo(0,8);animateObject(group,11,'roll',10*scale);expect(angle(hip.id)).toBeCloseTo(0,8);
});
it('keeps distance and timed swing clocks identical in instanced color and shadow passes',()=>{
 expect(ambientData(spec,{kind:'roam',radius:80,speed:4,alert:70,fleeSpeed:24,recoverS:3,gait:'walk'}).joints).toEqual(rig);
 const shaders=[new MeshBasicMaterial(),new MeshDepthMaterial()].map((material,i)=>{const shaded=ambientMaterial(material,rig,!!i),shader={uniforms:{},vertexShader:'#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:''} as any;shaded.onBeforeCompile(shader,{} as any);return shader;});
 for(const s of shaders){expect(s.uniforms.popDistance.value.slice(0,4)).toEqual([0,1,1,0]);expect(s.uniforms.popRate.value[1]).toBeCloseTo(Math.PI/10,8);expect(s.uniforms.popRate.value[3]).toBeCloseTo(Math.PI*.4,8);expect(s.vertexShader).toContain('popDistance[j]>.5 ? popCycle.x : popCycle.y');}
 expect(shaders[0].uniforms.popSwing.value).toEqual(shaders[1].uniforms.popSwing.value);
});

it('wraps a shared stride before float32 upload and synchronizes the existing hop without changing saved travel',()=>{
 const scene=parseScene({...createFixtureScene(),regions:[],routes:[],terrain:{hills:[]},objects:[{id:'limb',kind:'custom',labelText:spec.displayName,x:480,y:360,scale,role:'ambient',spec:restingTemplate(spec),ambient:ambientData(spec,{kind:'roam',radius:80,speed:4,alert:70,fleeSpeed:24,recoverS:3,gait:'hop'})}]}),state=createCarAtSpawn(scene),member=state.population!.members[0]!;
 member.distance=member.fromDistance=(20*1000000+5)*scale;member.speed=4;const snapshot=JSON.stringify(state),population=new AmbientPopulation(scene),camera=new OrthographicCamera(-1000,1000,1000,-1000,.1,3000),sun=new DirectionalLight();camera.position.set(0,300,500);camera.lookAt(0,0,0);camera.updateMatrixWorld();sun.shadow.camera.updateProjectionMatrix();sun.shadow.camera.updateMatrixWorld();
 population.update(state,camera,sun,.1);const mesh=population.group.children[0] as InstancedMesh,cycle=mesh.geometry.getAttribute('popCycle'),matrix=new Matrix4();mesh.getMatrixAt(0,matrix);
 expect(cycle.itemSize).toBe(3);expect(cycle.getX(0)).toBeCloseTo(5,6);expect(cycle.getY(0)).toBe(Math.fround(member.distance/(spec.measure!.meters*6*.6)));expect(matrix.elements[13]).toBeCloseTo(objectGroundLift(scene.objects[0]!)+3.5*(1-Math.exp(-1.2)),5);expect(JSON.stringify(state)).toBe(snapshot);
 population.update(state,camera,sun,.1,true);mesh.getMatrixAt(0,matrix);expect(matrix.elements[13]).toBeCloseTo(objectGroundLift(scene.objects[0]!),6);expect(JSON.stringify(state)).toBe(snapshot);
});
