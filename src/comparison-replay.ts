import {HostView} from './host-view';
import type {RunSummary} from './experiment-types';
import type {ExperimentRun} from './runner';

type Reader={view:HostView;sourceHash:string;seed:number;pending?:Promise<ExperimentRun>;abort?:AbortController};

/** Read committed, verified prefixes without advancing either run. */
export class ComparisonReplay {
  private readonly readers=new Map<string,Reader>();
  constructor(private readonly token:string){}

  clear(){for(const reader of this.readers.values())reader.abort?.abort();this.readers.clear();}

  async at(summary:RunSummary,step:number):Promise<{run:ExperimentRun;step:number}|undefined>{
    if(!Number.isSafeInteger(step)||step<0||!Number.isSafeInteger(summary.steps)||summary.steps<0)throw Error('Invalid comparison step.');
    let reader=this.readers.get(summary.id);
    if(reader&&(reader.sourceHash!==summary.sourceHash||reader.seed!==summary.seed)){
      reader.abort?.abort();this.readers.delete(summary.id);throw Error('Comparison run source or seed changed.');
    }
    if(step>summary.steps)return undefined;
    if(!reader){reader={view:new HostView(this.token,'/api/runs/'+encodeURIComponent(summary.id)),sourceHash:summary.sourceHash,seed:summary.seed};this.readers.set(summary.id,reader);}
    const current=reader;
    let lastLength=-2;
    while(true){
      const run=current.view.run;
      if(run&&step<=run.length)return {run,step};
      const length=run?.length??-1;if(length===lastLength)return undefined;lastLength=length;
      if(!current.pending){
        const abort=new AbortController();current.abort=abort;
        current.pending=(async()=>{
          try{
            const accepted=await current.view.poll(abort.signal),reported=current.view.summary;
            if(this.readers.get(summary.id)!==current)throw new DOMException('Comparison closed.','AbortError');
            if(current.view.runId!==summary.id||accepted.manifest.sourceHash!==current.sourceHash||accepted.manifest.seed!==current.seed||accepted.scenario.seed!==current.seed||reported&&(reported.id!==summary.id||reported.sourceHash!==current.sourceHash||reported.seed!==current.seed))throw Error('Comparison run identity, source or seed does not match.');
            return accepted;
          }catch(error){
            if(this.readers.get(summary.id)===current)this.readers.delete(summary.id);
            throw error;
          }finally{current.pending=undefined;current.abort=undefined;}
        })();
      }
      await current.pending;
      if(this.readers.get(summary.id)!==current)throw new DOMException('Comparison closed.','AbortError');
    }
  }
}
