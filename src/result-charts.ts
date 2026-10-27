import type {AgentReport} from './report';
import {humanName} from './workspace-copy';

type Bar={label:string;value:number;display?:string;tone?:'baseline'|'candidate'};
const node=(tag:string,className:string,text?:string)=>{const element=document.createElement(tag);element.className=className;if(text!==undefined)element.textContent=text;return element;};

/** Each figure owns its zero-based scale; paired runs always share that scale. */
export function barChart(title:string,bars:Bar[],maximum=Math.max(0,...bars.map(bar=>bar.value)),figure=node('figure','result-chart')){
  if(!figure.children.length)figure.append(node('figcaption','',title));
  for(const [index,bar] of bars.entries()){
    let row=figure.querySelectorAll<HTMLElement>('.chart-row')[index];
    if(!row){row=node('div','chart-row');const label=node('div','chart-label'),track=node('div','chart-track');label.append(node('span',''),node('span','chart-value'));track.setAttribute('aria-hidden','true');track.append(node('span','chart-fill '+(bar.tone??'baseline')));row.append(label,track);figure.append(row);}
    row.querySelector('.chart-label>span')!.textContent=bar.label;row.querySelector('.chart-value')!.textContent=bar.display??String(bar.value);
    row.querySelector<HTMLElement>('.chart-fill')!.style.width=`${100*bar.value/Math.max(1,maximum)}%`;
  }
  return figure;
}

export function timeChart(agents:AgentReport[],figure=node('figure','result-chart')){
  if(!figure.children.length)figure.append(node('figcaption','','Time spent (steps)'));
  const categories=[['travel','Travel'],['service','Service'],['idle','Waiting'],['other','Actions']] as const;
  const maximum=Math.max(1,...agents.map(agent=>Object.values(agent.steps).reduce((sum,value)=>sum+value,0)));
  for(const [index,agent] of agents.entries()){
    let row=figure.querySelectorAll<HTMLElement>('.chart-row')[index];
    if(!row){row=node('div','chart-row');const label=node('div','chart-label'),track=node('div','chart-track chart-stack');label.append(node('span',''),node('span','chart-value'));track.setAttribute('role','img');for(const [key] of categories)track.append(node('span','chart-fill '+key));row.append(label,track);figure.insertBefore(row,figure.querySelector('.chart-legend'));}
    row.querySelector('.chart-label>span')!.textContent=humanName(agent.agent);row.querySelector('.chart-value')!.textContent=String(Object.values(agent.steps).reduce((sum,value)=>sum+value,0));
    const track=row.querySelector('.chart-track')!;track.setAttribute('aria-label',categories.map(([key,name])=>`${name}: ${agent.steps[key]} steps`).join(', '));
    for(const [key,name] of categories){const segment=track.querySelector<HTMLElement>('.'+key)!;segment.style.width=`${100*agent.steps[key]/maximum}%`;segment.title=`${name}: ${agent.steps[key]} steps`;}
  }
  if(figure.querySelector('.chart-legend'))return figure;
  const legend=node('div','chart-legend');
  for(const [key,name] of categories){const item=node('span','');item.append(node('i',key),document.createTextNode(name));legend.append(item);}
  figure.append(legend);return figure;
}
