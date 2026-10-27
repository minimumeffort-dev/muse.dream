import type {SavedRunReport} from './experiment-types';
import {HISTORY_PLOT,historyLine,historyPosition,historyPointAt} from './run-history';
const node=(tag:string,className:string,text='')=>{const element=document.createElement(tag);element.className=className;element.textContent=text;return element;};
const svgNode=(tag:string,attributes:Record<string,string>)=>{const element=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);return element;};
const tick=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});

/** One read-only cursor compares recorded prefixes; selecting a step inspects both. */
export function createComparisonHistoryView(onSelect:(step:number|undefined)=>void){
  const element=node('section','history-view comparison-history');element.tabIndex=0;element.setAttribute('role','group');element.setAttribute('aria-label','Comparison history charts');
  element.setAttribute('aria-description','Arrow keys inspect steps. Home and End inspect first and latest. Enter opens both runs at the selected step. Escape follows latest.');
  const heading=node('div','row spread history-heading'),selection=node('span','small muted history-selection'),latest=document.createElement('button');latest.type='button';latest.className='history-latest';latest.textContent='Latest';latest.hidden=true;
  heading.append(node('h3','','Over time'),selection,latest);
  const legend=node('div','history-legend'),labels=['baseline','candidate'].map(tone=>{const label=node('span',tone);label.append(node('i',''),node('span',''));legend.append(label);return label.lastElementChild!;});
  const plots=node('div','history-charts'),hint=node('p','small muted history-hint','Point to inspect · Select to compare agents'),announcement=node('span','sr-only');announcement.setAttribute('role','status');
  element.append(heading,legend,plots,hint,announcement);
  let reports:readonly SavedRunReport[]=[],lastStep=0,inspected:number|undefined,held:number|undefined,committed=false;
  const figures=([['completed','Tasks completed'],['spent','Coins spent'],['waiting','Waiting (agent steps)']] as const).map(([key,title])=>{
    const figure=node('figure','history-chart '+key),caption=node('figcaption','chart-label'),values=node('div','comparison-values');
    const outputs=['baseline','candidate'].map(tone=>{const output=node('output',tone);output.setAttribute('aria-live','off');values.append(output);return output;});
    const delta=node('span','muted comparison-delta');values.append(delta);caption.append(node('span','',title),values);
    const plot=HISTORY_PLOT,svg=svgNode('svg',{viewBox:`0 0 ${plot.width} ${plot.height}`,preserveAspectRatio:'none',role:'img','aria-label':title+' comparison over simulation steps'});
    const axes=svgNode('path',{d:`M${plot.left} ${plot.top}H${plot.right}M${plot.left} ${plot.bottom}H${plot.right}`,class:'history-axes'}),maximum=svgNode('text',{x:String(plot.left-8),y:String(plot.top+4),'text-anchor':'end',class:'history-axis'}),zero=svgNode('text',{x:String(plot.left-8),y:String(plot.bottom+4),'text-anchor':'end',class:'history-axis'});zero.textContent='0';
    const start=svgNode('text',{x:String(plot.left),y:'134',class:'history-axis'});start.textContent='0';const end=svgNode('text',{x:String(plot.right),y:'134','text-anchor':'end',class:'history-axis'});
    const crosshair=svgNode('line',{class:'history-cursor',y1:String(plot.top),y2:String(plot.bottom)});
    const series=['baseline','candidate'].map(tone=>({line:svgNode('path',{class:'history-line '+tone,fill:'none','vector-effect':'non-scaling-stroke'}),point:svgNode('circle',{class:'history-point '+tone,r:'3'})}));
    svg.append(axes,maximum,zero,start,end,...series.map(s=>s.line),crosshair,...series.map(s=>s.point));figure.append(caption,svg);plots.append(figure);
    const stepAt=(event:MouseEvent|PointerEvent)=>Math.max(0,Math.min(lastStep,Math.round(((event.clientX-svg.getBoundingClientRect().left)/svg.getBoundingClientRect().width*plot.width-plot.left)/(plot.right-plot.left)*lastStep)));
    svg.onpointermove=event=>{inspected=stepAt(event);showPoint();};svg.onpointerleave=()=>{inspected=undefined;showPoint();};
    svg.onclick=event=>{held=stepAt(event);inspected=undefined;committed=true;element.focus({preventScroll:true});showPoint();onSelect(held);};
    return {key,outputs,delta,maximum,end,crosshair,series,scale:1};
  });
  function showPoint(){
    const step=Math.min(lastStep,inspected??held??lastStep);selection.textContent=`Step ${step} of ${lastStep}`;latest.hidden=held===undefined;
    for(const figure of figures){
      const points=reports.map(report=>historyPointAt(report.history,step)),x=historyPosition({step,completed:0,spent:0,waiting:0},figure.key,lastStep,figure.scale).x;
      figure.crosshair.setAttribute('x1',String(x));figure.crosshair.setAttribute('x2',String(x));
      points.forEach((point,index)=>{
        const output=figure.outputs[index]!,report=reports[index]!;
        output.textContent=point?figure.key==='completed'?`${point.completed}/${report.metrics.total}`:point[figure.key].toLocaleString():'—';
        output.setAttribute('aria-label',`${labels[index]!.textContent}: ${output.textContent}`);
        const marker=figure.series[index]!.point;marker.style.display=point?'':'none';
        if(point){const position=historyPosition(point,figure.key,lastStep,figure.scale);marker.setAttribute('cx',String(position.x));marker.setAttribute('cy',String(position.y));}
      });
      const delta=points[0]&&points[1]?points[1][figure.key]-points[0][figure.key]:undefined;
      figure.delta.textContent=delta===undefined?'Δ —':`Δ ${delta>0?'+':''}${delta.toLocaleString()}`;
    }
    return step;
  }
  latest.onclick=()=>{held=undefined;inspected=undefined;committed=false;element.focus({preventScroll:true});showPoint();onSelect(undefined);};
  element.onkeydown=event=>{
    if(event.target!==element)return;
    const current=inspected??held??lastStep;
    if(event.key==='ArrowLeft'||event.key==='ArrowDown')held=Math.max(0,current-1);
    else if(event.key==='ArrowRight'||event.key==='ArrowUp')held=Math.min(lastStep,current+1);
    else if(event.key==='Home')held=0;
    else if(event.key==='End')held=lastStep;
    else if(event.key==='Escape'){held=undefined;committed=false;}
    else if(event.key==='Enter'){held=current;committed=true;}
    else return;
    event.preventDefault();inspected=undefined;const step=showPoint();if(event.key==='Escape')onSelect(undefined);else if(committed)onSelect(step);announcement.textContent=`Step ${step}. `+figures.map(f=>`${f.key==='completed'?'Tasks completed':f.key==='spent'?'Coins spent':'Waiting agent steps'}: ${f.outputs.map(output=>output.getAttribute('aria-label')).join('; ')}; ${f.delta.textContent}.`).join(' ');
  };
  return {element,update(left:SavedRunReport,right:SavedRunReport,display:(id:string)=>string){
    reports=[left,right];lastStep=Math.max(...reports.map(report=>report.metrics.steps));
    reports.forEach((report,index)=>{labels[index]!.textContent=`${display(report.run.id)} · ${report.metrics.steps} steps${report.history?'':' · History unavailable'}`;});
    for(const figure of figures){
      figure.scale=Math.max(1,...reports.map(report=>figure.key==='completed'?report.metrics.total:Math.max(0,...(report.history??[]).map(point=>point[figure.key]))));
      figure.maximum.textContent=tick.format(figure.scale);figure.end.textContent=String(lastStep);
      reports.forEach((report,index)=>figure.series[index]!.line.setAttribute('d',historyLine(report.history??[],figure.key,figure.scale,lastStep)));
    }
    showPoint();
  }};
}
