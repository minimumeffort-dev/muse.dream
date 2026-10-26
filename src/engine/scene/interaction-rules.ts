import {z} from 'zod';
import {impactSchema,type ObjectDslV2} from './object-dsl';
import {MEASURE_KINDS} from './measure';
import type {Scene} from './schema';

export const MAX_INTERACTION_RULES=16;
export const interactionRuleSchema=z.object({
  id:z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),kind:z.enum(MEASURE_KINDS),impact:impactSchema,
}).strict();
export type InteractionRule=z.infer<typeof interactionRuleSchema>;

/** The declared semantic category selects physics; display labels and placement never do. */
export function interactionRuleFor(spec:Pick<ObjectDslV2,'measure'>,rules:readonly InteractionRule[]){
  return rules.find(rule=>rule.kind===spec.measure?.kind);
}
export function interactionRuleProblems(scene:Pick<Scene,'interactionRules'|'objects'>):string[]{
  const problems:string[]=[],ids=new Set<string>(),kinds=new Set<string>();
  for(const rule of scene.interactionRules){
    if(ids.has(rule.id))problems.push(`duplicate interaction rule '${rule.id}'`);ids.add(rule.id);
    if(kinds.has(rule.kind))problems.push(`only one interaction rule may own kind '${rule.kind}'`);kinds.add(rule.kind);
  }
  for(const object of scene.objects){
    if(!object.spec || !('dslVersion' in object.spec) || object.spec.dslVersion!==2)continue;
    const rule=interactionRuleFor(object.spec,scene.interactionRules);
    const impacts=rule?.impact.kind==='break' && object.spec.breakZones?.length ? object.spec.breakZones.map(zone=>zone.impact) : [object.spec.impact];
    if(rule && impacts.some(impact=>JSON.stringify(impact)!==JSON.stringify(rule.impact)))problems.push(`${object.id}: must follow interaction rule '${rule.id}' for kind '${rule.kind}'`);
  }
  return problems;
}
