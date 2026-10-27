import {buildFromBrief,compileExperiment,createEpisode,BRIEF_BUILDER,SCENARIO_BRIEFS,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,type Parameters,type BriefBuilder} from './framework';
import {ExperimentSession} from './runner';
import {AGENT_COLORS} from './world-map';
import {ExperimentWorld} from './world-view';
import {STEP_MS} from './scene-plan';
import {HostView} from './host-view';
import {createReportView} from './report-view';
import {ExperimentWorkspace} from './experiment-workspace';
import {SAMPLE_PROMPTS,matchesExamplePrompt} from './experiment-brief';
import {scenarioReview} from './scenario-review';
import {createRunBundle} from './run-bundle';
import type {ExperimentConfig,RunSummary} from './experiment-types';
import type {EvidenceRef} from './report';
import {outcomeCopy} from './workspace-copy';

const get=<T extends Element=HTMLElement>(id:string)=>document.querySelector<T>('#'+id)!;
const runButton=get<HTMLButtonElement>('run'),play=get<HTMLButtonElement>('play'),step=get<HTMLButtonElement>('step');
const world=get<HTMLTextAreaElement>('world-brief'),task=get<HTMLTextAreaElement>('task-brief'),source=get<HTMLTextAreaElement>('dream-source');
const sourceMode=get<HTMLButtonElement>('source-mode'),timeline=get<HTMLInputElement>('timeline'),download=get<HTMLAnchorElement>('export');
const brief=get<HTMLTextAreaElement>('experiment-brief'),confirmReview=get<HTMLInputElement>('review-confirm'),bundleDownload=get<HTMLAnchorElement>('export-bundle');
const error=get('lab-error'),session=new ExperimentSession();
const hostMode=new URLSearchParams(location.search).has('runtime');
let host:HostView|undefined,hostTimer:number|undefined,hostAbort:AbortController|undefined,disposed=false;
let hostRevision=0,hostBusy=false,following=false,connectionRevision=0;
const currentRun=()=>hostMode?host?.run:session.run;
let view:ExperimentWorld|undefined,viewError='';
function graphicsFailure(message:string){viewError=message;stop();showError(message);render();}
const fields=['agents','budget','deadline','seed'] as const;
const controls=fields.map(key=>get<HTMLInputElement>('parameter-'+key));
let manual=false,manualDraft='',builder:BriefBuilder=BRIEF_BUILDER,cursor=0,timer:number|undefined,exportUrl='',bundleUrl='',exportOwner:unknown,exportLength=-1,browserPrompt:string|undefined;
function seek(step:number){stop();following=false;cursor=step;render();}
const showReport=createReportView(get('run-report'),evidence=>seek(evidence.step),seek);
const savedWorkspace=new ExperimentWorkspace({
  validateDraft,
  readDraft:()=>({name:get<HTMLInputElement>('experiment-name').value,prompt:brief.value,input:manual?{mode:'source',source:source.value}:{mode:'brief',world:world.value,task:task.value,parameters:parameters(),...(builder===BRIEF_BUILDER?{builder:BRIEF_BUILDER}:{})}}),
  applyDraft,selectRun:selectHostedRun,
  clearRun:()=>{stopHostPolling();stop();following=false;host=undefined;cursor=0;render();},
  busy:pending=>{hostBusy=pending;render();},error:showError,
  connected:()=>{
    get('host-connection').hidden=true;get('experiment-title').classList.add('sr-only');
    for(const id of ['experiment-name','revision-label','save-experiment','new-experiment'])get(id).hidden=false;
    render();
  },
});
world.value=DEFAULT_WORLD;task.value=DEFAULT_TASK;
brief.value=SAMPLE_PROMPTS.delivery;
controls.forEach((control,i)=>{control.value=String(DEFAULT_PARAMETERS[fields[i]!]);});
const initial=buildFromBrief(world.value,task.value,DEFAULT_PARAMETERS);let preview=createEpisode(initial.scenario),draftScenario=initial.scenario,reviewScenario:typeof initial.scenario|undefined;
source.value=initial.source;
try{view=new ExperimentWorld(get('experiment-world'),graphicsFailure);}catch{viewError='The 3D view needs WebGL. Enable hardware acceleration and reload.';showError(viewError);}

