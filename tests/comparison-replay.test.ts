import {afterEach,it,expect,vi} from 'vitest';
import {ComparisonReplay} from '../src/comparison-replay';
import {ExperimentRun} from '../src/runner';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS} from '../src/framework';
import type {RunSummary} from '../src/experiment-types';

afterEach(()=>vi.unstubAllGlobals());
async function createRun(budget:number,steps=1000){
  const source=buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,{...DEFAULT_PARAMETERS,budget}).source;
  const run=await ExperimentRun.create(source);while(run.length<steps&&run.advance()){}return run;
}
function summary(id:string,run:ExperimentRun):RunSummary{
  return {id,experimentId:'delivery',revision:1,name:'Delivery',sourceHash:run.manifest.sourceHash,seed:run.scenario.seed,
    config:{name:'Delivery',input:{mode:'source',source:run.manifest.source},controllers:[]},status:run.ended?'completed':'waiting',
    steps:run.length,metrics:run.metrics(),createdAt:'',updatedAt:''};
}
function payload(id:string,run:ExperimentRun,after:number){
  return {version:'dream-host-1',runId:id,status:run.ended?'completed':'waiting',from:after,manifest:run.manifest,
    records:run.records.slice(Math.max(0,after)),controllers:[],latency:{decisions:0,totalMs:0,maxMs:0},run:summary(id,run)};
}
function host(runs:Record<string,ExperimentRun>){
  return vi.fn(async(input:string|URL|Request)=>{
    const url=new URL(String(input),'http://127.0.0.1'),id=decodeURIComponent(url.pathname.split('/')[3]!),after=Number(url.searchParams.get('after'));
    return new Response(JSON.stringify(payload(id,runs[id]!,after)));
  });
}

it('reads both validated recordings at the same divergent step without advancing either mock',async()=>{
  const rich=await createRun(16),limited=await createRun(4),transport=host({rich,limited});vi.stubGlobal('fetch',transport);
  const reader=new ComparisonReplay('private-token'),[left,right]=await Promise.all([reader.at(summary('rich',rich),20),reader.at(summary('limited',limited),20)]);
  expect(left?.step).toBe(20);expect(right?.step).toBe(20);
  expect(left!.run.at(20)).toEqual(rich.at(20));expect(right!.run.at(20)).toEqual(limited.at(20));
  expect(left!.run.records[19]).toEqual(rich.records[19]);expect(right!.run.records[19]).toEqual(limited.records[19]);
  expect(left!.run.records[19]!.outcomes.some(outcome=>outcome.reason==='service_full')).toBe(true);
  expect(left!.run.metrics(20).creditsSpent).toBe(15);expect(right!.run.metrics(20).creditsSpent).toBe(8);
  expect((await reader.at(summary('rich',rich),0))!.run.at(0)).toEqual(rich.at(0));
  expect((await reader.at(summary('limited',limited),0))!.run.at(0)).toEqual(limited.at(0));
  expect(await reader.at(summary('rich',rich),28)).toBeUndefined();
  expect(rich.length).toBe(27);expect(limited.length).toBe(80);expect(transport).toHaveBeenCalledTimes(2);
  expect(transport.mock.calls.every(call=>(call[1] as RequestInit).headers&&((call[1] as RequestInit).headers as Record<string,string>).Authorization==='Bearer private-token')).toBe(true);
});

it('catches up a live recording incrementally and retains earlier replay states',async()=>{
  const live=await createRun(4,3),transport=host({live});vi.stubGlobal('fetch',transport);
  const reader=new ComparisonReplay('token'),first=await reader.at(summary('live',live),1),old=structuredClone(first!.run.at(1));
  live.advance();live.advance();const next=await reader.at(summary('live',live),5);
  expect(next!.run.at(5)).toEqual(live.at(5));expect(next!.run.at(1)).toEqual(old);expect(next!.step).toBe(5);
  expect(String(transport.mock.calls[0]![0])).toContain('after=-1');expect(String(transport.mock.calls[1]![0])).toContain('after=3');
  expect(await reader.at(summary('live',live),6)).toBeUndefined();expect(transport).toHaveBeenCalledTimes(2);
  await expect(reader.at(summary('live',live),-1)).rejects.toThrow();await expect(reader.at(summary('live',live),1.5)).rejects.toThrow();
});

