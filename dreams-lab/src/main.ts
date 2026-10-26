import {buildFromBrief,compileExperiment,createEpisode,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,type Parameters} from './framework';
import {ExperimentSession} from './runner';
import {ExperimentMap,AGENT_COLORS} from './world-map';

const get=<T extends Element=HTMLElement>(id:string)=>document.querySelector<T>('#'+id)!;
const runButton=get<HTMLButtonElement>('run'),play=get<HTMLButtonElement>('play'),step=get<HTMLButtonElement>('step');
const world=get<HTMLTextAreaElement>('world-brief'),task=get<HTMLTextAreaElement>('task-brief'),source=get<HTMLTextAreaElement>('dream-source');
const sourceMode=get<HTMLButtonElement>('source-mode'),timeline=get<HTMLInputElement>('timeline'),download=get<HTMLAnchorElement>('export');
const error=get('lab-error'),session=new ExperimentSession(),map=new ExperimentMap(get<SVGSVGElement>('experiment-map'));
const fields=['agents','budget','deadline','seed'] as const;
const controls=fields.map(key=>get<HTMLInputElement>('parameter-'+key));
let manual=false,manualDraft='',cursor=0,timer:number|undefined,exportUrl='',exportOwner:unknown,exportLength=-1,capturing=false;
world.value=DEFAULT_WORLD;task.value=DEFAULT_TASK;
controls.forEach((control,i)=>{control.value=String(DEFAULT_PARAMETERS[fields[i]!]);});
const initial=buildFromBrief(world.value,task.value,DEFAULT_PARAMETERS),preview=createEpisode(initial.scenario);
source.value=initial.source;

