import type {Object3D,Mesh,BufferAttribute,InterleavedBufferAttribute} from 'three';

/** Resident typed arrays only. This is not a browser heap or GPU-driver memory measurement. */
export function geometryMemory(root:Object3D,...cached:Object3D[]){
 const buffers=new Set<ArrayBufferLike>(),geometries=new Set<object>();let bytes=0,triangles=0;
 const add=(attribute?:BufferAttribute|InterleavedBufferAttribute|null)=>{
  if(!attribute)return;const array='isInterleavedBufferAttribute' in attribute ? attribute.data.array : attribute.array;
  if(!buffers.has(array.buffer)){buffers.add(array.buffer);bytes+=array.buffer.byteLength;}
 };
 for(const owner of [root,...cached])owner.traverse(node=>{const mesh=node as Mesh;if(!mesh.geometry)return;const geometry=mesh.geometry;
  if(!geometries.has(geometry)){
   geometries.add(geometry);triangles+=(geometry.index?.count??geometry.getAttribute('position')?.count??0)/3;
   Object.values(geometry.attributes).forEach(add);add(geometry.index);
   Object.values(geometry.morphAttributes).forEach(attributes=>attributes?.forEach(add));
  }
  if('instanceMatrix' in mesh)add(mesh.instanceMatrix as BufferAttribute);if('instanceColor' in mesh)add(mesh.instanceColor as BufferAttribute);
 });
 return {bytes,uniqueBuffers:buffers.size,geometries:geometries.size,uniqueTriangles:triangles};
}
