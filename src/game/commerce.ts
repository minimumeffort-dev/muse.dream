import {nearbySocial} from '../sim/social';
import {dayHour} from '../scene/daylight';
import {marketIsOpen,marketOpening,marketIsStaffed} from '../sim/market-hours';
import {jobInputs,type Market} from '../scene/commerce';
import type {Scene} from '../scene/schema';
import type {CarState} from '../sim/car';
import {milestoneProgress,nearbyMarket,commerceReason,deliveryTarget,repairTarget,type CommerceAction} from '../sim/commerce';

const why={seat:'Sit on a free paired bench with room for your companion',unfamiliar:'Talk to them first',cooldown:'They would like some time before another meal',unstaffed:'Waiting for staff to reach the counter',closed:'The counter is closed',qualification:'Complete the required practice first',funds:'Not enough credits',stock:'Sold out',full:'Your bag is full',sated:'You are already full',satiety:'Eat before starting work',busy:'Finish your current task or wait for a free place',range:'Walk closer',input:'Missing ingredients',treasury:'The business cannot pay',capacity:'The shelf is full',not_food:'This is not food',damage:'No reachable unclaimed damage in this work area'};
const hourText=(hour:number)=>{const minute=Math.floor(hour*60+1e-6)%1440;return `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;};
export function marketHoursText(scene:Pick<Scene,'daylight'>,market:Pick<Market,'hours'>,timeS:number,staffed=true):string{
 if(!market.hours)return '';
 const current=hourText(dayHour(scene.daylight!,timeS)),opening=marketOpening(scene,market,timeS);
 if(!opening)return `${current} · ${staffed ? 'Open until' : 'Waiting for staff · closes'} ${hourText(market.hours[1])}`;
 const seconds=Math.ceil(opening.seconds);
 return `${current} · Closed · opens ${hourText(opening.hour)} (${Math.floor(seconds/60)}m ${seconds%60}s)`;
}
export function commerceControls(scene:Scene,submit:(action:CommerceAction)=>void){
 const panel=document.querySelector<HTMLElement>('#commerce-panel')!,title=document.querySelector<HTMLElement>('#market-title')!,pocket=document.querySelector<HTMLElement>('#market-pocket')!,feedback=document.querySelector<HTMLElement>('#market-feedback')!,pausePocket=document.querySelector<HTMLElement>('#pocket-status')!;
 const goods=document.querySelector<HTMLSelectElement>('#market-good')!,jobs=document.querySelector<HTMLSelectElement>('#market-job')!,meals=document.querySelector<HTMLSelectElement>('#meal-good')!;
 const buy=document.querySelector<HTMLButtonElement>('#market-buy')!,work=document.querySelector<HTMLButtonElement>('#market-work')!,eat=document.querySelector<HTMLButtonElement>('#market-eat')!,progress=document.querySelector<HTMLElement>('#market-progress')!;
 const shared=document.querySelector<HTMLButtonElement>('#shared-meal')!;
 const objects=new Map(scene.objects.map(o=>[o.id,o]));
 const player=scene.economy?.accounts.find(a=>a.actor==='player'),definition=scene.economy;
 const stockLabel=document.querySelector<HTMLElement>('#market-stock')!;
 const sell=document.querySelector<HTMLButtonElement>('#market-sell')!,cancel=document.querySelector<HTMLButtonElement>('#market-cancel')!;cancel.addEventListener('click',()=>{if(!cancel.hidden && !panel.hidden)submit({kind:'cancel'});});
 let sellAction:CommerceAction|undefined,shareAction:CommerceAction|undefined;
 const share=()=>{if(shareAction && !shared.disabled && !panel.hidden)submit(shareAction);};shared.addEventListener('click',share);
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
 return {key(code:string){if(code==='KeyY')share();if(code==='KeyB')action('buy');if(code==='KeyH')action('work');if(code==='KeyG')action('eat');if(code==='KeyV')sellOne();},update(state:CarState,playing:boolean){
  if(state.economy===seenEconomy && playing===wasPlaying && state.control.kind===lastControl && state.timeS>=updatedAt && state.timeS-updatedAt<.1)return;
  seenEconomy=state.economy;wasPlaying=playing;lastControl=state.control.kind;updatedAt=state.timeS;
  const e=state.economy,a=player && e?.accounts.find(a=>a.id===player.id);if(!a || !definition){panel.hidden=pausePocket.hidden=true;return;}
  const inventory=definition.goods.filter(g=>a.inventory[g.id]!>0).map(g=>`${g.label} ×${a.inventory[g.id]}`).join(' · ');
  const cargo=a.delivery && definition.deliveries.find(d=>d.id===a.delivery!.id);
  const held=a.repair && definition.repairs.find(r=>r.id===a.repair!.id),planting=held?.regrow_s!==undefined;
  const nearbyGrowth=(state.growing??[]).map(p=>({p,o:objects.get(p.objectId)!})).map(v=>({...v,d:Math.hypot(v.o.x-state.x,v.o.y-state.y)})).filter(v=>v.d<=120).sort((a,b)=>a.d-b.d || a.o.id.localeCompare(b.o.id))[0];
  const growthMessage=nearbyGrowth ? `${nearbyGrowth.o.labelText??'Tree'} · growing ${Math.floor(nearbyGrowth.p.progressS/definition.repairs.find(r=>r.id===nearbyGrowth.p.serviceId)!.regrow_s!*100)}%. Give it room to grow.` : '';
  const balance=`${a.credits} cr · Fullness ${Math.round(a.satiety)}%${inventory ? ' · '+inventory : ''}${cargo ? ` · Cargo ${cargo.quantity} ${definition.goods.find(g=>g.id===cargo.good)!.label}` : ''}${a.repair ? ` · ${definition.goods.find(g=>g.id===held!.input)!.label} ×${held!.take}` : ''}`;
  text(pocket,balance);text(pausePocket,balance);pausePocket.hidden=false;
  const target=deliveryTarget(state,scene),repair=repairTarget(state,scene),companion=nearbySocial(state,scene),together=e!.shared,sharing=together && together.phase!=='home',social=definition.socials.find(s=>s.id===(together?.id??companion?.account.social));
  const companionName=objects.get(definition.accounts.find(a=>a.id===(together?.partner??companion?.account.id))?.actor??'')?.labelText??'your companion';
  const sharedMessage=sharing ? together.phase==='out' ? `${companionName} is coming over. Two portions reserved; stay seated.` : `Eating together · ${Math.max(0,together.eatUntilS!-state.timeS).toFixed(1)}s left` : together ? `${companionName} is returning to their routine.` : companion && social ? `${definition.goods.find(g=>g.id===social.good)!.label} ×2 · ${companionName}` : '';
  const m=nearbyMarket(state,scene),stock=m && e!.markets.find(s=>s.id===m.id)!,active=a.work && definition.jobs.find(j=>j.id===a.work!.id),latest=[...e!.events].reverse().find(event=>event.account===a.id && state.timeS-event.atS<4);
  panel.hidden=!playing || state.control.kind!=='foot' && !target && !repair || !(m || active || inventory || latest || target || repair || nearbyGrowth || companion || together);text(title,sharing ? 'Sharing a meal' : repair ? repair.repair.label : target ? 'Delivery' : m?.label??(nearbyGrowth ? 'Growing tree' : 'Your bag'));cancel.hidden=!(target || repair || sharing);text(cancel,sharing ? 'End meal' : repair ? planting ? 'Cancel planting' : 'Cancel repair' : 'Cancel delivery');
  text(stockLabel,m ? 'Stock · '+m.lots.map(l=>`${definition.goods.find(g=>g.id===l.good)!.label} ${stock!.stock[l.good]}`).join(' · ') : '');
  const repairs=definition.repairs.filter(r=>r.market===m?.id);
  const delivery=definition.deliveries.filter(d=>d.from===m?.id);
  const sold=m?.lots.filter(l=>l.price!==undefined)??[],tasks=definition.jobs.filter(j=>j.market===m?.id),food=definition.goods.filter(g=>g.food>0 && a.inventory[g.id]!>0);
  options(goods,sold.map(l=>({id:l.good,label:`${definition.goods.find(g=>g.id===l.good)!.label} · ${l.price} cr · ${stock!.stock[l.good]} left`})));
  options(jobs,[...tasks.map(j=>({id:'work:'+j.id,label:j.label})),...delivery.map(d=>({id:'delivery:'+d.id,label:d.label})),...repairs.map(r=>({id:'repair:'+r.id,label:r.label}))]);if(target || active || repair)jobs.hidden=true;options(meals,food.map(g=>({id:g.id,label:`${g.label} ×${a.inventory[g.id]}`})));
  const offer=sold.find(l=>l.good===goods.value),task=tasks.find(j=>'work:'+j.id===jobs.value),trip=delivery.find(d=>'delivery:'+d.id===jobs.value),meal=food.find(g=>g.id===meals.value),repairJob=repairs.find(r=>'repair:'+r.id===jobs.value);
  buyAction=m && offer ? {kind:'buy',market:m.id,good:offer.good} : undefined;workAction=repair ? {kind:'cancel'} : target ? {kind:'deliver'} : active ? {kind:'cancel'} : task ? {kind:'work',job:task.id} : trip ? {kind:'collect',delivery:trip.id} : repairJob ? {kind:'repair',repair:repairJob.id} : undefined;eatAction=meal ? {kind:'eat',good:meal.id} : undefined;
  sellAction=m && offer && a.inventory[offer.good]!>0 ? {kind:'sell',market:m.id,good:offer.good} : undefined;
  const button=(b:HTMLButtonElement,request:CommerceAction|undefined,label:string)=>{b.hidden=!request;b.disabled=!request || !!commerceReason(state,scene,a.id,request);text(b,label);b.title=request ? why[commerceReason(state,scene,a.id,request)!]??'' : '';};
  shareAction=sharing ? {kind:'cancel'} : companion ? {kind:'share',partner:companion.account.id} : undefined;
  button(shared,shareAction,sharing ? 'Y · End meal' : `Y · Share ${definition.goods.find(g=>g.id===social?.good)?.label.toLowerCase()??'food'} with ${companionName}`);
  if(sharing)cancel.hidden=true;
  button(buy,buyAction,`B · Buy ${definition.goods.find(g=>g.id===offer?.good)?.label??''} · ${offer?.price??0} cr`);
  button(sell,sellAction,`V · Sell ${definition.goods.find(g=>g.id===offer?.good)?.label??''} · ${offer?.price??0} cr`);
  button(work,workAction,repair ? planting ? 'H · Cancel planting' : 'H · Cancel repair' : target ? `H · Deliver · +${target.delivery.pay} cr` : active ? 'H · Cancel work' : `H · ${task?.label??trip?.label??repairJob?.label??'Work'} · +${task?.pay??trip?.pay??repairJob?.pay??0} cr`);
  button(eat,eatAction,`G · Eat ${meal?.label??'food'}`);
  if(shareAction?.kind==='share' && shared.disabled){const reason=commerceReason(state,scene,a.id,shareAction);shared.title=reason==='stock' ? 'Bring two portions in your bag' : reason==='sated' ? 'One of you is too full to eat' : shared.title;}
  const employees=definition.accounts.filter(s=>s.actor!=='player').map(s=>e!.accounts.find(a=>a.id===s.id)!).filter(a=>a.work && definition.jobs.find(j=>j.id===a.work!.id)?.market===m?.id);
  const recipeJob=active??task,recipe=recipeJob && jobInputs(recipeJob).map(i=>`${definition.goods.find(g=>g.id===i.good)!.label} ×${i.take}`).join(' + ')+` → ${definition.goods.find(g=>g.id===recipeJob.output)!.label} ×${recipeJob.make}`;
  const practice=task?.requires && milestoneProgress(state,scene,a.id,task.requires),practiceMessage=practice ? `${practice.milestone.label} · ${Math.min(practice.done,practice.milestone.count)}/${practice.milestone.count}${practice.done>=practice.milestone.count ? ' · unlocked' : ''}` : '';
  const activity=repair ? `${repair.task.phase==='work' ? Math.max(0,repair.repair.seconds-repair.task.progressS).toFixed(1)+'s left. Keep the space clear.' : 'Walk to '+(scene.objects.find(o=>o.id===repair.task.objectId)?.labelText??'the damaged object')+' · '+Math.ceil(Math.hypot(state.x-repair.x,state.y-repair.y)/10)+' m. Stand beside it to work.'}` : target ? `${target.delivery.quantity} ${definition.goods.find(g=>g.id===target.delivery.good)!.label} → ${target.market.label} · ${Math.ceil(Math.hypot(target.x-state.x,target.y-state.y)/10)} m. Hand over on foot.` : active ? `${active.label} · ${Math.max(0,a.work!.doneAtS-state.timeS).toFixed(1)}s left. Stay nearby.` : (task || trip || repairJob) && work.disabled ? why[commerceReason(state,scene,a.id,workAction!)!]??'' : employees.length ? `Staff · ${definition.jobs.find(j=>j.id===employees[0]!.work!.id)!.label} · ${Math.max(0,employees[0]!.work!.doneAtS-state.timeS).toFixed(1)}s left` : '';
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
  text(progress,[sharedMessage,service && marketHoursText(scene,service,state.timeS,marketIsStaffed(scene,service,e)),staffMessage,closed && !active ? undefined : recipe,diningMessage,!active && !target && !repair ? practiceMessage : undefined,courierMessage && !active && !target && !repair ? courierMessage : activity || (worker ? worker.a.repair!.phase==='home' ? 'Worker is returning to the market.' : worker.a.repair!.phase==='work' ? (definition.repairs.find(r=>r.id===worker.a.repair!.id)!.regrow_s!==undefined ? 'Worker is planting ' : 'Worker is repairing ')+(scene.objects.find(o=>o.id===worker.a.repair!.objectId)?.labelText??'the object')+'.' : 'Worker is walking to the work site.' : growthMessage)].filter(value=>value && value!==why.closed).join(' · '));
  let message='';if(latest){const good=definition.goods.find(g=>g.id===latest.ref),job=definition.jobs.find(j=>j.id===latest.ref),trip=definition.deliveries.find(d=>d.id===latest.ref),service=definition.repairs.find(r=>r.id===latest.ref),plant=service?.regrow_s!==undefined,supply=service && definition.goods.find(g=>g.id===service.input)!.label;message=latest.kind==='sharing' ? 'Invitation accepted. Your companion is coming over.' : latest.kind==='shared_meal' ? 'You shared a meal. They will remember it.' : latest.kind==='share_cancelled' ? 'Meal ended early. Both portions returned to your bag.' : latest.kind==='repair_started' ? `${supply??'Supplies'} collected. Walk to the work site.` : latest.kind==='repaired' ? `${plant ? 'Tree planted' : 'Repair finished'} · +${service?.pay??0} cr` : latest.kind==='repair_cancelled' ? `${plant ? 'Planting' : 'Repair'} cancelled. Supplies and reserved pay returned.` : latest.kind==='collected' ? trip?.price ? `Cargo collected. ${definition.markets.find(m=>m.id===trip.to)!.label} reserved ${trip.quantity*trip.price} cr for the supplier and ${trip.pay} cr for you.` : 'Cargo collected. Follow the marked destination.' : latest.kind==='delivered' ? `Delivery finished · +${trip?.pay??0} cr` : latest.kind==='delivery_cancelled' ? 'Delivery cancelled. Cargo returned; no delivery pay.' : latest.kind==='buy' ? `${good?.label??'Food'} added to your bag` : latest.kind==='sell' ? `Sold ${good?.label??'item'}` : latest.kind==='eat' ? `Ate ${good?.label??'food'}` : latest.kind==='start' ? `${job?.label??'Work'} started` : latest.kind==='paid' ? `Work finished · +${job?.pay??0} cr` : latest.kind==='cancel' ? 'Work cancelled; supplies and reserved wages returned' : why[latest.reason!]??'Action unavailable';}
  text(feedback,message);
 }};
}
