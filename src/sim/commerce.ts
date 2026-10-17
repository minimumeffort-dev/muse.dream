import {z} from 'zod';
import type {CarState,CarInput} from './car';
import type {Scene} from '../scene/schema';
import {COMMERCE_LIMITS as L,type Economy,type Market} from '../scene/commerce';
import {actorPose} from './actors';

const id=z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),count=z.number().int().min(0).max(1e9),quantity=count.max(L.quantity),money=count.max(L.money),clock=z.number().finite().min(0).max(1e9);
const previousAccountState=z.object({id,credits:money,inventory:z.record(quantity),satiety:z.number().finite().min(0).max(100),decisionAtS:clock,work:z.object({id,doneAtS:clock}).strict().optional()}).strict();
const previousEvent=z.object({account:id,kind:z.enum(['buy','sell','eat','start','paid','cancel','blocked']),ref:id,atS:clock,reason:z.enum(['funds','stock','full','sated','satiety','busy','range','input','treasury','capacity','not_food']).optional()}).strict();
export const previousEconomyStateSchema=z.object({atS:clock,turn:count,accounts:z.array(previousAccountState).max(L.accounts),markets:z.array(z.object({id,credits:money,stock:z.record(quantity)}).strict()).max(L.markets),consumed:z.record(count),batches:z.record(count),events:z.array(previousEvent).max(12)}).strict();
const accountState=previousAccountState.extend({delivery:z.object({id,startedAtS:clock}).strict().optional()}).strict();
const event=previousEvent.extend({kind:z.enum(['buy','sell','eat','start','paid','cancel','blocked','collected','delivered','delivery_cancelled'])}).strict();
export const economyStateSchema=previousEconomyStateSchema.extend({accounts:z.array(accountState).max(L.accounts),events:z.array(event).max(12),delivered:z.record(count)}).strict();
export type EconomyState=z.infer<typeof economyStateSchema>;
export type CommerceAction={kind:'buy';market:string;good:string}|{kind:'sell';market:string;good:string}|{kind:'eat';good:string}|{kind:'work';job:string}|{kind:'collect';delivery:string}|{kind:'deliver'}|{kind:'cancel'};
type Account=EconomyState['accounts'][number];
type Reason=NonNullable<EconomyState['events'][number]['reason']>;
type Pose={x:number;y:number;elevation:number};
const cache=new WeakMap<Scene,ReturnType<typeof prepare>>();
function prepare(scene:Scene){
 const e=scene.economy!,objects=new Map(scene.objects.map(o=>[o.id,o]));
 return {e,goods:new Map(e.goods.map(g=>[g.id,g])),accounts:new Map(e.accounts.map(a=>[a.id,a])),markets:new Map(e.markets.map(m=>[m.id,m])),jobs:new Map(e.jobs.map(j=>[j.id,j])),deliveries:new Map(e.deliveries.map(d=>[d.id,d])),objects,
  places:new Map(e.markets.map(m=>[m.id,actorPose(scene,objects.get(m.actor)!,0)]))};
}
function data(scene:Scene){let c=cache.get(scene);if(!c){c=prepare(scene);cache.set(scene,c);}return c;}
export function initialEconomy(scene:Pick<Scene,'economy'>,timeS=0):EconomyState|undefined{
 const e=scene.economy;if(!e)return;
 return {atS:timeS,turn:0,accounts:e.accounts.map(a=>({id:a.id,credits:a.credits,inventory:Object.fromEntries(e.goods.map(g=>[g.id,0])),satiety:a.satiety,decisionAtS:timeS})),markets:e.markets.map(m=>({id:m.id,credits:m.credits,stock:Object.fromEntries(m.lots.map(l=>[l.good,l.quantity]))})),consumed:Object.fromEntries(e.goods.map(g=>[g.id,0])),batches:Object.fromEntries(e.jobs.map(j=>[j.id,0])),delivered:Object.fromEntries(e.deliveries.map(d=>[d.id,0])),events:[]};
}
function ownerPose(state:CarState,scene:Scene,account:Account):Pose|undefined{
 const c=data(scene),owner=c.accounts.get(account.id)!;
 return owner.actor==='player' ? state.control.kind==='foot' && state.grounded && state.surface!=='water' ? state : undefined : actorPose(scene,c.objects.get(owner.actor)!,state.timeS,state);
}
function inReach(state:CarState,scene:Scene,account:Account,market:Market):boolean{
 const p=ownerPose(state,scene,account),q=data(scene).places.get(market.id)!;
 return !!p && Math.hypot(p.x-q.x,p.y-q.y,p.elevation-q.elevation)<=market.radius;
}
const active=(e:EconomyState,job:string)=>e.accounts.filter(a=>a.work?.id===job).length;
function reserved(e:EconomyState,definition:Economy,market:string,good?:string){
 let n=0;for(const a of e.accounts)if(a.work){const j=definition.jobs.find(j=>j.id===a.work!.id)!;if(j.market===market)n+=good===undefined ? j.pay : (j.input===good ? j.take : 0)+(j.output===good ? j.make : 0);}
 for(const a of e.accounts)if(a.delivery){const d=definition.deliveries.find(d=>d.id===a.delivery!.id)!;n+=good===undefined ? (d.to===market ? d.pay : 0) : (d.from===market || d.to===market) && d.good===good ? d.quantity : 0;}
 return n;
}
function reason(state:CarState,scene:Scene,e:EconomyState,a:Account,action:CommerceAction):Reason|undefined{
 const c=data(scene),definition=c.accounts.get(a.id)!;
 if(action.kind==='cancel')return a.work || a.delivery ? undefined : 'busy';
 if(definition.actor==='player' && !ownerPose(state,scene,a))return 'range';
 if(action.kind==='deliver'){
  const d=a.delivery && c.deliveries.get(a.delivery.id);return d && inReach(state,scene,a,c.markets.get(d.to)!) ? undefined : 'range';
 }
 if(a.work || a.delivery && action.kind!=='eat')return 'busy';
 if(action.kind==='collect'){
  const d=c.deliveries.get(action.delivery);if(!d || !inReach(state,scene,a,c.markets.get(d.from)!))return 'range';
  const from=e.markets.find(m=>m.id===d.from)!,to=e.markets.find(m=>m.id===d.to)!,lot=c.markets.get(d.to)!.lots.find(l=>l.good===d.good)!;
  if(e.delivered[d.id]!+e.accounts.filter(a=>a.delivery?.id===d.id).length>=1e9)return 'capacity';
  if(e.accounts.filter(a=>a.delivery?.id===d.id).length>=d.capacity)return 'busy';
  if(from.stock[d.good]!<d.quantity)return 'stock';
  if(Object.values(a.inventory).reduce((n,v)=>n+v,0)+d.quantity>definition.capacity)return 'full';
  if(to.credits<d.pay || a.credits+d.pay>L.money)return 'treasury';
  if(to.stock[d.good]!+reserved(e,c.e,d.to,d.good)+d.quantity>lot.limit)return 'capacity';
  return;
 }
 if(action.kind==='eat'){
  if(!(c.goods.get(action.good)?.food))return 'not_food';
  if(!a.inventory[action.good])return 'stock';
  if(e.consumed[action.good]!>=1e9)return 'capacity';
  return a.satiety>=100 ? 'sated' : undefined;
 }
 const m=action.kind==='buy' || action.kind==='sell' ? c.markets.get(action.market) : c.markets.get(c.jobs.get(action.job)?.market??'');
 if(!m || !inReach(state,scene,a,m))return 'range';
 const stock=e.markets.find(s=>s.id===m.id)!;
 if(action.kind==='sell'){
  const lot=m.lots.find(l=>l.good===action.good);if(!lot?.price || !a.inventory[action.good])return 'stock';
  if(stock.credits<lot.price || a.credits+lot.price>L.money)return 'treasury';
  if(stock.stock[action.good]!+reserved(e,c.e,m.id,action.good)+1>lot.limit)return 'capacity';
 }else if(action.kind==='buy'){
  const lot=m.lots.find(l=>l.good===action.good);if(!lot?.price || !stock.stock[action.good])return 'stock';
  if(a.credits<lot.price)return 'funds';
  if(Object.values(a.inventory).reduce((n,v)=>n+v,0)>=definition.capacity)return 'full';
  if(stock.credits+reserved(e,c.e,m.id)+lot.price>L.money)return 'treasury';
 }else{
  const j=c.jobs.get(action.job)!;
  if(e.batches[j.id]!+active(e,j.id)>=1e9)return 'capacity';
  if(a.satiety<j.effort)return 'satiety';
  if(active(e,j.id)>=j.capacity)return 'busy';
  if(stock.stock[j.input]!<j.take)return 'input';
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
 const interrupted=player.work && !inReach(state,scene,player,c.markets.get(c.jobs.get(player.work.id)!.market)!);
 if(state.economy && !input.commerce && !interrupted && state.timeS-old.atS<L.decisionS-1e-8)return state;
 const now=state.timeS,e:EconomyState={...old,atS:now,turn:(old.turn+1)%old.accounts.length,accounts:old.accounts.map(a=>({...a,inventory:{...a.inventory},...(a.work ? {work:{...a.work}} : {}),satiety:Math.max(0,a.satiety-(now-old.atS)*c.accounts.get(a.id)!.drainPerS)})),markets:old.markets.map(m=>({...m,stock:{...m.stock}})),consumed:{...old.consumed},batches:{...old.batches},delivered:{...old.delivered},events:[...old.events]};
 const report=(a:Account,kind:EconomyState['events'][number]['kind'],ref:string,why?:Reason)=>{e.events.push({account:a.id,kind,ref,atS:now,...(why ? {reason:why} : {})});e.events=e.events.slice(-12);};
 const cancel=(a:Account)=>{const j=c.jobs.get(a.work!.id)!,m=e.markets.find(m=>m.id===j.market)!;m.stock[j.input]!+=j.take;m.credits+=j.pay;a.work=undefined;report(a,'cancel',j.id);};
 for(const a of e.accounts)if(a.work){
  const j=c.jobs.get(a.work.id)!,m=e.markets.find(m=>m.id===j.market)!;
  if(!inReach(state,scene,a,c.markets.get(j.market)!)){cancel(a);continue;}
  if(now+1e-8>=a.work.doneAtS){m.stock[j.output]!+=j.make;a.credits+=j.pay;a.satiety=Math.max(0,a.satiety-j.effort);e.batches[j.id]!++;a.work=undefined;report(a,'paid',j.id);}
 }
 const perform=(a:Account,action:CommerceAction)=>{
  if(action.kind==='cancel'){
   if(a.work)cancel(a);
   if(a.delivery){const d=c.deliveries.get(a.delivery.id)!;e.markets.find(m=>m.id===d.from)!.stock[d.good]!+=d.quantity;e.markets.find(m=>m.id===d.to)!.credits+=d.pay;a.delivery=undefined;report(a,'delivery_cancelled',d.id);}
   return;
  }
  const blocked=reason(state,scene,e,a,action);
  if(blocked){if(a.id===player.id)report(a,'blocked','action',blocked);return;}
  if(action.kind==='collect'){const d=c.deliveries.get(action.delivery)!;e.markets.find(m=>m.id===d.from)!.stock[d.good]!-=d.quantity;e.markets.find(m=>m.id===d.to)!.credits-=d.pay;a.delivery={id:d.id,startedAtS:now};report(a,'collected',d.id);return;}
  if(action.kind==='deliver'){const d=c.deliveries.get(a.delivery!.id)!;e.markets.find(m=>m.id===d.to)!.stock[d.good]!+=d.quantity;a.credits+=d.pay;a.delivery=undefined;e.delivered[d.id]!++;report(a,'delivered',d.id);return;}
  if(action.kind==='eat'){a.inventory[action.good]!--;a.satiety=Math.min(100,a.satiety+c.goods.get(action.good)!.food);e.consumed[action.good]!++;report(a,'eat',action.good);return;}
  if(action.kind==='buy'){const m=e.markets.find(m=>m.id===action.market)!,lot=c.markets.get(m.id)!.lots.find(l=>l.good===action.good)!;a.credits-=lot.price!;m.credits+=lot.price!;m.stock[action.good]!--;a.inventory[action.good]!++;report(a,'buy',action.good);return;}
  if(action.kind==='sell'){const m=e.markets.find(m=>m.id===action.market)!,lot=c.markets.get(m.id)!.lots.find(l=>l.good===action.good)!;a.credits+=lot.price!;m.credits-=lot.price!;m.stock[action.good]!++;a.inventory[action.good]!--;report(a,'sell',action.good);return;}
  const j=c.jobs.get(action.job)!,m=e.markets.find(m=>m.id===j.market)!;m.stock[j.input]!-=j.take;m.credits-=j.pay;a.work={id:j.id,doneAtS:now-dt+j.seconds};report(a,'start',j.id);
 };
 // Rotating stable account order resolves contention independently of rendering order.
 for(let i=0;i<e.accounts.length;i++){
  const a=e.accounts[(i+old.turn)%e.accounts.length]!,spec=c.accounts.get(a.id)!;
  if(spec.actor==='player'){if(input.commerce)perform(a,input.commerce);continue;}
  if(now+1e-8<a.decisionAtS || a.work || a.delivery)continue;a.decisionAtS=now+1;
  if(a.satiety<=40){
   const food=c.e.goods.find(g=>g.food>0 && a.inventory[g.id]!>0);if(food){perform(a,{kind:'eat',good:food.id});continue;}
   if(spec.shop){const purchase=c.e.markets.flatMap(m=>m.lots.filter(l=>l.price && c.goods.get(l.good)!.food>0).map(l=>({kind:'buy' as const,market:m.id,good:l.good}))).find(action=>!reason(state,scene,e,a,action));if(purchase){perform(a,purchase);continue;}}
  }
  if(spec.work){const j=c.jobs.get(spec.work)!,m=e.markets.find(m=>m.id===j.market)!;if(m.stock[j.output]!+reserved(e,c.e,m.id,j.output)<j.target)perform(a,{kind:'work',job:j.id});}
 }
 return {...state,economy:e};
}

/** Restore also checks conservation, so malformed jobs cannot mint wages or material. */
export function checkEconomyState(state:CarState,scene:Scene):void{
 const d=scene.economy,e=state.economy;if(!d){if(e)throw Error('World has no economy');return;}if(!e)throw Error('Missing economy');
 const ids=(actual:string[],expected:string[])=>actual.length===expected.length && new Set(actual).size===actual.length && actual.every(id=>expected.includes(id));
 if(!ids(e.accounts.map(a=>a.id),d.accounts.map(a=>a.id)) || !ids(e.markets.map(m=>m.id),d.markets.map(m=>m.id)) || !ids(Object.keys(e.consumed),d.goods.map(g=>g.id)) || !ids(Object.keys(e.batches),d.jobs.map(j=>j.id)) || !ids(Object.keys(e.delivered),d.deliveries.map(j=>j.id)))throw Error('Unknown economy members');
 if(e.atS>state.timeS+1e-6 || state.timeS-e.atS>L.decisionS+1e-6 || e.turn>=e.accounts.length)throw Error('Invalid economy clock');
 for(const a of e.accounts){const spec=d.accounts.find(s=>s.id===a.id)!;if(!ids(Object.keys(a.inventory),d.goods.map(g=>g.id)) || Object.values(a.inventory).reduce((n,v)=>n+v,0)>spec.capacity || a.decisionAtS>state.timeS+1.01)throw Error('Invalid inventory or decision clock');
  if(a.delivery){const task=d.deliveries.find(t=>t.id===a.delivery!.id);if(!task || a.work || a.delivery.startedAtS>e.atS+1e-6 || a.credits+task.pay>L.money || Object.values(a.inventory).reduce((n,v)=>n+v,0)+task.quantity>spec.capacity)throw Error('Invalid saved delivery');}
  if(a.work){const j=d.jobs.find(j=>j.id===a.work!.id);if(!j || a.credits+j.pay>L.money || a.work.doneAtS<e.atS-1e-6 || a.work.doneAtS>state.timeS+j.seconds+1e-6)throw Error('Invalid saved work');}
 }
 for(const m of e.markets){const spec=d.markets.find(s=>s.id===m.id)!;if(!ids(Object.keys(m.stock),spec.lots.map(l=>l.good)) || m.credits+reserved(e,d,m.id)>L.money || spec.lots.some(l=>m.stock[l.good]!+reserved(e,d,m.id,l.good)>l.limit))throw Error('Invalid market capacity');}
 if(d.deliveries.some(d=>{const n=e.accounts.filter(a=>a.delivery?.id===d.id).length;return n>d.capacity || e.delivered[d.id]!+n>1e9;}))throw Error('Invalid delivery capacity');
 if(d.jobs.some(j=>active(e,j.id)>j.capacity || e.batches[j.id]!+active(e,j.id)>1e9))throw Error('Invalid work capacity');
 const total=e.accounts.reduce((n,a)=>n+a.credits+(a.work ? d.jobs.find(j=>j.id===a.work!.id)!.pay : 0)+(a.delivery ? d.deliveries.find(t=>t.id===a.delivery!.id)!.pay : 0),0)+e.markets.reduce((n,m)=>n+m.credits,0),initial=d.accounts.reduce((n,a)=>n+a.credits,0)+d.markets.reduce((n,m)=>n+m.credits,0);
 if(total!==initial)throw Error('Money is not conserved');
 for(const g of d.goods){const expected=d.markets.reduce((n,m)=>n+(m.lots.find(l=>l.good===g.id)?.quantity??0),0)+d.jobs.reduce((n,j)=>n+e.batches[j.id]!*((j.output===g.id ? j.make : 0)-(j.input===g.id ? j.take : 0)),0)-e.consumed[g.id]!;
  const actual=e.markets.reduce((n,m)=>n+(m.stock[g.id]??0),0)+e.accounts.reduce((n,a)=>n+a.inventory[g.id]!+(a.work && d.jobs.find(j=>j.id===a.work!.id)!.input===g.id ? d.jobs.find(j=>j.id===a.work!.id)!.take : 0)+(a.delivery && d.deliveries.find(t=>t.id===a.delivery!.id)!.good===g.id ? d.deliveries.find(t=>t.id===a.delivery!.id)!.quantity : 0),0);
  if(actual!==expected || !g.food && e.consumed[g.id]!==0)throw Error('Goods are not conserved');
 }
 for(const event of e.events){const reference=event.kind==='blocked' ? event.ref==='action' && !!event.reason : event.kind==='buy' || event.kind==='sell' || event.kind==='eat' ? d.goods.some(g=>g.id===event.ref) : ['collected','delivered','delivery_cancelled'].includes(event.kind) ? d.deliveries.some(d=>d.id===event.ref) : d.jobs.some(j=>j.id===event.ref);if(!d.accounts.some(a=>a.id===event.account) || event.atS>e.atS+1e-6 || !reference)throw Error('Invalid economy event');}
}
