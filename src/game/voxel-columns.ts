import * as THREE from 'three';
import type {VoxelWorld} from '../scene/voxel-world';
import {WORLD_VOXEL_LIMITS} from '../scene/voxel-world';

type Column={x:number;z:number;height:number;values:number[];dx:number[];dz:number[];key:string};
type Channel={name:string;size:number;offset:number};
// Bounded world columns span far less than 2^20 on X. A linear key also retains
// fractional terrain origins when the world's center is not a ground-cell multiple.
const columnKey=(x:number,z:number)=>x+z*1048576;
export type ColumnOptions={surfaceAt?:(x:number,z:number)=>number|undefined;contour?:boolean;originX?:number;originZ?:number;cell:number;step:number;lift:number;thickness:number;maxMerge?:number;rigid?:boolean;baseAt?:(x:number,z:number)=>number;liftAt?:(x:number,z:number)=>number};

/** Sparse, world-aligned solid columns. Empty cells cost no geometry; equal top
 * cells become rectangles, and only exposed vertical steps/perimeters are emitted. */
function meshColumns(columns:Map<number,Column>,channels:Channel[],options:ColumnOptions,neighbor?:(x:number,z:number)=>number):THREE.BufferGeometry{
  const {cell,step,thickness}=options,positions:number[]=[],normals:number[]=[],values=channels.map(()=>[] as number[]),indices:number[]=[],done=new Set<number>();
  let quads=0;
  const get=(x:number,z:number)=>columns.get(columnKey(x,z));
  const emit=(points:number[][],normal:number[],column:Column,cx:number,cz:number)=>{
    const first=positions.length/3;
    indices.push(first,first+1,first+2,first,first+2,first+3);
    for(const p of points){
      positions.push(...p);normals.push(...normal);
      channels.forEach((channel,i)=>{for(let c=0;c<channel.size;c++){const j=channel.offset+c;values[i]!.push(column.values[j]!+column.dx[j]!*(p[0]!-cx)+column.dz[j]!*(p[2]!-cz));}});
    }
    quads++;
  };
  for(const [key,c] of columns){
    const {x,z}=c,cx=(x+.5)*cell,cz=(z+.5)*cell,h=c.height;
    if(!done.has(key)){
      let w=1,d=1;const max=options.maxMerge??400/cell;
      while(w<max && !done.has(columnKey(x+w,z)) && get(x+w,z)?.key===c.key)w++;
      outer:while(d<max){for(let k=0;k<w;k++)if(done.has(columnKey(x+k,z+d)) || get(x+k,z+d)?.key!==c.key)break outer;d++;}
      for(let j=0;j<d;j++)for(let i=0;i<w;i++)done.add(columnKey(x+i,z+j));
      emit([[x*cell,h,z*cell],[x*cell,h,(z+d)*cell],[(x+w)*cell,h,(z+d)*cell],[(x+w)*cell,h,z*cell]],[0,1,0],c,cx,cz);
    }
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]] as const){
      const adjacent=get(x+dx,z+dz),bottom=adjacent?.height??neighbor?.((x+dx+.5)*cell,(z+dz+.5)*cell)??h-thickness;
      if(bottom>=h-1e-6)continue;
      const lo=Math.max(h-thickness,bottom),x0=x*cell,x1=x0+cell,z0=z*cell,z1=z0+cell;
      const corners=dx===-1 ? [[x0,lo,z0],[x0,lo,z1],[x0,h,z1],[x0,h,z0]] : dx===1 ? [[x1,lo,z1],[x1,lo,z0],[x1,h,z0],[x1,h,z1]] : dz===-1 ? [[x1,lo,z0],[x0,lo,z0],[x0,h,z0],[x1,h,z0]] : [[x0,lo,z1],[x1,lo,z1],[x1,h,z1],[x0,h,z1]];
      emit(corners,[dx,0,dz],c,cx,cz);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setIndex(indices);
  channels.forEach((c,i)=>geometry.setAttribute(c.name,new THREE.Float32BufferAttribute(values[i]!,c.size)));
  geometry.userData.voxel={kind:'columns',columns:columns.size,quads,cell,step};geometry.computeBoundingSphere();return geometry;
}

/** Rasterize an already clipped infrastructure tile, preserving UVs, colors and
 * effect attributes. Lift is kept separate from terrain quantization so paint
 * cannot collapse into asphalt, or asphalt into a bridge deck. */
