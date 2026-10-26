import {readFile,mkdir,writeFile,chmod,open,unlink,access} from 'node:fs/promises';
import {unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {createServer} from 'vite';
import {spawn} from 'node:child_process';
const root=new URL('../',import.meta.url),port=Number(process.env.DREAM_HOST_PORT??5190);
const dataDirectory=resolve(process.env.DREAM_LAB_DATA_DIR??'.dreams-lab');
const connectionFile=port===5190?'.cache/agent-host.json':`.cache/agent-host-${port}.json`;
const lockFile=join(dataDirectory,'host.lock'),lockIdentity=JSON.stringify({pid:process.pid,nonce:randomUUID()});
let loader,host,locked=false,connectionWritten=false,stopping=false;
const clients=new Map();
async function acquireLock(){
  for(let attempt=0;attempt<2;attempt++){
    try{const file=await open(lockFile,'wx',0o600);await file.writeFile(lockIdentity);await file.close();locked=true;return;}
    catch(error){
      if(error.code!=='EEXIST')throw error;
      const recoveryFile=lockFile+'.recovery';let recovery;
      try{recovery=await open(recoveryFile,'wx',0o600);}catch(failure){if(failure.code==='EEXIST')throw Error('Host lock recovery is already in progress. Inspect the recovery lock if a startup was forcibly stopped.');throw failure;}
      try{
        const previous=await readFile(lockFile,'utf8').catch(failure=>{if(failure.code==='ENOENT')return undefined;throw failure;});
        if(previous!==undefined){const owner=JSON.parse(previous);
          if(!Number.isInteger(owner.pid)||owner.pid<1)throw Error('The host lock is invalid. Preserve and inspect it before continuing.');
          try{process.kill(owner.pid,0);throw Error('Another host owns this data directory. Stop it before starting another.');}catch(failure){if(failure.code!=='ESRCH')throw failure;}
          await unlink(lockFile);
        }
        const file=await open(lockFile,'wx',0o600);await file.writeFile(lockIdentity);await file.close();locked=true;return;
      }finally{await recovery.close();await unlink(recoveryFile);}
    }
  }
  throw Error('Could not acquire the local host lock.');
}
async function shutdown(){
  if(stopping)return;stopping=true;
  if(connectionWritten){try{unlinkSync(connectionFile);}catch(error){if(error.code!=='ENOENT')console.error('Remove the temporary host connection file manually.');}}
  for(const client of clients.values())client.kill();clients.clear();
  let failure;
  try{await host?.close();}catch(error){failure=error;}
  await loader?.close();
  if(locked&&await readFile(lockFile,'utf8').catch(()=>undefined)===lockIdentity)await unlink(lockFile);
  if(failure)throw failure;
}
process.once('SIGINT',()=>void shutdown().then(()=>process.exit(),error=>{console.error(error.message);process.exit(1);}));
process.once('SIGTERM',()=>void shutdown().then(()=>process.exit(),error=>{console.error(error.message);process.exit(1);}));
try{
  if(process.argv.length>2)throw Error('Create and run experiments in the Lab. Use DREAM_LAB_DATA_DIR to choose its local data directory.');
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('DREAM_HOST_PORT must be 1024..65535.');
  await access(resolve('dist/index.html'));
  await mkdir(dataDirectory,{recursive:true,mode:0o700});await chmod(dataDirectory,0o700);await acquireLock();
  const keyFile=join(dataDirectory,'admin.key');let adminToken=process.env.DREAM_HOST_ADMIN_TOKEN;
  if(!adminToken){
    try{adminToken=await readFile(keyFile,'utf8');}
    catch(error){if(error.code!=='ENOENT')throw error;adminToken=randomBytes(32).toString('hex');await writeFile(keyFile,adminToken,{flag:'wx',mode:0o600});}
    if(!/^[a-f0-9]{64}$/.test(adminToken))throw Error('The local admin key is invalid. Preserve it before recovery.');
    await chmod(keyFile,0o600);
  }
  loader=await createServer({root:root.pathname,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
  const {ExperimentStore}=await loader.ssrLoadModule('/server/experiments.ts');
  const {createLabHost}=await loader.ssrLoadModule('/server/lab-host.ts');
  const store=await ExperimentStore.open(dataDirectory);
  host=createLabHost(store,{directory:resolve('dist'),adminToken,mockStepMs:Number(process.env.DREAM_MOCK_STEP_MS??250),onExternalMock:async connection=>{
    if(stopping)throw Error('Host is stopping.');
    const key=connection.runId+':'+connection.actor;clients.get(key)?.kill();
    const {DREAM_HOST_ADMIN_TOKEN:ignored,...environment}=process.env;
    const client=spawn(process.execPath,['scripts/mock-agent.mjs'],{cwd:root,stdio:['ignore','inherit','inherit'],env:{...environment,DREAM_AGENT_DELAY_MS:process.env.DREAM_AGENT_DELAY_MS??'250',DREAM_AGENT_URL:`http://127.0.0.1:${port}`,DREAM_AGENT_RUN_ID:connection.runId,DREAM_AGENT_ID:connection.actor,DREAM_AGENT_TOKEN:connection.token}});
    clients.set(key,client);
    client.once('exit',code=>{if(clients.get(key)===client)clients.delete(key);if(code&&!stopping)console.error('A mock controller disconnected. Its run will pause at the decision timeout.');});
    await new Promise((ok,fail)=>{client.once('spawn',ok);client.once('error',fail);});
  }});
  await new Promise((ok,fail)=>{host.server.once('error',fail);host.server.listen(port,'127.0.0.1',ok);});
  await mkdir('.cache',{recursive:true});
  await writeFile(connectionFile,JSON.stringify({url:`http://127.0.0.1:${port}/?runtime#host-token=${host.adminToken}`,adminToken:host.adminToken}),{mode:0o600});connectionWritten=true;await chmod(connectionFile,0o600);
  console.log(`Dreams Lab: http://127.0.0.1:${port}/?runtime`);
  console.log(`Private connection: ${connectionFile}`);
  console.log(`Saved experiments: ${dataDirectory}. Create and run them in the Lab.`);
}catch(error){console.error(error.message);process.exitCode=1;try{await shutdown();}catch(failure){console.error(failure.message);}}
