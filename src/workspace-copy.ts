import type {RunReport} from './report';
import type {ComparisonChange,RunComparison} from './compare-runs';
import type {Scenario} from './framework';
import type {AgentAction} from './engine/sim/episode';

export const humanName=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const unit=(count:number,singular:string)=>`${count} ${singular}${count===1?'':'s'}`;
export function taskCopy(scenario:Scenario){
  const tasks=[...new Set(scenario.objectives.map(goal=>{
    const at=scenario.locations.find(location=>location.id===goal.at)!.label,item=scenario.items.find(item=>item.id===goal.item)!.label;
    return goal.kind==='deliver'?`Deliver ${goal.quantity} ${item} to ${at}.`:`Complete ${unit(goal.quantity,'service visit')} at ${at}.`;
  }))];
  return tasks.slice(0,3).join(' ')+(tasks.length>3?` Plus ${unit(tasks.length-3,'other task')}.`:'');
}
export function outcomeCopy(metrics:RunReport['metrics']){
  return {
    heading:metrics.success?`All ${unit(metrics.total,'task')} completed`:metrics.truncated?'Time limit reached':`${metrics.completed} of ${unit(metrics.total,'task')} completed`,
    detail:`${metrics.truncated?`${metrics.completed} of ${metrics.total} tasks completed. `:''}${unit(metrics.creditsSpent,'coin')} spent in ${unit(metrics.steps,'simulation step')}.`,
    next:metrics.success?'Change a condition and run again to see what happens.':metrics.truncated?'Some tasks are unfinished. Inspect the results, or change the conditions and try again.':'Follow the agents, or pause to inspect a step.',
  };
}
const reasons:Record<string,string>={
  busy:'The agent was already busy',no_link:'There was no route to that destination',service_not_here:'The service was at a different location',
  service_full:'The service was busy',missing_input:'The required supply was missing',insufficient_funds:'The agent did not have enough coins',
  stock_not_here:'The stock was at a different location',sink_is_delivery_only:'This location only accepts deliveries',
  insufficient_stock:'There was not enough stock',inventory_full:'The agent could not carry any more',
  source_does_not_accept_deliveries:'This location does not accept deliveries',missing_item:'The agent did not have the item to deliver',
};
export const reasonCopy=(reason:string)=>reasons[reason]??humanName(reason);
export function actionCopy(action:AgentAction|undefined,scenario:Scenario){
  if(!action)return 'No action was recorded.';
  const location=(id:string)=>scenario.locations.find(l=>l.id===id)?.label??humanName(id);
  if(action.kind==='wait')return 'The agent waited.';
  if(action.kind==='move')return `Tried to travel to ${location(action.to)}.`;
  if(action.kind==='use'){
    const service=scenario.services.find(s=>s.id===action.service);
    return `Tried to use ${humanName(action.service)}${service?' at '+location(service.at):''}.`;
  }
  const stock=scenario.stocks.find(s=>s.id===action.stock),item=scenario.items.find(i=>i.id===stock?.item);
  return `Tried to ${action.kind==='take'?'collect':'deliver'} ${action.quantity} ${item?.label??'items'}${stock?' at '+location(stock.at):''}.`;
}
export function changeCopy(change:ComparisonChange){
  if(change.field==='input.source'||change.field==='sourceHash')return 'World rules changed';
  if(change.field==='input.builder')return 'Scenario builder updated';
  if(change.field==='input.world')return 'World description changed';
  if(change.field==='input.task')return 'Task changed';
  if(change.field==='controllers')return 'Agent assignments changed';
  if(change.field==='input.mode')return 'Setup switched between a scenario and custom rules';
  const key=change.field.split('.').at(-1)!,labels:Record<string,string>={agents:'Team size',budget:'Budget per agent',deadline:'Time limit',seed:'Random seed'};
  return `${labels[key]??humanName(key)}: ${change.before??'not set'} → ${change.after??'not set'}`;
}
export function comparisonCopy(comparison:RunComparison,left:string,right:string){
  if(!comparison.complete)return 'Comparison in progress. One or both runs are unfinished.';
  const completed=comparison.rows.find(row=>row.key==='completed')!,total=comparison.rows.find(row=>row.key==='total')!;
  if(total.baseline!==total.candidate)return `${left}: ${completed.baseline}/${total.baseline} tasks. ${right}: ${completed.candidate}/${total.candidate} tasks.`;
  if(completed.delta===null)return 'Compare the recorded outcomes below.';
  if(completed.delta===0)return `Both runs completed ${completed.baseline} of ${total.baseline} tasks.`;
  return `${right} completed ${Math.abs(completed.delta)} ${completed.delta>0?'more':'fewer'} task${Math.abs(completed.delta)===1?'':'s'} than ${left}.`;
}
