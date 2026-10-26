import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile,rename,unlink,stat,chmod,open} from 'node:fs/promises';
import {join} from 'node:path';
import {buildFromBrief,compileExperiment,createEpisode,recordingManifest,exportEpisode,replayEpisode,episodeMetrics,type Parameters,type Manifest,type Episode} from '../src/framework';
import {stepEpisode,type Transition} from '../src/engine/sim/episode';

const id=z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),date=z.string().datetime(),hash=z.string().regex(/^[a-f0-9]{64}$/);
const parameters=z.object({agents:z.number().int().min(1).max(8),budget:z.number().int().min(0).max(100000),deadline:z.number().int().min(1).max(1000),seed:z.number().int().min(0).max(2147483647)}).strict();
export const experimentConfigSchema=z.object({
  name:z.string().trim().min(1).max(100),
  input:z.discriminatedUnion('mode',[
    z.object({mode:z.literal('brief'),world:z.string().max(2000),task:z.string().max(2000),parameters,builder:z.literal('scenarios-1').optional()}).strict(),
    z.object({mode:z.literal('source'),source:z.string().max(65536)}).strict(),
  ]),
  controllers:z.array(z.object({actor:id,kind:z.enum(['baseline','external-mock'])}).strict()).min(1).max(8),
}).strict();
export type ExperimentConfig=z.infer<typeof experimentConfigSchema>;
const experimentSchema=z.object({id,revision:z.number().int().min(1).max(64),name:z.string(),config:experimentConfigSchema,source:z.string().max(65536),sourceHash:hash,seed:z.number().int().nonnegative(),createdAt:date,updatedAt:date}).strict();
export type SavedExperiment=z.infer<typeof experimentSchema>;
export type StoredRunStatus='waiting'|'paused'|'completed'|'deadline';
export interface SavedRun {
  id:string;experimentId:string;revision:number;requestId:string;name:string;config:ExperimentConfig;source:string;sourceHash:string;seed:number;
  manifest:Manifest;recording:string;status:StoredRunStatus;decisions:{requestId:string;actor:string;step:number;started:number;latencyMs?:number}[];controllers:{actor:string;owner:'baseline'|'external'}[];createdAt:string;updatedAt:string;reason?:string;
}
export type RunSummary=Omit<SavedRun,'source'|'manifest'|'recording'|'decisions'>&{steps:number;metrics:ReturnType<typeof episodeMetrics>;parameters?:Parameters};
const decisionSchema=z.object({requestId:z.string().min(1).max(256),actor:id,step:z.number().int().min(0).max(1000),started:z.number().finite().nonnegative(),latencyMs:z.number().finite().nonnegative().optional()}).strict();
const controllerSchema=z.object({actor:id,owner:z.enum(['baseline','external'])}).strict();
const runSchema=z.object({id,experimentId:id,revision:z.number().int().min(1).max(64),requestId:z.string().min(1).max(128),name:z.string(),config:experimentConfigSchema,source:z.string().max(65536),sourceHash:hash,seed:z.number().int().nonnegative(),manifest:z.unknown(),recording:z.string().max(64*1024*1024),status:z.enum(['waiting','paused','completed','deadline']),decisions:z.array(decisionSchema).max(8000).default([]),controllers:z.array(controllerSchema).min(1).max(8),createdAt:date,updatedAt:date,reason:z.string().min(1).max(240).optional()}).strict();
const indexSchema=z.object({version:z.literal(1),experiments:z.array(experimentSchema).max(2048),runs:z.array(z.object({id,experimentId:id,revision:z.number().int().min(1).max(64),requestId:z.string().min(1).max(128)}).strict()).max(128)}).strict();
type Index=z.infer<typeof indexSchema>;
export class StoreError extends Error {constructor(readonly code:string,message:string,readonly status=400){super(message);this.name='StoreError';}}
function fail(code:string,message:string,status=400):never{throw new StoreError(code,message,status);}
const clone=<T>(value:T):T=>structuredClone(value);
const MAX_STORE_BYTES=128*1024*1024;

