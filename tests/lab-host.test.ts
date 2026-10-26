import {afterEach,it,expect} from 'vitest';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabHost,type ExternalMockConnection} from '../server/lab-host';
import {ExperimentStore,type ExperimentConfig,type StoreOptions} from '../server/experiments';
import {BRIEF_BUILDER,SCENARIO_BRIEFS,DEFAULT_PARAMETERS,DEFAULT_TASK,DEFAULT_WORLD,buildFromBrief,mockAction,replayEpisode} from '../src/framework';
import type {AgentDecision} from '../src/agent-runtime';

const admin='private-test-admin';
const cleanups:(()=>Promise<unknown>)[]=[];
afterEach(async()=>{for(const close of cleanups.splice(0).reverse())await close();});
const config=(budget=16,external=false):ExperimentConfig=>({name:'Delivery experiment',input:{mode:'brief',world:DEFAULT_WORLD,task:DEFAULT_TASK,parameters:{...DEFAULT_PARAMETERS,budget}},controllers:['courier_a','courier_b'].map(actor=>({actor,kind:external?'external-mock':'baseline'}))});
async function start(directory?:string,storeOptions?:StoreOptions,mockStepMs=0){
  const root=directory??await mkdtemp(join(tmpdir(),'dream-lab-host-'));
  if(!directory){await writeFile(join(root,'index.html'),'<main>Dreams Lab</main>');cleanups.push(()=>rm(root,{recursive:true,force:true}));}
  const store=await ExperimentStore.open(join(root,'saved'),storeOptions),connections:ExternalMockConnection[]=[];
  const host=createLabHost(store,{directory:root,adminToken:admin,mockStepMs,onExternalMock:connection=>{connections.push(connection);}});
  await new Promise<void>(ok=>host.server.listen(0,'127.0.0.1',ok));
  const address=host.server.address();if(!address||typeof address==='string')throw Error('No local listener');
  const origin=`http://127.0.0.1:${address.port}`;
  let stopped=false;const close=async()=>{if(!stopped){stopped=true;await host.close();}};cleanups.push(close);
  const request=async(path:string,options:{method?:string;body?:unknown;token?:string;origin?:string}={})=>{
    const response=await fetch(origin+path,{method:options.method??'GET',headers:{Authorization:'Bearer '+(options.token??admin),'Content-Type':'application/json',...(options.origin?{Origin:options.origin}:{})},...(options.body!==undefined?{body:JSON.stringify(options.body)}:{})});
    const text=await response.text();return {status:response.status,text,json:()=>JSON.parse(text)};
  };
  return {directory:root,store,connections,host,request,close};
}
async function savedRun(host:Awaited<ReturnType<typeof start>>,input=config(),requestId=crypto.randomUUID()){
  const saved=(await host.request('/api/experiments',{method:'POST',body:input})).json();
  const response=await host.request(`/api/experiments/${saved.id}/runs`,{method:'POST',body:{revision:saved.revision,requestId}});
  expect(response.status).toBe(201);return {saved,run:response.json(),requestId};
}
async function ended(host:Awaited<ReturnType<typeof start>>,runId:string){
  for(let i=0;i<250;i++){
    const run=(await host.request(`/api/runs/${runId}`)).json();if(run.status==='completed'||run.status==='deadline')return run;
    await new Promise(ok=>setTimeout(ok,2));
  }throw Error('Run did not finish');
}
const action=(decision:AgentDecision)=>{const {observation,...identity}=decision;return {...identity,action:mockAction(observation)};};

it('creates every selectable world over HTTP and preserves its source-authored presentation on restart',async()=>{
  const host=await start(),pins=[];
  for(const brief of SCENARIO_BRIEFS){
    const {scenario}=buildFromBrief(brief.world,brief.task,DEFAULT_PARAMETERS);
    const input:ExperimentConfig={name:brief.label,input:{mode:'brief',world:brief.world,task:brief.task,parameters:DEFAULT_PARAMETERS,builder:BRIEF_BUILDER},controllers:scenario.agents.map(a=>({actor:a.id,kind:'baseline'}))};
    const {run}=await savedRun(host,input);pins.push(run);
    expect((await ended(host,run.id)).metrics).toMatchObject({success:true,violations:0});
    const exported=await host.request(`/api/runs/${run.id}/export`),replayed=await replayEpisode(exported.text);
    expect(replayed.episode.scenario.locations.map(l=>l.look)).toEqual(scenario.locations.map(l=>l.look));
    expect((await host.request(`/api/runs/${run.id}/report`)).json().metrics.success).toBe(true);
  }
  await host.close();const reopened=await start(host.directory);
  for(const pin of pins)expect((await reopened.request(`/api/runs/${pin.id}`)).json()).toMatchObject({sourceHash:pin.sourceHash,status:'completed'});
});

