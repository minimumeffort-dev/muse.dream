import {z} from 'zod';
import {jointSchema,objectDslSchema,isReactive,type ObjectDslV2} from './object-dsl';
import type {SceneObject} from './schema';

// Instanced decor has no NPC program, rigid body, scene-node rig or boarding ownership.
export const AMBIENT_LIMITS=Object.freeze({members:192,tickSeconds:.05,graphNodes:8192});
export const ambientMotionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('walk'),speed:z.number().finite().min(4).max(24),waitS:z.number().finite().min(0).max(5)}).strict(),
 z.object({kind:z.literal('roam'),radius:z.number().finite().min(20).max(180),speed:z.number().finite().min(2).max(16),alert:z.number().finite().min(20).max(180),fleeSpeed:z.number().finite().min(8).max(60),recoverS:z.number().finite().min(.5).max(10),gait:z.enum(['walk','hop'])}).strict(),
]);
export const ambientSchema=z.object({motion:ambientMotionSchema,joints:z.array(jointSchema).max(12)}).strict();
export type AmbientMotion=z.infer<typeof ambientMotionSchema>;
export type Ambient=z.infer<typeof ambientSchema>;
export function ambientData(spec:ObjectDslV2,motion:AmbientMotion):Ambient{
 const ambient={motion,joints:spec.joints??[]},rest={...spec,joints:spec.joints?.map(({bone,animation,...j})=>j)};
 const problem=ambientProblem({kind:'custom',role:'ambient',spec:rest,ambient});if(problem)throw Error(problem);return ambient;
}
export function ambientProblem(o:Pick<SceneObject,'kind'|'role'|'spec'|'route'|'behavior'|'ambient'>):string|undefined{
 if(o.role!=='ambient')return o.ambient ? 'ambient motion requires explicit ambient ownership' : undefined;
 const s=o.spec;
 if(o.kind!=='custom' || !o.ambient || o.route || o.behavior || !s || !('dslVersion' in s) || s.dslVersion!==2 || s.body.interaction!=='decor' || isReactive(s) || s.foundation || s.contacts || s.rideable || s.emitter || s.lamp || s.parts.some(p=>p.animation) || s.joints?.some(j=>j.bone || j.animation || j.proximity))return 'ambient populations require resting decor without routes, programs, contacts, damage, seats, foundations, emitters or lamps';
 if(o.ambient.joints.some(j=>j.proximity || j.animation && 'kind' in j.animation))return 'ambient joints support humanoid bindings or bounded swing only';
 const restored=objectDslSchema.safeParse({...s,joints:o.ambient.joints});
 if(!restored.success || JSON.stringify(s.joints??[])!==JSON.stringify(o.ambient.joints.map(({bone,animation,...joint})=>joint)))return 'ambient rig must match the resting assembly and preserve its complete validated hierarchy';
 if(o.ambient.motion.kind==='walk' && !o.ambient.joints.some(j=>j.bone))return 'walking populations require the complete humanoid rig';
 if(o.ambient.motion.kind==='roam' && o.ambient.motion.fleeSpeed<o.ambient.motion.speed)return 'flee speed must be at least roaming speed';
}
