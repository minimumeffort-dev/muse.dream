import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {z} from 'zod';
import {AgentRuntime,AgentRuntimeError} from '../src/agent-runtime';
import {mockAction} from '../src/framework';
import type {Transition} from '../src/engine/sim/episode';
import {buildRunReport} from '../src/report';
import {ExperimentStore,StoreError,type SavedRun} from './experiments';

export interface ExternalMockConnection {runId:string;actor:string;token:string}
export interface LabHostOptions {
  directory:string;adminToken?:string;mockStepMs?:number;
  onExternalMock?:(connection:ExternalMockConnection)=>void|Promise<void>;
}
type DecisionTiming={requestId:string;actor:string;step:number;started:number;latencyMs?:number};
type Entry={runtime:AgentRuntime;saved:SavedRun;tokens:Map<string,string>;decisions:DecisionTiming[];reason?:string;storageError?:string};
const revision=z.number().int().min(1).max(64);
const startSchema=z.object({revision,requestId:z.string().min(1).max(128)}).strict();
const updateSchema=z.object({expectedRevision:revision}).passthrough();
const freshToken=()=>randomBytes(32).toString('hex');
const httpError=(message:string,status:number)=>Object.assign(Error(message),{status});

/** One loopback host owns mutations; durable accepted traces precede actor acknowledgements. */
export function createLabHost(store:ExperimentStore,options:LabHostOptions){
  const adminToken=options.adminToken??freshToken(),entries=new Map<string,Entry>();
  let queue:Promise<unknown>=Promise.resolve(),closed=false,pumping=false;
  const serial=<T>(work:()=>Promise<T>)=>{const next=queue.then(work);queue=next.catch(()=>{});return next;};
  const equal=(left:string,right:string)=>{const a=Buffer.from(left),b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b);};
  const authorize=(req:IncomingMessage,token:string|undefined)=>{if(!token||!equal(req.headers.authorization??'','Bearer '+token))throw httpError('Unauthorized',401);};
  const json=(res:ServerResponse,status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  const body=async(req:IncomingMessage)=>{let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>256*1024)throw httpError('Request exceeds 256 KiB',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw httpError('Request must contain valid JSON',400);}};
  async function restore(saved:SavedRun,forcePause=false):Promise<Entry>{
    const runtime=await AgentRuntime.create(saved.source,{id:()=>saved.id});
    for(const controller of saved.controllers)if(controller.owner!=='baseline')runtime.handoff(controller.actor,controller.owner);
    for(const line of saved.recording.trim().split('\n').slice(1))runtime.run.appendRecorded(JSON.parse(line) as Transition);
    if(forcePause||saved.status==='paused')runtime.pause();
    const tokens=new Map(saved.controllers.filter(c=>c.owner==='external').map(c=>[c.actor,freshToken()]));
    return {runtime,saved,tokens,decisions:structuredClone(saved.decisions??[]),reason:saved.reason};
  }
  async function entry(runId:string){let found=entries.get(runId);if(!found){found=await restore(await store.getRun(runId));entries.set(runId,found);}return found;}
  const controllers=(item:Entry)=>item.runtime.actors.map(actor=>({actor,owner:item.runtime.owner(actor) as 'baseline'|'external'}));
  async function persist(item:Entry){
    const status=item.runtime.status;
    if(status==='paused'&&!item.reason&&!item.storageError)item.reason='A controller timed out. Resume this run to continue.';
    const patch={recording:item.runtime.run.export(),status,controllers:controllers(item),decisions:item.decisions,reason:item.storageError??item.reason??null};
    if(patch.recording===item.saved.recording&&patch.status===item.saved.status&&JSON.stringify(patch.controllers)===JSON.stringify(item.saved.controllers)&&JSON.stringify(patch.decisions)===JSON.stringify(item.saved.decisions??[])&&(item.saved.reason??null)===patch.reason)return;
    try{item.saved=await store.updateRun(item.saved.id,patch);}
    catch(error){
      const restored=await restore(item.saved,true);restored.storageError='History could not be saved. The last durable step is preserved. Resume after fixing storage.';
      entries.set(item.saved.id,restored);throw httpError(restored.storageError,503);
    }
  }
  async function summary(item:Entry){
    const result=await store.getRunSummary(item.saved.id);
    return item.storageError?{...result,status:'paused',reason:item.storageError}:result;
  }
  async function launch(item:Entry,onlyActor?:string){
    if(!options.onExternalMock)return;
    try{for(const [actor,token] of item.tokens)if(!onlyActor||actor===onlyActor)await options.onExternalMock({runId:item.saved.id,actor,token});}
    catch{item.runtime.pause();item.storageError='The external mock could not start. Resume to try again.';await persist(item);throw httpError(item.storageError,503);}
  }
  async function baseline(item:Entry){
    if(item.storageError||item.runtime.status!=='waiting'){await persist(item);return;}
    const step=item.runtime.run.length;
    for(const actor of item.runtime.actors)item.runtime.decision(actor,item.runtime.owner(actor));
    for(const actor of item.runtime.actors){
      if(item.runtime.owner(actor)!=='baseline'||item.runtime.run.length!==step)continue;
      const {observation,...identity}=item.runtime.decision(actor,'baseline');
      item.runtime.submit('baseline',{...identity,action:mockAction(observation)});
    }
    await persist(item);
  }
  async function available(exceptId?:string){
    for(const saved of await store.listRuns())if(saved.id!==exceptId&&saved.status==='waiting'){
      const other=await entry(saved.id);await persist(other);
      if(other.runtime.status==='waiting')throw httpError('Another run is active. Wait for it to finish before starting or resuming a run.',409);
    }
  }
  async function request(req:IncomingMessage,res:ServerResponse){
    if(closed)throw httpError('The host is shutting down. Reconnect after it restarts.',503);
    const address=server.address(),port=typeof address==='object'&&address?address.port:0,origin=`http://127.0.0.1:${port}`;
    if(req.headers.host!==`127.0.0.1:${port}`||req.headers.origin&&req.headers.origin!==origin)throw httpError('Use the loopback host address.',403);
    const url=new URL(req.url??'/',origin),method=req.method??'GET';
    const actorPath=url.pathname.match(/^\/api\/runs\/([a-zA-Z0-9_-]{1,80})\/actors\/([a-z][a-z0-9_]{0,31})\/(decision|action|handoff)$/);
    if(actorPath){
      const item=await entry(actorPath[1]!),actor=actorPath[2]!,operation=actorPath[3]!;
      if(!item.runtime.actors.includes(actor))throw httpError('Unknown actor',404);
      if(operation==='handoff'&&method==='POST'){
        authorize(req,adminToken);const input=z.object({owner:z.enum(['baseline','external'])}).strict().parse(await body(req));
        item.runtime.handoff(actor,input.owner);const token=freshToken();item.tokens.set(actor,token);await persist(item);
        if(input.owner==='external')await launch(item,actor);json(res,200,{actor,owner:input.owner,...(input.owner==='external'?{token}:{})});return;
      }
      authorize(req,item.tokens.get(actor));
      if(item.storageError)throw httpError(item.storageError,503);
      if(operation==='decision'&&method==='GET'){
        let decision;
        try{decision=item.runtime.decision(actor,'external');}catch(error){await persist(item);throw error;}
        if(!item.decisions.some(d=>d.requestId===decision.requestId))item.decisions.push({requestId:decision.requestId,actor,step:decision.step,started:Date.now()});
        if(item.decisions.length>8000)item.decisions.shift();await persist(item);json(res,200,decision);return;
      }
      if(operation==='action'&&method==='POST'){
        const input=await body(req);if(input?.actorId!==actor)throw httpError('Actor does not match credential',403);
        let receipt;
        try{receipt=item.runtime.submit('external',input);}catch(error){await persist(item);throw error;}
        const timing=item.decisions.find(d=>d.requestId===input.requestId);if(timing&&timing.latencyMs===undefined)timing.latencyMs=Math.max(0,Date.now()-timing.started);
        await persist(item);json(res,200,receipt);return;
      }
      throw httpError('Method not allowed',405);
    }
    if(url.pathname.startsWith('/api/')){
      authorize(req,adminToken);
      if(url.pathname==='/api/experiments'){
        if(method==='GET'){json(res,200,{experiments:await store.listExperiments()});return;}
        if(method==='POST'){json(res,201,await store.save(await body(req)));return;}
      }
      const experimentPath=url.pathname.match(/^\/api\/experiments\/([a-zA-Z0-9_-]{1,80})(?:\/(runs))?$/);
      if(experimentPath){
        const experimentId=experimentPath[1]!;
        if(!experimentPath[2]&&method==='GET'){json(res,200,await store.getExperiment(experimentId));return;}
        if(!experimentPath[2]&&method==='PUT'){
          const raw=await body(req),{expectedRevision}=updateSchema.parse(raw),{expectedRevision:_expected,...config}=raw;
          json(res,200,await store.save(config,{id:experimentId,expectedRevision}));return;
        }
        if(experimentPath[2]==='runs'&&method==='POST'){
          const input=startSchema.parse(await body(req)),existing=(await store.listRuns()).find(run=>run.requestId===input.requestId);
          if(!existing)await available();
          const saved=await store.createRun(experimentId,input.revision,input.requestId);
          if(!existing){const item=await restore(saved);entries.set(saved.id,item);await launch(item);}
          json(res,existing?200:201,await store.getRunSummary(saved.id));return;
        }
      }
      if(url.pathname==='/api/runs'&&method==='GET'){
        const runs=await store.listRuns({experimentId:url.searchParams.get('experimentId')??undefined});
        json(res,200,{runs:runs.map(run=>entries.get(run.id)?.storageError?{...run,status:'paused',reason:entries.get(run.id)!.storageError}:run)});return;
      }
      const runPath=url.pathname.match(/^\/api\/runs\/([a-zA-Z0-9_-]{1,80})(?:\/(view|report|export|resume))?$/);
      if(runPath){
        const item=await entry(runPath[1]!),operation=runPath[2];
        if(!operation&&method==='GET'){json(res,200,await summary(item));return;}
        if(operation==='view'&&method==='GET'){
          if(!item.storageError)await persist(item);const after=Number(url.searchParams.get('after')??'-1');if(!Number.isInteger(after)||after< -1||after>item.runtime.run.length)throw httpError('Invalid recorded step',400);
          const completed=item.decisions.filter(d=>d.latencyMs!==undefined);
          json(res,200,{version:'dream-host-1',runId:item.saved.id,status:item.storageError?'paused':item.runtime.status,manifest:item.runtime.run.manifest,from:after,records:item.runtime.run.records.slice(Math.max(0,after)),controllers:controllers(item),latency:{decisions:completed.length,totalMs:completed.reduce((sum,d)=>sum+d.latencyMs!,0),maxMs:Math.max(0,...completed.map(d=>d.latencyMs!))},run:await summary(item)});return;
        }
        if(operation==='report'&&method==='GET'){json(res,200,{...buildRunReport(item.runtime.run.episodeSnapshot),run:await summary(item),decisions:item.decisions});return;}
        if(operation==='export'&&method==='GET'){res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store'});res.end(item.runtime.run.export());return;}
        if(operation==='resume'&&method==='POST'){
          await available(item.saved.id);if(item.runtime.run.ended)throw httpError('Run has ended',409);
          if(item.runtime.status!=='paused')throw httpError('This run is already active.',409);
          item.storageError=undefined;item.reason=undefined;item.runtime.resume();await persist(item);
          for(const actor of item.runtime.actors)if(item.runtime.owner(actor)==='external')item.tokens.set(actor,freshToken());
          await launch(item);json(res,200,await summary(item));return;
        }
      }
      throw httpError('Unknown API operation',404);
    }
    if(method!=='GET'&&method!=='HEAD')throw httpError('Method not allowed',405);
    const file=resolve(options.directory,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(resolve(options.directory)+sep)||!(await stat(file).catch(()=>undefined))?.isFile())throw httpError('Not found',404);
    const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2'};
    res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(method==='HEAD'?undefined:await readFile(file));
  }
  const server=createServer((req,res)=>{void serial(()=>request(req,res)).catch(error=>{
    const failure=error as Error&{status?:number;code?:string};const status=error instanceof z.ZodError?400:failure.status??(error instanceof SyntaxError?400:500);
    json(res,status,{error:status===500?'The local host could not read or save this request. Preserve the data and check the host log.':failure.message,code:failure.code});
  });});
  const stepMs=options.mockStepMs??250;
  if(!Number.isFinite(stepMs)||stepMs<0||stepMs>30000)throw Error('Mock step interval must be 0..30000 ms.');
  const pump=setInterval(()=>{if(closed||pumping)return;pumping=true;void serial(async()=>{for(const item of entries.values())if(!item.runtime.run.ended)await baseline(item);}).catch(()=>{}).finally(()=>{pumping=false;});},Math.max(1,stepMs));
  server.requestTimeout=10000;server.headersTimeout=10000;
  async function close(){
    if(closed)return;closed=true;clearInterval(pump);let failure:unknown;
    try{await serial(async()=>{for(const item of entries.values())if(!item.runtime.run.ended){item.runtime.pause();item.reason='Host stopped. Resume this run to continue.';await persist(item);}});}catch(error){failure=error;}
    if(server.listening)await new Promise<void>((done,fail)=>{server.close(error=>error?fail(error):done());server.closeAllConnections();});
    if(failure)throw failure;
  }
  server.on('close',()=>{closed=true;clearInterval(pump);});
  return {server,adminToken,close};
}