it('saves revisions, runs changed budgets, and preserves both replayable outcomes after restarting the host',async()=>{
  const host=await start(),first=await savedRun(host);
  const rich=await ended(host,first.run.id);expect(rich.metrics).toMatchObject({completed:4,total:4,steps:27,creditsSpent:16,violations:0});
  const revised=(await host.request(`/api/experiments/${first.saved.id}`,{method:'PUT',body:{...config(4),expectedRevision:1}})).json();expect(revised.revision).toBe(2);
  const poor=(await host.request(`/api/experiments/${revised.id}/runs`,{method:'POST',body:{revision:2,requestId:'budget-four'}})).json();
  const limited=await ended(host,poor.id);expect(limited.metrics).toMatchObject({completed:2,total:4,steps:80,creditsSpent:8,truncated:true});expect(limited.seed).toBe(rich.seed);
  const before=(await host.request(`/api/runs/${rich.id}/export`)).text;await host.close();
  const reopened=await start(host.directory),history=(await reopened.request('/api/runs')).json().runs;
  expect(history).toHaveLength(2);expect(history.find((r:any)=>r.id===rich.id).config.input.parameters.budget).toBe(16);expect(history.find((r:any)=>r.id===limited.id).config.input.parameters.budget).toBe(4);
  expect((await reopened.request(`/api/runs/${rich.id}/export`)).text).toBe(before);
  const replay=await replayEpisode(before);expect(replay.episode.state.terminated).toBe(true);
  const report=(await reopened.request(`/api/runs/${rich.id}/report`)).json();expect(report.metrics).toEqual(rich.metrics);expect(report.run.sourceHash).toBe(rich.sourceHash);expect(report.findings[0].step).toBe(20);
});

it('enforces admin and actor privacy and keeps the local hostname/origin boundary',async()=>{
  const host=await start(),run=await savedRun(host,config(16,true));
  expect((await host.request('/api/experiments',{token:'wrong'})).status).toBe(401);
  expect((await host.request('/api/runs',{origin:'https://unrelated.example'})).status).toBe(403);
  const connection=host.connections.find(c=>c.actor==='courier_a')!;
  expect((await host.request(`/api/runs/${run.run.id}/report`,{token:connection.token})).status).toBe(401);
  const decision=(await host.request(`/api/runs/${run.run.id}/actors/courier_a/decision`,{token:connection.token})).json();
  expect(JSON.stringify(decision)).not.toContain('courier_b');expect(decision.observation.objectives.every((goal:any)=>goal.agent==='courier_a')).toBe(true);
  expect((await host.request(`/api/runs/${run.run.id}/actors/courier_b/decision`,{token:connection.token})).status).toBe(401);
  expect((await host.request(`/api/runs/${run.run.id}/actors/courier_a/action`,{method:'POST',token:connection.token,body:{...action(decision),actorId:'courier_b'}})).status).toBe(403);
});

it('starts each idempotent request once and rejects stale revisions and overlapping active runs',async()=>{
  const host=await start(),first=await savedRun(host,config(16,true),'one-request');
  const retry=await host.request(`/api/experiments/${first.saved.id}/runs`,{method:'POST',body:{revision:1,requestId:'one-request'}});expect(retry.status).toBe(200);expect(retry.json().id).toBe(first.run.id);expect(host.connections).toHaveLength(2);
  expect((await host.request(`/api/runs/${first.run.id}/resume`,{method:'POST'})).status).toBe(409);expect(host.connections).toHaveLength(2);
  expect((await host.request(`/api/experiments/${first.saved.id}/runs`,{method:'POST',body:{revision:1,requestId:'another'}})).status).toBe(409);
  expect((await host.request(`/api/experiments/${first.saved.id}`,{method:'PUT',body:{...config(4),expectedRevision:0}})).status).toBe(400);
  const updated=await host.request(`/api/experiments/${first.saved.id}`,{method:'PUT',body:{...config(4),expectedRevision:1}});expect(updated.status).toBe(200);
  expect((await host.request(`/api/experiments/${first.saved.id}`,{method:'PUT',body:{...config(4),expectedRevision:1}})).status).toBe(409);
  expect((await host.request(`/api/experiments/${first.saved.id}/runs`,{method:'POST',body:{revision:2,requestId:'one-request'}})).status).toBe(409);
});

it('recovers unfinished runs paused, revokes pending credentials, and resumes the same durable world',async()=>{
  const host=await start(),first=await savedRun(host,config(16,true));
  const old=host.connections.find(c=>c.actor==='courier_a')!,decision=(await host.request(`/api/runs/${first.run.id}/actors/courier_a/decision`,{token:old.token})).json();
  await host.close();const reopened=await start(host.directory);
  const view=(await reopened.request(`/api/runs/${first.run.id}/view?after=-1`)).json();expect(view.status).toBe('paused');expect(view.run.steps).toBe(0);expect(reopened.connections).toHaveLength(0);
  expect((await reopened.request(`/api/runs/${first.run.id}/actors/courier_a/action`,{method:'POST',token:old.token,body:action(decision)})).status).toBe(401);
  expect((await reopened.request(`/api/runs/${first.run.id}/resume`,{method:'POST'})).status).toBe(200);expect(reopened.connections).toHaveLength(2);
  const fresh=reopened.connections.find(c=>c.actor==='courier_a')!;expect(fresh.token).not.toBe(old.token);
  const current=(await reopened.request(`/api/runs/${first.run.id}/actors/courier_a/decision`,{token:fresh.token})).json();expect(current.step).toBe(0);expect(current.epoch).toBeGreaterThan(decision.epoch);expect(current.requestId).not.toBe(decision.requestId);
});

