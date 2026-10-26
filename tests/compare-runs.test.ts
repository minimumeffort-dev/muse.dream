import {it,expect} from 'vitest';
import {compareRuns,type ComparableRun} from '../src/compare-runs';
import {buildRunReport} from '../src/report';
import {ExperimentRun} from '../src/runner';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,type Parameters} from '../src/framework';

async function run(id:string,changes:Partial<Parameters>={},finish=true):Promise<ComparableRun>{
  const parameters={...DEFAULT_PARAMETERS,...changes},accepted=buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,parameters);
  const episode=await ExperimentRun.create(accepted.source);if(finish)while(episode.advance()){}
  return {id,experimentId:'delivery',revision:id==='baseline'?1:2,name:'Delivery',sourceHash:episode.manifest.sourceHash,seed:parameters.seed,
    config:{input:{mode:'brief',world:DEFAULT_WORLD,task:DEFAULT_TASK,parameters},controllers:episode.scenario.agents.map(actor=>({actor:actor.id,kind:'baseline'}))},
    metrics:episode.metrics(),report:buildRunReport(episode.episodeSnapshot)};
}

it('compares the real budget 16 and budget 4 outcomes with the seed held fixed',async()=>{
  const baseline=await run('baseline'),candidate=await run('candidate',{budget:4}),before=structuredClone({baseline,candidate});
  const comparison=compareRuns(baseline,candidate),rows=Object.fromEntries(comparison.rows.map(row=>[row.key,row]));
  expect(comparison).toMatchObject({baselineId:'baseline',candidateId:'candidate',matchedSeed:true,sameSource:false,complete:true,outcomes:{baseline:'completed',candidate:'deadline'}});
  expect(comparison.changes).toEqual([{field:'input.parameters.budget',before:16,after:4}]);
  expect(rows.completed).toMatchObject({baseline:4,candidate:2,delta:-2});
  expect(rows.total).toMatchObject({baseline:4,candidate:4,delta:0});
  expect(rows.creditsSpent).toMatchObject({baseline:16,candidate:8,delta:-8});
  expect(rows.steps).toMatchObject({baseline:27,candidate:80,delta:53,unit:'steps'});
  expect(rows.travel).toMatchObject({baseline:baseline.report!.agents.reduce((sum,a)=>sum+a.steps.travel,0),candidate:candidate.report!.agents.reduce((sum,a)=>sum+a.steps.travel,0),unit:'agent steps'});
  expect(rows.idle!.candidate!).toBeGreaterThan(rows.idle!.baseline!);
  expect(rows.blocked!.evidence).toEqual([{runId:'baseline',...baseline.report!.findings[0]}].map(({runId,step,agent,outcomeIndex})=>({runId,step,agent,outcomeIndex})));
  expect({baseline,candidate}).toEqual(before);
});

it('marks different seeds and all changed input and controller fields without claiming a winner',async()=>{
  const baseline=await run('baseline'),candidate=await run('candidate',{budget:4,seed:8});
  candidate.config!.controllers=[...candidate.config!.controllers].map((value,i)=>({...value,kind:i===0?'external-mock':value.kind}));
  const comparison=compareRuns(baseline,candidate);
  expect(comparison.matchedSeed).toBe(false);
  expect(comparison.changes.map(value=>value.field)).toEqual(['input.parameters.budget','input.parameters.seed','controllers']);
  expect(comparison).not.toHaveProperty('winner');expect(comparison).not.toHaveProperty('better');
});

it('keeps identical runs identical and treats controller order as presentation only',async()=>{
  const baseline=await run('baseline'),candidate=structuredClone(baseline);candidate.id='repeat';
  candidate.config!.controllers=[...candidate.config!.controllers].reverse();
  const comparison=compareRuns(baseline,candidate);
  expect(comparison.changes).toEqual([]);expect(comparison.sameSource).toBe(true);expect(comparison.rows.every(row=>row.delta===0)).toBe(true);
  for(const row of comparison.rows)for(const evidence of row.evidence){const input=evidence.runId==='baseline'?baseline:candidate;expect(input.report!.findings).toContainEqual(expect.objectContaining({step:evidence.step,agent:evidence.agent,outcomeIndex:evidence.outcomeIndex}));}
});

it('compares source mode by the pinned source hash and leaves unavailable measurements unknown',async()=>{
  const baseline=await run('baseline'),candidate=await run('candidate',{budget:4});
  baseline.config!.input={mode:'source',source:'canonical source a'};candidate.config!.input={mode:'source',source:'canonical source b'};
  delete candidate.report;
  const comparison=compareRuns(baseline,candidate);
  expect(comparison.changes).toEqual([{field:'input.source',before:baseline.sourceHash,after:candidate.sourceHash}]);
  expect(comparison.rows.find(row=>row.key==='travel')).toMatchObject({candidate:null,delta:null,evidence:[]});
  expect(comparison.rows.find(row=>row.key==='partial')).toMatchObject({candidate:null,delta:null});
  delete baseline.config;delete candidate.config;
  expect(compareRuns(baseline,candidate).changes).toEqual([{field:'sourceHash',before:baseline.sourceHash,after:candidate.sourceHash}]);
});

it('labels unfinished records as partial and exposes their measured state without calling them final',async()=>{
  const baseline=await run('baseline'),candidate=await run('candidate',{},false);
  const comparison=compareRuns(baseline,candidate);
  expect(comparison.complete).toBe(false);expect(comparison.outcomes).toEqual({baseline:'completed',candidate:'partial'});
  expect(comparison.rows.find(row=>row.key==='completed')).toMatchObject({baseline:4,candidate:0,delta:-4});
  expect(comparison.rows.find(row=>row.key==='steps')).toMatchObject({candidate:0});
});
