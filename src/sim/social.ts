import {findSeat,sameSeat,seatAccessClear,worldSeats} from '../scene/seating';
import {walkingHeight} from '../scene/interiors';
import type {Scene} from '../scene/schema';
import type {CarState} from './car';
import {actorPose} from './actors';
import {seatAvailable} from './seating';
import {interactionSight} from './sight';
import {deliveryArea} from './courier';
import {objectRadius,objectHeight} from './archetypes';
import {workClear,workPath,workSegment} from './work-navigation';
import {advanceWorkJourney} from './work-journey';
import {marketIsOpen,marketOpening} from './market-hours';
import {REPAIR_SPEED} from './repair';

export const SOCIAL_OFFER_SECONDS=30;

// Identical staff/companion bodies and grounds reuse the prepared shift topology.
export function socialArea(scene:Scene,accountId:string){
 const a=scene.economy!.accounts.find(a=>a.id===accountId)!,o=scene.objects.find(o=>o.id===a.actor)!,plan=scene.economy!.socials.find(p=>p.id===a.social)!;
 const radius=Math.ceil(objectRadius(o)*10)/10,height=Math.ceil(objectHeight(o)*10)/10,area=deliveryArea(plan);
 return {...area,id:`shift/${radius}/${height}/${area.id}`,radius,height};
}
export function socialAreas(scene:Scene){return [...new Map(scene.economy?.accounts.filter(a=>a.social).map(a=>{const area=socialArea(scene,a.id);return [area.id,area];})??[]).values()];}
export function sharedMeals(state:Pick<CarState,'economy'>,scene:Scene,actor:string){const id=scene.economy?.accounts.find(a=>a.actor===actor)?.id;return id ? state.economy?.socialHistory?.[id]?.meals??0 : 0;}
export function socialAccessProblems(scene:Scene):string[]{
 const e=scene.economy;if(!e)return [];const problems:string[]=[];
 for(const a of e.accounts)if(a.social){const plan=e.socials.find(p=>p.id===a.social)!,object=scene.objects.find(o=>o.id===a.actor)!,home=a.shift ? e.shifts.find(s=>s.id===a.shift)!.rest : object;
  try{const area=socialArea(scene,a.id);for(const seat of worldSeats(scene).filter(s=>plan.seats.includes(s.objectId)))if(!seatAccessClear(scene,seat,[],area) || !worldSeats(scene).some(own=>own.objectId===seat.objectId && !sameSeat(own,seat) && Math.hypot(own.x-seat.x,own.y-seat.y)>=area.radius+3) || !workClear(scene,area,seat.approach) || !workPath(scene,area,home,seat.approach) || !workPath(scene,area,seat.approach,home))problems.push(`${a.id}: social seat ${seat.objectId}/${seat.seatId} needs body-sized outward and return paths`);}catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 }return problems;
}
function duties(state:CarState,scene:Scene,id:string){
 const e=state.economy!,a=e.accounts.find(a=>a.id===id)!,spec=scene.economy!.accounts.find(a=>a.id===id)!;
 return !!(a.work || a.delivery || a.repair || a.courier || a.meal || a.shift && a.shift.phase!=='rest' || spec.shift && !a.shift || scene.economy!.markets.some(m=>m.actor===spec.actor && marketIsOpen(scene,m,state.timeS)));
}
function returnDue(state:CarState,scene:Scene,id:string,seconds=0){
 const spec=scene.economy!.accounts.find(a=>a.id===id)!,shift=scene.economy!.shifts.find(s=>s.id===spec.shift);
 return scene.economy!.markets.filter(m=>m.actor===spec.actor || m.id===shift?.market).some(m=>{const opening=marketOpening(scene,m,state.timeS);return !opening || opening.seconds<=(m.id===shift?.market ? shift.lead_s : 0)+seconds;});
}
export function socialOffer(state:CarState,scene:Scene,id:string,hosted=false):{reason?:'busy'|'range'|'seat'|'unfamiliar'|'sated'|'cooldown'|'stock'|'capacity';seat?:NonNullable<ReturnType<typeof findSeat>>;path?:{x:number;y:number}[]}{
 const e=state.economy,d=scene.economy,spec=d?.accounts.find(a=>a.id===id),a=e?.accounts.find(a=>a.id===id),player=e?.accounts.find(a=>d!.accounts.find(s=>s.id===a.id)!.actor==='player'),plan=d?.socials.find(p=>p.id===spec?.social),own=findSeat(scene,state.seated);
 if(!e || !plan || !spec || !a || !player || state.control.kind!=='foot' || !state.grounded || state.surface==='water')return {reason:'range'};
 if(e.shared || e.invitation && (!hosted || e.invitation.partner!==id) || player.work || player.delivery || player.repair || duties(state,scene,id))return {reason:'busy'};
 if(hosted && !plan.markets)return {reason:'busy'};
 if(!own || !plan.seats.includes(own.objectId) || !seatAccessClear(scene,own,state.broken))return {reason:'seat'};
 const object=scene.objects.find(o=>o.id===spec.actor)!,pose=actorPose(scene,object,state.timeS,state);
 if(Math.hypot(state.x-pose.x,state.y-pose.y,state.elevation-pose.elevation)>80 || !interactionSight(scene,state,pose,state,object.id))return {reason:'range'};
 if(!state.npcs.find(n=>n.id===spec.actor)?.known)return {reason:'unfamiliar'};
 if(a.satiety>plan.max_fullness || a.satiety>=100 || player.satiety>=100)return {reason:'sated'};
 const history=e.socialHistory?.[id];if(history && state.timeS-history.lastAtS<plan.cooldown_s)return {reason:'cooldown'};
 if((history?.meals??0)>=1e9 || e.consumed[plan.good]!>1e9-2)return {reason:'capacity'};
 if((hosted ? a : player).inventory[plan.good]!<2)return {reason:'stock'};
 const area=socialArea(scene,id);
 for(const seat of worldSeats(scene).filter(s=>s.objectId===own.objectId && !sameSeat(s,own) && Math.hypot(s.x-own.x,s.y-own.y)>=area.radius+3 && seatAccessClear(scene,s,state.broken,area) && seatAvailable(scene,state,s,id))){
  if(hosted && e.invitation && !sameSeat(seat,e.invitation.seat))continue;
  const path=workPath(scene,area,pose,seat.approach,state),home=path && workPath(scene,area,seat.approach,pose,state);if(!path || !home)continue;
  const length=(points:{x:number;y:number}[],start:{x:number;y:number})=>points.reduce((sum,p,i)=>{const prev=i ? points[i-1]! : start;return sum+Math.hypot(p.x-prev.x,p.y-prev.y);},0);
  if(returnDue(state,scene,id,(length(path,pose)+length(home,seat.approach))/REPAIR_SPEED+plan.eat_s+1+(hosted && !e.invitation ? SOCIAL_OFFER_SECONDS : 0)))return {reason:'busy'};
  return {seat,path};
 }return {reason:'seat'};
}
export function nearbySocial(state:CarState,scene:Scene){
 if(!state.seated || !scene.economy || !state.economy)return;
 return scene.economy.accounts.filter(a=>a.social && scene.economy!.socials.find(s=>s.id===a.social)!.seats.includes(state.seated!.objectId)).map(a=>({account:a,object:scene.objects.find(o=>o.id===a.actor)!,pose:actorPose(scene,scene.objects.find(o=>o.id===a.actor)!,state.timeS,state)})).filter(a=>Math.hypot(state.x-a.pose.x,state.y-a.pose.y,state.elevation-a.pose.elevation)<=80 && interactionSight(scene,state,a.pose,state,a.object.id)).sort((a,b)=>Math.hypot(state.x-a.pose.x,state.y-a.pose.y)-Math.hypot(state.x-b.pose.x,state.y-b.pose.y) || a.account.id.localeCompare(b.account.id))[0];
}
export function startSharedMeal(state:CarState,scene:Scene,id:string,hosted=false){
 if(hosted){const reason=hostedMealReason(state,scene,id);if(reason)return reason;}
 const offer=socialOffer(state,scene,id,hosted);if(offer.reason)return offer.reason;
 const e=state.economy!,spec=scene.economy!.accounts.find(a=>a.id===id)!,object=scene.objects.find(o=>o.id===spec.actor)!,pose=actorPose(scene,object,state.timeS,state),plan=scene.economy!.socials.find(p=>p.id===spec.social)!,player=e.accounts.find(a=>scene.economy!.accounts.find(s=>s.id===a.id)!.actor==='player')!;
 (hosted ? e.accounts.find(a=>a.id===id)! : player).inventory[plan.good]!-=2;e.invitation=undefined;e.shared={id:plan.id,partner:id,...(hosted ? {host:id} : {}),phase:'out',playerSeat:{...state.seated!},seat:{objectId:offer.seat!.objectId,seatId:offer.seat!.seatId},home:{x:pose.x,y:pose.y},at:{...offer.seat!.approach},x:pose.x,y:pose.y,headingRad:pose.headingRad,speed:0,distance:0,path:offer.path!,routeAtS:state.timeS,startedAtS:state.timeS,portions:2};
}
export function endSharedMeal(state:CarState,scene:Scene,completed=false){
 const e=state.economy!,t=e.shared;if(!t || t.phase==='home')return;
 const d=scene.economy!,plan=d.socials.find(p=>p.id===t.id)!,partner=e.accounts.find(a=>a.id===t.partner)!,player=e.accounts.find(a=>d.accounts.find(s=>s.id===a.id)!.actor==='player')!;
 if(completed){const food=d.goods.find(g=>g.id===plan.good)!.food;for(const a of [player,partner])a.satiety=Math.min(100,a.satiety+food);e.consumed[plan.good]!+=2;const previous=e.socialHistory?.[t.partner];e.socialHistory={...e.socialHistory,[t.partner]:{meals:(previous?.meals??0)+1,lastAtS:state.timeS}};}
 else (t.host ? partner : player).inventory[plan.good]!+=2;
 e.events.push({account:player.id,kind:completed ? 'shared_meal' : 'share_cancelled',ref:t.id,atS:Math.min(e.atS,state.timeS)});e.events=e.events.slice(-12);
 t.portions=0;t.phase='home';t.at={...t.home};t.eatUntilS=undefined;t.path=[];t.routeAtS=state.timeS;t.speed=0;
}
/** Immediate F/R transfers refund on a copy, even before the next economy tick. */
export function leaveSharedMeal(state:CarState,scene:Scene):CarState{
 const e=state.economy;if(!e || !e.invitation && (!e.shared || e.shared.phase==='home'))return state;
 const player=scene.economy!.accounts.find(a=>a.actor==='player')!.id;
 const next={...state,economy:{...e,invitation:undefined,shared:e.shared && {...e.shared},events:[...e.events],accounts:e.accounts.map(a=>a.id===(e.shared?.host??player) ? {...a,inventory:{...a.inventory}} : a)}};
 endSharedMeal(next,scene);return next;
}
/** Offers hold a seat, while the two purchased portions remain in the host's bag until consent. */
export function offerHostedMeal(state:CarState,scene:Scene,id:string){
 const e=state.economy!,spec=scene.economy!.accounts.find(a=>a.id===id)!,a=e.accounts.find(a=>a.id===id)!,plan=scene.economy!.socials.find(p=>p.id===spec.social);
 if(!plan?.markets || e.invitation || e.shared || state.timeS>1e9-SOCIAL_OFFER_SECONDS || a.invitedAtS!==undefined && state.timeS-a.invitedAtS<plan.cooldown_s)return false;
 const offer=socialOffer(state,scene,id,true);if(offer.reason)return false;
 a.invitedAtS=state.timeS;e.invitation={partner:id,playerSeat:{...state.seated!},seat:{objectId:offer.seat!.objectId,seatId:offer.seat!.seatId},offeredAtS:state.timeS,expiresAtS:state.timeS+SOCIAL_OFFER_SECONDS};return true;
}
export function declineSocialInvitation(state:CarState){if(state.economy)state.economy.invitation=undefined;}
export function hostedMealReason(state:CarState,scene:Scene,id:string,decline=false){
 const t=state.economy?.invitation;
 if(!t || t.partner!==id || state.timeS+1e-8>=t.expiresAtS || !sameSeat(state.seated,t.playerSeat))return 'range' as const;
 return decline ? undefined : socialOffer(state,scene,id,true).reason;
}
export function stepSocialInvitation(state:CarState,scene:Scene){
 const e=state.economy!,t=e.invitation;if(!t)return;
 const spec=scene.economy!.accounts.find(a=>a.id===t.partner)!,a=e.accounts.find(a=>a.id===t.partner)!,plan=scene.economy!.socials.find(s=>s.id===spec.social)!,player=e.accounts.find(a=>scene.economy!.accounts.find(s=>s.id===a.id)!.actor==='player')!,seat=findSeat(scene,t.seat);
 if(e.shared || state.timeS+1e-8>=t.expiresAtS || state.control.kind!=='foot' || !state.grounded || state.surface==='water' || !sameSeat(state.seated,t.playerSeat) || !seat || !seatAccessClear(scene,seat,state.broken,socialArea(scene,t.partner)) || !seatAvailable(scene,state,seat,t.partner) || duties(state,scene,t.partner) || returnDue(state,scene,t.partner) || player.work || player.delivery || player.repair || player.satiety>=100 || a.satiety>plan.max_fullness || a.satiety>=100 || a.inventory[plan.good]!<2)e.invitation=undefined;
}
/** One shared activity owns both portions and the partner's journey until the return. */
export function stepSharedMeal(state:CarState,dt:number,scene:Scene){
 const e=state.economy!,t=e.shared;if(!t)return;
 const plan=scene.economy!.socials.find(p=>p.id===t.id)!,area=socialArea(scene,t.partner),seat=findSeat(scene,t.seat);
 if(t.phase!=='home' && (!sameSeat(state.seated,t.playerSeat) || !seat || !seatAccessClear(scene,seat,state.broken,area) || returnDue(state,scene,t.partner) || duties(state,scene,t.partner) || state.timeS-t.startedAtS>120))endSharedMeal(state,scene);
 if(t.phase==='eat'){if(state.timeS+1e-8>=t.eatUntilS!)endSharedMeal(state,scene,true);return;}
 advanceWorkJourney(t,t.at,area,state,dt,scene);if(Math.hypot(t.x-t.at.x,t.y-t.at.y)>.1)return;
 if(t.phase==='home'){e.shared=undefined;return;}
 t.phase='eat';t.speed=0;t.path=[];t.eatUntilS=state.timeS+plan.eat_s;
}
export function checkSharedMeal(state:CarState,scene:Scene){
 const e=state.economy!,d=scene.economy!;
 for(const a of e.accounts)if(a.invitedAtS!==undefined && (!d.socials.find(s=>s.id===d.accounts.find(s=>s.id===a.id)!.social)?.markets || a.invitedAtS>e.atS+1e-6))throw Error('Invalid invitation history');
 const pending=e.invitation;
 if(pending){
  const a=e.accounts.find(a=>a.id===pending.partner),spec=d.accounts.find(a=>a.id===pending.partner),plan=d.socials.find(s=>s.id===spec?.social),seat=findSeat(scene,pending.seat),own=findSeat(scene,pending.playerSeat);
  if(e.shared || !a || !spec || !plan?.markets || a.invitedAtS!==pending.offeredAtS || pending.offeredAtS>e.atS+1e-6 || Math.abs(pending.expiresAtS-pending.offeredAtS-SOCIAL_OFFER_SECONDS)>1e-6 || pending.expiresAtS<e.atS-1e-6 || !seat || !own || !sameSeat(state.seated,pending.playerSeat) || sameSeat(pending.seat,pending.playerSeat) || own.objectId!==seat.objectId || !plan.seats.includes(seat.objectId) || !state.npcs.find(n=>n.id===spec.actor)?.known || a.inventory[plan.good]!<2 || e.consumed[plan.good]!>1e9-2 || duties(state,scene,a.id) || !seatAvailable(scene,state,seat,a.id))throw Error('Invalid saved social invitation');
  const area=socialArea(scene,a.id),player=e.accounts.find(a=>d.accounts.find(s=>s.id===a.id)!.actor==='player')!,object=scene.objects.find(o=>o.id===spec.actor)!,pose=actorPose(scene,object,state.timeS,state);
  if(state.control.kind!=='foot' || !state.grounded || state.surface==='water' || a.satiety>plan.max_fullness || a.satiety>=100 || player.satiety>=100 || player.work || player.delivery || player.repair || !seatAccessClear(scene,seat,state.broken,area) || Math.hypot(seat.x-own.x,seat.y-own.y)<area.radius+3 || Math.hypot(state.x-pose.x,state.y-pose.y,state.elevation-pose.elevation)>80.01)throw Error('Invalid saved social invitation context');
 }
 const sharedFood=new Map<string,number>();
 for(const [id,h] of Object.entries(e.socialHistory??{})){
  const spec=d.accounts.find(a=>a.id===id && a.social),plan=d.socials.find(p=>p.id===spec?.social);
  if(!plan || h.meals<1 || h.lastAtS>e.atS+1e-6)throw Error('Invalid social history');
  sharedFood.set(plan.good,(sharedFood.get(plan.good)??0)+h.meals*2);
 }
 for(const [good,portions] of sharedFood)if(portions>e.consumed[good]!)throw Error('Shared meal history exceeds consumed food');
 const t=e.shared;if(!t)return;
 const a=e.accounts.find(a=>a.id===t.partner),spec=d.accounts.find(a=>a.id===t.partner),plan=d.socials.find(p=>p.id===t.id),object=scene.objects.find(o=>o.id===spec?.actor),player=e.accounts.find(a=>d.accounts.find(s=>s.id===a.id)!.actor==='player')!;
 if(!a || !spec || !plan || spec.social!==plan.id || !object || a.work || a.meal || a.delivery || a.repair || a.courier || a.shift && a.shift.phase!=='rest' || spec.shift && !a.shift || t.startedAtS>e.atS+1e-6 || t.routeAtS>state.timeS+1.01)throw Error('Invalid shared meal ownership');
 const home=a.shift ? a.shift.at : object,seat=findSeat(scene,t.seat),own=findSeat(scene,t.playerSeat),area=socialArea(scene,t.partner);
 if(t.host!==undefined && (t.host!==t.partner || !plan.markets))throw Error('Invalid shared meal host');
 if(Math.hypot(t.home.x-home.x,t.home.y-home.y)>.01 || !seat || !own || sameSeat(t.seat,t.playerSeat) || seat.objectId!==own.objectId || !plan.seats.includes(seat.objectId))throw Error('Invalid shared meal furniture or home');
 if(t.phase==='home' ? t.portions!==0 || t.eatUntilS!==undefined || Math.hypot(t.at.x-t.home.x,t.at.y-t.home.y)>.01 : t.portions!==2 || !sameSeat(state.seated,t.playerSeat) || !seatAvailable(scene,state,seat,t.partner) || !seatAccessClear(scene,seat,state.broken,area) || Math.hypot(seat.x-own.x,seat.y-own.y)<area.radius+3 || Math.hypot(t.at.x-seat.approach.x,t.at.y-seat.approach.y)>.01 || player.work || player.delivery || player.repair || state.timeS-t.startedAtS>120.26)throw Error('Invalid shared meal reservation');
 if(t.phase==='eat' ? t.eatUntilS===undefined || t.eatUntilS<e.atS-1e-6 || t.eatUntilS>e.atS+plan.eat_s+1e-6 || Math.hypot(t.x-t.at.x,t.y-t.at.y)>.1 || t.speed!==0 || t.path.length>0 : t.eatUntilS!==undefined)throw Error('Invalid shared meal timer');
 if(e.consumed[plan.good]!+t.portions>1e9)throw Error('Invalid shared food counter reservation');
 const host=t.host ? a : player;
 if(Object.values(host.inventory).reduce((n,v)=>n+v,0)+t.portions>d.accounts.find(a=>a.id===host.id)!.capacity)throw Error('Invalid shared meal refund room');
 if(!workSegment(scene,area,t,t,state,true) || !workSegment(scene,area,t.home,t.home,state,true) || !workSegment(scene,area,t.at,t.at,state,true))throw Error('Invalid shared meal position');
 let previous={x:t.x,y:t.y};for(const p of t.path){if(!workSegment(scene,area,previous,p,state,true))throw Error('Invalid shared meal path');previous=p;}if(t.path.length && Math.hypot(previous.x-t.at.x,previous.y-t.at.y)>.01)throw Error('Invalid shared meal destination');
}
