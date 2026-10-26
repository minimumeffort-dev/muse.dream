import {buildRunReport,type EvidenceRef} from './report';
import type {ExperimentRun} from './runner';

export function createReportView(element:HTMLElement,onEvidence:(evidence:EvidenceRef)=>void){
  let owner:ExperimentRun|undefined,length=-1;
  const title=(text:string)=>text.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
  return (run:ExperimentRun|undefined,visible:boolean)=>{
    element.hidden=!run?.length||!visible;
    if(!run||owner===run&&length===run.length)return;
    owner=run;length=run.length;
    const report=buildRunReport(run.episodeSnapshot),content=element.querySelector('.report-content')!;
    content.replaceChildren();
    const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr');
    for(const label of ['Agent','Tasks','Coins','Travel','Service','Idle']){const cell=document.createElement('th');cell.scope='col';cell.textContent=label;header.append(cell);}head.append(header);table.append(head);
    const body=document.createElement('tbody');
    for(const agent of report.agents){
      const row=document.createElement('tr');
      for(const [i,value] of [title(agent.agent),`${agent.completed}/${agent.total}`,agent.creditsSpent,agent.steps.travel,agent.steps.service,agent.steps.idle].entries()){
        const cell=document.createElement(i===0?'th':'td');if(i===0)(cell as HTMLTableCellElement).scope='row';cell.textContent=String(value);row.append(cell);
      }body.append(row);
    }table.append(body);content.append(table);
    const findings=document.createElement('div');findings.className='report-findings';
    for(const finding of report.findings){
      const button=document.createElement('button');button.type='button';button.className='evidence-link';
      button.textContent=`Step ${finding.step} · ${title(finding.agent)} · ${title(finding.reason)}`;
      button.onclick=()=>{
        onEvidence(finding);
        const record=run.records.find(record=>record.step===finding.step)!,outcome=record.outcomes[finding.outcomeIndex]!;
        const detail=document.createElement('pre');detail.className='event-detail';detail.tabIndex=0;
        detail.textContent=JSON.stringify({step:record.step,observation:record.observations.find(o=>o.self.id===finding.agent),action:record.actions.find(a=>a.agent===finding.agent),outcome,reward:record.rewards[finding.agent]},null,2);
        content.querySelector('.event-detail')?.remove();content.append(detail);detail.focus();
      };findings.append(button);
    }
    if(!report.findings.length){const clear=document.createElement('p');clear.className='small muted';clear.textContent='No blocked requests or rule violations.';findings.append(clear);}
    if(report.omittedFindings){const more=document.createElement('p');more.className='small muted';more.textContent=`${report.omittedFindings} more events in the export.`;findings.append(more);}
    content.append(findings);
  };
}
