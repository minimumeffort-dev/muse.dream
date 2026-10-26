import {episodeMetrics,type Episode,type Outcome} from './engine/sim/episode';

export interface EvidenceRef {step:number;agent:string;outcomeIndex:number}
export interface RunFinding extends EvidenceRef {status:'blocked'|'rejected';reason:string}
export interface ReasonSummary {status:RunFinding['status'];reason:string;count:number;evidence:EvidenceRef}
export interface AgentReport {
  agent:string;completed:number;total:number;partial:number;creditsSpent:number;
  steps:{travel:number;service:number;idle:number;other:number};
  objectives:{id:string;kind:'deliver'|'produce';at:string;item:string;progress:number;quantity:number}[];
  blocked:number;rejected:number;reasons:ReasonSummary[];
}
const FINDING_LIMIT=64;

/** Findings reference recorded outcomes; elapsed work includes its initiating transition. */
export function buildRunReport(episode:Episode){
  const findings:RunFinding[]=[];
  let findingCount=0;
  const agents:AgentReport[]=episode.scenario.agents.map(spec=>{
    const actor=episode.state.agents.find(agent=>agent.id===spec.id)!;
    const objectives=episode.scenario.objectives.filter(goal=>goal.agent===spec.id).map(goal=>({id:goal.id,kind:goal.kind,at:goal.at,item:goal.item,quantity:goal.quantity,progress:episode.state.progress[goal.id]!}));
    const steps={travel:0,service:0,idle:0,other:0},reasons:ReasonSummary[]=[];
    for(const record of episode.records){
      const work=record.observations.find(observation=>observation.self.id===spec.id)!.self.work;
      const outcomes=record.outcomes.filter(outcome=>outcome.agent===spec.id);
      if(work?.kind==='move'||outcomes.some(outcome=>outcome.status==='accepted'&&outcome.reason==='travel_started'))steps.travel++;
      else if(work?.kind==='service'||outcomes.some(outcome=>outcome.status==='accepted'&&outcome.reason==='service_started'))steps.service++;
      else if(outcomes.some(outcome=>outcome.status==='accepted'&&outcome.kind==='wait'))steps.idle++;
      else steps.other++;
      record.outcomes.forEach((outcome:Outcome,outcomeIndex:number)=>{
        if(outcome.agent!==spec.id||outcome.status==='accepted')return;
        const evidence={step:record.step,agent:spec.id,outcomeIndex};
        const existing=reasons.find(reason=>reason.status===outcome.status&&reason.reason===outcome.reason);
        if(existing)existing.count++;
        else reasons.push({status:outcome.status,reason:outcome.reason,count:1,evidence});
        // Retain the first events in chronological order after aggregating all counts.
        findingCount++;
        findings.push({...evidence,status:outcome.status,reason:outcome.reason});
      });
    }
    return {agent:spec.id,completed:objectives.filter(goal=>goal.progress>=goal.quantity).length,total:objectives.length,
      partial:objectives.filter(goal=>goal.progress>0&&goal.progress<goal.quantity).length,creditsSpent:spec.budget-actor.credits,
      steps,objectives,blocked:actor.blocked,rejected:actor.violations,reasons};
  });
  findings.sort((a,b)=>a.step-b.step||a.outcomeIndex-b.outcomeIndex);
  return {version:1 as const,metrics:episodeMetrics(episode),agents,findings:findings.slice(0,FINDING_LIMIT),omittedFindings:Math.max(0,findingCount-FINDING_LIMIT)};
}
export type RunReport=ReturnType<typeof buildRunReport>;
