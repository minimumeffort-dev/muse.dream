import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const [command,file,...options]=process.argv.slice(2);
let server;
try{
  if(!['run','replay'].includes(command)||!file||(command==='run'?options.length!==2||options[0]!=='--output':options.length))throw Error('Usage: node scripts/experiment.mjs run scenario.dream --output episode.jsonl; or replay episode.jsonl');
  server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
  const engine=await server.ssrLoadModule('/src/sim/episode.ts'),recording=await server.ssrLoadModule('/src/experiment/recording.ts');
  let episode;
  if(command==='replay')episode=(await recording.replayEpisode(await readFile(file,'utf8'))).episode;
  else{
    const source=await readFile(file,'utf8'),manifest=await recording.recordingManifest(source),compiler=await server.ssrLoadModule('/src/scene/dream.ts');
    episode=engine.createEpisode(compiler.compileDreamWorld(source).scenarios[0]);
    while(!episode.state.terminated&&!episode.state.truncated)episode=engine.stepEpisode(episode,episode.state.agents.map(a=>engine.mockAction(engine.observeAgent(episode,a.id))));
    // Never replace a prior dataset accidentally; choose a fresh path for each run.
    await writeFile(options[1],recording.exportEpisode(manifest,episode),{flag:'wx'});
  }
  process.stdout.write(JSON.stringify({ok:true,command,metrics:engine.episodeMetrics(episode)})+'\n');
}catch(error){process.stdout.write(JSON.stringify({ok:false,message:error.message})+'\n');process.exitCode=1;}
finally{await server?.close();}
