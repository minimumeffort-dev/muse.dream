import type {RunReport} from './report';
import type {RunComparison,ComparableRun} from './compare-runs';
import {historyPointAt,type HistoryPoint} from './run-history';
import type {SavedRunReport} from './experiment-types';

/** Quote text and neutralize spreadsheet formulas, while retaining numeric cells. */
export function csv(rows:readonly (readonly (string|number|null)[])[]){
  return rows.map(row=>row.map(value=>{
    if(value===null)return '';
    if(typeof value==='number')return String(value);
    const safe=/^[\s]*[=+@-]/.test(value)?"'"+value:value;
    return '"'+safe.replaceAll('"','""')+'"';
  }).join(',')).join('\r\n')+'\r\n';
}

export function runCsv(report:RunReport,pin:{scenario:string;sourceHash:string;seed:number}){
  return csv([
    ['scenario','source_hash','seed','recorded_steps','outcome','agent','tasks_completed','total_tasks','partial_tasks','coins_spent','travel_steps','service_steps','waiting_steps','other_steps','blocked_requests','rejected_requests'],
    ...report.agents.map(agent=>[pin.scenario,pin.sourceHash,pin.seed,report.metrics.steps,report.metrics.success?'completed':report.metrics.truncated?'deadline':'partial',agent.agent,agent.completed,agent.total,agent.partial,agent.creditsSpent,agent.steps.travel,agent.steps.service,agent.steps.idle,agent.steps.other,agent.blocked,agent.rejected]),
  ]);
}

export function comparisonCsv(comparison:RunComparison,left:Pick<ComparableRun,'id'|'sourceHash'|'seed'>,right:Pick<ComparableRun,'id'|'sourceHash'|'seed'>){
  return csv([
    ['metric','unit','baseline_run','baseline_source_hash','baseline_seed','baseline_outcome','baseline_value','candidate_run','candidate_source_hash','candidate_seed','candidate_outcome','candidate_value','change'],
    ...comparison.rows.map(row=>[row.key,row.unit,left.id,left.sourceHash,left.seed,comparison.outcomes.baseline,row.baseline,right.id,right.sourceHash,right.seed,comparison.outcomes.candidate,row.candidate,row.delta]),
  ]);
}

export function historyCsv(points:readonly HistoryPoint[],pin:{scenario:string;sourceHash:string;seed:number;outcome:'partial'|'completed'|'deadline'}){
  return csv([
    ['scenario','source_hash','seed','recorded_steps','snapshot_outcome','step','tasks_completed','coins_spent','waiting_agent_steps'],
    ...points.map(point=>[pin.scenario,pin.sourceHash,pin.seed,points.at(-1)!.step,pin.outcome,point.step,point.completed,point.spent,point.waiting]),
  ]);
}

export function comparisonHistoryCsv(left:SavedRunReport,right:SavedRunReport){
  const outcome=(report:SavedRunReport)=>report.metrics.success?'completed':report.metrics.truncated?'deadline':'partial';
  const pins=[left.run.id,left.run.sourceHash,left.run.seed,left.metrics.steps,outcome(left),right.run.id,right.run.sourceHash,right.run.seed,right.metrics.steps,outcome(right)];
  return csv([
    ['baseline_run','baseline_source_hash','baseline_seed','baseline_recorded_steps','baseline_snapshot_outcome','candidate_run','candidate_source_hash','candidate_seed','candidate_recorded_steps','candidate_snapshot_outcome','step','baseline_tasks_completed','candidate_tasks_completed','tasks_change','baseline_coins_spent','candidate_coins_spent','coins_change','baseline_waiting_agent_steps','candidate_waiting_agent_steps','waiting_change'],
    ...Array.from({length:Math.max(left.metrics.steps,right.metrics.steps)+1},(_,step)=>{
      const before=historyPointAt(left.history,step),after=historyPointAt(right.history,step);
      return [...pins,step,...(['completed','spent','waiting'] as const).flatMap(key=>[before?.[key]??null,after?.[key]??null,before&&after?after[key]-before[key]:null])];
    }),
  ]);
}

export function csvDownload(contents:string,filename:string,label:string,link=document.createElement('a')){
  link.className='btn';link.textContent='Download CSV';link.setAttribute('aria-label',label);
  link.href='data:text/csv;charset=utf-8,'+encodeURIComponent('\ufeff'+contents);link.download=filename;return link;
}
