import {buildFromBrief,compileExperiment,createEpisode,BRIEF_BUILDER,SCENARIO_BRIEFS,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,type Parameters,type BriefBuilder} from './framework';
import {ExperimentSession} from './runner';
import {AGENT_COLORS} from './world-map';
import {ExperimentWorld} from './world-view';
import {STEP_MS} from './scene-plan';
import {HostView} from './host-view';
import {createReportView} from './report-view';
import {ExperimentWorkspace} from './experiment-workspace';
import type {ExperimentConfig,RunSummary} from './experiment-types';
import type {EvidenceRef} from './report';

const get=<T extends Element=HTMLElement>(id:string)=>document.querySelector<T>('#'+id)!;
const runButton=get<HTMLButtonElement>('run'),play=get<HTMLButtonElement>('play'),step=get<HTMLButtonElement>('step');
const world=get<HTMLTextAreaElement>('world-brief'),task=get<HTMLTextAreaElement>('task-brief'),source=get<HTMLTextAreaElement>('dream-source');
const sourceMode=get<HTMLButtonElement>('source-mode'),timeline=get<HTMLInputElement>('timeline'),download=get<HTMLAnchorElement>('export');
const error=get('lab-error'),session=new ExperimentSession();
const hostMode=new URLSearchParams(location.search).has('runtime');
let host:HostView|undefined,hostTimer:number|undefined,hostAbort:AbortController|undefined,disposed=false;
let hostRevision=0,hostBusy=false,following=false,connectionRevision=0;
const currentRun=()=>hostMode?host?.run:session.run;
let view:ExperimentWorld|undefined,viewError='';
function graphicsFailure(message:string){viewError=message;stop();showError(message);render();}
const fields=['agents','budget','deadline','seed'] as const;
const controls=fields.map(key=>get<HTMLInputElement>('parameter-'+key));
let manual=false,manualDraft='',builder:BriefBuilder=BRIEF_BUILDER,cursor=0,timer:number|undefined,exportUrl='',exportOwner:unknown,exportLength=-1;
const showReport=createReportView(get('run-report'),evidence=>{stop();following=false;cursor=evidence.step;render();});
const savedWorkspace=new ExperimentWorkspace({
  readDraft:()=>({name:get<HTMLInputElement>('experiment-name').value,input:manual?{mode:'source',source:source.value}:{mode:'brief',world:world.value,task:task.value,parameters:parameters(),...(builder===BRIEF_BUILDER?{builder:BRIEF_BUILDER}:{})}}),
  applyDraft,selectRun:selectHostedRun,
  clearRun:()=>{stopHostPolling();stop();following=false;host=undefined;cursor=0;render();},
  busy:pending=>{hostBusy=pending;render();},error:showError,
  connected:()=>{
    get('host-connection').hidden=true;get('experiment-title').hidden=true;
    for(const id of ['experiment-name','revision-label','save-experiment','new-experiment'])get(id).hidden=false;
    render();
  },
});
world.value=DEFAULT_WORLD;task.value=DEFAULT_TASK;
controls.forEach((control,i)=>{control.value=String(DEFAULT_PARAMETERS[fields[i]!]);});
const initial=buildFromBrief(world.value,task.value,DEFAULT_PARAMETERS);let preview=createEpisode(initial.scenario);
source.value=initial.source;
try{view=new ExperimentWorld(get('experiment-world'),graphicsFailure);}catch{viewError='The 3D view needs WebGL. Enable hardware acceleration and reload.';showError(viewError);}

