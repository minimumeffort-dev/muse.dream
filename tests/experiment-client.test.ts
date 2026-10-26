import {it,expect,vi,afterEach} from 'vitest';
import {ExperimentClient} from '../src/experiment-client';
import type {SavedExperiment} from '../src/experiment-types';
const experiment={id:'saved',revision:1} as SavedExperiment;
afterEach(()=>vi.unstubAllGlobals());
it('retries an ambiguously created run with the same identity and creates a fresh identity after acknowledgement',async()=>{
  const transport=vi.fn().mockRejectedValueOnce(Error('Connection lost')).mockResolvedValue(new Response(JSON.stringify({id:'run'})));
  vi.stubGlobal('fetch',transport);const client=new ExperimentClient('private');
  await expect(client.start(experiment)).rejects.toThrow('Connection lost');
  await client.start(experiment);
  const first=JSON.parse(transport.mock.calls[0]![1].body),retry=JSON.parse(transport.mock.calls[1]![1].body);expect(retry).toEqual(first);
  transport.mockResolvedValue(new Response(JSON.stringify({id:'next'})));await client.start(experiment);
  expect(JSON.parse(transport.mock.calls[2]![1].body).requestId).not.toBe(first.requestId);
  expect(transport.mock.calls[0]![1].headers.Authorization).toBe('Bearer private');
});
it('keeps revision identities distinct and propagates explicit failures',async()=>{
  const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'Revision changed'}),{status:409}));vi.stubGlobal('fetch',transport);
  const client=new ExperimentClient('private');await expect(client.start(experiment)).rejects.toMatchObject({status:409,message:'Revision changed'});
  transport.mockResolvedValue(new Response(JSON.stringify({id:'new'})));await client.start({...experiment,revision:2});
  expect(JSON.parse(transport.mock.calls[1]![1].body).revision).toBe(2);
});
it('saves edits with an optimistic revision and pins report requests to a run',async()=>{
  const transport=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',transport);const client=new ExperimentClient('private');
  const config={name:'Delivery',input:{mode:'source' as const,source:'dream 2;'},controllers:[{actor:'a',kind:'baseline' as const}]};
  await client.save(config,experiment);expect(transport.mock.calls[0]![0]).toBe('/api/experiments/saved');expect(transport.mock.calls[0]![1].method).toBe('PUT');expect(JSON.parse(transport.mock.calls[0]![1].body).expectedRevision).toBe(1);
  transport.mockResolvedValue(new Response('{}'));await client.report('run-one');expect(transport.mock.calls[1]![0]).toBe('/api/runs/run-one/report');
});
