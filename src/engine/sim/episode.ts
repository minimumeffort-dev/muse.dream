import {z} from 'zod';
import {scenarioSchema,type Scenario} from '../scene/scenario';

const ref=z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),count=z.number().int().min(1).max(100);
export const actionSchema=z.discriminatedUnion('kind',[
  z.object({agent:ref,kind:z.literal('wait')}).strict(),
  z.object({agent:ref,kind:z.literal('move'),to:ref}).strict(),
  z.object({agent:ref,kind:z.literal('take'),stock:ref,quantity:count}).strict(),
  z.object({agent:ref,kind:z.literal('deliver'),stock:ref,quantity:count}).strict(),
  z.object({agent:ref,kind:z.literal('use'),service:ref}).strict(),
]);
export type AgentAction=z.infer<typeof actionSchema>;
export type Work={kind:'move';from:string;to:string;remaining:number;total:number}|{kind:'service';service:string;remaining:number;total:number};
export interface EpisodeAgent {id:string;at:string;credits:number;inventory:Record<string,number>;work?:Work;violations:number;blocked:number}
export interface EpisodeState {step:number;agents:EpisodeAgent[];stocks:Record<string,number>;treasuries:Record<string,number>;progress:Record<string,number>;terminated:boolean;truncated:boolean}
export interface Outcome {agent:string;kind:string;ok:boolean;reason:string;status:'accepted'|'blocked'|'rejected'}
export interface Episode {
  scenario:Scenario;state:EpisodeState;
  records:Transition[];
}
export type Observation=ReturnType<typeof observeAgent>;
export interface Transition {kind:'transition';step:number;observations:ReturnType<typeof recordedObservation>[];actions:AgentAction[];outcomes:Outcome[];rewards:Record<string,number>;nextObservations:ReturnType<typeof recordedObservation>[];terminated:boolean;truncated:boolean}
/** Static maps, prices and service definitions already live in the pinned manifest source. */
function recordedObservation(o:Observation){return {step:o.step,remainingSteps:o.remainingSteps,self:o.self,localStocks:o.localStocks.map(({id,quantity})=>({id,quantity})),localServices:o.localServices.map(({id,active})=>({id,active})),objectives:o.objectives.map(({id,progress})=>({id,progress})),terminated:o.terminated,truncated:o.truncated};}