const text=(element:HTMLElement,value:string)=>{if(element.textContent!==value)element.textContent=value;};
const label=(id:string)=>id.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const parameters=()=>Object.fromEntries(controls.map((control,i)=>[fields[i]!,control.valueAsNumber])) as Parameters;
function showError(message=viewError){error.hidden=!message;error.textContent=message;}
function stop(){if(timer!==undefined)window.clearInterval(timer);timer=undefined;}
function render(animate=false){
  if(disposed)return;
  const run=currentRun(),scenario=run?.scenario??preview.scenario,state=run?.at(cursor)??preview.state;
  const playing=timer!==undefined||following;
  if(!viewError)view?.show(scenario,state,animate,playing);
  text(get('experiment-title'),label(scenario.id));
  document.title=`${label(scenario.id)} · Dreams Lab`;
  const status=hostMode&&host?.status==='paused'?'Paused':following?'Live':timer!==undefined?'Running':run&&cursor<run.length?'Replay':state.terminated?'Completed':state.truncated?'Deadline':run?'Paused':'Ready';
  text(get('world-status'),`${scenario.agents.length} ${scenario.agents.length===1?'agent':'agents'} · ${status}`);
  const preparing=session.preparing||hostBusy,disconnected=hostMode&&!savedWorkspace.connected;
  runButton.disabled=preparing||!!viewError||disconnected;text(get('run-label'),preparing?'Preparing…':'Run');
  for(const id of ['save-experiment','new-experiment','resume-run','experiment-name','source-mode'])(get(id) as HTMLButtonElement).disabled=preparing||disconnected;
  play.disabled=step.disabled=!run||preparing||!!viewError;
  for(const control of [world,task,...controls])control.disabled=manual||preparing||disconnected;
  for(const brief of SCENARIO_BRIEFS){const button=get<HTMLButtonElement>('brief-'+brief.id);button.disabled=preparing||disconnected;button.setAttribute('aria-pressed',String(!manual&&world.value===brief.world&&task.value===brief.task));}
  source.readOnly=!manual||preparing||disconnected;
  play.setAttribute('aria-label',playing?'Pause':'Play');
  play.innerHTML=playing?'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>':'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>';
  timeline.disabled=!run?.length||preparing;timeline.max=String(run?.length??0);timeline.value=String(cursor);
  text(get('step-count'),`${cursor} / ${scenario.maxSteps}`);
  const metrics=run?.metrics(cursor);
  text(get('run-metrics'),metrics?`${metrics.completed}/${metrics.total} tasks · ${metrics.creditsSpent} coins · ${metrics.blocked} blocked · ${metrics.violations} violations`:'');
  get('agent-activity').replaceChildren(...state.agents.map((agent,i)=>{
    const row=document.createElement('div');row.className='activity-person';
    const avatar=document.createElement('span');avatar.className='avatar';avatar.style.background=AGENT_COLORS[i]!;avatar.style.color=i===0?'#171717':'#fafaf7';avatar.textContent=String.fromCharCode(65+i);
    const copy=document.createElement('div'),name=document.createElement('strong'),activity=document.createElement('small'),inventory=document.createElement('small');
    name.textContent=label(agent.id);
    const location=(id:string)=>scenario.locations.find(l=>l.id===id)!.label;
    activity.textContent=agent.work?.kind==='move'?`To ${location(agent.work.to)}`:agent.work?.kind==='service'?`${label(agent.work.service)} · ${agent.work.remaining}`:`At ${location(agent.at)}`;
    const items=Object.entries(agent.inventory).filter(([,quantity])=>quantity>0).map(([id,quantity])=>`${quantity} ${scenario.items.find(item=>item.id===id)!.label}`).join(', ');
    inventory.textContent=`${agent.credits} coins${items?' · '+items:''}`;
    copy.append(name,activity,inventory);row.append(avatar,copy);return row;
  }));
  download.hidden=!run?.length||playing;
  if(!download.hidden&&run&&(exportOwner!==run||exportLength!==run.length)){
    if(exportUrl)URL.revokeObjectURL(exportUrl);
    exportUrl=URL.createObjectURL(new Blob([run.export()],{type:'application/x-ndjson'}));
    exportOwner=run;exportLength=run.length;download.href=exportUrl;download.download=`${run.scenario.id}-seed-${run.scenario.seed}.jsonl`;
  }
  const workspace=get('workspace');workspace.dataset.state=status;workspace.dataset.step=String(cursor);workspace.dataset.runLength=String(run?.length??0);workspace.dataset.sourceHash=run?.manifest.sourceHash??'';
  showReport(run,!playing);
  document.querySelector<HTMLElement>('.policy')!.hidden=hostMode&&!run;
  text(get('world-title'),host?.summary?`${savedWorkspace.runLabel(host.summary.id)} · Revision ${host.summary.revision}`:'World');
  if(hostMode&&host){text(get('policy-status'),host.controllers.map(c=>`${label(c.actor)}: ${label(c.owner)}`).join(' · '));const latency=get('host-latency');latency.hidden=false;text(latency,`${host.latency.decisions} external decisions · ${Math.round(host.latency.totalMs).toLocaleString()} ms wall time`);}
}
function tick(playback=false){
  const run=currentRun();if(!run){stop();return;}
  if(cursor<run.length)cursor++;
  else if(!hostMode){if(run.advance())cursor++;else stop();}
  if(run.ended&&cursor===run.length)stop();
  if(playback&&hostMode&&!run.ended&&cursor===run.length&&host?.status==='waiting'){stop();following=true;}
  render(true);
}
function startPlayback(){stop();following=false;timer=window.setInterval(()=>tick(true),STEP_MS);render();}
runButton.onclick=async()=>{
  if(hostMode){await savedWorkspace.start();return;}
  stop();session.invalidate();showError();
  try{
    if(!manual&&![world,task,...controls].every(control=>control.reportValidity())){render();return;}
    const candidate=manual?compileExperiment(source.value):buildFromBrief(world.value,task.value,parameters(),builder);
    const pending=session.start(candidate.source);render();const run=await pending;if(!run)return;
    source.value=candidate.source;cursor=0;render();startPlayback();
  }catch(reason){showError(reason instanceof Error?reason.message:String(reason));}
  finally{render();}
};
play.onclick=()=>{
  const run=currentRun();if(!run)return;
  if(timer!==undefined||following){stop();following=false;render();return;}
  if(hostMode&&!run.ended&&cursor===run.length&&host?.status==='waiting'){following=true;render();return;}
  if(run.ended&&cursor===run.length)cursor=0;startPlayback();
};
step.onclick=()=>{stop();following=false;tick();};
timeline.oninput=()=>{stop();following=false;cursor=Number(timeline.value);render();};
function changed(){
  session.invalidate();showError();
  if(!manual){try{const candidate=buildFromBrief(world.value,task.value,parameters(),builder);source.value=candidate.source;preview=createEpisode(candidate.scenario);}catch{/* Run reports invalid draft input without replacing the accepted episode. */}}
  updateControllers();savedWorkspace.changed();render();
}
for(const control of [world,task,...controls])control.addEventListener('input',changed);
for(const brief of SCENARIO_BRIEFS)get<HTMLButtonElement>('brief-'+brief.id).onclick=()=>{
  if(manual)manualDraft=source.value;manual=false;builder=BRIEF_BUILDER;sourceMode.textContent='Edit';
  world.value=brief.world;task.value=brief.task;get<HTMLInputElement>('experiment-name').value=brief.label;
  changed();
};
source.oninput=()=>{session.invalidate();showError();updateControllers();savedWorkspace.changed();render();};
get('experiment-name').addEventListener('input',()=>savedWorkspace.changed());
sourceMode.onclick=()=>{
  session.invalidate();showError();if(manual)manualDraft=source.value;manual=!manual;
  sourceMode.textContent=manual?'Use brief':'Edit';
  if(manual){if(manualDraft)source.value=manualDraft;source.focus();}else changed();
  updateControllers();savedWorkspace.changed();render();
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();following=false;render();}});
function stopHostPolling(){hostRevision++;if(hostTimer!==undefined)clearTimeout(hostTimer);hostTimer=undefined;hostAbort?.abort();}
function dispose(){disposed=true;connectionRevision++;stop();stopHostPolling();savedWorkspace.dispose();session.invalidate();view?.dispose();if(exportUrl)URL.revokeObjectURL(exportUrl);}
addEventListener('pagehide',dispose);if(import.meta.hot)import.meta.hot.dispose(dispose);
async function pollHost(revision=hostRevision){
  if(disposed||!host||revision!==hostRevision)return;
  const selectedHost=host;hostAbort=new AbortController();let retry=true;
  try{
    const run=await selectedHost.poll(hostAbort.signal);if(disposed||revision!==hostRevision)return;
    if(following)cursor=run.length;if(selectedHost.summary)savedWorkspace.acceptRun(selectedHost.summary);
    if(selectedHost.status==='paused'||run.ended){stop();following=false;}
    showError();render(following);
  }catch(reason){if(!disposed&&revision===hostRevision){stop();following=false;showError(reason instanceof Error?reason.message:String(reason));render();if((reason as {status?:number}).status===401){retry=false;try{sessionStorage.removeItem('dream-lab-token');}catch{}get('host-connection').hidden=false;}}}
  finally{if(!disposed&&retry&&revision===hostRevision)hostTimer=window.setTimeout(()=>void pollHost(revision),500);}
}
async function selectHostedRun(summary:RunSummary,token:string,evidence?:EvidenceRef){
  stopHostPolling();stop();following=false;const revision=hostRevision;
  const candidate=new HostView(token,'/api/runs/'+encodeURIComponent(summary.id));candidate.summary=summary;hostAbort=new AbortController();
  const run=await candidate.poll(hostAbort.signal);if(disposed||revision!==hostRevision)return;
  host=candidate;cursor=evidence?.step??run.length;following=!evidence&&candidate.status==='waiting'&&!document.hidden;
  if(candidate.summary)savedWorkspace.acceptRun(candidate.summary);render();
  if(evidence){get<HTMLDetailsElement>('run-report').open=true;
    const button=Array.from(get('run-report').querySelectorAll<HTMLButtonElement>('button')).find(button=>button.dataset.step===String(evidence.step)&&button.dataset.actor===evidence.agent&&button.dataset.outcome===String(evidence.outcomeIndex));button?.click();}
  hostTimer=window.setTimeout(()=>void pollHost(revision),500);
}
function updateControllers(){try{savedWorkspace.setActors(compileExperiment(source.value).scenario.agents.map(actor=>actor.id));}catch{/* Keep the last valid roster while source is being edited. */}}
function applyDraft(config:ExperimentConfig){
  get<HTMLInputElement>('experiment-name').value=config.name;manual=config.input.mode==='source';
  if(config.input.mode==='brief'){
    const input=config.input;builder=input.builder??'delivery-1';world.value=input.world;task.value=input.task;controls.forEach((control,i)=>control.value=String(input.parameters[fields[i]!]));
    const candidate=buildFromBrief(world.value,task.value,parameters(),builder);source.value=candidate.source;preview=createEpisode(candidate.scenario);
  }else{source.value=config.input.source;manualDraft=source.value;}
  sourceMode.textContent=manual?'Use brief':'Edit';updateControllers();render();
}
if(hostMode){
  const connection=get<HTMLFormElement>('host-connection');connection.hidden=false;
  const pill=document.querySelector<HTMLElement>('.topbar .pill')!;pill.textContent='Agent host';pill.setAttribute('aria-label','Runtime: local agent host');
  document.querySelector<HTMLElement>('.policy-name')!.textContent='Run controllers';
  const connect=async(token:string)=>{const revision=++connectionRevision;showError();try{const accepted=await savedWorkspace.connect(token);if(!accepted||disposed||revision!==connectionRevision)return;try{sessionStorage.setItem('dream-lab-token',token);}catch{}connection.hidden=true;render();}catch(reason){if(disposed||revision!==connectionRevision)return;showError(reason instanceof Error?reason.message:String(reason));connection.hidden=false;try{sessionStorage.removeItem('dream-lab-token');}catch{}}};
  connection.onsubmit=event=>{event.preventDefault();const input=get<HTMLInputElement>('host-token');void connect(input.value);input.value='';};
  const token=new URLSearchParams(location.hash.slice(1)).get('host-token');
  if(token){history.replaceState(null,'',location.pathname+location.search);void connect(token);}else{try{const cached=sessionStorage.getItem('dream-lab-token');if(cached)void connect(cached);}catch{}}
}
render();
