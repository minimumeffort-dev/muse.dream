import type {ExperimentRun} from './runner';
import {agentStepKind} from './report';
import type {SavedRunReport} from './experiment-types';

export interface HistoryPoint {readonly step:number;readonly completed:number;readonly spent:number;readonly waiting:number}
export type HistoryMetric='completed'|'spent'|'waiting';

/** Append measurements from accepted transitions; revisiting a step never reruns policies. */
export class RunHistory {
  private readonly samples:HistoryPoint[];
  constructor(readonly run:ExperimentRun){const metrics=run.metrics(0);this.samples=[{step:0,completed:metrics.completed,spent:metrics.creditsSpent,waiting:0}];}
  get points():readonly HistoryPoint[]{return this.samples;}
  update(){
    for(let step=this.samples.length;step<=this.run.length;step++){
      const record=this.run.records[step-1]!,metrics=this.run.metrics(step);
      const waits=this.run.scenario.agents.filter(agent=>agentStepKind(record,agent.id)==='idle').length;
      this.samples.push({step,completed:metrics.completed,spent:metrics.creditsSpent,waiting:this.samples.at(-1)!.waiting+waits});
    }
    return this.points;
  }
}

export const HISTORY_PLOT={width:360,height:140,left:40,right:352,top:16,bottom:112} as const;
export function historyPosition(point:HistoryPoint,key:HistoryMetric,lastStep:number,maximum:number){
  const plot=HISTORY_PLOT;
  return {x:plot.left+(plot.right-plot.left)*point.step/Math.max(1,lastStep),y:plot.bottom-(plot.bottom-plot.top)*point[key]/Math.max(1,maximum)};
}
export function historyLine(points:readonly HistoryPoint[],key:HistoryMetric,maximum:number,lastStep=points.at(-1)?.step??0){
  let path='';
  for(const [index,point] of points.entries()){
    const {x,y}=historyPosition(point,key,lastStep,maximum),coordinates=`${Number(x.toFixed(2))} ${Number(y.toFixed(2))}`;
    path+=index?`H${Number(x.toFixed(2))}V${Number(y.toFixed(2))}`:`M${coordinates}`;
  }
  return path;
}

export function historyPointAt(points:readonly HistoryPoint[]|undefined,step:number){return points?.[step];}

/** Older hosts can omit history; a supplied prefix must agree with its report. */
export function validateReportedHistory(report:SavedRunReport){
  const points=report.history;if(points===undefined)return;
  const invalid=()=>{throw Error('Run history does not match its recorded report. Refresh to try again.');};
  if(!Array.isArray(points)||points.length!==report.metrics.steps+1)invalid();
  for(const [step,point] of points.entries()){
    if(!point||point.step!==step)invalid();
    for(const key of ['completed','spent','waiting'] as const)if(!Number.isFinite(point[key])||point[key]<0||(step>0&&point[key]<points[step-1]![key]))invalid();
    if(!Number.isInteger(point.completed)||point.completed>report.metrics.total||!Number.isInteger(point.waiting)||point.waiting>report.agents.length*step)invalid();
  }
  const head=points.at(-1)!;
  if(!head||head.completed!==report.metrics.completed||head.spent!==report.metrics.creditsSpent||head.waiting!==report.agents.reduce((sum,agent)=>sum+agent.steps.idle,0))invalid();
}
