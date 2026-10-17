import {z} from 'zod';
import {controlOf,isReactive} from './object-dsl';
import type {Scene,SceneObject} from './schema';

export const roleSchema=z.enum(['prop','npc','controllable','ambient']);
export const PARKING_LIMITS=Object.freeze({vehicles:256});
export const NPC_LIMITS=Object.freeze({programs:16,actors:32,states:8,transitions:4,seconds:[.1,300] as const,radius:[10,240] as const,turnRadS:2.5,interactRadius:80,speechCharacters:240,speechSeconds:8});
const id=z.string().regex(/^[a-z][a-z0-9_]{0,31}$/);
const transitionSchema=z.object({id,event:z.enum(['after','near_player','far_player','interact']),to:id,seconds:z.number().finite().min(NPC_LIMITS.seconds[0]).max(NPC_LIMITS.seconds[1]).optional(),radius:z.number().finite().min(NPC_LIMITS.radius[0]).max(NPC_LIMITS.radius[1]).optional(),familiar:z.boolean().optional()}).strict().superRefine((t,ctx)=>{
  if(t.event==='after' ? t.seconds===undefined || t.radius!==undefined : t.radius===undefined || t.seconds!==undefined)
    ctx.addIssue({code:'custom',message:'after requires only seconds; proximity/interact requires only radius'});
  if(t.familiar!==undefined && t.event!=='interact')ctx.addIssue({code:'custom',path:['familiar'],message:'familiar requires event=interact'});
  if(t.event==='interact' && t.radius!>NPC_LIMITS.interactRadius)ctx.addIssue({code:'custom',path:['radius'],message:'interact radius must be at most 80'});
});
export const behaviorSchema=z.object({id,start:id,states:z.array(z.object({id,action:z.enum(['idle','patrol','perform']),face:z.enum(['none','player']).default('none'),say:z.string().min(1).max(NPC_LIMITS.speechCharacters).refine(s=>s.trim().length>0,'say must contain text').optional(),transitions:z.array(transitionSchema).max(NPC_LIMITS.transitions)}).strict()).min(1).max(NPC_LIMITS.states)}).strict().superRefine((b,ctx)=>{
  const ids=new Set(b.states.map(s=>s.id));
  if(ids.size!==b.states.length || !ids.has(b.start))ctx.addIssue({code:'custom',message:'behavior needs unique states and an existing start state'});
  for(const state of b.states){
    if(state.action==='patrol' && state.say)ctx.addIssue({code:'custom',message:'say requires a stationary idle or perform state'});
    if(state.action==='patrol' && state.face!=='none')ctx.addIssue({code:'custom',message:'patrol owns its travel heading; face=player is stationary only'});
    if(new Set(state.transitions.map(t=>t.id)).size!==state.transitions.length)ctx.addIssue({code:'custom',message:'transition IDs must be unique in a state'});
    if(state.transitions.some(t=>!ids.has(t.to)))ctx.addIssue({code:'custom',message:'transition target must be a state in this behavior'});
  }
  const reachable=new Map<string,Set<boolean>>([[b.start,new Set([false])]]),todo:[string,boolean][]=[[b.start,false]];
  for(let i=0;i<todo.length;i++){
    const [stateId,known]=todo[i]!,state=b.states.find(s=>s.id===stateId);if(!state)continue;
    for(const t of state.transitions){
      if(t.event==='interact' && t.familiar!==undefined && t.familiar!==known)continue;
      const nextKnown=known || t.event==='interact',flags=reachable.get(t.to)??new Set<boolean>();
      if(!flags.has(nextKnown)){flags.add(nextKnown);reachable.set(t.to,flags);todo.push([t.to,nextKnown]);}
    }
  }
  if(b.states.some(s=>!reachable.has(s.id)))ctx.addIssue({code:'custom',message:'every state must be reachable from start, with first-meeting familiarity'});
});
export type Behavior=z.infer<typeof behaviorSchema>;
export type Role=z.infer<typeof roleSchema>;
/** Role belongs to the instance. A vehicle template's control is only a capability. */
export function roleOf(object:Pick<SceneObject,'role'|'spec'|'route'>):Role{return object.role??(controlOf(object.spec) ? 'controllable' : object.route ? 'npc' : 'prop');}
export function controlFor(object:SceneObject|undefined){return object && roleOf(object)==='controllable' ? controlOf(object.spec) : undefined;}
export const isActor=(object:SceneObject)=>roleOf(object)==='npc' || roleOf(object)==='controllable';
export const isParkedVehicle=(object:SceneObject|undefined)=>object?.parked===true;
export const isResidentActor=(object:SceneObject)=>isActor(object) && !isParkedVehicle(object);
export function agentProblem(object:SceneObject,behaviors:Behavior[],routes:Scene['routes']):string|undefined{
  const role=roleOf(object),spec=object.spec && 'dslVersion' in object.spec && object.spec.dslVersion===2 ? object.spec : undefined;
  if(object.parked && ['boat','plane'].includes(controlOf(spec)??''))return 'dormant parking requires a ground vehicle; boats and planes keep resident controllable placements';
  if(object.parked && (object.role!=='controllable' || !controlOf(spec) || object.route || object.behavior || object.ambient || !spec || spec.body.interaction!=='solid' || spec.foundation || isReactive(spec) || spec.emitter || spec.lamp || spec.joints?.some(j=>j.bone || j.proximity)))return 'parked vehicles require explicit controllable ownership, a solid rideable assembly and no routes, programs, foundations, damage, emitters, lamps, humanoid or proximity joints';
  if(role==='controllable' && !controlOf(object.spec))return 'controllable role requires rideable control capability';
  if(object.behavior && role!=='npc')return 'only NPCs can have a behavior';
  if(role==='prop' && object.route)return 'props cannot have an actor route';
  if(role!=='npc')return;
  if(!object.role && !object.behavior)return; // Preserve legacy route documents at their existing boundary.
  const route=routes.find(r=>r.id===object.route?.id);
  if(!spec || spec.foundation || spec.contacts && !["street","tram","rail"].includes(route?.kind??"") || isReactive(spec) || spec.body.interaction==='knockable')return 'NPCs require an assembly cylinder without foundations, compound contacts or destruction';
  const program=behaviors.find(b=>b.id===object.behavior);
  if(object.behavior && !program)return 'NPC behavior does not exist';
  if(!program && !object.route)return 'NPC needs a behavior or an autonomous route';
  const control=controlOf(spec);
  if((control==='boat' && route?.kind!=='water') || (control==='plane' && route?.kind!=='air'))return 'boat and plane NPCs require a route in their water or air domain';
  if(program?.states.some(s=>s.action==='patrol') && !object.route)return 'patrol needs a route on its NPC placement';
}
const cache=new WeakMap<Scene,Map<string,Behavior>>();
export function behaviorFor(scene:Scene,object:SceneObject){let programs=cache.get(scene);if(!programs){programs=new Map(scene.behaviors.map(b=>[b.id,b]));cache.set(scene,programs);}return programs.get(object.behavior??'');}
