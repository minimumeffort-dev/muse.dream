import * as THREE from 'three';
import {meshVoxelGrid,type VoxelMesh} from './voxels';
import {meshVoxelContour} from './voxel-contour';
import {WORLD_VOXEL_LIMITS} from './voxel-world';

const cache=new Map<string,VoxelMesh>();let usedBytes=0;
/** Classify bounded stamp cells, retaining planar or reconstructing curved boundaries.
 * Geometry is sampled before part transforms, so apertures, wheel pivots and joints survive. */
export function voxelStamp(source:THREE.BufferGeometry,dimensions:readonly number[],cell:number,key?:string,planar=false):THREE.BufferGeometry{
  const step=Math.max(cell,Math.max(...dimensions)/WORLD_VOXEL_LIMITS.stampAxis);
  // Small rings/leaves need more than a single center ray: the center of a
  // torus is empty. A four-cell minimum retains sub-cell features and holes.
  const grid=dimensions.map(n=>Math.max(4,Math.min(32,Math.ceil(n/step))));
  const cacheKey=key && JSON.stringify([key,grid,planar]);let data=cacheKey ? cache.get(cacheKey) : undefined;
  source.computeBoundingBox();const bounds=source.boundingBox!,extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  if(!data){
    const positions=source.getAttribute('position'),indices=source.index;
    const columns:number[][]=Array.from({length:grid[0]!*grid[1]!},()=>[]);
    const vertex=(i:number)=>{const j=indices ? indices.getX(i) : i;return [(positions.getX(j)-bounds.min.x)/extent.x,(positions.getY(j)-bounds.min.y)/extent.y,(positions.getZ(j)-bounds.min.z)/extent.z];};
    for(let i=0;i<(indices?.count??positions.count);i+=3){
      const a=vertex(i),b=vertex(i+1),c=vertex(i+2),den=(b[1]!-c[1]!)*(a[0]!-c[0]!)+(c[0]!-b[0]!)*(a[1]!-c[1]!);
      if(Math.abs(den)<1e-12)continue;
      const lo=[0,1].map(d=>Math.max(0,Math.ceil(Math.min(a[d]!,b[d]!,c[d]!)*grid[d]!-.5)));
      const hi=[0,1].map(d=>Math.min(grid[d]!-1,Math.floor(Math.max(a[d]!,b[d]!,c[d]!)*grid[d]!-.5)));
      for(let y=lo[1]!;y<=hi[1]!;y++)for(let x=lo[0]!;x<=hi[0]!;x++){
        const px=(x+.5)/grid[0]!,py=(y+.5)/grid[1]!;
        const u=((b[1]!-c[1]!)*(px-c[0]!)+(c[0]!-b[0]!)*(py-c[1]!))/den;
        const v=((c[1]!-a[1]!)*(px-c[0]!)+(a[0]!-c[0]!)*(py-c[1]!))/den;
        if(u>=-1e-8 && v>=-1e-8 && u+v<=1+1e-8)columns[x+grid[0]!*y]!.push(u*a[2]!+v*b[2]!+(1-u-v)*c[2]!);
      }
    }
    const cells=new Uint8Array(grid[0]!*grid[1]!*grid[2]!);
    columns.forEach((hits,i)=>{
      hits.sort((a,b)=>a-b);const unique=hits.filter((n,j)=>!j || n-hits[j-1]!>1e-6);
      for(let j=0;j+1<unique.length;j+=2){
        const low=unique[j]!,high=unique[j+1]!;
        // A slender closed surface still occupies one cell; larger holes remain empty.
        const start=Math.max(0,Math.min(grid[2]!-1,Math.floor(low*grid[2]!))),end=Math.min(grid[2]!,Math.max(start+1,Math.ceil(high*grid[2]!-1e-8)));
        for(let z=start;z<end;z++)cells[i+grid[0]!*grid[1]!*z]=1;
      }
    });
    data=planar ? planarBoundary(source,bounds,extent,grid,cells) : cells.every(Boolean) ? meshVoxelGrid(grid,cells) : meshVoxelContour(grid,cells);
    if(!data.cells)throw new Error('voxel stamp has no occupied cells');
    const bytes=data.positions.byteLength+data.normals.byteLength+data.uvs.byteLength;
    while(cache.size && usedBytes+bytes>WORLD_VOXEL_LIMITS.stampCacheBytes){const oldest=cache.keys().next().value!;const m=cache.get(oldest)!;usedBytes-=m.positions.byteLength+m.normals.byteLength+m.uvs.byteLength;cache.delete(oldest);}
    if(cacheKey && bytes<=WORLD_VOXEL_LIMITS.stampCacheBytes){cache.set(cacheKey,data);usedBytes+=bytes;}
  }
  const result=new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.BufferAttribute(data.positions.slice(),3));
  result.setAttribute('normal',new THREE.BufferAttribute(data.normals.slice(),3));
  result.setAttribute('uv',new THREE.BufferAttribute(data.uvs.slice(),2));
  result.scale(extent.x,extent.y,extent.z).translate(center.x,center.y,center.z);
  // Preserve the authored envelope (not occupancy of deliberately carved volumes).
  result.computeBoundingBox();const sampled=result.boundingBox!,size=sampled.getSize(new THREE.Vector3()),mid=sampled.getCenter(new THREE.Vector3());
  result.translate(-mid.x,-mid.y,-mid.z).scale(extent.x/size.x,extent.y/size.y,extent.z/size.z).translate(center.x,center.y,center.z);
  result.userData.voxel={kind:'stamp',surface:planar?'planar':'net',grid,cells:data.cells,quads:data.quads};
  return result;
}

