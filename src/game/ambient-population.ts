import {indexedGeometry} from './indexed-geometry';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {Scene,SceneObject} from '../scene/schema';
import type {ObjectDslV2} from '../scene/object-dsl';
import type {CarState} from '../sim/car';
import {ambientObjects,ambientPose,initialAmbient} from '../sim/ambient';
import {assemblyBounds} from '../scene/measure';
import {drivingHeight} from '../scene/terrain';
import {buildObject} from './world3d';
import {ambientMaterial} from './shaders';

/** Bone-local vertices retain rigid parts and filtered material coordinates; no mesh or joint per member. */
export function ambientPrototype(object:SceneObject):THREE.Group{
 const source=buildObject({...object,scale:1}),joints=object.ambient!.joints,index=new Map(joints.map((j,i)=>[j.id,i+1])),batches=new Map<string,{geometry:THREE.BufferGeometry[];material:THREE.Material}>();
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
type Batch={indices:number[];meshes:THREE.InstancedMesh[];radius:number;meters:number;stride:number};
export class AmbientPopulation {
 readonly group=new THREE.Group();
 readonly count:number;
 private objects:SceneObject[];
 private batches:Batch[]=[];
 private matrix=new THREE.Matrix4();private rotation=new THREE.Quaternion();private position=new THREE.Vector3();private scale=new THREE.Vector3();private sphere=new THREE.Sphere();
 private view=new THREE.Frustum();private shadow=new THREE.Frustum();private projection=new THREE.Matrix4();private up=new THREE.Vector3(0,1,0);
 private amounts:Float32Array;
 private tick=0;
 constructor(private scene:Scene){
  this.objects=ambientObjects(scene);this.count=this.objects.length;this.amounts=new Float32Array(this.count);this.group.name='ambient-populations';
  const groups=new Map<string,number[]>();for(const [i,o] of this.objects.entries()){const key=JSON.stringify([o.spec,o.ambient!.joints]);const list=groups.get(key)??[];list.push(i);groups.set(key,list);}
  for(const indices of groups.values()){
   const o=this.objects[indices[0]!]!,spec=o.spec as ObjectDslV2,prototype=ambientPrototype(o),bounds=assemblyBounds(spec),radius=bounds.getSize(new THREE.Vector3()).length()*Math.max(...indices.map(i=>this.objects[i]!.scale))+8,meshes:THREE.InstancedMesh[]=[];
   for(const child of prototype.children){const source=child as THREE.Mesh,geometry=source.geometry as THREE.BufferGeometry;geometry.setAttribute('popCycle',new THREE.InstancedBufferAttribute(new Float32Array(indices.length*3),3).setUsage(THREE.DynamicDrawUsage));
    const mesh=new THREE.InstancedMesh(geometry,ambientMaterial(source.material as THREE.Material,o.ambient!.joints),indices.length);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.customDepthMaterial=ambientMaterial(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),o.ambient!.joints,true);this.group.add(mesh);meshes.push(mesh);
   }
   this.batches.push({indices,meshes,radius,meters:spec.measure?.meters??1,stride:13.6*(o.ambient!.joints.find(j=>j.bone==='root')?.position[1]??25)/25/.62});
  }
 }
 update(state:CarState,camera:THREE.Camera,light:THREE.DirectionalLight,dt:number,reduced=false){
  const population=state.population??initialAmbient(this.scene);if(population.tick<this.tick)this.amounts.fill(0);this.tick=population.tick;
  this.view.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  this.shadow.setFromProjectionMatrix(this.projection.multiplyMatrices(light.shadow.camera.projectionMatrix,light.shadow.camera.matrixWorldInverse));
  for(const batch of this.batches){let count=0;
   for(const i of batch.indices){const object=this.objects[i]!,p=ambientPose(population,i,state.timeS),motion=object.ambient!.motion;
    this.amounts[i]!+=(Number(p.speed>.01)-this.amounts[i]!)*(1-Math.exp(-dt*12));const amount=reduced ? 0 : this.amounts[i]!;
    const phase=p.distance/(motion.kind==='walk' ? batch.stride*object.scale : batch.meters*6),hop=motion.kind==='roam' && motion.gait==='hop' ? Math.max(0,Math.sin(phase*Math.PI*2))*Math.min(4,batch.meters*5)*amount : 0;
    this.position.set(p.x-this.scene.canonical.width/2,drivingHeight(this.scene.terrain,p.x,p.y)+1.5+hop,p.y-this.scene.canonical.height/2);
    this.sphere.set(this.position,batch.radius);if(!this.view.intersectsSphere(this.sphere) && !this.shadow.intersectsSphere(this.sphere))continue;
    this.rotation.setFromAxisAngle(this.up,-p.heading);this.scale.setScalar(object.scale);this.matrix.compose(this.position,this.rotation,this.scale);
    for(const mesh of batch.meshes){mesh.setMatrixAt(count,this.matrix);(mesh.geometry.getAttribute('popCycle') as THREE.InstancedBufferAttribute).setXYZ(count,p.distance/(batch.meters*6*.6),phase,amount);}count++;
   }
   for(const mesh of batch.meshes){mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;(mesh.geometry.getAttribute('popCycle') as THREE.InstancedBufferAttribute).needsUpdate=true;}
  }
 }
}
