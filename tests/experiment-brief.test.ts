import {describe,it,expect} from 'vitest';
import {SAMPLE_PROMPTS,matchesExamplePrompt,type ExampleId} from '../src/experiment-brief';
import {buildFromBrief,DEFAULT_PARAMETERS,SCENARIO_BRIEFS} from '../src/framework';

const scenario=(id:ExampleId)=>{
  const brief=SCENARIO_BRIEFS.find(value=>value.id===id)!;
  return buildFromBrief(brief.world,brief.task,DEFAULT_PARAMETERS).scenario;
};

describe('authored example briefs',()=>{
  it('describes the common default experiment and never treats changed text as a known example',()=>{
    for(const id of ['delivery','warehouse','classroom'] as const){
      const current=scenario(id),prompt=SAMPLE_PROMPTS[id];
      expect(current.agents).toHaveLength(2);
      expect(current.agents.every(agent=>agent.budget===16)).toBe(true);
      expect(current.maxSteps).toBe(80);expect(current.seed).toBe(7);
      expect(prompt).toContain('16 coins');expect(prompt).toContain('80 simulation steps');expect(prompt).toContain('seed 7');
      expect(matchesExamplePrompt(prompt,id)).toBe(true);
      expect(matchesExamplePrompt(prompt+' ',id)).toBe(false);
      expect(matchesExamplePrompt(prompt.replace('16 coins','4 coins'),id)).toBe(false);
      expect(matchesExamplePrompt('',id)).toBe(false);
    }
    expect(matchesExamplePrompt(SAMPLE_PROMPTS.delivery,'warehouse')).toBe(false);
  });

  it('matches the delivery preset’s tasks, prices, capacity, stock and travel times',()=>{
    const s=scenario('delivery'),prompt=SAMPLE_PROMPTS.delivery;
    expect(s.objectives.map(goal=>[goal.kind,goal.quantity])).toEqual([['deliver',2],['produce',1],['deliver',2],['produce',1]]);
    expect(s.stocks.filter(stock=>stock.mode==='source').map(stock=>[stock.quantity,stock.price])).toEqual([[12,2],[8,3]]);
    expect(s.services.map(service=>[service.duration,service.capacity,service.fee])).toEqual([[4,1,1]]);
    expect(s.links.map(link=>link.steps)).toEqual([3,2,3]);expect(s.agents.map(agent=>agent.capacity)).toEqual([4,4]);
    for(const fact of ['2 loaves','12 loaves at 2 coins','8 kits at 3 coins','costs 1 coin','takes 4 steps','one courier at a time','bakery-to-square route takes 3','square-to-school takes 2','square-to-clinic takes 3'])expect(prompt).toContain(fact);
  });

  it('matches warehouse and classroom tasks and resource constraints',()=>{
    const warehouse=scenario('warehouse'),classroom=scenario('classroom');
    expect(warehouse.objectives.map(goal=>goal.quantity)).toEqual([1,1,1,1]);
    expect(warehouse.stocks[0]).toMatchObject({quantity:12,price:2});expect(warehouse.links.map(link=>link.steps)).toEqual([2,3,3]);
    expect(warehouse.agents.map(agent=>agent.capacity)).toEqual([2,2]);
    for(const fact of ['1 carton to the north','1 to the south','12 cartons at 2 coins','receiving-to-yard route takes 2','each take 3'])expect(SAMPLE_PROMPTS.warehouse).toContain(fact);
    expect(classroom.objectives.map(goal=>[goal.at,goal.quantity])).toEqual([['studio',1],['seminar',1]]);
    expect(classroom.stocks[0]).toMatchObject({quantity:12,price:1});expect(classroom.links.map(link=>link.steps)).toEqual([3,2,2]);
    expect(classroom.services.map(service=>[service.duration,service.capacity,service.fee])).toEqual([[5,1,0],[5,1,0]]);
    expect(classroom.agents.map(agent=>agent.capacity)).toEqual([1,1]);
    for(const fact of ['first learner must complete a studio session','second a seminar session','12 packs at 1 coin','session is free, takes 5 steps','one learner at a time','library-to-courtyard route takes 3','each take 2'])expect(SAMPLE_PROMPTS.classroom).toContain(fact);
  });
});
