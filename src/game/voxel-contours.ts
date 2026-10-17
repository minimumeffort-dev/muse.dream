import * as THREE from 'three';
import {WORLD_VOXEL_LIMITS} from '../scene/voxel-world';
import type {ColumnOptions} from './voxel-columns';

type Vertex={x:number;z:number;values:number[]};
type Edge={a:Vertex;b:Vertex;height:number;cx:number;cz:number};
/** Cut-cell boundaries retain the authored diagonal instead of centre-sampling
 * it into a staircase. Heights still come from the supporting voxel columns. */
export function contourSurface(source:THREE.BufferGeometry,options:ColumnOptions):THREE.BufferGeometry{
  const {cell,step,lift,thickness}=options,ox=options.originX??0,oz=options.originZ??0;
  const channels=Object.entries(source.attributes).filter(([name])=>name!=='position' && name!=='normal');
  if(options.rigid && source.hasAttribute('uv'))channels.push(['voxelAnchor',source.getAttribute('uv')]);
  const sizes=channels.map(([,a])=>a.itemSize),offsets=sizes.map((_,i)=>sizes.slice(0,i).reduce((a,b)=>a+b,0));
  const positions:number[]=[],normals:number[]=[],values=channels.map(()=>[] as number[]),indices:number[]=[];
  type Top={patch:Vertex[];height:number;anchor:number[];heights?:number[]};
  const edges=new Map<string,Edge[]>(),cells=new Set<string>(),tops=new Map<string,Top[]>();
  const clip=(polygon:Vertex[],axis:'x'|'z',bound:number,sign:number):Vertex[]=>{
    const out:Vertex[]=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,da=(a[axis]-bound)*sign,db=(b[axis]-bound)*sign;
      if(da>=-1e-7)out.push(a);
      if((da>1e-7 && db< -1e-7)||(da< -1e-7 && db>1e-7)){
        const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,values:a.values.map((v,j)=>v+(b.values[j]!-v)*t)});
      }
    }
    return out;
  };
  const emit=(v:Vertex,h:number,normal:number[],anchor:number[])=>{
    positions.push(v.x,h,v.z);normals.push(...normal);
    channels.forEach(([name],i)=>values[i]!.push(...(name==='voxelAnchor' ? anchor : v.values.slice(offsets[i]!,offsets[i]!+sizes[i]!))));
  };
  const p=source.getAttribute('position'),index=source.index;
  for(let i=0;i<(index?.count??p.count);i+=3){
    const ids=[0,1,2].map(k=>index ? index.getX(i+k) : i+k);
    const triangle=ids.map(j=>({x:p.getX(j),z:p.getZ(j),values:channels.flatMap(([,a])=>Array.from({length:a.itemSize},(_,k)=>a.array[j*a.itemSize+k]!))}));
    const [a,b,c]=triangle as [Vertex,Vertex,Vertex],area=(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
    if(Math.abs(area)<1e-7)continue;
    if(area>0)triangle.reverse();
    const x0=Math.floor((Math.min(...triangle.map(v=>v.x))-ox)/cell),x1=Math.ceil((Math.max(...triangle.map(v=>v.x))-ox)/cell);
    const z0=Math.floor((Math.min(...triangle.map(v=>v.z))-oz)/cell),z1=Math.ceil((Math.max(...triangle.map(v=>v.z))-oz)/cell);
    if((x1-x0)*(z1-z0)>WORLD_VOXEL_LIMITS.columnCellsPerTile)throw Error('voxel contour must be tiled before reconstruction');
    for(let z=z0;z<z1;z++)for(let x=x0;x<x1;x++){
      const left=ox+x*cell,near=oz+z*cell,cx=left+cell/2,cz=near+cell/2;
      let patch=clip(triangle,'x',left,1);patch=clip(patch,'x',left+cell,-1);patch=clip(patch,'z',near,1);patch=clip(patch,'z',near+cell,-1);
      if(patch.length<3)continue;
      const patchArea=patch.reduce((n,v,j)=>{const q=patch[(j+1)%patch.length]!;return n+v.x*q.z-v.z*q.x;},0);
      if(Math.abs(patchArea)<1e-6)continue;
      cells.add(`${x},${z}`);if(cells.size>WORLD_VOXEL_LIMITS.columnCellsPerTile)throw Error('voxel contour exceeds tile cell budget');
      const u=((b.z-c.z)*(cx-c.x)+(c.x-b.x)*(cz-c.z))/area;
      const v=((c.z-a.z)*(cx-c.x)+(a.x-c.x)*(cz-c.z))/area;
      const surfaceLift=options.liftAt?.(cx,cz)??lift;
      const base=options.baseAt ? options.baseAt(cx,cz) : ids.reduce((n,j,k)=>n+p.getY(j)*[u,v,1-u-v][k]!,0)-lift;
      const height=Math.floor((base+1e-5)/step)*step+surfaceLift;
      const uvOffset=channels.findIndex(([name])=>name==='uv'),anchor=uvOffset<0 ? [0,0] : [0,1].map(k=>[a,b,c].reduce((n,t,j)=>n+t.values[offsets[uvOffset]!+k]!*[u,v,1-u-v][j]!,0));
      const key=`${x},${z}`,list=tops.get(key)??[];list.push({patch,height,anchor,heights:options.surfaceAt ? patch.map(p=>options.surfaceAt!(p.x,p.z)??height) : undefined});tops.set(key,list);
      for(let j=0;j<patch.length;j++){
        const a=patch[j]!,b=patch[(j+1)%patch.length]!;
        if(Math.hypot(a.x-b.x,a.z-b.z)<1e-5)continue;
        const point=(v:Vertex)=>`${Math.round(v.x*10000)},${Math.round(v.z*10000)}`;
        const pa=point(a),pb=point(b),key=pa<pb ? `${pa}:${pb}` : `${pb}:${pa}`;
        const list=edges.get(key)??[];list.push({a,b,height,cx:anchor[0]!,cz:anchor[1]!});edges.set(key,list);
      }
    }
  }
  type Full={x:number;z:number;top:Top;signature:string;at:(x:number,z:number)=>Vertex};
  const full=new Map<string,Full>();
  const top=(patch:Vertex[],height:number,anchor:number[],heights?:number[])=>{
    heights??=options.surfaceAt ? patch.map(p=>options.surfaceAt!(p.x,p.z)??height) : patch.map(()=>height);
    const normal=[0,0,0],a=patch[0]!,ha=heights[0]!;
    for(let j=1;j<patch.length-1;j++){
      const b=patch[j]!,c=patch[j+1]!,ux=b.x-a.x,uy=heights[j]!-ha,uz=b.z-a.z,vx=c.x-a.x,vy=heights[j+1]!-ha,vz=c.z-a.z;
      normal[0]!+=uy*vz-uz*vy;normal[1]!+=uz*vx-ux*vz;normal[2]!+=ux*vy-uy*vx;
    }
    const length=Math.hypot(...normal);if(length<1e-8)return;for(let i=0;i<3;i++)normal[i]!/=length;
    const first=positions.length/3;patch.forEach((point,i)=>emit(point,heights![i]!,normal,anchor));
    for(let j=1;j<patch.length-1;j++)indices.push(first,first+j,first+j+1);
  };
  for(const [key,list] of tops){
    const first=list[0]!,[a,b,c]=first.patch as [Vertex,Vertex,Vertex],den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
    const at=(x:number,z:number):Vertex=>{const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;return {x,z,values:a.values.map((n,j)=>n*u+b.values[j]!*v+c.values[j]!*(1-u-v))};};
    const area=list.reduce((sum,t)=>sum+Math.abs(t.patch.reduce((n,p,j)=>{const q=t.patch[(j+1)%t.patch.length]!;return n+p.x*q.z-p.z*q.x;},0))/2,0);
    const affine=Number.isFinite(den) && Math.abs(den)>1e-8 && list.every(t=>t.height===first.height && t.patch.every(p=>{const value=at(p.x,p.z);return p.values.every((v,j)=>Math.abs(v-value.values[j]!)<1e-5);}));
    if(!options.rigid && !list.some(t=>t.heights?.some(h=>Math.abs(h-t.height)>1e-6)) && Math.abs(area-cell*cell)<.002 && affine){
      const origin=at(0,0).values,gx=at(1,0).values.map((n,i)=>n-origin[i]!),gz=at(0,1).values.map((n,i)=>n-origin[i]!);
      const signature=JSON.stringify([first.height,...origin,...gx,...gz].map(n=>Math.round(n*1e5))),[x,z]=key.split(',').map(Number);
      full.set(key,{x:x!,z:z!,top:first,signature,at});
    }else for(const t of list)top(t.patch,t.height,t.anchor,t.heights);
  }
  for(const [key,c] of full){
    const {x,z}=c;let w=1,d=1;const max=options.maxMerge??400/cell;
    while(w<max && full.get(`${x+w},${z}`)?.signature===c.signature)w++;
    outer:while(d<max){for(let i=0;i<w;i++)if(full.get(`${x+i},${z+d}`)?.signature!==c.signature)break outer;d++;}
    for(let j=0;j<d;j++)for(let i=0;i<w;i++)full.delete(`${x+i},${z+j}`);
    const x0=ox+x*cell,z0=oz+z*cell;top([[x0,z0],[x0,z0+d*cell],[x0+w*cell,z0+d*cell],[x0+w*cell,z0]].map(([x,z])=>c.at(x!,z!)),c.top.height,c.top.anchor);
  }
  for(const list of edges.values()){
    const edge=list.reduce((a,b)=>a.height>b.height ? a : b),other=list.length>1 ? Math.min(...list.map(e=>e.height)) : edge.height-thickness;
    const smoothA=options.surfaceAt?.(edge.a.x,edge.a.z),smoothB=options.surfaceAt?.(edge.b.x,edge.b.z);
    if(list.length>1 && smoothA!==undefined && smoothB!==undefined)continue;
    // Internal column risers reach the neighbouring top; deck skins follow their shared field.
    const low=other;if(edge.height-low<1e-5 && smoothA===undefined && smoothB===undefined)continue;
    const {a,b,height}=edge,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),normal=[-dz/length,0,dx/length],first=positions.length/3;
    const ha=smoothA??height,hb=smoothB??height,la=smoothA!==undefined ? ha-thickness : low,lb=smoothB!==undefined ? hb-thickness : low;
    for(const [v,h] of [[a,ha],[a,la],[b,lb],[b,hb]] as const)emit(v,h,normal,[edge.cx,edge.cz]);
    indices.push(first,first+1,first+2,first,first+2,first+3);
  }
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  channels.forEach(([name],i)=>result.setAttribute(name,new THREE.Float32BufferAttribute(values[i]!,sizes[i]!)));result.setIndex(indices);result.computeBoundingSphere();
  result.userData.voxel={kind:'contour',cells:cells.size};return result;
}
