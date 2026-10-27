import {it,expect} from 'vitest';
import {RunHistory,historyLine,historyPosition} from '../src/run-history';
import {historyCsv} from '../src/result-exports';
import {buildRunReport} from '../src/report';
import {ExperimentRun} from '../src/runner';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS} from '../src/framework';
const create=(budget=16)=>ExperimentRun.create(buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,{...DEFAULT_PARAMETERS,budget}).source);

it('matches task, spending and waiting reports at every committed prefix without changing the run',async()=>{
  const run=await create(),history=new RunHistory(run),origin=history.points[0];
  do{
    const length=run.length,points=history.update(),report=buildRunReport(run.episodeSnapshot);
    expect(points).toHaveLength(length+1);
    expect(points.at(-1)).toEqual({step:length,completed:report.metrics.completed,spent:report.metrics.creditsSpent,waiting:report.agents.reduce((sum,agent)=>sum+agent.steps.idle,0)});
    expect(history.update()).toBe(points);expect(run.length).toBe(length);
    expect(points[0]).toBe(origin);expect(origin).toEqual({step:0,completed:0,spent:0,waiting:0});
  }while(run.advance());
  expect(history.points.at(-1)).toEqual({step:27,completed:4,spent:16,waiting:7});
});

it('exposes a real stalled mock run as flat progress and spending with increasing waits',async()=>{
  const run=await create(4),history=new RunHistory(run);while(run.advance()){}
  const points=history.update(),tail=points.slice(-5);
  expect(points.at(-1)).toEqual({step:80,completed:2,spent:8,waiting:136});
  expect(tail.every(point=>point.completed===2&&point.spent===8)).toBe(true);
  for(let i=1;i<tail.length;i++)expect(tail[i]!.waiting-tail[i-1]!.waiting).toBe(2);
  const csv=historyCsv(points,{scenario:run.scenario.id,sourceHash:run.manifest.sourceHash,seed:7,outcome:'deadline'});
  expect(csv).toContain('"recorded_steps","snapshot_outcome","step"');
  expect(csv.trim().split('\r\n')).toHaveLength(82);
  expect(csv).toContain(`"${run.scenario.id}","${run.manifest.sourceHash}",7,80,"deadline",80,2,8,136\r\n`);
});

it('catches up batched verified host records and retains older points and source-pinned partial exports',async()=>{
  const host=await create(),reader=await ExperimentRun.create(host.manifest.source,host.manifest.policy),history=new RunHistory(reader);
  for(let i=0;i<10;i++)host.advance();for(const record of host.records)reader.appendRecorded(record);
  const points=history.update(),older=points[5],snapshot=structuredClone(older);
  const partial=historyCsv(points,{scenario:reader.scenario.id,sourceHash:reader.manifest.sourceHash,seed:7,outcome:'partial'});
  expect(partial.trim().split('\r\n')).toHaveLength(12);expect(partial).toContain(',7,10,"partial",');
  while(host.advance()){}for(const record of host.records.slice(10))reader.appendRecorded(record);
  history.update();expect(history.points).toHaveLength(28);expect(history.points[5]).toBe(older);expect(older).toEqual(snapshot);
  expect(history.points.map(point=>point.step)).toEqual(Array.from({length:28},(_,step)=>step));
  const other=await create(4);expect(new RunHistory(other).points).toEqual([{step:0,completed:0,spent:0,waiting:0}]);
  expect(other.manifest.sourceHash).not.toBe(reader.manifest.sourceHash);
});

it('draws discrete steps and finite positions for a zero-step or zero-valued run',()=>{
  const origin={step:0,completed:0,spent:0,waiting:0},next={step:1,completed:1,spent:4,waiting:2};
  expect(historyLine([origin],'waiting',0)).toBe('M40 112');
  expect(historyPosition(origin,'waiting',0,0)).toEqual({x:40,y:112});
  expect(historyLine([origin,next],'completed',2)).toBe('M40 112H352V64');
  expect(historyPosition(next,'waiting',1,2)).toEqual({x:352,y:16});
});
