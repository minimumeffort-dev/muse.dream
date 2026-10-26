import {z} from 'zod';
import {checkDream,formatDream} from '../../src/scene/dream';
import template from '../examples/morning-delivery.dream?raw';

export type {Scenario} from '../../src/scene/scenario';
export {createEpisode,stepEpisode,mockAction,observeAgent,episodeMetrics} from '../../src/sim/episode';
export type {Episode,EpisodeState,EpisodeAgent} from '../../src/sim/episode';
export {recordingManifest,exportEpisode,replayEpisode} from '../../src/experiment/recording';
export type {Manifest} from '../../src/experiment/recording';

export const DEFAULT_WORLD='A neighbourhood with a bakery, school and clinic. Couriers share stock and one service desk.';
export const DEFAULT_TASK='Deliver bread to the school, then take a supply kit to the clinic.';
export const DEFAULT_PARAMETERS={agents:2,budget:16,deadline:80,seed:7};
const parameters=z.object({agents:z.number().int().min(1).max(8),budget:z.number().int().min(0).max(100000),deadline:z.number().int().min(1).max(1000),seed:z.number().int().min(0).max(2147483647)}).strict();
export type Parameters=z.infer<typeof parameters>;

/** One canonical compiler; the lab accepts only the runner's standalone target. */
export function compileExperiment(source:string){
  if(source.length>65536)throw new Error('Dream source must fit within 65,536 characters.');
  const result=checkDream(source);
  if(!result.ok)throw new Error(result.diagnostics.map(d=>`${d.code} ${d.line}:${d.column} · ${d.message}`).join('\n'));
  if(result.world.scenarios.length!==1 || Object.entries(result.world).some(([key,value])=>key!=='scenarios' && (Array.isArray(value)?value.length>0:value!==undefined)))
    throw new Error('The runner accepts one standalone scenario. 3D worlds and object libraries are not connected here yet.');
  return {source:formatDream(source),scenario:result.world.scenarios[0]!};
}

const normalized=(text:string)=>text.trim().replace(/\s+/g,' ').toLowerCase();
/** The local builder expands one explicit fixture; it performs no semantic inference. */
export function buildFromBrief(world:string,task:string,input:Parameters){
  if(world.length>2000 || task.length>2000)throw new Error('Keep World and Task within 2,000 characters each.');
  if(normalized(world)!==normalized(DEFAULT_WORLD) || normalized(task)!==normalized(DEFAULT_TASK))
    throw new Error('The local builder supports the morning delivery brief. Edit Dream source to define another world or task.');
  const p=parameters.safeParse(input);
  if(!p.success)throw new Error(p.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('\n'));
  const {agents,budget,deadline,seed}=p.data;
  const declarations=Array.from({length:agents},(_,i)=>{
    const suffix=String.fromCharCode(97+i),id=`courier_${suffix}`;
    return `agent ${id}(at=bakery,budget=${budget},capacity=4);\nobjective breakfast_${suffix}(agent=${id},kind=deliver,at=school,item=bread,quantity=2);\nobjective visit_${suffix}(agent=${id},kind=produce,at=clinic,item=visit,quantity=1);`;
  }).join('\n');
  const source=template.slice(0,template.indexOf('  agent '))+declarations+'\n}';
  return compileExperiment(source.replace('seed=7,max_steps=80',`seed=${seed},max_steps=${deadline}`));
}
