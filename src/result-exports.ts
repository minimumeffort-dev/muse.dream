import type {RunReport} from './report';
import type {RunComparison,ComparableRun} from './compare-runs';

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

export function csvDownload(contents:string,filename:string,label:string,link=document.createElement('a')){
  link.className='btn';link.textContent='Download CSV';link.setAttribute('aria-label',label);
  link.href='data:text/csv;charset=utf-8,'+encodeURIComponent('\ufeff'+contents);link.download=filename;return link;
}
