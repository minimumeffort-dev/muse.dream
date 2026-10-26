import {describe,it,expect} from 'vitest';
import {AgentRuntime,AgentRuntimeError,type AgentDecision} from '../src/agent-runtime';
import {ExperimentRun} from '../src/runner';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,mockAction,replayEpisode,type Parameters} from '../src/framework';
import type {AgentAction} from '../src/engine/sim/episode';

const source=(changes:Partial<Parameters>={})=>buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,{...DEFAULT_PARAMETERS,...changes}).source;
const submission=(decision:AgentDecision,action:AgentAction={agent:decision.actorId,kind:'wait'})=>({...decision,observation:undefined,action});
function request(decision:AgentDecision,action:AgentAction={agent:decision.actorId,kind:'wait'}){
  const {observation,...identity}=decision;return {...identity,action};
}
function rejects(code:string,callback:()=>unknown){
  try{callback();throw new Error('Expected protocol rejection');}catch(error){expect(error).toBeInstanceOf(AgentRuntimeError);expect((error as AgentRuntimeError).code).toBe(code);}
}
async function finish(runtime:AgentRuntime,reverse=false){
  while(runtime.status==='waiting'){
    const decisions=runtime.actors.map(actor=>runtime.decision(actor,runtime.owner(actor)));
    for(const decision of reverse?decisions.reverse():decisions)runtime.submit(runtime.owner(decision.actorId),request(decision,mockAction(decision.observation)));
  }
  return runtime;
}

