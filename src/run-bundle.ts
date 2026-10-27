import {z} from 'zod';
import {replayEpisode} from './framework';
import type {ExperimentRun} from './runner';

const MAX_RECORDING=64*1024*1024;
const bundleSchema=z.object({
  version:z.literal('dream-run-bundle-1'),
  prompt:z.string().max(8000).optional(),
  sourceHash:z.string().regex(/^[a-f0-9]{64}$/),
  seed:z.number().int().min(0).max(2147483647),
  recording:z.string().max(MAX_RECORDING),
}).strict();

/** Package the original prompt as unsigned metadata alongside the exact replayable trace. */
export function createRunBundle(run:Pick<ExperimentRun,'manifest'|'export'>,prompt?:string){
  const bundle=bundleSchema.parse({version:'dream-run-bundle-1',...(prompt===undefined?{}:{prompt}),sourceHash:run.manifest.sourceHash,seed:run.manifest.seed,recording:run.export()});
  return JSON.stringify(bundle)+'\n';
}

/** Accept bundles and existing JSONL recordings; neither can set simulated outcomes. */
export async function replayRunFile(text:string){
  if(text.length>MAX_RECORDING*2+65536)throw Error('Run bundle exceeds its size limit.');
  let value:unknown;
  try{value=JSON.parse(text);}catch{return replayEpisode(text);}
  if(value&&typeof value==='object'&&'kind' in value&&value.kind==='manifest')return replayEpisode(text);
  const parsed=bundleSchema.safeParse(value);if(!parsed.success)throw Error('Invalid run bundle or unsupported version.');
  const replay=await replayEpisode(parsed.data.recording);
  if(parsed.data.sourceHash!==replay.manifest.sourceHash||parsed.data.seed!==replay.manifest.seed)throw Error('Run bundle source or seed does not match its recording.');
  return {...replay,...(parsed.data.prompt===undefined?{}:{prompt:parsed.data.prompt})};
}
