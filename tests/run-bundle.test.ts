import {afterEach,it,expect} from 'vitest';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createRunBundle,replayRunFile} from '../src/run-bundle';
import {ExperimentRun} from '../src/runner';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS} from '../src/framework';

const directories:string[]=[];
afterEach(async()=>{await Promise.all(directories.splice(0).map(directory=>rm(directory,{recursive:true,force:true})));});
async function run(steps=1000){
  const source=buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS).source,result=await ExperimentRun.create(source);
  while(result.length<steps&&result.advance()){}return result;
}

it('round-trips the exact prompt and replayable run without modifying the recording',async()=>{
  const original=await run(),prompt='  Two couriers.\nBread costs 2 coins.\n\n';
  const text=createRunBundle(original,prompt),bundle=JSON.parse(text),replayed=await replayRunFile(text);
  expect(bundle).toEqual({version:'dream-run-bundle-1',prompt,sourceHash:original.manifest.sourceHash,seed:original.manifest.seed,recording:original.export()});
  expect(replayed.prompt).toBe(prompt);expect(replayed.manifest).toEqual(original.manifest);expect(replayed.episode.state).toEqual(original.at(original.length));
  expect(replayed.episode.records).toEqual(original.records);
});

it('retains absent prompts and replays both existing JSONL recordings and zero-step manifests',async()=>{
  const finished=await run(),initial=await run(0),bundle=JSON.parse(createRunBundle(initial));
  expect(bundle).not.toHaveProperty('prompt');expect((await replayRunFile(JSON.stringify(bundle))).prompt).toBeUndefined();
  expect((await replayRunFile(finished.export())).episode.state).toEqual(finished.at(finished.length));
  const starting=await replayRunFile(initial.export());expect(starting.episode.state).toEqual(initial.at(0));expect(starting.prompt).toBeUndefined();
});

it('rejects unsupported versions, invalid metadata and extra fields',async()=>{
  const current=await run(1),bundle=JSON.parse(createRunBundle(current,'hello'));
  for(const bad of [{...bundle,version:'dream-run-bundle-2'},{...bundle,prompt:3},{...bundle,prompt:'x'.repeat(8001)},{...bundle,seed:-1},{...bundle,token:'private'}])
    await expect(replayRunFile(JSON.stringify(bad))).rejects.toThrow('Invalid run bundle');
  expect(()=>createRunBundle(current,'x'.repeat(8001))).toThrow();
  await expect(replayRunFile('null')).rejects.toThrow('Invalid run bundle');
});

it('rejects changed pins and tampered transitions rather than trusting claimed results',async()=>{
  const current=await run(2),bundle=JSON.parse(createRunBundle(current,'prompt'));
  await expect(replayRunFile(JSON.stringify({...bundle,sourceHash:'0'.repeat(64)}))).rejects.toThrow('source or seed');
  await expect(replayRunFile(JSON.stringify({...bundle,seed:bundle.seed+1}))).rejects.toThrow('source or seed');
  const lines=bundle.recording.trim().split('\n'),step=JSON.parse(lines[1]);step.rewards.courier_a=999;lines[1]=JSON.stringify(step);
  await expect(replayRunFile(JSON.stringify({...bundle,recording:lines.join('\n')+'\n'}))).rejects.toThrow(/divergence/i);
});

it('replays a bundle and an existing JSONL using the public CLI',async()=>{
  const current=await run(),directory=await mkdtemp(join(tmpdir(),'dream-bundle-test-'));directories.push(directory);
  const bundleFile=join(directory,'bundle.json'),jsonlFile=join(directory,'recording.jsonl');
  await Promise.all([writeFile(bundleFile,createRunBundle(current,'Researcher brief')),writeFile(jsonlFile,current.export())]);
  const exec=promisify(execFile),cwd=fileURLToPath(new URL('../',import.meta.url));
  for(const file of [bundleFile,jsonlFile]){
    const {stdout}=await exec(process.execPath,['scripts/experiment.mjs','replay',file],{cwd});
    expect(JSON.parse(stdout)).toMatchObject({ok:true,command:'replay',metrics:current.metrics()});
  }
});
