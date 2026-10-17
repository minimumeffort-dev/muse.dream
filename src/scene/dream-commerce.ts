import {economySchema} from './commerce';
import {DREAM_V2_COMMANDS} from './dream-contract';
import {fail,type DreamNode,type Expr} from './dream-syntax';

export function compileEconomy(node:DreamNode,number:(e:Expr)=>number){
 const fields=(n:DreamNode)=>Object.fromEntries([...n.fields].map(([key,value])=>[key==='drain_s' ? 'drainPerS' : key,
  DREAM_V2_COMMANDS[n.kind]!.fields[key]!.replace(/\?$/,'')==='n' ? number(value as Expr) : typeof value==='object' ? (value as Expr).name : value]));
 const groups={goods:'good',accounts:'account',markets:'market',jobs:'work',deliveries:'delivery',repairs:'repair'};
 const result=economySchema.safeParse(Object.fromEntries(Object.entries(groups).map(([key,kind])=>[key,node.block!.filter(n=>n.kind===kind).map(n=>({id:n.id,...fields(n),...(n.block ? {lots:n.block.map(l=>({id:l.id,...fields(l)}))} : {})}))])));
 if(!result.success){
  const issue=result.error.issues[0]!,[group,index,inner,child]=issue.path;
  let focus=typeof group==='string' && typeof index==='number' ? node.block!.filter(n=>n.kind===groups[group as keyof typeof groups])[index]??node : node;
  if(inner==='lots' && typeof child==='number')focus=focus.block?.[child]??focus;
  const key=issue.path.at(-1),field=key==='drainPerS' ? 'drain_s' : key;
  fail(issue.message,typeof field==='string' && focus.fields.has(field) ? {...focus.token,path:`${focus.token.path}/${field}`} : focus.token,'E_ECONOMY');
 }
 return result.data;
}
