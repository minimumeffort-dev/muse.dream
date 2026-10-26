import {readFile,mkdir,writeFile,chmod} from 'node:fs/promises';
import {unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {spawn} from 'node:child_process';
const root=new URL('../',import.meta.url),port=Number(process.env.DREAM_HOST_PORT??5190);
let loader,host,client;
try{
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('DREAM_HOST_PORT must be 1024..65535.');
  loader=await createServer({root:root.pathname,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
  const {AgentRuntime}=await loader.ssrLoadModule('/src/agent-runtime.ts');
  const {createAgentHost}=await loader.ssrLoadModule('/server/http.ts');
  const source=await readFile(resolve(process.argv[2]??'examples/morning-delivery.dream'),'utf8');
  const runtime=await AgentRuntime.create(source,{externalActor:process.argv[3]});
  if(!process.argv[3])runtime.handoff(runtime.actors[0],'external');
  host=createAgentHost(runtime,{directory:resolve('dist'),adminToken:process.env.DREAM_HOST_ADMIN_TOKEN});
  await new Promise((ok,fail)=>{host.server.once('error',fail);host.server.listen(port,'127.0.0.1',ok);});
  await mkdir('.cache',{recursive:true});
  await writeFile('.cache/agent-host.json',JSON.stringify({url:`http://127.0.0.1:${port}/?runtime#host-token=${host.adminToken}`,adminToken:host.adminToken,actor:host.external,actorToken:host.actorToken}),{mode:0o600});
  await chmod('.cache/agent-host.json',0o600);
  console.log(`Agent host: http://127.0.0.1:${port}/?runtime`);
  console.log('Private viewer connection: .cache/agent-host.json (keep its credentials local).');
  console.log(`External mock: ${host.external}. The host continues when the viewer closes.`);
  const {DREAM_HOST_ADMIN_TOKEN:ignored,...clientEnvironment}=process.env;
  client=spawn(process.execPath,['scripts/mock-agent.mjs'],{cwd:root,stdio:['ignore','inherit','inherit'],env:{...clientEnvironment,DREAM_AGENT_URL:`http://127.0.0.1:${port}`,DREAM_AGENT_ID:host.external,DREAM_AGENT_TOKEN:host.actorToken}});
  client.once('exit',code=>{if(code)console.error('Mock controller disconnected. The run will pause at its decision timeout.');});
}catch(error){console.error(error.message);process.exitCode=1;client?.kill();host?.server.close();await loader?.close();}
async function stop(){
  // Remove the credential before the npm wrapper can end asynchronous shutdown.
  try{unlinkSync('.cache/agent-host.json');}catch(error){if(error.code!=='ENOENT')console.error('Remove .cache/agent-host.json manually.');}
  client?.kill();host?.server.close();await loader?.close();process.exit();
}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
