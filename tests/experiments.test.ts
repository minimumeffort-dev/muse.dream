import {afterEach,it,expect} from 'vitest';
import {mkdtemp,rm,readFile,writeFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ExperimentStore,type ExperimentConfig} from '../server/experiments';
import {ExperimentRun} from '../src/runner';
import {BRIEF_BUILDER,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,replayEpisode} from '../src/framework';
const directories:string[]=[];
const config=(budget=16):ExperimentConfig=>({name:'Delivery',input:{mode:'brief',world:DEFAULT_WORLD,task:DEFAULT_TASK,parameters:{...DEFAULT_PARAMETERS,budget}},controllers:[{actor:'courier_a',kind:'external-mock'},{actor:'courier_b',kind:'baseline'}]});
const fresh=async()=>{const directory=await mkdtemp(join(tmpdir(),'dream-store-'));directories.push(directory);return {directory,store:await ExperimentStore.open(directory)};};
afterEach(async()=>{await Promise.all(directories.splice(0).map(directory=>rm(directory,{recursive:true,force:true})));});
const complete=async(store:ExperimentStore,id:string)=>{
  const saved=await store.getRun(id),run=await ExperimentRun.create(saved.source,'mock-agent-protocol-1');
  while(run.advance())await store.updateRun(id,{recording:run.export(),status:run.ended?(run.at(run.length).terminated?'completed':'deadline'):'waiting'});
  return run;
};
it('pins both budget revisions and their outcomes across host restart',async()=>{
  const {directory,store}=await fresh(),first=await store.save(config());
  const runA=await store.createRun(first.id,first.revision,'first');await complete(store,runA.id);
  const revised=await store.save(config(4),{id:first.id,expectedRevision:first.revision});
  const runB=await store.createRun(revised.id,revised.revision,'second');await complete(store,runB.id);
  const reopened=await ExperimentStore.open(directory),history=await reopened.listRuns();
  expect(history).toHaveLength(2);expect(history[0]).toMatchObject({revision:2,seed:7,parameters:{budget:4},metrics:{completed:2,total:4,steps:80,truncated:true}});
  expect(history[1]).toMatchObject({revision:1,seed:7,parameters:{budget:16},metrics:{completed:4,total:4,steps:27,success:true}});
  const old=await reopened.getRun(runA.id);expect(old.config.input).toMatchObject({mode:'brief',parameters:{budget:16}});
  expect((await replayEpisode(old.recording)).episode.state.terminated).toBe(true);
  expect((await reopened.getExperiment(first.id,1)).sourceHash).toBe(runA.sourceHash);
  expect((await stat(join(directory,'index.json'))).mode&0o777).toBe(0o600);expect((await stat(join(directory,'runs',runA.id+'.json'))).mode&0o777).toBe(0o600);
});
it('reopens old delivery pins and explicitly upgrades the builder in a new revision',async()=>{
  const {directory,store}=await fresh(),old=await store.save(config()),oldRun=await store.createRun(old.id,1,'legacy');await complete(store,oldRun.id);
  expect(old.source).not.toContain('look=');
  const nextConfig=config();if(nextConfig.input.mode!=='brief')throw Error('Expected brief');nextConfig.input.builder=BRIEF_BUILDER;
  const next=await store.save(nextConfig,{id:old.id,expectedRevision:1});expect(next.source).toContain('look=bakery');
  expect(next.sourceHash).not.toBe(old.sourceHash);
  const reopened=await ExperimentStore.open(directory);
  expect((await reopened.getExperiment(old.id,1)).sourceHash).toBe(old.sourceHash);
  expect((await reopened.getRun(oldRun.id)).recording).toBe((await store.getRun(oldRun.id)).recording);
  expect((await reopened.getExperiment(old.id)).config).toEqual(nextConfig);
});
it('serializes revision races and idempotent start retries without changing pins',async()=>{
  const {directory,store}=await fresh(),experiment=await store.save(config());
  const saved=await Promise.allSettled([store.save(config(4),{id:experiment.id,expectedRevision:1}),store.save(config(5),{id:experiment.id,expectedRevision:1})]);
  expect(saved.filter(result=>result.status==='fulfilled')).toHaveLength(1);expect(saved.find(result=>result.status==='rejected')).toMatchObject({reason:{code:'STALE_REVISION',status:409}});
  const latest=await store.getExperiment(experiment.id),[a,b]=await Promise.all([store.createRun(latest.id,latest.revision,'retry'),store.createRun(latest.id,latest.revision,'retry')]);
  expect(a.id).toBe(b.id);expect(await store.listRuns()).toHaveLength(1);
  await expect(store.createRun(latest.id,1,'retry')).rejects.toMatchObject({code:'REQUEST_CONFLICT'});
  const reopened=await ExperimentStore.open(directory);expect((await reopened.createRun(latest.id,latest.revision,'retry')).id).toBe(a.id);
});
it('recovers an unfinished committed trace paused and retains controller timings',async()=>{
  const {directory,store}=await fresh(),experiment=await store.save(config()),saved=await store.createRun(experiment.id,1,'unfinished'),run=await ExperimentRun.create(saved.source,'mock-agent-protocol-1');run.advance();
  const decisions=[{requestId:'decision',actor:'courier_a',step:0,started:Date.now(),latencyMs:5}];
  await store.updateRun(saved.id,{recording:run.export(),status:'waiting',decisions});
  const reopened=await ExperimentStore.open(directory),recovered=await reopened.getRun(saved.id);
  expect(recovered).toMatchObject({status:'paused',decisions,reason:'Host restarted. Resume this run to continue.'});
  expect((await replayEpisode(recovered.recording)).episode.state).toEqual(run.at(1));
});
it('preserves accepted records on disk failure and rejects changed trace prefixes',async()=>{
  const {directory,store}=await fresh(),experiment=await store.save(config()),saved=await store.createRun(experiment.id,1,'kept');
  let fail=false;const failing=await ExperimentStore.open(directory,{write:async(file,text)=>{if(fail)throw Error('Disk unavailable');await writeFile(file,text,{mode:0o600});}});
  const indexBefore=await readFile(join(directory,'index.json'),'utf8');fail=true;
  await expect(failing.save(config(4),{id:experiment.id,expectedRevision:1})).rejects.toThrow('Disk unavailable');
  expect(await readFile(join(directory,'index.json'),'utf8')).toBe(indexBefore);expect((await failing.getExperiment(experiment.id)).revision).toBe(1);
  const before=await failing.getRun(saved.id);await expect(failing.updateRun(saved.id,{recording:before.recording.replace('mock-agent-protocol-1','changed'),status:'paused'})).rejects.toMatchObject({code:'TRACE_CONFLICT'});
  const run=await ExperimentRun.create(saved.source,'mock-agent-protocol-1');run.advance();
  await expect(failing.updateRun(saved.id,{recording:run.export(),status:'waiting'})).rejects.toThrow('Disk unavailable');
  expect((await failing.getRun(saved.id)).recording).toBe(before.recording);
});
it('rejects corrupt saved records and malformed assignments without resetting them',async()=>{
  const {directory,store}=await fresh();
  await expect(store.save({...config(),input:{mode:'source',source:'dream 2; script attack();'}})).rejects.toMatchObject({code:'INVALID_CONFIG',status:400});
  await expect(store.save({...config(),controllers:[{actor:'courier_a',kind:'baseline'}]})).rejects.toMatchObject({code:'INVALID_CONFIG'});
  const experiment=await store.save(config()),saved=await store.createRun(experiment.id,1,'record'),file=join(directory,'runs',saved.id+'.json');
  const original=JSON.parse(await readFile(file,'utf8'));original.sourceHash='0'.repeat(64);const altered=JSON.stringify(original);await writeFile(file,altered);
  await expect(ExperimentStore.open(directory)).rejects.toMatchObject({code:'STORE_CORRUPT'});expect(await readFile(file,'utf8')).toBe(altered);
});
