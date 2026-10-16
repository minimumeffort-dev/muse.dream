import {z} from 'zod';

export const VOXEL_LIMITS=Object.freeze({axis:32,cells:32768,objectCells:65536,operations:64,objectWork:1048576,quads:8192,projectCells:1048576});
const index=z.number().int().min(0).max(32),vector=z.tuple([index,index,index]);
export const voxelSchema=z.object({
  grid:z.tuple([index.min(1),index.min(1),index.min(1)]),
  operations:z.array(z.object({mode:z.enum(['fill','cut']),shape:z.enum(['box','ellipsoid']),from:vector,to:vector}).strict()).min(1).max(64),
  chunks:z.tuple([index.min(1).max(8),index.min(1).max(8),index.min(1).max(8)]).optional(),
}).strict().superRefine((v,ctx)=>{
  const issue=(path:(string|number)[],message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,path,message});
  if(voxelCells(v)>VOXEL_LIMITS.cells)issue(['grid'],'voxel volume exceeds 32768 cells');
  v.operations.forEach((op,i)=>{if(op.from.some((n,a)=>n>=op.to[a]! || op.to[a]!>v.grid[a]!))issue(['operations',i],'voxel bounds require 0 <= from < to <= grid on every axis');});
  if(v.chunks && (v.chunks.some((n,a)=>n>v.grid[a]! || v.grid[a]!%n!==0) || v.chunks.reduce((a,b)=>a*b,1)>8))issue(['chunks'],'chunks must divide grid axes exactly and produce at most 8 fragments');
  if(voxelWork(v)>VOXEL_LIMITS.objectWork)issue(['operations'],'voxel fill/cut work exceeds 1048576 cell visits');
  if(v.grid.every(n=>Number.isInteger(n) && n>=1 && n<=32) && voxelCells(v)<=VOXEL_LIMITS.cells && v.operations.every(op=>op.from.every((n,a)=>Number.isInteger(n) && n>=0 && Number.isInteger(op.to[a]) && n<op.to[a]! && op.to[a]!<=v.grid[a]!)) && voxelWork(v)<=VOXEL_LIMITS.objectWork){
    try {
      if(!meshVoxels(v).cells)issue(['operations'],'voxel volume must retain occupied cells');
      if(v.chunks && v.chunks.every((n,a)=>Number.isInteger(n) && n>=1 && n<=v.grid[a]! && v.grid[a]!%n===0) && voxelChunkCount(v)<=8)
        for(const slice of voxelSlices(v))if(!meshVoxels(v,slice).cells){issue(['chunks'],'every fracture chunk must contain occupied cells');break;}
    }catch(error){issue(['grid'],(error as Error).message);}
  }
});
export type VoxelVolume=z.infer<typeof voxelSchema>;
export type VoxelSlice={from:[number,number,number];to:[number,number,number]};
export const voxelCells=(v:{grid:readonly number[]})=>v.grid.reduce((a,b)=>a*b,1);
export const voxelWork=(v:VoxelVolume)=>v.operations.reduce((sum,op)=>sum+op.to.reduce((n,b,a)=>n*(b-op.from[a]!),1),0);
export const voxelChunkCount=(v:VoxelVolume)=>v.chunks?.reduce((a,b)=>a*b,1)??1;
const cache=new WeakMap<VoxelVolume,Uint8Array>();
/** Ordered CSG on integer half-open bounds. No source code or per-cell scene nodes. */
export function voxelOccupancy(v:VoxelVolume):Uint8Array {
  const prior=cache.get(v);if(prior)return prior;
  const [nx,ny]=v.grid,cells=new Uint8Array(voxelCells(v));
  for(const op of v.operations)for(let z=op.from[2];z<op.to[2];z++)for(let y=op.from[1];y<op.to[1];y++)for(let x=op.from[0];x<op.to[0];x++){
    const p=[x,y,z];
    if(op.shape==='ellipsoid' && p.reduce((sum,n,a)=>sum+((n+.5-(op.from[a]!+op.to[a]!)/2)/((op.to[a]!-op.from[a]!)/2))**2,0)>1)continue;
    cells[x+nx*(y+ny*z)]=Number(op.mode==='fill');
  }
  cache.set(v,cells);return cells;
}
export function voxelSlices(v:VoxelVolume):VoxelSlice[] {
  const chunks=v.chunks??[1,1,1],slices:VoxelSlice[]=[];
  for(let z=0;z<chunks[2];z++)for(let y=0;y<chunks[1];y++)for(let x=0;x<chunks[0];x++){
    const from=[x,y,z].map((n,a)=>n*v.grid[a]!/chunks[a]!) as VoxelSlice['from'];
    const to=from.map((n,a)=>n+v.grid[a]!/chunks[a]!) as VoxelSlice['to'];slices.push({from,to});
  }
  return slices;
}
export interface VoxelMesh {positions:Float32Array;normals:Float32Array;uvs:Float32Array;quads:number;cells:number;exposedFaces:number}
// Validation clones data for each placement; share identical CPU meshes across those copies.
const meshes=new Map<string,VoxelMesh>();let meshBytes=0;
const bytes=(m:VoxelMesh)=>m.positions.byteLength+m.normals.byteLength+m.uvs.byteLength;
/** Greedy rectangle meshing, six axis sweeps. Slice boundaries expose new fracture faces. */
export function meshVoxels(v:VoxelVolume,slice?:VoxelSlice):VoxelMesh {
  const key=JSON.stringify([v,slice]),prior=meshes.get(key);if(prior)return prior;
  const cells=voxelOccupancy(v),size=v.grid,positions:number[]=[],normals:number[]=[],uvs:number[]=[];
  const from=slice?.from??[0,0,0],to=slice?.to??size;
  const occupied=(p:number[])=>p.every((n,a)=>n>=from[a]! && n<to[a]!) && !!cells[p[0]!+size[0]*(p[1]!+size[1]*p[2]!)];
  let quads=0,exposedFaces=0,count=0;
  for(let z=from[2]!;z<to[2]!;z++)for(let y=from[1]!;y<to[1]!;y++)for(let x=from[0]!;x<to[0]!;x++)if(occupied([x,y,z]))count++;
  for(let d=0;d<3;d++)for(const sign of [-1,1]){
    const u=(d+1)%3,w=(d+2)%3,nu=to[u]!-from[u]!,nw=to[w]!-from[w]!,mask=new Uint8Array(nu*nw);
    for(let plane=from[d]!;plane<to[d]!;plane++){
      mask.fill(0);
      for(let j=0;j<nw;j++)for(let i=0;i<nu;i++){
        const p=[0,0,0];p[d]=plane;p[u]=from[u]!+i;p[w]=from[w]!+j;
        const next=[...p];next[d]=next[d]!+sign;
        if(occupied(p) && !occupied(next)){mask[i+nu*j]=1;exposedFaces++;}
      }
      for(let j=0;j<nw;j++)for(let i=0;i<nu;){
        if(!mask[i+nu*j]){i++;continue;}
        let width=1,height=1;while(i+width<nu && mask[i+width+nu*j])width++;
        outer:while(j+height<nw){for(let k=0;k<width;k++)if(!mask[i+k+nu*(j+height)])break outer;height++;}
        const p=[0,0,0];p[d]=plane+Number(sign>0);p[u]=from[u]!+i;p[w]=from[w]!+j;
        const corners=[p,[...p],[...p],[...p]];corners[1]![u]=corners[1]![u]!+width;corners[2]![u]=corners[2]![u]!+width;corners[2]![w]=corners[2]![w]!+height;corners[3]![w]=corners[3]![w]!+height;
        const order=sign>0 ? [0,1,2,0,2,3] : [0,2,1,0,3,2];
        for(const c of order){const point=corners[c]!;for(let a=0;a<3;a++){positions.push(point[a]!/size[a]!-.5);normals.push(a===d ? sign : 0);}uvs.push(point[u]!/size[u]!,point[w]!/size[w]!);}
        for(let row=0;row<height;row++)mask.fill(0,i+nu*(j+row),i+width+nu*(j+row));i+=width;quads++;
        if(quads>VOXEL_LIMITS.quads)throw new Error('voxel surface exceeds 8192 merged quads');
      }
    }
  }
  const result={positions:new Float32Array(positions),normals:new Float32Array(normals),uvs:new Float32Array(uvs),quads,cells:count,exposedFaces};
  while(meshes.size && (meshes.size>=128 || meshBytes+bytes(result)>8*1024*1024)){
    const oldest=meshes.keys().next().value!;meshBytes-=bytes(meshes.get(oldest)!);meshes.delete(oldest);
  }
  if(bytes(result)<=8*1024*1024){meshes.set(key,result);meshBytes+=bytes(result);}return result;
}
