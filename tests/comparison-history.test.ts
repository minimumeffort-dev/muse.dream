import {it,expect} from 'vitest';
import {RunHistory,historyLine,historyPointAt,validateReportedHistory} from '../src/run-history';
import {comparisonHistoryCsv} from '../src/result-exports';
import {buildRunReport} from '../src/report';
import {ExperimentRun} from '../src/runner';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS} from '../src/framework';
import type {SavedRunReport} from '../src/experiment-types';
async function report(budget=16,steps=1000):Promise<SavedRunReport>{
  const run=await ExperimentRun.create(buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,{...DEFAULT_PARAMETERS,budget}).source);
  while(run.length<steps&&run.advance()){}
  const summary=buildRunReport(run.episodeSnapshot);
  return {...summary,history:new RunHistory(run).update(),run:{id:'budget-'+budget,experimentId:'delivery',revision:1,name:'Delivery',sourceHash:run.manifest.sourceHash,seed:7,config:{name:'Delivery',input:{mode:'source',source:run.manifest.source},controllers:[]},status:run.ended?'completed':'waiting',steps:run.length,metrics:summary.metrics,createdAt:'',updatedAt:''}};
}

it('aligns two real mock histories by step and stops the shorter line at its recorded head',async()=>{
  const left=await report(),right=await report(4);
  expect(left.metrics.steps).toBe(27);expect(right.metrics.steps).toBe(80);
  expect(historyPointAt(left.history,27)).toEqual({step:27,completed:4,spent:16,waiting:7});
  expect(historyPointAt(right.history,27)).toEqual({step:27,completed:2,spent:8,waiting:30});
  expect(historyPointAt(left.history,28)).toBeUndefined();
  const line=historyLine(left.history!,'completed',4,80);
  expect(line.endsWith('H145.3V16')).toBe(true);expect(line).not.toContain('352');
  expect(historyLine(right.history!,'completed',4,80).endsWith('H352V64')).toBe(true);
});

it('exports aligned values, signed differences and source pins without filling missing future steps',async()=>{
  const left=await report(),right=await report(4),rows=comparisonHistoryCsv(left,right).trim().split('\r\n');
  expect(rows).toHaveLength(82);expect(rows[0]).toContain('"waiting_change"');
  expect(rows[28]).toContain(`"${left.run.sourceHash}",7,27,"completed"`);
  expect(rows[28]).toContain(`"${right.run.sourceHash}",7,80,"deadline",27,4,2,-2,16,8,-8,7,30,23`);
  expect(rows[29]).toContain(',28,,2,,,8,,,32,');
  const missing={...left,history:undefined};
  expect(comparisonHistoryCsv(missing,right).split('\r\n')[1]).toContain(',0,,0,,,0,,,0,');
});

it('keeps zero-step and partial snapshots honest without mutating or advancing either run',async()=>{
  const left=await report(16,0),right=await report(4,12),snapshot=structuredClone(right);
  expect(historyLine(left.history!,'spent',8,12)).toBe('M40 112');
  expect(historyPointAt(left.history,1)).toBeUndefined();expect(historyPointAt(undefined,0)).toBeUndefined();
  expect(comparisonHistoryCsv(left,right)).toContain(',0,"partial",');
  expect(comparisonHistoryCsv(left,right).trim().split('\r\n')).toHaveLength(14);
  expect(right).toEqual(snapshot);expect(()=>validateReportedHistory(left)).not.toThrow();expect(()=>validateReportedHistory(right)).not.toThrow();
});

it('rejects malformed, incomplete, non-finite and report-mismatched history while allowing older hosts',async()=>{
  const good=await report(4);
  expect(()=>validateReportedHistory(good)).not.toThrow();expect(()=>validateReportedHistory({...good,history:undefined})).not.toThrow();
  const corrupt=(edit:(history:any[])=>void)=>{const bad=structuredClone(good);edit(bad.history as any[]);expect(()=>validateReportedHistory(bad)).toThrow('Run history does not match');};
  corrupt(points=>points.pop());corrupt(points=>points[1].step=2);corrupt(points=>points[1].spent=NaN);
  corrupt(points=>points[1].spent=-1);corrupt(points=>points[1].waiting=3);corrupt(points=>points[80].completed=3);
  corrupt(points=>points[80].waiting=135);corrupt(points=>points[79].spent=9);
});
