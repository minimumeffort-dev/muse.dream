import type {Scene,Point} from '../scene/schema';
import type {CarState,World} from './car';
import {carFootprintClear} from './car';
import {bodyWorld} from './interaction';
import {walkingHeight} from '../scene/interiors';
import {courierApproach} from './courier';
import {interactionSight} from './sight';

/** Registered r81→r82 relocation; resource reservations and simulation clocks stay intact. */
export function indoorServiceUpgrade(state:CarState,previous:Scene,world:World):CarState{
 const scene=world.scene,definition=scene.economy!,old=new Map(previous.objects.map(o=>[o.id,o]));
 const moved=new Map(scene.objects.filter(o=>{const p=old.get(o.id);return p && (p.x!==o.x || p.y!==o.y);}).map(o=>[o.id,o]));
 const changedMarket=(id:string)=>moved.has(definition.markets.find(m=>m.id===id)!.actor);
 const copy=(p:Point)=>({x:p.x,y:p.y});
 const approach=(plan:{on?:string;grounds?:string[]},id:string,start:Point)=>{
  const offer=courierApproach(scene,plan,id,start);
  if(!offer)throw Error('This update cannot preserve the saved service journey.');
  return {at:offer.end,path:offer.path};
 };
 const accounts=state.economy!.accounts.map(account=>{
  const spec=definition.accounts.find(a=>a.id===account.id)!,home=moved.get(spec.actor);
  let next=account;
  if(account.shift && home && account.shift.phase==='in')next={...next,shift:{...account.shift,at:copy(home),path:[]}};
  if(account.repair && home && account.repair.phase==='home')next={...next,repair:{...account.repair,path:[]}};
  if(account.courier){
   const t=account.courier,task=definition.deliveries.find(d=>d.id===t.id)!;
   if(t.phase==='home' && home)next={...next,courier:{...t,at:copy(home),path:[]}};
   else if(t.phase!=='home' && changedMarket(t.phase==='pickup' ? task.from : task.to))next={...next,courier:{...t,...approach(task,t.phase==='pickup' ? task.from : task.to,t)}};
  }
  if(account.meal?.phase==='out' && changedMarket(account.meal.market)){
   const t=account.meal,plan=definition.meals.find(m=>m.id===t.id)!;next={...next,meal:{...t,...approach(plan,t.market,t)}};
  }
  return next;
 });
 const next={...state,economy:{...state.economy!,accounts}};
 const player=accounts.find(a=>definition.accounts.find(d=>d.id===a.id)!.actor==='player')!,job=player.work && definition.jobs.find(j=>j.id===player.work!.id),market=job && definition.markets.find(m=>m.id===job.market);
 if(!market || !changedMarket(market.id))return next;
 const vendor=moved.get(market.actor)!,counter={...copy(vendor),elevation:walkingHeight(scene,vendor.x,vendor.y)};
 const reachable=(p:CarState)=>Math.hypot(p.x-counter.x,p.y-counter.y,p.elevation-counter.elevation)<=market.radius && interactionSight(scene,p,counter,p,market.actor);
 if(reachable(next))return next;
 // Only a saved worker follows the relocated workplace; ordinary player travel stays where it was.
 if(next.control.kind!=='foot' || !next.grounded || next.seated)throw Error('This update cannot preserve the saved work position.');
 const body={...bodyWorld(next,world),dryGround:true},angle=Math.atan2(next.y-counter.y,next.x-counter.x);
 for(const distance of [market.radius-4,24,16])for(let side=0;side<16;side++){
  const a=angle+side*Math.PI/8,x=counter.x+Math.cos(a)*distance,y=counter.y+Math.sin(a)*distance;
  const candidate={...next,x,y,elevation:walkingHeight(scene,x,y,body.carRadius),vx:0,vy:0,vz:0,pitch:0,bank:0};
  if(reachable(candidate) && carFootprintClear(body,x,y,candidate.elevation,next.timeS,candidate))return candidate;
 }
 throw Error('This update cannot safely place the saved worker at the indoor counter.');
}
