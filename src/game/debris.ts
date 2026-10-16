import * as THREE from "three";
import type { Scene,SceneObject } from "../scene/schema";
import type { CarState } from "../sim/car";
import type { ObjectDslV2 } from "../scene/object-dsl";
import { objectFragments } from "../scene/fragments";
import { buildObject } from "./world3d";
import { worldPosition } from "./environment";
import { compactObject } from "./compact-object";

/** Geometry is made on first fracture and reused after restart; scene budgets cap the cache. */
export class WorldDebris {
  readonly group=new THREE.Group();
  private pieces=new Map<string,THREE.Group>();
  private objects:Map<string,SceneObject>;
  constructor(private scene:Scene){this.objects=new Map(scene.objects.map(o=>[o.id,o]));this.group.name="destruction-fragments";}
  private build(object:SceneObject):void {
    const source=buildObject({...object,scale:1});source.updateMatrixWorld(true);
    for(const fragment of objectFragments(object.spec as ObjectDslV2)){
      const group=new THREE.Group(),shift=new THREE.Matrix4().makeTranslation(-fragment.center.x,-fragment.center.y,-fragment.center.z);
      for(const id of fragment.parts){
        const mesh=source.getObjectByName(id) as THREE.Mesh,copy=mesh.clone();
        shift.clone().multiply(mesh.matrixWorld).decompose(copy.position,copy.quaternion,copy.scale);group.add(copy);
      }
      compactObject(group);group.scale.setScalar(object.scale);group.visible=false;this.group.add(group);this.pieces.set(`${object.id}/${fragment.id}`,group);
    }
  }
  update(state:CarState,reduced=false):void {
    for(const group of this.pieces.values())group.visible=false;
    if(reduced)return;
    for(const piece of state.debris){
      const object=this.objects.get(piece.objectId)!,key=`${piece.objectId}/${piece.fragmentId}`;
      if(!this.pieces.has(key))this.build(object);
      const group=this.pieces.get(key)!;
      group.visible=true;group.position.copy(worldPosition(this.scene,piece.x,piece.y));group.position.y=piece.elevation+1.5;
      group.quaternion.fromArray(piece.rotation);group.scale.setScalar(object.scale*Math.min(1,(piece.lifetime-piece.age)/.8));
    }
  }
}
