import type {Scene} from '../scene/schema';
import type {CarState} from '../sim/car';
import {nearbyMarket,commerceReason,type CommerceAction} from '../sim/commerce';

const why={funds:'Not enough credits',stock:'Sold out',full:'Your bag is full',sated:'You are already full',satiety:'Eat before starting work',busy:'Workplace occupied',range:'Walk closer',input:'No ingredients left',treasury:'The business cannot pay',capacity:'The shelf is full',not_food:'This is not food'};
export function commerceControls(scene:Scene,submit:(action:CommerceAction)=>void){
 const panel=document.querySelector<HTMLElement>('#commerce-panel')!,title=document.querySelector<HTMLElement>('#market-title')!,pocket=document.querySelector<HTMLElement>('#market-pocket')!,feedback=document.querySelector<HTMLElement>('#market-feedback')!,pausePocket=document.querySelector<HTMLElement>('#pocket-status')!;
 const goods=document.querySelector<HTMLSelectElement>('#market-good')!,jobs=document.querySelector<HTMLSelectElement>('#market-job')!,meals=document.querySelector<HTMLSelectElement>('#meal-good')!;
 const buy=document.querySelector<HTMLButtonElement>('#market-buy')!,work=document.querySelector<HTMLButtonElement>('#market-work')!,eat=document.querySelector<HTMLButtonElement>('#market-eat')!,progress=document.querySelector<HTMLElement>('#market-progress')!;
 const player=scene.economy?.accounts.find(a=>a.actor==='player'),definition=scene.economy;
 const stockLabel=document.querySelector<HTMLElement>('#market-stock')!;
 const sell=document.querySelector<HTMLButtonElement>('#market-sell')!;
 let sellAction:CommerceAction|undefined;
 let buyAction:CommerceAction|undefined,workAction:CommerceAction|undefined,eatAction:CommerceAction|undefined;
 let updatedAt=-Infinity,seenEconomy:CarState['economy'],wasPlaying=false,lastControl='';
 const text=(element:HTMLElement,value:string)=>{if(element.textContent!==value)element.textContent=value;};
 const options=(select:HTMLSelectElement,values:{id:string;label:string}[])=>{
  if([...select.options].map(o=>o.value).join(',')!==values.map(v=>v.id).join(',')){const old=select.value;select.replaceChildren(...values.map(v=>new Option(v.label,v.id)));if(values.some(v=>v.id===old))select.value=old;}
  values.forEach((v,i)=>{if(select.options[i]!.text!==v.label)select.options[i]!.text=v.label;});select.hidden=values.length<2;
 };
 for(const select of [goods,jobs,meals]){select.addEventListener('keydown',e=>{if(e.code!=='Escape' && e.code!=='KeyP')e.stopPropagation();});select.addEventListener('change',()=>{updatedAt=-Infinity;});}
 const action=(kind:'buy'|'work'|'eat')=>{const a=kind==='buy' ? buyAction : kind==='work' ? workAction : eatAction,b=kind==='buy' ? buy : kind==='work' ? work : eat;if(a && !b.disabled && !panel.hidden)submit(a);};
 buy.addEventListener('click',()=>action('buy'));work.addEventListener('click',()=>action('work'));eat.addEventListener('click',()=>action('eat'));
 const sellOne=()=>{if(sellAction && !sell.disabled && !panel.hidden)submit(sellAction);};sell.addEventListener('click',sellOne);
 return {key(code:string){if(code==='KeyB')action('buy');if(code==='KeyH')action('work');if(code==='KeyG')action('eat');if(code==='KeyV')sellOne();},update(state:CarState,playing:boolean){
  if(state.economy===seenEconomy && playing===wasPlaying && state.control.kind===lastControl && state.timeS>=updatedAt && state.timeS-updatedAt<.1)return;
  seenEconomy=state.economy;wasPlaying=playing;lastControl=state.control.kind;updatedAt=state.timeS;
  const e=state.economy,a=player && e?.accounts.find(a=>a.id===player.id);if(!a || !definition){panel.hidden=pausePocket.hidden=true;return;}
  const inventory=definition.goods.filter(g=>a.inventory[g.id]!>0).map(g=>`${g.label} ×${a.inventory[g.id]}`).join(' · ');
  const balance=`${a.credits} cr · Fullness ${Math.round(a.satiety)}%${inventory ? ' · '+inventory : ''}`;
  text(pocket,balance);text(pausePocket,balance);pausePocket.hidden=false;
  const m=nearbyMarket(state,scene),stock=m && e!.markets.find(s=>s.id===m.id)!,active=a.work && definition.jobs.find(j=>j.id===a.work!.id),latest=[...e!.events].reverse().find(event=>event.account===a.id && state.timeS-event.atS<4);
  panel.hidden=!playing || state.control.kind!=='foot' || !(m || active || inventory || latest);text(title,m?.label??'Your bag');
  text(stockLabel,m ? 'Stock · '+m.lots.map(l=>`${definition.goods.find(g=>g.id===l.good)!.label} ${stock!.stock[l.good]}`).join(' · ') : '');
  const sold=m?.lots.filter(l=>l.price!==undefined)??[],tasks=definition.jobs.filter(j=>j.market===m?.id),food=definition.goods.filter(g=>g.food>0 && a.inventory[g.id]!>0);
  options(goods,sold.map(l=>({id:l.good,label:`${definition.goods.find(g=>g.id===l.good)!.label} · ${l.price} cr · ${stock!.stock[l.good]} left`})));
  options(jobs,tasks.map(j=>({id:j.id,label:j.label})));options(meals,food.map(g=>({id:g.id,label:`${g.label} ×${a.inventory[g.id]}`})));
  const offer=sold.find(l=>l.good===goods.value),task=tasks.find(j=>j.id===jobs.value),meal=food.find(g=>g.id===meals.value);
  buyAction=m && offer ? {kind:'buy',market:m.id,good:offer.good} : undefined;workAction=active ? {kind:'cancel'} : task ? {kind:'work',job:task.id} : undefined;eatAction=meal ? {kind:'eat',good:meal.id} : undefined;
  sellAction=m && offer && a.inventory[offer.good]!>0 ? {kind:'sell',market:m.id,good:offer.good} : undefined;
  const button=(b:HTMLButtonElement,request:CommerceAction|undefined,label:string)=>{b.hidden=!request;b.disabled=!request || !!commerceReason(state,scene,a.id,request);text(b,label);b.title=request ? why[commerceReason(state,scene,a.id,request)!]??'' : '';};
  button(buy,buyAction,`B · Buy ${definition.goods.find(g=>g.id===offer?.good)?.label??''} · ${offer?.price??0} cr`);
  button(sell,sellAction,`V · Sell ${definition.goods.find(g=>g.id===offer?.good)?.label??''} · ${offer?.price??0} cr`);
  button(work,workAction,active ? 'H · Cancel work' : `H · ${task?.label??'Work'} · +${task?.pay??0} cr`);
  button(eat,eatAction,`G · Eat ${meal?.label??'food'}`);
  const employees=definition.accounts.filter(s=>s.actor!=='player').map(s=>e!.accounts.find(a=>a.id===s.id)!).filter(a=>a.work && definition.jobs.find(j=>j.id===a.work!.id)?.market===m?.id);
  const activity=active ? `${active.label} · ${Math.max(0,a.work!.doneAtS-state.timeS).toFixed(1)}s left. Stay nearby.` : employees.length ? 'Staff are working.' : task && work.disabled ? why[commerceReason(state,scene,a.id,workAction!)!]??'' : '';
  text(progress,activity);
  let message='';if(latest){const good=definition.goods.find(g=>g.id===latest.ref),job=definition.jobs.find(j=>j.id===latest.ref);message=latest.kind==='buy' ? `${good?.label??'Food'} added to your bag` : latest.kind==='sell' ? `Sold ${good?.label??'item'}` : latest.kind==='eat' ? `Ate ${good?.label??'food'}` : latest.kind==='start' ? `${job?.label??'Work'} started` : latest.kind==='paid' ? `Work finished · +${job?.pay??0} cr` : latest.kind==='cancel' ? 'Work cancelled; supplies and reserved wages returned' : why[latest.reason!]??'Action unavailable';}
  text(feedback,message);
 }};
}
