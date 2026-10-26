import {afterEach,it,expect,vi} from 'vitest';
import {HostView} from '../src/host-view';
import {ExperimentRun} from '../src/runner';
import {buildFromBrief,DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS} from '../src/framework';
const source=()=>buildFromBrief(DEFAULT_WORLD,DEFAULT_TASK,DEFAULT_PARAMETERS).source;
afterEach(()=>vi.unstubAllGlobals());
it('validates incremental host transitions without driving the host and preserves prior replay states',async()=>{
  const server=await ExperimentRun.create(source(),'mock-agent-protocol-1');server.advance();server.advance();
  const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify({version:'dream-host-1',runId:'run',status:'waiting',from:-1,manifest:server.manifest,records:server.records,controllers:[],latency:{decisions:2,totalMs:10,maxMs:5}})));
  vi.stubGlobal('fetch',transport);
  const reader=new HostView('private-token'),run=await reader.poll();
  expect(run.at(2)).toEqual(server.at(2));expect(run.length).toBe(2);const first=structuredClone(run.at(1));
  expect(transport.mock.calls[0]![1].headers.Authorization).toBe('Bearer private-token');
  server.advance();transport.mockResolvedValue(new Response(JSON.stringify({version:'dream-host-1',runId:'run',status:'waiting',from:2,manifest:server.manifest,records:server.records.slice(2),controllers:[],latency:{decisions:3,totalMs:15,maxMs:5}})));
  expect(await reader.poll()).toBe(run);expect(run.length).toBe(3);expect(run.at(1)).toEqual(first);expect(transport.mock.calls[1]![0]).toBe('/api/view?after=2');
});
it('rejects tampered evidence and a changed run without replacing the accepted run',async()=>{
  const server=await ExperimentRun.create(source());server.advance();
  const data={version:'dream-host-1',runId:'run',status:'waiting',from:-1,manifest:server.manifest,records:server.records,controllers:[],latency:{decisions:1,totalMs:0,maxMs:0}};
  const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify(data)));vi.stubGlobal('fetch',transport);
  const reader=new HostView('token'),accepted=await reader.poll();
  server.advance();const bad=structuredClone(server.records[1]!);bad.rewards.courier_a=999;
  transport.mockResolvedValue(new Response(JSON.stringify({...data,from:1,records:[bad]})));
  await expect(reader.poll()).rejects.toThrow('diverged');expect(reader.run).toBe(accepted);expect(accepted.length).toBe(1);
  transport.mockResolvedValue(new Response(JSON.stringify({...data,from:1,runId:'another',records:[]})));
  await expect(reader.poll()).rejects.toThrow('changed runs');expect(reader.run).toBe(accepted);
});
it('reports an invalid credential instead of switching to the browser mock',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:401})));
  const reader=new HostView('expired');await expect(reader.poll()).rejects.toMatchObject({status:401});expect(reader.run).toBeUndefined();
});
