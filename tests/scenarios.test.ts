import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {BRIEF_BUILDER,SCENARIO_BRIEFS,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,buildFromBrief,compileExperiment,replayEpisode} from '../src/framework';
import {ExperimentRun} from '../src/runner';
import {scenePlan,cargoAssets} from '../src/scene-plan';
import {AGENT_MODELS,ITEM_MODELS,LOCATION_MODELS} from '../src/assets';
import {SCENARIO_LOOKS} from '../src/engine/scene/scenario-looks';
import {compareRuns} from '../src/compare-runs';
import {buildRunReport} from '../src/report';
const build=(index:number,agents=2)=>{const b=SCENARIO_BRIEFS[index]!;return buildFromBrief(b.world,b.task,{...DEFAULT_PARAMETERS,agents});};
const finish=async(source:string)=>{const run=await ExperimentRun.create(source);while(run.advance()){}return run;};

it('runs and replays three distinct source-authored worlds through the public runner',async()=>{
  const plans=[];
  for(const [index,brief] of SCENARIO_BRIEFS.entries()){
    const accepted=build(index),run=await finish(accepted.source),plan=scenePlan(run.scenario);plans.push(plan.locations.map(l=>l.asset));
    expect(compileExperiment(accepted.source)).toEqual(accepted);
    expect(run.metrics(),brief.id).toMatchObject({success:true,violations:0,total:index===2?2:4});
    expect(run.scenario.locations.every(l=>l.look!==undefined)).toBe(true);
    expect(run.scenario.agents.every(a=>a.look!==undefined)).toBe(true);
    expect(run.at(0).agents.map(a=>a.at)).toEqual(run.scenario.agents.map(a=>a.at));
    expect((await replayEpisode(run.export())).episode.state).toEqual(run.at(run.length));
    expect((await finish(accepted.source)).export()).toBe(run.export());
    expect(build(index,8).scenario.agents).toHaveLength(8);
  }
  expect(new Set(plans.map(p=>JSON.stringify(p))).size).toBe(3);
});
it('binds appearance, heading and cargo independently of scenario IDs and labels',()=>{
  const source=build(1).source.replace('warehouse_restock','arbitrary_world').replace('look=warehouse','look=library,facing_deg=90').replace('look=parcel','look=book');
  const {scenario}=compileExperiment(source),plan=scenePlan(scenario),receiving=plan.locations[0]!;
  expect(receiving.asset).toBe('library');expect(receiving.yaw).toBeCloseTo(Math.PI/2);
  expect(cargoAssets(scenario,{parcel:1})).toEqual(['book']);
  expect(cargoAssets(scenario,{parcel:0})).toEqual([]);
  expect(AGENT_MODELS[scenario.agents[0]!.look!]).toBe('worker');
  expect(Object.keys(LOCATION_MODELS)).toEqual([...SCENARIO_LOOKS.locations]);
  expect(Object.keys(AGENT_MODELS)).toEqual([...SCENARIO_LOOKS.agents]);
  expect(Object.keys(ITEM_MODELS)).toEqual([...SCENARIO_LOOKS.items]);
});
it('rejects unknown or mismatched looks, remote assets and invalid headings',()=>{
  const source=build(1).source;
  for(const look of ['airport','worker','"https://example.com/model.glb"'])expect(()=>compileExperiment(source.replace('look=warehouse',`look=${look}`))).toThrow(/E_/);
  for(const heading of ['361','-361','1000001'])expect(()=>compileExperiment(source.replace('look=warehouse',`look=warehouse,facing_deg=${heading}`))).toThrow(/E_/);
  expect(()=>compileExperiment(source.replace('look=worker','look=bread'))).toThrow(/E_/);
  expect(()=>compileExperiment(source.replace('look=parcel','look=classroom'))).toThrow(/E_/);
});
it('keeps presentation out of task transitions, resources, rewards and completion',async()=>{
  for(const [index] of SCENARIO_BRIEFS.entries()){
    const source=build(index).source,plain=source.replace(/,look=[a-z_]+/g,'');
    const a=await finish(source),b=await finish(plain);
    expect(a.at(a.length)).toEqual(b.at(b.length));expect(a.metrics()).toEqual(b.metrics());
    expect(JSON.parse(a.export().split('\n')[0]!).sourceHash).not.toBe(b.manifest.sourceHash);
    expect(a.export().split('\n').slice(1)).toEqual(b.export().split('\n').slice(1));
  }
});
it('measures the warehouse stock shortage and compares the actual recorded outcomes',async()=>{
  const source=build(1).source,a=await finish(source),b=await finish(source.replace('quantity=12','quantity=2'));
  expect(a.metrics()).toMatchObject({completed:4,total:4,creditsSpent:8,success:true});
  expect(b.metrics()).toMatchObject({completed:2,total:4,creditsSpent:4,truncated:true,violations:0});
  const dto=async(run:ExperimentRun,id:string)=>({id,sourceHash:run.manifest.sourceHash,seed:run.scenario.seed,metrics:run.metrics(),report:buildRunReport((await replayEpisode(run.export())).episode)});
  const comparison=compareRuns(await dto(a,'stock12'),await dto(b,'stock2'));
  expect(comparison.rows.find(r=>r.key==='completed')).toMatchObject({baseline:4,candidate:2,delta:-2});
});
it('retains the original delivery builder for existing saved brief configurations',async()=>{
  const legacy=buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS,'delivery-1');
  const original=readFileSync(new URL('../examples/legacy/morning-delivery-v1.dream',import.meta.url),'utf8');
  // The original brief builder interleaved each agent with its objectives.
  const agentB='  agent courier_b(at=bakery,budget=16,capacity=4);\n';
  const visitA='  objective visit_a(agent=courier_a,kind=produce,at=clinic,item=visit,quantity=1);\n';
  expect(legacy.source).toBe(compileExperiment(original.replace(agentB,'').replace(visitA,visitA+agentB)).source);
  const run=await finish(legacy.source);expect(run.metrics()).toMatchObject({completed:4,steps:27,creditsSpent:16});
  expect(build(0).source).not.toBe(legacy.source);expect(BRIEF_BUILDER).toBe('scenarios-1');
});
it('executes the complete world-authoring documentation example',async()=>{
  const guide=readFileSync(new URL('../docs/worlds.md',import.meta.url),'utf8');
  const example=guide.match(/```dream\n([\s\S]*?)```/)![1]!;
  expect((await finish(example)).metrics()).toMatchObject({completed:1,total:1,success:true,violations:0});
});