export function voxelSurface(source:THREE.BufferGeometry,options:ColumnOptions):THREE.BufferGeometry{
  const positions=source.getAttribute('position'),indices=source.index,columns=new Map<number,Column>(),channels:Channel[]=[];let length=0;
  for(const [name,a] of Object.entries(source.attributes))if(!['position','normal'].includes(name)){channels.push({name,size:a.itemSize,offset:length});length+=a.itemSize;}
  if(options.rigid && source.getAttribute('uv')){channels.push({name:'voxelAnchor',size:2,offset:length});length+=2;}
  const {cell,step,lift}=options;
  const paintChannels=channels.filter(ch=>ch.name!=='uv'),anchor=channels.find(ch=>ch.name==='voxelAnchor')?.offset;
  for(let i=0;i<(indices?.count??positions.count);i+=3){
    const ids=[0,1,2].map(j=>indices ? indices.getX(i+j) : i+j),p=ids.map(j=>[positions.getX(j),positions.getY(j),positions.getZ(j)]),[a,b,c]=p as [number[],number[],number[]];
    const den=(b[2]!-c[2]!)*(a[0]!-c[0]!)+(c[0]!-b[0]!)*(a[2]!-c[2]!);if(Math.abs(den)<1e-8)continue;
    const lo=[0,2].map(d=>Math.ceil(Math.min(...p.map(v=>v[d]!))/cell-.5-1e-6)),hi=[0,2].map(d=>Math.floor(Math.max(...p.map(v=>v[d]!))/cell-.5+1e-6));
    if((hi[0]!-lo[0]!+1)*(hi[1]!-lo[1]!+1)>WORLD_VOXEL_LIMITS.columnCellsPerTile)throw new Error('voxel surface must be tiled before rasterization');
    const weights=(x:number,z:number)=>{const u=((b[2]!-c[2]!)*(x-c[0]!)+(c[0]!-b[0]!)*(z-c[2]!))/den,v=((c[2]!-a[2]!)*(x-c[0]!)+(a[0]!-c[0]!)*(z-c[2]!))/den;return [u,v,1-u-v];};
    const attrs=ids.map(j=>channels.flatMap(ch=>Array.from({length:ch.size},(_,k)=>source.getAttribute(ch.name==='voxelAnchor' ? 'uv' : ch.name).array[j*ch.size+k]!)));
    const evaluate=(w:number[])=>Array.from({length},(_,j)=>w.reduce((sum,n,k)=>sum+n*attrs[k]![j]!,0));
    const origin=evaluate(weights(a[0]!,a[2]!)),gx=evaluate(weights(a[0]!+1,a[2]!)),gz=evaluate(weights(a[0]!,a[2]!+1));
    const dx=gx.map((n,j)=>anchor!==undefined && j>=anchor ? 0 : n-origin[j]!),dz=gz.map((n,j)=>anchor!==undefined && j>=anchor ? 0 : n-origin[j]!);
    for(let z=lo[1]!;z<=hi[1]!;z++)for(let x=lo[0]!;x<=hi[0]!;x++){
      const cx=(x+.5)*cell,cz=(z+.5)*cell,w=weights(cx,cz);if(w.some(n=>n< -1e-6))continue;
      const surfaceLift=options.liftAt?.(cx,cz)??lift;
      const raw=options.baseAt ? options.baseAt(cx,cz)+surfaceLift : w.reduce((sum,n,j)=>sum+n*p[j]![1]!,0),height=Math.floor((raw-surfaceLift+1e-5)/step)*step+surfaceLift,key=columnKey(x,z),prior=columns.get(key);if(prior && prior.height>height)continue;
      const values=evaluate(w),paint=paintChannels.flatMap(ch=>values.slice(ch.offset,ch.offset+ch.size).map(n=>Math.round(n*32)));
      columns.set(key,{x:x||0,z:z||0,height,values,dx,dz,key:JSON.stringify([height,paint])});
      if(columns.size>WORLD_VOXEL_LIMITS.columnCellsPerTile)throw new Error('voxel surface exceeds tile cell budget');
    }
  }
  return meshColumns(columns,channels,options);
}

export function voxelTerrainTile(x:number,z:number,policy:VoxelWorld,heightAt:(x:number,z:number)=>number,colorAt:(x:number,z:number,h:number)=>THREE.Color):THREE.BufferGeometry{
  const cell=policy.groundCell,step=policy.heightStep,columns=new Map<number,Column>();
  const height=(px:number,pz:number)=>Math.floor(heightAt(px,pz)/step)*step;
  for(let iz=z/cell;iz<(z+400)/cell;iz++)for(let ix=x/cell;ix<(x+400)/cell;ix++){
    const cx=(ix+.5)*cell,cz=(iz+.5)*cell,h=height(cx,cz),color=colorAt(cx,cz,h).toArray().map(n=>Math.round(n*48)/48);
    columns.set(columnKey(ix,iz),{x:ix,z:iz,height:h,values:color,dx:[0,0,0],dz:[0,0,0],key:JSON.stringify([h,color])});
  }
  return meshColumns(columns,[{name:'color',size:3,offset:0}],{cell,step,lift:0,thickness:1024},height);
}
