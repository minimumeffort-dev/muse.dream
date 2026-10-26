import {afterEach,describe,it,expect} from 'vitest';
import {request as httpRequest,type Server} from 'node:http';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAgentHost} from '../server/http';
import {AgentRuntime,type AgentDecision} from '../src/agent-runtime';
import {ExperimentRun} from '../src/runner';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,mockAction,replayEpisode,type Parameters} from '../src/framework';

const admin='test-admin',actor='test-actor';
const source=(changes:Partial<Parameters>={})=>buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,{...DEFAULT_PARAMETERS,...changes}).source;
const cleanup:{server:Server;directory:string}[]=[];
afterEach(async()=>{
  for(const {server,directory} of cleanup.splice(0)){
    await new Promise<void>((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();});
    await rm(directory,{recursive:true,force:true});
  }
});
async function host(options:{now?:()=>number;timeoutMs?:number;parameters?:Partial<Parameters>}={}){
  const directory=await mkdtemp(join(tmpdir(),'dream-agent-host-'));
  await writeFile(join(directory,'index.html'),'<main>Dreams Lab</main>');
  const runtime=await AgentRuntime.create(source(options.parameters),{externalActor:'courier_b',now:options.now,timeoutMs:options.timeoutMs});
  const {server}=createAgentHost(runtime,{directory,adminToken:admin,actorToken:actor});cleanup.push({server,directory});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();if(!address||typeof address==='string')throw new Error('Expected ephemeral loopback listener');
  const port=address.port;
  async function call(path:string,options:{method?:string;token?:string;body?:unknown;headers?:Record<string,string>}={}){
    const payload=options.body===undefined?undefined:JSON.stringify(options.body);
    return new Promise<{status:number;headers:Record<string,string|string[]|undefined>;text:string;json:()=>any}>((resolve,reject)=>{
      const req=httpRequest({hostname:'127.0.0.1',port,path,method:options.method??'GET',headers:{...(options.token?{Authorization:`Bearer ${options.token}`} :{}),...(payload?{'Content-Type':'application/json','Content-Length':String(Buffer.byteLength(payload))}:{}),...options.headers}},res=>{
        const chunks:Buffer[]=[];res.on('data',chunk=>chunks.push(Buffer.from(chunk)));res.on('end',()=>{const text=Buffer.concat(chunks).toString('utf8');resolve({status:res.statusCode!,headers:res.headers,text,json:()=>JSON.parse(text)});});
      });
      req.on('error',reject);req.end(payload);
    });
  }
  return {runtime,call,origin:`http://127.0.0.1:${port}`};
}
const action=(decision:AgentDecision)=>{const {observation,...identity}=decision;return {...identity,action:mockAction(observation)};};

