import {it,expect} from 'vitest';
import {buildRunReport} from '../src/report';
import {compareRuns} from '../src/compare-runs';
import {runCsv} from '../src/result-exports';
import {ExperimentRun} from '../src/runner';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS} from '../src/framework';
const create=(budget=16)=>ExperimentRun.create(buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,{...DEFAULT_PARAMETERS,budget}).source);

it('reports only committed progress at every live step and preserves earlier reports and replay states',async()=>{
  const run=await create(),initial=structuredClone(run.at(0)),first=buildRunReport(run.episodeSnapshot),before=structuredClone(first);
  do{
    const report=buildRunReport(run.episodeSnapshot);
    expect(report.metrics).toEqual(run.metrics());
    for(const agent of report.agents)expect(Object.values(agent.steps).reduce((sum,value)=>sum+value,0)).toBe(run.length);
    expect(report.agents.reduce((sum,agent)=>sum+agent.creditsSpent,0)).toBe(report.metrics.creditsSpent);
    expect(report.findings.every(finding=>finding.step<=run.length)).toBe(true);
    const exported=runCsv(report,{scenario:run.scenario.id,sourceHash:run.manifest.sourceHash,seed:run.scenario.seed});
    expect(exported).toContain(`,7,${run.length},"${run.ended?'completed':'partial'}",`);
    expect(run.at(0)).toEqual(initial);expect(first).toEqual(before);
  }while(run.advance());
  expect(buildRunReport(run.episodeSnapshot).metrics).toMatchObject({completed:4,steps:27,success:true});
});

it('updates an unfinished comparison through its deadline without changing the completed baseline',async()=>{
  const baseline=await create();while(baseline.advance()){}
  const candidate=await create(4),base={id:'baseline',sourceHash:baseline.manifest.sourceHash,seed:7,metrics:baseline.metrics(),report:buildRunReport(baseline.episodeSnapshot)},before=structuredClone(base);
  let first:ReturnType<typeof compareRuns>|undefined;
  do{
    const comparison=compareRuns(base,{id:'candidate',sourceHash:candidate.manifest.sourceHash,seed:7,metrics:candidate.metrics(),report:buildRunReport(candidate.episodeSnapshot)});
    expect(comparison.rows.find(row=>row.key==='steps')).toMatchObject({baseline:27,candidate:candidate.length,delta:candidate.length-27});
    expect(comparison.rows.find(row=>row.key==='completed')!.candidate).toBe(candidate.metrics().completed);
    expect(comparison.complete).toBe(candidate.ended);expect(comparison.outcomes.candidate).toBe(candidate.ended?'deadline':'partial');
    if(!first)first=comparison;else expect(first.rows.find(row=>row.key==='steps')!.candidate).toBe(0);
    expect(base).toEqual(before);
  }while(candidate.advance());
  expect(candidate.length).toBe(80);
});
