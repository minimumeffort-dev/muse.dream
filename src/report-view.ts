import {buildRunReport,type EvidenceRef} from './report';
import type {ExperimentRun} from './runner';
import {humanName,reasonCopy,actionCopy} from './workspace-copy';

export function createReportView(element:HTMLElement,onEvidence:(evidence:EvidenceRef)=>void){
  let owner:ExperimentRun|undefined,length=-1;
  return (run:ExperimentRun|undefined,visible:boolean)=>{
    element.hidden=!run?.length||!visible;
    if(!run||owner===run&&length===run.length)return;
    owner=run;length=run.length;
    const report=buildRunReport(run.episodeSnapshot),content=element.querySelector('.report-content')!;
    content.replaceChildren();
    const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr');
    const caption=document.createElement('caption');caption.textContent=`Full recorded run through step ${run.length}. Tasks count each agent’s goals; travel, service and waiting count simulation steps.`;table.append(caption);
    for(const label of ['Agent','Tasks completed','Coins spent','Travelling','Using services','Waiting']){const cell=document.createElement('th');cell.scope='col';cell.textContent=label;header.append(cell);}head.append(header);table.append(head);
    const body=document.createElement('tbody');
    for(const agent of report.agents){
      const row=document.createElement('tr');
      for(const [i,value] of [humanName(agent.agent),`${agent.completed}/${agent.total}`,agent.creditsSpent,agent.steps.travel,agent.steps.service,agent.steps.idle].entries()){
        const cell=document.createElement(i===0?'th':'td');if(i===0)(cell as HTMLTableCellElement).scope='row';cell.textContent=String(value);row.append(cell);
      }body.append(row);
    }table.append(body);content.append(table);
    const findings=document.createElement('div');findings.className='report-findings';
    for(const finding of report.findings){
      const button=document.createElement('button');button.type='button';button.className='evidence-link';
      button.dataset.step=String(finding.step);button.dataset.actor=finding.agent;button.dataset.outcome=String(finding.outcomeIndex);
      button.textContent=`${humanName(finding.agent)}: ${reasonCopy(finding.reason).toLowerCase()} · Step ${finding.step}`;
      button.onclick=()=>{
        onEvidence(finding);
        const record=run.records.find(record=>record.step===finding.step)!,outcome=record.outcomes[finding.outcomeIndex]!;
        const detail=document.createElement('section');detail.className='evidence-detail';detail.tabIndex=-1;
        const heading=document.createElement('h3');heading.textContent=`${humanName(finding.agent)} · Step ${finding.step}`;
        const action=record.actions.find(a=>a.agent===finding.agent),attempt=document.createElement('p'),result=document.createElement('p');
        attempt.textContent=actionCopy(action,run.scenario);result.textContent=reasonCopy(outcome.reason)+'.';
        const technical=document.createElement('details'),summary=document.createElement('summary'),code=document.createElement('pre');
        summary.textContent='Observation, action and outcome';code.className='event-detail';code.tabIndex=0;
        code.textContent=JSON.stringify({step:record.step,observation:record.observations.find(o=>o.self.id===finding.agent),action,outcome,reward:record.rewards[finding.agent]},null,2);
        technical.append(summary,code);detail.append(heading,attempt,result,technical);
        content.querySelector('.evidence-detail')?.remove();content.append(detail);detail.focus();
      };findings.append(button);
    }
    if(!report.findings.length){const clear=document.createElement('p');clear.className='small muted';clear.textContent='No requests were blocked or rejected.';findings.append(clear);}
    if(report.omittedFindings){const more=document.createElement('p');more.className='small muted';more.textContent=`${report.omittedFindings} more events in the export.`;findings.append(more);}
    content.append(findings);
  };
}