async function atomicWrite(file:string,text:string){
  const temporary=file+'.'+randomUUID()+'.tmp';
  try{
    const handle=await open(temporary,'wx',0o600);
    try{await handle.writeFile(text);await handle.sync();}finally{await handle.close();}
    await rename(temporary,file);
  }finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
export interface StoreOptions {write?:(file:string,text:string)=>Promise<void>}

/** Local single-host store. Publication is an atomic rename; failed writes retain accepted data. */
export class ExperimentStore {
  private queue:Promise<unknown>=Promise.resolve();
  private readonly cache=new Map<string,{run:SavedRun;episode:Episode}>();
  private readonly sizes=new Map<string,number>();
  private constructor(readonly directory:string,private index:Index,private readonly write:(file:string,text:string)=>Promise<void>){}
  static async open(directory:string,options:StoreOptions={}){
    await mkdir(join(directory,'runs'),{recursive:true,mode:0o700});await chmod(directory,0o700);await chmod(join(directory,'runs'),0o700);
    const file=join(directory,'index.json');let parsed:Index;
    try{if((await stat(file)).size>MAX_STORE_BYTES)throw Error('Index exceeds storage budget');parsed=indexSchema.parse(JSON.parse(await readFile(file,'utf8')));}catch(error){
      if((error as NodeJS.ErrnoException).code!=='ENOENT')throw new StoreError('STORE_CORRUPT','Saved experiment index is unreadable or invalid. Preserve it and repair it before continuing.',500);
      const existing=(await readdir(join(directory,'runs'))).filter(name=>name.endsWith('.json'));
      if(existing.length)throw new StoreError('STORE_CORRUPT','Saved run files exist without their experiment index. Preserve them before recovery.',500);
      parsed={version:1,experiments:[],runs:[]};await (options.write??atomicWrite)(file,JSON.stringify(parsed));
    }
    const store=new ExperimentStore(directory,parsed,options.write??atomicWrite);
    store.sizes.set(file,(await stat(file)).size);
    const experimentIds=new Set(parsed.experiments.map(e=>e.id));
    if(experimentIds.size>32||new Set(parsed.runs.map(r=>r.id)).size!==parsed.runs.length||new Set(parsed.runs.map(r=>r.requestId)).size!==parsed.runs.length)fail('STORE_CORRUPT','Saved experiment index contains duplicate or excessive records.',500);
    for(const experimentId of experimentIds){
      const revisions=parsed.experiments.filter(e=>e.id===experimentId);
      if(revisions.some((e,i)=>e.revision!==i+1))fail('STORE_CORRUPT','Saved experiment revisions are not contiguous.',500);
    }
    for(const experiment of parsed.experiments)await store.validateExperiment(experiment);
    let savedBytes=store.sizes.get(file)!;
    for(const entry of parsed.runs){
      try{savedBytes+=(await stat(store.runFile(entry.id))).size;}catch{fail('STORE_CORRUPT','A saved run file is missing or unreadable. Preserve the index before recovery.',500);}
      if(savedBytes>MAX_STORE_BYTES)fail('STORE_FULL','Saved data exceeds the 128 MiB local storage budget. Preserve it before recovery.',507);
    }
    const interrupted:string[]=[];
    for(const entry of parsed.runs){
      const run=await store.readRun(entry.id);
      if(run.experimentId!==entry.experimentId||run.revision!==entry.revision||run.requestId!==entry.requestId)fail('STORE_CORRUPT','Saved run index does not match its record.',500);
      if(run.status==='waiting')interrupted.push(run.id);
    }
    const known=new Set(parsed.runs.map(r=>r.id+'.json'));
    if((await readdir(join(directory,'runs'))).some(name=>name.endsWith('.json')&&!known.has(name)))fail('STORE_CORRUPT','An unindexed saved run needs recovery. No run files were removed.',500);
    for(const runId of interrupted)await store.updateRun(runId,{status:'paused',reason:'Host restarted. Resume this run to continue.'});
    return store;
  }
  private serial<T>(work:()=>Promise<T>):Promise<T>{const next=this.queue.then(work);this.queue=next.catch(()=>{});return next;}
  private async publish(file:string,value:unknown){
    const text=JSON.stringify(value),bytes=Buffer.byteLength(text),total=[...this.sizes.values()].reduce((sum,size)=>sum+size,0)-(this.sizes.get(file)??0)+bytes;
    if(total>MAX_STORE_BYTES)fail('STORE_FULL','Saved experiments reached the 128 MiB local storage budget. Preserve or move older data before continuing.',507);
    await this.write(file,text);this.sizes.set(file,bytes);
  }
  private runFile(runId:string){if(!id.safeParse(runId).success)fail('NOT_FOUND','Unknown run.',404);return join(this.directory,'runs',runId+'.json');}
  private async accepted(input:unknown){
    const parsed=experimentConfigSchema.safeParse(input);if(!parsed.success)fail('INVALID_CONFIG','Invalid experiment configuration. Check name, inputs and controller assignments.');
    try{
    const config=parsed.data,accepted=config.input.mode==='brief'?buildFromBrief(config.input.world,config.input.task,config.input.parameters,config.input.builder??'delivery-1'):compileExperiment(config.input.source);
    const actors=accepted.scenario.agents.map(a=>a.id);
    if(config.controllers.length!==actors.length||new Set(config.controllers.map(c=>c.actor)).size!==actors.length||config.controllers.some(c=>!actors.includes(c.actor)))fail('INVALID_CONFIG','Assign exactly one controller to each compiled actor.');
    const manifest=await recordingManifest(accepted.source,'mock-agent-protocol-1');
    return {config,accepted,manifest};
    }catch(error){if(error instanceof StoreError)throw error;throw new StoreError('INVALID_CONFIG',(error instanceof Error?error.message:String(error)).slice(0,4000),400);}
  }
  private async validateExperiment(experiment:SavedExperiment){
    try{
      const {manifest}=await this.accepted(experiment.config);
      if(experiment.name!==experiment.config.name||experiment.source!==manifest.source||experiment.sourceHash!==manifest.sourceHash||experiment.seed!==manifest.seed)throw Error('Source pin mismatch');
    }catch{fail('STORE_CORRUPT','Saved experiment configuration does not match its accepted source.',500);}
  }
  async listExperiments(){await this.queue;const latest=new Map<string,SavedExperiment>();for(const e of this.index.experiments)latest.set(e.id,e);return clone([...latest.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))); }
  async getExperiment(experimentId:string,revision?:number){await this.queue;const all=this.index.experiments.filter(e=>e.id===experimentId),found=revision===undefined?all.at(-1):all.find(e=>e.revision===revision);if(!found)fail('NOT_FOUND','Unknown experiment revision.',404);return clone(found);}
  async save(input:unknown,options:{id?:string;expectedRevision?:number}={}){
    const {config,manifest}=await this.accepted(input);
    return this.serial(async()=>{
      const existing=options.id?this.index.experiments.filter(e=>e.id===options.id).at(-1):undefined;
      if(options.id&&!existing)fail('NOT_FOUND','Unknown experiment.',404);
      if(existing&&options.expectedRevision!==existing.revision)fail('STALE_REVISION','Experiment changed. Reload it before saving.',409);
      if(!existing&&options.expectedRevision!==undefined)fail('INVALID_CONFIG','New experiments do not have a prior revision.');
      if(existing?.revision===64)fail('STORE_FULL','This experiment reached 64 saved revisions.',507);
      if(!existing&&new Set(this.index.experiments.map(e=>e.id)).size>=32)fail('STORE_FULL','The local store reached 32 experiments.',507);
      const now=new Date().toISOString(),saved:SavedExperiment={id:existing?.id??randomUUID(),revision:(existing?.revision??0)+1,name:config.name,config,source:manifest.source,sourceHash:manifest.sourceHash,seed:manifest.seed,createdAt:existing?.createdAt??now,updatedAt:now};
      const next={...this.index,experiments:[...this.index.experiments,saved]};await this.publish(join(this.directory,'index.json'),next);this.index=next;return clone(saved);
    });
  }
  async createRun(experimentId:string,revision:number,requestId:string){
    if(!z.string().min(1).max(128).safeParse(requestId).success)fail('INVALID_REQUEST','A run request needs a bounded unique request ID.');
    return this.serial(async()=>{
      const prior=this.index.runs.find(r=>r.requestId===requestId);
      if(prior){if(prior.experimentId!==experimentId||prior.revision!==revision)fail('REQUEST_CONFLICT','Run request ID already pins another configuration.',409);return clone(await this.readRun(prior.id));}
      const experiment=this.index.experiments.find(e=>e.id===experimentId&&e.revision===revision);
      if(!experiment)fail('NOT_FOUND','Unknown experiment revision.',404);
      const latest=this.index.experiments.filter(e=>e.id===experimentId).at(-1)!;if(latest.revision!==revision)fail('STALE_REVISION','Run the current saved revision or reopen its prior run.',409);
      if(this.index.runs.length>=128)fail('STORE_FULL','The local store reached 128 runs.',507);
      const manifest=await recordingManifest(experiment.source,'mock-agent-protocol-1'),episode=createEpisode(compileExperiment(experiment.source).scenario),now=new Date().toISOString();
      const run:SavedRun={id:randomUUID(),experimentId,revision,requestId,name:experiment.name,config:clone(experiment.config),source:experiment.source,sourceHash:manifest.sourceHash,seed:manifest.seed,manifest,recording:exportEpisode(manifest,episode),status:'waiting',decisions:[],controllers:experiment.config.controllers.map(c=>({actor:c.actor,owner:c.kind==='baseline'?'baseline':'external'})),createdAt:now,updatedAt:now};
      const file=this.runFile(run.id);await this.publish(file,run);
      const next={...this.index,runs:[...this.index.runs,{id:run.id,experimentId,revision,requestId}]};
      try{await this.publish(join(this.directory,'index.json'),next);}catch(error){await unlink(file).catch(()=>{});this.sizes.delete(file);throw error;}
      this.index=next;this.cache.set(run.id,{run,episode});return clone(run);
    });
  }
  private async readRun(runId:string):Promise<SavedRun>{
    const cached=this.cache.get(runId);if(cached)return cached.run;
    const file=this.runFile(runId);let run:SavedRun;
    try{
      const size=(await stat(file)).size;if(size>64*1024*1024)throw Error('Run file exceeds its limit');
      run=runSchema.parse(JSON.parse(await readFile(file,'utf8'))) as SavedRun;
      const pin=this.index.experiments.find(e=>e.id===run.experimentId&&e.revision===run.revision);if(!pin||JSON.stringify(pin.config)!==JSON.stringify(run.config)||pin.source!==run.source||pin.sourceHash!==run.sourceHash||pin.name!==run.name||pin.seed!==run.seed)throw Error('Run pin mismatch');
      const replayed=await replayEpisode(run.recording);
      if(JSON.stringify(replayed.manifest)!==JSON.stringify(run.manifest)||run.manifest.sourceHash!==run.sourceHash||run.manifest.source!==run.source||run.manifest.seed!==run.seed||run.manifest.policy!=='mock-agent-protocol-1'||run.id!==runId)throw Error('Manifest mismatch');
      this.validateRuntime(run,replayed.episode);this.sizes.set(file,size);this.cache.set(runId,{run,episode:replayed.episode});
    }catch{fail('STORE_CORRUPT','Saved run is unreadable, altered or incompatible. Preserve it before recovery.',500);}
    return run;
  }
  private validateRuntime(run:SavedRun,episode:Episode){
    const actors=episode.scenario.agents.map(a=>a.id);if(run.controllers.length!==actors.length||new Set(run.controllers.map(c=>c.actor)).size!==actors.length||run.controllers.some(c=>!actors.includes(c.actor)))throw Error('Controller identities differ');
    const ended=episode.state.terminated?'completed':episode.state.truncated?'deadline':undefined;
    if(ended?run.status!==ended:run.status==='completed'||run.status==='deadline')throw Error('Run status differs from its trace');
  }
  async getRun(runId:string){await this.queue;if(!this.index.runs.some(r=>r.id===runId))fail('NOT_FOUND','Unknown run.',404);return clone(await this.readRun(runId));}
  async getRunSummary(runId:string){const run=await this.getRun(runId);return this.summary(run);}
  async listRuns(filter:{experimentId?:string}={}){await this.queue;const result:RunSummary[]=[];for(const entry of this.index.runs.slice().reverse())if(!filter.experimentId||entry.experimentId===filter.experimentId){const run=await this.readRun(entry.id);result.push(this.summary(run));}return result;}
  private summary(run:SavedRun):RunSummary{const {source:_source,manifest:_manifest,recording:_recording,decisions:_decisions,...metadata}=run,metrics=episodeMetrics(this.cache.get(run.id)!.episode);return clone({...metadata,steps:metrics.steps,metrics,...(run.config.input.mode==='brief'?{parameters:run.config.input.parameters}:{})});}
  async updateRun(runId:string,patch:{recording?:string;status:StoredRunStatus;controllers?:SavedRun['controllers'];decisions?:SavedRun['decisions'];reason?:string|null}){
    return this.serial(async()=>{
      if(!this.index.runs.some(run=>run.id===runId))fail('NOT_FOUND','Unknown run.',404);
      const before=await this.readRun(runId),cached=this.cache.get(runId)!;
      let episode=cached.episode;
      if(patch.recording!==undefined&&patch.recording!==before.recording){
        if(patch.recording.length>64*1024*1024||!patch.recording.startsWith(before.recording))fail('TRACE_CONFLICT','A saved run can only append validated transitions.',409);
        const extra=patch.recording.slice(before.recording.length).trim().split('\n');
        if(extra.length+episode.records.length>1000)fail('TRACE_CONFLICT','Run exceeds its transition budget.',409);
        for(const line of extra){const record=JSON.parse(line) as Transition;const next=stepEpisode(episode,record.actions);if(JSON.stringify(next.records.at(-1))!==JSON.stringify(record))fail('TRACE_CONFLICT','Saved transition differs from Dream execution.',409);episode=next;}
      }
      const next={...before,...patch,recording:patch.recording??before.recording,controllers:patch.controllers??before.controllers,updatedAt:new Date().toISOString()} as SavedRun;
      if(patch.reason===null)delete next.reason;
      const parsed=runSchema.safeParse(next);if(!parsed.success)fail('INVALID_RUN','Invalid run metadata.');this.validateRuntime(next,episode);
      await this.publish(this.runFile(runId),next);this.cache.set(runId,{run:clone(next),episode});return clone(next);
    });
  }
}
