import * as THREE from 'three';
import type {Scene,Point} from '../scene/schema';
import {assemblyBounds} from '../scene/measure';
import {objectPlacement} from '../scene/placement';
import {clipPolygon} from '../scene/landscape-dsl';
import {WorldScenery} from './scenery';
import {unpackChunk,disposeChunk,type ChunkPacket} from './chunk-packet';
import {freezeStatic} from './batching';
import {WORLD_CHUNK_SIZE,type RenderRegion} from './render-region';
import {geometryMemory} from './geometry-memory';

export type StreamBounds={min:number;max:number;radius:number};
export type ChunkRequest={key:string;region:RenderRegion;distance:number};
/** Bounds belong to the accepted world, never the currently loaded meshes. */
export function worldStreamBounds(doc:Scene):StreamBounds{
  let min=Math.min(0,...(doc.terrain.landscape?.waters??[]).map(w=>w.level-w.depth))-32;
  let max=Math.min(320,doc.terrain.hills.reduce((n,h)=>n+h.height,0))+Math.max(0,...(doc.terrain.landscape?.bridges??[]).map(b=>b.archHeight))+8,radius=16;
  const bounds=new Map<NonNullable<Scene['objects'][number]['spec']>,THREE.Box3>();
  for(const object of doc.objects){
    if(!object.spec || !('dslVersion' in object.spec))continue;
    let box=bounds.get(object.spec);if(!box){box=assemblyBounds(object.spec);bounds.set(object.spec,box);}
    const placement=objectPlacement(doc,object),placed=box.clone().applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(placement.rotation));
    const sphere=box.getBoundingSphere(new THREE.Sphere());radius=Math.max(radius,(sphere.center.length()+sphere.radius)*object.scale+16);
    max=Math.max(max,placement.base+placed.max.y*object.scale+8);min=Math.min(min,placement.low+placed.min.y*object.scale-8);
  }
  return {min,max,radius};
}
function hull(points:Point[]):Point[]{
  const p=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const side=(points:Point[])=>{const out:Point[]=[];for(const p of points){while(out.length>1 && cross(out.at(-2)!,out.at(-1)!,p)<=0)out.pop();out.push(p);}out.pop();return out;};
  return [...side(p),...side(p.slice().reverse())];
}
/** Include the orthographic view at both height extremes and offscreen casters.
 * The margin is geometric coverage, not a lower-detail ring. */
export function streamFootprint(camera:THREE.OrthographicCamera,sun:THREE.Vector3,bounds:StreamBounds,width:number,height:number):Point[]{
  const direction=camera.getWorldDirection(new THREE.Vector3()),points:Point[]=[];
  const reach=(bounds.max-bounds.min)/Math.max(.15,sun.y);
  for(const x of [-1,1])for(const y of [-1,1]){
    const origin=new THREE.Vector3(x,y,-1).unproject(camera);
    for(const elevation of [bounds.min,bounds.max]){
      const p=origin.clone().addScaledVector(direction,(elevation-origin.y)/direction.y);
      points.push({x:p.x+width/2,y:p.z+height/2},{x:p.x+width/2+sun.x*reach,y:p.z+height/2+sun.z*reach});
    }
  }
  return hull(points);
}
export function selectChunks(doc:Scene,footprint:Point[],margin:number,focus:Point):ChunkRequest[]{
  const requests:ChunkRequest[]=[],step=WORLD_CHUNK_SIZE;
  const x0=Math.max(-800,Math.floor((Math.min(...footprint.map(p=>p.x))-margin)/step)*step),x1=Math.min(doc.canonical.width+800,Math.max(...footprint.map(p=>p.x))+margin);
  const y0=Math.max(-800,Math.floor((Math.min(...footprint.map(p=>p.y))-margin)/step)*step),y1=Math.min(doc.canonical.height+800,Math.max(...footprint.map(p=>p.y))+margin);
  for(let y=y0;y<y1;y+=step)for(let x=x0;x<x1;x+=step){
    let clipped=clipPolygon(footprint,p=>p.x-x+margin);clipped=clipPolygon(clipped,p=>x+step+margin-p.x);clipped=clipPolygon(clipped,p=>p.y-y+margin);clipped=clipPolygon(clipped,p=>y+step+margin-p.y);
    if(clipped.length<3 || Math.abs(clipped.reduce((n,p,i)=>{const q=clipped[(i+1)%clipped.length]!;return n+p.x*q.y-p.y*q.x;},0))<1e-6)continue;
    requests.push({key:`${x},${y}`,region:{x0:x,y0:y,x1:x+step,y1:y+step},distance:Math.hypot(x+step/2-focus.x,y+step/2-focus.y)});
  }
  return requests.sort((a,b)=>a.distance-b.distance);
}

