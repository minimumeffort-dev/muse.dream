import {buildRunReport,type EvidenceRef} from './report';
import type {ExperimentRun} from './runner';
import {humanName,reasonCopy,actionCopy} from './workspace-copy';
import {barChart,timeChart} from './result-charts';
import {runCsv,csvDownload} from './result-exports';

export function createReportView(element:HTMLElement,onEvidence:(evidence:EvidenceRef)=>void){
  let owner:ExperimentRun|undefined,length=-1;
  return (run:ExperimentRun|undefined,visible:boolean)=>{
    element.hidden=!run?.length||!visible;
    if(!run||owner===run&&length===run.length)return;
    owner=run;length=run.length;
    const report=buildRunReport(run.episodeSnapshot),content=element.querySelector('.report-content')!;
    content.replaceChildren();
    const scope=document.createElement('p');scope.className='small muted result-scope';scope.textContent=`Full recording · ${run.length} ${run.length===1?'step':'steps'}`;content.append(scope);
    const charts=document.createElement('div');charts.className='result-charts';
    charts.append(barChart('Tasks completed',report.agents.map(agent=>({label:humanName(agent.agent),value:agent.completed,display:`${agent.completed}/${agent.total}`})),Math.max(0,...report.agents.map(agent=>agent.total))),timeChart(report.agents));content.append(charts);
    const data=document.createElement('details');data.className='result-data';const summary=document.createElement('summary');summary.textContent='Data table';data.append(summary);
    const scroll=document.createElement('div');scroll.className='table-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Per-agent results');
    const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr');
    table.setAttribute('aria-label','Per-agent results');
    for(const label of ['Agent','Tasks completed','Coins spent','Travelling','Using services','Waiting','Actions']){const cell=document.createElement('th');cell.scope='col';cell.textContent=label;header.append(cell);}head.append(header);table.append(head);
    const body=document.createElement('tbody');
    for(const agent of report.agents){
      const row=document.createElement('tr');
      for(const [i,value] of [humanName(agent.agent),`${agent.completed}/${agent.total}`,agent.creditsSpent,agent.steps.travel,agent.steps.service,agent.steps.idle,agent.steps.other].entries()){
        const cell=document.createElement(i===0?'th':'td');if(i===0)(cell as HTMLTableCellElement).scope='row';cell.textContent=String(value);row.append(cell);
      }body.append(row);
    }table.append(body);scroll.append(table);data.append(scroll);content.append(data);
    const footer=element.querySelector('.report-footer')!;footer.querySelector('[data-run-csv]')?.remove();
    const download=csvDownload(runCsv(report,{scenario:run.scenario.id,sourceHash:run.manifest.sourceHash,seed:run.scenario.seed}),`${run.scenario.id}-seed-${run.scenario.seed}.csv`,'Download run results CSV');download.dataset.runCsv='';footer.prepend(download);
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
        summary.textContent='Technical record';code.className='event-detail';code.tabIndex=0;
        code.textContent=JSON.stringify({step:record.step,observation:record.observations.find(o=>o.self.id===finding.agent),action,outcome,reward:record.rewards[finding.agent]},null,2);
        technical.append(summary,code);detail.append(heading,attempt,result,technical);
        content.querySelector('.evidence-detail')?.remove();content.append(detail);detail.focus();
      };findings.append(button);
    }
    if(report.omittedFindings){const more=document.createElement('p');more.className='small muted';more.textContent=`${report.omittedFindings} more events in the export.`;findings.append(more);}
    if(findings.childElementCount){const events=document.createElement('details');events.className='result-data';const summary=document.createElement('summary');summary.textContent=`Events · ${report.metrics.blocked+report.metrics.violations}`;events.append(summary,findings);content.append(events);}
  };
}
