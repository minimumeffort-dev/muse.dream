import {economySchema} from './commerce';
import {DREAM_V2_COMMANDS} from './dream-contract';
import {fail,type DreamNode,type Expr} from './dream-syntax';

export function compileEconomy(node:DreamNode,number:(e:Expr)=>number){
 const fields=(n:DreamNode):Record<string,unknown>=>Object.fromEntries([...n.fields].map(([key,value])=>[key==='drain_s' ? 'drainPerS' : key,
  DREAM_V2_COMMANDS[n.kind]!.fields[key]!.replace(/\?$/,'')==='company_need' ? fields(value as DreamNode) : DREAM_V2_COMMANDS[n.kind]!.fields[key]!.replace(/\?$/,'')==='n' ? number(value as Expr) : Array.isArray(value) ? key==='rest' ? {x:number(value[0] as Expr),y:number(value[1] as Expr)} : value.map(v=>DREAM_V2_COMMANDS[n.kind]!.fields[key]!.replace(/\?$/,'').match(/^v[23]$/) ? number(v as Expr) : (v as Expr).name) : typeof value==='object' ? (value as Expr).name : value]));
 const groups={gestures:'gesture',stations:'station',goods:'good',accounts:'account',markets:'market',jobs:'work',deliveries:'delivery',repairs:'repair',milestones:'milestone',meals:'meal',shifts:'shift',socials:'social',rations:'ration',rests:'rest'};
 const result=economySchema.safeParse(Object.fromEntries(Object.entries(groups).filter(([key])=>!['rations','rests','stations','gestures'].includes(key) || node.block!.some(n=>n.kind===groups[key as keyof typeof groups])).map(([key,kind])=>[key,node.block!.filter(n=>n.kind===kind).map(n=>({id:n.id,...fields(n),...(n.block ? n.kind==='work' ? {ingredients:n.block.map(fields)} : n.kind==='gesture' ? {keys:n.block.map(fields)} : {lots:n.block.map(l=>({id:l.id,...fields(l)}))} : {})}))])));
 if(!result.success){
  const issue=result.error.issues[0]!,[group,index,inner,child]=issue.path;
  let focus=typeof group==='string' && typeof index==='number' ? node.block!.filter(n=>n.kind===groups[group as keyof typeof groups])[index]??node : node;
  if(inner==='company')focus=focus.fields.get('company') as DreamNode??focus;
  if((inner==='lots' || inner==='ingredients' || inner==='keys') && typeof child==='number')focus=focus.block?.[child]??focus;
  const key=inner==='hours' || inner==='rest' || inner==='attendance' ? inner : issue.path.at(-1),field=key==='drainPerS' ? 'drain_s' : key;
  fail(issue.message,typeof field==='string' && focus.fields.has(field) ? {...focus.token,path:`${focus.token.path}/${field}`} : focus.token,'E_ECONOMY');
 }
 return result.data;
}
