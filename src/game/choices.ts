import {setIcon,type Icon} from './icons';
import {setCaption} from './caption';
export type Choice={id:string;label:string;detail?:string;icon?:Icon};
export function choiceIndex(index:number,length:number,delta:number):number{return length ? ((index+delta)%length+length)%length : 0;}
/** Reused item slots; selection stays outside the accepted world. */
export function choiceCards(element:HTMLElement,changed:()=>void){
 let values:Choice[]=[],value='';const buttons=new Map<string,HTMLButtonElement>();
 const select=(id:string,focus=false)=>{if(!values.some(v=>v.id===id))return;value=id;for(const [key,button] of buttons){button.setAttribute('aria-pressed',String(key===id));button.tabIndex=key===id ? 0 : -1;}if(focus){buttons.get(id)?.focus({preventScroll:true});buttons.get(id)?.scrollIntoView({block:'nearest'});}changed();};
 return {
  get value(){return value;},
  get hidden(){return element.hidden;},
  set hidden(value:boolean){element.hidden=value;},
  set(valuesNext:Choice[]){
   for(const [id,button] of buttons)if(!valuesNext.some(v=>v.id===id)){button.remove();buttons.delete(id);}
   values=valuesNext;if(!values.some(v=>v.id===value))value=values[0]?.id??'';
   for(const item of values){let button=buttons.get(item.id);
    if(!button){button=document.createElement('button');button.type='button';button.className='choice-card';const symbol=document.createElement('span'),copy=document.createElement('span'),label=document.createElement('span'),detail=document.createElement('span');symbol.className='icon-slot';copy.className='choice-copy';label.className='choice-label';detail.className='choice-detail';copy.append(label,detail);button.append(symbol,copy);button.addEventListener('click',()=>select(item.id,true));buttons.set(item.id,button);element.append(button);}
    setIcon(button.querySelector<HTMLElement>('.icon-slot')!,item.icon??'bag');setCaption(button.querySelector<HTMLElement>('.choice-label')!,item.label);setCaption(button.querySelector<HTMLElement>('.choice-detail')!,item.detail??'');button.setAttribute('aria-pressed',String(value===item.id));button.tabIndex=value===item.id ? 0 : -1;
   }
   values.forEach((item,index)=>{const button=buttons.get(item.id)!;if(element.children[index]!==button)element.insertBefore(button,element.children[index]??null);});
   element.hidden=!values.length;
  },
  select,
  reset(){if(values[0])select(values[0].id);},
  move(delta:number){if(values.length)select(values[choiceIndex(values.findIndex(v=>v.id===value),values.length,delta)]!.id,true);},
  focus(){const button=buttons.get(value);button?.focus({preventScroll:true});button?.scrollIntoView({block:'nearest'});return !!button;}
 };
}