it('rejects a different run, source, seed or tampered transition and can retry after a rejected response',async()=>{
  const server=await createRun(16,2),requested=summary('run',server),reader=new ComparisonReplay('token');
  const data=payload('run',server,-1),transport=vi.fn();vi.stubGlobal('fetch',transport);
  transport.mockResolvedValueOnce(new Response(JSON.stringify({...data,runId:'other'})));
  await expect(reader.at(requested,1)).rejects.toThrow();
  transport.mockResolvedValueOnce(new Response(JSON.stringify(data)));
  await expect(reader.at({...requested,sourceHash:'wrong'},1)).rejects.toThrow();
  transport.mockResolvedValueOnce(new Response(JSON.stringify(data)));
  await expect(reader.at({...requested,seed:requested.seed+1},1)).rejects.toThrow();
  const corrupt=structuredClone(data);corrupt.records[0]!.rewards.courier_a=999;
  transport.mockResolvedValueOnce(new Response(JSON.stringify(corrupt)));
  await expect(reader.at(requested,1)).rejects.toThrow(/diverged/i);
  transport.mockResolvedValueOnce(new Response(JSON.stringify(data)));
  expect((await reader.at(requested,1))!.run.at(1)).toEqual(server.at(1));
});

it('coalesces overlapping requests for one run without appending any transition twice',async()=>{
  const server=await createRun(16,5),data=payload('run',server,-1);let resolve!:(response:Response)=>void;
  const transport=vi.fn(()=>new Promise<Response>(done=>{resolve=done;}));vi.stubGlobal('fetch',transport);
  const reader=new ComparisonReplay('token'),pin=summary('run',server),first=reader.at(pin,2),second=reader.at(pin,5);
  expect(transport).toHaveBeenCalledTimes(1);resolve(new Response(JSON.stringify(data)));
  const [left,right]=await Promise.all([first,second]);expect(left!.step).toBe(2);expect(right!.step).toBe(5);
  expect(left!.run).toBe(right!.run);expect(right!.run.length).toBe(5);expect(right!.run.at(5)).toEqual(server.at(5));
});

it('returns an unavailable step without spinning when a live host has not caught up, then retries later',async()=>{
  const live=await createRun(4,3),transport=host({live});vi.stubGlobal('fetch',transport);
  const reader=new ComparisonReplay('token'),ahead={...summary('live',live),steps:4};
  expect(await reader.at(ahead,4)).toBeUndefined();expect(transport).toHaveBeenCalledTimes(2);
  live.advance();const caughtUp=await reader.at(summary('live',live),4);
  expect(caughtUp!.run.at(4)).toEqual(live.at(4));expect(transport).toHaveBeenCalledTimes(3);
});

it('discards a delayed response after clearing the comparison, even if transport ignores abort',async()=>{
  const server=await createRun(16,2),data=payload('run',server,-1);let resolve!:(response:Response)=>void;
  const transport=vi.fn().mockImplementationOnce(()=>new Promise<Response>(done=>{resolve=done;})).mockResolvedValue(new Response(JSON.stringify(data)));vi.stubGlobal('fetch',transport);
  const reader=new ComparisonReplay('token'),pin=summary('run',server),old=reader.at(pin,1);
  reader.clear();resolve(new Response(JSON.stringify(data)));await expect(old).rejects.toMatchObject({name:'AbortError'});
  expect((await reader.at(pin,1))!.run.at(1)).toEqual(server.at(1));expect(transport).toHaveBeenCalledTimes(2);
});