const text=(element:HTMLElement,value:string)=>{if(element.textContent!==value)element.textContent=value;};
const label=(id:string)=>id.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const parameters=()=>Object.fromEntries(controls.map((control,i)=>[fields[i]!,control.valueAsNumber])) as Parameters;
function showError(message=viewError){error.hidden=!message;error.textContent=message;}
function validateDraft(){
  if(hostMode){const name=get<HTMLInputElement>('experiment-name');name.setCustomValidity(name.value.trim()?'':'Give this experiment a name.');if(!name.reportValidity())return false;}
  const example=SCENARIO_BRIEFS.find(value=>value.world===world.value&&value.task===task.value);
  brief.setCustomValidity(!brief.value.trim()?'Describe the experiment before running it.':!manual&&(!example||!matchesExamplePrompt(brief.value,example.id))?'This brief needs matching Dream rules. Select Edit Dream rules and review them.':'');
  if(!brief.reportValidity())return false;
  if(manual&&!confirmReview.checked){confirmReview.setCustomValidity('Confirm the Dream rules match this brief.');confirmReview.reportValidity();return false;}confirmReview.setCustomValidity('');
  if(!manual)for(const control of controls)if(!control.checkValidity()){
    const details=control.closest('details');if(details)details.open=true;control.reportValidity();return false;
  }
  return true;
}
function stop(){if(timer!==undefined)window.clearInterval(timer);timer=undefined;}
function render(animate=false){
  if(disposed)return;
  const run=currentRun(),scenario=run?.scenario??preview.scenario,state=run?.at(cursor)??preview.state;
  const playing=timer!==undefined||following;
  if(!viewError)view?.show(scenario,state,animate,playing);
  const title=draftScenario.id.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
  text(get('experiment-title'),title);document.title=`${title} · Dreams Lab`;
  const status=hostMode&&host?.status==='paused'?'Run paused':following?'Live':timer!==undefined?'Running':run&&cursor<run.length?'Replay':state.terminated?'Completed':state.truncated?'Time limit reached':run?'Playback paused':'Ready';
  text(get('world-status'),`${scenario.agents.length} ${scenario.agents.length===1?'agent':'agents'} · ${status}`);
  const preparing=session.preparing||hostBusy,disconnected=hostMode&&!savedWorkspace.connected;
  runButton.disabled=preparing||!!viewError||disconnected;text(get('run-label'),preparing?'Preparing…':'Run experiment');
  for(const id of ['save-experiment','new-experiment','resume-run','experiment-name','source-mode'])(get(id) as HTMLButtonElement).disabled=preparing||disconnected;
  play.disabled=!run||preparing||!!viewError;
  step.disabled=play.disabled||!!run&&(cursor===run.length&&(hostMode||run.ended));
  brief.disabled=preparing||disconnected;confirmReview.disabled=preparing||disconnected;
  for(const control of [world,task,...controls])control.disabled=manual||preparing||disconnected;
  for(const brief of SCENARIO_BRIEFS){const button=get<HTMLButtonElement>('brief-'+brief.id);button.disabled=preparing||disconnected;button.setAttribute('aria-pressed',String(!manual&&world.value===brief.world&&task.value===brief.task));}
  const example=SCENARIO_BRIEFS.find(value=>value.world===world.value&&value.task===task.value);
  get('edit-brief-rules').hidden=manual||!!example&&matchesExamplePrompt(brief.value,example.id);
  get('review-confirm-label').hidden=!manual;
  get('condition-grid').hidden=manual;get('step-help').hidden=manual;get('manual-conditions').hidden=!manual;
  get('seed-field').hidden=manual;get('seed-help').hidden=manual;
  reviewStatus();
  source.readOnly=!manual||preparing||disconnected;
  play.setAttribute('aria-label',playing?(hostMode?'Pause playback':'Pause run'):(run?.ended||run&&cursor<run.length?'Play replay':hostMode?'Follow live run':'Play run'));
  play.title=play.getAttribute('aria-label')!;
  step.setAttribute('aria-label',hostMode?'Next recorded step':'Advance one step');
  play.innerHTML=playing?'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>':'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>';
  timeline.disabled=!run?.length||preparing;timeline.max=String(run?.length??0);timeline.value=String(cursor);
  timeline.setAttribute('aria-valuetext',`Step ${cursor} of ${run?.length??0} recorded steps`);
  text(get('step-count'),`Step ${cursor}`);
  get('playback').hidden=!run;get('agent-panel').hidden=!run;get('result-summary').hidden=!run;
  get('playback-notice').hidden=!(hostMode&&host?.status==='waiting'&&!playing);
  const recordedPrompt=hostMode?host?.summary?.config.prompt:browserPrompt;
  get('draft-notice').hidden=!run||source.value.trim()===run.manifest.source.trim()&&(manual||controls.every(control=>control.validity.valid))&&(recordedPrompt??'')===brief.value;
  get('run-brief').hidden=!run;if(run)text(get('run-brief-text'),recordedPrompt??'No brief was recorded for this run.');
  const metrics=run?.metrics(cursor);
  if(metrics){const result=outcomeCopy(metrics);text(get('run-metrics'),result.heading);text(get('result-detail'),result.detail);
    const next=run&&cursor<run.length?'Showing an earlier point in the recording. Play replay to continue.':host?.status==='paused'?'The run is paused on your local host. Resume run to continue.':!playing&&!run?.ended?'Play the run or advance one step to continue.':result.next;
    text(get('result-next'),next);
    get('result-next').hidden=hostMode&&host?.status==='waiting'&&!playing;
  }
  get('agent-activity').replaceChildren(...state.agents.map((agent,i)=>{
    const row=document.createElement('div');row.className='activity-person';
    const avatar=document.createElement('span');avatar.className='avatar';avatar.style.background=AGENT_COLORS[i]!;avatar.style.color=i===0?'#171717':'#fafaf7';avatar.textContent=String.fromCharCode(65+i);
    const copy=document.createElement('div'),name=document.createElement('strong'),activity=document.createElement('small'),inventory=document.createElement('small');
    name.textContent=label(agent.id);
    const location=(id:string)=>scenario.locations.find(l=>l.id===id)!.label;
    activity.textContent=agent.work?.kind==='move'?`Travelling to ${location(agent.work.to)}`:agent.work?.kind==='service'?`Using service · ${agent.work.remaining} steps left`:`At ${location(agent.at)}`;
    const items=Object.entries(agent.inventory).filter(([,quantity])=>quantity>0).map(([id,quantity])=>`${quantity} ${scenario.items.find(item=>item.id===id)!.label}`).join(', ');
    inventory.textContent=`${agent.credits} coins${items?' · '+items:''}`;
    copy.append(name,activity,inventory);row.append(avatar,copy);return row;
  }));
  download.hidden=!run?.length||playing;bundleDownload.hidden=!run||playing;
  if(!bundleDownload.hidden&&run&&(exportOwner!==run||exportLength!==run.length)){
    if(exportUrl)URL.revokeObjectURL(exportUrl);
    exportUrl=URL.createObjectURL(new Blob([run.export()],{type:'application/x-ndjson'}));
    exportOwner=run;exportLength=run.length;download.href=exportUrl;download.download=`${run.scenario.id}-seed-${run.scenario.seed}.jsonl`;
    if(bundleUrl)URL.revokeObjectURL(bundleUrl);
    bundleUrl=URL.createObjectURL(new Blob([createRunBundle(run,recordedPrompt)],{type:'application/json'}));bundleDownload.href=bundleUrl;bundleDownload.download=`${run.scenario.id}-seed-${run.scenario.seed}-run.json`;
  }
  const workspace=get('workspace');workspace.dataset.state=status;workspace.dataset.step=String(cursor);workspace.dataset.runLength=String(run?.length??0);workspace.dataset.sourceHash=run?.manifest.sourceHash??'';
  showReport(run,!!run&&!run.ended&&(hostMode?host?.status==='waiting':playing&&cursor===run.length),cursor);
  document.querySelector<HTMLElement>('.policy')!.hidden=!hostMode||!run;
  const recordedTitle=scenario.id.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
  text(get('world-title'),host?.summary?`${savedWorkspace.runLabel(host.summary.id)} · ${recordedTitle}`:run?`${recordedTitle} · Recorded run`:'Experiment world');
  get('host-timing').hidden=!hostMode||!host;
  if(hostMode&&host){text(get('policy-status'),host.controllers.map(c=>`${label(c.actor)}: ${c.owner==='external'?'test connection':'built in'}`).join(' · '));const latency=get('host-latency');latency.hidden=false;text(latency,`${Math.round(host.latency.totalMs).toLocaleString()} ms across ${host.latency.decisions} connected-agent decisions`);}
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
  if(!validateDraft())return;
  stop();session.invalidate();showError();
  try{
    const candidate=manual?compileExperiment(source.value):buildFromBrief(world.value,task.value,parameters(),builder);
    const submittedPrompt=brief.value,pending=session.start(candidate.source);render();const run=await pending;if(!run)return;
    browserPrompt=submittedPrompt;source.value=candidate.source;cursor=0;render();startPlayback();
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
timeline.oninput=()=>seek(Number(timeline.value));
function changed(){
  session.invalidate();showError();
  let valid=true;
  if(!manual){try{const candidate=buildFromBrief(world.value,task.value,parameters(),builder);source.value=candidate.source;preview=createEpisode(candidate.scenario);}catch{valid=false;/* Preserve the accepted episode while the draft is invalid. */}}
  if(valid)updateControllers();else renderReview();savedWorkspace.changed();render();
}
for(const control of [world,task,...controls])control.addEventListener('input',changed);
for(const brief of SCENARIO_BRIEFS)get<HTMLButtonElement>('brief-'+brief.id).onclick=()=>{
  const replacePrompt=!get<HTMLTextAreaElement>('experiment-brief').value||Object.values(SAMPLE_PROMPTS).includes(get<HTMLTextAreaElement>('experiment-brief').value);
  if(manual)manualDraft=source.value;manual=false;builder=BRIEF_BUILDER;sourceMode.textContent='Edit rules';
  world.value=brief.world;task.value=brief.task;get<HTMLInputElement>('experiment-name').value=brief.label;
  if(replacePrompt)get<HTMLTextAreaElement>('experiment-brief').value=SAMPLE_PROMPTS[brief.id];confirmReview.checked=false;get<HTMLTextAreaElement>('experiment-brief').setCustomValidity('');
  changed();
};
brief.oninput=()=>{brief.setCustomValidity('');confirmReview.checked=false;confirmReview.setCustomValidity('');session.invalidate();savedWorkspace.changed();render();};
confirmReview.onchange=()=>confirmReview.setCustomValidity('');
source.oninput=()=>{confirmReview.checked=false;confirmReview.setCustomValidity('');session.invalidate();showError();updateControllers();savedWorkspace.changed();render();};
get<HTMLInputElement>('experiment-name').addEventListener('input',event=>{(event.currentTarget as HTMLInputElement).setCustomValidity('');savedWorkspace.changed();});
sourceMode.onclick=()=>{
  session.invalidate();showError();if(manual)manualDraft=source.value;manual=!manual;
  sourceMode.textContent=manual?'Use scenario':'Edit rules';
  if(manual){if(manualDraft)source.value=manualDraft;source.focus();}else changed();
  brief.setCustomValidity('');confirmReview.checked=false;confirmReview.setCustomValidity('');updateControllers();savedWorkspace.changed();render();
};
get<HTMLButtonElement>('edit-brief-rules').onclick=()=>{sourceMode.closest('details')!.open=true;if(!manual)sourceMode.click();source.focus();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();following=false;render();}});
function stopHostPolling(){hostRevision++;if(hostTimer!==undefined)clearTimeout(hostTimer);hostTimer=undefined;hostAbort?.abort();}
function dispose(){disposed=true;connectionRevision++;stop();stopHostPolling();savedWorkspace.dispose();session.invalidate();view?.dispose();if(exportUrl)URL.revokeObjectURL(exportUrl);if(bundleUrl)URL.revokeObjectURL(bundleUrl);}
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
async function selectHostedRun(summary:RunSummary,token:string,evidence?:EvidenceRef,step?:number){
  stopHostPolling();stop();following=false;const revision=hostRevision;
  const candidate=new HostView(token,'/api/runs/'+encodeURIComponent(summary.id));candidate.summary=summary;hostAbort=new AbortController();
  const run=await candidate.poll(hostAbort.signal);if(disposed||revision!==hostRevision)return;
  if(step!==undefined&&step>run.length)throw Error('That step is not recorded in this run yet.');
  host=candidate;cursor=step??evidence?.step??run.length;following=step===undefined&&!evidence&&candidate.status==='waiting'&&!document.hidden;
  if(candidate.summary)savedWorkspace.acceptRun(candidate.summary);render();
  if(evidence){get<HTMLDetailsElement>('run-report').open=true;
    const button=Array.from(get('run-report').querySelectorAll<HTMLButtonElement>('button')).find(button=>button.dataset.step===String(evidence.step)&&button.dataset.actor===evidence.agent&&button.dataset.outcome===String(evidence.outcomeIndex));button?.click();}
  if(step!==undefined)get('world-title').scrollIntoView({block:'nearest'});
  hostTimer=window.setTimeout(()=>void pollHost(revision),500);
}
function updateControllers(){try{draftScenario=compileExperiment(source.value).scenario;savedWorkspace.setActors(draftScenario.agents.map(actor=>actor.id));renderReview(draftScenario);}catch{renderReview();/* Keep the last valid roster while source is being edited. */}}
function applyDraft(config:ExperimentConfig){
  get<HTMLInputElement>('experiment-name').value=config.name;manual=config.input.mode==='source';
  brief.value=config.prompt??'';brief.setCustomValidity('');confirmReview.checked=false;confirmReview.setCustomValidity('');
  if(config.input.mode==='brief'){
    const input=config.input;builder=input.builder??'delivery-1';world.value=input.world;task.value=input.task;controls.forEach((control,i)=>control.value=String(input.parameters[fields[i]!]));
    const candidate=buildFromBrief(world.value,task.value,parameters(),builder);source.value=candidate.source;preview=createEpisode(candidate.scenario);
  }else{source.value=config.input.source;manualDraft=source.value;}
  sourceMode.textContent=manual?'Use scenario':'Edit rules';updateControllers();render();
}
function renderReview(scenario?:typeof draftScenario){
  reviewScenario=scenario;const content=get('review-content');content.replaceChildren();reviewStatus();
  if(!scenario)return;
  const review=scenarioReview(scenario);
  const section=(title:string,items:string[],target:HTMLElement=content)=>{if(!items.length)return;const heading=document.createElement('h3'),list=document.createElement('ul');heading.textContent=title;for(const item of items){const li=document.createElement('li');li.textContent=item;list.append(li);}target.append(heading,list);};
  section('Tasks',review.tasks.map(value=>`${value.description} · ${value.agents.join(', ')}`));
  if(manual)section('Starting budgets',review.budgets);
  section('Supplies and services',[...review.stocks,...review.services]);
  const more=document.createElement('details'),summary=document.createElement('summary');summary.textContent='More conditions';more.append(summary);if(!manual)section('Budgets',review.budgets,more);section('Carrying capacity',review.capacities,more);section('Routes',review.routes,more);section('Random seed',[String(scenario.seed)],more);content.append(more);
}
function reviewStatus(){
  const scenario=reviewScenario;if(!scenario){text(get('review-status'),'Check the conditions or Dream rules to review this setup.');return;}
  const count=scenario.objectives.length,example=SCENARIO_BRIEFS.find(value=>value.world===world.value&&value.task===task.value);
  const mismatch=!manual&&(!example||!matchesExamplePrompt(brief.value,example.id));
  const overrides=!manual&&fields.some((key,index)=>controls[index]!.valueAsNumber!==DEFAULT_PARAMETERS[key]);
  const note=mismatch?' The example rules do not interpret this brief.':manual?' Check that these rules match your brief.':overrides?' Conditions above override the example brief.':'';
  text(get('review-status'),`${scenario.agents.length} ${scenario.agents.length===1?'agent':'agents'} · ${count} ${count===1?'task':'tasks'} · All tasks must finish within ${scenario.maxSteps} ${scenario.maxSteps===1?'step':'steps'}.${note}`);
}
renderReview(draftScenario);
if(hostMode){
  const connection=get<HTMLFormElement>('host-connection');connection.hidden=false;
  const pill=document.querySelector<HTMLElement>('.topbar .pill')!;pill.textContent='Local workspace';pill.setAttribute('aria-label','Saved local workspace with scripted agents');
  const connect=async(token:string)=>{const revision=++connectionRevision;showError();try{const accepted=await savedWorkspace.connect(token);if(!accepted||disposed||revision!==connectionRevision)return;try{sessionStorage.setItem('dream-lab-token',token);}catch{}connection.hidden=true;render();}catch(reason){if(disposed||revision!==connectionRevision)return;showError(reason instanceof Error?reason.message:String(reason));connection.hidden=false;try{sessionStorage.removeItem('dream-lab-token');}catch{}}};
  connection.onsubmit=event=>{event.preventDefault();const input=get<HTMLInputElement>('host-token');void connect(input.value);input.value='';};
  const token=new URLSearchParams(location.hash.slice(1)).get('host-token');
  if(token){history.replaceState(null,'',location.pathname+location.search);void connect(token);}else{try{const cached=sessionStorage.getItem('dream-lab-token');if(cached)void connect(cached);}catch{}}
}
render();
