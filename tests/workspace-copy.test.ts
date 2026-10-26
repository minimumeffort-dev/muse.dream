import {it,expect} from 'vitest';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS} from '../src/framework';
import {ExperimentRun} from '../src/runner';
import {outcomeCopy,reasonCopy,actionCopy,changeCopy,comparisonCopy,taskCopy} from '../src/workspace-copy';
import {compareRuns} from '../src/compare-runs';
const build=(budget=16)=>buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,{...DEFAULT_PARAMETERS,budget});
const finish=async(budget=16)=>{const run=await ExperimentRun.create(build(budget).source);while(run.advance()){}return run;};
it('explains measured completion and an unfinished deadline without inventing a cause',async()=>{
  const complete=await finish(),limited=await finish(4);
  expect(outcomeCopy(complete.metrics())).toMatchObject({heading:'All 4 tasks completed',detail:'16 coins spent in 27 simulation steps.'});
  expect(outcomeCopy(limited.metrics())).toMatchObject({heading:'Time limit reached',detail:'2 of 4 tasks completed. 8 coins spent in 80 simulation steps.'});
  expect(outcomeCopy(complete.metrics(0)).heading).toBe('0 of 4 tasks completed');
  expect(outcomeCopy(limited.metrics()).next).not.toMatch(/ran out|not enough/);
});
it('explains recorded requests using actual world labels and readable reasons',()=>{
  const {scenario}=build();
  expect(actionCopy({kind:'use',agent:'courier_a',service:'appointment'},scenario)).toBe('Tried to use Appointment at Community clinic.');
  expect(actionCopy({kind:'take',agent:'courier_a',stock:'bakery_bread',quantity:2},scenario)).toBe('Tried to collect 2 Bread at Neighborhood bakery.');
  expect(reasonCopy('service_full')).toBe('The service was busy');
  expect(reasonCopy('insufficient_funds')).toBe('The agent did not have enough coins');
  expect(reasonCopy('future_reason')).toBe('Future Reason');
  expect(taskCopy(scenario)).toBe('Deliver 2 Bread to School breakfast. Complete 1 service visit at Community clinic.');
});
it('summarizes comparisons without ranking runs with different workloads or incomplete results',async()=>{
  const a=await finish(),b=await finish(4),dto=(run:ExperimentRun,id:string)=>({id,sourceHash:run.manifest.sourceHash,seed:run.scenario.seed,metrics:run.metrics()});
  const comparison=compareRuns(dto(a,'a'),dto(b,'b'));
  expect(comparisonCopy(comparison,'Run 1','Run 2')).toBe('Run 2 completed 2 fewer tasks than Run 1.');
  const different=compareRuns(dto(a,'a'),{...dto(b,'b'),metrics:{...b.metrics(),total:8}});
  expect(comparisonCopy(different,'Run 1','Run 2')).toBe('Run 1: 4/4 tasks. Run 2: 2/8 tasks.');
  expect(comparisonCopy({...comparison,complete:false},'Run 1','Run 2')).toContain('unfinished');
});
it('keeps source fingerprints out of the primary change description',()=>{
  expect(changeCopy({field:'input.source',before:'a'.repeat(64),after:'b'.repeat(64)})).toBe('World rules changed');
  expect(changeCopy({field:'input.parameters.budget',before:16,after:4})).toBe('Budget per agent: 16 → 4');
  expect(changeCopy({field:'controllers',before:'courier_a: baseline',after:'courier_a: external-mock'})).toBe('Agent assignments changed');
});
