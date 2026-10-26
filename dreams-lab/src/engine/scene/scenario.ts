import {z} from 'zod';
import {fail,type DreamNode,type Expr} from './dream-syntax';

export const SCENARIO_LIMITS=Object.freeze({scenarios:1,locations:32,links:64,items:32,stocks:64,services:32,agents:8,objectives:32,steps:1000});
const id=z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),quantity=z.number().int().min(1).max(1000),money=z.number().int().min(0).max(100000);
export const scenarioSchema=z.object({
  id,seed:z.number().int().min(0).max(2147483647),maxSteps:z.number().int().min(1).max(SCENARIO_LIMITS.steps),
  items:z.array(z.object({id,label:z.string().min(1).max(100)}).strict()).min(1).max(SCENARIO_LIMITS.items),
  locations:z.array(z.object({id,label:z.string().min(1).max(100),at:z.tuple([z.number().finite().min(0).max(14000),z.number().finite().min(0).max(14000)])}).strict()).min(2).max(SCENARIO_LIMITS.locations),
  links:z.array(z.object({id,from:id,to:id,steps:z.number().int().min(1).max(100)}).strict()).min(1).max(SCENARIO_LIMITS.links),
  stocks:z.array(z.object({id,at:id,item:id,mode:z.enum(['source','sink']),quantity:z.number().int().min(0).max(1000),price:money}).strict()).max(SCENARIO_LIMITS.stocks),
  services:z.array(z.object({id,at:id,consumes:id,produces:id,duration:z.number().int().min(1).max(100),capacity:z.number().int().min(1).max(8),fee:money}).strict()).max(SCENARIO_LIMITS.services),
  agents:z.array(z.object({id,at:id,budget:money,capacity:z.number().int().min(1).max(100)}).strict()).min(1).max(SCENARIO_LIMITS.agents),
  objectives:z.array(z.object({id,agent:id,kind:z.enum(['deliver','produce']),at:id,item:id,quantity}).strict()).min(1).max(SCENARIO_LIMITS.objectives),
}).strict().superRefine((s,ctx)=>{
  const problem=(message:string)=>ctx.addIssue({code:'custom',message});
  const all=[...s.items,...s.locations,...s.links,...s.stocks,...s.services,...s.agents,...s.objectives];
  if(new Set(all.map(v=>v.id)).size!==all.length)problem('scenario declaration IDs must be unique');
  const places=new Set(s.locations.map(v=>v.id)),items=new Set(s.items.map(v=>v.id)),agents=new Set(s.agents.map(v=>v.id));
  for(const v of [...s.stocks,...s.services,...s.agents,...s.objectives])if(!places.has(v.at))problem(`${v.id}: unknown location ${v.at}`);
  for(const v of [...s.stocks,...s.objectives])if(!items.has(v.item))problem(`${v.id}: unknown item ${v.item}`);
  const pairs=new Set<string>();
  for(const v of s.links){
    if(!places.has(v.from)||!places.has(v.to)||v.from===v.to)problem(`${v.id}: link needs two different locations`);
    const pair=[v.from,v.to].sort().join(':');if(pairs.has(pair))problem(`${v.id}: duplicate connection`);pairs.add(pair);
  }
  const reached=new Set([s.locations[0]!.id]);let changed=true;
  while(changed){changed=false;for(const v of s.links)for(const [a,b] of [[v.from,v.to],[v.to,v.from]])if(reached.has(a!)&&!reached.has(b!)){reached.add(b!);changed=true;}}
  if(s.locations.some(v=>!reached.has(v.id)))problem('every scenario location must be connected');
  for(const v of s.stocks)if(v.mode==='sink'&&(v.quantity!==0||v.price!==0))problem(`${v.id}: delivery sinks start empty and cannot sell items`);
  for(const v of s.services)if(!items.has(v.consumes)||!items.has(v.produces)||v.consumes===v.produces)problem(`${v.id}: service needs different existing input/output items`);
  for(const v of s.objectives){
    if(!agents.has(v.agent))problem(`${v.id}: unknown agent ${v.agent}`);
    if(v.kind==='deliver'&&!s.stocks.some(t=>t.at===v.at&&t.item===v.item&&t.mode==='sink'))problem(`${v.id}: delivery needs a matching destination sink`);
    if(v.kind==='produce'&&!s.services.some(t=>t.at===v.at&&t.produces===v.item))problem(`${v.id}: production needs a matching service`);
  }
  for(const v of s.agents)if(!s.objectives.some(o=>o.agent===v.id))problem(`${v.id}: agent needs an objective`);
  // A cyclic recipe cannot bootstrap itself without stock; reject it rather than promise solvability.
  const available=new Set(s.stocks.filter(t=>t.mode==='source'&&t.quantity>0).map(t=>t.item));changed=true;
  while(changed){changed=false;for(const v of s.services)if(available.has(v.consumes)&&!available.has(v.produces)){available.add(v.produces);changed=true;}}
  if(s.objectives.some(v=>!available.has(v.item)))problem('objective item has no stocked source or reachable production chain');
});
export type Scenario=z.infer<typeof scenarioSchema>;

export function compileScenario(node:DreamNode,evaluate:(e:Expr)=>number):Scenario{
  const number=(n:DreamNode,key:string)=>evaluate(n.fields.get(key) as Expr);
  const values={id:node.id,seed:number(node,'seed'),maxSteps:number(node,'max_steps'),items:[] as unknown[],locations:[] as unknown[],links:[] as unknown[],stocks:[] as unknown[],services:[] as unknown[],agents:[] as unknown[],objectives:[] as unknown[]};
  for(const n of node.block!){
    const record:Record<string,unknown>={id:n.id};
    for(const [key,value] of n.fields)record[key]=key==='label' ? value : key==='at'&&n.kind==='location' ? (value as Expr[]).map(evaluate) : ['quantity','price','steps','duration','capacity','fee','budget'].includes(key) ? number(n,key) : (value as Expr).name!;
    const target={item:'items',location:'locations',link:'links',stock:'stocks',service:'services',agent:'agents',objective:'objectives'}[n.kind] as keyof Pick<typeof values,'items'|'locations'|'links'|'stocks'|'services'|'agents'|'objectives'>;
    values[target].push({...record,...(n.kind==='stock'&&!n.fields.has('price') ? {price:0} : {})});
  }
  const parsed=scenarioSchema.safeParse(values);
  if(!parsed.success){
    const issue=parsed.error.issues[0]!,kinds:Record<string,string>={items:'item',locations:'location',links:'link',stocks:'stock',services:'service',agents:'agent',objectives:'objective'};
    const child=typeof issue.path[1]==='number' ? node.block!.filter(n=>n.kind===kinds[String(issue.path[0])])[issue.path[1]] : node.block!.find(n=>issue.message.startsWith(n.id+':'));
    const key=issue.path.at(-1),token=child ? {...child.token,path:child.token.path+(typeof key==='string'?'/'+key:'')} : node.token;
    fail((issue.path.length?issue.path.join('.')+': ':'')+issue.message,token,'E_SCENARIO');
  }
  return parsed.data;
}
