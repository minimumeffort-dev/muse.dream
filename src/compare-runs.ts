import type {Parameters} from './framework';
import type {EvidenceRef,RunReport} from './report';

export type ComparisonInput={mode:'brief';world:string;task:string;parameters:Parameters;builder?:'scenarios-1'}|{mode:'source';source:string};
export interface ComparisonController {actor:string;kind:string}
export interface ComparableRun {
  id:string;name?:string;experimentId?:string;revision?:number;
  sourceHash:string;seed:number;status?:string;
  config?:{input:ComparisonInput;controllers:readonly ComparisonController[]};
  controllers?:readonly ComparisonController[];parameters?:Parameters;
  metrics:RunReport['metrics'];report?:RunReport;
}
export interface ComparisonChange {field:string;before:string|number|null;after:string|number|null}
export interface ComparisonEvidence extends EvidenceRef {runId:string}
export type ComparisonMetric='completed'|'total'|'partial'|'creditsSpent'|'travel'|'service'|'idle'|'blocked'|'violations'|'steps';
export interface ComparisonRow {
  key:ComparisonMetric;label:string;unit:'tasks'|'coins'|'agent steps'|'requests'|'steps';
  baseline:number|null;candidate:number|null;delta:number|null;evidence:ComparisonEvidence[];
}
const parameters=['agents','budget','deadline','seed'] as const;
const outcome=(run:ComparableRun)=>run.metrics.success?'completed' as const:run.metrics.truncated?'deadline' as const:'partial' as const;
const assignments=(run:ComparableRun)=>[...(run.config?.controllers??run.controllers??[])].sort((a,b)=>a.actor.localeCompare(b.actor)).map(value=>`${value.actor}: ${value.kind}`).join(', ');

/** Compare immutable run facts. Time totals count actor steps, not inference latency. */
export function compareRuns(baseline:ComparableRun,candidate:ComparableRun){
  const changes:ComparisonChange[]=[];
  const change=(field:string,before:string|number|null,after:string|number|null)=>{if(before!==after)changes.push({field,before,after});};
  const left=baseline.config?.input,right=candidate.config?.input;
  if(left&&right){
    change('input.mode',left.mode,right.mode);
    if(left.mode==='brief'&&right.mode==='brief'){
      change('input.world',left.world,right.world);change('input.task',left.task,right.task);
      change('input.builder',left.builder??'delivery-1',right.builder??'delivery-1');
      for(const field of parameters)change(`input.parameters.${field}`,left.parameters[field],right.parameters[field]);
      if(!changes.length&&baseline.sourceHash!==candidate.sourceHash)change('sourceHash',baseline.sourceHash,candidate.sourceHash);
    }else if(baseline.sourceHash!==candidate.sourceHash)change('input.source',baseline.sourceHash,candidate.sourceHash);
  }else{
    if(baseline.parameters&&candidate.parameters)for(const field of parameters)change(`parameters.${field}`,baseline.parameters[field],candidate.parameters[field]);
    if(baseline.sourceHash!==candidate.sourceHash)change('sourceHash',baseline.sourceHash,candidate.sourceHash);
  }
  change('controllers',assignments(baseline),assignments(candidate));
  // Seed is authoritative even when a run's source mode has no numeric parameter form.
  if(baseline.seed!==candidate.seed&&!changes.some(value=>value.field.endsWith('.seed')))change('seed',baseline.seed,candidate.seed);
  const values=(run:ComparableRun):Record<ComparisonMetric,number|null>=>({
    completed:run.metrics.completed,total:run.metrics.total,
    partial:run.report?run.report.agents.reduce((sum,agent)=>sum+agent.partial,0):null,
    creditsSpent:run.metrics.creditsSpent,
    travel:run.report?run.report.agents.reduce((sum,agent)=>sum+agent.steps.travel,0):null,
    service:run.report?run.report.agents.reduce((sum,agent)=>sum+agent.steps.service,0):null,
    idle:run.report?run.report.agents.reduce((sum,agent)=>sum+agent.steps.idle,0):null,
    blocked:run.metrics.blocked,violations:run.metrics.violations,steps:run.metrics.steps,
  });
  const before=values(baseline),after=values(candidate);
  const metrics:[ComparisonMetric,string,ComparisonRow['unit']][]=[
    ['completed','Completed tasks','tasks'],['total','Total tasks','tasks'],['partial','Partially completed tasks','tasks'],
    ['creditsSpent','Coins spent','coins'],['travel','Travel','agent steps'],['service','Service','agent steps'],['idle','Idle','agent steps'],
    ['blocked','Blocked requests','requests'],['violations','Rule violations','requests'],['steps','Simulation steps','steps'],
  ];
  const rows:ComparisonRow[]=metrics.map(([key,label,unit])=>{
    const evidence:ComparisonEvidence[]=[];
    if(key==='blocked'||key==='violations')for(const run of [baseline,candidate]){
      const finding=run.report?.findings.find(value=>value.status===(key==='blocked'?'blocked':'rejected'));
      if(finding)evidence.push({runId:run.id,step:finding.step,agent:finding.agent,outcomeIndex:finding.outcomeIndex});
    }
    return {key,label,unit,baseline:before[key],candidate:after[key],delta:before[key]===null||after[key]===null?null:after[key]-before[key],evidence};
  });
  return {baselineId:baseline.id,candidateId:candidate.id,matchedSeed:baseline.seed===candidate.seed,sameSource:baseline.sourceHash===candidate.sourceHash,
    complete:outcome(baseline)!=='partial'&&outcome(candidate)!=='partial',outcomes:{baseline:outcome(baseline),candidate:outcome(candidate)},changes,rows};
}
export type RunComparison=ReturnType<typeof compareRuns>;
