import {z} from 'zod';
import {checkDream,formatDream} from './engine/scene/dream';
import template from '../examples/morning-delivery.dream?raw';
import legacyDelivery from '../examples/legacy/morning-delivery-v1.dream?raw';
import warehouse from '../examples/warehouse.dream?raw';
import classroom from '../examples/classroom.dream?raw';

export type {Scenario} from './engine/scene/scenario';
export {createEpisode,stepEpisode,mockAction,observeAgent,episodeMetrics} from './engine/sim/episode';
export type {Episode,EpisodeState,EpisodeAgent} from './engine/sim/episode';
export {recordingManifest,exportEpisode,replayEpisode} from './engine/experiment/recording';
export type {Manifest} from './engine/experiment/recording';

export const DEFAULT_WORLD='A neighbourhood with a bakery, school and clinic. Couriers share stock and one service desk.';
export const DEFAULT_TASK='Deliver bread to the school, then take a supply kit to the clinic.';
export const DEFAULT_PARAMETERS={agents:2,budget:16,deadline:80,seed:7};
export const BRIEF_BUILDER='scenarios-1' as const;
export type BriefBuilder=typeof BRIEF_BUILDER|'delivery-1';
export const SCENARIO_BRIEFS=[
  {id:'delivery',label:'Delivery',world:DEFAULT_WORLD,task:DEFAULT_TASK,template},
  {id:'warehouse',label:'Warehouse',world:'A warehouse with a receiving dock, a loading yard and two stockrooms. Workers share incoming cartons.',task:'Restock both stockrooms with one carton per worker.',template:warehouse},
  {id:'classroom',label:'Classroom',world:'A campus with a learning library, a courtyard and two classrooms. Learners share lesson packs and classroom places.',task:'Collect a lesson pack and complete one classroom session per learner.',template:classroom},
] as const;
const parameters=z.object({agents:z.number().int().min(1).max(8),budget:z.number().int().min(0).max(100000),deadline:z.number().int().min(1).max(1000),seed:z.number().int().min(0).max(2147483647)}).strict();
export type Parameters=z.infer<typeof parameters>;

/** One canonical compiler; the lab accepts only the runner's standalone target. */
export function compileExperiment(source:string){
  if(source.length>65536)throw new Error('Dream source must fit within 65,536 characters.');
  const result=checkDream(source);
  if(!result.ok)throw new Error(result.diagnostics.map(d=>`${d.code} ${d.line}:${d.column} · ${d.message}`).join('\n'));
  if(result.world.scenarios.length!==1 || Object.entries(result.world).some(([key,value])=>key!=='scenarios' && (Array.isArray(value)?value.length>0:value!==undefined)))
    throw new Error('The runner accepts one standalone scenario. Geometry comes from the Lab asset pack.');
  return {source:formatDream(source),scenario:result.world.scenarios[0]!};
}

const normalized=(text:string)=>text.trim().replace(/\s+/g,' ').toLowerCase();
/** Versioned, exact-match mock briefs; no semantic inference or provider calls. */
export function buildFromBrief(world:string,task:string,input:Parameters,builder:BriefBuilder=BRIEF_BUILDER){
  if(world.length>2000 || task.length>2000)throw new Error('Keep World and Task within 2,000 characters each.');
  const brief=SCENARIO_BRIEFS.find(b=>normalized(world)===normalized(b.world)&&normalized(task)===normalized(b.task));
  if(!brief || builder==='delivery-1'&&brief.id!=='delivery')
    throw new Error('The local builder supports the Delivery, Warehouse and Classroom briefs. Select one or edit Dream source.');
  const p=parameters.safeParse(input);
  if(!p.success)throw new Error(p.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('\n'));
  const {agents,budget,deadline,seed}=p.data;
  const declarations=Array.from({length:agents},(_,i)=>{
    const suffix=String.fromCharCode(97+i);
    if(brief.id==='warehouse'){
      const id=`worker_${suffix}`;
      return `agent ${id}(at=receiving,budget=${budget},capacity=2,look=worker);\nobjective north_${suffix}(agent=${id},kind=deliver,at=north_racks,item=parcel,quantity=1);\nobjective south_${suffix}(agent=${id},kind=deliver,at=south_racks,item=parcel,quantity=1);`;
    }
    if(brief.id==='classroom'){
      const id=`learner_${suffix}`,at=i%2?'seminar':'studio';
      return `agent ${id}(at=library,budget=${budget},capacity=1,look=learner);\nobjective attend_${suffix}(agent=${id},kind=produce,at=${at},item=session,quantity=1);`;
    }
    const id=`courier_${suffix}`,look=builder==='delivery-1'?'':`,look=courier_${i%2?'b':'a'}`;
    return `agent ${id}(at=bakery,budget=${budget},capacity=4${look});\nobjective breakfast_${suffix}(agent=${id},kind=deliver,at=school,item=bread,quantity=2);\nobjective visit_${suffix}(agent=${id},kind=produce,at=clinic,item=visit,quantity=1);`;
  }).join('\n');
  const base=builder==='delivery-1'?legacyDelivery:brief.template;
  const source=base.slice(0,base.indexOf('  agent '))+declarations+'\n}';
  return compileExperiment(source.replace('seed=7,max_steps=80',`seed=${seed},max_steps=${deadline}`));
}
