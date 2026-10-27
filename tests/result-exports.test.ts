import {it,expect} from 'vitest';
import {csv,runCsv,comparisonCsv} from '../src/result-exports';
import {buildRunReport} from '../src/report';
import {compareRuns} from '../src/compare-runs';
import {ExperimentRun} from '../src/runner';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS} from '../src/framework';

async function completed(id:string,budget:number){
  const input={mode:'brief' as const,world:DEFAULT_WORLD,task:DEFAULT_TASK,parameters:{...DEFAULT_PARAMETERS,budget}};
  const run=await ExperimentRun.create(buildFromBrief(input.world,input.task,input.parameters).source);
  while(run.advance()){}
  const report=buildRunReport(run.episodeSnapshot),pin={scenario:run.scenario.id,sourceHash:run.manifest.sourceHash,seed:run.scenario.seed};
  return {run,report,pin,summary:{id,sourceHash:pin.sourceHash,seed:pin.seed,config:{input,controllers:[]},metrics:report.metrics,report}};
}

it('exports real per-agent outcomes, all time categories and accepted source pins',async()=>{
  const {report,pin}=await completed('baseline',16),lines=runCsv(report,pin).trim().split('\r\n');
  expect(lines).toHaveLength(3);
  expect(lines[0]).toContain('"other_steps","blocked_requests","rejected_requests"');
  for(const [i,agent] of report.agents.entries()){
    expect(lines[i+1]).toBe(`"${pin.scenario}","${pin.sourceHash}",7,27,"completed","${agent.agent}",2,2,0,8,16,4,${agent.steps.idle},${agent.steps.other},${agent.blocked},0`);
    expect(Object.values(agent.steps).reduce((sum,value)=>sum+value,0)).toBe(27);
  }
});

it('exports paired measurements with signed changes and matching run pins, without replacing missing values with zero',async()=>{
  const baseline=await completed('baseline',16),candidate=await completed('candidate',4);
  const comparison=compareRuns(baseline.summary,candidate.summary),output=comparisonCsv(comparison,baseline.summary,candidate.summary);
  expect(output.trim().split('\r\n')).toHaveLength(comparison.rows.length+1);
  expect(output).toContain(`"completed","tasks","baseline","${baseline.pin.sourceHash}",7,"completed",4,"candidate","${candidate.pin.sourceHash}",7,"deadline",2,-2\r\n`);
  expect(output).toContain(`"steps","steps","baseline","${baseline.pin.sourceHash}",7,"completed",27,"candidate","${candidate.pin.sourceHash}",7,"deadline",80,53\r\n`);
  const incomplete={...candidate.summary,report:undefined};
  const partial=comparisonCsv(compareRuns(baseline.summary,incomplete),baseline.summary,incomplete);
  expect(partial).toContain(`"travel","agent steps","baseline","${baseline.pin.sourceHash}",7,"completed",32,"candidate","${candidate.pin.sourceHash}",7,"deadline",,\r\n`);
});

it('marks unfinished CSV snapshots as partial, including comparisons',async()=>{
  const {pin,summary}=await completed('baseline',16);
  const run=await ExperimentRun.create(buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS).source),report=buildRunReport(run.episodeSnapshot);
  expect(runCsv(report,pin)).toContain(',7,0,"partial","courier_a",0,2,0,0,0,0,0,0,0,0');
  const partial={...summary,id:'partial',metrics:report.metrics,report};
  expect(comparisonCsv(compareRuns(summary,partial),summary,partial)).toContain(',7,"partial",0,');
});

it('escapes quoted and multiline text and prevents spreadsheet formulas without corrupting negative numbers',()=>{
  expect(csv([['a,b','a"b','two\nlines','=1+1',' @SUM(A1)','-text','+text',-2,0,null]]))
    .toBe('"a,b","a""b","two\nlines","\'=1+1","\' @SUM(A1)","\'-text","\'+text",-2,0,\r\n');
});
