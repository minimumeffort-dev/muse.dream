import {describe,it,expect} from 'vitest';
import {buildFromBrief,compileExperiment,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,replayEpisode,type Parameters} from '../dreams-lab/src/framework';
import {ExperimentRun,ExperimentSession} from '../dreams-lab/src/runner';
import {projectLocations,agentPoint} from '../dreams-lab/src/world-map';

const build=(changes:Partial<Parameters>={})=>buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,{...DEFAULT_PARAMETERS,...changes});
const finish=(run:ExperimentRun)=>{while(run.advance()){};return run;};

describe('Dreams Lab compiler boundary',()=>{
  it('compiles the bounded local fixture through the canonical DSL, including eight private agent tasks',()=>{
    const accepted=build({agents:8,budget:9,deadline:99,seed:11});
    expect(compileExperiment(accepted.source)).toEqual(accepted);
    expect(accepted.scenario.agents).toHaveLength(8);
    expect(accepted.scenario.objectives).toHaveLength(16);
    expect(accepted.scenario).toMatchObject({maxSteps:99,seed:11});
    expect(accepted.scenario.agents.every(a=>a.budget===9&&a.capacity===4)).toBe(true);
  });
  it('rejects unsupported briefs, malformed parameters and out-of-target Dream without changing the language',()=>{
    expect(()=>buildFromBrief('A flooded city',DEFAULT_TASK,DEFAULT_PARAMETERS)).toThrow('local builder');
    expect(()=>buildFromBrief(DEFAULT_WORLD,'Fly to the moon',DEFAULT_PARAMETERS)).toThrow('local builder');
    for(const changes of [{agents:0},{agents:9},{agents:1.5},{budget:-1},{deadline:1001},{seed:NaN}])expect(()=>build(changes)).toThrow();
    expect(()=>compileExperiment('dream 2; script attack();')).toThrow(/E_/);
    expect(()=>compileExperiment(build().source+'\nrule timber(kind=table,mode=break(speed=95,scatter=65,lift=65,spin=4,lifetime=6));')).toThrow('standalone');
    expect(()=>compileExperiment('x'.repeat(65537))).toThrow('65,536');
  });
});

describe('Dreams Lab run ownership and replay',()=>{
  it('executes real rules, preserves recorded states and ends at measured success',async()=>{
    const run=await ExperimentRun.create(build().source),initial=structuredClone(run.at(0));
    finish(run);
    expect(run.metrics()).toMatchObject({completed:4,total:4,success:true,steps:27,creditsSpent:16,violations:0});
    expect(run.length).toBe(27);expect(run.at(0)).toEqual(initial);
    expect(run.metrics(0)).toMatchObject({completed:0,creditsSpent:0});
    expect(run.advance()).toBe(false);expect(run.length).toBe(27);
    for(const step of [-1,.5,28])expect(()=>run.at(step)).toThrow('Timeline');
    const recording=run.export(),replayed=await replayEpisode(recording);
    expect(replayed.episode.state).toEqual(run.at(run.length));
    expect(replayed.manifest.sourceHash).toBe(run.manifest.sourceHash);
  });
  it('repeats exactly from the same source and measures changed budgets and deadlines',async()=>{
    const a=finish(await ExperimentRun.create(build().source)),b=finish(await ExperimentRun.create(build().source));
    expect(a.export()).toBe(b.export());
    const poor=finish(await ExperimentRun.create(build({budget:4}).source));
    expect(poor.metrics()).toMatchObject({completed:2,total:4,steps:80,creditsSpent:8,truncated:true,success:false});
    const short=finish(await ExperimentRun.create(build({deadline:3}).source));
    expect(short.metrics()).toMatchObject({steps:3,truncated:true,success:false});
    expect(poor.manifest.sourceHash).not.toBe(a.manifest.sourceHash);
  });
  it('never replaces an accepted run with invalid source or a late preparation result',async()=>{
    const session=new ExperimentSession(),first=await session.start(build().source);
    first!.advance();const initialState=structuredClone(first!.at(1));
    await expect(session.start('dream 2; broken')).rejects.toThrow();expect(session.run).toBe(first);
    const cancelled=session.start(build({budget:4}).source);session.invalidate();
    expect(await cancelled).toBeUndefined();expect(session.run).toBe(first);
    const old=session.start(build({seed:8}).source),latest=session.start(build({seed:9}).source);
    expect(await old).toBeUndefined();expect(await latest).toBe(session.run);
    expect(session.run!.scenario.seed).toBe(9);expect(session.preparing).toBe(false);
    expect(first!.at(1)).toEqual(initialState);
  });
});

it('projects only accepted locations and moves a travelling agent along its actual link progress',async()=>{
  const run=await ExperimentRun.create(build().source),points=projectLocations(run.scenario);
  expect([...points.keys()]).toEqual(run.scenario.locations.map(l=>l.id));
  for(const point of points.values()){expect(Number.isFinite(point.x)).toBe(true);expect(Number.isFinite(point.y)).toBe(true);}
  const start=run.at(0).agents[0]!;expect(agentPoint(start,points)).toEqual(points.get(start.at));
  run.advance();run.advance();
  const moving=run.at(2).agents[0]!;expect(moving.work?.kind).toBe('move');
  if(moving.work?.kind==='move'){
    const from=points.get(moving.work.from)!,to=points.get(moving.work.to)!;
    const fraction=1-moving.work.remaining/moving.work.total;
    expect(agentPoint(moving,points)).toEqual({x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction});
  }
});
