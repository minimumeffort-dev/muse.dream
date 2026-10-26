import {ExperimentRun} from './runner';
import type {Transition} from './engine/sim/episode';
import type {RunSummary} from './experiment-types';

/** The viewer checks host transitions through the same rules; it never submits decisions. */
export class HostView {
  constructor(private readonly token:string,private readonly basePath='/api'){}
  run:ExperimentRun|undefined;
  runId='';
  status='waiting';
  controllers:{actor:string;owner:string}[]=[];
  latency={decisions:0,totalMs:0,maxMs:0};
  summary:RunSummary|undefined;
  async poll(signal?:AbortSignal){
    const after=this.run?.length??-1,response=await fetch(this.basePath+'/view?after='+after,{cache:'no-store',signal,headers:{Authorization:'Bearer '+this.token}});
    if(!response.ok)throw Object.assign(Error(response.status===401?'Host token rejected. Enter the current connection token.':'Agent host unavailable. Reconnect to the local host.'),{status:response.status});
    const data=await response.json();
    if(data.version!=='dream-host-1'||typeof data.runId!=='string'||!['waiting','paused','completed','deadline'].includes(data.status)||!Array.isArray(data.records)||data.records.length>1000||data.from!==after)throw Error('Invalid host observation.');
    let run=this.run;
    if(!run){
      run=await ExperimentRun.create(data.manifest.source,data.manifest.policy);
      if(JSON.stringify(run.manifest)!==JSON.stringify(data.manifest))throw Error('Host source fingerprint mismatch.');
    }else if(data.runId!==this.runId||JSON.stringify(data.manifest)!==JSON.stringify(run.manifest))throw Error('The agent host changed runs. Reload to connect to it.');
    for(const record of data.records as Transition[])run.appendRecorded(record);
    this.run=run;this.runId=data.runId;this.status=data.status;
    this.controllers=data.controllers;this.latency=data.latency;
    this.summary=data.run;
    return run;
  }
}
