import type {Scenario} from './framework';
import {humanName} from './workspace-copy';

export interface ScenarioReview {
  objectiveCount:number;
  tasks:{description:string;agents:string[]}[];
  deadline:string;
  budgets:string[];
  stocks:string[];
  services:string[];
  capacities:string[];
  routes:string[];
}

/** Describe the accepted scenario only; no meaning is inferred from a prompt. */
export function scenarioReview(scenario:Scenario):ScenarioReview{
  const location=(id:string)=>scenario.locations.find(value=>value.id===id)!.label;
  const item=(id:string)=>scenario.items.find(value=>value.id===id)!.label;
  const count=(value:number,noun:string)=>`${value.toLocaleString('en')} ${noun}${value===1?'':'s'}`;
  const tasks=new Map<string,{description:string;agents:string[]}[]>();
  for(const objective of scenario.objectives){
    const candidates=scenario.services.filter(service=>service.at===objective.at&&service.produces===objective.item);
    const description=objective.kind==='deliver'
      ?`Deliver ${objective.quantity} ${item(objective.item)} to ${location(objective.at)}`
      :candidates.length===1
        ?`Complete ${count(objective.quantity,humanName(candidates[0]!.id))} at ${location(objective.at)}`
        :`Produce ${objective.quantity} ${item(objective.item)} at ${location(objective.at)}`;
    const key=JSON.stringify([objective.kind,objective.at,objective.item,objective.quantity]);
    const agent=humanName(objective.agent),groups=tasks.get(key)??[];
    let group=groups.find(value=>!value.agents.includes(agent));
    if(!group){group={description,agents:[]};groups.push(group);tasks.set(key,groups);}
    group.agents.push(agent);
  }
  const groups=(get:(agent:Scenario['agents'][number])=>number,describe:(value:number)=>string)=>{
    const grouped=new Map<number,string[]>();
    for(const agent of scenario.agents){const value=get(agent),names=grouped.get(value)??[];names.push(humanName(agent.id));grouped.set(value,names);}
    return [...grouped].map(([value,names])=>`${names.join(', ')}: ${describe(value)}${names.length>1?' each':''}`);
  };
  const prices=scenario.stocks.some(stock=>stock.mode==='source'&&stock.price>0)||scenario.services.some(service=>service.fee>0);
  return {
    objectiveCount:scenario.objectives.length,
    tasks:[...tasks.values()].flat(),
    deadline:`Time limit: ${count(scenario.maxSteps,'simulation step')}`,
    budgets:prices?groups(agent=>agent.budget,value=>`${count(value,'coin')} starting budget`):[],
    stocks:scenario.stocks.filter(stock=>stock.mode==='source').map(stock=>`${item(stock.item)} at ${location(stock.at)}: ${stock.quantity.toLocaleString('en')} available at the start · ${stock.price===0?'free':count(stock.price,'coin')+' each'}`),
    services:scenario.services.map(service=>`${humanName(service.id)} at ${location(service.at)}: ${service.capacity} at a time · ${count(service.duration,'step')} · uses 1 ${item(service.consumes)} and produces 1 ${item(service.produces)} · ${service.fee===0?'free':count(service.fee,'coin')+' per use'}`),
    capacities:groups(agent=>agent.capacity,value=>`can carry ${count(value,'item')}`),
    routes:scenario.links.map(link=>`${location(link.from)} ↔ ${location(link.to)}: ${count(link.steps,'step')}`),
  };
}
