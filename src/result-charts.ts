import type {AgentReport} from './report';
import {humanName} from './workspace-copy';

type Bar={label:string;value:number;display?:string;tone?:'baseline'|'candidate'};
const node=(tag:string,className:string,text?:string)=>{const element=document.createElement(tag);element.className=className;if(text!==undefined)element.textContent=text;return element;};

/** Each figure owns its zero-based scale; paired runs always share that scale. */
export function barChart(title:string,bars:Bar[],maximum=Math.max(0,...bars.map(bar=>bar.value))){
  const figure=node('figure','result-chart');figure.append(node('figcaption','',title));
  for(const bar of bars){
    const row=node('div','chart-row'),label=node('div','chart-label'),track=node('div','chart-track'),fill=node('span','chart-fill '+(bar.tone??'baseline'));
    label.append(node('span','',bar.label),node('span','chart-value',bar.display??String(bar.value)));
    track.setAttribute('aria-hidden','true');fill.style.width=`${100*bar.value/Math.max(1,maximum)}%`;track.append(fill);row.append(label,track);figure.append(row);
  }
  return figure;
}

export function timeChart(agents:AgentReport[]){
  const figure=node('figure','result-chart');figure.append(node('figcaption','','Time spent (steps)'));
  const categories=[['travel','Travel'],['service','Service'],['idle','Waiting'],['other','Actions']] as const;
  const maximum=Math.max(1,...agents.map(agent=>Object.values(agent.steps).reduce((sum,value)=>sum+value,0)));
  for(const agent of agents){
    const row=node('div','chart-row'),label=node('div','chart-label'),track=node('div','chart-track chart-stack');
    label.append(node('span','',humanName(agent.agent)),node('span','chart-value',String(Object.values(agent.steps).reduce((sum,value)=>sum+value,0))));
    track.setAttribute('role','img');track.setAttribute('aria-label',categories.map(([key,name])=>`${name}: ${agent.steps[key]} steps`).join(', '));
    for(const [key,name] of categories){const segment=node('span','chart-fill '+key);segment.style.width=`${100*agent.steps[key]/maximum}%`;segment.title=`${name}: ${agent.steps[key]} steps`;track.append(segment);}
    row.append(label,track);figure.append(row);
  }
  const legend=node('div','chart-legend');
  for(const [key,name] of categories){const item=node('span','');item.append(node('i',key),document.createTextNode(name));legend.append(item);}
  figure.append(legend);return figure;
}
