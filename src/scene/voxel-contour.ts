import {VOXEL_LIMITS} from './voxels';
import type {VoxelMesh} from './voxels';

/** Surface nets over occupied cell centres. One bounded dual vertex per boundary
 * cell removes stair-step silhouettes without a finer volume or per-cell nodes. */
export function meshVoxelContour(size:readonly number[],cells:Uint8Array):VoxelMesh{
  if(size.length!==3 || size.some(n=>!Number.isInteger(n)||n<1||n>VOXEL_LIMITS.axis) || cells.length!==size.reduce((a,b)=>a*b,1))throw Error('invalid bounded voxel grid');
  const [nx,ny,nz]=size as readonly [number,number,number],stride=nx+1,plane=stride*(ny+1);
  const vertices:number[][]=[],dual=new Int32Array((nx+1)*(ny+1)*(nz+1)).fill(-1);
  const key=(x:number,y:number,z:number)=>x+1+(y+1)*stride+(z+1)*plane;
  const occupied=(x:number,y:number,z:number)=>x>=0 && x<nx && y>=0 && y<ny && z>=0 && z<nz && !!cells[x+nx*(y+ny*z)];
  const corners=Array.from({length:8},(_,i)=>[i&1,(i>>1)&1,(i>>2)&1]);
  const edges=corners.flatMap((p,i)=>[0,1,2].filter(axis=>!p[axis]).map(axis=>[i,i+(1<<axis)]));
  for(let z=-1;z<nz;z++)for(let y=-1;y<ny;y++)for(let x=-1;x<nx;x++){
    const signs=corners.map(p=>occupied(x+p[0]!,y+p[1]!,z+p[2]!));if(signs.every(Boolean)||signs.every(s=>!s))continue;
    const sum=[0,0,0];let count=0;
    for(const [a,b] of edges)if(signs[a!]!==signs[b!]){
      const p=corners[a!]!,q=corners[b!]!;for(let d=0;d<3;d++)sum[d]!+=([x,y,z][d]!+.5+(p[d]!+q[d]!)/2)/size[d]!;count++;
    }
    dual[key(x,y,z)]=vertices.length;vertices.push(sum.map(n=>n/count));
  }
  const positions:number[]=[],normals:number[]=[],uvs:number[]=[];let quads=0;
  type Plane={normal:number[];distance:number;axis:number;rects:number[][]};
  const planes=new Map<string,Plane>();
  const emit=(points:number[][],axis:number)=>{
    for(const face of [[0,1,2],[0,2,3]]){
      const [a,b,c]=face.map(i=>points[i]!) as [number[],number[],number[]],u=b.map((n,j)=>n-a[j]!),v=c.map((n,j)=>n-a[j]!);
      const normal=[u[1]!*v[2]!-u[2]!*v[1]!,u[2]!*v[0]!-u[0]!*v[2]!,u[0]!*v[1]!-u[1]!*v[0]!],length=Math.hypot(...normal);
      if(length<1e-12)continue;
      for(const p of [a,b,c]){positions.push(...p.map(n=>n-.5));normals.push(...normal.map(n=>n/length));uvs.push(p[(axis+1)%3]!,p[(axis+2)%3]!);}
    }
    quads++;if(quads>VOXEL_LIMITS.quads)throw Error('voxel surface exceeds 8192 merged quads');
  };
  const quad=(corners:number[][],outward:boolean,axis:number)=>{
    const points=corners.map(p=>vertices[dual[key(p[0]!,p[1]!,p[2]!)]!]!);if(points.some(p=>!p))throw Error('voxel contour has an incomplete boundary');
    if(!outward)points.reverse();
    const [a,b,c,d]=points as [number[],number[],number[],number[]],u=b.map((n,j)=>n-a[j]!),v=c.map((n,j)=>n-a[j]!);
    const normal=[u[1]!*v[2]!-u[2]!*v[1]!,u[2]!*v[0]!-u[0]!*v[2]!,u[0]!*v[1]!-u[1]!*v[0]!],length=Math.hypot(...normal);
    if(length<1e-12){emit(points,axis);return;}
    for(let j=0;j<3;j++)normal[j]!/=length;
    const distance=normal.reduce((n,v,j)=>n+v*a[j]!,0),drop=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),axes=[0,1,2].filter(j=>j!==drop);
    const us=points.map(p=>Math.round(p[axes[0]!]!*1e6)),vs=points.map(p=>Math.round(p[axes[1]!]!*1e6)),loU=Math.min(...us),hiU=Math.max(...us),loV=Math.min(...vs),hiV=Math.max(...vs);
    if(Math.abs(normal.reduce((n,v,j)=>n+v*d[j]!,0)-distance)<1e-8 && points.every((_,i)=>(us[i]===loU||us[i]===hiU)&&(vs[i]===loV||vs[i]===hiV)) && new Set(us.map((u,i)=>`${u},${vs[i]}`)).size===4){
      // Tied normal components may choose different projection axes after rounding.
      const key=drop+':'+[...normal,distance].map(n=>Math.round(n*1e6)).join(','),plane=planes.get(key)??{normal,distance,axis,rects:[]};
      plane.rects.push([loU,loV,hiU,hiV]);planes.set(key,plane);
    }else emit(points,axis);
  };
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=-1;x<nx;x++)if(occupied(x,y,z)!==occupied(x+1,y,z))quad([[x,y-1,z-1],[x,y,z-1],[x,y,z],[x,y-1,z]],occupied(x,y,z),0);
  for(let z=0;z<nz;z++)for(let y=-1;y<ny;y++)for(let x=0;x<nx;x++)if(occupied(x,y,z)!==occupied(x,y+1,z))quad([[x-1,y,z-1],[x-1,y,z],[x,y,z],[x,y,z-1]],occupied(x,y,z),1);
  for(let z=-1;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(occupied(x,y,z)!==occupied(x,y,z+1))quad([[x-1,y-1,z],[x,y-1,z],[x,y,z],[x-1,y,z]],occupied(x,y,z),2);
  // Merge coplanar rectangles, including sloping roof faces. Curved corners retain
  // their original boundary vertices and never acquire interpolated smoothing.
  for(const plane of planes.values()){
    const us=[...new Set(plane.rects.flatMap(r=>[r[0]!,r[2]!]))].sort((a,b)=>a-b),vs=[...new Set(plane.rects.flatMap(r=>[r[1]!,r[3]!]))].sort((a,b)=>a-b),cells=new Set<number>(),stride=us.length;
    for(const r of plane.rects)for(let j=vs.indexOf(r[1]!);j<vs.indexOf(r[3]!);j++)for(let i=us.indexOf(r[0]!);i<us.indexOf(r[2]!);i++)cells.add(i+j*stride);
    const drop=plane.normal.map(Math.abs).indexOf(Math.max(...plane.normal.map(Math.abs))),axes=[0,1,2].filter(j=>j!==drop);
    for(const key of cells){
      const x=key%stride,y=Math.floor(key/stride);let w=1,h=1;
      while(cells.has(x+w+y*stride))w++;
      outer:while(y+h<vs.length-1){for(let i=0;i<w;i++)if(!cells.has(x+i+(y+h)*stride))break outer;h++;}
      for(let j=0;j<h;j++)for(let i=0;i<w;i++)cells.delete(x+i+(y+j)*stride);
      const points=[[us[x]!,vs[y]!],[us[x+w]!,vs[y]!],[us[x+w]!,vs[y+h]!],[us[x]!,vs[y+h]!]].map(([u,v])=>{
        const p=[0,0,0];p[axes[0]!] =u!/1e6;p[axes[1]!] =v!/1e6;p[drop]=(plane.distance-plane.normal[axes[0]!]!*p[axes[0]!]!-plane.normal[axes[1]!]!*p[axes[1]!]!)/plane.normal[drop]!;return p;
      });
      const sign=drop===1 ? -1 : 1;if(plane.normal[drop]!*sign<0)points.reverse();emit(points,plane.axis);
    }
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),uvs:new Float32Array(uvs),quads,cells:cells.reduce((n,v)=>n+Number(!!v),0),exposedFaces:quads};
}