type Resident={group:THREE.Group;scenery:WorldScenery;bytes:number};
/** Complete simulation data stays resident. Only replaceable static render data is evicted. */
export class WorldStreaming {
  readonly group=new THREE.Group();
  readonly bounds:StreamBounds;
  private residents=new Map<string,Resident>();
  private wanted:ChunkRequest[]=[];
  private required=new Set<string>();
  private working=false;
  private stopped=false;
  private signature='';
  private loaded=0;private unloaded=0;private discarded=0;private bytes=0;private peakBytes=0;private peakResident=0;private maxInstallMs=0;private maxSliceMs=0;
  error:Error|undefined;
  constructor(private doc:Scene,private build:(region:RenderRegion)=>Promise<ChunkPacket>,private water:(id:string)=>THREE.Material){
    this.bounds=worldStreamBounds(doc);this.group.name='streamed-world';
  }
  get ready():boolean{return !this.error && [...this.required].every(key=>this.residents.has(key));}
  get stats(){return {resident:this.residents.size,required:this.required.size,pending:this.wanted.filter(r=>!this.residents.has(r.key)).length,bytes:this.bytes,peakBytes:this.peakBytes,peakResident:this.peakResident,maxInstallMs:this.maxInstallMs,maxSliceMs:this.maxSliceMs,loaded:this.loaded,unloaded:this.unloaded,discarded:this.discarded,ready:this.ready,keys:[...this.residents.keys()]};}
  get obscuredCount():number{return [...this.residents.values()].reduce((n,r)=>n+r.scenery.obscuredCount,0);}
  update(camera:THREE.OrthographicCamera,sun:THREE.Vector3,player:THREE.Vector3,velocity:Point,dt:number,reduced:boolean):void{
    const signature=[camera.left,camera.right,camera.top,camera.bottom,Math.round(camera.position.x/32),Math.round(camera.position.y/16),Math.round(camera.position.z/32),...camera.quaternion.toArray().map(n=>Math.round(n*128)),Math.round(camera.zoom*100),Math.round(sun.x*64),Math.round(sun.y*64),Math.round(sun.z*64)].join(',');
    if(signature!==this.signature){
      this.signature=signature;
      const {width,height}=this.doc.canonical,footprint=streamFootprint(camera,sun,this.bounds,width,height),focus={x:player.x+width/2,y:player.z+height/2},margin=this.bounds.radius+80;
      const required=selectChunks(this.doc,footprint,margin,focus);this.required=new Set(required.map(r=>r.key));
      const ahead=hull([...footprint,...footprint.map(p=>({x:p.x+velocity.x*3,y:p.y+velocity.y*3}))]);
      const prefetch=selectChunks(this.doc,ahead,margin+400,focus);
      this.wanted=[...required,...prefetch.filter(r=>!this.required.has(r.key))];
      const keep=new Set(selectChunks(this.doc,footprint,margin+1200,focus).map(r=>r.key)),wanted=new Set(this.wanted.map(r=>r.key));
      // At most sixteen previously visited chunks stay warm outside the prefetch ring.
      const warm=[...this.residents.keys()].filter(key=>!wanted.has(key) && keep.has(key)).sort((a,b)=>{
        const distance=(key:string)=>{const [x,y]=key.split(',').map(Number);return Math.hypot(x!+400-focus.x,y!+400-focus.y);};return distance(a)-distance(b);
      });
      const retain=new Set([...wanted,...warm.slice(0,16)]);
      for(const [key,resident] of this.residents)if(!retain.has(key)){disposeChunk(resident.group);this.bytes-=resident.bytes;this.residents.delete(key);this.unloaded++;}
      void this.pump();
    }
    for(const resident of this.residents.values())resident.scenery.update(camera,player,dt,reduced);
  }
  private async pump():Promise<void>{
    if(this.working || this.stopped || this.error)return;this.working=true;
    let installing:THREE.Group|undefined;
    const yieldFrame=()=>new Promise<void>(resolve=>typeof requestAnimationFrame==='function' ? requestAnimationFrame(()=>resolve()) : setTimeout(resolve,0));
    try {
      while(!this.stopped){
        const request=this.wanted.find(r=>!this.residents.has(r.key));if(!request)break;
        const packet=await this.build(request.region);
        if(this.stopped || !this.wanted.some(r=>r.key===request.key)){this.discarded++;continue;}
        const installStart=performance.now();
        const group=unpackChunk(packet,this.water);installing=group;
        const scenery=WorldScenery.fromChunk(this.doc,group,packet.occlusion);freezeStatic(group);
        this.maxSliceMs=Math.max(this.maxSliceMs,performance.now()-installStart);
        const bytes=geometryMemory(group).bytes;this.group.add(group);this.residents.set(request.key,{group,scenery,bytes});this.bytes+=bytes;this.loaded++;this.peakBytes=Math.max(this.peakBytes,this.bytes);this.peakResident=Math.max(this.peakResident,this.residents.size);this.maxInstallMs=Math.max(this.maxInstallMs,performance.now()-installStart);installing=undefined;
        await yieldFrame();
      }
    }catch(error){if(installing)disposeChunk(installing);this.error=error instanceof Error ? error : new Error(String(error));}
    finally{this.working=false;}
  }
  dispose():void{this.stopped=true;for(const resident of this.residents.values())disposeChunk(resident.group);this.residents.clear();this.wanted=[];this.required.clear();this.bytes=0;}
}
