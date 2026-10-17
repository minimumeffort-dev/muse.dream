import * as THREE from 'three';
import type {Scene,SceneObject} from '../scene/schema';
import type {CarState,ParkedVehicle} from '../sim/car';
import {parkingDefinitions,parkingState} from '../sim/parking';
import {buildObject,animateObject} from './world3d';
import {compactObject} from './compact-object';
import {terrainNormal,worldPosition} from './environment';
import {sceneryMaterial,sceneryDepthMaterial} from './shaders';
import {WorldScenery} from './scenery';
import {disposeChunk} from './chunk-packet';

type Prototype={root:THREE.Group;parts:THREE.Mesh[]};
/** Seeds live in streamed scenery. Only the occupied vehicle needs a CPU animation rig. */
export class WorldParking {
 readonly group=new THREE.Group();
 private active?:{object:SceneObject;root:THREE.Group};
 private prototypes=new Map<string,Prototype>();
 private overlay=new THREE.Group();
 private fades?:WorldScenery;
 private vehicles?:CarState['vehicles'];
 private occupied?:string;
 private revision=-1;
 private reduced=false;
 private hidden:ReadonlySet<string>=new Set();
 constructor(private scene:Scene){this.group.name='parked-vehicles';this.group.add(this.overlay);}
 get stats(){return {active:this.active?.object.id??null,prototypes:this.prototypes.size,instances:this.overlay.children.reduce((n,m)=>n+(m instanceof THREE.InstancedMesh ? m.count : 0),0)};}
 get hiddenSeeds():ReadonlySet<string>{return this.hidden;}
 syncActive(state:CarState,beforeRelease:(object:SceneObject,root:THREE.Group)=>void):THREE.Group|undefined{
  const object=state.control.kind==='vehicle' ? parkingDefinitions(this.scene).byId.get(state.control.id) : undefined;
  if(object?.id===this.active?.object.id)return this.active?.root;
  if(this.active){beforeRelease(this.active.object,this.active.root);disposeChunk(this.active.root);this.active=undefined;}
  if(object){const root=compactObject(buildObject(object));root.userData.sceneObject=object;this.group.add(root);this.active={object,root};}
  return this.active?.root;
 }
 update(state:CarState,residency:{revision:number;contains:(x:number,y:number)=>boolean},camera:THREE.OrthographicCamera,player:THREE.Vector3,dt:number,reduced:boolean):void{
  const occupied=this.active?.object.id;
  if(this.vehicles!==state.vehicles || this.occupied!==occupied || this.revision!==residency.revision || this.reduced!==reduced){
   this.vehicles=state.vehicles;this.occupied=occupied;this.revision=residency.revision;this.reduced=reduced;
   this.hidden=new Set([...parkingState(this.scene,state.vehicles).byId.keys(),...(occupied ? [occupied] : [])]);
   this.rebuild(state,residency,reduced);
  }
  this.fades?.update(camera,player,dt,reduced);
 }
 private rebuild(state:CarState,residency:{contains:(x:number,y:number)=>boolean},reduced:boolean):void{
  disposeChunk(this.overlay);this.overlay=new THREE.Group();this.group.add(this.overlay);
  const entries:{objectId:string;x:number;y:number;min:number[];max:number[]}[]=[],batches=new Map<string,{prototype:Prototype;poses:{object:SceneObject;pose:ParkedVehicle;entry:number}[]}>();
  for(const pose of parkingState(this.scene,state.vehicles).byId.values()){
   if(!residency.contains(pose.x,pose.y))continue;
   const object=parkingDefinitions(this.scene).byId.get(pose.id!)!,key=JSON.stringify(object.spec);
   let prototype=this.prototypes.get(key);
   if(!prototype){
    const root=compactObject(buildObject({...object,scale:1})),parts:THREE.Mesh[]=[];
    root.traverse(node=>{if(!(node instanceof THREE.Mesh))return;
     const geometry=node.geometry,count=geometry.getAttribute('position').count;
     geometry.setAttribute('pivot',new THREE.Float32BufferAttribute(new Float32Array(count*3),3));
     geometry.setAttribute('spinAxis',new THREE.Float32BufferAttribute(new Float32Array(count*3),3));
     const material=node.material as THREE.Material;if(material.userData.streamMaterial?.kind!=='scenery')sceneryMaterial(material);material.userData.streamShared=true;
     if(node.userData.materialStyle==='cloth'){node.customDepthMaterial=sceneryDepthMaterial(undefined,true);node.customDepthMaterial.userData.streamShared=true;}
     parts.push(node);
    });
    prototype={root,parts};this.prototypes.set(key,prototype);
   }
   const entry=entries.length,position=worldPosition(this.scene,pose.x,pose.y);position.y=pose.elevation+1.5;
   entries.push({objectId:object.id,x:position.x,y:position.z,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
   const batch=batches.get(key)??{prototype,poses:[]};batch.poses.push({object,pose,entry});batches.set(key,batch);
  }
  for(const [key,prototype] of this.prototypes)if(!batches.has(key)){this.disposePrototype(prototype);this.prototypes.delete(key);}
  for(const {prototype,poses} of batches.values()){
   const meshes=prototype.parts.map(part=>{
    const geometry=new THREE.BufferGeometry();for(const [name,attribute] of Object.entries(part.geometry.attributes))geometry.setAttribute(name,attribute);geometry.setIndex(part.geometry.index);
    geometry.setAttribute('visibility',new THREE.InstancedBufferAttribute(new Float32Array(poses.length).fill(1),1).setUsage(THREE.DynamicDrawUsage));
    const mesh=new THREE.InstancedMesh(geometry,part.material,poses.length);mesh.castShadow=mesh.receiveShadow=true;mesh.customDepthMaterial=part.customDepthMaterial;mesh.userData.sceneryEntries=poses.map(p=>p.entry);this.overlay.add(mesh);return mesh;
   });
   poses.forEach(({object,pose,entry},i)=>{
    animateObject(prototype.root,0,reduced ? false : 'roll',pose.distance/object.scale);prototype.root.updateMatrixWorld(true);
    const normal=terrainNormal(this.scene,pose.x,pose.y);
    const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-pose.headingRad));
    const position=worldPosition(this.scene,pose.x,pose.y);position.y=pose.elevation+1.5;
    const transform=new THREE.Matrix4().compose(position,rotation,new THREE.Vector3().setScalar(object.scale)),box=new THREE.Box3();
    prototype.parts.forEach((part,j)=>{const matrix=transform.clone().multiply(part.matrixWorld);meshes[j]!.setMatrixAt(i,matrix);part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox!.clone().applyMatrix4(matrix));});
    entries[entry]!.min=box.min.toArray();entries[entry]!.max=box.max.toArray();
   });
   meshes.forEach(mesh=>mesh.computeBoundingSphere());
  }
  this.fades=WorldScenery.fromChunk(this.scene,this.overlay,entries);
 }
 private disposePrototype(prototype:Prototype):void{
  const materials=new Set<THREE.Material>();prototype.root.traverse(node=>{if(node instanceof THREE.Mesh){for(const m of Array.isArray(node.material) ? node.material : [node.material])materials.add(m);if(node.customDepthMaterial)materials.add(node.customDepthMaterial);}});
  disposeChunk(prototype.root);materials.forEach(m=>m.dispose());
 }
 dispose(beforeRelease:(object:SceneObject,root:THREE.Group)=>void):void{
  if(this.active){beforeRelease(this.active.object,this.active.root);disposeChunk(this.active.root);this.active=undefined;}
  disposeChunk(this.overlay);this.prototypes.forEach(p=>this.disposePrototype(p));this.prototypes.clear();this.group.removeFromParent();
 }
}
