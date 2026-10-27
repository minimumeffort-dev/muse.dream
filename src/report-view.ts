import {buildRunReport,type EvidenceRef} from './report';
import type {ExperimentRun} from './runner';
import {humanName,reasonCopy,actionCopy} from './workspace-copy';
import {barChart,timeChart} from './result-charts';
import {runCsv,historyCsv,csvDownload} from './result-exports';
import {createRunHistoryView} from './run-history-view';

export function createReportView(element:HTMLElement,onEvidence:(evidence:EvidenceRef)=>void,onSeek:(step:number)=>void){
  let owner:ExperimentRun|undefined,length=-1;
  let history:ReturnType<typeof createRunHistoryView>|undefined;
  return (run:ExperimentRun|undefined,live:boolean,cursor:number)=>{
    element.hidden=!run;
    if(!run)return;
    const content=element.querySelector('.report-content')!;
    if(owner!==run){
      owner=run;length=-1;content.replaceChildren();
      const scope=document.createElement('p');scope.className='small muted result-scope';content.append(scope);
      history=createRunHistoryView(run,onSeek);content.append(history.element);
      const agents=document.createElement('details');agents.className='result-data agent-charts';const agentSummary=document.createElement('summary');agentSummary.textContent='By agent';
      const charts=document.createElement('div');charts.className='result-charts';charts.append(barChart('Tasks completed',[]),timeChart([]));agents.append(agentSummary,charts);content.append(agents);
      const data=document.createElement('details');data.className='result-data';const summary=document.createElement('summary');summary.textContent='Data table';data.append(summary);
      const scroll=document.createElement('div');scroll.className='table-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Per-agent results');
      const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr');table.setAttribute('aria-label','Per-agent results');
      for(const label of ['Agent','Tasks completed','Coins spent','Travelling','Using services','Waiting','Actions']){const cell=document.createElement('th');cell.scope='col';cell.textContent=label;header.append(cell);}head.append(header);table.append(head,document.createElement('tbody'));scroll.append(table);data.append(scroll);content.append(data);
      const events=document.createElement('details');events.className='result-data report-events';const findings=document.createElement('div');findings.className='report-findings';const more=document.createElement('p');more.className='small muted omitted-events';events.append(document.createElement('summary'),findings,more);content.append(events);
    }
    content.querySelector('.result-scope')!.textContent=`${run.ended?'Full recording':live?'Live results':'Recorded so far'} · ${run.length} ${run.length===1?'step':'steps'}`;
    history!.update(cursor);
    if(length===run.length)return;
    length=run.length;
    const report=buildRunReport(run.episodeSnapshot),charts=content.querySelectorAll<HTMLElement>('.result-chart');
    barChart('Tasks completed',report.agents.map(agent=>({label:humanName(agent.agent),value:agent.completed,display:`${agent.completed}/${agent.total}`})),Math.max(0,...report.agents.map(agent=>agent.total)),charts[0]);timeChart(report.agents,charts[1]);
    const body=content.querySelector('tbody')!;
    for(const [index,agent] of report.agents.entries()){
      let row=body.children[index] as HTMLTableRowElement|undefined;
      if(!row){row=document.createElement('tr');for(let i=0;i<7;i++){const cell=document.createElement(i===0?'th':'td');if(i===0)(cell as HTMLTableCellElement).scope='row';row.append(cell);}body.append(row);}
      for(const [i,value] of [humanName(agent.agent),`${agent.completed}/${agent.total}`,agent.creditsSpent,agent.steps.travel,agent.steps.service,agent.steps.idle,agent.steps.other].entries())row.children[i]!.textContent=String(value);
    }
    const footer=element.querySelector('.report-footer')!,previous=footer.querySelector<HTMLAnchorElement>('[data-run-csv]');
    const download=csvDownload(runCsv(report,{scenario:run.scenario.id,sourceHash:run.manifest.sourceHash,seed:run.scenario.seed}),`${run.scenario.id}-seed-${run.scenario.seed}.csv`,'Download run results CSV',previous??undefined);download.dataset.runCsv='';if(!previous)footer.prepend(download);
    const previousHistory=footer.querySelector<HTMLAnchorElement>('[data-history-csv]');
    const timeline=csvDownload(historyCsv(history!.history.points,{scenario:run.scenario.id,sourceHash:run.manifest.sourceHash,seed:run.scenario.seed,outcome:report.metrics.success?'completed':report.metrics.truncated?'deadline':'partial'}),`${run.scenario.id}-seed-${run.scenario.seed}-history.csv`,'Download timeline CSV',previousHistory??undefined);timeline.className='text-link';timeline.textContent='Timeline CSV';timeline.dataset.historyCsv='';if(!previousHistory)download.after(timeline);
    const events=content.querySelector<HTMLElement>('.report-events')!,findings=events.querySelector('.report-findings')!;
    events.hidden=!report.findings.length;events.querySelector('summary')!.textContent=`Events · ${report.metrics.blocked+report.metrics.violations}`;
    for(const finding of report.findings.slice(findings.children.length)){
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
    const more=events.querySelector<HTMLElement>('.omitted-events')!;more.hidden=!report.omittedFindings;more.textContent=`${report.omittedFindings} more events in the full run export.`;
  };
}
