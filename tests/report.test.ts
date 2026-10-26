import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {buildRunReport} from '../src/report';
import {buildFromBrief,compileExperiment,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS} from '../src/framework';
import {createEpisode,stepEpisode,mockAction,observeAgent,type Episode} from '../src/engine/sim/episode';

const finish=(start:Episode)=>{
  let episode=start;
  while(!episode.state.terminated&&!episode.state.truncated)episode=stepEpisode(episode,episode.state.agents.map(agent=>mockAction(observeAgent(episode,agent.id))));
  return episode;
};
const delivery=()=>createEpisode(buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS).scenario);

it('reports observed resources and per-agent progress without mutating the accepted episode',()=>{
  const episode=finish(delivery()),before=structuredClone(episode),report=buildRunReport(episode);
  expect(report.metrics).toMatchObject({completed:4,total:4,success:true,steps:27,creditsSpent:16,blocked:1,violations:0});
  for(const actor of report.agents){
    expect(actor).toMatchObject({completed:2,total:2,partial:0,creditsSpent:8,rejected:0});
    expect(Object.values(actor.steps).reduce((a,b)=>a+b,0)).toBe(27);
    expect(actor.objectives.every(goal=>goal.progress===goal.quantity)).toBe(true);
  }
  expect(report.findings).toHaveLength(1);
  for(const finding of report.findings){
    expect(episode.records[finding.step-1]!.outcomes[finding.outcomeIndex]).toMatchObject({agent:finding.agent,status:finding.status,reason:finding.reason});
  }
  expect(report).toEqual(buildRunReport(finish(delivery())));
  expect(episode).toEqual(before);
});

it('counts all travel and service duration steps, including their starts and completion steps',()=>{
  const source=readFileSync(new URL('../examples/classroom.dream',import.meta.url),'utf8');
  const report=buildRunReport(finish(createEpisode(compileExperiment(source).scenario)));
  expect(report.metrics).toMatchObject({steps:9,completed:1,success:true});
  expect(report.agents[0]!.steps).toEqual({travel:3,service:5,idle:0,other:1});
});

it('retains partial objective units, separates idle from rejected requests and does not call a partial run successful',()=>{
  const source=`dream 2;
scenario partial_delivery(seed=1,max_steps=10){
  item bread(label="Bread");
  location shop(label="Shop",at=[100,100]);
  location school(label="School",at=[200,100]);
  link walk(from=shop,to=school,steps=1);
  stock sale(at=shop,item=bread,mode=source,quantity=3,price=2);
  stock delivery(at=school,item=bread,mode=sink,quantity=0);
  agent courier(at=shop,budget=10,capacity=3);
  objective breakfast(agent=courier,kind=deliver,at=school,item=bread,quantity=3);
}`;
  let episode=createEpisode(compileExperiment(source).scenario);
  for(const action of [
    {agent:'courier',kind:'take',stock:'sale',quantity:1},
    {agent:'courier',kind:'move',to:'school'},
    {agent:'courier',kind:'deliver',stock:'delivery',quantity:1},
    {agent:'courier',kind:'wait'},
    {agent:'courier',kind:'use',service:'missing'},
  ])episode=stepEpisode(episode,[action]);
  const report=buildRunReport(episode),actor=report.agents[0]!;
  expect(report.metrics).toMatchObject({steps:5,completed:0,success:false,truncated:false,creditsSpent:2,violations:1});
  expect(actor).toMatchObject({partial:1,total:1,steps:{travel:1,service:0,idle:1,other:3},blocked:0,rejected:1});
  expect(actor.objectives[0]).toMatchObject({progress:1,quantity:3});
  expect(actor.reasons).toEqual([{status:'rejected',reason:'service_not_here',count:1,evidence:{step:5,agent:'courier',outcomeIndex:0}}]);
});

it('caps event findings while retaining every reason count and valid chronological evidence references',()=>{
  let episode=delivery();
  for(let i=0;i<80;i++)episode=stepEpisode(episode,episode.state.agents.map(agent=>({agent:agent.id,kind:'use',service:'missing'})));
  const report=buildRunReport(episode);
  expect(report.findings).toHaveLength(64);expect(report.omittedFindings).toBe(96);
  expect(report.agents.every(agent=>agent.rejected===80&&agent.reasons[0]!.count===80)).toBe(true);
  expect(report.findings.map(event=>event.step)).toEqual([...report.findings.map(event=>event.step)].sort((a,b)=>a-b));
  for(const event of report.findings)expect(episode.records[event.step-1]!.outcomes[event.outcomeIndex]).toMatchObject({agent:event.agent,reason:event.reason,status:event.status});
});
