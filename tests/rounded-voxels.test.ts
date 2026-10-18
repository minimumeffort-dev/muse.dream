import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {meshVoxelContour} from '../src/scene/voxel-contour';
import {partGeometry} from '../src/scene/object-geometry';
import type {ObjectPart} from '../src/scene/object-dsl';

it.each([[12,12,12],[5,11,5],[12,19,16],[32,32,32]])('keeps merged rounded contours inside their occupied grid: %j',(...size)=>{
 const [nx,ny,nz]=size as [number,number,number],cells=new Uint8Array(nx*ny*nz);
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(((x+.5)/nx-.5)**2+((y+.5)/ny-.5)**2+((z+.5)/nz-.5)**2<.25)cells[x+nx*(y+ny*z)]=1;
 const mesh=meshVoxelContour(size,cells);
 expect(Math.min(...mesh.positions)).toBeGreaterThanOrEqual(-.500002);
 expect(Math.max(...mesh.positions)).toBeLessThanOrEqual(.500002);
 expect(mesh.quads).toBeLessThanOrEqual(8192);
});

it.each([['sphere',[12,12,12],.45],['capsule',[5,11,5],.6]] as const)('keeps a complete %s head or limb after coplanar merging',(shape,size,minimum)=>{
 const part={id:'body',shape,size:[...size],position:[0,0,0],material:{shaderStyle:'toon',colorA:'#c59774',colorB:'#a97655'}} as ObjectPart;
 const geometry=partGeometry(part,1),positions=geometry.getAttribute('position'),mesh=new Mesh(geometry,new MeshBasicMaterial()),ray=new Raycaster();mesh.updateMatrixWorld();
 let volume=0;
 for(let i=0;i<positions.count;i+=3){const a=new Vector3().fromBufferAttribute(positions,i),b=new Vector3().fromBufferAttribute(positions,i+1),c=new Vector3().fromBufferAttribute(positions,i+2);volume+=a.dot(b.cross(c))/6;}
 expect(volume).toBeGreaterThan(minimum);expect(volume).toBeLessThan(.85);
 for(const axis of [0,1,2])for(const sign of [-1,1]){
  const direction=new Vector3().setComponent(axis,sign);ray.set(direction.clone().multiplyScalar(2),direction.clone().negate());
  expect(ray.intersectObject(mesh)[0]?.distance).toBeCloseTo(1.5,4);
 }
 geometry.dispose();mesh.material.dispose();
});
