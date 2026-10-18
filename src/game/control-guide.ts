import {setIcon,type Icon} from './icons';

export type GuideContext='foot'|'swim'|'seated'|'car'|'bicycle'|'scooter'|'skateboard'|'boat'|'plane'|'passenger'|'sport';
type Row={keys:string[];action:string;hint?:string};
type Section={id:string;label:string;icon:Icon;title:string;rows:Row[]};
const move=(action:string):Row=>({keys:['W','A','S','D'],action,hint:'or arrow keys'});
export function controlSections(context:GuideContext):Section[]{
 const ground=['bicycle','scooter','skateboard'].includes(context),vehicle=!['foot','swim','seated','sport'].includes(context);
 const drive:Row[]=context==='passenger' ? [{keys:['F'],action:'Leave transport'}] : [move(context==='boat' ? 'Throttle and steer' : context==='plane' ? 'Speed and steer' : 'Accelerate, brake and steer'),
  ...(context==='car' ? [{keys:['Shift'],action:'Boost'}] : ground ? [{keys:['Space'],action:'Jump'}] : context==='boat' ? [{keys:['Space'],action:'Hop'}] : context==='plane' ? [{keys:['Space'],action:'Climb'},{keys:['Shift'],action:'Descend'}] : []),
  {keys:['F'],action:context==='plane' ? 'Exit after landing' : 'Exit vehicle'}];
 if(!vehicle)drive.push({keys:['Shift'],action:'Car boost'},{keys:['Space'],action:'Jump a bike or hop a boat'},{keys:['Space','Shift'],action:'Climb / descend a plane'});
 return [
  {id:'explore',label:'Explore',icon:'walking',title:context==='swim' ? 'In the water' : context==='seated' ? 'Seated' : 'On foot',rows:[move(context==='swim' ? 'Swim' : 'Walk'),{keys:context==='swim' ? ['Shift','Space'] : ['Shift'],action:context==='swim' ? 'Swim faster' : 'Run',...(context==='swim' ? {hint:'either key'} : {})},...(context==='swim' ? [] : [{keys:['Space'],action:'Jump'}]),{keys:['F'],action:context==='seated' ? 'Stand up' : 'Sit or board nearby'},{keys:['T'],action:'Talk to someone nearby'},{keys:['Y'],action:'Share food or accept a meal'},{keys:['X'],action:'Decline a meal invitation'}]},
  {id:'vehicles',label:'Vehicles',icon:context==='plane' ? 'plane' : context==='boat' ? 'boat' : ground ? 'bicycle' : 'ride',title:context==='passenger' ? 'Public transport' : ground ? 'Riding a '+context : context==='plane' ? 'Flying' : context==='boat' ? 'On the water' : 'Driving',rows:drive},
  {id:'sports',label:'Sports',icon:'sport',title:'Football & basketball',rows:[move('Move'),{keys:['Shift'],action:'Sprint'},{keys:['N'],action:'Join, rest or resume'},{keys:['J'],action:'Hold to charge, release to shoot'},{keys:['K'],action:'Pass, call or tackle'},{keys:['Space'],action:'Jump'}]},
  {id:'activities',label:'Activities',icon:'work',title:'Things to do nearby',rows:[{keys:['M'],action:'Open nearby activities'},{keys:['I'],action:'Open your bag'},move('Select an item'),{keys:['Enter'],action:'Use selected action'},{keys:['1–4'],action:'Change section',hint:'or Q / E'},{keys:['B','V'],action:'Buy / sell'},{keys:['H'],action:'Work, collect or deliver'},{keys:['G'],action:'Eat carried food'}]},
  {id:'view',label:'View',icon:'view',title:'Your view & world',rows:[{keys:['+','−'],action:'Zoom in / out',hint:'or pinch / scroll'},{keys:['0'],action:'Reset framing'},{keys:['Q','E'],action:'Rotate the view'},{keys:['R'],action:'Return to the start'},{keys:['P'],action:'Pause / continue'},{keys:['Esc'],action:'Close actions, then pause'},{keys:['Tab'],action:'Focus the next control',hint:'Shift + Tab goes back'}]},
 ];
}
export function guideSection(context:GuideContext){return context==='sport' ? 'sports' : ['foot','swim','seated'].includes(context) ? 'explore' : 'vehicles';}

/** One contextual help panel; its controls never submit game actions. */
export function controlGuide(){
 const toggle=document.querySelector<HTMLButtonElement>('#toggle-controls')!,guide=document.querySelector<HTMLElement>('#control-guide')!,tabs=document.querySelector<HTMLElement>('#control-tabs')!,panel=document.querySelector<HTMLElement>('#control-panel')!;
 let sections=controlSections('car'),selected='vehicles';
 const select=(id:string,focus=false)=>{
  selected=id;const section=sections.find(s=>s.id===id)!;
  for(const button of tabs.querySelectorAll<HTMLButtonElement>('button')){const active=button.dataset.section===id;setIcon(button.firstElementChild as HTMLElement,sections.find(s=>s.id===button.dataset.section)!.icon);button.setAttribute('aria-selected',String(active));button.tabIndex=active ? 0 : -1;if(active && focus)button.focus();}
  panel.setAttribute('aria-labelledby','guide-'+id);panel.replaceChildren();
  const heading=document.createElement('h2');heading.textContent=section.title;
  const list=document.createElement('dl');
  for(const row of section.rows){const line=document.createElement('div'),key=document.createElement('dt'),action=document.createElement('dd'),caps=document.createElement('span');caps.className='guide-caps';
   for(const name of row.keys){const cap=document.createElement('kbd');cap.textContent=name;caps.append(cap);}key.append(caps);
   if(row.hint){const hint=document.createElement('small');hint.textContent=row.hint;key.append(hint);}action.textContent=row.action;line.append(key,action);list.append(line);
  }
  panel.append(heading,list);panel.scrollTop=0;
 };
 for(const section of sections){const button=document.createElement('button');button.type='button';button.id='guide-'+section.id;button.dataset.section=section.id;button.setAttribute('role','tab');button.setAttribute('aria-controls','control-panel');
  const shape=document.createElement('span'),text=document.createElement('span');setIcon(shape,section.icon);text.textContent=section.label;button.append(shape,text);button.addEventListener('click',()=>select(section.id));tabs.append(button);
 }
 toggle.addEventListener('click',()=>{guide.hidden=!guide.hidden;toggle.setAttribute('aria-expanded',String(!guide.hidden));if(!guide.hidden)select(selected);});
 tabs.addEventListener('keydown',event=>{const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();event.stopPropagation();const index=sections.findIndex(s=>s.id===selected),next=event.key==='Home' ? 0 : event.key==='End' ? sections.length-1 : (index+(event.key==='ArrowLeft' || event.key==='ArrowUp' ? -1 : 1)+sections.length)%sections.length;select(sections[next]!.id,true);});
 return {update(context:GuideContext){sections=controlSections(context);select(guideSection(context));const current=sections.find(s=>s.id===selected)!;document.querySelector('#pause-context')!.textContent=current.title;setIcon(document.querySelector<HTMLElement>('#pause-context-icon')!,context==='seated' ? 'seat' : context==='swim' ? 'swim' : current.icon);},close(){guide.hidden=true;toggle.setAttribute('aria-expanded','false');}};
}
