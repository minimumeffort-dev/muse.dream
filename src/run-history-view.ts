import type {ExperimentRun} from './runner';
import {RunHistory,HISTORY_PLOT,historyPosition,historyLine,type HistoryMetric} from './run-history';
import {agentStepKind} from './report';
import {humanName,reasonCopy} from './workspace-copy';
const node=(tag:string,className:string,text='')=>{const element=document.createElement(tag);element.className=className;element.textContent=text;return element;};
const svgNode=(tag:string,attributes:Record<string,string>)=>{const element=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);return element;};
const tick=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});

export function createRunHistoryView(run:ExperimentRun,onSeek:(step:number)=>void){
  const history=new RunHistory(run),element=node('section','history-view');element.tabIndex=0;element.setAttribute('role','group');element.setAttribute('aria-label','Run history charts');
  element.setAttribute('aria-description','Arrow keys inspect steps without pausing. Home and End inspect the first and latest step. Enter replays the selected step. Escape returns to the playback cursor.');
  const heading=node('div','row spread history-heading'),selection=node('span','small muted history-selection');heading.append(node('h3','','Over time'),selection);
  const plots=node('div','history-charts'),context=node('p','small muted history-context'),hint=node('p','small muted history-hint','Point to inspect · Select to replay'),announcement=node('span','sr-only');announcement.setAttribute('role','status');
  element.append(heading,plots,context,hint,announcement);
  let cursor=0,inspected:number|undefined,input:'pointer'|'keyboard'|undefined,lastLength=-1;
  const metrics:[HistoryMetric,string][]=[['completed','Tasks completed'],['spent','Coins spent'],['waiting','Waiting (agent steps)']];
  const figures=metrics.map(([key,title])=>{
    const figure=node('figure','history-chart '+key),caption=node('figcaption','chart-label'),value=node('output','chart-value');value.setAttribute('aria-live','off');caption.append(node('span','',title),value);
    const plot=HISTORY_PLOT,svg=svgNode('svg',{viewBox:`0 0 ${plot.width} ${plot.height}`,preserveAspectRatio:'none',role:'img','aria-label':title+' over simulation steps'});
    const axes=svgNode('path',{d:`M${plot.left} ${plot.top}H${plot.right}M${plot.left} ${plot.bottom}H${plot.right}`,class:'history-axes'});
    const line=svgNode('path',{class:'history-line',fill:'none','vector-effect':'non-scaling-stroke'}),crosshair=svgNode('line',{class:'history-cursor',y1:String(plot.top),y2:String(plot.bottom)}),point=svgNode('circle',{class:'history-point',r:'3'});
    const maximum=svgNode('text',{x:String(plot.left-8),y:String(plot.top+4),'text-anchor':'end',class:'history-axis'}),zero=svgNode('text',{x:String(plot.left-8),y:String(plot.bottom+4),'text-anchor':'end',class:'history-axis'});zero.textContent='0';
    const start=svgNode('text',{x:String(plot.left),y:'134',class:'history-axis'});start.textContent='0';const end=svgNode('text',{x:String(plot.right),y:'134','text-anchor':'end',class:'history-axis'});
    svg.append(axes,maximum,zero,start,end,line,crosshair,point);figure.append(caption,svg);plots.append(figure);
    const stepAt=(event:MouseEvent|PointerEvent)=>Math.max(0,Math.min(run.length,Math.round(((event.clientX-svg.getBoundingClientRect().left)/svg.getBoundingClientRect().width*plot.width-plot.left)/(plot.right-plot.left)*run.length)));
    svg.onpointermove=event=>{inspected=stepAt(event);input='pointer';showPoint();};
    svg.onpointerleave=()=>{if(input==='pointer'){inspected=undefined;input=undefined;showPoint();}};
    svg.onclick=event=>{inspected=stepAt(event);input='keyboard';element.focus({preventScroll:true});onSeek(inspected);showPoint();};
    return {key,value,line,crosshair,point,maximum,end,scale:1};
  });
  function showPoint(){
    const point=history.points[Math.min(run.length,inspected??cursor)]!;
    selection.textContent=`Step ${point.step} of ${run.length}`;
    for(const figure of figures){
      figure.value.textContent=figure.key==='completed'?`${point.completed}/${run.scenario.objectives.length}`:point[figure.key].toLocaleString();
      const position=historyPosition(point,figure.key,run.length,figure.scale);
      figure.crosshair.setAttribute('x1',String(position.x));figure.crosshair.setAttribute('x2',String(position.x));figure.point.setAttribute('cx',String(position.x));figure.point.setAttribute('cy',String(position.y));
    }
    const record=run.records[point.step-1],event=record?.outcomes.find(outcome=>outcome.status!=='accepted');
    const waiting=record?run.scenario.agents.filter(agent=>agentStepKind(record,agent.id)==='idle').length:0;
    context.textContent=event?`${humanName(event.agent)}: ${reasonCopy(event.reason).toLowerCase()}`:waiting?`${waiting} ${waiting===1?'agent':'agents'} waiting`:'';
    return point;
  }
  element.onkeydown=event=>{
    const current=inspected??cursor;
    if(event.key==='ArrowLeft'||event.key==='ArrowDown')inspected=Math.max(0,current-1);
    else if(event.key==='ArrowRight'||event.key==='ArrowUp')inspected=Math.min(run.length,current+1);
    else if(event.key==='Home')inspected=0;
    else if(event.key==='End')inspected=run.length;
    else if(event.key==='Escape')inspected=undefined;
    else if(event.key==='Enter'){event.preventDefault();onSeek(current);return;}
    else return;
    event.preventDefault();input='keyboard';const point=showPoint();announcement.textContent=`Step ${point.step}: ${point.completed} of ${run.scenario.objectives.length} tasks, ${point.spent} coins spent, ${point.waiting} waiting agent steps.`;
  };
  element.onblur=()=>{inspected=undefined;input=undefined;showPoint();};
  return {element,history,update(playbackCursor:number){
    cursor=playbackCursor;const points=history.update();
    if(lastLength!==run.length){
      lastLength=run.length;
      for(const figure of figures){
        figure.scale=Math.max(1,figure.key==='completed'?run.scenario.objectives.length:Math.max(...points.map(point=>point[figure.key])));
        figure.line.setAttribute('d',historyLine(points,figure.key,figure.scale));figure.maximum.textContent=tick.format(figure.scale);figure.end.textContent=String(run.length);
      }
    }
    showPoint();
  }};
}
