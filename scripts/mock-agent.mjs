import {createServer} from 'vite';
const {DREAM_AGENT_URL:url,DREAM_AGENT_ID:actor,DREAM_AGENT_TOKEN:token}=process.env;
const delay=Number(process.env.DREAM_AGENT_DELAY_MS??1000);
let loader;
try{
  if(!url||!actor||!token||!Number.isFinite(delay)||delay<0||delay>30000)throw Error('Set DREAM_AGENT_URL, DREAM_AGENT_ID and DREAM_AGENT_TOKEN; delay must be 0..30000 ms.');
  const endpoint=new URL(url);if(endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1')throw Error('This mock client connects only to a loopback HTTP host.');
  loader=await createServer({root:new URL('../',import.meta.url).pathname,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
  const {mockAction}=await loader.ssrLoadModule('/src/engine/sim/episode.ts');
  let previous='';
  while(true){
    const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
    const response=await fetch(new URL(`/api/actors/${actor}/decision`,endpoint),{headers,signal:AbortSignal.timeout(10000)});
    const decision=await response.json();
    if(!response.ok){if(decision.code==='RUN_ENDED')break;throw Error(decision.error??'Decision request failed');}
    if(decision.requestId===previous){await new Promise(ok=>setTimeout(ok,50));continue;}
    const {observation,...identity}=decision;
    await new Promise(ok=>setTimeout(ok,delay));
    const submitted=await fetch(new URL(`/api/actors/${actor}/action`,endpoint),{method:'POST',headers,body:JSON.stringify({...identity,action:mockAction(observation)}),signal:AbortSignal.timeout(10000)});
    if(!submitted.ok)throw Error((await submitted.json()).error??'Action request failed');
    previous=decision.requestId;
  }
  console.log('External mock completed its run.');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{await loader?.close();}
