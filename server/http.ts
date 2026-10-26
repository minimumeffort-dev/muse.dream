import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {AgentRuntime,AgentRuntimeError} from '../src/agent-runtime';
import {mockAction} from '../src/framework';
import {buildRunReport} from '../src/report';

export function createAgentHost(runtime:AgentRuntime,options:{directory:string;adminToken?:string;actorToken?:string}){
  const adminToken=options.adminToken??randomBytes(32).toString('hex');
  const external=runtime.actors.find(actor=>runtime.owner(actor)==='external')!;
  const tokens=new Map([[external,options.actorToken??randomBytes(32).toString('hex')]]);
  const timings=new Map<string,{actor:string;step:number;started:number;latencyMs?:number}>();
  const equal=(a:string,b:string)=>{const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);};
  const authorize=(req:IncomingMessage,token:string)=>{if(!equal(req.headers.authorization??'','Bearer '+token))throw Object.assign(Error('Unauthorized'),{status:401});};
  const json=(res:ServerResponse,status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  const body=async(req:IncomingMessage)=>{let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>4096)throw Object.assign(Error('Request exceeds 4 KiB'),{status:413});chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));};
  function baseline(){
    if(runtime.status!=='waiting')return;
    const step=runtime.run.length;
    // Start every decision against this committed state, including a disconnected controller.
    for(const actor of runtime.actors)runtime.decision(actor,runtime.owner(actor));
    for(const actor of runtime.actors){
      if(runtime.owner(actor)!=='baseline'||runtime.run.length!==step)continue;
      const decision=runtime.decision(actor,'baseline');
      const {observation,...identity}=decision;
      runtime.submit('baseline',{...identity,action:mockAction(observation)});
    }
  }
  const server=createServer(async(req,res)=>{
    try{
      // This is a loopback research host, not a public multi-tenant service.
      const address=server.address();const port=typeof address==='object'&&address?address.port:0;
      const origin=`http://127.0.0.1:${port}`;
      if(req.headers.host!==`127.0.0.1:${port}`||req.headers.origin&&req.headers.origin!==origin)throw Object.assign(Error('Use the loopback host address.'),{status:403});
      const url=new URL(req.url??'/',origin),method=req.method??'GET';
      if(url.pathname==='/api/view'&&method==='GET'){
        authorize(req,adminToken);
        const after=Number(url.searchParams.get('after')??'-1');
        if(!Number.isInteger(after)||after< -1||after>runtime.run.length)throw Object.assign(Error('Invalid recorded step'),{status:400});
        const completed=[...timings.values()].filter(t=>t.latencyMs!==undefined);
        json(res,200,{version:'dream-host-1',runId:runtime.id,status:runtime.status,manifest:runtime.run.manifest,from:after,
          records:runtime.run.records.slice(Math.max(0,after)),controllers:runtime.actors.map(actor=>({actor,owner:runtime.owner(actor)})),
          latency:{decisions:completed.length,totalMs:completed.reduce((sum,t)=>sum+t.latencyMs!,0),maxMs:Math.max(0,...completed.map(t=>t.latencyMs!))}});return;
      }
      if(url.pathname==='/api/report'&&method==='GET'){authorize(req,adminToken);json(res,200,{...buildRunReport(runtime.run.episodeSnapshot),decisions:[...timings].map(([requestId,timing])=>({requestId,...timing}))});return;}
      if(url.pathname==='/api/export'&&method==='GET'){authorize(req,adminToken);res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store'});res.end(runtime.run.export());return;}
      if(url.pathname==='/api/resume'&&method==='POST'){authorize(req,adminToken);runtime.resume();baseline();json(res,200,{status:runtime.status});return;}
      const match=url.pathname.match(/^\/api\/actors\/([a-z][a-z0-9_]{0,31})\/(decision|action|handoff)$/);
      if(match){
        const actor=match[1]!,operation=match[2]!;
        if(!runtime.actors.includes(actor))throw Object.assign(Error('Unknown actor'),{status:404});
        if(operation==='handoff'&&method==='POST'){
          authorize(req,adminToken);const input=await body(req);
          if(!input||Object.keys(input).length!==1||!['baseline','external'].includes(input.owner))throw Object.assign(Error('Owner must be baseline or external'),{status:400});
          runtime.handoff(actor,input.owner);const token=randomBytes(32).toString('hex');tokens.set(actor,token);baseline();
          json(res,200,{actor,owner:input.owner,...(input.owner==='external'?{token}:{})});return;
        }
        authorize(req,tokens.get(actor)??'');
        if(operation==='decision'&&method==='GET'){
          const decision=runtime.decision(actor,'external');
          if(!timings.has(decision.requestId))timings.set(decision.requestId,{actor,step:decision.step,started:performance.now()});
          if(timings.size>8000)timings.delete(timings.keys().next().value!);
          json(res,200,decision);return;
        }
        if(operation==='action'&&method==='POST'){
          const input=await body(req);if(input?.actorId!==actor)throw Object.assign(Error('Actor does not match credential'),{status:403});
          const receipt=runtime.submit('external',input),timing=timings.get(input.requestId);
          if(timing&&timing.latencyMs===undefined)timing.latencyMs=Math.max(0,performance.now()-timing.started);
          baseline();json(res,200,receipt);return;
        }
      }
      if(url.pathname.startsWith('/api/')){json(res,404,{error:'Unknown API operation'});return;}
      if(method!=='GET'&&method!=='HEAD')throw Object.assign(Error('Method not allowed'),{status:405});
      const path=resolve(options.directory,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if(!path.startsWith(resolve(options.directory)+sep))throw Object.assign(Error('Not found'),{status:404});
      if(!(await stat(path).catch(()=>undefined))?.isFile())throw Object.assign(Error('Not found'),{status:404});
      const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2'};
      res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(method==='HEAD'?undefined:await readFile(path));
    }catch(error){const failure=error as Error&{status?:number;code?:string};json(res,failure instanceof AgentRuntimeError?failure.status:failure.status??(failure instanceof SyntaxError?400:500),{error:failure.status||failure instanceof AgentRuntimeError?failure.message:'Request failed',code:failure.code});}
  });
  const pump=setInterval(()=>{try{baseline();}catch{/* A paused/ended run stays stopped until explicit recovery. */}},50);
  server.on('close',()=>clearInterval(pump));server.requestTimeout=10000;server.headersTimeout=10000;
  return {server,external,actorToken:tokens.get(external)!,adminToken};
}