describe('Loopback agent HTTP boundary',()=>{
  it('authenticates actors and limits observations to their own private state',async()=>{
    const {runtime,call}=await host();
    expect((await call('/api/actors/courier_b/decision')).status).toBe(401);
    expect((await call('/api/actors/courier_b/decision',{token:'incorrect'})).status).toBe(401);
    expect((await call('/api/actors/courier_b/decision',{token:'é'.repeat(actor.length)})).status).toBe(401);
    expect((await call('/api/actors/courier_a/decision',{token:actor})).status).toBe(401);
    const response=await call('/api/actors/courier_b/decision',{token:actor});expect(response.status).toBe(200);
    const decision=response.json() as AgentDecision;
    expect(decision.actorId).toBe('courier_b');expect(decision.observation.objectives.every(goal=>goal.agent==='courier_b')).toBe(true);
    expect(response.text).not.toContain('courier_a');expect(response.headers['cache-control']).toBe('no-store');
    expect((await call('/api/actors/courier_b/action',{method:'POST',token:actor,body:{...action(decision),actorId:'courier_a'}})).status).toBe(403);
    expect((await call('/api/actors/courier_b/action',{method:'POST',token:actor,body:{...action(decision),extra:true}})).status).toBe(400);
    expect((await call('/api/actors/courier_b/action',{method:'POST',token:actor,body:{oversized:'x'.repeat(4096)}})).status).toBe(413);
    expect(runtime.run.length).toBe(0);
  });
  it('keeps researcher records, reports and exports behind the admin credential',async()=>{
    const {call}=await host();
    for(const path of ['/api/view','/api/report','/api/export']){
      expect((await call(path)).status).toBe(401);
      expect((await call(path,{token:actor})).status).toBe(401);
      expect((await call(path,{token:admin})).status).toBe(200);
    }
  });
  it('runs an external mock over HTTP alongside the baseline and replays the same outcome',async()=>{
    const {runtime,call}=await host();
    let firstBody:ReturnType<typeof action>|undefined,firstReceipt:unknown;
    for(let step=0;step<100&&runtime.status==='waiting';step++){
      const response=await call('/api/actors/courier_b/decision',{token:actor});expect(response.status).toBe(200);
      const body=action(response.json()),submitted=await call('/api/actors/courier_b/action',{method:'POST',token:actor,body});expect(submitted.status).toBe(200);
      if(!firstBody){firstBody=body;firstReceipt=submitted.json();}
      const committed=runtime.run.length;
      const retry=await call('/api/actors/courier_b/action',{method:'POST',token:actor,body});expect(retry.status).toBe(200);expect(retry.json()).toEqual(submitted.json());expect(runtime.run.length).toBe(committed);
    }
    expect(runtime.status).toBe('completed');
    const direct=await ExperimentRun.create(source());while(direct.advance()){}
    expect(runtime.run.records).toEqual(direct.records);expect(runtime.run.metrics()).toEqual(direct.metrics());
    const view=await call('/api/view',{token:admin});expect(view.status).toBe(200);
    expect(view.json()).toMatchObject({version:'dream-host-1',runId:runtime.id,status:'completed',from:-1});
    expect(view.json().records).toHaveLength(runtime.run.length);expect(view.json().latency.decisions).toBe(runtime.run.length);
    const tail=await call(`/api/view?after=${runtime.run.length-1}`,{token:admin});expect(tail.json().records).toHaveLength(1);
    expect((await call('/api/view?after=1000',{token:admin})).status).toBe(400);
    const report=await call('/api/report',{token:admin});expect(report.status).toBe(200);expect(report.json().metrics).toEqual(direct.metrics());expect(report.json().agents).toHaveLength(2);
    const exported=await call('/api/export',{token:admin});expect(exported.status).toBe(200);expect(exported.headers['content-type']).toContain('application/x-ndjson');
    const replay=await replayEpisode(exported.text);expect(replay.episode.state).toEqual(direct.at(direct.length));
    expect((await call('/api/actors/courier_b/action',{method:'POST',token:actor,body:firstBody})).json()).toEqual(firstReceipt);expect(runtime.run.length).toBe(direct.length);
  });
  it('rejects unrelated origins and Host headers while serving its own loopback page',async()=>{
    const {call,origin}=await host();
    expect((await call('/',{headers:{Origin:'https://unrelated.example'}})).status).toBe(403);
    expect((await call('/',{headers:{Host:'unrelated.example'}})).status).toBe(403);
    expect((await call('/',{headers:{Host:new URL(origin).host,Origin:origin}})).status).toBe(200);
    const page=await call('/');expect(page.text).toContain('Dreams Lab');expect(page.headers['access-control-allow-origin']).toBeUndefined();
    expect((await call('/api/actors/courier_b/decision',{token:actor,headers:{Origin:'http://localhost'}})).status).toBe(403);
  });
  it('freezes on timeout and resumes at the same step with fresh decisions',async()=>{
    let now=0;const {runtime,call}=await host({now:()=>now,timeoutMs:10});
    const old=(await call('/api/actors/courier_b/decision',{token:actor})).json() as AgentDecision;
    now=11;
    const view=await call('/api/view',{token:admin});expect(view.json().status).toBe('paused');expect(runtime.run.length).toBe(0);
    expect((await call('/api/actors/courier_b/action',{method:'POST',token:actor,body:action(old)})).status).toBe(409);expect(runtime.run.length).toBe(0);
    expect((await call('/api/resume',{method:'POST',token:actor})).status).toBe(401);
    expect((await call('/api/resume',{method:'POST',token:admin})).status).toBe(200);
    const fresh=(await call('/api/actors/courier_b/decision',{token:actor})).json() as AgentDecision;
    expect(fresh.step).toBe(0);expect(fresh.epoch).toBe(old.epoch+1);expect(fresh.requestId).not.toBe(old.requestId);
    expect((await call('/api/actors/courier_b/action',{method:'POST',token:actor,body:action(fresh)})).status).toBe(200);expect(runtime.run.length).toBe(1);
  });
  it('rotates credentials on handoff and rejects revoked tokens and old decisions',async()=>{
    const {runtime,call}=await host();
    const old=(await call('/api/actors/courier_b/decision',{token:actor})).json() as AgentDecision;
    expect((await call('/api/actors/courier_b/handoff',{method:'POST',token:actor,body:{owner:'baseline'}})).status).toBe(401);
    expect((await call('/api/actors/courier_b/handoff',{method:'POST',token:admin,body:{owner:'baseline',extra:true}})).status).toBe(400);
    expect((await call('/api/actors/courier_b/handoff',{method:'POST',token:admin,body:{owner:'baseline'}})).status).toBe(200);expect(runtime.owner('courier_b')).toBe('baseline');
    expect((await call('/api/actors/courier_b/decision',{token:actor})).status).toBe(401);
    const transferred=await call('/api/actors/courier_b/handoff',{method:'POST',token:admin,body:{owner:'external'}});expect(transferred.status).toBe(200);
    const replacementToken=transferred.json().token as string;expect(typeof replacementToken).toBe('string');
    expect((await call('/api/actors/courier_b/decision',{token:actor})).status).toBe(401);
    const fresh=await call('/api/actors/courier_b/decision',{token:replacementToken});expect(fresh.status).toBe(200);expect(fresh.json().epoch).toBeGreaterThan(old.epoch);
    const before=runtime.run.length;
    expect((await call('/api/actors/courier_b/action',{method:'POST',token:replacementToken,body:action(old)})).status).toBe(409);expect(runtime.run.length).toBe(before);
    expect((await call('/api/actors/courier_b/action',{method:'POST',token:replacementToken,body:action(fresh.json())})).status).toBe(200);expect(runtime.run.length).toBe(before+1);
  });
});
