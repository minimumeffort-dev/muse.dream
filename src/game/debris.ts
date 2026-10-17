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

/** Share bounded fracture templates; only currently visible pieces own scene transforms. */
export class WorldDebris {
  readonly group=new THREE.Group();
  private pieces=new Map<string,THREE.Group>();
  private objects:Map<string,SceneObject>;
  private prototypes=new Map<string,{groups:Map<string,THREE.Group>;usedAt:number}>();
  private time=0;
  get stats(){return {templates:this.prototypes.size,pieces:this.pieces.size,cachedFragments:[...this.prototypes.values()].reduce((n,p)=>n+p.groups.size,0)};}
  get cachedRoots(){return [...this.prototypes.values()].flatMap(p=>[...p.groups.values()]);}
  private release(key:string):void{const prototype=this.prototypes.get(key);if(!prototype)return;const geometries=new Set<THREE.BufferGeometry>();for(const group of prototype.groups.values())group.traverse(n=>{if(n instanceof THREE.Mesh)geometries.add(n.geometry);});for(const geometry of geometries)geometry.dispose();this.prototypes.delete(key);}
  dispose():void{this.group.clear();this.pieces.clear();for(const key of this.prototypes.keys())this.release(key);}

  constructor(private scene:Scene){this.objects=new Map(scene.objects.map(o=>[o.id,o]));this.group.name="destruction-fragments";}
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
    if(state.timeS<this.time)this.dispose();this.time=state.timeS;
    const visible=reduced ? [] : state.debris;if(!visible.length && !this.pieces.size && !this.prototypes.size)return;
    const active=new Set(visible.map(p=>`${p.objectId}/${p.fragmentId}`)),wanted=new Map<string,Set<string>>();
    for(const piece of visible){const key=impactTemplateKey(this.objects.get(piece.objectId)!.spec as ObjectDslV2),ids=wanted.get(key)??new Set<string>();ids.add(piece.fragmentId);wanted.set(key,ids);}
    for(const [key,group] of this.pieces)if(!active.has(key)){this.group.remove(group);this.pieces.delete(key);}
    // Reserve the whole incoming set before allocating; inactive caches yield first.
    for(const [key,prototype] of this.prototypes)if(!wanted.has(key) && this.time-prototype.usedAt>=DAMAGE_POOL_LIMITS.idleSeconds)this.release(key);
    const missingTemplates=[...wanted.keys()].filter(key=>!this.prototypes.has(key)).length;
    for(const [key] of [...this.prototypes].sort((a,b)=>a[1].usedAt-b[1].usedAt))if(this.prototypes.size+missingTemplates>DAMAGE_POOL_LIMITS.assemblies && !wanted.has(key))this.release(key);
    let groups=[...this.prototypes.values()].reduce((n,p)=>n+p.groups.size,0),missing=0;
    for(const [key,ids] of wanted)for(const id of ids)if(!this.prototypes.get(key)?.groups.has(id))missing++;
    for(const [key,prototype] of [...this.prototypes].sort((a,b)=>a[1].usedAt-b[1].usedAt))for(const [id,group] of prototype.groups)if(groups+missing>DAMAGE_POOL_LIMITS.fragments && !wanted.get(key)?.has(id)){
      group.traverse(n=>{if(n instanceof THREE.Mesh)n.geometry.dispose();});prototype.groups.delete(id);groups--;
    }
    for(const piece of visible){
      const object=this.objects.get(piece.objectId)!,key=`${piece.objectId}/${piece.fragmentId}`,template=impactTemplateKey(object.spec as ObjectDslV2);
      if(!this.prototypes.get(template)?.groups.has(piece.fragmentId))this.build(object,template,wanted.get(template)!);
      const prototype=this.prototypes.get(template)!;prototype.usedAt=this.time;
      let group=this.pieces.get(key);if(!group){group=prototype.groups.get(piece.fragmentId)!.clone(true);this.pieces.set(key,group);this.group.add(group);}
      group.visible=true;group.position.copy(worldPosition(this.scene,piece.x,piece.y));group.position.y=piece.elevation+1.5;
      group.quaternion.fromArray(piece.rotation);group.scale.setScalar(object.scale*Math.min(1,(piece.lifetime-piece.age)/.8));
    }
  }
}
