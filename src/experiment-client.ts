import type {ExperimentConfig,SavedExperiment,RunSummary,SavedRunReport} from './experiment-types';
export class ExperimentClient {
  private readonly pendingStarts=new Map<string,string>();
  constructor(readonly token:string){}
  async request<T>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
    const response=await fetch('/api'+path,{method,cache:'no-store',signal,headers:{Authorization:'Bearer '+this.token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const data=await response.json();
    if(!response.ok)throw Object.assign(Error(data.error??'Experiment request failed.'),{status:response.status});
    return data as T;
  }
  experiments(signal?:AbortSignal){return this.request<{experiments:SavedExperiment[]}>('/experiments','GET',undefined,signal);}
  save(config:ExperimentConfig,previous?:SavedExperiment){return previous?this.request<SavedExperiment>('/experiments/'+encodeURIComponent(previous.id),'PUT',{...config,expectedRevision:previous.revision}):this.request<SavedExperiment>('/experiments','POST',config);}
  async start(experiment:SavedExperiment){
    const key=experiment.id+':'+experiment.revision,requestId=this.pendingStarts.get(key)??crypto.randomUUID();this.pendingStarts.set(key,requestId);
    try{const run=await this.request<RunSummary>('/experiments/'+encodeURIComponent(experiment.id)+'/runs','POST',{revision:experiment.revision,requestId});this.pendingStarts.delete(key);return run;}
    catch(error){const status=(error as {status?:number}).status;if(status&&status>=400&&status<500)this.pendingStarts.delete(key);throw error;}
  }
  runs(experimentId:string,signal?:AbortSignal){return this.request<{runs:RunSummary[]}>('/runs?experimentId='+encodeURIComponent(experimentId),'GET',undefined,signal);}
  report(runId:string,signal?:AbortSignal){return this.request<SavedRunReport>('/runs/'+encodeURIComponent(runId)+'/report','GET',undefined,signal);}
  resume(runId:string){return this.request<RunSummary>('/runs/'+encodeURIComponent(runId)+'/resume','POST',{});}
}
