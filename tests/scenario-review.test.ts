import {it,expect} from 'vitest';
import {buildFromBrief,compileExperiment,DEFAULT_PARAMETERS,SCENARIO_BRIEFS} from '../src/framework';
import {scenarioReview} from '../src/scenario-review';
import delivery from '../examples/morning-delivery.dream?raw';
import warehouse from '../examples/warehouse.dream?raw';

it('describes the exact delivery goals, assigned agents, prices and shared service',()=>{
  const scenario=buildFromBrief(SCENARIO_BRIEFS[0].world,SCENARIO_BRIEFS[0].task,DEFAULT_PARAMETERS).scenario;
  const review=scenarioReview(scenario);
  expect(review.objectiveCount).toBe(4);
  expect(review.tasks).toEqual([
    {description:'Deliver 2 Bread to School breakfast',agents:['Courier A','Courier B']},
    {description:'Complete 1 Appointment at Community clinic',agents:['Courier A','Courier B']},
  ]);
  expect(review.deadline).toBe('Time limit: 80 simulation steps');
  expect(review.budgets).toEqual(['Courier A, Courier B: 16 coins starting budget each']);
  expect(review.stocks).toContain('Bread at Neighborhood bakery: 12 available at the start · 2 coins each');
  expect(review.stocks).toContain('Supply kit at Neighborhood bakery: 8 available at the start · 3 coins each');
  expect(review.services).toEqual(['Appointment at Community clinic: 1 at a time · 4 steps · uses 1 Supply kit and produces 1 Visit completed · 1 coin per use']);
  expect(review.capacities).toEqual(['Courier A, Courier B: can carry 4 items each']);
  expect(review.routes).toContain('Neighborhood bakery ↔ Town square: 3 steps');
});

it('keeps warehouse and classroom objectives and their different assignments explicit',()=>{
  const [warehouseBrief,classBrief]=SCENARIO_BRIEFS.slice(1);
  const warehouseReview=scenarioReview(buildFromBrief(warehouseBrief!.world,warehouseBrief!.task,DEFAULT_PARAMETERS).scenario);
  expect(warehouseReview.objectiveCount).toBe(4);expect(warehouseReview.tasks.map(task=>task.description)).toEqual(['Deliver 1 Stock carton to North stockroom','Deliver 1 Stock carton to South stockroom']);
  expect(warehouseReview.services).toEqual([]);expect(warehouseReview.stocks[0]).toContain('2 coins each');
  const classroomReview=scenarioReview(buildFromBrief(classBrief!.world,classBrief!.task,DEFAULT_PARAMETERS).scenario);
  expect(classroomReview.objectiveCount).toBe(2);expect(classroomReview.tasks.map(task=>task.agents)).toEqual([['Learner A'],['Learner B']]);
  expect(classroomReview.services).toEqual(expect.arrayContaining([expect.stringContaining('uses 1 Lesson pack and produces 1 Session completed · free')]));
});

it('uses custom Dream conditions and hides budgets when the scenario has no prices or fees',()=>{
  const custom=delivery.replace('price=2','price=0').replace('price=3','price=0').replace('fee=1','fee=0').replace('budget=16,capacity=4,look=courier_b','budget=5,capacity=2,look=courier_b').replace('max_steps=80','max_steps=42');
  const review=scenarioReview(compileExperiment(custom).scenario);
  expect(review.deadline).toBe('Time limit: 42 simulation steps');expect(review.budgets).toEqual([]);
  expect(review.stocks.every(stock=>stock.endsWith('free'))).toBe(true);expect(review.services[0]).toContain(' · free');
  expect(review.capacities).toEqual(['Courier A: can carry 4 items','Courier B: can carry 2 items']);
  const noService=scenarioReview(compileExperiment(warehouse.replace('price=2','price=0')).scenario);
  expect(noService.budgets).toEqual([]);expect(noService.services).toEqual([]);
});

it('shows differing budgets and never assumes which service produces a shared output',()=>{
  const custom=delivery.replace('budget=16,capacity=4,look=courier_b','budget=5,capacity=4,look=courier_b')
    .replace('  agent courier_a', '  service extra_appointment(at=clinic,consumes=kit,produces=visit,duration=6,capacity=2,fee=0);\n  agent courier_a');
  const review=scenarioReview(compileExperiment(custom).scenario);
  expect(review.budgets).toEqual(['Courier A: 16 coins starting budget','Courier B: 5 coins starting budget']);
  expect(review.tasks[1]).toEqual({description:'Produce 1 Visit completed at Community clinic',agents:['Courier A','Courier B']});
  expect(review.services).toHaveLength(2);
});

it('does not collapse two separate identical objectives assigned to the same agent',()=>{
  const custom=delivery.replace('  objective visit_a', '  objective extra_breakfast_a(agent=courier_a,kind=deliver,at=school,item=bread,quantity=2);\n  objective visit_a');
  const review=scenarioReview(compileExperiment(custom).scenario),bread=review.tasks.filter(task=>task.description==='Deliver 2 Bread to School breakfast');
  expect(review.objectiveCount).toBe(5);expect(bread).toEqual([{description:'Deliver 2 Bread to School breakfast',agents:['Courier A','Courier B']},{description:'Deliver 2 Bread to School breakfast',agents:['Courier A']}]);
});