const text=(element:HTMLElement,value:string)=>{if(element.textContent!==value)element.textContent=value;};
const label=(id:string)=>id.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const parameters=()=>Object.fromEntries(controls.map((control,i)=>[fields[i]!,control.valueAsNumber])) as Parameters;
function showError(message=''){error.hidden=!message;error.textContent=message;}
function stop(){if(timer!==undefined)window.clearInterval(timer);timer=undefined;}
function render(animate=false){
  const run=session.run,scenario=run?.scenario??preview.scenario,state=run?.at(cursor)??preview.state;
  map.draw(scenario,state,animate);
  text(get('experiment-title'),label(scenario.id));
  const status=timer!==undefined?'Running':run&&cursor<run.length?'Replay':state.terminated?'Completed':state.truncated?'Deadline':run?'Paused':'Ready';
  text(get('world-status'),`${scenario.agents.length} ${scenario.agents.length===1?'agent':'agents'} · ${status}`);
  runButton.disabled=session.preparing||capturing;text(get('run-label'),session.preparing?'Preparing…':'Run');
  play.disabled=step.disabled=!run||capturing||session.preparing;sourceMode.disabled=capturing;
  for(const control of [world,task,...controls])control.disabled=manual||capturing;
  source.readOnly=!manual||capturing;
  play.setAttribute('aria-label',timer!==undefined?'Pause':'Play');
  play.innerHTML=timer!==undefined?'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>':'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>';
  timeline.disabled=!run?.length||capturing||session.preparing;timeline.max=String(run?.length??0);timeline.value=String(cursor);
  text(get('step-count'),`${cursor} / ${scenario.maxSteps}`);
  const metrics=run?.metrics(cursor);
  text(get('run-metrics'),metrics?`${metrics.completed}/${metrics.total} tasks · ${metrics.creditsSpent} coins · ${metrics.blocked} blocked · ${metrics.violations} violations`:'');
  get('agent-activity').replaceChildren(...state.agents.map((agent,i)=>{
    const row=document.createElement('div');row.className='activity-person';
    const avatar=document.createElement('span');avatar.className='avatar';avatar.style.background=AGENT_COLORS[i]!;avatar.style.color=i===0?'#171717':'#fafaf7';avatar.textContent=String.fromCharCode(65+i);
    const copy=document.createElement('div'),name=document.createElement('strong'),activity=document.createElement('small'),inventory=document.createElement('small');
    name.textContent=agent.id.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
    const location=(id:string)=>scenario.locations.find(l=>l.id===id)!.label;
    activity.textContent=agent.work?.kind==='move'?`To ${location(agent.work.to)}`:agent.work?.kind==='service'?`${label(agent.work.service)} · ${agent.work.remaining}`:`At ${location(agent.at)}`;
    const items=Object.entries(agent.inventory).filter(([,quantity])=>quantity>0).map(([id,quantity])=>`${quantity} ${scenario.items.find(item=>item.id===id)!.label}`).join(', ');
    inventory.textContent=`${agent.credits} coins${items?' · '+items:''}`;
    copy.append(name,activity,inventory);row.append(avatar,copy);return row;
  }));
  download.hidden=!run?.length||timer!==undefined||capturing;
  if(!download.hidden && run && (exportOwner!==run || exportLength!==run.length)){
    if(exportUrl)URL.revokeObjectURL(exportUrl);
    exportUrl=URL.createObjectURL(new Blob([run.export()],{type:'application/x-ndjson'}));
    exportOwner=run;exportLength=run.length;download.href=exportUrl;download.download=`${run.scenario.id}-seed-${run.scenario.seed}.jsonl`;
  }
  const workspace=get('workspace');workspace.dataset.state=status;workspace.dataset.step=String(cursor);workspace.dataset.runLength=String(run?.length??0);workspace.dataset.sourceHash=run?.manifest.sourceHash??'';
}
function tick(){
  const run=session.run;if(!run){stop();return;}
  if(cursor<run.length)cursor++;
  else if(run.advance())cursor++;
  else stop();
  if(run.ended&&cursor===run.length)stop();
  render(true);
}
function startPlayback(){stop();timer=window.setInterval(tick,250);render();}
runButton.onclick=async()=>{
  stop();session.invalidate();showError();
  try{
    if(!manual && ![world,task,...controls].every(control=>control.reportValidity())){render();return;}
    const candidate=manual?compileExperiment(source.value):buildFromBrief(world.value,task.value,parameters());
    const pending=session.start(candidate.source);render();
    const run=await pending;if(!run)return;
    source.value=candidate.source;cursor=0;render();startPlayback();
  }catch(reason){showError(reason instanceof Error?reason.message:String(reason));}
  finally{render();}
};
play.onclick=()=>{
  const run=session.run;if(!run)return;
  if(timer!==undefined){stop();render();return;}
  if(run.ended&&cursor===run.length)cursor=0;
  startPlayback();
};
step.onclick=()=>{stop();tick();};
timeline.oninput=()=>{stop();cursor=Number(timeline.value);render();};
function changed(){
  session.invalidate();showError();
  if(!manual){try{source.value=buildFromBrief(world.value,task.value,parameters()).source;}catch{/* Run reports invalid draft input without replacing the accepted episode. */}}
  render();
}
for(const control of [world,task,...controls])control.addEventListener('input',changed);
source.oninput=()=>{session.invalidate();showError();render();};
sourceMode.onclick=()=>{
  session.invalidate();showError();
  if(manual)manualDraft=source.value;
  manual=!manual;
  for(const control of [world,task,...controls])control.disabled=manual;
  source.readOnly=!manual;sourceMode.textContent=manual?'Use brief':'Edit';
  if(manual){if(manualDraft)source.value=manualDraft;source.focus();}
  else changed();
  render();
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});
addEventListener('pagehide',()=>{stop();session.invalidate();if(exportUrl)URL.revokeObjectURL(exportUrl);});
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('capture')){
  const capture=document.createElement('button');capture.type='button';capture.className='btn';capture.textContent='Capture frames';
  runButton.parentElement!.prepend(capture);
  capture.onclick=async()=>{
    const run=session.run;if(!run)return;
    stop();showError();capturing=true;capture.disabled=true;capture.textContent='Capturing…';render();
    try{
      const {captureRun}=await import('./capture');
      await captureRun(run,get<SVGSVGElement>('experiment-map'),(step,fraction)=>{
        cursor=step;render();map.draw(run.scenario,run.at(step),false,run.at(Math.max(0,step-1)),fraction);
      });
      capture.textContent='210 frames saved';
    }catch(reason){showError(reason instanceof Error?reason.message:String(reason));capture.textContent='Capture frames';}
    finally{capturing=false;capture.disabled=false;render();}
  };
}
render();
