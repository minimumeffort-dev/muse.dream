import {buildFromBrief,compileExperiment,createEpisode,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,type Parameters} from './framework';
import {ExperimentSession} from './runner';
import {AGENT_COLORS} from './world-map';
import {ExperimentWorld} from './world-view';
import {STEP_MS} from './scene-plan';
import {HostView} from './host-view';
import {createReportView} from './report-view';

const get=<T extends Element=HTMLElement>(id:string)=>document.querySelector<T>('#'+id)!;
const runButton=get<HTMLButtonElement>('run'),play=get<HTMLButtonElement>('play'),step=get<HTMLButtonElement>('step');
const world=get<HTMLTextAreaElement>('world-brief'),task=get<HTMLTextAreaElement>('task-brief'),source=get<HTMLTextAreaElement>('dream-source');
const sourceMode=get<HTMLButtonElement>('source-mode'),timeline=get<HTMLInputElement>('timeline'),download=get<HTMLAnchorElement>('export');
const error=get('lab-error'),session=new ExperimentSession();
const hostMode=new URLSearchParams(location.search).has('runtime');
let host:HostView|undefined,hostTimer:number|undefined,hostAbort:AbortController|undefined,disposed=false;
const currentRun=()=>hostMode?host?.run:session.run;
let view:ExperimentWorld|undefined,viewError='';
function graphicsFailure(message:string){viewError=message;stop();showError(message);render();}
const fields=['agents','budget','deadline','seed'] as const;
const controls=fields.map(key=>get<HTMLInputElement>('parameter-'+key));
let manual=false,manualDraft='',cursor=0,timer:number|undefined,exportUrl='',exportOwner:unknown,exportLength=-1;
const showReport=createReportView(get('run-report'),evidence=>{stop();cursor=evidence.step;render();});
world.value=DEFAULT_WORLD;task.value=DEFAULT_TASK;
controls.forEach((control,i)=>{control.value=String(DEFAULT_PARAMETERS[fields[i]!]);});
const initial=buildFromBrief(world.value,task.value,DEFAULT_PARAMETERS),preview=createEpisode(initial.scenario);
source.value=initial.source;
try{view=new ExperimentWorld(get('experiment-world'),graphicsFailure);}catch{viewError='The 3D view needs WebGL. Enable hardware acceleration and reload.';showError(viewError);}

const text=(element:HTMLElement,value:string)=>{if(element.textContent!==value)element.textContent=value;};
const label=(id:string)=>id.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const parameters=()=>Object.fromEntries(controls.map((control,i)=>[fields[i]!,control.valueAsNumber])) as Parameters;
function showError(message=viewError){error.hidden=!message;error.textContent=message;}
function stop(){if(timer!==undefined)window.clearInterval(timer);timer=undefined;}
function render(animate=false){
  const run=currentRun(),scenario=run?.scenario??preview.scenario,state=run?.at(cursor)??preview.state;
  if(!viewError)view?.show(scenario,state,animate,timer!==undefined);
  text(get('experiment-title'),label(scenario.id));
  const status=hostMode&&host?.status==='paused'?'Controller paused':timer!==undefined?'Running':run&&cursor<run.length?'Replay':state.terminated?'Completed':state.truncated?'Deadline':run?'Paused':'Ready';
  text(get('world-status'),`${scenario.agents.length} ${scenario.agents.length===1?'agent':'agents'} · ${status}`);
  runButton.disabled=session.preparing||!!viewError;text(get('run-label'),session.preparing?'Preparing…':'Run');
  play.disabled=step.disabled=!run||session.preparing||!!viewError;
  for(const control of [world,task,...controls])control.disabled=manual||hostMode;
  source.readOnly=!manual||hostMode;
  play.setAttribute('aria-label',timer!==undefined?'Pause':'Play');
  play.innerHTML=timer!==undefined?'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>':'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>';
  timeline.disabled=!run?.length||session.preparing;timeline.max=String(run?.length??0);timeline.value=String(cursor);
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
  download.hidden=!run?.length||timer!==undefined;
  if(!download.hidden && run && (exportOwner!==run || exportLength!==run.length)){
    if(exportUrl)URL.revokeObjectURL(exportUrl);
    exportUrl=URL.createObjectURL(new Blob([run.export()],{type:'application/x-ndjson'}));
    exportOwner=run;exportLength=run.length;download.href=exportUrl;download.download=`${run.scenario.id}-seed-${run.scenario.seed}.jsonl`;
  }
  const workspace=get('workspace');workspace.dataset.state=status;workspace.dataset.step=String(cursor);workspace.dataset.runLength=String(run?.length??0);workspace.dataset.sourceHash=run?.manifest.sourceHash??'';
  showReport(run,timer===undefined);
  if(hostMode&&host){text(get('policy-status'),host.controllers.map(c=>`${label(c.actor)}: ${label(c.owner)}`).join(' · '));const latency=get('host-latency');latency.hidden=false;text(latency,`${host.latency.decisions} external decisions · ${Math.round(host.latency.totalMs).toLocaleString()} ms wall time`);}
}
function tick(){
  const run=currentRun();if(!run){stop();return;}
  if(cursor<run.length)cursor++;
  else if(!hostMode){if(run.advance())cursor++;else stop();}
  if(run.ended&&cursor===run.length)stop();
  render(true);
}
function startPlayback(){stop();timer=window.setInterval(tick,STEP_MS);render();}
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
  const run=currentRun();if(!run)return;
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
function dispose(){disposed=true;stop();if(hostTimer!==undefined)clearTimeout(hostTimer);hostAbort?.abort();session.invalidate();view?.dispose();if(exportUrl)URL.revokeObjectURL(exportUrl);}
addEventListener('pagehide',dispose);
if(import.meta.hot)import.meta.hot.dispose(dispose);
async function pollHost(){
  if(disposed||!host)return;
  hostAbort=new AbortController();
  let retry=true;
  try{
    const first=!host.run,run=await host.poll(hostAbort.signal);if(disposed)return;
    source.value=run.manifest.source;
    if(first){cursor=run.length;if(!run.ended&&!document.hidden)startPlayback();}
    if(host.status==='paused')stop();
    showError();render();
  }catch(reason){if(!disposed){stop();showError(reason instanceof Error?reason.message:String(reason));render();if((reason as {status?:number}).status===401){retry=false;get('host-connection').hidden=false;}}}
  finally{if(!disposed&&retry)hostTimer=window.setTimeout(pollHost,500);}
}
if(hostMode){
  runButton.hidden=true;sourceMode.hidden=true;
  get('setup-panel').querySelectorAll(':scope>section').forEach(section=>(section as HTMLElement).hidden=true);
  const connection=get<HTMLFormElement>('host-connection');connection.hidden=false;
  const pill=document.querySelector<HTMLElement>('.topbar .pill')!;pill.textContent='Agent host';pill.setAttribute('aria-label','Runtime: local agent host');
  const connect=(token:string)=>{host=new HostView(token);connection.hidden=true;void pollHost();};
  connection.onsubmit=event=>{event.preventDefault();const input=get<HTMLInputElement>('host-token');connect(input.value);input.value='';};
  const token=new URLSearchParams(location.hash.slice(1)).get('host-token');
  if(token){history.replaceState(null,'',location.pathname+location.search);connect(token);}
}
render();
