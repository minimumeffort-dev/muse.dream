import {afterEach,it,expect} from 'vitest';
import {mkdtemp,rm,readFile,writeFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ExperimentStore,type ExperimentConfig} from '../server/experiments';
import {ExperimentRun} from '../src/runner';
import {BRIEF_BUILDER,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,SCENARIO_BRIEFS,buildFromBrief,replayEpisode} from '../src/framework';
import {SAMPLE_PROMPTS} from '../src/experiment-brief';
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
it('preserves each original prompt and its source pin across revisions, runs and recovery',async()=>{
  const {directory,store}=await fresh(),original='  Deliver breakfast.\nKeep the clinic open.  ',revised='Deliver breakfast.\nTry a different budget.';
  const source=(budget:number)=>buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,{...DEFAULT_PARAMETERS,budget},'delivery-1').source;
  const first=await store.save({...config(),prompt:original,input:{mode:'source',source:source(16)}}),firstRun=await store.createRun(first.id,1,'prompt-first');
  const second=await store.save({...config(4),prompt:revised,input:{mode:'source',source:source(4)}},{id:first.id,expectedRevision:1}),secondRun=await store.createRun(second.id,2,'prompt-second');
  expect(first.config.prompt).toBe(original);expect(firstRun.config.prompt).toBe(original);
  expect(second.config.prompt).toBe(revised);expect(secondRun.config.prompt).toBe(revised);
  expect(first.sourceHash).toBe(firstRun.sourceHash);expect(second.sourceHash).toBe(secondRun.sourceHash);
  const reopened=await ExperimentStore.open(directory);
  expect((await reopened.getExperiment(first.id,1)).config.prompt).toBe(original);
  expect((await reopened.getRun(firstRun.id)).config.prompt).toBe(original);
  expect((await reopened.getRun(secondRun.id)).config.prompt).toBe(revised);
  expect((await reopened.listRuns()).find(run=>run.id===firstRun.id)?.config.prompt).toBe(original);
  expect((await replayEpisode((await reopened.getRun(firstRun.id)).recording)).manifest.sourceHash).toBe(first.sourceHash);
});
it('keeps legacy prompts absent and supports exact prompt metadata on manually authored source',async()=>{
  const {directory,store}=await fresh(),legacy=await store.save(config()),legacyRun=await store.createRun(legacy.id,1,'legacy-no-prompt');
  const prompt='  Explore the manually authored scenario.\n';
  const authored=await store.save({...config(),prompt,input:{mode:'source',source:legacy.source}}),authoredRun=await store.createRun(authored.id,1,'source-prompt');
  expect(authored.sourceHash).toBe(legacy.sourceHash);
  await expect(store.save({...config(),prompt:'x'.repeat(8001)})).rejects.toMatchObject({code:'INVALID_CONFIG'});
  await expect(store.save({...config(),prompt:123})).rejects.toMatchObject({code:'INVALID_CONFIG'});
  await expect(store.save({...config(),prompt:' \n\t '})).rejects.toMatchObject({code:'INVALID_CONFIG'});
  await expect(store.save({...config(),prompt:' ',input:{mode:'source',source:legacy.source}})).rejects.toMatchObject({code:'INVALID_CONFIG'});
  const reopened=await ExperimentStore.open(directory);
  expect((await reopened.getExperiment(legacy.id)).config).toEqual(config());
  expect((await reopened.getRun(legacyRun.id)).config.prompt).toBeUndefined();
  expect((await reopened.getRun(authoredRun.id)).config.prompt).toBe(prompt);
});
it('rejects changed prompt metadata in a stored run without altering it',async()=>{
  const {directory,store}=await fresh(),experiment=await store.save({...config(),prompt:SAMPLE_PROMPTS.delivery}),run=await store.createRun(experiment.id,1,'prompt-integrity');
  const file=join(directory,'runs',run.id+'.json'),record=JSON.parse(await readFile(file,'utf8'));record.config.prompt='Changed prompt';const altered=JSON.stringify(record);await writeFile(file,altered);
  await expect(ExperimentStore.open(directory)).rejects.toMatchObject({code:'STORE_CORRUPT'});expect(await readFile(file,'utf8')).toBe(altered);
});
it('only accepts each exact example prompt for its preset when saving, while allowing condition overrides',async()=>{
  const {store}=await fresh();
  for(const brief of SCENARIO_BRIEFS){
    const parameters={...DEFAULT_PARAMETERS,budget:4},scenario=buildFromBrief(brief.world,brief.task,parameters).scenario;
    const input:ExperimentConfig={name:brief.label,prompt:SAMPLE_PROMPTS[brief.id],input:{mode:'brief',world:brief.world,task:brief.task,parameters,builder:BRIEF_BUILDER},controllers:scenario.agents.map(agent=>({actor:agent.id,kind:'baseline'}))};
    const saved=await store.save(input);expect(saved.config.prompt).toBe(SAMPLE_PROMPTS[brief.id]);expect((await store.createRun(saved.id,1,'sample-'+brief.id)).config).toEqual(input);
    await expect(store.save({...input,prompt:SAMPLE_PROMPTS[brief.id]+' '})).rejects.toMatchObject({code:'INVALID_CONFIG'});
    await expect(store.save({...input,prompt:SAMPLE_PROMPTS[brief.id==='delivery'?'warehouse':'delivery']})).rejects.toMatchObject({code:'INVALID_CONFIG'});
  }
  await expect(store.save({...config(),prompt:'An unrelated request'})).rejects.toMatchObject({code:'INVALID_CONFIG'});
});
it('continues to reopen and run a pinned historical brief if the example prompt has changed',async()=>{
  const {directory,store}=await fresh(),experiment=await store.save({...config(),prompt:SAMPLE_PROMPTS.delivery}),run=await store.createRun(experiment.id,1,'old-prompt');
  // Simulate a valid older saved example whose prompt is no longer the current example.
  const oldPrompt='Historical example prompt',indexFile=join(directory,'index.json'),runFile=join(directory,'runs',run.id+'.json');
  const index=JSON.parse(await readFile(indexFile,'utf8')),record=JSON.parse(await readFile(runFile,'utf8'));
  index.experiments[0].config.prompt=oldPrompt;record.config.prompt=oldPrompt;
  await writeFile(indexFile,JSON.stringify(index));await writeFile(runFile,JSON.stringify(record));
  const reopened=await ExperimentStore.open(directory),old=await reopened.getExperiment(experiment.id);
  expect(old.config.prompt).toBe(oldPrompt);expect((await reopened.getRun(run.id)).config.prompt).toBe(oldPrompt);
  expect((await reopened.createRun(experiment.id,1,'old-prompt-again')).config.prompt).toBe(oldPrompt);
  await expect(reopened.save(old.config,{id:experiment.id,expectedRevision:1})).rejects.toMatchObject({code:'INVALID_CONFIG'});
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
