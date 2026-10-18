import {marketIsOpen,marketIsStaffed} from './market-hours';
import {stepStaffShifts,checkShiftState} from './shifts';
import {findSeat,worldSeats} from '../scene/seating';
import {seatAvailable} from './seating';
import {interactionSight} from './sight';
import {walkingHeight} from '../scene/interiors';
import {courierApproach,deliveryArea} from './courier';
import {workSegment,workPath} from './work-navigation';
import {advanceWorkJourney} from './work-journey';
import {z} from 'zod';
import {GROWTH_LIMITS} from '../scene/growth';
import {advanceGrowth} from './growth';
import type {CarState,CarInput} from './car';
import type {Scene} from '../scene/schema';
import {COMMERCE_LIMITS as L,jobInputs,jobTake,accountJobs,accountRepairs,deliveryBill,type Economy,type Market} from '../scene/commerce';
import {actorPose} from './actors';
import {repairArea,repairTargets,targetBroken,repairApproach,repairSegment,repairSpaceClear,REPAIR_REACH,REPAIR_SPEED,REPAIR_RADIUS} from './repair';
import {objectFragments} from '../scene/fragments';
import type {ObjectDslV2} from '../scene/object-dsl';

const id=z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),count=z.number().int().min(0).max(1e9),quantity=count.max(L.quantity),money=count.max(L.money),clock=z.number().finite().min(0).max(1e9);
const previousAccountState=z.object({id,credits:money,inventory:z.record(quantity),satiety:z.number().finite().min(0).max(100),decisionAtS:clock,work:z.object({id,doneAtS:clock}).strict().optional()}).strict();
const previousEvent=z.object({account:id,kind:z.enum(['buy','sell','eat','start','paid','cancel','blocked']),ref:id,atS:clock,reason:z.enum(['funds','stock','full','sated','satiety','busy','range','input','treasury','capacity','not_food']).optional()}).strict();
export const previousEconomyStateSchema=z.object({atS:clock,turn:count,accounts:z.array(previousAccountState).max(L.accounts),markets:z.array(z.object({id,credits:money,stock:z.record(quantity)}).strict()).max(L.markets),consumed:z.record(count),batches:z.record(count),events:z.array(previousEvent).max(12)}).strict();
const accountState=previousAccountState.extend({delivery:z.object({id,startedAtS:clock}).strict().optional()}).strict();
const event=previousEvent.extend({kind:z.enum(['buy','sell','eat','start','paid','cancel','blocked','collected','delivered','delivery_cancelled'])}).strict();
export const parkingEconomyStateSchema=previousEconomyStateSchema.extend({accounts:z.array(accountState).max(L.accounts),events:z.array(event).max(12),delivered:z.record(count)}).strict();
const point=z.object({x:z.number().finite().min(0).max(16384),y:z.number().finite().min(0).max(16384)}).strict();
const repairState=z.object({id,objectId:z.string().min(1).max(128),zoneId:z.string().min(1).max(128).optional(),phase:z.enum(['out','work','home']),at:point,x:point.shape.x,y:point.shape.y,headingRad:z.number().finite(),progressS:clock,speed:z.number().finite().min(0).max(REPAIR_SPEED),distance:clock,path:z.array(point).max(L.repairPath),routeAtS:clock}).strict();
export const priorGrowthEconomyStateSchema=parkingEconomyStateSchema.extend({accounts:z.array(accountState.extend({repair:repairState.optional(),repairSeen:z.object({objectId:z.string().min(1).max(128),zoneId:z.string().min(1).max(128).optional(),atS:clock}).strict().optional()}).strict()).max(L.accounts),repaired:z.record(count),events:z.array(event.extend({kind:z.enum([...event.shape.kind.options,'repair_started','repaired','repair_cancelled']),reason:z.enum([...previousEvent.shape.reason.unwrap().options,'damage']).optional()}).strict()).max(12)}).strict();
export const priorCourierEconomyStateSchema=priorGrowthEconomyStateSchema.extend({accounts:z.array(priorGrowthEconomyStateSchema.shape.accounts.element.extend({repairSeen:priorGrowthEconomyStateSchema.shape.accounts.element.shape.repairSeen.unwrap().extend({serviceId:id.optional()}).strict().optional()}).strict()).max(L.accounts)}).strict();
const courierState=repairState.omit({objectId:true,zoneId:true,progressS:true}).extend({phase:z.enum(['pickup','dropoff','home'])}).strict();
export const recipeEconomyStateSchema=priorCourierEconomyStateSchema.extend({accounts:z.array(priorCourierEconomyStateSchema.shape.accounts.element.extend({courier:courierState.optional()}).strict()).max(L.accounts),events:z.array(priorCourierEconomyStateSchema.shape.events.element.extend({kind:z.enum([...priorCourierEconomyStateSchema.shape.events.element.shape.kind.options,'courier_started'])}).strict()).max(12)}).strict();
const completions=z.object({work:z.record(count),delivery:z.record(count),repair:z.record(count)}).strict();
export const progressEconomyStateSchema=recipeEconomyStateSchema.extend({accounts:z.array(recipeEconomyStateSchema.shape.accounts.element.extend({completed:completions}).strict()).max(L.accounts),unattributed:completions,events:z.array(recipeEconomyStateSchema.shape.events.element.extend({reason:z.enum([...recipeEconomyStateSchema.shape.events.element.shape.reason.unwrap().options,'qualification']).optional()}).strict()).max(12)}).strict();
const mealState=courierState.omit({phase:true}).extend({id,market:id,phase:z.enum(['out','seat','eat','home']),home:point,eatUntilS:clock.optional(),seat:z.object({objectId:id,seatId:id}).strict().optional()}).strict();
export const mealEconomyStateSchema=progressEconomyStateSchema.extend({accounts:z.array(progressEconomyStateSchema.shape.accounts.element.extend({meal:mealState.omit({seat:true}).extend({phase:z.enum(['out','eat','home'])}).strict().optional()}).strict()).max(L.accounts)}).strict();
export const hoursEconomyStateSchema=progressEconomyStateSchema.extend({accounts:z.array(progressEconomyStateSchema.shape.accounts.element.extend({meal:mealState.optional()}).strict()).max(L.accounts),events:z.array(progressEconomyStateSchema.shape.events.element.extend({reason:z.enum([...progressEconomyStateSchema.shape.events.element.shape.reason.unwrap().options,'closed']).optional()}).strict()).max(12)}).strict();
const shiftState=courierState.extend({phase:z.enum(['out','rest','in'])}).strict();
export const economyStateSchema=hoursEconomyStateSchema.extend({accounts:z.array(hoursEconomyStateSchema.shape.accounts.element.extend({shift:shiftState.optional()}).strict()).max(L.accounts),events:z.array(hoursEconomyStateSchema.shape.events.element.extend({reason:z.enum([...hoursEconomyStateSchema.shape.events.element.shape.reason.unwrap().options,'unstaffed']).optional()}).strict()).max(12)}).strict();
export type EconomyState=z.infer<typeof economyStateSchema>;
export type CommerceAction={kind:'buy';market:string;good:string}|{kind:'sell';market:string;good:string}|{kind:'eat';good:string}|{kind:'work';job:string}|{kind:'collect';delivery:string}|{kind:'deliver'}|{kind:'cancel'}|{kind:'repair';repair:string};
type Account=EconomyState['accounts'][number];
type Reason=NonNullable<EconomyState['events'][number]['reason']>;
type Pose={x:number;y:number;elevation:number};
const cache=new WeakMap<Scene,ReturnType<typeof prepare>>();
function prepare(scene:Scene){
 const e=scene.economy!,objects=new Map(scene.objects.map(o=>[o.id,o]));
 return {e,goods:new Map(e.goods.map(g=>[g.id,g])),accounts:new Map(e.accounts.map(a=>[a.id,a])),markets:new Map(e.markets.map(m=>[m.id,m])),meals:new Map(e.meals.map(m=>[m.id,m])),jobs:new Map(e.jobs.map(j=>[j.id,j])),deliveries:new Map(e.deliveries.map(d=>[d.id,d])),repairs:new Map(e.repairs.map(r=>[r.id,r])),repairTargets:new Map(e.repairs.map(r=>[r.id,repairTargets(scene,r)])),objects,
  places:new Map(e.markets.map(m=>[m.id,actorPose(scene,objects.get(m.actor)!,0)]))};
}
function data(scene:Scene){let c=cache.get(scene);if(!c){c=prepare(scene);cache.set(scene,c);}return c;}
function emptyCompletions(e:Economy){return {work:Object.fromEntries(e.jobs.map(j=>[j.id,0])),delivery:Object.fromEntries(e.deliveries.map(d=>[d.id,0])),repair:Object.fromEntries(e.repairs.map(r=>[r.id,0]))};}
/** Old totals did not retain ownership. Preserve them without guessing who earned them. */
export function withPersonalHistory(e:Omit<EconomyState,'accounts'|'unattributed'> & {accounts:Omit<Account,'completed'>[]}):EconomyState{return {...e,accounts:e.accounts.map(a=>({...a,completed:{work:Object.fromEntries(Object.keys(e.batches).map(id=>[id,0])),delivery:Object.fromEntries(Object.keys(e.delivered).map(id=>[id,0])),repair:Object.fromEntries(Object.keys(e.repaired).map(id=>[id,0]))}})),unattributed:{work:{...e.batches},delivery:{...e.delivered},repair:{...e.repaired}}};}
export function milestoneProgress(state:Pick<CarState,'economy'>,scene:Pick<Scene,'economy'>,account:string,required:string){const m=scene.economy?.milestones.find(m=>m.id===required),a=state.economy?.accounts.find(a=>a.id===account);return m && a ? {milestone:m,done:a.completed[m.kind][m.task]??0} : undefined;}
export function hasMilestone(state:Pick<CarState,'economy'>,scene:Pick<Scene,'economy'>,account:string,required:string){const p=milestoneProgress(state,scene,account,required);return !!p && p.done>=p.milestone.count;}
export function initialEconomy(scene:Pick<Scene,'economy'>,timeS=0):EconomyState|undefined{
 const e=scene.economy;if(!e)return;
 return {atS:timeS,turn:0,accounts:e.accounts.map(a=>({id:a.id,credits:a.credits,inventory:Object.fromEntries(e.goods.map(g=>[g.id,0])),satiety:a.satiety,decisionAtS:timeS,completed:emptyCompletions(e)})),unattributed:emptyCompletions(e),markets:e.markets.map(m=>({id:m.id,credits:m.credits,stock:Object.fromEntries(m.lots.map(l=>[l.good,l.quantity]))})),consumed:Object.fromEntries(e.goods.map(g=>[g.id,0])),batches:Object.fromEntries(e.jobs.map(j=>[j.id,0])),delivered:Object.fromEntries(e.deliveries.map(d=>[d.id,0])),repaired:Object.fromEntries(e.repairs.map(r=>[r.id,0])),events:[]};
}
function ownerPose(state:CarState,scene:Scene,account:Account):Pose|undefined{
 const c=data(scene),owner=c.accounts.get(account.id)!;
 return owner.actor==='player' ? state.control.kind==='foot' && !state.seated && state.grounded && state.surface!=='water' ? state : undefined : actorPose(scene,c.objects.get(owner.actor)!,state.timeS,state);
}
function inReach(state:CarState,scene:Scene,account:Account,market:Market):boolean{
 const p=ownerPose(state,scene,account),q=data(scene).places.get(market.id)!;
 if(!p || Math.hypot(p.x-q.x,p.y-q.y,p.elevation-q.elevation)>market.radius)return false;
 return interactionSight(scene,p,q,state,market.actor);
}
const active=(e:EconomyState,job:string)=>e.accounts.filter(a=>a.work?.id===job).length;
function reserved(e:EconomyState,definition:Economy,market:string,good?:string){
 let n=0;for(const a of e.accounts)if(a.repair && a.repair.phase!=='home'){const r=definition.repairs.find(r=>r.id===a.repair!.id)!;if(r.market===market)n+=good===undefined ? r.pay : r.input===good ? r.take : 0;}
 for(const a of e.accounts)if(a.work){const j=definition.jobs.find(j=>j.id===a.work!.id)!;if(j.market===market)n+=good===undefined ? j.pay : jobTake(j,good!)+(j.output===good ? j.make : 0);}
 for(const a of e.accounts)if(a.delivery){const d=definition.deliveries.find(d=>d.id===a.delivery!.id)!;n+=good===undefined ? (d.to===market ? d.pay+deliveryBill(d) : d.from===market ? deliveryBill(d) : 0) : (d.from===market || d.to===market) && d.good===good ? d.quantity : 0;}
 return n;
}
function deliveryCommitments(e:EconomyState,id:string,except?:Account){return e.accounts.filter(a=>a!==except && (a.delivery?.id===id || a.courier?.id===id && a.courier.phase==='pickup')).length;}
function collectionReason(scene:Scene,e:EconomyState,a:Account,id:string,timeS:number):Reason|undefined{
 const c=data(scene),d=c.deliveries.get(id);if(!d)return 'range';
 if(!marketIsOpen(scene,c.markets.get(d.from)!,timeS))return 'closed';
 if(!marketIsStaffed(scene,c.markets.get(d.from)!,e))return 'unstaffed';
 const from=e.markets.find(m=>m.id===d.from)!,to=e.markets.find(m=>m.id===d.to)!,lot=c.markets.get(d.to)!.lots.find(l=>l.good===d.good)!;
 const n=deliveryCommitments(e,d.id,a);if(e.delivered[d.id]!+n>=1e9)return 'capacity';if(n>=d.capacity)return 'busy';
 if(from.stock[d.good]!<d.quantity)return 'stock';
 if(Object.values(a.inventory).reduce((n,v)=>n+v,0)+d.quantity>c.accounts.get(a.id)!.capacity)return 'full';
 if(to.credits<d.pay+deliveryBill(d) || from.credits+reserved(e,c.e,d.from)+deliveryBill(d)>L.money || a.credits+d.pay>L.money)return 'treasury';
 if(to.stock[d.good]!+reserved(e,c.e,d.to,d.good)+d.quantity>lot.limit)return 'capacity';
}
export function repairOffer(state:CarState,scene:Scene,e:EconomyState,a:Account,id:string){
 const c=data(scene),r=c.repairs.get(id),p=ownerPose(state,scene,a);if(!r || !p)return;
 const targets=c.repairTargets.get(r.id)!.filter(t=>targetBroken(state,t) && !e.accounts.some(a=>a.repair && a.repair.phase!=='home' && a.repair.objectId===t.objectId && a.repair.zoneId===t.zoneId)).sort((a,b)=>Math.hypot(a.contact.x-p.x,a.contact.y-p.y)-Math.hypot(b.contact.x-p.x,b.contact.y-p.y) || (a.objectId<b.objectId ? -1 : a.objectId>b.objectId ? 1 : 0));
 for(const target of targets){const approach=repairApproach(scene,r,target,p,state);if(approach)return {target,...approach};}
}
export function repairTarget(state:CarState,scene:Scene){const c=scene.economy && data(scene),a=c && state.economy?.accounts.find(a=>c.accounts.get(a.id)!.actor==='player'),task=a?.repair,r=task && c!.repairs.get(task.id);return task && r ? {task,repair:r,x:task.at.x,y:task.at.y} : undefined;}
function purchaseReason(scene:Scene,e:EconomyState,a:Account,market:string,good:string,timeS:number):Reason|undefined{
 const c=data(scene),m=c.markets.get(market),stock=e.markets.find(s=>s.id===market),lot=m?.lots.find(l=>l.good===good);
 if(m && !marketIsOpen(scene,m,timeS))return 'closed';
 if(m && !marketIsStaffed(scene,m,e))return 'unstaffed';
 if(!stock || !lot?.price || !stock.stock[good])return 'stock';
 if(a.credits<lot.price)return 'funds';
 if(Object.values(a.inventory).reduce((n,v)=>n+v,0)>=c.accounts.get(a.id)!.capacity)return 'full';
 if(stock.credits+reserved(e,c.e,market)+lot.price>L.money)return 'treasury';
}
function reason(state:CarState,scene:Scene,e:EconomyState,a:Account,action:CommerceAction):Reason|undefined{
 const c=data(scene),definition=c.accounts.get(a.id)!;
 if(action.kind==='cancel')return a.work || a.delivery || a.repair && a.repair.phase!=='home' ? undefined : 'busy';
 if(definition.actor==='player' && state.seated && action.kind!=='eat')return 'busy';
 if(definition.actor==='player' && !ownerPose(state,scene,a) && !(state.seated && action.kind==='eat'))return 'range';
 if(action.kind==='deliver'){
  const d=a.delivery && c.deliveries.get(a.delivery.id);if(!d || !inReach(state,scene,a,c.markets.get(d.to)!))return 'range';
  if(!marketIsOpen(scene,c.markets.get(d.to)!,state.timeS))return 'closed';
  return marketIsStaffed(scene,c.markets.get(d.to)!,e) ? undefined : 'unstaffed';
 }
 if(a.shift && (a.shift.phase!=='rest' || !['eat','buy','sell'].includes(action.kind)))return 'busy';
 if(a.meal && !(a.meal.phase==='out' && action.kind==='buy' && action.market===a.meal.market && action.good===c.meals.get(a.meal.id)!.good || a.meal.phase==='eat' && action.kind==='eat' && action.good===c.meals.get(a.meal.id)!.good))return 'busy';
 if(a.work || a.repair || a.courier && !(action.kind==='collect' && a.courier.phase==='pickup' && a.courier.id===action.delivery) || a.delivery && action.kind!=='eat')return 'busy';
 if(action.kind==='repair'){
  const r=c.repairs.get(action.repair);if(!r || !inReach(state,scene,a,c.markets.get(r.market)!))return 'range';
  const market=e.markets.find(m=>m.id===r.market)!;if(a.satiety<r.effort)return 'satiety';if(Object.values(a.inventory).reduce((n,v)=>n+v,0)+r.take>definition.capacity)return 'full';if(market.stock[r.input]!<r.take)return 'input';if(market.credits<r.pay || a.credits+r.pay>L.money)return 'treasury';
  if(r.regrow_s!==undefined && (state.growing?.length??0)+e.accounts.filter(a=>a.repair && a.repair.phase!=='home' && c.repairs.get(a.repair.id)!.regrow_s!==undefined).length>=GROWTH_LIMITS.plants)return 'capacity';
  if(e.repaired[r.id]!+e.accounts.filter(a=>a.repair?.id===r.id && a.repair.phase!=='home').length>=1e9)return 'capacity';
  return repairOffer(state,scene,e,a,r.id) ? undefined : 'damage';
 }
 if(action.kind==='collect'){
  const d=c.deliveries.get(action.delivery);if(!d || !inReach(state,scene,a,c.markets.get(d.from)!))return 'range';
  return collectionReason(scene,e,a,d.id,state.timeS);
 }
 if(action.kind==='eat'){
  if(!(c.goods.get(action.good)?.food))return 'not_food';
  if(!a.inventory[action.good])return 'stock';
  if(e.consumed[action.good]!>=1e9)return 'capacity';
  return a.satiety>=100 ? 'sated' : undefined;
 }
 const m=action.kind==='buy' || action.kind==='sell' ? c.markets.get(action.market) : c.markets.get(c.jobs.get(action.job)?.market??'');
 if(!m || !inReach(state,scene,a,m))return 'range';
 if(!marketIsOpen(scene,m,state.timeS))return 'closed';
 if(!marketIsStaffed(scene,m,e))return 'unstaffed';
 const stock=e.markets.find(s=>s.id===m.id)!;
 if(action.kind==='sell'){
  const lot=m.lots.find(l=>l.good===action.good);if(!lot?.price || !a.inventory[action.good])return 'stock';
  if(stock.credits<lot.price || a.credits+lot.price>L.money)return 'treasury';
  if(stock.stock[action.good]!+reserved(e,c.e,m.id,action.good)+1>lot.limit)return 'capacity';
 }else if(action.kind==='buy'){
  return purchaseReason(scene,e,a,m.id,action.good,state.timeS);
 }else{
  const j=c.jobs.get(action.job)!;
  if(j.requires && !hasMilestone({economy:e},scene,a.id,j.requires))return 'qualification';
  if(e.batches[j.id]!+active(e,j.id)>=1e9)return 'capacity';
  if(a.satiety<j.effort)return 'satiety';
  if(active(e,j.id)>=j.capacity)return 'busy';
  if(jobInputs(j).some(i=>stock.stock[i.good]!<i.take))return 'input';
  if(stock.credits<j.pay || a.credits+j.pay>L.money)return 'treasury';
  const lot=m.lots.find(l=>l.good===j.output)!;
  if(stock.stock[j.output]!+reserved(e,c.e,m.id,j.output)+j.make>lot.limit)return 'capacity';
 }
}
export function commerceReason(state:CarState,scene:Scene,account:string,action:CommerceAction):Reason|undefined{
 const a=state.economy?.accounts.find(a=>a.id===account);return a ? reason(state,scene,state.economy!,a,action) : 'range';
}
export function nearbyMarket(state:CarState,scene:Scene):Market|undefined{
 if(!scene.economy || !state.economy)return;
 const c=data(scene),account=state.economy.accounts.find(a=>c.accounts.get(a.id)!.actor==='player')!,p=ownerPose(state,scene,account);if(!p)return;
 return c.e.markets.filter(m=>inReach(state,scene,account,m)).sort((a,b)=>{const x=c.places.get(a.id)!,y=c.places.get(b.id)!;return Math.hypot(x.x-p.x,x.y-p.y)-Math.hypot(y.x-p.x,y.y-p.y) || (a.id<b.id ? -1 : a.id>b.id ? 1 : 0);})[0];
}
export function deliveryTarget(state:CarState,scene:Scene){
 if(!state.economy || !scene.economy)return;
 const c=data(scene),a=state.economy.accounts.find(a=>c.accounts.get(a.id)!.actor==='player'),d=a?.delivery && c.deliveries.get(a.delivery.id);
 return d ? {delivery:d,market:c.markets.get(d.to)!,...c.places.get(d.to)!} : undefined;
}
/** Shared transactions own every deduction, reservation, refund and completion. */
export function stepCommerce(state:CarState,input:Pick<CarInput,'commerce'>,dt:number,scene:Scene):CarState{
 if(!scene.economy)return state;
 const c=data(scene),old=state.economy??initialEconomy(scene,state.timeS-dt)!,player=old.accounts.find(a=>c.accounts.get(a.id)!.actor==='player')!;
 const interrupted=player.work && (state.seated || !inReach(state,scene,player,c.markets.get(c.jobs.get(player.work.id)!.market)!)) || player.repair?.phase==='work' && !!state.seated;
 const lostSeat=old.accounts.some(a=>a.meal?.seat && state.broken.includes(a.meal.seat.objectId));
 if(state.economy && !input.commerce && !interrupted && !lostSeat && state.timeS-old.atS<L.decisionS-1e-8)return state;
 const now=state.timeS,e:EconomyState={...old,atS:now,turn:(old.turn+1)%old.accounts.length,accounts:old.accounts.map(a=>({...a,completed:{work:{...a.completed.work},delivery:{...a.completed.delivery},repair:{...a.completed.repair}},inventory:{...a.inventory},...(a.shift ? {shift:{...a.shift,at:{...a.shift.at},path:a.shift.path.map(p=>({...p}))}} : {}),...(a.meal ? {meal:{...a.meal,home:{...a.meal.home},at:{...a.meal.at},path:a.meal.path.map(p=>({...p}))}} : {}),...(a.work ? {work:{...a.work}} : {}),...(a.repair ? {repair:{...a.repair,path:a.repair.path.map(p=>({...p}))}} : {}),...(a.courier ? {courier:{...a.courier,path:a.courier.path.map(p=>({...p})),at:{...a.courier.at}}} : {}),satiety:Math.max(0,a.satiety-(now-old.atS)*c.accounts.get(a.id)!.drainPerS)})),markets:old.markets.map(m=>({...m,stock:{...m.stock}})),consumed:{...old.consumed},batches:{...old.batches},delivered:{...old.delivered},repaired:{...old.repaired},events:[...old.events]};
 let current:CarState=advanceGrowth({...state,economy:e},now-old.atS,scene);
 const report=(a:Account,kind:EconomyState['events'][number]['kind'],ref:string,why?:Reason)=>{e.events.push({account:a.id,kind,ref,atS:now,...(why ? {reason:why} : {})});e.events=e.events.slice(-12);};
 const cancel=(a:Account)=>{const j=c.jobs.get(a.work!.id)!,m=e.markets.find(m=>m.id===j.market)!;for(const i of jobInputs(j))m.stock[i.good]!+=i.take;m.credits+=j.pay;a.work=undefined;report(a,'cancel',j.id);};
 for(const a of e.accounts)if(a.work){
  const j=c.jobs.get(a.work.id)!,m=e.markets.find(m=>m.id===j.market)!;
  if(c.accounts.get(a.id)!.actor==='player' && state.seated || !inReach(state,scene,a,c.markets.get(j.market)!)){cancel(a);continue;}
  if(now+1e-8>=a.work.doneAtS){m.stock[j.output]!+=j.make;a.credits+=j.pay;a.satiety=Math.max(0,a.satiety-j.effort);e.batches[j.id]!++;a.completed.work[j.id]!++;a.work=undefined;report(a,'paid',j.id);}
 }
 current=stepStaffShifts(current,now-old.atS,scene);
 const finishRepair=(a:Account,refund:boolean)=>{const t=a.repair!,r=c.repairs.get(t.id)!,m=e.markets.find(m=>m.id===r.market)!;if(refund){m.stock[r.input]!+=r.take;m.credits+=r.pay;report(a,'repair_cancelled',r.id);}else{a.credits+=r.pay;a.satiety=Math.max(0,a.satiety-r.effort);e.repaired[r.id]!++;a.completed.repair[r.id]!++;current={...current,broken:current.broken.filter(id=>id!==t.objectId || t.zoneId!==undefined),brokenZones:current.brokenZones.filter(z=>z.objectId!==t.objectId || z.zoneId!==t.zoneId),debris:current.debris.filter(p=>p.objectId!==t.objectId || t.zoneId!==undefined && !objectFragments(c.objects.get(t.objectId)!.spec as ObjectDslV2).some(f=>f.id===p.fragmentId && f.zone===t.zoneId))};if(r.regrow_s!==undefined)current={...current,growing:[...(current.growing??[]),{objectId:t.objectId,serviceId:r.id,plantedAtS:now,progressS:0}]};report(a,'repaired',r.id);}
  if(c.accounts.get(a.id)!.actor==='player')a.repair=undefined;else{t.phase='home';t.progressS=0;t.path=[];t.routeAtS=0;}
 };
 for(const a of e.accounts)if(a.repair){
  const t=a.repair,r=c.repairs.get(t.id)!,definition=c.accounts.get(a.id)!,object=c.objects.get(definition.actor),target=c.repairTargets.get(r.id)!.find(o=>o.objectId===t.objectId && o.zoneId===t.zoneId)!;
  if(t.phase!=='home' && !targetBroken(current,t)){finishRepair(a,true);continue;}
  const npc=definition.actor!=='player',end=t.phase==='home' ? object! : t.at;
  if(npc){
   advanceWorkJourney(t,end,repairArea(scene,r),current,now-old.atS,scene);
   if(t.phase==='home'){if(Math.hypot(t.x-object!.x,t.y-object!.y)<.1){a.repair=undefined;current={...current,npcs:current.npcs.map(n=>n.id===object!.id ? {...n,headingRad:t.headingRad} : n)};}continue;}
  }
  const p=npc ? t : ownerPose(current,scene,a),atWork=!!p && (npc ? t.path.length===0 : Math.hypot(current.vx,current.vy)<2) && Math.hypot(p.x-target.contact.x,p.y-target.contact.y)<=target.contact.r+REPAIR_REACH && Math.abs(walkingHeight(scene,p.x,p.y)-walkingHeight(scene,target.contact.x,target.contact.y))<4;
  if(atWork){t.phase='work';if(npc)t.headingRad=Math.atan2(target.contact.y-t.y,target.contact.x-t.x);t.progressS=Math.min(r.seconds,t.progressS+now-old.atS);if(t.progressS+1e-8>=r.seconds && repairSpaceClear(scene,target,current,r.regrow_s!==undefined ? r.seed_scale??GROWTH_LIMITS.seedScale : 1))finishRepair(a,false);}else t.phase='out';
 }
 const perform=(a:Account,action:CommerceAction)=>{
  if(action.kind==='cancel'){
   if(a.repair && a.repair.phase!=='home')finishRepair(a,true);
   if(a.work)cancel(a);
   if(a.delivery){const d=c.deliveries.get(a.delivery.id)!;e.markets.find(m=>m.id===d.from)!.stock[d.good]!+=d.quantity;e.markets.find(m=>m.id===d.to)!.credits+=d.pay+deliveryBill(d);a.delivery=undefined;report(a,'delivery_cancelled',d.id);}
   return;
  }
  const blocked=reason(current,scene,e,a,action);
  if(blocked){if(a.id===player.id)report(a,'blocked','action',blocked);return;}
  if(action.kind==='repair'){const r=c.repairs.get(action.repair)!,offer=repairOffer(current,scene,e,a,r.id)!,p=ownerPose(current,scene,a)!,m=e.markets.find(m=>m.id===r.market)!;m.stock[r.input]!-=r.take;m.credits-=r.pay;const npc=c.accounts.get(a.id)!.actor!=='player';a.repairSeen=undefined;a.repair={id:r.id,objectId:offer.target.objectId,...(offer.target.zoneId ? {zoneId:offer.target.zoneId} : {}),phase:'out',at:offer.end,x:npc ? p.x : offer.end.x,y:npc ? p.y : offer.end.y,headingRad:0,distance:0,progressS:0,speed:0,path:npc ? offer.path : [],routeAtS:now};report(a,'repair_started',r.id);return;}
  if(action.kind==='collect'){const d=c.deliveries.get(action.delivery)!;e.markets.find(m=>m.id===d.from)!.stock[d.good]!-=d.quantity;e.markets.find(m=>m.id===d.to)!.credits-=d.pay+deliveryBill(d);a.delivery={id:d.id,startedAtS:now};report(a,'collected',d.id);return;}
  if(action.kind==='deliver'){const d=c.deliveries.get(a.delivery!.id)!;e.markets.find(m=>m.id===d.to)!.stock[d.good]!+=d.quantity;e.markets.find(m=>m.id===d.from)!.credits+=deliveryBill(d);a.credits+=d.pay;a.delivery=undefined;e.delivered[d.id]!++;a.completed.delivery[d.id]!++;report(a,'delivered',d.id);return;}
  if(action.kind==='eat'){a.inventory[action.good]!--;a.satiety=Math.min(100,a.satiety+c.goods.get(action.good)!.food);e.consumed[action.good]!++;report(a,'eat',action.good);return;}
  if(action.kind==='buy'){const m=e.markets.find(m=>m.id===action.market)!,lot=c.markets.get(m.id)!.lots.find(l=>l.good===action.good)!;a.credits-=lot.price!;m.credits+=lot.price!;m.stock[action.good]!--;a.inventory[action.good]!++;report(a,'buy',action.good);return;}
  if(action.kind==='sell'){const m=e.markets.find(m=>m.id===action.market)!,lot=c.markets.get(m.id)!.lots.find(l=>l.good===action.good)!;a.credits+=lot.price!;m.credits-=lot.price!;m.stock[action.good]!++;a.inventory[action.good]!--;report(a,'sell',action.good);return;}
  const j=c.jobs.get(action.job)!,m=e.markets.find(m=>m.id===j.market)!;for(const i of jobInputs(j))m.stock[i.good]!-=i.take;m.credits-=j.pay;a.work={id:j.id,doneAtS:now-dt+j.seconds};report(a,'start',j.id);
 };
 const returnCourier=(a:Account)=>{const t=a.courier!,home=c.objects.get(c.accounts.get(a.id)!.actor)!;t.phase='home';t.at={x:home.x,y:home.y};t.path=[];t.routeAtS=0;};
 for(const a of e.accounts)if(a.courier){
  const t=a.courier,d=c.deliveries.get(t.id)!,home=c.objects.get(c.accounts.get(a.id)!.actor)!;
  advanceWorkJourney(t,t.at,deliveryArea(d),current,now-old.atS,scene);
  if(Math.hypot(t.x-t.at.x,t.y-t.at.y)>.1)continue;
  if(t.phase==='home'){a.courier=undefined;current={...current,npcs:current.npcs.map(n=>n.id===home.id ? {...n,headingRad:t.headingRad} : n)};continue;}
  if(t.phase==='pickup'){
   const blocked=reason(current,scene,e,a,{kind:'collect',delivery:d.id});if(blocked==='closed' || blocked==='unstaffed')continue;
   const onward=courierApproach(scene,d,d.to,t,current);
   if(!onward || reason(current,scene,e,a,{kind:'collect',delivery:d.id})){returnCourier(a);continue;}
   perform(a,{kind:'collect',delivery:d.id});t.phase='dropoff';t.at=onward.end;t.path=onward.path;t.routeAtS=now;continue;
  }
  perform(a,{kind:'deliver'});if(!a.delivery)returnCourier(a);
 }
 for(const a of e.accounts)if(a.meal){
  const t=a.meal,m=c.meals.get(t.id)!,area=deliveryArea(m);
  const returnHome=()=>{t.phase='home';t.at={...t.home};t.path=[];t.routeAtS=0;t.eatUntilS=undefined;t.seat=undefined;};
  if(t.seat && current.broken.includes(t.seat.objectId)){t.seat=undefined;if(t.phase==='seat'){t.phase='eat';t.at={x:t.x,y:t.y};t.path=[];t.eatUntilS=now+m.eat_s;}}
  if(t.phase==='eat'){t.speed=0;if(now+1e-8>=t.eatUntilS!){perform(a,{kind:'eat',good:m.good});returnHome();}continue;}
  advanceWorkJourney(t,t.at,area,current,now-old.atS,scene);
  if(Math.hypot(t.x-t.at.x,t.y-t.at.y)>.1)continue;
  if(t.phase==='home'){a.meal=undefined;continue;}
  if(t.phase==='seat'){t.phase='eat';t.x=t.at.x;t.y=t.at.y;t.path=[];t.speed=0;t.eatUntilS=now+m.eat_s;continue;}
  if(reason(current,scene,e,a,{kind:'buy',market:t.market,good:m.good})){returnHome();continue;}
  perform(a,{kind:'buy',market:t.market,good:m.good});
  const offer=worldSeats(scene).filter(s=>m.seats?.includes(s.objectId) && seatAvailable(scene,current,s,a.id)).map(seat=>({seat,path:workPath(scene,area,t,seat.approach,current)})).find(o=>o.path && workPath(scene,area,o.seat.approach,t.home,current));
  if(offer){t.seat={objectId:offer.seat.objectId,seatId:offer.seat.seatId};t.phase='seat';t.at={...offer.seat.approach};t.path=offer.path!;t.routeAtS=now;}
  else{t.phase='eat';t.speed=0;t.eatUntilS=now+m.eat_s;}
 }
 // Rotating stable account order resolves contention independently of rendering order.
 for(let i=0;i<e.accounts.length;i++){
  const a=e.accounts[(i+old.turn)%e.accounts.length]!,spec=c.accounts.get(a.id)!;
  if(spec.actor==='player'){if(input.commerce)perform(a,input.commerce);continue;}
  if(now+1e-8<a.decisionAtS || a.work || a.delivery || a.repair || a.courier || a.meal || a.shift && a.shift.phase!=='rest')continue;a.decisionAtS=now+1;
  if(a.satiety<=40){
   const food=c.e.goods.find(g=>g.food>0 && a.inventory[g.id]!>0);if(food){perform(a,{kind:'eat',good:food.id});continue;}
   if(spec.meal){const meal=c.meals.get(spec.meal)!,p=ownerPose(current,scene,a)!;
    for(const market of meal.markets){if(purchaseReason(scene,e,a,market,meal.good,now))continue;const offer=courierApproach(scene,meal,market,p,current);if(!offer || !workPath(scene,deliveryArea(meal),offer.end,p,current))continue;
     a.meal={id:meal.id,market,phase:'out',home:{x:p.x,y:p.y},at:offer.end,x:p.x,y:p.y,headingRad:actorPose(scene,c.objects.get(spec.actor)!,now,current).headingRad,distance:0,speed:0,path:offer.path,routeAtS:now};break;
    }if(a.meal)continue;
   }
   if(spec.shop){const purchase=c.e.markets.flatMap(m=>m.lots.filter(l=>l.price && c.goods.get(l.good)!.food>0).map(l=>({kind:'buy' as const,market:m.id,good:l.good}))).find(action=>!reason(current,scene,e,a,action));if(purchase){perform(a,purchase);continue;}}
  }
  if(a.shift || spec.shift && !marketIsOpen(scene,c.markets.get(c.e.shifts.find(s=>s.id===spec.shift)!.market)!,now))continue;
  const services=accountRepairs(spec);if(services.length){const id=services.find(id=>spec.repairs || spec.deliveries ? !reason(current,scene,e,a,{kind:'repair',repair:id}) : !!repairOffer(current,scene,e,a,id)),offer=id && repairOffer(current,scene,e,a,id);if(!offer)a.repairSeen=undefined;else{const {target}=offer;if(a.repairSeen?.objectId!==target.objectId || a.repairSeen.zoneId!==target.zoneId || (a.repairSeen.serviceId??services[0])!==id)a.repairSeen={...(spec.repairs ? {serviceId:id!} : {}),objectId:target.objectId,...(target.zoneId ? {zoneId:target.zoneId} : {}),atS:now};if(now-a.repairSeen.atS+1e-8>=c.repairs.get(id as string)!.dispatch_s)perform(a,{kind:'repair',repair:id as string});continue;}}
  for(const id of spec.deliveries??[]){
   if(collectionReason(scene,e,a,id,now))continue;const d=c.deliveries.get(id)!,p=ownerPose(current,scene,a)!,offer=courierApproach(scene,d,d.from,p,current);if(!offer)continue;
   a.courier={id,phase:'pickup',at:offer.end,x:p.x,y:p.y,headingRad:c.objects.get(spec.actor)!.headingRad??0,distance:0,speed:0,path:offer.path,routeAtS:now};a.repairSeen=undefined;report(a,'courier_started',id);break;
  }
  if(a.courier)continue;
  for(const id of accountJobs(spec)){const j=c.jobs.get(id)!,m=e.markets.find(m=>m.id===j.market)!;if(m.stock[j.output]!+reserved(e,c.e,m.id,j.output)<j.target && !reason(current,scene,e,a,{kind:'work',job:id})){perform(a,{kind:'work',job:id});break;}}
 }
 return current;
}

