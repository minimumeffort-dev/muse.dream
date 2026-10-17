import type {Scene,SceneObject} from './schema';
import {isReactive,type ObjectDslV2} from './object-dsl';
import {voxelChunkCount} from './voxels';
import {roleOf} from './agents';

/** Persistent records are cheap; moving fracture assemblies and mesh templates stay bounded. */
export const DAMAGE_POOL_LIMITS=Object.freeze({assemblies:24,fragments:128,templateRecords:128,instances:4096,idleSeconds:10});
export function poolableImpact(spec:ObjectDslV2):boolean{
 return !!spec.impact && spec.impact.kind!=='bounce' && !spec.breakZones?.length && !spec.foundation && (!spec.contacts || spec.contacts.length===1 && spec.contacts[0]!.position.every(n=>n===0)) && !spec.rideable && !spec.emitter && !spec.parts.some(p=>p.animation || p.material.shaderStyle==='cloth') && !spec.joints?.some(j=>j.animation || j.proximity || j.bone);
}
export function pooledImpact(scene:Pick<Scene,'damagePool'>,object:SceneObject):boolean{
 return !!scene.damagePool && roleOf(object)==='prop' && !object.route && !object.behavior && !object.ambient && !!object.spec && 'dslVersion' in object.spec && object.spec.dslVersion===2 && poolableImpact(object.spec);
}
const keys=new WeakMap<ObjectDslV2,string>();
export function impactTemplateKey(spec:ObjectDslV2):string{let key=keys.get(spec);if(key===undefined){key=JSON.stringify(spec);keys.set(spec,key);}return key;}
export function impactBudget(scene:Pick<Scene,'objects'|'damagePool'>){
 const unique=new Map<string,SceneObject>(),resident:SceneObject[]=[];
 for(const object of scene.objects)if(isReactive(object.spec)){if(pooledImpact(scene,object))unique.set(impactTemplateKey(object.spec as ObjectDslV2),object);else resident.push(object);}
 const templates=[...resident,...unique.values()];
 const slots=(objects:SceneObject[])=>objects.reduce((sum,{spec})=>{
  if(!spec || !('dslVersion' in spec) || spec.dslVersion!==2 || spec.impact?.kind==='bounce')return sum;
  const parts=spec.impact ? spec.parts : spec.parts.filter(p=>p.zone);
  return sum+new Set(parts.filter(p=>!p.voxels?.chunks).map(p=>p.fragment ? `group:${p.fragment}` : `part:${p.id}`)).size+parts.reduce((n,p)=>n+(p.voxels?.chunks ? voxelChunkCount(p.voxels) : 0),0);
 },0);
 return {templates:templates.length,fragments:slots(templates),resident:resident.length,residentFragments:slots(resident),pooledTemplates:unique.size};
}
