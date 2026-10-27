import {compareRuns} from './compare-runs';
import type {ComparisonEvidence} from './compare-runs';
import type {SavedRunReport} from './experiment-types';
import {changeCopy,comparisonCopy,humanName} from './workspace-copy';
import {createComparisonHistoryView} from './comparison-history-view';
import {comparisonCsv,comparisonHistoryCsv,csvDownload} from './result-exports';
const text=(tag:string,value='')=>{const node=document.createElement(tag);node.textContent=value;return node;};

/** Refresh values inside a pinned pair without replacing disclosures or controls. */
export function createComparisonView(content:HTMLElement,onEvidence:(evidence:ComparisonEvidence)=>void,onSelect:(step:number|undefined)=>void,replay:HTMLElement){
  let pair='';
  let history:ReturnType<typeof createComparisonHistoryView>;
  const evidenceNodes=new Map<string,HTMLButtonElement>();
  return (left:SavedRunReport,right:SavedRunReport,display:(id:string)=>string)=>{
    const comparison=compareRuns({...left.run,report:left},{...right.run,report:right}),key=left.run.id+'|'+right.run.id;
    if(pair!==key||!content.querySelector('.comparison-headline')){
      pair=key;evidenceNodes.clear();content.replaceChildren();
      const headline=text('p');headline.className='comparison-headline';const changes=text('p');changes.className='comparison-changes small muted';content.append(headline,changes);
      history=createComparisonHistoryView(onSelect);content.append(history.element,replay);
      const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr');for(const value of ['Metric',display(left.run.id),display(right.run.id),'Change']){const cell=text('th',value) as HTMLTableCellElement;cell.scope='col';header.append(cell);}head.append(header);table.append(head,document.createElement('tbody'));
      const scroll=document.createElement('div');scroll.className='table-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Comparison data table');scroll.append(table);
      const more=document.createElement('details');more.className='result-data';more.append(text('summary','Run data'),text('p','Travel, service and waiting sum each agent’s steps.'),scroll);
      const pins=document.createElement('div');pins.className='run-pins';
      for(const report of [left,right]){const pin=document.createElement('div');pin.append(text('p',`${display(report.run.id)} · Setup ${report.run.revision} · Seed ${report.run.seed}`),text('code',report.run.sourceHash));pins.append(pin);}more.append(pins);content.append(more);
      const events=document.createElement('div');events.className='comparison-events';const footer=document.createElement('div');footer.className='report-footer';content.append(events,footer);
    }
    content.querySelector<HTMLElement>('.comparison-error')?.remove();
    content.querySelector('.comparison-headline')!.textContent=comparisonCopy(comparison,display(left.run.id),display(right.run.id));
    const settings=comparison.changes.filter(change=>!change.field.endsWith('seed')).map(changeCopy).join(' · ');
    const live=[left,right].some(report=>report.run.status==='waiting');
    content.querySelector('.comparison-changes')!.textContent=[settings||(!comparison.changes.length?'Same setup':''),comparison.matchedSeed?`Seed ${left.run.seed}`:`Different seeds: ${left.run.seed} → ${right.run.seed}`,live?'Live':''].filter(Boolean).join(' · ');
    history.update(left,right,display);
    const body=content.querySelector('tbody')!;
    for(const [index,metric] of comparison.rows.entries()){
      let row=body.children[index] as HTMLTableRowElement|undefined;
      if(!row){row=document.createElement('tr');const label=text('th',metric.label+(metric.unit==='agent steps'?' (agent steps)':'')) as HTMLTableCellElement;label.scope='row';row.append(label,text('td'),text('td'),text('td'));body.append(row);}
      for(const [i,value] of [metric.baseline??'—',metric.candidate??'—',metric.delta===null?'—':`${metric.delta>0?'+':''}${metric.delta}`].entries())row.children[i+1]!.textContent=String(value);
    }
    for(const evidence of comparison.rows.flatMap(row=>row.evidence)){
      const key=`${evidence.runId}:${evidence.step}:${evidence.outcomeIndex}`;if(evidenceNodes.has(key))continue;
      const button=document.createElement('button');button.type='button';button.className='evidence-link';button.textContent=`${display(evidence.runId)} · Step ${evidence.step} · ${humanName(evidence.agent)}`;button.onclick=()=>onEvidence(evidence);evidenceNodes.set(key,button);content.querySelector('.comparison-events')!.append(button);
    }
    const footer=content.querySelector('.report-footer')!,previous=footer.querySelector<HTMLAnchorElement>('a:not([data-comparison-history])');
    const download=csvDownload(comparisonCsv(comparison,left.run,right.run),'run-comparison.csv','Download comparison CSV',previous??undefined);if(!previous)footer.append(download);
    let timeline=footer.querySelector<HTMLAnchorElement>('[data-comparison-history]');
    if(!timeline){timeline=document.createElement('a');timeline.dataset.comparisonHistory='';footer.append(timeline);}
    csvDownload(comparisonHistoryCsv(left,right),'comparison-timeline.csv','Download comparison timeline CSV',timeline);timeline.className='text-link';timeline.textContent='Timeline CSV';
  };
}
