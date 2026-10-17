import * as THREE from 'three';
import type {Point} from '../scene/schema';
import {partition,polygonArea,polygonBounds} from '../scene/polygons';

/** Clip details to existing top triangles; do not independently resample their height. */
export function* projectSurfaceSteps(support:THREE.BufferGeometry[],polygons:Point[][],origin:Point,lift:number):Generator<void,THREE.BufferGeometry>{
 const cuts=polygons.map(p=>({p,b:polygonBounds(p)})),positions:number[]=[],normals:number[]=[],uvs:number[]=[];
 for(const geometry of support){
  const p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv'),index=geometry.index;
  for(let i=0;i<(index?.count??p.count);i+=3){
   if(i%1536===0)yield;
   const ids=[0,1,2].map(k=>index ? index.getX(i+k) : i+k),vertices=ids.map(j=>({x:p.getX(j)+origin.x,y:p.getZ(j)+origin.y})),[a,b,c]=vertices as [Point,Point,Point];
   const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(area>=-1e-7)continue;
   const bounds=polygonBounds(vertices),heights=ids.map(j=>p.getY(j));
   const normal=new THREE.Vector3(b.x-a.x,heights[1]!-heights[0]!,b.y-a.y).cross(new THREE.Vector3(c.x-a.x,heights[2]!-heights[0]!,c.y-a.y)).normalize();
   for(const cut of cuts){
    if(bounds.x1<=cut.b.x0 || bounds.x0>=cut.b.x1 || bounds.y1<=cut.b.y0 || bounds.y0>=cut.b.y1)continue;
    const patch=partition(vertices,cut.p).inside;if(polygonArea(patch)<1e-7)continue;
    for(let j=1;j<patch.length-1;j++)for(const q of [patch[0]!,patch[j]!,patch[j+1]!]){
     const u=((b.y-c.y)*(q.x-c.x)+(c.x-b.x)*(q.y-c.y))/area,v=((c.y-a.y)*(q.x-c.x)+(a.x-c.x)*(q.y-c.y))/area,weights=[u,v,1-u-v];
     positions.push(q.x-origin.x,heights.reduce((h,y,k)=>h+y*weights[k]!,0)+lift,q.y-origin.y);normals.push(...normal.toArray());
     uvs.push(...[0,1].map(axis=>uv ? ids.reduce((n,id,k)=>n+uv.array[id*uv.itemSize+axis]!*weights[k]!,0) : 0));
    }
   }
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));return geometry;
}
