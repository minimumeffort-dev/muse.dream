import {z} from 'zod';
import {ExperimentRun} from './runner';
import {actionSchema,type AgentAction,type Observation} from './engine/sim/episode';

export const AGENT_PROTOCOL_VERSION='dream-agent-1' as const;
const token=z.string().min(1).max(256);
const submissionSchema=z.object({version:z.literal(AGENT_PROTOCOL_VERSION),runId:token,actorId:z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),step:z.number().int().min(0).max(1000),requestId:token,epoch:z.number().int().nonnegative().safe(),action:actionSchema}).strict();
export type AgentSubmission=z.infer<typeof submissionSchema>;
export interface AgentDecision {version:typeof AGENT_PROTOCOL_VERSION;runId:string;actorId:string;step:number;requestId:string;epoch:number;observation:Observation}
export interface AgentAcknowledgement {requestId:string;step:number;committedStep:number|null}
export type AgentRuntimeStatus='waiting'|'paused'|'completed'|'deadline';
export type AgentRuntimeErrorCode='INVALID_REQUEST'|'UNKNOWN_ACTOR'|'NOT_OWNER'|'CONFLICT'|'PAUSED'|'RUN_ENDED';
export class AgentRuntimeError extends Error {
  constructor(readonly code:AgentRuntimeErrorCode,message:string,readonly status:number){super(message);this.name='AgentRuntimeError';}
}
export interface AgentRuntimeOptions {externalActor?:string;timeoutMs?:number;now?:()=>number;id?:()=>string}
type Controller={owner:string;epoch:number};
type Pending={decision:AgentDecision;expires:number};
type Receipt={signature:string;ack:AgentAcknowledgement};

/** Coordinates private requests; only the episode engine commits gameplay outcomes. */
export class AgentRuntime {
  private readonly controllers=new Map<string,Controller>();
  private readonly pending=new Map<string,Pending>();
  private readonly queued=new Map<string,AgentAction>();
  private readonly receipts=new Map<string,Receipt>();
  private paused=false;
  private sequence=0;
  private constructor(readonly run:ExperimentRun,readonly id:string,private readonly timeoutMs:number,private readonly now:()=>number,externalActor?:string){
    for(const actor of run.scenario.agents)this.controllers.set(actor.id,{owner:actor.id===externalActor?'external':'baseline',epoch:0});
  }
  static async create(source:string,options:AgentRuntimeOptions={}){
    const timeoutMs=options.timeoutMs??30000;
    if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new AgentRuntimeError('INVALID_REQUEST','Timeout must be a positive finite number.',400);
    const id=options.id?.()??crypto.randomUUID();
    if(!token.safeParse(id).success)throw new AgentRuntimeError('INVALID_REQUEST','Run ID must contain 1–256 characters.',400);
    const run=await ExperimentRun.create(source,'mock-agent-protocol-1');
    if(options.externalActor!==undefined&&!run.scenario.agents.some(a=>a.id===options.externalActor))throw new AgentRuntimeError('UNKNOWN_ACTOR','Unknown external actor.',404);
    return new AgentRuntime(run,id,timeoutMs,options.now??Date.now,options.externalActor);
  }
  get actors(){return [...this.controllers.keys()];}
  owner(actor:string){return this.controller(actor).owner;}
  get status():AgentRuntimeStatus{
    if(this.run.ended)return this.run.at(this.run.length).terminated?'completed':'deadline';
    if(!this.paused&&[...this.pending].some(([actor,request])=>!this.queued.has(actor)&&this.now()>=request.expires)){
      this.paused=true;this.invalidate();
    }
    return this.paused?'paused':'waiting';
  }
  decision(actor:string,owner:string):AgentDecision{
    const controller=this.authorize(actor,owner);this.requireWaiting();
    let request=this.pending.get(actor);
    if(!request){
      request={decision:{version:AGENT_PROTOCOL_VERSION,runId:this.id,actorId:actor,step:this.run.length,requestId:`${this.id.slice(0,220)}:${++this.sequence}`,epoch:controller.epoch,observation:this.run.observe(actor)},expires:this.now()+this.timeoutMs};
      this.pending.set(actor,request);
    }
    return structuredClone(request.decision);
  }
  submit(owner:string,input:unknown):AgentAcknowledgement{
    const parsed=submissionSchema.safeParse(input);
    if(!parsed.success)throw new AgentRuntimeError('INVALID_REQUEST','Invalid agent submission.',400);
    const submission=parsed.data,controller=this.authorize(submission.actorId,owner);
    // Expiration invalidates the barrier before a late response can commit it.
    const status=this.status;
    if(submission.runId!==this.id||submission.epoch!==controller.epoch||submission.action.agent!==submission.actorId)throw new AgentRuntimeError('CONFLICT','Submission does not match the current controller or run.',409);
    const signature=JSON.stringify(submission),receipt=this.receipts.get(submission.requestId);
    if(receipt){
      if(receipt.signature!==signature)throw new AgentRuntimeError('CONFLICT','Request already has a different action.',409);
      return structuredClone(receipt.ack);
    }
    this.requireWaiting(status);
    const request=this.pending.get(submission.actorId)?.decision;
    if(!request||submission.step!==this.run.length||submission.requestId!==request.requestId)throw new AgentRuntimeError('CONFLICT','Submission is stale or has no matching decision.',409);
    this.queued.set(submission.actorId,submission.action);
    let committedStep:number|null=null;
    if(this.queued.size===this.controllers.size){
      this.run.commit(this.actors.map(actor=>this.queued.get(actor)!));
      committedStep=this.run.length;this.pending.clear();this.queued.clear();
    }
    const ack={requestId:submission.requestId,step:submission.step,committedStep};
    this.receipts.set(submission.requestId,{signature,ack});
    if(this.receipts.size>8000)this.receipts.delete(this.receipts.keys().next().value!);
    return structuredClone(ack);
  }
  resume(){
    if(this.status==='paused')this.paused=false;
  }
  handoff(actor:string,newOwner:string){
    const controller=this.controller(actor);
    if(typeof newOwner!=='string'||!newOwner.trim()||newOwner.length>128)throw new AgentRuntimeError('INVALID_REQUEST','Controller owner must contain 1–128 characters.',400);
    const status=this.status;if(status==='completed'||status==='deadline')throw new AgentRuntimeError('RUN_ENDED','Run has ended.',409);
    controller.owner=newOwner;controller.epoch++;this.pending.delete(actor);this.queued.delete(actor);
  }
  private controller(actor:string){
    const controller=this.controllers.get(actor);
    if(!controller)throw new AgentRuntimeError('UNKNOWN_ACTOR','Unknown actor.',404);
    return controller;
  }
  private authorize(actor:string,owner:string){
    const controller=this.controller(actor);
    if(controller.owner!==owner)throw new AgentRuntimeError('NOT_OWNER','Controller does not own this actor.',403);
    return controller;
  }
  private requireWaiting(status=this.status){
    if(status==='paused')throw new AgentRuntimeError('PAUSED','Controller timed out. Resume the run before requesting another decision.',409);
    if(status!=='waiting')throw new AgentRuntimeError('RUN_ENDED','Run has ended.',409);
  }
  private invalidate(){
    this.pending.clear();this.queued.clear();for(const controller of this.controllers.values())controller.epoch++;
  }
}
