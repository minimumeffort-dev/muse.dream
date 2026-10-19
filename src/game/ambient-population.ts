import {characterGround} from './character-ground';
import {indexedGeometry} from './indexed-geometry';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {Scene,SceneObject} from '../scene/schema';
import type {ObjectDslV2} from '../scene/object-dsl';
import type {CarState} from '../sim/car';
import {ambientObjects,ambientPose,initialAmbient} from '../sim/ambient';
import {assemblyBounds,assemblyHorizontalRadius} from '../scene/measure';
import {walkingHeight} from '../scene/interiors';
import {buildObject,objectGroundLift} from './world3d';
import {ambientMaterial} from './shaders';
import {FootPlants,gaitStance,gaitStride,gaitPlantReach,humanoidFeet,strideFoot,type Sole} from './humanoid-gait';
import {finishBuild} from './batching';

/** Bone-local vertices retain rigid parts and filtered material coordinates; no mesh or joint per member. */
export function ambientPrototype(object:SceneObject,joints=object.ambient?.joints??(object.spec as ObjectDslV2).joints!):THREE.Group{
 const source=buildObject({...object,scale:1}),index=new Map(joints.map((j,i)=>[j.id,i+1])),batches=new Map<string,{geometry:THREE.BufferGeometry[];material:THREE.Material}>();
 source.updateMatrixWorld(true);
 source.traverse(node=>{if(!(node instanceof THREE.Mesh))return;
  let parent:THREE.Object3D|null=node.parent;while(parent && !index.has(parent.name))parent=parent.parent;
  const bone=parent ? index.get(parent.name)! : 0,matrix=parent ? new THREE.Matrix4().copy(parent.matrixWorld).invert().multiply(node.matrixWorld) : node.matrixWorld;
  const geometry=(node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone()).applyMatrix4(matrix);
  geometry.setAttribute('popBone',new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count).fill(bone),1));
  const key=node.userData.materialKey??(node.material as THREE.Material).uuid,batch=batches.get(key)??{geometry:[],material:node.material as THREE.Material};batch.geometry.push(geometry);batches.set(key,batch);
 });
 const group=new THREE.Group();
 for(const batch of batches.values()){const geometry=mergeGeometries(batch.geometry,false);if(!geometry)throw Error('ambient assembly could not be combined');group.add(new THREE.Mesh(indexedGeometry(geometry),batch.material));batch.geometry.forEach(g=>g.dispose());}
 source.traverse(node=>{if(node instanceof THREE.Mesh)node.geometry.dispose();});return group;
}
type Batch={indices:number[];meshes:THREE.InstancedMesh[];radius:number;soleRadius:number;meters:number;stridePeriod?:number;stride:number;lift:number;unit:number;hips:number[];reaches:number[];planted:boolean};
export class AmbientPopulation {
 readonly group=new THREE.Group();
 readonly count:number;
 private objects:SceneObject[];
 private supportRadii:number[];
 private batches:Batch[]=[];
 private matrix=new THREE.Matrix4();private rotation=new THREE.Quaternion();private position=new THREE.Vector3();private scale=new THREE.Vector3();private sphere=new THREE.Sphere();
 private view=new THREE.Frustum();private shadow=new THREE.Frustum();private projection=new THREE.Matrix4();private up=new THREE.Vector3(0,1,0);
 private amounts:Float32Array;
 private walkingStarts:Float64Array;
 private plants:FootPlants[];
 private tick=0;
 private ground:ReturnType<typeof characterGround>;
 constructor(private scene:Scene,deferBuild=false){
  this.ground=characterGround(scene);this.objects=ambientObjects(scene);this.supportRadii=this.objects.map(o=>assemblyHorizontalRadius(o.spec as ObjectDslV2,o.scale));this.count=this.objects.length;this.amounts=new Float32Array(this.count);this.walkingStarts=new Float64Array(this.count).fill(NaN);this.plants=this.objects.map(()=>new FootPlants(.05));this.group.name='ambient-populations';
  if(!deferBuild)finishBuild(this.assemble());
 }
 static *buildSteps(scene:Scene):Generator<void,AmbientPopulation>{const population=new AmbientPopulation(scene,true);yield* population.assemble();return population;}
 private *assemble():Generator<void>{
  const groups=new Map<string,number[]>();for(const [i,o] of this.objects.entries()){const key=JSON.stringify([o.spec,o.ambient!.joints]);const list=groups.get(key)??[];list.push(i);groups.set(key,list);}
  for(const indices of groups.values()){
   yield;
   const o=this.objects[indices[0]!]!,spec=o.spec as ObjectDslV2,prototype=ambientPrototype(o),bounds=assemblyBounds(spec),radius=bounds.getSize(new THREE.Vector3()).length()*Math.max(...indices.map(i=>this.objects[i]!.scale))+8,meshes:THREE.InstancedMesh[]=[],feet=humanoidFeet(spec,o.ambient!.joints),soles=feet.map(f=>f.sole) as [Sole,Sole];
   const strideLengths=new Set(o.ambient!.joints.flatMap(j=>j.animation && 'kind' in j.animation && j.animation.kind==='stride' ? [j.animation.strideLength] : [])),stridePeriod=strideLengths.size===1 ? [...strideLengths][0] : undefined;
   const planted=o.ambient!.motion.kind==='walk',unit=(o.ambient!.joints.find(j=>j.bone==='root')?.position[1]??25)/25,hips=['left','right'].map(side=>o.ambient!.joints.find(j=>j.bone===`${side}_hip`)?.position[2]??0);
   const reaches=['left','right'].map(side=>gaitPlantReach(-(o.ambient!.joints.find(j=>j.bone===`${side}_knee`)?.position[1]??-11.5),-(o.ambient!.joints.find(j=>j.bone===`${side}_ankle`)?.position[1]??-10.5)));
   for(const child of prototype.children){const source=child as THREE.Mesh,geometry=source.geometry as THREE.BufferGeometry;const channels=planted ? 4 : 3;geometry.setAttribute('popCycle',new THREE.InstancedBufferAttribute(new Float32Array(indices.length*channels),channels).setUsage(THREE.DynamicDrawUsage));
    if(planted){for(const name of ['popPlant','popFacing','popLift'])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(indices.length*4),4).setUsage(THREE.DynamicDrawUsage));}
    const mesh=new THREE.InstancedMesh(geometry,ambientMaterial(source.material as THREE.Material,o.ambient!.joints,false,false,soles,planted),indices.length);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.customDepthMaterial=ambientMaterial(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),o.ambient!.joints,true,false,soles,planted);this.group.add(mesh);meshes.push(mesh);
   }
   this.batches.push({indices,meshes,radius,soleRadius:Math.max(...feet.map(f=>f.radius)),lift:objectGroundLift(o),meters:spec.measure?.meters??1,stridePeriod,stride:gaitStride(0)*unit,unit,hips,reaches,planted});
  }
 }
 update(state:CarState,camera:THREE.Camera,light:THREE.DirectionalLight,dt:number,reduced=false){
  const population=state.population??initialAmbient(this.scene);if(population.tick<this.tick){this.amounts.fill(0);this.walkingStarts.fill(NaN);this.plants.forEach(p=>p.reset());}this.tick=population.tick;
  this.view.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  this.shadow.setFromProjectionMatrix(this.projection.multiplyMatrices(light.shadow.camera.projectionMatrix,light.shadow.camera.matrixWorldInverse));
  for(const batch of this.batches){let count=0;
   for(const i of batch.indices){const object=this.objects[i]!,p=ambientPose(population,i,state.timeS),motion=object.ambient!.motion;
    this.amounts[i]!+=(Number(p.speed>.01)-this.amounts[i]!)*(1-Math.exp(-dt*12));const amount=reduced ? 0 : this.amounts[i]!;
    // Start a restored walker over its support foot, rather than holding an arbitrary long half-step from rest.
    if(batch.planted && !Number.isFinite(this.walkingStarts[i]))this.walkingStarts[i]=p.distance;
    const phase=batch.planted ? gaitStance(0)/2+(p.distance-this.walkingStarts[i]!)/(batch.stride*object.scale) : p.distance/(batch.stridePeriod ? batch.stridePeriod*object.scale : batch.meters*6),hop=motion.kind==='roam' && motion.gait==='hop' ? Math.max(0,Math.sin(phase*Math.PI*2))*Math.min(4,batch.meters*5)*amount : 0;
    const floor=walkingHeight(this.scene,p.x,p.y,this.supportRadii[i]!)+batch.lift;
    let feet:ReturnType<FootPlants['sample']>[]|undefined;
    if(batch.planted){const plants=this.plants[i]!,pose={x:p.x,y:floor,z:p.y,heading:p.heading};if(reduced)plants.reset();plants.begin(pose,object.scale*batch.unit,dt,this.ground,batch.soleRadius*object.scale);
     feet=[0,1].map(side=>{const f=strideFoot(phase+side*.5,0);return plants.sample(side,pose,object.scale,f.x*batch.unit*amount,batch.hips[side]!,f.y===0 || amount<.001,Math.floor(phase+side*.5),batch.unit,batch.reaches[side]!);});
    }
    this.position.set(p.x-this.scene.canonical.width/2,(reduced && batch.planted ? this.ground(p.x,p.y,floor,batch.soleRadius*object.scale).height : floor)+hop,p.y-this.scene.canonical.height/2);
    this.sphere.set(this.position,batch.radius);if(!this.view.intersectsSphere(this.sphere) && !this.shadow.intersectsSphere(this.sphere))continue;
    this.rotation.setFromAxisAngle(this.up,-p.heading);this.scale.setScalar(object.scale);this.matrix.compose(this.position,this.rotation,this.scale);
    for(const mesh of batch.meshes){mesh.setMatrixAt(count,this.matrix);
     // Bound humanoids do not use the animal clock; pack ground planes without another vertex attribute.
     if(feet){(mesh.geometry.getAttribute('popCycle') as THREE.InstancedBufferAttribute).setXYZW(count,feet[0]!.slopeX,phase,amount,feet[1]!.slopeZ);(mesh.geometry.getAttribute('popPlant') as THREE.InstancedBufferAttribute).setXYZW(count,feet[0]!.x,feet[0]!.z-batch.hips[0]!,feet[1]!.x,feet[1]!.z-batch.hips[1]!);(mesh.geometry.getAttribute('popFacing') as THREE.InstancedBufferAttribute).setXYZW(count,feet[0]!.yaw,feet[1]!.yaw,feet[1]!.slopeX,feet[0]!.slopeZ);(mesh.geometry.getAttribute('popLift') as THREE.InstancedBufferAttribute).setXYZW(count,feet[0]!.lift,feet[1]!.lift,feet[0]!.rise,feet[1]!.rise);}
     // Wrap a shared cycle before float32 upload; saved travel stays untouched.
     else (mesh.geometry.getAttribute('popCycle') as THREE.InstancedBufferAttribute).setXYZ(count,batch.stridePeriod ? (p.distance/object.scale)%batch.stridePeriod : p.distance/object.scale,p.distance/(batch.meters*6*.6),amount);
    }count++;
   }
   for(const mesh of batch.meshes){mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;for(const channel of batch.planted ? ['popCycle','popPlant','popFacing','popLift'] : ['popCycle'])(mesh.geometry.getAttribute(channel) as THREE.InstancedBufferAttribute).needsUpdate=true;}
  }
 }
}
