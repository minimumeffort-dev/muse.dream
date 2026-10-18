import * as THREE from "three";
import {DAMAGE_POOL_LIMITS,impactTemplateKey} from "../scene/damage-pool";
import type { Scene,SceneObject } from "../scene/schema";
import type { CarState } from "../sim/car";
import type { ObjectDslV2 } from "../scene/object-dsl";
import {voxelGeometry} from '../scene/object-geometry';
import { objectFragments } from "../scene/fragments";
import { buildObject } from "./world3d";
import { worldPosition } from "./environment";
import { compactObject } from "./compact-object";
import { materialCoordinates } from "./material-coordinates";
import {pooledImpact} from '../scene/damage-pool';
import {materialRecipe,materialFromRecipe,unpackChunk,disposeChunk,type ChunkPacket} from './chunk-packet';
import {WorldScenery} from './scenery';
import {toppleMaterial} from './shaders';

/** Share bounded fracture templates; only currently visible pieces own scene transforms. */
export class WorldDebris {
  readonly group=new THREE.Group();
  private pieces=new Map<string,THREE.Group>();
  private objects:Map<string,SceneObject>;
  private prototypes=new Map<string,{groups:Map<string,THREE.Group>;usedAt:number}>();
  private pending=new Map<string,AbortController>();
  private stopped=false;
  error:Error|undefined;
  private time=0;
  get ready():boolean{return !this.error && this.pending.size===0;}
  get stats(){return {templates:this.prototypes.size,pieces:this.pieces.size,cachedFragments:[...this.prototypes.values()].reduce((n,p)=>n+p.groups.size,0)};}
  get cachedRoots(){return [...this.prototypes.values()].flatMap(p=>[...p.groups.values()]);}
  private releaseGroup(group:THREE.Group,geometry:boolean):void{
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    group.traverse(n=>{if(!(n instanceof THREE.Mesh))return;if(geometry)geometries.add(n.geometry);if(group.userData.preparedTopple){materials.add(n.material as THREE.Material);if(n.customDepthMaterial)materials.add(n.customDepthMaterial);}});
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
  }
  private release(key:string):void{const prototype=this.prototypes.get(key);if(!prototype)return;for(const group of prototype.groups.values())this.releaseGroup(group,true);this.prototypes.delete(key);}
  private clear():void{for(const abort of this.pending.values())abort.abort();this.pending.clear();for(const group of this.pieces.values())this.releaseGroup(group,false);this.group.clear();this.pieces.clear();for(const key of this.prototypes.keys())this.release(key);}
  dispose():void{this.stopped=true;this.clear();}

