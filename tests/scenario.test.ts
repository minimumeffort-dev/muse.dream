import {describe,it,expect} from 'vitest';
import {compileDreamWorld,checkDream,formatDream} from '../src/scene/dream';
import {scenarioSchema} from '../src/scene/scenario';
import {createEpisode,stepEpisode,mockAction,observeAgent,episodeMetrics} from '../src/sim/episode';
import {recordingManifest,exportEpisode,replayEpisode} from '../src/experiment/recording';
import {proposeDream,mockInterpreter,DEFAULT_PROMPT} from '../src/authoring/prompt';
import source from '../docs/examples/town-scenario.dream?raw';
import ecology from '../docs/examples/ecology-scenario.dream?raw';
import classroom from '../docs/examples/classroom-scenario.dream?raw';

const scenario=()=>compileDreamWorld(source).scenarios[0]!;
const waitUntilIdle=(episode:ReturnType<typeof createEpisode>)=>{let next=episode;while(next.state.agents.some(a=>a.work))next=stepEpisode(next,[]);return next;};
const run=(input=scenario())=>{let e=createEpisode(input);while(!e.state.terminated&&!e.state.truncated)e=stepEpisode(e,e.state.agents.map(a=>mockAction(observeAgent(e,a.id))));return e;};

describe('scenario authoring',()=>{
  it('compiles and round-trips the scoped logical world without adding racing declarations',()=>{
    const world=compileDreamWorld(source);expect(world.layout).toBeUndefined();expect(world.scenarios).toHaveLength(1);
    expect(compileDreamWorld(formatDream(source))).toEqual(world);expect(formatDream(formatDream(source))).toBe(formatDream(source));
  });
  it.each([
    ['max_steps=80','max_steps=1001'],['seed=7','seed=-1'],['capacity=4','capacity=0'],['quantity=12','quantity=1.5'],
    ['to=school,steps=2','to=unknown,steps=2'],['at=school,item=bread,mode=sink','at=unknown,item=bread,mode=sink'],
    ['consumes=kit','consumes=unknown'],['item=visit,quantity=1','item=kit,quantity=1'],['mode=sink,quantity=0','mode=sink,quantity=1'],
    ['mode=sink,quantity=0','mode=sink,quantity=0,price=2'],['at=school,item=bread,quantity=2','at=bakery,item=bread,quantity=2'],
    ['duration=4','duration=0'],['from=square,to=clinic','from=clinic,to=clinic'],['consumes=kit,produces=visit','consumes=visit,produces=kit'],
  ])('rejects invalid scenario data: %s', (before,after)=>{
    const result=checkDream(source.replace(before,after));expect(result.ok).toBe(false);
    if(!result.ok){expect(result.diagnostics[0]!.code).toMatch(/^E_/);expect(result.diagnostics[0]!.line).toBeGreaterThan(0);}
  });
  it('rejects a disconnected destination, unassigned agents, duplicate links and project-level scenario overflow',()=>{
    expect(checkDream(source.replace('  link east_walk(from=square,to=clinic,steps=3);','')).ok).toBe(false);
    const s=scenario();expect(scenarioSchema.safeParse({...s,agents:[...s.agents,{...s.agents[0]!,id:'unused'}]}).success).toBe(false);
    expect(scenarioSchema.safeParse({...s,links:[...s.links,{...s.links[0]!,id:'duplicate'}]}).success).toBe(false);
    expect(()=>compileDreamWorld(source+'include another(module=other);',{other:source.replace('morning_errands','second')})).toThrow('one scenario');
  });
  it('locates field repairs on the service declaration rather than the scenario header',()=>{
    const checked=checkDream(source.replace('duration=4','duration=0'));if(checked.ok)throw Error('invalid duration accepted');
    expect(checked.diagnostics[0]!.path).toContain('service:appointment/duration');expect(checked.diagnostics[0]!.line).toBeGreaterThan(10);
  });
});