/** Planar boundary cells retain their exact cut contours. Coplanar fragments of
 * each source triangle have the triangle itself as their merged exterior face.
 * Centre sampling alone can miss an entire thin roof panel between two rays. */
function planarBoundary(source:THREE.BufferGeometry,bounds:THREE.Box3,extent:THREE.Vector3,grid:number[],cells:Uint8Array):VoxelMesh{
  const p=source.getAttribute('position'),indices=source.index,positions:number[]=[],normals:number[]=[],uvs:number[]=[];
  const vertex=(i:number)=>new THREE.Vector3().fromBufferAttribute(p,indices?indices.getX(i):i).sub(bounds.min).divide(extent);
  const box=new THREE.Box3(),triangle=new THREE.Triangle(),normal=new THREE.Vector3();
  for(let i=0;i<(indices?.count??p.count);i+=3){
    triangle.set(vertex(i),vertex(i+1),vertex(i+2));triangle.getNormal(normal);
    if(normal.lengthSq()<.5)continue;
    const vertices=[triangle.a,triangle.b,triangle.c],lo=[0,1,2].map(d=>Math.max(0,Math.floor(Math.min(...vertices.map(v=>v.getComponent(d)))*grid[d]!-1e-8))),hi=[0,1,2].map(d=>Math.min(grid[d]!-1,Math.floor(Math.max(...vertices.map(v=>v.getComponent(d)))*grid[d]!+1e-8)));
    // Conservative triangle/box overlap includes sub-cell shells, ridges and ends.
    for(let z=lo[2]!;z<=hi[2]!;z++)for(let y=lo[1]!;y<=hi[1]!;y++)for(let x=lo[0]!;x<=hi[0]!;x++){
      box.min.set(x/grid[0]!,y/grid[1]!,z/grid[2]!);box.max.set((x+1)/grid[0]!, (y+1)/grid[1]!, (z+1)/grid[2]!);
      if(box.intersectsTriangle(triangle))cells[x+grid[0]!*(y+grid[1]!*z)]=1;
    }
    const axis=[Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z)].indexOf(Math.max(Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z)));
    for(const v of vertices){positions.push(v.x-.5,v.y-.5,v.z-.5);normals.push(normal.x,normal.y,normal.z);uvs.push(v.getComponent((axis+1)%3),v.getComponent((axis+2)%3));}
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),uvs:new Float32Array(uvs),cells:cells.reduce((n,v)=>n+v,0),quads:Math.ceil(positions.length/18),exposedFaces:positions.length/9};
}