export function createEpisode(input:unknown):Episode{
  const scenario=scenarioSchema.parse(input);
  return {scenario,state:{step:0,agents:scenario.agents.map(a=>({id:a.id,at:a.at,credits:a.budget,inventory:Object.fromEntries(scenario.items.map(i=>[i.id,0])),violations:0,blocked:0})),stocks:Object.fromEntries(scenario.stocks.map(s=>[s.id,s.quantity])),treasuries:Object.fromEntries(scenario.locations.map(l=>[l.id,0])),progress:Object.fromEntries(scenario.objectives.map(o=>[o.id,0])),terminated:false,truncated:false},records:[]};
}
/** Policies receive their own inventory/tasks and current local availability, never other agents' private state. */
export function observeAgent(episode:Episode,id:string){
  const {scenario:s,state}=episode,agent=state.agents.find(a=>a.id===id);
  if(!agent)throw new Error('Unknown observation agent');
  return structuredClone({version:1,step:state.step,remainingSteps:s.maxSteps-state.step,self:agent,carryingCapacity:s.agents.find(a=>a.id===id)!.capacity,
    locations:s.locations,links:s.links,items:s.items,
    catalog:s.stocks.map(({quantity,...stock})=>stock),services:s.services,
    localStocks:s.stocks.filter(v=>v.at===agent.at).map(v=>({...v,quantity:state.stocks[v.id]!})),
    localServices:s.services.filter(v=>v.at===agent.at).map(v=>({...v,active:state.agents.filter(a=>a.work?.kind==='service'&&a.work.service===v.id).length})),
    objectives:s.objectives.filter(v=>v.agent===id).map(v=>({...v,progress:state.progress[v.id]!})),terminated:state.terminated,truncated:state.truncated});
}
/** One joint action per integer step. Commit transfers atomically in seeded rotating agent order. */
export function stepEpisode(episode:Episode,input:unknown):Episode{
  if(episode.state.terminated||episode.state.truncated)throw new Error('Episode has ended');
  const submitted=z.array(actionSchema).max(episode.scenario.agents.length).parse(input),known=new Set(episode.state.agents.map(a=>a.id));
  if(submitted.some(a=>!known.has(a.agent))||new Set(submitted.map(a=>a.agent)).size!==submitted.length)throw new Error('Joint actions require unique existing agent IDs');
  const state=structuredClone(episode.state),s=episode.scenario,outcomes:Outcome[]=[],rewards:Record<string,number>=Object.fromEntries(state.agents.map(a=>[a.id,0]));
  const actions=state.agents.map(a=>submitted.find(v=>v.agent===a.id)??{agent:a.id,kind:'wait' as const});
  const observations=state.agents.map(a=>recordedObservation(observeAgent(episode,a.id)));
  const progress=(agent:EpisodeAgent,kind:'deliver'|'produce',at:string,item:string,quantity:number)=>{
    // Allocate units once across ordered objectives; one delivery cannot satisfy duplicate tasks twice.
    for(const goal of s.objectives.filter(g=>g.agent===agent.id&&g.kind===kind&&g.at===at&&g.item===item)){
      const before=state.progress[goal.id]!,used=Math.min(quantity,goal.quantity-before);state.progress[goal.id]=before+used;quantity-=used;
      if(before<goal.quantity&&before+used===goal.quantity)rewards[agent.id]!++;
    }
  };
  const sorted=[...state.agents].sort((a,b)=>a.id===b.id?0:a.id<b.id?-1:1),offset=(s.seed+state.step)%sorted.length,order=[...sorted.slice(offset),...sorted.slice(0,offset)];
  for(const agent of order){
    const action=actions.find(a=>a.agent===agent.id)!,work=agent.work;
    const report=(ok:boolean,reason:string,blocked=false)=>{outcomes.push({agent:agent.id,kind:action.kind,ok,reason,status:ok?'accepted':blocked?'blocked':'rejected'});if(!ok){if(blocked)agent.blocked++;else agent.violations++;}};
    if(work){
      if(action.kind!=='wait')report(false,'busy');
      continue;
    }
    if(action.kind==='wait'){report(true,'wait');continue;}
    if(action.kind==='move'){
      const link=s.links.find(l=>(l.from===agent.at&&l.to===action.to)||(l.to===agent.at&&l.from===action.to));
      if(!link){report(false,'no_link');continue;}
      agent.work={kind:'move',from:agent.at,to:action.to,remaining:link.steps,total:link.steps};report(true,'travel_started');continue;
    }
    if(action.kind==='use'){
      const service=s.services.find(v=>v.id===action.service);
      if(!service||service.at!==agent.at){report(false,'service_not_here');continue;}
      if(state.agents.filter(a=>a.work?.kind==='service'&&a.work.service===service.id).length>=service.capacity){report(false,'service_full',true);continue;}
      if((agent.inventory[service.consumes]??0)<1){report(false,'missing_input');continue;}
      if(agent.credits<service.fee){report(false,'insufficient_funds');continue;}
      agent.inventory[service.consumes]!--;agent.credits-=service.fee;state.treasuries[service.at]!+=service.fee;
      agent.work={kind:'service',service:service.id,remaining:service.duration,total:service.duration};report(true,'service_started');continue;
    }
    const stock=s.stocks.find(v=>v.id===action.stock);
    if(!stock||stock.at!==agent.at){report(false,'stock_not_here');continue;}
    if(action.kind==='take'){
      if(stock.mode!=='source'){report(false,'sink_is_delivery_only');continue;}
      if(state.stocks[stock.id]!<action.quantity){report(false,'insufficient_stock',episode.state.stocks[stock.id]!>=action.quantity);continue;}
      const spec=s.agents.find(a=>a.id===agent.id)!;
      if(Object.values(agent.inventory).reduce((a,b)=>a+b,0)+action.quantity>spec.capacity){report(false,'inventory_full');continue;}
      const cost=stock.price*action.quantity;if(agent.credits<cost){report(false,'insufficient_funds');continue;}
      state.stocks[stock.id]!-=action.quantity;agent.inventory[stock.item]=(agent.inventory[stock.item]??0)+action.quantity;agent.credits-=cost;state.treasuries[stock.at]!+=cost;
      report(true,'purchased');
    }else{
      if(stock.mode!=='sink'){report(false,'source_does_not_accept_deliveries');continue;}
      if((agent.inventory[stock.item]??0)<action.quantity){report(false,'missing_item');continue;}
      agent.inventory[stock.item]!-=action.quantity;state.stocks[stock.id]!+=action.quantity;progress(agent,'deliver',stock.at,stock.item,action.quantity);report(true,'delivered');
    }
  }
  for(const agent of state.agents){
    const work=agent.work;if(!work)continue;work.remaining--;
    if(work.remaining===0){
      if(work.kind==='move'){agent.at=work.to;outcomes.push({agent:agent.id,kind:'arrived',ok:true,reason:work.to,status:'accepted'});}
      else {const service=s.services.find(v=>v.id===work.service)!;agent.inventory[service.produces]=(agent.inventory[service.produces]??0)+1;progress(agent,'produce',agent.at,service.produces,1);outcomes.push({agent:agent.id,kind:'completed',ok:true,reason:service.id,status:'accepted'});}
      delete agent.work;
    }
  }
  state.step++;state.terminated=s.objectives.every(o=>state.progress[o.id]!>=o.quantity);state.truncated=!state.terminated&&state.step>=s.maxSteps;
  const next={scenario:s,state,records:episode.records};
  const record:Transition={kind:'transition',step:state.step,observations,actions,outcomes,rewards,nextObservations:state.agents.map(a=>recordedObservation(observeAgent(next,a.id))),terminated:state.terminated,truncated:state.truncated};
  return {...next,records:[...episode.records,record]};
}

