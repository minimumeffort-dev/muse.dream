import {checkDream,formatDream} from '../scene/dream';
import {DEFAULT_PROMPT,proposeDream} from '../authoring/prompt';
import {createEpisode,stepEpisode,mockAction,observeAgent,episodeMetrics,type Episode} from '../sim/episode';
import {recordingManifest,exportEpisode,type Manifest} from '../experiment/recording';
import type {Scenario} from '../scene/scenario';
import example from '../../docs/examples/town-scenario.dream?raw';
import ecology from '../../docs/examples/ecology-scenario.dream?raw';
import classroom from '../../docs/examples/classroom-scenario.dream?raw';

const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const prompt=get<HTMLTextAreaElement>('prompt'),source=get<HTMLTextAreaElement>('source'),status=get('proposal-status'),diagnostic=get('diagnostic');
const accept=get<HTMLButtonElement>('accept'),generate=get<HTMLButtonElement>('generate'),cancel=get<HTMLButtonElement>('cancel'),play=get<HTMLButtonElement>('play'),step=get<HTMLButtonElement>('step'),reset=get<HTMLButtonElement>('reset'),download=get<HTMLButtonElement>('export');
let candidate:Scenario|undefined,episode:Episode|undefined,manifest:Manifest|undefined,controller:AbortController|undefined,version=0,timer:ReturnType<typeof setInterval>|undefined;
let origin='checked example';
prompt.value=DEFAULT_PROMPT;source.value=formatDream(example);get<HTMLSelectElement>('example').value='town';
const text=(id:string,value:string)=>{get(id).textContent=value;};
function stop(){if(timer!==undefined)clearInterval(timer);timer=undefined;play.textContent='Run baseline';}
function invalidate(){controller?.abort();version++;candidate=undefined;accept.disabled=true;text('source-state','Unvalidated');}
function validate(){
  const result=checkDream(source.value);candidate=undefined;
  if(!result.ok){diagnostic.textContent=result.diagnostics.map(d=>`${d.code} ${d.line}:${d.column} · ${d.message}`).join('\n');diagnostic.dataset.error='true';}
  else if(result.world.layout||result.world.assemblies.length||result.world.scenarios.length!==1){diagnostic.textContent='This lab accepts one standalone scenario. Use the Dream CLI for object libraries and 3D worlds.';diagnostic.dataset.error='true';}
  else {candidate=result.world.scenarios[0];diagnostic.textContent='Valid Dream. Starting creates a new episode; the running episode keeps its accepted source until then.';diagnostic.dataset.error='false';text('source-state','Validated');}
  accept.disabled=!candidate;if(!episode)draw();return !!candidate;
}
get<HTMLFormElement>('prompt-form').onsubmit=async event=>{
  event.preventDefault();stop();invalidate();const current=version,request=new AbortController();controller=request;generate.disabled=true;cancel.hidden=false;status.textContent='Building a local mock proposal…';
  try{
    const proposal=await proposeDream({prompt:prompt.value,signal:request.signal});if(current!==version)return;
    source.value=proposal.source;origin='mock proposal';get<HTMLSelectElement>('example').value='';get('assumption-list').replaceChildren(...proposal.assumptions.map(a=>{const li=document.createElement('li');li.textContent=a;return li;}));
    status.textContent='Proposal ready. Review the Dream source, then start an episode.';validate();
  }catch(error){if(current===version)status.textContent=request.signal.aborted?'Proposal cancelled.':error instanceof Error?error.message:String(error);}
  finally{if(current===version){generate.disabled=false;cancel.hidden=true;}}
};
cancel.onclick=()=>{invalidate();generate.disabled=false;cancel.hidden=true;status.textContent='Proposal cancelled. Accepted episode preserved.';};
prompt.oninput=()=>{invalidate();generate.disabled=false;cancel.hidden=true;status.textContent='Brief changed. Generate a fresh proposal.';};
source.oninput=()=>{invalidate();origin='edited source';get<HTMLSelectElement>('example').value='';text('source-state','Edited');generate.disabled=false;cancel.hidden=true;};
get('validate').onclick=()=>{stop();validate();};
get<HTMLSelectElement>('example').onchange=event=>{stop();invalidate();origin='checked example';source.value=formatDream({town:example,ecology,classroom}[(event.target as HTMLSelectElement).value as 'town'|'ecology'|'classroom']);status.textContent='Checked example loaded. The brief does not change this authored source.';validate();};
accept.onclick=async()=>{
  stop();if(!validate())return;const current=version;accept.disabled=true;
  try{const nextManifest=await recordingManifest(source.value);if(current!==version)return;episode=createEpisode(candidate);manifest=nextManifest;status.textContent=`Accepted ${origin}. ${origin==='checked example'?'The brief does not change this authored source. ':''}Baseline policies use the observation/action API.`;draw();}
  catch(error){diagnostic.textContent=error instanceof Error?error.message:String(error);diagnostic.dataset.error='true';}
  finally{if(current===version)accept.disabled=!candidate;}
};
function tick(){if(!episode)return;episode=stepEpisode(episode,episode.state.agents.map(a=>mockAction(observeAgent(episode!,a.id))));if(episode.state.terminated||episode.state.truncated)stop();draw();}
play.onclick=()=>{if(timer!==undefined)stop();else {timer=setInterval(tick,350);play.textContent='Pause';}draw();};
step.onclick=()=>{stop();tick();};
reset.onclick=()=>{stop();if(episode)episode=createEpisode(episode.scenario);draw();};
download.onclick=()=>{
  if(!episode||!manifest)return;let data:string;try{data=exportEpisode(manifest,episode);}catch(error){status.textContent=error instanceof Error?error.message:String(error);return;}const blob=new Blob([data],{type:'application/x-ndjson'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`${manifest.scenario}-seed-${manifest.seed}.jsonl`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();draw();}});
