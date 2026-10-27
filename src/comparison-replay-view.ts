import type {RunSummary} from './experiment-types';
import type {ExperimentRun} from './runner';
import {actionCopy,humanName,reasonCopy} from './workspace-copy';
import {AGENT_COLORS} from './world-map';

type ReplayEntry={summary:RunSummary;label:string;result:{run:ExperimentRun;step:number}|undefined;error?:boolean};
const node=(tag:string,className='',text='')=>{const element=document.createElement(tag);element.className=className;element.textContent=text;return element;};

/** Two recorded states share a selected step; only Open run changes the 3D replay. */
export function createComparisonReplayView(onOpen:(runId:string,step:number)=>void){
  const element=node('section','comparison-replay');element.hidden=true;element.setAttribute('aria-label','Agents at selected step');
  const heading=node('h3','comparison-replay-heading'),columns=node('div','comparison-replay-columns'),announcement=node('span','sr-only');announcement.setAttribute('role','status');element.append(heading,columns,announcement);
  let currentStep:number|undefined,settled=false,currentLabels='';
  const panels=['baseline','candidate'].map(tone=>{
    const panel=node('section','comparison-replay-panel '+tone),header=node('div','comparison-replay-header'),label=node('h4'),open=document.createElement('button');
    const status=node('p','small muted comparison-replay-status'),agents=node('div','comparison-replay-agents');
    open.type='button';open.className='btn comparison-replay-open';open.textContent='Open run';open.disabled=true;
    let target:{id:string;step:number}|undefined;
    open.onclick=()=>{if(target)onOpen(target.id,target.step);};
    header.append(label,open);panel.append(header,status,agents);columns.append(panel);
    return {panel,label,open,status,agents,setTarget(value:typeof target){target=value;open.disabled=!value;}};
  });
  return {
    element,
    loading(step:number,labels:[string,string]){
      element.hidden=false;heading.textContent=`Agents · Step ${step}`;
      const labelsKey=labels.join('|');if(currentStep===step&&currentLabels===labelsKey&&settled)return;
      currentStep=step;currentLabels=labelsKey;settled=false;announcement.textContent=`Loading agent activity for step ${step}.`;
      panels.forEach((panel,index)=>{panel.label.textContent=labels[index]!;panel.panel.setAttribute('aria-label',labels[index]!);panel.open.setAttribute('aria-label',`Open ${labels[index]} at step ${step}`);panel.setTarget(undefined);panel.status.textContent='Loading…';panel.agents.replaceChildren();});
    },
    show(step:number,entries:[ReplayEntry,ReplayEntry]){
      currentStep=step;currentLabels=entries.map(entry=>entry.label).join('|');settled=!entries.some(entry=>entry.error);element.hidden=false;heading.textContent=`Agents · Step ${step}`;
      entries.forEach((entry,index)=>{
        const panel=panels[index]!;panel.label.textContent=entry.label;panel.panel.setAttribute('aria-label',entry.label);panel.open.setAttribute('aria-label',`Open ${entry.label} at step ${step}`);
        const result=entry.result;
        if(!result||result.step!==step||step>result.run.length){
          panel.setTarget(undefined);panel.status.textContent=entry.error?'Could not load this run. Select the step again to retry.':`Step ${step} is not recorded in this run.`;panel.agents.replaceChildren();return;
        }
        const {run}=result,state=run.at(step),record=run.records[step-1],before=step?run.at(step-1):undefined;
        const location=(id:string)=>run.scenario.locations.find(place=>place.id===id)?.label??humanName(id);
        panel.setTarget({id:entry.summary.id,step});panel.status.textContent=step===0?'Starting positions':'';
        const rows=state.agents.map((agent,i)=>{
          const row=node('div','comparison-replay-agent'),avatar=node('span','avatar',String.fromCharCode(65+i)),copy=node('div','comparison-replay-copy'),name=node('strong','',humanName(agent.id));avatar.setAttribute('aria-hidden','true');avatar.style.background=AGENT_COLORS[i]!;avatar.style.color=i===0?'#171717':'#fafaf7';
          const position=agent.work?.kind==='move'?`Travelling to ${location(agent.work.to)}`:agent.work?.kind==='service'?`Using service · ${agent.work.remaining} ${agent.work.remaining===1?'step':'steps'} left`:`At ${location(agent.at)}`;
          const activity=node('span','comparison-replay-place',position);copy.append(name,activity);
          if(record){
            const action=record.actions.find(value=>value.agent===agent.id),previous=before?.agents.find(value=>value.id===agent.id),outcomes=record.outcomes.filter(value=>value.agent===agent.id);
            const description=action?.kind==='wait'&&previous?.work?`Continuing ${previous.work.kind==='move'?'travel':'service'}.`:actionCopy(action,run.scenario);
            const accepted:Record<string,string>={travel_started:'Travel started',service_started:'Service started',purchased:'Purchase completed',delivered:'Delivery completed'};
            const outcome=outcomes.filter(value=>value.kind!=='wait').map(value=>value.kind==='arrived'?`Arrived at ${location(value.reason)}`:value.kind==='completed'?`Completed ${humanName(value.reason)}`:accepted[value.reason]??reasonCopy(value.reason)).join(' · ');
            copy.append(node('span','comparison-replay-action',description+(outcome?' '+outcome+'.':'')));
          }
          row.append(avatar,copy);return row;
        });
        panel.agents.replaceChildren(...rows);
      });
      const message=entries.some(entry=>entry.error)?`Some agent activity for step ${step} could not be loaded.`:`Agent activity for step ${step} is ready below the charts.`;
      if(announcement.textContent!==message)announcement.textContent=message;
    },
    clear(){currentStep=undefined;currentLabels='';settled=false;element.hidden=true;announcement.textContent='';panels.forEach(panel=>{panel.setTarget(undefined);panel.agents.replaceChildren();});},
  };
}