/** Restore also checks conservation, so malformed jobs cannot mint wages or material. */
export function checkEconomyState(state:CarState,scene:Scene):void{
 const d=scene.economy,e=state.economy;if(!d){if(e || state.growing?.length)throw Error('World has no economy');return;}if(!e)throw Error('Missing economy');
 const ids=(actual:string[],expected:string[])=>actual.length===expected.length && new Set(actual).size===actual.length && actual.every(id=>expected.includes(id));
 if(!ids(e.accounts.map(a=>a.id),d.accounts.map(a=>a.id)) || !ids(e.markets.map(m=>m.id),d.markets.map(m=>m.id)) || !ids(Object.keys(e.consumed),d.goods.map(g=>g.id)) || !ids(Object.keys(e.batches),d.jobs.map(j=>j.id)) || !ids(Object.keys(e.delivered),d.deliveries.map(j=>j.id)) || !ids(Object.keys(e.repaired),d.repairs.map(r=>r.id)))throw Error('Unknown economy members');
 for(const kind of ['work','delivery','repair'] as const){
  const total=kind==='work' ? e.batches : kind==='delivery' ? e.delivered : e.repaired;
  if([e.unattributed,...e.accounts.map(a=>a.completed)].some(r=>Object.values(r[kind]).some(n=>!Number.isInteger(n) || n<0 || n>1e9)))throw Error('Invalid personal completion count');
  if(!ids(Object.keys(e.unattributed[kind]),Object.keys(total)) || e.accounts.some(a=>!ids(Object.keys(a.completed[kind]),Object.keys(total))))throw Error('Unknown personal completion members');
  for(const id of Object.keys(total))if(e.unattributed[kind][id]!+e.accounts.reduce((n,a)=>n+a.completed[kind][id]!,0)!==total[id])throw Error('Personal completions are not conserved');
 }
 if(e.atS>state.timeS+1e-6 || state.timeS-e.atS>L.decisionS+1e-6 || e.turn>=e.accounts.length)throw Error('Invalid economy clock');
 for(const a of e.accounts){const spec=d.accounts.find(s=>s.id===a.id)!;if(!ids(Object.keys(a.inventory),d.goods.map(g=>g.id)) || Object.values(a.inventory).reduce((n,v)=>n+v,0)>spec.capacity || a.decisionAtS>state.timeS+1.01)throw Error('Invalid inventory or decision clock');
  if(a.delivery){const task=d.deliveries.find(t=>t.id===a.delivery!.id);if(!task || a.work || a.repair || a.delivery.startedAtS>e.atS+1e-6 || a.credits+task.pay>L.money || Object.values(a.inventory).reduce((n,v)=>n+v,0)+task.quantity>spec.capacity)throw Error('Invalid saved delivery');}
  if(a.work){const j=d.jobs.find(j=>j.id===a.work!.id);if(!j || a.repair || j.requires && !hasMilestone(state,scene,a.id,j.requires) || a.credits+j.pay>L.money || a.work.doneAtS<e.atS-1e-6 || a.work.doneAtS>state.timeS+j.seconds+1e-6)throw Error('Invalid saved work');}
 }
 for(const a of e.accounts){const spec=d.accounts.find(s=>s.id===a.id)!;
  if(spec.actor!=='player' && a.delivery && (!a.courier || a.courier.phase!=='dropoff'))throw Error('NPC cargo needs a physical courier');
  if(!a.courier)continue;const t=a.courier,task=d.deliveries.find(d=>d.id===t.id),home=scene.objects.find(o=>o.id===spec.actor);
  if(spec.actor==='player' || !task?.on || !home || !spec.deliveries?.includes(t.id) || a.work || a.repair || (t.phase==='dropoff' ? a.delivery?.id!==t.id : !!a.delivery) || t.routeAtS>state.timeS+1.01)throw Error('Invalid saved courier');
  const area=deliveryArea(task),market=d.markets.find(m=>m.id===(t.phase==='pickup' ? task.from : task.to))!,vendor=scene.objects.find(o=>o.id===market.actor)!;
  if(t.phase==='home' ? Math.hypot(t.at.x-home.x,t.at.y-home.y)>.01 : Math.hypot(t.at.x-vendor.x,t.at.y-vendor.y)>market.radius || Math.abs(walkingHeight(scene,t.at.x,t.at.y)-walkingHeight(scene,vendor.x,vendor.y))>4)throw Error('Invalid courier destination');
  if(!workSegment(scene,area,t,t,state,true) || !workSegment(scene,area,t.at,t.at,state,true))throw Error('Invalid courier position');
  let previous={x:t.x,y:t.y};for(const p of t.path){if(!workSegment(scene,area,previous,p,state,true))throw Error('Invalid saved courier path');previous=p;}if(t.path.length && Math.hypot(previous.x-t.at.x,previous.y-t.at.y)>.01)throw Error('Invalid courier path destination');
 }
 for(const a of e.accounts)if(a.meal){
  const t=a.meal,spec=d.accounts.find(s=>s.id===a.id)!,plan=d.meals.find(m=>m.id===t.id),object=scene.objects.find(o=>o.id===spec.actor);
  if(!plan || spec.meal!==t.id || !plan.markets.includes(t.market) || !object || spec.actor==='player' || a.work || a.delivery || a.repair || a.courier || t.routeAtS>state.timeS+1.01)throw Error('Invalid saved meal');
  const seat=findSeat(scene,t.seat);
  if(t.phase==='seat' && !seat || t.seat && (!seat || !plan.seats?.includes(seat.objectId) || !['seat','eat'].includes(t.phase) || !seatAvailable(scene,state,seat,a.id) || Math.hypot(t.at.x-seat.approach.x,t.at.y-seat.approach.y)>.01))throw Error('Invalid saved meal seat');
  const home=actorPose(scene,object,state.timeS,{...state,economy:undefined}),area=deliveryArea(plan),market=d.markets.find(m=>m.id===t.market)!,vendor=scene.objects.find(o=>o.id===market.actor)!;
  if(Math.hypot(t.home.x-home.x,t.home.y-home.y)>.01 || (t.phase==='home' ? Math.hypot(t.at.x-home.x,t.at.y-home.y)>.01 : !seat && (t.phase==='out' || !plan.seats) && (Math.hypot(t.at.x-vendor.x,t.at.y-vendor.y)>market.radius || Math.abs(walkingHeight(scene,t.at.x,t.at.y)-walkingHeight(scene,vendor.x,vendor.y))>=4)))throw Error('Invalid meal destination');
  if((t.phase==='seat' || t.phase==='eat') && !a.inventory[plan.good])throw Error('Invalid saved meal food');
  if(t.phase==='eat' ? !a.inventory[plan.good] || t.eatUntilS===undefined || t.eatUntilS<e.atS-1e-6 || t.eatUntilS>e.atS+plan.eat_s+1e-6 || Math.hypot(t.x-t.at.x,t.y-t.at.y)>.1 || t.speed!==0 || t.path.length>0 : t.eatUntilS!==undefined)throw Error('Invalid meal timer');
  if(!workSegment(scene,area,t,t,state,true) || !workSegment(scene,area,t.home,t.home,state,true) || !workSegment(scene,area,t.at,t.at,state,true))throw Error('Invalid meal position');
  let previous={x:t.x,y:t.y};for(const p of t.path){if(!workSegment(scene,area,previous,p,state,true))throw Error('Invalid saved meal path');previous=p;}if(t.path.length && Math.hypot(previous.x-t.at.x,previous.y-t.at.y)>.01)throw Error('Invalid meal path destination');
 }
 checkShiftState(state,scene);
 const plants=state.growing??[];if(plants.length+e.accounts.filter(a=>a.repair && a.repair.phase!=='home' && d.repairs.find(r=>r.id===a.repair!.id)?.regrow_s!==undefined).length>GROWTH_LIMITS.plants || new Set(plants.map(p=>p.objectId)).size!==plants.length)throw Error('Invalid plant capacity');
 for(const p of plants){const r=d.repairs.find(r=>r.id===p.serviceId);if(!r?.regrow_s || ![p.progressS,p.plantedAtS].every(Number.isFinite) || p.plantedAtS<0 || p.progressS<0 || p.progressS>=r.regrow_s || p.plantedAtS>e.atS || p.progressS>e.atS-p.plantedAtS+1e-6 || state.broken.includes(p.objectId) || !repairTargets(scene,r).some(t=>t.objectId===p.objectId))throw Error('Invalid saved plant growth');}
 for(const r of d.repairs)if(r.regrow_s!==undefined && plants.filter(p=>p.serviceId===r.id).length>e.repaired[r.id]!)throw Error('Plant growth exceeds consumed planting inputs');
 const claimed=new Set<string>();
 for(const a of e.accounts)if(a.repairSeen){const spec=d.accounts.find(d=>d.id===a.id)!,r=d.repairs.find(r=>r.id===(a.repairSeen!.serviceId??accountRepairs(spec)[0]));if(!r || !accountRepairs(spec).includes(r.id) || a.repairSeen.atS>state.timeS || !repairTargets(scene,r).some(t=>t.objectId===a.repairSeen!.objectId && t.zoneId===a.repairSeen!.zoneId))throw Error('Invalid saved repair notice');}
 for(const a of e.accounts)if(a.repair){const t=a.repair,r=d.repairs.find(r=>r.id===t.id),spec=d.accounts.find(s=>s.id===a.id)!,target=r && repairTargets(scene,r).find(o=>o.objectId===t.objectId && o.zoneId===t.zoneId),key=JSON.stringify([t.objectId,t.zoneId]);
  if(!r || !target || a.work || a.delivery || spec.actor!=='player' && !accountRepairs(spec).includes(r.id) || t.progressS>r.seconds || t.phase!=='home' && Object.values(a.inventory).reduce((n,v)=>n+v,0)+r.take>spec.capacity || t.routeAtS>state.timeS+1.01 || t.phase!=='home' && (a.credits+r.pay>L.money || !targetBroken(state,t) || claimed.has(key)) || spec.actor==='player' && t.phase==='home')throw Error('Invalid saved repair');
  if(t.phase!=='home')claimed.add(key);
  if(!repairSegment(scene,r,t.at,t.at,state,true) || Math.hypot(t.at.x-target.contact.x,t.at.y-target.contact.y)>target.contact.r+REPAIR_REACH+.01 || Math.hypot(t.at.x-target.contact.x,t.at.y-target.contact.y)<target.contact.r+REPAIR_RADIUS)throw Error('Invalid repair approach');
  if(spec.actor!=='player'){if(!repairSegment(scene,r,t,t,state,true))throw Error('Invalid worker position');let previous={x:t.x,y:t.y};for(const p of t.path){if(!repairSegment(scene,r,previous,p,state,true))throw Error('Invalid saved repair path');previous=p;}if(t.path.length && Math.hypot(previous.x-(t.phase==='home' ? scene.objects.find(o=>o.id===spec.actor)!.x : t.at.x),previous.y-(t.phase==='home' ? scene.objects.find(o=>o.id===spec.actor)!.y : t.at.y))>.01)throw Error('Invalid repair destination');}
 }
 for(const m of e.markets){const spec=d.markets.find(s=>s.id===m.id)!;if(!ids(Object.keys(m.stock),spec.lots.map(l=>l.good)) || m.credits+reserved(e,d,m.id)>L.money || spec.lots.some(l=>m.stock[l.good]!+reserved(e,d,m.id,l.good)>l.limit))throw Error('Invalid market capacity');}
 if(d.deliveries.some(d=>{const n=deliveryCommitments(e,d.id);return n>d.capacity || e.delivered[d.id]!+n>1e9;}))throw Error('Invalid delivery capacity');
 if(d.jobs.some(j=>active(e,j.id)>j.capacity || e.batches[j.id]!+active(e,j.id)>1e9))throw Error('Invalid work capacity');
 const total=e.accounts.reduce((n,a)=>n+a.credits+(a.work ? d.jobs.find(j=>j.id===a.work!.id)!.pay : 0)+(a.delivery ? d.deliveries.find(t=>t.id===a.delivery!.id)!.pay+deliveryBill(d.deliveries.find(t=>t.id===a.delivery!.id)!) : 0)+(a.repair && a.repair.phase!=='home' ? d.repairs.find(r=>r.id===a.repair!.id)!.pay : 0),0)+e.markets.reduce((n,m)=>n+m.credits,0),initial=d.accounts.reduce((n,a)=>n+a.credits,0)+d.markets.reduce((n,m)=>n+m.credits,0);
 if(total!==initial)throw Error('Money is not conserved');
 for(const g of d.goods){const expected=d.markets.reduce((n,m)=>n+(m.lots.find(l=>l.good===g.id)?.quantity??0),0)+d.jobs.reduce((n,j)=>n+e.batches[j.id]!*((j.output===g.id ? j.make : 0)-jobTake(j,g.id)),0)-e.consumed[g.id]!-d.repairs.reduce((n,r)=>n+(r.input===g.id ? r.take*e.repaired[r.id]! : 0),0);
  const actual=e.markets.reduce((n,m)=>n+(m.stock[g.id]??0),0)+e.accounts.reduce((n,a)=>n+a.inventory[g.id]!+(a.work ? jobTake(d.jobs.find(j=>j.id===a.work!.id)!,g.id) : 0)+(a.delivery && d.deliveries.find(t=>t.id===a.delivery!.id)!.good===g.id ? d.deliveries.find(t=>t.id===a.delivery!.id)!.quantity : 0)+(a.repair && a.repair.phase!=='home' && d.repairs.find(r=>r.id===a.repair!.id)!.input===g.id ? d.repairs.find(r=>r.id===a.repair!.id)!.take : 0),0);
  if(actual!==expected || !g.food && e.consumed[g.id]!==0)throw Error('Goods are not conserved');
 }
 for(const event of e.events){const reference=event.kind==='blocked' ? event.ref==='action' && !!event.reason : event.kind==='buy' || event.kind==='sell' || event.kind==='eat' ? d.goods.some(g=>g.id===event.ref) : ['collected','delivered','delivery_cancelled','courier_started'].includes(event.kind) ? d.deliveries.some(d=>d.id===event.ref) : ['repair_started','repaired','repair_cancelled'].includes(event.kind) ? d.repairs.some(r=>r.id===event.ref) : d.jobs.some(j=>j.id===event.ref);if(!d.accounts.some(a=>a.id===event.account) || event.atS>e.atS+1e-6 || !reference)throw Error('Invalid economy event');}
}