describe('bounded task episodes',()=>{
  it.each([ecology,classroom])('runs a different domain through the same item, service and task mechanisms',text=>{
    const result=run(compileDreamWorld(text).scenarios[0]!);expect(result.state.terminated).toBe(true);expect(episodeMetrics(result).violations).toBe(0);
  });
  it('completes both agents tasks through inventory, prices, connected travel and a single service desk',()=>{
    const result=run();expect(episodeMetrics(result)).toMatchObject({success:true,completed:4,total:4,violations:0,creditsSpent:16});
    expect(result.state.stocks.breakfast_delivery).toBe(4);expect(result.state.stocks.bakery_bread).toBe(8);expect(result.state.stocks.supply_counter).toBe(6);
    expect(result.state.agents.every(a=>a.inventory.visit===1)).toBe(true);
    for(const record of result.records)expect(record.nextObservations.filter(o=>o.self.work?.kind==='service').length).toBeLessThanOrEqual(1);
  });
  it('is deterministic, pure, input-order independent and conserves money',()=>{
    let a=createEpisode(scenario()),b=createEpisode(scenario());const original=structuredClone(a);
    for(let n=0;n<8;n++){
      const actions=a.state.agents.map(v=>mockAction(observeAgent(a,v.id)));a=stepEpisode(a,actions);b=stepEpisode(b,actions.reverse());expect(a).toEqual(b);
      expect(a.state.agents.reduce((n,v)=>n+v.credits,0)+Object.values(a.state.treasuries).reduce((n,v)=>n+v,0)).toBe(32);
    }
    expect(original.state.step).toBe(0);expect(original.records).toHaveLength(0);
  });
  it('rotates deterministic contention priority and never oversells stock or allows free/remote purchases',()=>{
    const s=scenario();s.stocks[0]!.quantity=1;
    const next=stepEpisode(createEpisode(s),s.agents.map(a=>({agent:a.id,kind:'take',stock:'bakery_bread',quantity:1})));
    expect(next.state.stocks.bakery_bread).toBe(0);expect(next.state.agents.filter(a=>a.inventory.bread===1)).toHaveLength(1);
    expect(next.state.agents.find(a=>a.inventory.bread===1)!.id).toBe('courier_b');
    expect(next.records[0]!.outcomes.some(o=>o.reason==='insufficient_stock')).toBe(true);
    const poor=scenario();poor.agents[0]!.budget=1;expect(stepEpisode(createEpisode(poor),[{agent:'courier_a',kind:'take',stock:'bakery_bread',quantity:1}]).state.agents[0]!.inventory.bread).toBe(0);
    const remote=stepEpisode(createEpisode(scenario()),[{agent:'courier_a',kind:'deliver',stock:'breakfast_delivery',quantity:1}]);expect(remote.records[0]!.outcomes.find(o=>o.agent==='courier_a')!.reason).toBe('stock_not_here');
  });
  it('enforces carrying capacity, exact travel duration, busy ownership and delivery-only sinks',()=>{
    const s=scenario();s.agents[0]!.capacity=1;let e=createEpisode(s);
    e=stepEpisode(e,[{agent:'courier_a',kind:'take',stock:'bakery_bread',quantity:2}]);expect(e.state.agents[0]!.inventory.bread).toBe(0);
    e=stepEpisode(e,[{agent:'courier_a',kind:'move',to:'square'}]);expect(e.state.agents[0]!.work).toMatchObject({remaining:2});
    e=stepEpisode(e,[{agent:'courier_a',kind:'move',to:'clinic'}]);expect(e.state.agents[0]!.violations).toBe(2);
    e=stepEpisode(e,[]);expect(e.state.agents[0]!.at).toBe('square');expect(e.state.agents[0]!.work).toBeUndefined();
    e=waitUntilIdle(stepEpisode(e,[{agent:'courier_a',kind:'move',to:'school'}]));
    expect(stepEpisode(e,[{agent:'courier_a',kind:'take',stock:'breakfast_delivery',quantity:1}]).records.at(-1)!.outcomes.some(o=>o.reason==='sink_is_delivery_only')).toBe(true);
  });
  it('does not double-credit a delivery across identical objectives or reward fabricated completion',()=>{
    const s=scenario();s.objectives.splice(1,0,{...s.objectives[0]!,id:'second_delivery'});let e=createEpisode(s);
    e=stepEpisode(e,[{agent:'courier_a',kind:'take',stock:'bakery_bread',quantity:2}]);
    e=waitUntilIdle(stepEpisode(e,[{agent:'courier_a',kind:'move',to:'square'}]));e=waitUntilIdle(stepEpisode(e,[{agent:'courier_a',kind:'move',to:'school'}]));
    e=stepEpisode(e,[{agent:'courier_a',kind:'deliver',stock:'breakfast_delivery',quantity:2}]);
    expect(e.state.progress.breakfast_a).toBe(2);expect(e.state.progress.second_delivery).toBe(0);expect(e.records.at(-1)!.rewards.courier_a).toBe(1);
    expect(()=>stepEpisode(e,[{agent:'courier_a',kind:'complete',reward:100}])).toThrow();
  });
  it('keeps observations private and detached, rejects duplicate ownership, and truncates unsuccessful runs',()=>{
    let e=createEpisode(scenario());const o=observeAgent(e,'courier_a');expect(o).not.toHaveProperty('agents');expect(o.objectives.every(g=>g.agent==='courier_a')).toBe(true);expect(o.localStocks.every(s=>s.at==='bakery')).toBe(true);
    o.self.credits=999;expect(e.state.agents[0]!.credits).toBe(16);
    expect(()=>stepEpisode(e,[{agent:'courier_a',kind:'wait'},{agent:'courier_a',kind:'wait'}])).toThrow('unique');
    expect(()=>stepEpisode(e,[{agent:'unknown',kind:'wait'}])).toThrow('existing');
    const s=scenario();s.maxSteps=1;e=stepEpisode(createEpisode(s),[]);expect(e.state.truncated).toBe(true);expect(e.state.terminated).toBe(false);expect(()=>stepEpisode(e,[])).toThrow('ended');
    const tight=scenario();tight.agents.forEach(a=>a.capacity=1);expect(run(tight).state.terminated).toBe(true);
  });
  it('finishes exact one-step travel and service jobs, with success taking precedence on the final allowed step',()=>{
    const s=compileDreamWorld(classroom).scenarios[0]!;s.links[0]!.steps=1;s.services[0]!.duration=1;s.maxSteps=3;
    const e=run(s);expect(e.state.step).toBe(3);expect(e.state.terminated).toBe(true);expect(e.state.truncated).toBe(false);
  });
  it('requires service work for production even when its output is also for sale',()=>{
    const s=compileDreamWorld(classroom).scenarios[0]!;s.stocks.push({id:'purchased_session',at:'library',item:'session',mode:'source',quantity:3,price:0});
    const e=run(s);expect(e.state.terminated).toBe(true);expect(e.state.stocks.purchased_session).toBe(3);expect(e.records.some(r=>r.outcomes.some(o=>o.kind==='completed'))).toBe(true);
  });
  it('treats prototype-named resource IDs as numeric inventory, including after detached state copies',()=>{
    const s=compileDreamWorld(source.replaceAll('item bread(', 'item constructor(').replaceAll('item=bread','item=constructor')).scenarios[0]!;
    const e=run(s);expect(e.state.terminated).toBe(true);expect(e.state.agents.map(a=>Object.entries(a.inventory).find(([id])=>id==='constructor')?.[1])).toEqual([0,0]);expect(episodeMetrics(e).creditsSpent).toBe(16);
  });
});