  constructor(private scene:Scene,private source?:(object:SceneObject)=>THREE.Mesh[]|undefined,private load?:(objectId:string,signal:AbortSignal)=>Promise<ChunkPacket>){this.objects=new Map(scene.objects.map(o=>[o.id,o]));this.group.name="destruction-fragments";}
  private prepared(object:SceneObject,key:string,meshes:THREE.Mesh[]):void{
    const fragment=objectFragments(object.spec as ObjectDslV2)[0]!,group=new THREE.Group(),center=new THREE.Group();group.userData.preparedTopple=true;center.position.copy(fragment.center).negate();group.add(center);
    try{
      for(const mesh of meshes){
        const recipe=materialRecipe(mesh.material as THREE.Material);if(recipe.kind!=='scenery')throw Error('topple needs prepared scenery geometry');
        const {kind,base,motion,...flags}=recipe,geometry=new THREE.BufferGeometry();
        // Instance fade/growth state belongs to the resident chunk, never a falling copy.
        for(const [name,attribute] of Object.entries(mesh.geometry.attributes))if(!(attribute instanceof THREE.InstancedBufferAttribute))geometry.setAttribute(name,attribute.clone());
        if(mesh.geometry.index)geometry.setIndex(mesh.geometry.index.clone());
        const copy=new THREE.Mesh(geometry,materialFromRecipe({...base,...flags}));copy.userData.toppleMotion=motion;copy.castShadow=mesh.castShadow;copy.receiveShadow=mesh.receiveShadow;center.add(copy);
      }
      if(!center.children.length)throw Error('missing prepared topple geometry');
      this.prototypes.set(key,{groups:new Map([[fragment.id,group]]),usedAt:this.time});
    }catch(error){this.releaseGroup(group,true);throw error;}
  }
  private prepare(object:SceneObject,key:string):void{
    if(this.pending.has(key))return;
    const meshes=this.source?.(object);if(meshes){this.prepared(object,key,meshes);return;}
    if(!this.load){const root=new WorldScenery(this.scene,[object]).group;try{this.prepared(object,key,root.children as THREE.Mesh[]);}finally{disposeChunk(root);}return;}
    const abort=new AbortController();this.pending.set(key,abort);
    void Promise.resolve().then(()=>this.load!(object.id,abort.signal)).then(packet=>{
      if(this.stopped || this.pending.get(key)!==abort)return;
      const root=unpackChunk(packet,()=>{throw Error('unexpected water in topple prototype');});
      try{this.prepared(object,key,root.children as THREE.Mesh[]);}finally{disposeChunk(root);}
    }).catch(error=>{if(!abort.signal.aborted)this.error=error instanceof Error ? error : new Error(String(error));}).finally(()=>{if(this.pending.get(key)===abort)this.pending.delete(key);});
  }
  private piece(prototype:THREE.Group,object:SceneObject):THREE.Group{
    const group=prototype.clone(true);if(!group.userData.preparedTopple)return group;
    const seed={value:Math.fround(object.x-this.scene.canonical.width/2)};
    group.traverse(node=>{if(!(node instanceof THREE.Mesh))return;
      const material=materialFromRecipe(materialRecipe(node.material as THREE.Material)),motion=node.userData.toppleMotion;
      node.material=motion ? toppleMaterial(material,motion,seed) : material;
      if(motion)node.customDepthMaterial=toppleMaterial(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),motion,seed);
    });return group;
  }
  private build(object:SceneObject,key:string,wanted:Set<string>):void {
    const groups=this.prototypes.get(key)?.groups??new Map<string,THREE.Group>();
    const source=buildObject({...object,scale:1});source.updateMatrixWorld(true);
    for(const fragment of objectFragments(object.spec as ObjectDslV2)){
      if(groups.has(fragment.id) || !wanted.has(fragment.id))continue;
      const group=new THREE.Group(),shift=new THREE.Matrix4().makeTranslation(-fragment.center.x,-fragment.center.y,-fragment.center.z);
      for(const id of fragment.parts){
        const mesh=source.getObjectByName(id) as THREE.Mesh,copy=mesh.clone();
        if(fragment.slice){
          const part=(object.spec as ObjectDslV2).parts.find(p=>p.id===id)!;
          copy.geometry=voxelGeometry(part.voxels!,fragment.slice);
          materialCoordinates(copy.geometry,part);
          // Fracture exposes cut faces; restore the intact part's uniform vertex paint.
          for(const name of ['color','nightEmission']){
            const attribute=mesh.geometry.getAttribute(name);if(!attribute)continue;
            const values=new Float32Array(copy.geometry.getAttribute('position').count*attribute.itemSize);
            for(let i=0;i<values.length;i++)values[i]=attribute.array[i%attribute.itemSize]!;
            copy.geometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize));
          }
        }else copy.geometry=mesh.geometry.clone();
        shift.clone().multiply(mesh.matrixWorld).decompose(copy.position,copy.quaternion,copy.scale);group.add(copy);
      }
      compactObject(group);groups.set(fragment.id,group);
    }
    source.traverse(node=>{if(node instanceof THREE.Mesh)node.geometry.dispose();});
    this.prototypes.set(key,{groups,usedAt:this.time});
  }
  update(state:CarState,reduced=false):void {
    if(this.stopped)return;
    if(state.timeS<this.time)this.clear();this.time=state.timeS;
    const visible=reduced ? [] : state.debris;if(!visible.length && !this.pieces.size && !this.prototypes.size && !this.pending.size)return;
    const active=new Set(visible.map(p=>`${p.objectId}/${p.fragmentId}`)),wanted=new Map<string,Set<string>>();
    for(const piece of visible){const key=impactTemplateKey(this.objects.get(piece.objectId)!.spec as ObjectDslV2),ids=wanted.get(key)??new Set<string>();ids.add(piece.fragmentId);wanted.set(key,ids);}
    for(const [key,abort] of this.pending)if(!wanted.has(key)){abort.abort();this.pending.delete(key);}
    for(const [key,group] of this.pieces)if(!active.has(key)){this.releaseGroup(group,false);this.group.remove(group);this.pieces.delete(key);}
    // Reserve the whole incoming set before allocating; inactive caches yield first.
    for(const [key,prototype] of this.prototypes)if(!wanted.has(key) && this.time-prototype.usedAt>=DAMAGE_POOL_LIMITS.idleSeconds)this.release(key);
    const missingTemplates=[...wanted.keys()].filter(key=>!this.prototypes.has(key)).length;
    for(const [key] of [...this.prototypes].sort((a,b)=>a[1].usedAt-b[1].usedAt))if(this.prototypes.size+missingTemplates>DAMAGE_POOL_LIMITS.assemblies && !wanted.has(key))this.release(key);
    let groups=[...this.prototypes.values()].reduce((n,p)=>n+p.groups.size,0),missing=0;
    for(const [key,ids] of wanted)for(const id of ids)if(!this.prototypes.get(key)?.groups.has(id))missing++;
    for(const [key,prototype] of [...this.prototypes].sort((a,b)=>a[1].usedAt-b[1].usedAt))for(const [id,group] of prototype.groups)if(groups+missing>DAMAGE_POOL_LIMITS.fragments && !wanted.get(key)?.has(id)){
      this.releaseGroup(group,true);prototype.groups.delete(id);groups--;
    }
    for(const piece of visible){
      const object=this.objects.get(piece.objectId)!,key=`${piece.objectId}/${piece.fragmentId}`,template=impactTemplateKey(object.spec as ObjectDslV2);
      if(!this.prototypes.get(template)?.groups.has(piece.fragmentId)){
        if(pooledImpact(this.scene,object) && (object.spec as ObjectDslV2).impact?.kind==='topple' && (this.source || (object.spec as ObjectDslV2).parts.some(p=>p.animation))){try{this.prepare(object,template);}catch(error){this.error=error instanceof Error ? error : new Error(String(error));}if(!this.prototypes.get(template))continue;}
        else this.build(object,template,wanted.get(template)!);
      }
      const prototype=this.prototypes.get(template)!;prototype.usedAt=this.time;
      let group=this.pieces.get(key);if(!group){group=this.piece(prototype.groups.get(piece.fragmentId)!,object);this.pieces.set(key,group);this.group.add(group);}
      group.visible=true;group.position.copy(worldPosition(this.scene,piece.x,piece.y));group.position.y=piece.elevation+1.5;
      group.quaternion.fromArray(piece.rotation);group.scale.setScalar(object.scale*(piece.sizeScale??1)*Math.min(1,(piece.lifetime-piece.age)/.8));
    }
  }
}