function draw(){
  const s=episode?.scenario??candidate;if(!s)return;
  const state=episode?.state,ended=!!state&&(state.terminated||state.truncated);
  text('run-heading',s.id.replaceAll('_',' '));text('run-state',state?.terminated?'Completed':state?.truncated?'Deadline reached':state?timer!==undefined?'Running':'Paused':'Preview');
  text('step-count',state?`Step ${state.step} of ${s.maxSteps} · seed ${s.seed} · ${s.agents.length} ${s.agents.length===1?'agent':'agents'}`:'Preview · Start episode to accept this source and enable the baseline.');
  play.disabled=step.disabled=!state||ended;reset.disabled=download.disabled=!state;
  const metrics=episode?episodeMetrics(episode):undefined;
  get('metrics').replaceChildren(...[['Tasks',metrics?`${metrics.completed} / ${metrics.total}`:'—'],['Credits spent',metrics?String(metrics.creditsSpent):'—'],['Blocked requests',metrics?String(metrics.blocked):'—'],['Rule violations',metrics?String(metrics.violations):'—']].map(([label,value])=>{const cell=document.createElement('div');cell.className='metric';const name=document.createElement('span'),number=document.createElement('strong');name.textContent=label!;number.textContent=value!;cell.append(name,number);return cell;}));
  get('agents').replaceChildren(...s.agents.map(a=>{
    const agent=state?.agents.find(v=>v.id===a.id),goals=s.objectives.filter(g=>g.agent===a.id),row=document.createElement('tr');
    const activity=agent?.work?agent.work.kind==='move'?`→ ${agent.work.to} (${agent.work.remaining})`:`${agent.work.service} (${agent.work.remaining})`:agent?.at??a.at;
    const values=[a.id,activity,String(agent?.credits??a.budget),agent?Object.entries(agent.inventory).filter(([,q])=>q>0).map(([i,q])=>`${q} ${i}`).join(', ')||'—':'—',`${goals.filter(g=>state&&state.progress[g.id]!>=g.quantity).length} / ${goals.length}`];
    for(const value of values){const td=document.createElement('td');td.textContent=value;row.append(td);}return row;
  }));
  get('resources').replaceChildren(...s.stocks.map(stock=>{const li=document.createElement('li');li.textContent=`${stock.at} · ${stock.item}: ${state?.stocks[stock.id]??stock.quantity}${stock.mode==='source'?` · ${stock.price} credits each`:' delivered'}`;return li;}),...s.services.map(service=>{const li=document.createElement('li'),active=state?.agents.filter(a=>a.work?.kind==='service'&&a.work.service===service.id).length??0;li.textContent=`${service.id} · ${active}/${service.capacity} occupied · ${service.duration} steps · fee ${service.fee}`;return li;}));
  const recent=episode?.records.flatMap(r=>r.outcomes.filter(o=>o.kind!=='wait').map(o=>({step:r.step,...o}))).slice(-8).reverse()??[];
  get('events').replaceChildren(...recent.map(o=>{const li=document.createElement('li');li.dataset.status=o.status;li.textContent=`${o.step} · ${o.agent} · ${o.reason.replaceAll('_',' ')}`;return li;}));
  const svg=get<HTMLElement>('network');svg.replaceChildren();
  const xs=s.locations.map(l=>l.at[0]),ys=s.locations.map(l=>l.at[1]),xmin=Math.min(...xs),ymin=Math.min(...ys),dx=Math.max(1,Math.max(...xs)-xmin),dy=Math.max(1,Math.max(...ys)-ymin);
  const point=(id:string)=>{const at=s.locations.find(l=>l.id===id)!.at;return [110+(at[0]-xmin)/dx*680,80+(at[1]-ymin)/dy*220];};
  const shape=(kind:string,attrs:Record<string,string|number>,label?:string)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',kind);for(const [key,value] of Object.entries(attrs))e.setAttribute(key,String(value));if(label)e.textContent=label;svg.append(e);return e;};
  for(const link of s.links){const a=point(link.from),b=point(link.to);shape('line',{x1:a[0]!,y1:a[1]!,x2:b[0]!,y2:b[1]!,stroke:'#b7b7ad','stroke-width':12});shape('text',{x:(a[0]!+b[0]!)/2,y:(a[1]!+b[1]!)/2-12,'text-anchor':'middle'},`${link.steps} steps`);}
  for(const location of s.locations){const p=point(location.id);shape('rect',{x:p[0]!-72,y:p[1]!-27,width:144,height:54,fill:'#fafaf7',stroke:'#8f8f84'});shape('text',{x:p[0]!,y:p[1]!+4,'text-anchor':'middle'},location.label);}
  s.agents.forEach((a,index)=>{const agent=state?.agents.find(v=>v.id===a.id);let p=point(agent?.at??a.at);if(agent?.work?.kind==='move'){const end=point(agent.work.to),t=1-agent.work.remaining/agent.work.total;p=[p[0]!+(end[0]!-p[0]!)*t,p[1]!+(end[1]!-p[1]!)*t];}const offset=(index-(s.agents.length-1)/2)*23;shape('circle',{cx:p[0]!+offset,cy:p[1]!+41,r:8,fill:['#b95538','#3e6979','#795c94','#8b7224'][index%4]!,stroke:'#fafaf7','stroke-width':3});shape('text',{x:p[0]!+offset,y:p[1]!+62,'text-anchor':'middle',class:'agent-label'},a.id.replace('courier_',''));});
  if(manifest)text('recording',`${manifest.version} · source ${manifest.sourceHash.slice(0,12)} · ${episode?.records.length??0} recorded transitions · local only`);
}
validate();