describe('prompt and recording boundaries',()=>{
  it('extracts bounded mock parameters, exposes assumptions, and never claims arbitrary semantic interpretation',async()=>{
    const result=await proposeDream({prompt:DEFAULT_PROMPT,signal:new AbortController().signal});expect(result.provider).toBe('mock');expect(result.world.scenarios[0]!.agents).toHaveLength(2);expect(result.assumptions.join(' ')).toContain('logical task network');
    const changed=await mockInterpreter({prompt:'Town with three agents, budget 9, carrying capacity 1, deadline 99. Seed 11.',signal:new AbortController().signal});
    expect(compileDreamWorld(changed.source).scenarios[0]).toMatchObject({seed:11,maxSteps:99,agents:[{budget:9,capacity:1},{budget:9,capacity:1},{budget:9,capacity:1}]});
    await expect(proposeDream({prompt:'simulate molecular biology',signal:new AbortController().signal})).rejects.toThrow('template only');
    await expect(proposeDream({prompt:'town with 9 agents',signal:new AbortController().signal})).rejects.toThrow('bounds');
  });
  it('rejects invalid provider source and late cancelled proposals before acceptance',async()=>{
    const controller=new AbortController();
    await expect(proposeDream({prompt:'town',signal:controller.signal},async()=>({source:'eval(attack)',provider:'mock',assumptions:[]}))).rejects.toThrow();
    let finish!:(value:Awaited<ReturnType<typeof mockInterpreter>>)=>void;
    const pending=proposeDream({prompt:'town',signal:controller.signal},()=>new Promise(resolve=>finish=resolve));controller.abort();finish({source,provider:'mock',assumptions:[]});await expect(pending).rejects.toThrow();
  });
  it('exports observations/actions/results and replays the pinned source; tampered actions, scores and fingerprints fail',async()=>{
    const e=run(),manifest=await recordingManifest(source),text=exportEpisode(manifest,e);
    expect((await replayEpisode(text)).episode).toEqual(e);
    expect(text.split('\n').filter(Boolean)).toHaveLength(e.state.step+1);
    await expect(replayEpisode(text.replace('"sourceHash":"','"sourceHash":"bad'))).rejects.toThrow('fingerprint');
    const rows=text.trim().split('\n'),row=JSON.parse(rows[1]!);row.rewards.courier_a=999;rows[1]=JSON.stringify(row);
    await expect(replayEpisode(rows.join('\n'))).rejects.toThrow('divergence');
  });
});
