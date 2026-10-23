import {workstation} from '../scene/workstations';
import {choiceCards,type Choice} from './choices';
import {setCaption} from './caption';
import {setIcon} from './icons';
import {nearbySocial,SOCIAL_OFFER_SECONDS} from '../sim/social';
import {dayHour} from '../scene/daylight';
import {marketIsOpen,marketOpening,marketIsStaffed} from '../sim/market-hours';
import {jobInputs,jobRequirements,type Market} from '../scene/commerce';
import type {Scene} from '../scene/schema';
import type {CarState} from '../sim/car';
import {businessPrice,businessReserved,milestoneProgress,nearbyMarket,nearbyWorkstation,commerceReason,deliveryTarget,repairTarget,type CommerceAction} from '../sim/commerce';

const why={station:'Stand at the workbench before starting',energy:'Sit on a free bench to recover energy before working',weather:'Wait for dry weather before starting this job',equipment:"Repair the required equipment first",ownership:"You do not own this business",not_for_sale:"This business is not for sale",amount:"Choose whole coins from 1 to 1,000,000",headroom:"This transfer would exceed the balance limit or a reserved commitment",seat:'Sit on a free paired bench with room for your companion',unfamiliar:'Talk to them first',cooldown:'They would like some time before another meal',unstaffed:'Waiting for staff to reach the counter',closed:'The counter is closed',qualification:'Meet a listed requirement first',funds:'Not enough coins',stock:'Sold out',full:'Your bag is full',sated:'You are already full',satiety:'Eat before starting work',busy:'Finish your current task or wait for a free place',range:'Walk closer',input:'Missing ingredients',treasury:'The business cannot pay',capacity:'The shelf is full',not_food:'This is not food',damage:'No reachable unclaimed damage in this work area'};
const hourText=(hour:number)=>{const minute=Math.floor(hour*60+1e-6)%1440;return `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;};
export function marketHoursText(scene:Pick<Scene,'daylight'>,market:Pick<Market,'hours'>,timeS:number,staffed=true):string{
 if(!market.hours)return '';
 const current=hourText(dayHour(scene.daylight!,timeS)),opening=marketOpening(scene,market,timeS);
 if(!opening)return `${current} · ${staffed ? 'Open until' : 'Waiting for staff · closes'} ${hourText(market.hours[1])}`;
 const seconds=Math.ceil(opening.seconds);
 return `${current} · Closed · opens ${hourText(opening.hour)} (${Math.floor(seconds/60)}m ${seconds%60}s)`;
}
/** Keep each detail readable and announce a disabled-action reason in its one status slot. */
export function workDetailText(lines:readonly (string|false|undefined)[],warning=''):string{
 return [...new Set(lines.filter((line):line is string=>!!line && line!==warning))].join('\n');
}
export type ActivityView='market'|'work'|'bag'|'business';
/** Only the current counter and active task can expose contextual pages. */
export function activityViews(context:{foot:boolean;market:boolean;work:boolean;task:boolean;business:boolean;station?:boolean;sharing?:boolean}):ActivityView[]{
 if(context.task)return context.sharing ? ['bag'] : ['work','bag'];
 return [...(context.foot && context.market ? ['market' as const] : []),...(context.foot && (context.market || context.station) && context.work ? ['work' as const] : []),'bag',...(context.foot && context.market && context.business ? ['business' as const] : [])];
}
export function commerceControls(scene:Scene,submit:(action:CommerceAction)=>void,releaseInputs:()=>void=()=>{}){
 const panel=document.querySelector<HTMLElement>('#commerce-panel')!,title=document.querySelector<HTMLElement>('#market-title')!,pocket=document.querySelector<HTMLElement>('#market-pocket')!,feedback=document.querySelector<HTMLElement>('#market-feedback')!,pausePocket=document.querySelector<HTMLElement>('#pocket-status')!;
 const opener=document.querySelector<HTMLButtonElement>('#activity-open')!,bag=document.querySelector<HTMLButtonElement>('#bag-open')!,closeButton=document.querySelector<HTMLButtonElement>('#commerce-close')!;
 const panelIcon=document.querySelector<HTMLElement>('#panel-icon')!,bagLabel=bag.querySelector<HTMLElement>('.ui-label')!;
 const activityLabel=document.querySelector<HTMLElement>('#activity-label')!,activityIcon=document.querySelector<HTMLElement>('#activity-icon')!,contents=document.querySelector<HTMLElement>('#bag-contents')!,toast=document.querySelector<HTMLElement>('#action-feedback')!;
 const tabs=[...document.querySelectorAll<HTMLButtonElement>('#commerce-views [data-view]')],pages=[...document.querySelectorAll<HTMLElement>('[data-commerce-view]')];
 let currentState:CarState|undefined,currentPlaying=false;
 function refresh(){updatedAt=-Infinity;if(currentState)update(currentState,currentPlaying);}
 let view:ActivityView|undefined,available:ActivityView[]=['bag'],defaultView:ActivityView='bag',contextId='',canOpen=false,contextPlaying=false,focusView=false;
 const close=(focus=true)=>{view=undefined;panel.hidden=true;opener.setAttribute('aria-expanded','false');bag.setAttribute('aria-expanded','false');updatedAt=-Infinity;if(focus || panel.contains(document.activeElement))document.querySelector<HTMLElement>('#game')!.focus({preventScroll:true});};
 const show=(next:ActivityView,focus=true)=>{if(!contextPlaying || !available.includes(next))return;view=next;focusView=focus;releaseInputs();updatedAt=-Infinity;panel.hidden=false;toast.hidden=true;refresh();};
 opener.addEventListener('click',()=>{if(view)close();else if(canOpen)show(defaultView);});bag.addEventListener('click',()=>{if(view==='bag')close();else show('bag');});closeButton.addEventListener('click',()=>close());
 for(const tab of tabs)tab.addEventListener('click',()=>show(tab.dataset.view as ActivityView,false));
 panel.addEventListener('focusin',()=>{releaseInputs();updatedAt=-Infinity;});
 const goods=choiceCards(document.querySelector<HTMLElement>('#market-good')!,refresh),jobs=choiceCards(document.querySelector<HTMLElement>('#market-job')!,refresh),meals=choiceCards(document.querySelector<HTMLElement>('#meal-good')!,refresh);
 const hint=document.querySelector<HTMLElement>('#choice-hint')!;
 const buy=document.querySelector<HTMLButtonElement>('#market-buy')!,work=document.querySelector<HTMLButtonElement>('#market-work')!,eat=document.querySelector<HTMLButtonElement>('#market-eat')!,progress=document.querySelector<HTMLElement>('#market-progress')!;
 const shared=document.querySelector<HTMLButtonElement>('#shared-meal')!;
 const invitation=document.querySelector<HTMLElement>('#social-invitation')!,invitationTitle=document.querySelector<HTMLElement>('#social-invitation-title')!,invitationTime=document.querySelector<HTMLElement>('#invitation-time')!;
 const acceptInvitation=document.querySelector<HTMLButtonElement>('#accept-invitation')!,declineInvitation=document.querySelector<HTMLButtonElement>('#decline-invitation')!,declineShared=document.querySelector<HTMLButtonElement>('#decline-shared-meal')!;
 setIcon(document.querySelector<HTMLElement>('#invitation-icon')!,'food');
 setCaption(document.querySelector<HTMLElement>('#social-invitation-note')!,`The offer lasts ${SOCIAL_OFFER_SECONDS} seconds while playing. Pause with P to take your time.`);
 const business=document.querySelector<HTMLElement>('#business-panel')!,businessTitle=document.querySelector<HTMLElement>('#business-title')!,ledger=document.querySelector<HTMLElement>('#business-ledger')!,terms=document.querySelector<HTMLElement>('#business-terms')!;
 const acquire=document.querySelector<HTMLButtonElement>('#business-buy')!,deposit=document.querySelector<HTMLButtonElement>('#business-deposit')!,withdraw=document.querySelector<HTMLButtonElement>('#business-withdraw')!,capital=document.querySelector<HTMLElement>('#business-capital')!,amount=document.querySelector<HTMLOutputElement>('#business-amount')!;
 let acquireAction:CommerceAction|undefined,depositAction:CommerceAction|undefined,withdrawAction:CommerceAction|undefined;
 for(const [button,request] of [[acquire,()=>acquireAction],[deposit,()=>depositAction],[withdraw,()=>withdrawAction]] as const)button.addEventListener('click',()=>{const action=request();if(action && !button.disabled && !panel.hidden && !business.hidden)submit(action);});
 let capitalAmount=5;
 const adjustAmount=(delta:number)=>{capitalAmount=Math.max(1,Math.min(1_000_000,capitalAmount+delta));refresh();};
 document.querySelector('#business-less')!.addEventListener('click',()=>adjustAmount(-1));document.querySelector('#business-more')!.addEventListener('click',()=>adjustAmount(1));

 const objects=new Map(scene.objects.map(o=>[o.id,o]));
 const player=scene.economy?.accounts.find(a=>a.actor==='player'),definition=scene.economy;
 const stockLabel=document.querySelector<HTMLElement>('#market-stock')!;
 const sell=document.querySelector<HTMLButtonElement>('#market-sell')!,cancel=document.querySelector<HTMLButtonElement>('#market-cancel')!;cancel.addEventListener('click',()=>{if(!cancel.hidden && contextPlaying)submit({kind:'cancel'});});
 let sellAction:CommerceAction|undefined,shareAction:CommerceAction|undefined,declineAction:CommerceAction|undefined;
 const share=()=>{if(shareAction && !shared.disabled && contextPlaying)submit(shareAction);};shared.addEventListener('click',share);
 const decline=()=>{if(declineAction && contextPlaying)submit(declineAction);};acceptInvitation.addEventListener('click',share);declineInvitation.addEventListener('click',decline);declineShared.addEventListener('click',decline);
 let stationGuide:string|undefined;
 let buyAction:CommerceAction|undefined,workAction:CommerceAction|undefined,eatAction:CommerceAction|undefined;
 let lastViewControl='';
 let updatedAt=-Infinity,seenEconomy:CarState['economy'],wasPlaying=false,lastControl='';
 const text=setCaption;
 const options=(cards:ReturnType<typeof choiceCards>,values:Choice[])=>cards.set(values);
 const action=(kind:'buy'|'work'|'eat')=>{const a=kind==='buy' ? buyAction : kind==='work' ? workAction : eatAction,b=kind==='buy' ? buy : kind==='work' ? work : eat;if(a && !b.disabled && contextPlaying)submit(a);};
 buy.addEventListener('click',()=>action('buy'));work.addEventListener('click',()=>action('work'));eat.addEventListener('click',()=>action('eat'));
 const sellOne=()=>{if(sellAction && !sell.disabled && contextPlaying)submit(sellAction);};sell.addEventListener('click',sellOne);
 function key(code:string,target?:EventTarget|null,repeat=false,shift=false):boolean{
  if(code==='Escape' && view){close();return true;}
  if(!repeat && code==='KeyM' && canOpen){if(view)close();else show(defaultView);return true;}
  if(!repeat && code==='KeyI' && contextPlaying){if(view==='bag')close();else show('bag');return true;}
  if(view){
   if(code==='Tab'){const stops=[...panel.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]),[tabindex="0"]')].filter(b=>b.getClientRects().length);const index=stops.indexOf(document.activeElement as HTMLElement);stops[(index+(shift ? -1 : 1)+stops.length)%stops.length]?.focus();return true;}
   const page=code==='Digit1' ? 'market' : code==='Digit2' ? 'work' : code==='Digit3' ? 'bag' : code==='Digit4' ? 'business' : undefined;
   if(page){if(!repeat)show(page);return true;}
   if(code==='KeyQ' || code==='KeyE'){if(!repeat)show(available[(available.indexOf(view)+(code==='KeyQ' ? -1 : 1)+available.length)%available.length]!);return true;}
   const delta=['ArrowUp','ArrowLeft','KeyW','KeyA'].includes(code) ? -1 : ['ArrowDown','ArrowRight','KeyS','KeyD'].includes(code) ? 1 : 0;
   if(delta){if(view==='business'){adjustAmount(delta*(shift ? 10 : 1));if(!capital.hidden)amount.focus({preventScroll:true});}else {const cards=view==='market' ? goods : view==='work' ? jobs : meals;if(!cards.hidden)cards.move(delta);}return true;}
   if(code==='Enter' || code==='Space'){
    if(repeat)return true;
    if(target instanceof HTMLElement && target.closest('button:not(.choice-card)'))return false;
    if(!repeat){if(view==='market')action('buy');else if(view==='work')action('work');else if(view==='bag'){if(declineAction)share();else action('eat');}else (acquireAction ? acquire : deposit).click();}return true;
   }
   if(code==='Tab' || code==='ShiftLeft' || code==='ShiftRight' || code==='KeyP')return false;
   if(!['KeyB','KeyH','KeyG','KeyV','KeyY','KeyX'].includes(code) || view==='business')return true;
  }
  if(!repeat && contextPlaying){if(code==='KeyY')share();if(code==='KeyX')decline();if(code==='KeyB')action('buy');if(code==='KeyH')action('work');if(code==='KeyG')action('eat');if(code==='KeyV')sellOne();}
  return !!view;
 }
 function update(state:CarState,playing:boolean){
  currentState=state;currentPlaying=playing;
  if(state.economy===seenEconomy && playing===wasPlaying && state.control.kind===lastControl && state.timeS>=updatedAt && state.timeS-updatedAt<.1)return;
  seenEconomy=state.economy;wasPlaying=playing;lastControl=state.control.kind;updatedAt=state.timeS;
  const hadMenuFocus=panel.contains(document.activeElement),hadInvitationFocus=invitation.contains(document.activeElement);
  const e=state.economy,a=player && e?.accounts.find(a=>a.id===player.id);if(!a || !definition){close(false);invitation.hidden=opener.hidden=bag.hidden=toast.hidden=pausePocket.hidden=true;return;}
  const inventory=definition.goods.filter(g=>a.inventory[g.id]!>0).map(g=>`${g.label} ×${a.inventory[g.id]}`).join(' · ');
  const cargo=a.delivery && definition.deliveries.find(d=>d.id===a.delivery!.id);
  const held=a.repair && definition.repairs.find(r=>r.id===a.repair!.id),planting=held?.regrow_s!==undefined;
  const returning=!!a.repair?.recover && a.repair.phase==='home',carriedGood=returning ? held?.recover : held?.input,carriedAmount=returning ? held?.amount : held?.take;
  const nearbyGrowth=(state.growing??[]).map(p=>({p,o:objects.get(p.objectId)!})).map(v=>({...v,d:Math.hypot(v.o.x-state.x,v.o.y-state.y)})).filter(v=>v.d<=120).sort((a,b)=>a.d-b.d || a.o.id.localeCompare(b.o.id))[0];
  const growthMessage=nearbyGrowth ? `${nearbyGrowth.o.labelText??'Tree'} · growing ${Math.floor(nearbyGrowth.p.progressS/definition.repairs.find(r=>r.id===nearbyGrowth.p.serviceId)!.regrow_s!*100)}%. Give it room to grow.` : '';
  const energy=a.energy===undefined ? '' : ` · Energy ${Math.round(a.energy)}%`;
  const balance=`${a.credits} 🪙 · Fullness ${Math.round(a.satiety)}%${energy}${inventory ? ' · '+inventory : ''}${cargo ? ` · Cargo ${cargo.quantity} ${definition.goods.find(g=>g.id===cargo.good)!.label}` : ''}${a.repair ? ` · ${definition.goods.find(g=>g.id===carriedGood)!.label} ×${carriedAmount}` : ''}`;
  text(pocket,`${a.credits} 🪙 · Fullness ${Math.round(a.satiety)}%${energy}`);text(contents,[inventory,cargo ? `Cargo: ${cargo.quantity} ${definition.goods.find(g=>g.id===cargo.good)!.label}` : '',a.repair ? `${definition.goods.find(g=>g.id===carriedGood)!.label} ×${carriedAmount} · ${returning ? 'recovered cargo' : 'work supplies'}` : ''].filter(Boolean).join(' · ') || 'Your bag is empty.');const owned=definition.markets.filter(m=>e!.markets.find(s=>s.id===m.id)?.owner===a.id).map(m=>`${m.label} · ${e!.markets.find(s=>s.id===m.id)!.credits} 🪙`);text(pausePocket,balance+(owned.length ? " · Own: "+owned.join("; ") : ""));pausePocket.hidden=false;
  const target=deliveryTarget(state,scene),repair=repairTarget(state,scene),companion=nearbySocial(state,scene),together=e!.shared,pending=e!.invitation,sharing=together && together.phase!=='home',social=definition.socials.find(s=>s.id===(together?.id??definition.accounts.find(a=>a.id===pending?.partner)?.social??companion?.account.social));
  const companionName=objects.get(definition.accounts.find(a=>a.id===(together?.partner??pending?.partner??companion?.account.id))?.actor??'')?.labelText??'your companion';
  const sharedMessage=pending ? `${companionName} is offering ${definition.goods.find(g=>g.id===social?.good)?.label.toLowerCase()??'a meal'}. Their treat.` : sharing ? together.phase==='out' ? `${companionName} is coming over. Two portions reserved; stay seated.` : `Eating together · ${Math.max(0,together.eatUntilS!-state.timeS).toFixed(1)}s left` : together ? `${companionName} is returning to their routine.` : companion && social ? `${definition.goods.find(g=>g.id===social.good)!.label} ×2 · ${companionName}` : '';
  const counter=nearbyMarket(state,scene),bench=!counter ? nearbyWorkstation(state,scene) : undefined,m=counter??(bench ? definition.markets.find(m=>m.id===definition.jobs.find(j=>j.station===bench.id)?.market) : undefined),stock=m && e!.markets.find(s=>s.id===m.id)!,active=a.work && definition.jobs.find(j=>j.id===a.work!.id),latest=[...e!.events].reverse().find(event=>event.account===a.id && state.timeS-event.atS<4);
  const taskActive=!!(active || target || repair || sharing || pending),foot=state.control.kind==='foot';
  const id=foot ? (m?.id??'')+(bench ? '/'+bench.id : '') : '';if(contextId!==id || !playing || state.control.kind!==lastViewControl){close(false);contextId=id;}lastViewControl=state.control.kind;
  const hasWork=definition.jobs.some(j=>j.market===m?.id) || definition.deliveries.some(d=>d.from===m?.id) || definition.repairs.some(r=>r.market===m?.id);
  available=activityViews({foot,market:!!counter,station:!!bench,work:hasWork,task:taskActive,business:!!counter?.owner,sharing:!!sharing || !!pending});if(view && !available.includes(view))close(false);
  contextPlaying=playing;canOpen=playing && (!!m && foot || taskActive);defaultView=taskActive ? sharing || pending ? 'bag' : 'work' : bench ? 'work' : m?.lots.some(l=>l.price!==undefined) ? 'market' : hasWork ? 'work' : m?.owner ? 'business' : 'market';
  opener.hidden=!canOpen;bag.hidden=!playing;panel.hidden=!playing || !view;
  const taskName=pending ? 'Meal invitation' : sharing ? 'Meal' : repair ? returning ? 'Return materials' : planting ? 'Planting' : 'Repair' : target ? 'Delivery' : active ? 'Working' : bench ? 'Workbench' : 'Market';
  const distance=target ? ` · ${Math.ceil(Math.hypot(target.x-state.x,target.y-state.y)/10)} m` : repair && repair.task.phase!=='work' ? ` · ${Math.ceil(Math.hypot(state.x-repair.x,state.y-repair.y)/10)} m` : active ? ` · ${Math.max(0,Math.ceil(a.work!.doneAtS-state.timeS))}s` : '';
  text(activityLabel,taskName+distance);setIcon(activityIcon,taskActive || bench ? 'work' : 'market');opener.title=taskActive || bench ? taskName : m?.label??'';opener.setAttribute('aria-label',taskActive || bench ? `Open ${taskName.toLowerCase()} details` : `Open ${m?.label??'nearby market'}`);
  text(bagLabel,`${a.credits} 🪙`);bag.style.setProperty('--fullness',String(a.satiety/100));bag.dataset.hungry=String(a.satiety<25);bag.title=`Bag · Fullness ${Math.round(a.satiety)}%${energy} (I)`;bag.setAttribute('aria-label',`Open bag · ${a.credits} coins · fullness ${Math.round(a.satiety)} percent${a.energy===undefined ? '' : ` · energy ${Math.round(a.energy)} percent`}`);
  opener.setAttribute('aria-expanded',String(!!view && view!=='bag'));bag.setAttribute('aria-expanded',String(view==='bag'));
  for(const tab of tabs){if(tab.dataset.view==='market')text(tab.querySelector<HTMLElement>('.ui-label')!,m?.lots.some(l=>l.price!==undefined) ? 'Shop' : 'Stock');tab.hidden=!available.includes(tab.dataset.view as ActivityView);tab.setAttribute('aria-pressed',String(tab.dataset.view===view));}
  for(const page of pages)page.hidden=page.dataset.commerceView!==view;
  setIcon(panelIcon,view==='business' ? 'business' : view==='work' ? 'work' : view==='bag' ? 'bag' : 'market');
  text(title,view==='bag' ? 'Your bag' : view==='work' && (taskActive || bench) ? taskName : m?.label??'Your activity');cancel.hidden=returning || !(target || repair || sharing);text(cancel,sharing ? 'End meal' : repair ? planting ? 'Cancel planting' : 'Cancel repair' : 'Cancel delivery');
  text(stockLabel,m ? 'Stock · '+m.lots.map(l=>`${definition.goods.find(g=>g.id===l.good)!.label} ${stock!.stock[l.good]}`).join(' · ') : '');
  const repairs=counter ? definition.repairs.filter(r=>r.market===m?.id) : [];
  const delivery=counter ? definition.deliveries.filter(d=>d.from===m?.id) : [];
  const sold=counter?.lots.filter(l=>l.price!==undefined)??[],tasks=definition.jobs.filter(j=>bench ? j.station===bench.id : j.market===m?.id),food=definition.goods.filter(g=>g.food>0 && a.inventory[g.id]!>0);
  options(goods,sold.map(l=>({id:l.good,label:definition.goods.find(g=>g.id===l.good)!.label,detail:`${l.price} 🪙 · ${stock!.stock[l.good]} left`,icon:'food'})));
  options(jobs,[...tasks.map<Choice>(j=>({id:'work:'+j.id,label:j.label,detail:`+${j.pay} 🪙`,icon:'work'})),...delivery.map<Choice>(d=>({id:'delivery:'+d.id,label:d.label,detail:`+${d.pay} 🪙`,icon:'box'})),...repairs.map<Choice>(r=>({id:'repair:'+r.id,label:r.label,detail:`+${r.pay} 🪙`,icon:r.regrow_s!==undefined ? 'plant' : 'repair'}))]);if(target || active || repair)jobs.hidden=true;options(meals,food.map(g=>({id:g.id,label:g.label,detail:`×${a.inventory[g.id]}`,icon:'food'})));
  const offer=sold.find(l=>l.good===goods.value),task=tasks.find(j=>'work:'+j.id===jobs.value),trip=delivery.find(d=>'delivery:'+d.id===jobs.value),meal=food.find(g=>g.id===meals.value),repairJob=repairs.find(r=>'repair:'+r.id===jobs.value);
  stockLabel.hidden=!!offer && sold.length>1;if(offer)text(stockLabel,`${stock!.stock[offer.good]} ${definition.goods.find(g=>g.id===offer.good)!.label} available`);
  buyAction=m && offer ? {kind:'buy',market:m.id,good:offer.good} : undefined;workAction=repair ? {kind:returning ? 'deliver' : 'cancel'} : target ? {kind:'deliver'} : active ? {kind:'cancel'} : task ? {kind:'work',job:task.id} : trip ? {kind:'collect',delivery:trip.id} : repairJob ? {kind:'repair',repair:repairJob.id} : undefined;eatAction=meal ? {kind:'eat',good:meal.id} : undefined;
  sellAction=m && offer && a.inventory[offer.good]!>0 ? {kind:'sell',market:m.id,good:offer.good} : undefined;
  const button=(b:HTMLButtonElement,request:CommerceAction|undefined,label:string)=>{b.hidden=!request;b.disabled=!request || !!commerceReason(state,scene,a.id,request);let copy=b.querySelector<HTMLElement>('.action-copy');if(!copy){copy=document.createElement('span');copy.className='action-copy';const key=document.createElement('kbd');key.className='action-key';key.setAttribute('aria-hidden','true');key.textContent='↵';key.hidden=true;b.replaceChildren(copy,key);}text(copy,label);b.title=request ? why[commerceReason(state,scene,a.id,request)!]??'' : '';};
  business.hidden=view!=='business' || !m?.owner;const ownedHere=!!m?.owner && stock!.owner===a.id,price=m && businessPrice(m,stock!);
  const owner=definition.accounts.find(a=>a.id===stock?.owner),ownerName=owner?.actor==='player' ? 'You' : objects.get(owner?.actor??'')?.labelText??owner?.id??'';
  text(businessTitle,ownedHere ? 'Business · yours' : price!==undefined ? 'Business · for sale' : 'Business');
  text(ledger,m?.owner ? `Owner · ${ownerName} · Cash ${stock!.credits} 🪙 · Pending commitments ${businessReserved(state,scene,m.id)} 🪙` : '');
  text(terms,ownedHere ? 'Supplier payments stay in the business. Transfer available cash here; committed payments stay protected.' : price!==undefined ? `Price: ${m!.sale} 🪙 for the business + ${stock!.credits} 🪙 in available cash. Stock and existing contracts stay with it.` : '');
  acquireAction=m && price!==undefined && !ownedHere ? {kind:'acquire',market:m.id} : undefined;
  depositAction=m && ownedHere ? {kind:'deposit',market:m.id,amount:capitalAmount} : undefined;withdrawAction=m && ownedHere ? {kind:'withdraw',market:m.id,amount:capitalAmount} : undefined;
  capital.hidden=!ownedHere;amount.setAttribute('aria-valuenow',String(capitalAmount));text(amount,`${capitalAmount} 🪙`);button(acquire,acquireAction,`Buy business · ${price??0} 🪙`);button(deposit,depositAction,'Deposit');button(withdraw,withdrawAction,'Withdraw');
  shareAction=sharing ? {kind:'cancel'} : pending ? {kind:'accept_share',partner:pending.partner} : companion ? {kind:'share',partner:companion.account.id} : undefined;
  declineAction=pending ? {kind:'decline_share',partner:pending.partner} : undefined;
  button(shared,shareAction,sharing ? 'End meal' : pending ? `Join ${companionName}` : `Share with ${companionName}`);
  button(declineShared,declineAction,'No thanks');
  invitation.hidden=!playing || !!view || !pending;
  if(invitation.hidden && hadInvitationFocus && playing && !view)document.querySelector<HTMLElement>('#game')!.focus({preventScroll:true});
  text(invitationTitle,pending ? `${companionName} offers ${definition.goods.find(g=>g.id===social?.good)?.label.toLowerCase()??'a meal'}` : '');
  text(invitationTime,pending ? `${Math.max(0,Math.ceil(pending.expiresAtS-state.timeS))}s` : '');
  acceptInvitation.disabled=shared.disabled;declineInvitation.disabled=!pending;
  acceptInvitation.setAttribute('aria-label',`Join ${companionName} for a meal. Their treat. Y`);declineInvitation.setAttribute('aria-label',`Decline ${companionName}'s meal invitation. X`);
  button(buy,buyAction,`Buy ${definition.goods.find(g=>g.id===offer?.good)?.label??''} · ${offer?.price??0} 🪙`);
  button(sell,sellAction,`Sell ${definition.goods.find(g=>g.id===offer?.good)?.label??''} · ${offer?.price??0} 🪙`);
  button(work,workAction,repair ? returning ? 'Return materials' : planting ? 'Cancel planting' : 'Cancel repair' : target ? `Deliver · +${target.delivery.pay} 🪙` : active ? 'Cancel work' : `${task?.label??trip?.label??repairJob?.label??'Work'} · +${task?.pay??trip?.pay??repairJob?.pay??0} 🪙`);
  button(eat,eatAction,`Eat ${meal?.label??'food'}`);
  if(!foot || sharing || pending){eat.hidden=meals.hidden=true;}if(!foot)shared.hidden=true;if(sharing)cancel.hidden=true;
  if(shareAction?.kind==='share' && shared.disabled){const reason=commerceReason(state,scene,a.id,shareAction);shared.title=reason==='stock' ? 'Bring two portions in your bag' : reason==='sated' ? 'One of you is too full to eat' : shared.title;}
  const employees=definition.accounts.filter(s=>s.actor!=='player').map(s=>e!.accounts.find(a=>a.id===s.id)!).filter(a=>a.work && definition.jobs.find(j=>j.id===a.work!.id)?.market===m?.id);
  const recoveryRecipe=repair?.repair??repairJob;
  const recipeJob=active??(!repair && !target && !sharing && !pending ? task : undefined),recipe=recipeJob && jobInputs(recipeJob).map(i=>`${definition.goods.find(g=>g.id===i.good)!.label} ×${i.take}`).join(' + ')+` → ${definition.goods.find(g=>g.id===recipeJob.output)!.label} ×${recipeJob.make}` || (!returning && recoveryRecipe?.recover ? `${definition.goods.find(g=>g.id===recoveryRecipe.input)!.label} ×${recoveryRecipe.take} · recover ${recoveryRecipe.amount} ${definition.goods.find(g=>g.id===recoveryRecipe.recover)!.label} when mature and space is available` : '');
  const qualifications=task ? jobRequirements(task).map(id=>milestoneProgress(state,scene,a.id,id)!) : [],applicable=qualifications.filter(p=>p.applicable),earned=applicable.find(p=>p.done>=p.milestone.count);
  const practiceMessage=(earned ? [earned] : applicable).map(p=>`${p.milestone.label} · ${Math.min(p.done,p.milestone.count)}/${p.milestone.count}${p.done>=p.milestone.count ? ' · unlocked' : ''}`).join(' or ') || (qualifications.length ? 'This opportunity belongs to other residents.' : '');
  stationGuide=foot && !target && !repair && !sharing && !active ? task?.station : undefined;
  const station=workstation(scene,(active??task)?.station),stationLabel=station ? (objects.get(station.objectId)?.labelText??'workbench') : undefined;
  const activity=returning ? `${carriedAmount} ${definition.goods.find(g=>g.id===carriedGood)!.label} → ${definition.markets.find(m=>m.id===held!.market)!.label} · ${Math.ceil(Math.hypot(state.x-repair!.x,state.y-repair!.y)/10)} m. Return on foot; wages are already paid.` : repair ? `${repair.task.phase==='work' ? Math.max(0,repair.repair.seconds-repair.task.progressS).toFixed(1)+'s left. Keep the space clear.' : 'Walk to '+(scene.objects.find(o=>o.id===repair.task.objectId)?.labelText??'the damaged object')+' · '+Math.ceil(Math.hypot(state.x-repair.x,state.y-repair.y)/10)+' m. Stand beside it to work.'}` : target ? `${target.delivery.quantity} ${definition.goods.find(g=>g.id===target.delivery.good)!.label} → ${target.market.label} · ${Math.ceil(Math.hypot(target.x-state.x,target.y-state.y)/10)} m. Hand over on foot.` : active ? `${active.label} · ${Math.max(0,a.work!.doneAtS-state.timeS).toFixed(1)}s left. ${station ? 'Stay at the workbench.' : 'Stay nearby.'}` : employees.length ? `Staff · ${definition.jobs.find(j=>j.id===employees[0]!.work!.id)!.label} · ${Math.max(0,employees[0]!.work!.doneAtS-state.timeS).toFixed(1)}s left` : '';
  const worker=definition.accounts.map(d=>({d,a:e!.accounts.find(a=>a.id===d.id)!})).find(({d,a})=>d.actor!=='player' && a.repair && definition.repairs.find(r=>r.id===a.repair!.id)?.market===m?.id);
  const courier=definition.accounts.map(d=>({d,a:e!.accounts.find(a=>a.id===d.id)!})).find(({a})=>a.courier && definition.deliveries.some(d=>d.id===a.courier!.id && (d.to===m?.id || d.from===m?.id)));
  const courierJob=courier && definition.deliveries.find(d=>d.id===courier.a.courier!.id)!,courierTrip=courier?.a.courier,courierMarket=courierJob && courierTrip?.phase!=='home' && definition.markets.find(m=>m.id===(courierTrip?.phase==='pickup' ? courierJob.from : courierJob.to));
  const courierWaiting=courierMarket && courierTrip && Math.hypot(courierTrip.x-courierTrip.at.x,courierTrip.y-courierTrip.at.y)<=.1;
  const courierMessage=courierWaiting && !marketIsOpen(scene,courierMarket,state.timeS) ? `Courier is waiting at ${courierMarket.label} until ${hourText(courierMarket.hours![0])}.` : courierWaiting && !marketIsStaffed(scene,courierMarket,e) ? `Courier is waiting for staff at ${courierMarket.label}.` : courierJob ? courierTrip!.phase==='pickup' ? 'Worker is walking to '+definition.markets.find(m=>m.id===courierJob.from)!.label+' for '+definition.goods.find(g=>g.id===courierJob.good)!.label.toLowerCase()+'.' : courierTrip!.phase==='dropoff' ? 'Worker is bringing '+definition.goods.find(g=>g.id===courierJob.good)!.label+' ×'+courierJob.quantity+' to '+definition.markets.find(m=>m.id===courierJob.to)!.label+'.' : 'Courier is returning home.' : '';
  const diner=definition.accounts.map(d=>({d,a:e!.accounts.find(a=>a.id===d.id)!})).find(({d,a})=>d.meal && definition.meals.some(plan=>plan.id===d.meal && (a.meal ? a.meal.market===m?.id : plan.markets.includes(m?.id??''))) && (a.meal || a.satiety<=40));
  const diningPlan=diner && definition.meals.find(plan=>plan.id===diner.d.meal)!,diningFood=diningPlan && definition.goods.find(g=>g.id===diningPlan.good)!.label;
  const diningMessage=diner ? diner.a.meal ? diner.a.meal.phase==='out' ? 'A customer is walking here for '+diningFood+'.' : diner.a.meal.phase==='seat' ? 'A customer is taking '+diningFood+' to a seat.' : diner.a.meal.phase==='eat' ? 'A customer is eating '+diningFood+'.' : 'A customer is returning to their routine.' : stock && diningPlan && !stock.stock[diningPlan.good] && diner.a.credits>=(m?.lots.find(l=>l.good===diningPlan.good)?.price??Infinity) ? 'A hungry customer is waiting for '+diningFood+'.' : '' : '';
  const service=target?.market??m,closed=!!service && !marketIsOpen(scene,service,state.timeS);
  const shift=service && definition.accounts.find(a=>a.actor===service.actor && a.shift),journey=shift && e!.accounts.find(a=>a.id===shift.id)!.shift;
  const staffMessage=journey ? journey.phase==='in' ? 'Staff are walking back to the counter.' : journey.phase==='out' ? 'Staff are leaving the counter.' : 'Staff are off duty.' : '';
  if(sharing || pending)text(contents,sharedMessage);
  const hours=service ? marketHoursText(scene,service,state.timeS,marketIsStaffed(scene,service,e)) : undefined;
  const workerMessage=worker ? worker.a.repair!.phase==='home' ? 'Worker is returning to the market.' : worker.a.repair!.phase==='work' ? (definition.repairs.find(r=>r.id===worker.a.repair!.id)!.regrow_s!==undefined ? 'Worker is planting ' : 'Worker is repairing ')+(scene.objects.find(o=>o.id===worker.a.repair!.objectId)?.labelText??'the object')+'.' : 'Worker is walking to the work site.' : '';
  text(document.querySelector<HTMLElement>('#market-recipe')!,closed && !active ? '' : recipe??'');
  text(progress,workDetailText(taskActive ? [activity,closed && hours] : [station && !active && `${stationLabel} · ${(Math.hypot(state.x-station.x,state.y-station.y)/10).toFixed(1)} m · stand at its end to work`,hours,staffMessage,practiceMessage,courierMessage || activity || workerMessage || diningMessage || growthMessage],work.title));
  let message='';if(latest){const good=definition.goods.find(g=>g.id===latest.ref),job=definition.jobs.find(j=>j.id===latest.ref),trip=definition.deliveries.find(d=>d.id===latest.ref),service=definition.repairs.find(r=>r.id===latest.ref),plant=service?.regrow_s!==undefined,supply=service && definition.goods.find(g=>g.id===service.input)!.label;message=latest.kind==='acquired' ? `You now own ${definition.markets.find(m=>m.id===latest.ref)!.label}. Paid ${latest.amount} 🪙 to the seller.` : latest.kind==='capital_in' ? `Deposited ${latest.amount} 🪙 in the business.` : latest.kind==='capital_out' ? `Withdrew ${latest.amount} 🪙 from the business.` : latest.kind==='sharing' ? 'Invitation accepted. Your companion is coming over.' : latest.kind==='shared_meal' ? 'You shared a meal. They will remember it.' : latest.kind==='share_cancelled' ? 'Meal ended early. Unused food returned to its owner.' : latest.kind==='invited' ? '' : latest.kind==='invite_declined' ? 'Invitation declined.' : latest.kind==='repair_started' ? `${supply??'Supplies'} collected. Walk to the work site.` : latest.kind==='repaired' ? `${plant ? 'Tree planted' : 'Repair finished'} · +${service?.pay??0} 🪙` : latest.kind==='repair_cancelled' ? `${plant ? 'Planting' : 'Repair'} cancelled. Supplies and reserved pay returned.` : latest.kind==='collected' ? trip?.price ? `Cargo collected. ${definition.markets.find(m=>m.id===trip.to)!.label} reserved ${trip.quantity*trip.price} 🪙 for the supplier and ${trip.pay} 🪙 for you.` : 'Cargo collected. Follow the marked destination.' : latest.kind==='recovery_returned' ? 'Recovered materials returned to stock.' : latest.kind==='delivered' ? `Delivery finished · +${trip?.pay??0} 🪙` : latest.kind==='delivery_cancelled' ? 'Delivery cancelled. Cargo returned; no delivery pay.' : latest.kind==='buy' ? `${good?.label??'Food'} added to your bag` : latest.kind==='sell' ? `Sold ${good?.label??'item'}` : latest.kind==='eat' ? `Ate ${good?.label??'food'}` : latest.kind==='start' ? `${job?.label??'Work'} started` : latest.kind==='paid' ? `Work finished · +${job?.pay??0} 🪙` : latest.kind==='cancel' ? 'Work cancelled; supplies and reserved wages returned' : why[latest.reason!]??'Action unavailable';}
  const primary=view==='market' ? buy : view==='work' ? work : view==='bag' ? pending ? shared : eat : acquireAction ? acquire : deposit;
  const actions=[buy,sell,work,eat,shared,declineShared,acquire,deposit,withdraw],focused=document.activeElement,enter=focused instanceof HTMLButtonElement && !focused.classList.contains('choice-card') ? actions.find(b=>b===focused) : primary;
  for(const b of actions){const key=b.querySelector<HTMLElement>('.action-key');if(key)key.hidden=b!==enter;if(b===enter)b.setAttribute('aria-keyshortcuts','Enter');else b.removeAttribute('aria-keyshortcuts');}
  text(document.querySelector<HTMLElement>('#activity-keys kbd')!,view==='business' ? '← →' : '↑ ↓');text(document.querySelector<HTMLElement>('#activity-keys span')!,view==='business' ? 'Amount' : 'Select');
  text(hint,primary.disabled && !primary.hidden ? primary.title : '');
  if(!panel.hidden && (focusView || hadMenuFocus && (!(document.activeElement instanceof HTMLElement) || !panel.contains(document.activeElement) || !document.activeElement.getClientRects().length))){focusView=false;if(view==='business' && ownedHere)amount.focus({preventScroll:true});else if(view==='business' || view==='work' && jobs.hidden)(!primary.hidden && !primary.disabled ? primary : closeButton).focus({preventScroll:true});else if(pending && view==='bag')shared.focus({preventScroll:true});else if(!(view==='market' ? goods : view==='work' ? jobs : meals).focus())closeButton.focus({preventScroll:true});}
  text(feedback,message===primary.title ? '' : message);text(toast,message);toast.hidden=!playing || !!view || !message;
 }
 return {get station(){return workstation(scene,stationGuide);},close,open:show,key,choose(name:'goods'|'jobs'|'meals',id:string){({goods,jobs,meals})[name].select(id);},resetChoices(){for(const cards of [goods,jobs,meals])cards.reset();},update};
}