describe('Agent runtime protocol boundary',()=>{
  it('waits for the full barrier and commits a single joint step',async()=>{
    const runtime=await AgentRuntime.create(source(),{externalActor:'courier_b',id:()=> 'run_barrier'});
    expect(runtime.actors).toEqual(['courier_a','courier_b']);expect(runtime.owner('courier_a')).toBe('baseline');expect(runtime.owner('courier_b')).toBe('external');
    const a=runtime.decision('courier_a','baseline'),b=runtime.decision('courier_b','external');
    expect(runtime.decision('courier_a','baseline')).toEqual(a);
    const queued=runtime.submit('baseline',request(a));expect(queued).toEqual({requestId:a.requestId,step:0,committedStep:null});expect(runtime.run.length).toBe(0);
    expect(runtime.submit('baseline',request(a))).toEqual(queued);expect(runtime.run.length).toBe(0);
    expect(runtime.submit('external',request(b))).toEqual({requestId:b.requestId,step:0,committedStep:1});expect(runtime.run.length).toBe(1);
    expect(runtime.submit('baseline',request(a))).toEqual(queued);expect(runtime.run.length).toBe(1);
    expect(runtime.decision('courier_a','baseline').step).toBe(1);
  });
  it('enforces strict envelopes, actor ownership and immutable retries',async()=>{
    const runtime=await AgentRuntime.create(source(),{externalActor:'courier_b'}),a=runtime.decision('courier_a','baseline');
    rejects('NOT_OWNER',()=>runtime.decision('courier_b','baseline'));
    rejects('UNKNOWN_ACTOR',()=>runtime.owner('stranger'));
    rejects('INVALID_REQUEST',()=>runtime.submit('baseline',submission(a)));
    rejects('INVALID_REQUEST',()=>runtime.submit('baseline',{...request(a),action:{agent:'courier_a',kind:'wait',extra:true}}));
    rejects('CONFLICT',()=>runtime.submit('baseline',{...request(a),action:{agent:'courier_b',kind:'wait'}}));
    rejects('CONFLICT',()=>runtime.submit('baseline',{...request(a),runId:'other_run'}));
    rejects('CONFLICT',()=>runtime.submit('baseline',{...request(a),step:1}));
    runtime.submit('baseline',request(a));
    rejects('CONFLICT',()=>runtime.submit('baseline',request(a,{agent:'courier_a',kind:'move',to:'school'})));
    rejects('NOT_OWNER',()=>runtime.submit('external',request(a)));expect(runtime.run.length).toBe(0);
  });
  it('does not expose private agent data or mutable engine references',async()=>{
    const runtime=await AgentRuntime.create(source()),decision=runtime.decision('courier_a','baseline');
    expect(Object.keys(decision).sort()).toEqual(['version','runId','actorId','step','requestId','epoch','observation'].sort());
    expect(decision.observation.objectives.every(goal=>goal.agent==='courier_a')).toBe(true);
    expect(JSON.stringify(decision)).not.toContain('courier_b');
    decision.observation.self.credits=99999;decision.observation.objectives[0]!.progress=999;
    runtime.actors.pop();
    const fresh=runtime.decision('courier_a','baseline');
    expect(fresh.observation.self.credits).toBe(DEFAULT_PARAMETERS.budget);expect(fresh.observation.objectives[0]!.progress).toBe(0);expect(runtime.actors).toHaveLength(2);
    expect(runtime.run.at(0).agents[0]!.credits).toBe(DEFAULT_PARAMETERS.budget);
  });
  it('lets schema-valid illegal gameplay actions reach engine evaluation',async()=>{
    const runtime=await AgentRuntime.create(source());
    for(const actor of runtime.actors){const decision=runtime.decision(actor,'baseline');runtime.submit('baseline',request(decision,actor==='courier_a'?{agent:actor,kind:'move',to:'missing'}:{agent:actor,kind:'wait'}));}
    expect(runtime.run.length).toBe(1);expect(runtime.run.metrics().violations).toBe(1);
    expect(runtime.run.records[0]!.outcomes).toContainEqual({agent:'courier_a',kind:'move',ok:false,reason:'no_link',status:'rejected'});
  });
  it('pauses on controller timeout without advancing and resumes with fresh requests',async()=>{
    let now=100;
    const runtime=await AgentRuntime.create(source(),{timeoutMs:50,now:()=>now}),a=runtime.decision('courier_a','baseline'),b=runtime.decision('courier_b','baseline');
    runtime.submit('baseline',request(a));now=150;
    expect(runtime.status).toBe('paused');expect(runtime.run.length).toBe(0);expect(runtime.run.metrics().violations).toBe(0);
    rejects('CONFLICT',()=>runtime.submit('baseline',request(b)));
    rejects('PAUSED',()=>runtime.decision('courier_a','baseline'));
    runtime.resume();expect(runtime.status).toBe('waiting');
    const replacement=runtime.decision('courier_a','baseline');expect(replacement.step).toBe(0);expect(replacement.epoch).toBe(a.epoch+1);expect(replacement.requestId).not.toBe(a.requestId);
    rejects('CONFLICT',()=>runtime.submit('baseline',request(a)));
    runtime.submit('baseline',request(replacement));expect(runtime.run.length).toBe(0);
    runtime.submit('baseline',request(runtime.decision('courier_b','baseline')));expect(runtime.run.length).toBe(1);
  });
  it('checks a deadline during submit, without relying on status polling',async()=>{
    let now=0;const runtime=await AgentRuntime.create(source(),{timeoutMs:10,now:()=>now});
    const requests=runtime.actors.map(actor=>runtime.decision(actor,'baseline'));runtime.submit('baseline',request(requests[0]!));now=11;
    rejects('CONFLICT',()=>runtime.submit('baseline',request(requests[1]!)));expect(runtime.status).toBe('paused');expect(runtime.run.length).toBe(0);
  });
  it('handoff invalidates only that actor and preserves other queued actions',async()=>{
    const runtime=await AgentRuntime.create(source()),a=runtime.decision('courier_a','baseline'),b=runtime.decision('courier_b','baseline');
    runtime.submit('baseline',request(a));runtime.handoff('courier_b','external');
    rejects('NOT_OWNER',()=>runtime.submit('baseline',request(b)));
    rejects('CONFLICT',()=>runtime.submit('external',request(b)));
    const next=runtime.decision('courier_b','external');expect(next.epoch).toBe(b.epoch+1);expect(next.observation).toEqual(b.observation);
    runtime.submit('external',request(next));expect(runtime.run.length).toBe(1);
    expect(runtime.submit('baseline',request(a)).committedStep).toBeNull();
    const current=runtime.decision('courier_a','baseline');
    rejects('CONFLICT',()=>runtime.submit('baseline',{...request(current),requestId:b.requestId}));expect(runtime.run.length).toBe(1);
  });
  it('clears a queued action when its actor changes owner',async()=>{
    const runtime=await AgentRuntime.create(source()),a=runtime.decision('courier_a','baseline');
    runtime.submit('baseline',request(a));runtime.handoff('courier_a','external');
    runtime.submit('baseline',request(runtime.decision('courier_b','baseline')));expect(runtime.run.length).toBe(0);
    rejects('NOT_OWNER',()=>runtime.submit('baseline',request(a)));
    runtime.submit('external',request(runtime.decision('courier_a','external')));expect(runtime.run.length).toBe(1);
  });
  it('replays the same baseline and resolves contention independently of arrival order',async()=>{
    const a=await finish(await AgentRuntime.create(source(),{id:()=> 'forward'})),b=await finish(await AgentRuntime.create(source(),{id:()=> 'reverse'}),true);
    const direct=await ExperimentRun.create(source());while(direct.advance()){}
    expect(a.status).toBe('completed');expect(a.run.metrics()).toEqual(direct.metrics());expect(a.run.records).toEqual(direct.records);expect(a.run.export()).toBe(b.run.export());
    const replay=await replayEpisode(a.run.export());expect(replay.episode.state).toEqual(direct.at(direct.length));
    rejects('RUN_ENDED',()=>a.decision('courier_a','baseline'));
  });
  it('distinguishes engine deadline from transport timeout and permits final retries',async()=>{
    const runtime=await AgentRuntime.create(source({deadline:1})),requests=runtime.actors.map(actor=>runtime.decision(actor,'baseline'));
    for(const decision of requests)runtime.submit('baseline',request(decision));
    expect(runtime.status).toBe('deadline');expect(runtime.run.length).toBe(1);
    expect(runtime.submit('baseline',request(requests[1]!)).committedStep).toBe(1);
    rejects('RUN_ENDED',()=>runtime.decision('courier_a','baseline'));
  });
  it('validates runtime options before exposing a run',async()=>{
    for(const timeoutMs of [0,-1,Infinity,NaN])await expect(AgentRuntime.create(source(),{timeoutMs})).rejects.toMatchObject({code:'INVALID_REQUEST'});
    await expect(AgentRuntime.create(source(),{externalActor:'stranger'})).rejects.toMatchObject({code:'UNKNOWN_ACTOR'});
  });
  it('revokes uncommitted decisions when the host pauses a restored run',async()=>{
    const runtime=await AgentRuntime.create(source()),a=runtime.decision('courier_a','baseline');
    runtime.submit('baseline',request(a));runtime.pause();
    expect(runtime.status).toBe('paused');expect(runtime.run.length).toBe(0);
    rejects('CONFLICT',()=>runtime.submit('baseline',request(a)));
    runtime.resume();const fresh=runtime.decision('courier_a','baseline');
    expect(fresh.epoch).toBeGreaterThan(a.epoch);expect(fresh.requestId).not.toBe(a.requestId);
    runtime.submit('baseline',request(fresh));runtime.submit('baseline',request(runtime.decision('courier_b','baseline')));
    expect(runtime.run.length).toBe(1);
  });
  it('does not reuse request identities when a persistent run ID is restored',async()=>{
    const first=await AgentRuntime.create(source(),{id:()=> 'saved-run'}),restored=await AgentRuntime.create(source(),{id:()=> 'saved-run'});
    const old=first.decision('courier_a','baseline'),fresh=restored.decision('courier_a','baseline');
    expect(fresh.runId).toBe(old.runId);expect(fresh.requestId).not.toBe(old.requestId);
    rejects('CONFLICT',()=>restored.submit('baseline',request(old)));
  });
});