function nextHop(o:Observation,target:string):string|undefined{
  const distance=new Map(o.locations.map(l=>[l.id,Infinity])),first=new Map<string,string>(),todo=new Set(distance.keys());distance.set(o.self.at,0);
  while(todo.size){const at=[...todo].sort((a,b)=>distance.get(a)!-distance.get(b)!||(a===b?0:a<b?-1:1))[0]!;todo.delete(at);if(at===target)return first.get(at);
    for(const link of o.links){const to=link.from===at?link.to:link.to===at?link.from:undefined;if(!to||!todo.has(to))continue;const d=distance.get(at)!+link.steps;if(d<distance.get(to)!){distance.set(to,d);first.set(to,at===o.self.at?to:first.get(at)!);}}
  }
}
/** A deliberately small baseline, using the same observation/action API available to future policies. */
export function mockAction(o:Observation):AgentAction{
  const agent=o.self.id,wait:AgentAction={agent,kind:'wait'},goal=o.objectives.find(g=>g.progress<g.quantity);
  if(o.self.work||!goal||o.terminated||o.truncated)return wait;
  const move=(at:string):AgentAction=>{const to=nextHop(o,at);return to?{agent,kind:'move',to}:wait;};
  if(goal.kind==='deliver'&&(o.self.inventory[goal.item]??0)>0){
    if(o.self.at!==goal.at)return move(goal.at);
    const stock=o.localStocks.find(s=>s.mode==='sink'&&s.item===goal.item)!;
    return {agent,kind:'deliver',stock:stock.id,quantity:Math.min(goal.quantity-goal.progress,o.self.inventory[goal.item]!)};
  }
  let needed=goal.item,target=goal.at;
  if(goal.kind==='produce'){
    const service=o.services.find(s=>s.produces===goal.item&&s.at===goal.at)!;
    if((o.self.inventory[service.consumes]??0)>0){
      if(o.self.at!==service.at)return move(service.at);
      return o.localServices.find(s=>s.id===service.id)!.active<service.capacity&&o.self.credits>=service.fee?{agent,kind:'use',service:service.id}:wait;
    }
    needed=service.consumes;target=service.at;
  }
  const visited=new Set<string>();
  while(!o.catalog.some(s=>s.mode==='source'&&s.item===needed)){
    if(visited.has(needed))return wait;visited.add(needed);
    const service=o.services.find(s=>s.produces===needed);if(!service)return wait;
    if((o.self.inventory[service.consumes]??0)>0){
      if(o.self.at!==service.at)return move(service.at);
      return o.localServices.find(s=>s.id===service.id)!.active<service.capacity&&o.self.credits>=service.fee?{agent,kind:'use',service:service.id}:wait;
    }
    needed=service.consumes;target=service.at;
  }
  if((o.self.inventory[needed]??0)>0)return move(target);
  const source=o.catalog.find(s=>s.mode==='source'&&s.item===needed&&(s.at!==o.self.at||o.localStocks.find(l=>l.id===s.id)!.quantity>0));if(!source)return wait;
  if(o.self.at!==source.at)return move(source.at);
  const available=o.localStocks.find(s=>s.id===source.id)!.quantity;
  // Goal quantities are delivered in batches; service jobs consume exactly one input per operation.
  const quantity=Math.min(available,o.carryingCapacity-Object.values(o.self.inventory).reduce((a,b)=>a+b,0),source.price?Math.floor(o.self.credits/source.price):100,goal.kind==='deliver'&&needed===goal.item?goal.quantity-goal.progress:1,100);
  return quantity>0?{agent,kind:'take',stock:source.id,quantity}:wait;
}
export function episodeMetrics(e:Episode){
  const completed=e.scenario.objectives.filter(o=>e.state.progress[o.id]!>=o.quantity).length;
  return {steps:e.state.step,completed,total:e.scenario.objectives.length,success:e.state.terminated,truncated:e.state.truncated,violations:e.state.agents.reduce((n,a)=>n+a.violations,0),blocked:e.state.agents.reduce((n,a)=>n+a.blocked,0),creditsSpent:e.scenario.agents.reduce((n,a)=>n+a.budget-e.state.agents.find(v=>v.id===a.id)!.credits,0)};
}