it('waits for every external actor, persists a committed transition before acknowledging it, and never double-commits a retry',async()=>{
  const host=await start(),first=await savedRun(host,config(16,true));let lastBody:unknown,lastToken='';
  for(const connection of host.connections){
    const decision=(await host.request(`/api/runs/${first.run.id}/actors/${connection.actor}/decision`,{token:connection.token})).json(),body=action(decision);
    const result=await host.request(`/api/runs/${first.run.id}/actors/${connection.actor}/action`,{method:'POST',token:connection.token,body});expect(result.status).toBe(200);lastBody=body;lastToken=connection.token;
  }
  const durable=await host.store.getRunSummary(first.run.id);expect(durable.steps).toBe(1);
  const retry=await host.request(`/api/runs/${first.run.id}/actors/courier_b/action`,{method:'POST',token:lastToken,body:lastBody});expect(retry.status).toBe(200);expect((await host.store.getRunSummary(first.run.id)).steps).toBe(1);
});

it('rolls a failed durable commit back to the saved head and exposes a paused storage error',async()=>{
  let fail=false;const host=await start(undefined,{write:async(file,text)=>{if(fail&&file.includes('/runs/'))throw Error('Disk unavailable');await writeFile(file,text,{mode:0o600});}});
  const first=await savedRun(host,config(16,true));const decisions=[];
  for(const connection of host.connections){const decision=(await host.request(`/api/runs/${first.run.id}/actors/${connection.actor}/decision`,{token:connection.token})).json();decisions.push({connection,decision});}
  const a=decisions[0]!,b=decisions[1]!;
  expect((await host.request(`/api/runs/${first.run.id}/actors/${a.connection.actor}/action`,{method:'POST',token:a.connection.token,body:action(a.decision)})).status).toBe(200);
  fail=true;
  expect((await host.request(`/api/runs/${first.run.id}/actors/${b.connection.actor}/action`,{method:'POST',token:b.connection.token,body:action(b.decision)})).status).toBe(503);
  const view=(await host.request(`/api/runs/${first.run.id}/view?after=-1`)).json();expect(view.run.steps).toBe(0);expect(view.status).toBe('paused');expect(view.run.reason).toContain('last durable step');
  fail=false;expect((await host.request(`/api/runs/${first.run.id}/resume`,{method:'POST'})).status).toBe(200);
});

it('persists controller handoff without rewriting the original experiment assignment',async()=>{
  const host=await start(),first=await savedRun(host,config(16,true));
  const old=host.connections.find(connection=>connection.actor==='courier_a')!;
  const transferred=await host.request(`/api/runs/${first.run.id}/actors/courier_a/handoff`,{method:'POST',body:{owner:'baseline'}});expect(transferred.status).toBe(200);
  expect((await host.request(`/api/runs/${first.run.id}/actors/courier_a/decision`,{token:old.token})).status).toBe(401);
  await host.close();const reopened=await start(host.directory);
  const view=(await reopened.request(`/api/runs/${first.run.id}/view?after=-1`)).json();
  expect(view.controllers.find((controller:any)=>controller.actor==='courier_a').owner).toBe('baseline');
  expect(view.run.config.controllers.find((controller:any)=>controller.actor==='courier_a').kind).toBe('external-mock');
});

it('rejects queued mutations once shutdown starts while preserving the in-flight accepted write',async()=>{
  let block=false,entered!:()=>void,release!:()=>void;
  const writing=new Promise<void>(ok=>{entered=ok;}),held=new Promise<void>(ok=>{release=ok;});
  const host=await start(undefined,{write:async(file,text)=>{
    if(block&&file.endsWith('index.json')){block=false;entered();await held;}
    await writeFile(file,text,{mode:0o600});
  }});
  block=true;
  const first=host.request('/api/experiments',{method:'POST',body:config()});await writing;
  const queued=new Promise<void>(ok=>host.host.server.once('request',()=>ok()));
  const second=host.request('/api/experiments',{method:'POST',body:{...config(),name:'Must not be saved'}});await queued;
  const closing=host.close();release();
  const results=await Promise.allSettled([first,second]);await closing;
  expect(results[0].status).toBe('fulfilled');
  if(results[1].status==='fulfilled')expect(results[1].value.status).toBe(503);
  const saved=await host.store.listExperiments();expect(saved).toHaveLength(1);expect(saved[0]!.name).toBe('Delivery experiment');
});
