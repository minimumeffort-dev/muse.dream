import {ExperimentClient} from './experiment-client';
import {compareRuns} from './compare-runs';
import type {ControllerAssignment,ExperimentConfig,SavedExperiment,RunSummary,SavedRunReport} from './experiment-types';
import type {EvidenceRef} from './report';
import {BRIEF_BUILDER,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS} from './framework';
const get=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const name=(text:string)=>text.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const text=(tag:string,value:string)=>{const node=document.createElement(tag);node.textContent=value;return node;};
export interface WorkspaceCallbacks {
  readDraft:()=>Omit<ExperimentConfig,'controllers'>;
  applyDraft:(config:ExperimentConfig)=>void;
  selectRun:(run:RunSummary,token:string,evidence?:EvidenceRef)=>Promise<void>;
  clearRun:()=>void;
  busy:(pending:boolean)=>void;
  error:(message:string)=>void;
  connected:()=>void;
}
/** Saved revisions and run selection are separate from the editable draft and playback cursor. */
export class ExperimentWorkspace {
  private client:ExperimentClient|undefined;
  private experiments:SavedExperiment[]=[];
  private runs:RunSummary[]=[];
  private selected:SavedExperiment|undefined;
  private selectedRun='';
  private choices:ControllerAssignment[]=[];
  private compared:string[]=[];
  private requestRevision=0;
  private comparisonRevision=0;
  private pending=false;
  private disposed=false;
  private connectionRevision=0;
  private selectionRevision=0;
  private readonly actorNodes=new Map<string,HTMLElement>();
  private readonly runNodes=new Map<string,HTMLElement>();
  private readonly experimentNodes=new Map<string,HTMLButtonElement>();
  constructor(private readonly callbacks:WorkspaceCallbacks){
    get<HTMLButtonElement>('save-experiment').onclick=()=>void this.mutate(()=>this.save());
    get<HTMLButtonElement>('new-experiment').onclick=()=>this.newDraft();
    get<HTMLButtonElement>('resume-run').onclick=()=>void this.mutate(async()=>{
      if(!this.client||!this.selectedRun)return;
      const selectedRun=this.selectedRun,run=await this.client.resume(selectedRun);this.acceptRun(run);if(this.selectedRun===selectedRun)await this.callbacks.selectRun(run,this.client.token);
    });
  }
  get connected(){return !!this.client;}
  get busy(){return this.pending;}
  get name(){return this.selected?.name;}
  setActors(actors:string[],assignments?:ControllerAssignment[]){
    const previous=assignments??this.choices;
    const next=actors.map((actor,i)=>({actor,kind:previous.find(c=>c.actor===actor)?.kind??(i===0?'external-mock':'baseline')} as ControllerAssignment));
    if(JSON.stringify(next)===JSON.stringify(this.choices))return;
    this.choices=next;this.renderControllers();
  }
  private renderControllers(){
    const container=get('controller-assignments');
    for(const [actor,node] of this.actorNodes)if(!this.choices.some(c=>c.actor===actor)){node.remove();this.actorNodes.delete(actor);}
    for(const [index,controller] of this.choices.entries()){
      let row=this.actorNodes.get(controller.actor);
      if(!row){row=document.createElement('div');row.className='controller-row';row.append(text('span',name(controller.actor)));const button=document.createElement('button');button.className='btn controller-toggle';button.type='button';button.onclick=()=>{const choice=this.choices.find(c=>c.actor===controller.actor);if(choice){choice.kind=choice.kind==='baseline'?'external-mock':'baseline';this.renderControllers();this.changed();}};row.append(button);this.actorNodes.set(controller.actor,row);}
      const button=row.querySelector('button')!;button.disabled=this.pending;
      button.textContent=controller.kind==='external-mock'?'External mock':'Baseline';button.setAttribute('aria-label',`Controller for ${name(controller.actor)}: ${button.textContent}`);button.setAttribute('aria-pressed',String(controller.kind==='external-mock'));
      if(container.children[index]!==row)container.insertBefore(row,container.children[index]??null);
    }
  }
  async connect(token:string){
    const connection=++this.connectionRevision,revision=++this.requestRevision,client=new ExperimentClient(token);
    const {experiments}=await client.experiments();if(this.disposed||revision!==this.requestRevision)return false;
    this.client=client;this.experiments=experiments;this.callbacks.connected();get('saved-library').hidden=false;get('controller-section').hidden=false;
    this.renderExperiments();
    const remembered=this.readSelection();
    const selected=experiments.find(e=>e.id===remembered?.experimentId)??experiments[0];
    if(selected)await this.openExperiment(selected,remembered?.runId);else this.newDraft();
    return !this.disposed&&connection===this.connectionRevision;
  }
  private readSelection(){try{return JSON.parse(sessionStorage.getItem('dream-lab-selection')??'null') as {experimentId:string;runId:string}|null;}catch{return null;}}
  private remember(){try{sessionStorage.setItem('dream-lab-selection',JSON.stringify({experimentId:this.selected?.id,runId:this.selectedRun}));}catch{/* Selection is convenience; durable data stays on the host. */}}
  changed(){
    if(!this.client)return;
    let dirty=true;try{dirty=JSON.stringify(this.draft())!==JSON.stringify(this.selected?.config);}catch{/* Invalid drafts remain editable. */}
    get('revision-label').textContent=this.selected?`Revision ${this.selected.revision}${dirty?' · Unsaved':''}`:'New experiment';
  }
  private draft():ExperimentConfig{return {...this.callbacks.readDraft(),controllers:structuredClone(this.choices)};}
  private async mutate(action:()=>Promise<unknown>){
    if(this.pending||!this.client)return;
    this.pending=true;this.callbacks.error('');this.callbacks.busy(true);this.renderControllers();this.renderRuns();this.renderExperiments();
    try{await action();}catch(error){if(!this.disposed)this.callbacks.error(error instanceof Error?error.message:String(error));}
    finally{this.pending=false;if(!this.disposed){this.callbacks.busy(false);this.renderControllers();this.renderRuns();this.renderExperiments();this.changed();}}
  }
  private async save(){
    if(!this.client)throw Error('Connect to the experiment host first.');
    const config=this.draft();
    if(this.selected&&JSON.stringify(config)===JSON.stringify(this.selected.config))return this.selected;
    const saved=await this.client.save(config,this.selected);if(this.disposed)return saved;
    this.selected=saved;this.experiments=[saved,...this.experiments.filter(e=>e.id!==saved.id)];this.renderExperiments();this.remember();this.changed();return saved;
  }
  async start(){await this.mutate(async()=>{
    const saved=await this.save();if(!this.client||this.disposed)return;
    const run=await this.client.start(saved);if(this.disposed)return;
    this.runs=[run,...this.runs.filter(r=>r.id!==run.id)];this.selectRun(run);this.renderRuns();
  });}
  newDraft(){
    if(this.pending||!this.client)return;
    this.selectionRevision++;
    this.requestRevision++;this.selected=undefined;this.selectedRun='';this.runs=[];this.compared=[];
    this.comparisonRevision++;get('run-comparison').hidden=true;this.callbacks.clearRun();this.callbacks.applyDraft({name:'Morning delivery',input:{mode:'brief',world:DEFAULT_WORLD,task:DEFAULT_TASK,parameters:{...DEFAULT_PARAMETERS},builder:BRIEF_BUILDER},controllers:[]});
    this.choices=[];this.setActors(['courier_a','courier_b']);this.renderRuns();this.renderExperiments();this.remember();this.changed();
  }
  private async openExperiment(experiment:SavedExperiment,preferredRun?:string){
    if(this.pending||!this.client)return;
    this.selectionRevision++;
    const revision=++this.requestRevision;this.callbacks.error('');
    this.pending=true;this.callbacks.busy(true);this.renderControllers();this.renderRuns();this.renderExperiments();
    try{
      const {runs}=await this.client.runs(experiment.id);if(this.disposed||revision!==this.requestRevision)return;
      this.selected=experiment;this.runs=runs;this.compared=[];this.comparisonRevision++;get('run-comparison').hidden=true;
      this.callbacks.applyDraft(experiment.config);this.choices=[];this.setActors(experiment.config.controllers.map(c=>c.actor),experiment.config.controllers);
      const latest=runs.find(r=>r.id===preferredRun)??runs[0];if(latest)this.selectRun(latest);else{this.selectedRun='';this.callbacks.clearRun();}
      this.renderRuns();this.renderExperiments();this.remember();this.changed();
    }catch(error){if(revision===this.requestRevision)this.callbacks.error(error instanceof Error?error.message:String(error));}
    finally{this.pending=false;if(!this.disposed){this.callbacks.busy(false);this.renderControllers();this.renderRuns();this.renderExperiments();}}
  }
  private selectRun(run:RunSummary,evidence?:EvidenceRef){if(!this.client)return;const revision=++this.selectionRevision;this.selectedRun=run.id;this.remember();void this.callbacks.selectRun(run,this.client.token,evidence).catch(error=>{if(!this.disposed&&revision===this.selectionRevision)this.callbacks.error(error instanceof Error?error.message:String(error));});get('resume-run').hidden=run.status!=='paused';}
  acceptRun(run:RunSummary){
    const previous=this.runs.find(r=>r.id===run.id);if(previous&&previous.updatedAt===run.updatedAt&&previous.status===run.status&&previous.steps===run.steps)return;
    if(run.experimentId===this.selected?.id){this.runs=[run,...this.runs.filter(r=>r.id!==run.id)].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));this.renderRuns();}
    if(previous&&previous.status!==run.status&&this.compared.includes(run.id))void this.renderComparison();
    if(run.id===this.selectedRun)get('resume-run').hidden=run.status!=='paused';
  }
  private renderExperiments(){
    const container=get('experiment-list');container.querySelector('p')?.remove();
    if(!this.experiments.length)container.append(text('p','No saved experiments.'));
    for(const [index,experiment] of this.experiments.entries()){
      let button=this.experimentNodes.get(experiment.id);if(!button){button=document.createElement('button');button.type='button';button.className='history-experiment';button.onclick=()=>{const current=this.experiments.find(e=>e.id===experiment.id);if(current&&!this.pending)void this.openExperiment(current);};this.experimentNodes.set(experiment.id,button);}
      button.textContent=experiment.name;button.disabled=this.pending;button.setAttribute('aria-pressed',String(experiment.id===this.selected?.id));if(container.children[index]!==button)container.insertBefore(button,container.children[index]??null);
    }
  }
  private renderRuns(){
    const container=get('run-list');container.querySelector('p')?.remove();
    for(const [id,node] of this.runNodes)if(!this.runs.some(run=>run.id===id)){node.remove();this.runNodes.delete(id);}
    if(!this.runs.length)container.append(text('p','No runs yet.'));
    const ordered=[...this.runs].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
    for(const [index,run] of [...ordered].reverse().entries()){
      const number=ordered.findIndex(r=>r.id===run.id)+1;let row=this.runNodes.get(run.id);
      if(!row){row=document.createElement('div');row.className='history-run';const button=document.createElement('button');button.type='button';button.className='history-open';button.append(text('strong',''),text('small',''));button.onclick=()=>{const current=this.runs.find(r=>r.id===run.id);if(current&&!this.pending){this.selectRun(current);this.renderRuns();}};
        const compare=document.createElement('input');compare.type='checkbox';compare.onchange=()=>{if(compare.checked)this.compared=[...this.compared.filter(id=>id!==run.id),run.id].slice(-2);else this.compared=this.compared.filter(id=>id!==run.id);this.renderRuns();void this.renderComparison();};const label=document.createElement('label');label.className='compare-choice';label.append(compare,text('span','Compare'));row.append(button,label);this.runNodes.set(run.id,row);}
      const button=row.querySelector('button')!,compare=row.querySelector('input')!;button.setAttribute('aria-pressed',String(this.selectedRun===run.id));button.disabled=this.pending;button.querySelector('strong')!.textContent=`Run ${number} · Revision ${run.revision}`;button.querySelector('small')!.textContent=`${name(run.status)} · ${run.metrics.completed}/${run.metrics.total} tasks · ${run.steps} steps`;
      compare.checked=this.compared.includes(run.id);compare.disabled=this.pending;compare.setAttribute('aria-label',`Compare run ${number}`);if(container.children[index]!==row)container.insertBefore(row,container.children[index]??null);
    }
    get('resume-run').hidden=!this.runs.some(r=>r.id===this.selectedRun&&r.status==='paused');
  }
  private async renderComparison(){
    const revision=++this.comparisonRevision,panel=get('run-comparison'),content=get('comparison-content');
    panel.hidden=this.compared.length!==2;if(panel.hidden||!this.client)return;
    content.replaceChildren(text('p','Loading comparison…'));
    try{
      const reports=await Promise.all(this.compared.map(id=>this.client!.report(id)));if(this.disposed||revision!==this.comparisonRevision)return;
      const [left,right]=reports as [SavedRunReport,SavedRunReport],comparison=compareRuns({...left.run,report:left},{...right.run,report:right});
      content.replaceChildren();
      const display=(report:SavedRunReport)=>`${this.runLabel(report.run.id)} · Revision ${report.run.revision}`;
      content.append(text('p',`${comparison.matchedSeed?'Same seed '+left.run.seed:'Different seeds'} · ${comparison.complete?'Finished runs':'Includes partial results'}`));
      const changes=text('p',comparison.changes.length?comparison.changes.map(change=>`${change.field.replace('input.parameters.','').replace('input.','')}: ${this.value(change.before)} → ${this.value(change.after)}`).join(' · '):'Configuration unchanged.');changes.className='comparison-changes';content.append(changes);
      const table=document.createElement('table'),header=document.createElement('tr');for(const value of ['Metric',display(left),display(right),'Change']){const cell=document.createElement('th');cell.scope='col';cell.textContent=value;header.append(cell);}const head=document.createElement('thead');head.append(header);table.append(head);
      const body=document.createElement('tbody');
      for(const row of comparison.rows){const tr=document.createElement('tr');for(const value of [row.label+(row.unit==='agent steps'?' (agent steps)':''),this.value(row.baseline),this.value(row.candidate),row.delta===null?'—':`${row.delta>0?'+':''}${row.delta}`])tr.append(text('td',String(value)));body.append(tr);}table.append(body);content.append(table);
      for(const evidence of comparison.rows.flatMap(row=>row.evidence).filter((item,index,all)=>all.findIndex(other=>other.runId===item.runId&&other.step===item.step&&other.outcomeIndex===item.outcomeIndex)===index)){
        const button=document.createElement('button');button.type='button';button.className='evidence-link';const report=evidence.runId===left.run.id?left:right;
        button.textContent=`${this.runLabel(report.run.id)} · Step ${evidence.step} · ${name(evidence.agent)}`;button.onclick=()=>{const run=this.runs.find(run=>run.id===evidence.runId);if(run&&!this.pending){this.selectRun(run,evidence);this.renderRuns();}};content.append(button);
      }
    }catch(error){if(revision===this.comparisonRevision)content.replaceChildren(text('p',error instanceof Error?error.message:String(error)));}
  }
  private value(value:unknown){return value===null||value===undefined?'—':typeof value==='object'?JSON.stringify(value):String(value);}
  runLabel(id:string){const ordered=[...this.runs].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))),index=ordered.findIndex(run=>run.id===id);return index<0?'Run':'Run '+(index+1);}
  dispose(){this.disposed=true;this.requestRevision++;this.comparisonRevision++;this.selectionRevision++;this.connectionRevision++;}
}
