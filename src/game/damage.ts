import { Group } from "three";
import type { SceneObject } from "../scene/schema";
import { zonesOf } from "../scene/object-dsl";
import type { CarState } from "../sim/car";
import { buildObject } from "./world3d";
import { compactObject } from "./compact-object";

/** Separate batches keep retained structure independent of each detachable zone. */
export function buildDamageObject(object:SceneObject):Group {
  const spec=object.spec,zones=zonesOf(spec);
  if(!zones.length)return compactObject(buildObject(object));
  if(!spec || !("dslVersion" in spec) || spec.dslVersion!==2)throw new Error("damage zones require an assembly");
  const root=compactObject(buildObject({...object,spec:{...spec,parts:spec.parts.filter(p=>!p.zone)}}));
  for(const zone of zones){
    const group=compactObject(buildObject({...object,scale:1,spec:{...spec,parts:spec.parts.filter(p=>p.zone===zone.id)}}));
    group.userData.breakZone=zone.id;root.add(group);
  }
  return root;
}
export function updateDamage(group:Group,objectId:string,state:CarState,scale=1):void {
  const authored=group.userData.damageScale??(group.userData.damageScale=group.scale.clone());group.scale.copy(authored).multiplyScalar(scale);
  group.visible=!state.broken.includes(objectId);
  for(const child of group.children)if(child.userData.breakZone)
    child.visible=!state.brokenZones.some(z=>z.objectId===objectId && z.zoneId===child.userData.breakZone);
}
