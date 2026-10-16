import {compileDreamWorld,formatDream} from '../scene/dream';
import {createEpisode,stepEpisode,type Episode,type Transition} from '../sim/episode';
import {z} from 'zod';

export const EPISODE_VERSION='dream-episode-1';
export async function sourceHash(source:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export interface Manifest {kind:'manifest';version:typeof EPISODE_VERSION;source:string;sourceHash:string;scenario:string;policy:string;seed:number}
const manifestSchema=z.object({kind:z.literal('manifest'),version:z.literal(EPISODE_VERSION),source:z.string().max(65536),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),scenario:z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),policy:z.string().min(1).max(128),seed:z.number().int().min(0).max(2147483647)}).strict();
export async function recordingManifest(source:string,policy='mock-greedy-1'):Promise<Manifest>{
  const canonical=formatDream(source),world=compileDreamWorld(canonical);
  if(world.layout||world.scenarios.length!==1||world.assemblies.length)throw new Error('Episode recordings currently require a standalone scenario without world/asset modules.');
  return manifestSchema.parse({kind:'manifest',version:EPISODE_VERSION,source:canonical,sourceHash:await sourceHash(canonical),scenario:world.scenarios[0]!.id,policy,seed:world.scenarios[0]!.seed});
}
export function exportEpisode(manifest:Manifest,episode:Episode){const text=[manifest,...episode.records].map(row=>JSON.stringify(row)).join('\n')+'\n';if(text.length>64*1024*1024)throw new Error('Recording exceeds 64 MiB');return text;}
/** Replay recompiles the pinned source and compares every transition, rather than trusting claimed scores. */
export async function replayEpisode(text:string){
  if(text.length>64*1024*1024)throw new Error('Recording exceeds 64 MiB');
  const lines=text.trim().split('\n');if(lines.length<1||lines.length>1001)throw new Error('Recording exceeds episode step budget');
  const parsed=manifestSchema.safeParse(JSON.parse(lines[0]!));
  if(!parsed.success)throw new Error('Invalid recording manifest, version or source fingerprint');
  const manifest=parsed.data;
  if(manifest.sourceHash!==await sourceHash(manifest.source))throw new Error('Recording version or source fingerprint mismatch');
  const expected=await recordingManifest(manifest.source,manifest.policy);
  if(manifest.source!==expected.source||manifest.seed!==expected.seed||manifest.scenario!==expected.scenario)throw new Error('Manifest does not match compiled source');
  let episode=createEpisode(compileDreamWorld(manifest.source).scenarios[0]);
  for(const line of lines.slice(1)){
    const recorded=JSON.parse(line) as Transition;
    episode=stepEpisode(episode,recorded.actions);
    if(JSON.stringify(episode.records.at(-1))!==JSON.stringify(recorded))throw new Error(`Replay divergence at step ${episode.state.step}`);
  }
  return {manifest,episode};
}
