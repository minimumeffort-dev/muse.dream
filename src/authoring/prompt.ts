import {checkDream,formatDream} from '../scene/dream';
import {dreamAgentContext} from '../scene/dream-agent';
import townSource from '../../docs/examples/town-scenario.dream?raw';

export const DEFAULT_PROMPT='Build a connected town with two agents. Deliver bread to a school, then visit a clinic with limited service capacity. Give each agent a budget of 16, carrying capacity 4 and a deadline of 80 steps. Seed 7.';
export interface PromptRequest {prompt:string;signal:AbortSignal}
export interface DreamProposal {source:string;provider:'mock';assumptions:string[]}
export type DreamInterpreter=(request:PromptRequest)=>Promise<DreamProposal>;
export function modelContext(prompt:string){
  if(!prompt.trim()||prompt.length>4000)throw new Error('Use a prompt of 1–4,000 characters.');
  return {...dreamAgentContext(['scenarios']),prompt,output:'One complete Dream 2 source file. Unsupported intent must stay explicitly unresolved. Never emit executable code.'};
}
/** This labelled local template interpreter is a transport boundary, not an LLM or a semantic parser. */
export const mockInterpreter:DreamInterpreter=async({prompt,signal})=>{
  modelContext(prompt);signal.throwIfAborted();
  const p=prompt.toLowerCase(),numbers:Record<string,number>={one:1,two:2,three:3,four:4};
  const agentsMatch=p.match(/\b(one|two|three|four|\d+)\s+agents?\b/),agents=agentsMatch ? numbers[agentsMatch[1]!]??Number(agentsMatch[1]) : 2;
  const budget=Number(p.match(/\bbudget(?: of)?\s+(\d+)\b/)?.[1]??16),capacity=Number(p.match(/\bcarrying capacity(?: of)?\s+(\d+)\b/)?.[1]??4),deadline=Number(p.match(/\bdeadline(?: of)?\s+(\d+)\b/)?.[1]??80),seed=Number(p.match(/\bseed\s+(\d+)\b/)?.[1]??7);
  if(!/\b(town|bread|bakery|school|clinic|errands)\b/.test(p))throw new Error('The mock interpreter supports the town-errand template only. Edit Dream directly for other scenarios; a real model is not connected.');
  if(agents<1||agents>4||budget>100000||capacity<1||capacity>100||deadline<1||deadline>1000||seed>2147483647)throw new Error('Mock bounds: 1–4 agents, budget 0–100,000, capacity 1–100, deadline 1–1,000, seed 0–2,147,483,647.');
  const declarations=Array.from({length:agents},(_,i)=>{
    const id=`courier_${String.fromCharCode(97+i)}`;
    return `agent ${id}(at=bakery,budget=${budget},capacity=${capacity});\nobjective breakfast_${i}(agent=${id},kind=deliver,at=school,item=bread,quantity=2);\nobjective visit_${i}(agent=${id},kind=produce,at=clinic,item=visit,quantity=1);`;
  }).join('\n');
  const source=townSource.slice(0,townSource.indexOf('  agent '))+declarations+'\n}';
  return {source:formatDream(source.replace('seed=7,max_steps=80',`seed=${seed},max_steps=${deadline}`)),provider:'mock',assumptions:[`Town-errand template; ${agents} agents, ${budget} credits each, carrying capacity ${capacity}, ${deadline} steps, seed ${seed}.`,'Only those bounded parameters are extracted. All other wording is unimplemented intent, not a model interpretation.','Locations and links are a logical task network. They do not yet control the 3D city or its walking/driving physics.','Clinic service means a supply-and-queue exercise; it models no diagnosis, treatment or health outcome.']};
};
/** Provider responses always cross the compiler boundary, including after asynchronous cancellation. */
export async function proposeDream(request:PromptRequest,interpreter:DreamInterpreter=mockInterpreter){
  modelContext(request.prompt);request.signal.throwIfAborted();
  const proposal=await interpreter(request);request.signal.throwIfAborted();
  const checked=checkDream(proposal.source);
  if(!checked.ok)throw new Error(checked.diagnostics.map(d=>`${d.code} ${d.line}:${d.column} ${d.message}`).join('\n'));
  return {...proposal,source:formatDream(proposal.source),world:checked.world};
}
