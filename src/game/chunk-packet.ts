import * as THREE from 'three';
import type {ObjectMaterial,ObjectPart} from '../scene/object-dsl';
import type {Effect} from '../scene/schema';
import {groundMaterial,roadMaterial,toonMaterial,zoneMaterial,styledMaterial,nightPaint,sceneryMaterial,sceneryDepthMaterial} from './shaders';

type MaterialRecipe=({kind:'ground'}|{kind:'road'}|{kind:'toon';color:number}|{kind:'zone';effect:Effect}|{kind:'water';id:string}|{kind:'styled';spec:ObjectMaterial;useB?:boolean}|{kind:'scenery';base:MaterialRecipe;motion?:ObjectPart['animation']}|{kind:'scenery-depth';motion?:ObjectPart['animation'];cloth:boolean}) & {vertexColors?:boolean;paintColor?:number;nightPaint?:boolean};
type Attribute={array:THREE.TypedArray;size:number;normalized:boolean;instanced?:number};
type GeometryPacket={attributes:Record<string,Attribute>;index?:Attribute};
type MeshPacket={geometry:number;material:number;matrix:number[];name:string;cast:boolean;receive:boolean;order:number;depth?:number;sceneryEntries?:number[];instances?:Float32Array;colors?:Float32Array};
export type ChunkPacket={occlusion?:{x:number;y:number;min:number[];max:number[]}[];geometries:GeometryPacket[];materials:(MaterialRecipe & {vertexColors?:boolean})[];meshes:MeshPacket[]};

/** Only engine-owned factories cross the worker boundary, never serialized shader code. */
export function packChunk(root:THREE.Group):{packet:ChunkPacket;transfer:ArrayBuffer[]}{
  const packet:ChunkPacket={occlusion:root.userData.occlusion,geometries:[],materials:[],meshes:[]},geometries=new Map<THREE.BufferGeometry,number>(),materials=new Map<THREE.Material,number>(),buffers=new Set<ArrayBuffer>();
  const attribute=(a:THREE.BufferAttribute|THREE.InterleavedBufferAttribute):Attribute=>{
    if(a instanceof THREE.InterleavedBufferAttribute)throw Error('streamed geometry must not be interleaved');
    buffers.add(a.array.buffer as ArrayBuffer);return {array:a.array,size:a.itemSize,normalized:a.normalized,instanced:a instanceof THREE.InstancedBufferAttribute ? a.meshPerAttribute : undefined};
  };
  const materialId=(m:THREE.Material)=>{
    let id=materials.get(m);if(id!==undefined)return id;
    if(!m.userData.streamMaterial)throw Error(`missing stream material recipe: ${m.type}`);
    id=packet.materials.length;materials.set(m,id);packet.materials.push({...m.userData.streamMaterial,vertexColors:'vertexColors' in m && m.vertexColors,paintColor:(m as THREE.MeshStandardMaterial).color?.getHex()});return id;
  };
  root.updateMatrixWorld(true);
  root.traverse(node=>{
    if(!(node instanceof THREE.Mesh))return;
    const g:THREE.BufferGeometry=node.geometry,m:THREE.Material|THREE.Material[]=node.material;if(Array.isArray(m))throw Error('streamed mesh needs one material');
    let geometry=geometries.get(g);if(geometry===undefined){geometry=packet.geometries.length;geometries.set(g,geometry);packet.geometries.push({attributes:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,attribute(a)])),index:g.index ? attribute(g.index) : undefined});}
    const mesh:MeshPacket={geometry,material:materialId(m),matrix:node.matrixWorld.toArray(),name:node.name,cast:node.castShadow,receive:node.receiveShadow,order:node.renderOrder,depth:node.customDepthMaterial ? materialId(node.customDepthMaterial) : undefined,sceneryEntries:node.userData.sceneryEntries};
    if(node instanceof THREE.InstancedMesh){mesh.instances=node.instanceMatrix.array as Float32Array;buffers.add(mesh.instances.buffer as ArrayBuffer);if(node.instanceColor){mesh.colors=node.instanceColor.array as Float32Array;buffers.add(mesh.colors.buffer as ArrayBuffer);}}
    packet.meshes.push(mesh);
  });
  return {packet,transfer:[...buffers]};
}
export function unpackChunk(packet:ChunkPacket,water:(id:string)=>THREE.Material):THREE.Group{
  const attribute=(a:Attribute)=>a.instanced ? new THREE.InstancedBufferAttribute(a.array,a.size,a.normalized,a.instanced) : new THREE.BufferAttribute(a.array,a.size,a.normalized);
  const geometries=packet.geometries.map(g=>{const geometry=new THREE.BufferGeometry();for(const [name,a] of Object.entries(g.attributes))geometry.setAttribute(name,attribute(a));if(g.index)geometry.setIndex(attribute(g.index));geometry.computeBoundingSphere();return geometry;});
  const createMaterial=(recipe:MaterialRecipe):THREE.Material=>{
    // Water recipes reference a persistent main-thread wave material, not placeholder paint.
    if(recipe.kind==='water')return water(recipe.id);
    const material=recipe.kind==='ground' ? groundMaterial() : recipe.kind==='road' ? roadMaterial() : recipe.kind==='toon' ? toonMaterial(recipe.color) : recipe.kind==='zone' ? zoneMaterial(recipe.effect) : recipe.kind==='styled' ? styledMaterial(recipe.spec,recipe.useB) : recipe.kind==='scenery' ? sceneryMaterial(createMaterial(recipe.base),recipe.motion) : sceneryDepthMaterial(recipe.motion,recipe.cloth);
    if(recipe.nightPaint)nightPaint(material);
    if('vertexColors' in material && recipe.vertexColors!==undefined)material.vertexColors=recipe.vertexColors;
    if(recipe.paintColor!==undefined)(material as THREE.MeshStandardMaterial).color.setHex(recipe.paintColor);return material;
  };
  const materials=packet.materials.map(createMaterial);
  const group=new THREE.Group();
  for(const item of packet.meshes){
    const g=geometries[item.geometry]!,m=materials[item.material]!,mesh=item.instances ? new THREE.InstancedMesh(g,m,item.instances.length/16) : new THREE.Mesh(g,m);
    if(mesh instanceof THREE.InstancedMesh){mesh.instanceMatrix=new THREE.InstancedBufferAttribute(item.instances!,16);if(item.colors)mesh.instanceColor=new THREE.InstancedBufferAttribute(item.colors,3);mesh.computeBoundingSphere();}
    mesh.matrix.fromArray(item.matrix);mesh.matrixAutoUpdate=false;mesh.name=item.name;mesh.castShadow=item.cast;mesh.receiveShadow=item.receive;mesh.renderOrder=item.order;mesh.userData.sceneryEntries=item.sceneryEntries;if(item.depth!==undefined)mesh.customDepthMaterial=materials[item.depth];
    if(item.order===2)g.boundingSphere!.radius+=3;group.add(mesh);
  }
  return group;
}
/** Chunk ownership includes instance buffers and shaders, but not shared wave/gradient textures. */
export function disposeChunk(root:THREE.Object3D):void{
  root.removeFromParent();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  root.traverse(node=>{if(!(node instanceof THREE.Mesh))return;geometries.add(node.geometry);for(const material of Array.isArray(node.material) ? node.material : [node.material])materials.add(material);if(node.customDepthMaterial)materials.add(node.customDepthMaterial);if(node instanceof THREE.InstancedMesh)node.dispose();});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(!m.userData.streamShared)m.dispose();});root.clear();
}
