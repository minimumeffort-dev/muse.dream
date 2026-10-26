import {restoreCompany,wantsCompany} from './company';
import {walkingDistance,type WalkingPoint} from '../scene/floors';
import {routePath} from '../scene/routes';
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
export function socialArea(scene:Scene,accountId:string,planId?:string){
 const a=scene.economy!.accounts.find(a=>a.id===accountId)!,o=scene.objects.find(o=>o.id===a.actor)!,plan=scene.economy!.socials.find(p=>p.id===(planId??a.social))!;
 const radius=Math.ceil(objectRadius(o)*10)/10,height=Math.ceil(objectHeight(o)*10)/10,area=deliveryArea(plan);
 return {...area,id:`shift/${radius}/${height}/${area.id}`,radius,height};
}
export function socialAreas(scene:Scene){return [...new Map(scene.economy?.accounts.filter(a=>a.social).flatMap(a=>[a.id,...(scene.economy!.socials.find(p=>p.id===a.social)!.peers??[])].map(id=>{const area=socialArea(scene,id,a.social);return [area.id,area] as const;}))??[]).values()];}
export function sharedMeals(state:Pick<CarState,'economy'>,scene:Scene,actor:string){const id=scene.economy?.accounts.find(a=>a.actor===actor)?.id;return id ? state.economy?.socialHistory?.[id]?.meals??0 : 0;}
export function socialAccessProblems(scene:Scene):string[]{
 const e=scene.economy;if(!e)return [];const problems:string[]=[];
 for(const a of e.accounts)if(a.social){const plan=e.socials.find(p=>p.id===a.social)!,object=scene.objects.find(o=>o.id===a.actor)!,home=a.shift ? e.shifts.find(s=>s.id===a.shift)!.rest : object;
  try{const area=socialArea(scene,a.id);for(const seat of worldSeats(scene).filter(s=>plan.seats.includes(s.objectId)))if(!seatAccessClear(scene,seat,[],area) || !worldSeats(scene).some(own=>own.objectId===seat.objectId && !sameSeat(own,seat) && Math.hypot(own.x-seat.x,own.y-seat.y)>=area.radius+3) || !workClear(scene,area,seat.approach) || !workPath(scene,area,home,seat.approach) || !workPath(scene,area,seat.approach,home))problems.push(`${a.id}: social seat ${seat.objectId}/${seat.seatId} needs body-sized outward and return paths`);}catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 }
 for(const host of e.accounts.filter(a=>a.social)){const plan=e.socials.find(p=>p.id===host.social)!;for(const id of plan.peers??[]){
  const a=e.accounts.find(a=>a.id===id)!,object=scene.objects.find(o=>o.id===a.actor)!,homes=a.shift ? [e.shifts.find(s=>s.id===a.shift)!.rest] : object.route ? routePath(scene.routes.find(r=>r.id===object.route!.id)!).points : [object];
  try{const area=socialArea(scene,id,plan.id),hostArea=socialArea(scene,host.id);for(const seat of worldSeats(scene).filter(s=>plan.seats.includes(s.objectId))){
   if(!seatAccessClear(scene,seat,[],area) || !worldSeats(scene).some(other=>other.objectId===seat.objectId && !sameSeat(other,seat) && Math.hypot(other.x-seat.x,other.y-seat.y)>=area.radius+hostArea.radius) || homes.some(home=>!workPath(scene,area,home,seat.approach) || !workPath(scene,area,seat.approach,home)))problems.push(`${id}: companion seats need paired supported slots and body-sized outward and return paths`);
  }}catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 }}return problems;
}
function duties(state:CarState,scene:Scene,id:string){
 const e=state.economy!,a=e.accounts.find(a=>a.id===id)!,spec=scene.economy!.accounts.find(a=>a.id===id)!;
 return !!(a.work || a.delivery || a.repair || a.courier || a.visiting || a.request || a.meal || a.shift && a.shift.phase!=='rest' || spec.shift && !a.shift || scene.economy!.markets.some(m=>m.actor===spec.actor && marketIsOpen(scene,m,state.timeS)));
}
function returnDue(state:CarState,scene:Scene,id:string,seconds=0){
 const spec=scene.economy!.accounts.find(a=>a.id===id)!,shift=scene.economy!.shifts.find(s=>s.id===spec.shift);
 return scene.economy!.markets.filter(m=>m.actor===spec.actor || m.id===shift?.market).some(m=>{const opening=marketOpening(scene,m,state.timeS);return !opening || opening.seconds<=(m.id===shift?.market ? shift.lead_s : 0)+seconds;});
}
export function socialOffer(state:CarState,scene:Scene,id:string,hosted=false):{reason?:'busy'|'range'|'seat'|'unfamiliar'|'sated'|'cooldown'|'stock'|'capacity';seat?:NonNullable<ReturnType<typeof findSeat>>;path?:{x:number;y:number}[]}{
 const e=state.economy,d=scene.economy,spec=d?.accounts.find(a=>a.id===id),a=e?.accounts.find(a=>a.id===id),player=e?.accounts.find(a=>d!.accounts.find(s=>s.id===a.id)!.actor==='player'),plan=d?.socials.find(p=>p.id===spec?.social),own=findSeat(scene,state.seated);
 if(!e || !plan || !spec || !a || !player || state.control.kind!=='foot' || !state.grounded || state.surface==='water')return {reason:'range'};
 if(e.gathering || e.shared || e.invitation && (!hosted || e.invitation.partner!==id) || player.work || player.delivery || player.repair || duties(state,scene,id))return {reason:'busy'};
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
 (hosted ? e.accounts.find(a=>a.id===id)! : player).inventory[plan.good]!-=2;e.invitation=undefined;e.shared={id:plan.id,partner:id,...(hosted ? {host:id} : {}),phase:'out',playerSeat:{...state.seated!},seat:{objectId:offer.seat!.objectId,seatId:offer.seat!.seatId},home:{x:pose.x,y:pose.y,...(scene.floors ? {elevation:pose.elevation} : {})},...(scene.floors ? {elevation:pose.elevation} : {}),at:{...offer.seat!.approach},x:pose.x,y:pose.y,headingRad:pose.headingRad,speed:0,distance:0,path:offer.path!,routeAtS:state.timeS,startedAtS:state.timeS,portions:2};
}
export function endSharedMeal(state:CarState,scene:Scene,completed=false){
 const e=state.economy!,t=e.shared;if(!t || t.phase==='home')return;
 const d=scene.economy!,plan=d.socials.find(p=>p.id===t.id)!,partner=e.accounts.find(a=>a.id===t.partner)!,player=e.accounts.find(a=>d.accounts.find(s=>s.id===a.id)!.actor==='player')!;
 if(completed){restoreCompany(state,scene,[player.id,partner.id]);const food=d.goods.find(g=>g.id===plan.good)!.food;for(const a of [player,partner])a.satiety=Math.min(100,a.satiety+food);e.consumed[plan.good]!+=2;const previous=e.socialHistory?.[t.partner];e.socialHistory={...e.socialHistory,[t.partner]:{meals:(previous?.meals??0)+1,lastAtS:state.timeS}};}
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
 if(!plan?.markets || !wantsCompany(state,scene,id) || e.gathering || e.invitation || e.shared || state.timeS>1e9-SOCIAL_OFFER_SECONDS || a.invitedAtS!==undefined && state.timeS-a.invitedAtS<plan.cooldown_s)return false;
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
 if(e.gathering || e.shared || state.timeS+1e-8>=t.expiresAtS || state.control.kind!=='foot' || !state.grounded || state.surface==='water' || !sameSeat(state.seated,t.playerSeat) || !seat || !seatAccessClear(scene,seat,state.broken,socialArea(scene,t.partner)) || !seatAvailable(scene,state,seat,t.partner) || duties(state,scene,t.partner) || returnDue(state,scene,t.partner) || player.work || player.delivery || player.repair || player.satiety>=100 || a.satiety>plan.max_fullness || a.satiety>=100 || a.inventory[plan.good]!<2)e.invitation=undefined;
}
/** One shared activity owns both portions and the partner's journey until the return. */
export function stepSharedMeal(state:CarState,dt:number,scene:Scene){
 const e=state.economy!,t=e.shared;if(!t)return;
 const plan=scene.economy!.socials.find(p=>p.id===t.id)!,area=socialArea(scene,t.partner),seat=findSeat(scene,t.seat);
 if(t.phase!=='home' && (!sameSeat(state.seated,t.playerSeat) || !seat || !seatAccessClear(scene,seat,state.broken,area) || returnDue(state,scene,t.partner) || duties(state,scene,t.partner) || state.timeS-t.startedAtS>120))endSharedMeal(state,scene);
 if(t.phase==='eat'){if(state.timeS+1e-8>=t.eatUntilS!)endSharedMeal(state,scene,true);return;}
 advanceWorkJourney(t,t.at,area,state,dt,scene);if(walkingDistance(scene,t,t.at)>.1)return;
 if(t.phase==='home'){e.shared=undefined;return;}
 t.phase='eat';t.speed=0;t.path=[];t.eatUntilS=state.timeS+plan.eat_s;
}
export function checkSharedMeal(state:CarState,scene:Scene){
 const e=state.economy!,d=scene.economy!;
 for(const a of e.accounts)if(a.invitedAtS!==undefined && (!d.socials.find(s=>s.id===d.accounts.find(s=>s.id===a.id)!.social)?.markets || a.invitedAtS>e.atS+1e-6))throw Error('Invalid invitation history');
 const pending=e.invitation;
 if(pending){
  const a=e.accounts.find(a=>a.id===pending.partner),spec=d.accounts.find(a=>a.id===pending.partner),plan=d.socials.find(s=>s.id===spec?.social),seat=findSeat(scene,pending.seat),own=findSeat(scene,pending.playerSeat);
  if(e.gathering || e.shared || !a || !spec || !plan?.markets || a.invitedAtS!==pending.offeredAtS || pending.offeredAtS>e.atS+1e-6 || Math.abs(pending.expiresAtS-pending.offeredAtS-SOCIAL_OFFER_SECONDS)>1e-6 || pending.expiresAtS<e.atS-1e-6 || !seat || !own || !sameSeat(state.seated,pending.playerSeat) || sameSeat(pending.seat,pending.playerSeat) || own.objectId!==seat.objectId || !plan.seats.includes(seat.objectId) || !state.npcs.find(n=>n.id===spec.actor)?.known || a.inventory[plan.good]!<2 || e.consumed[plan.good]!>1e9-2 || duties(state,scene,a.id) || !seatAvailable(scene,state,seat,a.id))throw Error('Invalid saved social invitation');
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
 const t=e.shared;if(!t)return;if(e.gathering)throw Error('Shared meal ownership overlaps a companion meal');
 const a=e.accounts.find(a=>a.id===t.partner),spec=d.accounts.find(a=>a.id===t.partner),plan=d.socials.find(p=>p.id===t.id),object=scene.objects.find(o=>o.id===spec?.actor),player=e.accounts.find(a=>d.accounts.find(s=>s.id===a.id)!.actor==='player')!;
 if(!a || !spec || !plan || spec.social!==plan.id || !object || a.work || a.visiting || a.request || a.meal || a.delivery || a.repair || a.courier || a.shift && a.shift.phase!=='rest' || spec.shift && !a.shift || t.startedAtS>e.atS+1e-6 || t.routeAtS>state.timeS+1.01)throw Error('Invalid shared meal ownership');
 const home=a.shift ? a.shift.at : object,seat=findSeat(scene,t.seat),own=findSeat(scene,t.playerSeat),area=socialArea(scene,t.partner);
 if(t.host!==undefined && (t.host!==t.partner || !plan.markets))throw Error('Invalid shared meal host');
 if(walkingDistance(scene,t.home,home)>.01 || !seat || !own || sameSeat(t.seat,t.playerSeat) || seat.objectId!==own.objectId || !plan.seats.includes(seat.objectId))throw Error('Invalid shared meal furniture or home');
 if(t.phase==='home' ? t.portions!==0 || t.eatUntilS!==undefined || walkingDistance(scene,t.at,t.home)>.01 : t.portions!==2 || !sameSeat(state.seated,t.playerSeat) || !seatAvailable(scene,state,seat,t.partner) || !seatAccessClear(scene,seat,state.broken,area) || Math.hypot(seat.x-own.x,seat.y-own.y)<area.radius+3 || walkingDistance(scene,t.at,seat.approach)>.01 || player.work || player.delivery || player.repair || state.timeS-t.startedAtS>120.26)throw Error('Invalid shared meal reservation');
 if(t.phase==='eat' ? t.eatUntilS===undefined || t.eatUntilS<e.atS-1e-6 || t.eatUntilS>e.atS+plan.eat_s+1e-6 || walkingDistance(scene,t,t.at)>.1 || t.speed!==0 || t.path.length>0 : t.eatUntilS!==undefined)throw Error('Invalid shared meal timer');
 if(e.consumed[plan.good]!+t.portions>1e9)throw Error('Invalid shared food counter reservation');
 const host=t.host ? a : player;
 if(Object.values(host.inventory).reduce((n,v)=>n+v,0)+t.portions>d.accounts.find(a=>a.id===host.id)!.capacity)throw Error('Invalid shared meal refund room');
 if(!workSegment(scene,area,t,t,state,true) || !workSegment(scene,area,t.home,t.home,state,true) || !workSegment(scene,area,t.at,t.at,state,true))throw Error('Invalid shared meal position');
 let previous:WalkingPoint=t;for(const p of t.path){if(!workSegment(scene,area,previous,p,state,true))throw Error('Invalid shared meal path');previous=p;}if(t.path.length && walkingDistance(scene,previous,t.at)>.01)throw Error('Invalid shared meal destination');
}

/** A single two-person resident gathering shares the existing social activity budget. */
export function companionBusy(state:Pick<CarState,'economy'>,id:string):boolean{const t=state.economy?.gathering;return !!t && (t.host===id || t.guest===id);}
export function companionJourney(state:Pick<CarState,'economy'>,id:string){const t=state.economy?.gathering;if(!t)return;const trip=t.host===id ? t.hostTrip : t.guest===id ? t.guestTrip : undefined;return trip && {id:t.id,...trip,phase:t.phase};}
const peerKey=(plan:string,host:string,guest:string)=>`${plan}/${host}/${guest}`;
function companionDue(state:CarState,scene:Scene,id:string,seconds=0){const a=scene.economy!.accounts.find(a=>a.id===id)!;if(returnDue(state,scene,id,seconds))return true;const opening=a.attendance && marketOpening(scene,{hours:a.attendance},state.timeS);return !!a.attendance && (!opening || opening.seconds<=seconds);}
function companionFree(state:CarState,scene:Scene,id:string){const a=state.economy!.accounts.find(a=>a.id===id)!,spec=scene.economy!.accounts.find(a=>a.id===id)!;return !(a.work || a.delivery || a.repair || a.courier || a.visiting || a.request || a.meal || a.commute || a.resting || a.shift && a.shift.phase!=='rest' || spec.shift && !a.shift);}
function companionIdle(state:CarState,scene:Scene,id:string){return companionFree(state,scene,id) && !duties(state,scene,id);}
const pathLength=(scene:Scene,points:WalkingPoint[],from:WalkingPoint)=>points.reduce((sum,p,i)=>sum+walkingDistance(scene,p,i ? points[i-1]! : from),0);
export function startCompanionMeal(state:CarState,scene:Scene,id:string):boolean{
 const e=state.economy!,d=scene.economy!,spec=d.accounts.find(a=>a.id===id)!,host=e.accounts.find(a=>a.id===id)!,plan=d.socials.find(p=>p.id===spec.social);
 if(!plan?.peers || !wantsCompany(state,scene,id) || e.shared || e.invitation || e.gathering || !companionIdle(state,scene,id) || host.satiety>plan.max_fullness || host.satiety>=100 || host.inventory[plan.good]!<2 || e.consumed[plan.good]!>1e9-2)return false;
 const hostArea=socialArea(scene,id),hostPose=actorPose(scene,scene.objects.find(o=>o.id===spec.actor)!,state.timeS,state),seats=plan.seats.flatMap(id=>worldSeats(scene).filter(s=>s.objectId===id));
 for(const guestId of plan.peers){
  const guest=e.accounts.find(a=>a.id===guestId)!,guestSpec=d.accounts.find(a=>a.id===guestId)!,history=e.peerHistory?.[peerKey(plan.id,id,guestId)];
  if(!companionIdle(state,scene,guestId) || guest.satiety>plan.max_fullness || guest.satiety>=100 || history && (history.meals>=1e9 || state.timeS-history.lastAtS<plan.cooldown_s))continue;
  const guestArea=socialArea(scene,guestId,plan.id),guestPose=actorPose(scene,scene.objects.find(o=>o.id===guestSpec.actor)!,state.timeS,state);
  for(const own of seats)for(const other of seats){
   if(own.objectId!==other.objectId || sameSeat(own,other) || Math.hypot(own.x-other.x,own.y-other.y)<hostArea.radius+guestArea.radius || !seatAvailable(scene,state,own) || !seatAvailable(scene,state,other) || !seatAccessClear(scene,own,state.broken,hostArea) || !seatAccessClear(scene,other,state.broken,guestArea))continue;
   const out=workPath(scene,hostArea,hostPose,own.approach,state),back=out && workPath(scene,hostArea,own.approach,hostPose,state),guestOut=workPath(scene,guestArea,guestPose,other.approach,state),guestBack=guestOut && workPath(scene,guestArea,other.approach,guestPose,state);
   if(!out || !back || !guestOut || !guestBack)continue;
   const travel=Math.max(pathLength(scene,out,hostPose),pathLength(scene,guestOut,guestPose))/REPAIR_SPEED,round=travel+plan.eat_s+Math.max(pathLength(scene,back,own.approach),pathLength(scene,guestBack,other.approach))/REPAIR_SPEED+1;
   if(travel+plan.eat_s>120 || companionDue(state,scene,id,round) || companionDue(state,scene,guestId,round))continue;
   const trip=(pose:typeof hostPose,seat:typeof own,path:WalkingPoint[])=>({home:{x:pose.x,y:pose.y,...(scene.floors ? {elevation:pose.elevation} : {})},at:{...seat.approach},seat:{objectId:seat.objectId,seatId:seat.seatId},x:pose.x,y:pose.y,...(scene.floors ? {elevation:pose.elevation} : {}),headingRad:pose.headingRad,speed:0,distance:0,path,routeAtS:state.timeS});
   host.inventory[plan.good]!-=2;e.gathering={id:plan.id,host:id,guest:guestId,phase:'out',hostTrip:trip(hostPose,own,out),guestTrip:trip(guestPose,other,guestOut),startedAtS:state.timeS,portions:2};
   e.events.push({account:id,kind:'sharing',ref:plan.id,atS:e.atS});e.events=e.events.slice(-12);return true;
  }
 }return false;
}
function finishCompanionMeal(state:CarState,scene:Scene,completed=false){
 const e=state.economy!,t=e.gathering!;if(t.phase==='home')return;const d=scene.economy!,plan=d.socials.find(p=>p.id===t.id)!,host=e.accounts.find(a=>a.id===t.host)!,guest=e.accounts.find(a=>a.id===t.guest)!;
 if(completed){restoreCompany(state,scene,[host.id,guest.id]);const food=d.goods.find(g=>g.id===plan.good)!.food;for(const a of [host,guest])a.satiety=Math.min(100,a.satiety+food);e.consumed[plan.good]!+=2;const key=peerKey(t.id,t.host,t.guest),previous=e.peerHistory?.[key];e.peerHistory={...e.peerHistory,[key]:{meals:(previous?.meals??0)+1,lastAtS:state.timeS}};}
 else host.inventory[plan.good]!+=2;
 e.events.push({account:t.host,kind:completed ? 'shared_meal' : 'share_cancelled',ref:t.id,atS:e.atS});e.events=e.events.slice(-12);
 t.portions=0;t.phase='home';t.eatUntilS=undefined;for(const trip of [t.hostTrip,t.guestTrip]){trip.at={...trip.home};trip.path=[];trip.routeAtS=state.timeS;trip.speed=0;}
}
export function stepCompanionMeal(state:CarState,dt:number,scene:Scene){
 const e=state.economy!,t=e.gathering;if(!t)return;const plan=scene.economy!.socials.find(p=>p.id===t.id)!;
 if(t.phase!=='home' && (state.timeS-t.startedAtS>120 || [t.host,t.guest].some(id=>!companionIdle(state,scene,id) || companionDue(state,scene,id)) || ([[t.host,t.hostTrip],[t.guest,t.guestTrip]] as const).some(([id,trip])=>{const s=findSeat(scene,trip.seat);return !s || !seatAccessClear(scene,s,state.broken,socialArea(scene,id,t.id));})))finishCompanionMeal(state,scene);
 if(t.phase==='eat'){if(state.timeS+1e-8>=t.eatUntilS!)finishCompanionMeal(state,scene,true);return;}
 advanceWorkJourney(t.hostTrip,t.hostTrip.at,socialArea(scene,t.host,t.id),state,dt,scene);advanceWorkJourney(t.guestTrip,t.guestTrip.at,socialArea(scene,t.guest,t.id),state,dt,scene);
 if([t.hostTrip,t.guestTrip].some(p=>walkingDistance(scene,p,p.at)>.1))return;
 if(t.phase==='home'){const turns=new Map([[scene.economy!.accounts.find(a=>a.id===t.host)!.actor,t.hostTrip.headingRad],[scene.economy!.accounts.find(a=>a.id===t.guest)!.actor,t.guestTrip.headingRad]]);state.npcs=state.npcs.map(n=>turns.has(n.id) ? {...n,headingRad:turns.get(n.id)!} : n);e.gathering=undefined;return;}
 t.phase='eat';t.eatUntilS=state.timeS+plan.eat_s;for(const p of [t.hostTrip,t.guestTrip]){p.speed=0;p.path=[];}
}
export function checkCompanionMeal(state:CarState,scene:Scene){
 const e=state.economy!,d=scene.economy!,consumption=new Map<string,number>();
 for(const [key,h] of Object.entries(e.peerHistory??{})){const [planId,host,guest,...extra]=key.split('/'),plan=d.socials.find(p=>p.id===planId),owner=d.accounts.find(a=>a.id===host);
  if(extra.length || !plan?.peers?.includes(guest!) || owner?.social!==planId || h.meals<1 || h.lastAtS>e.atS+1e-6)throw Error('Invalid companion meal history');consumption.set(plan.good,(consumption.get(plan.good)??0)+h.meals*2);
 }
 for(const [id,h] of Object.entries(e.socialHistory??{})){const plan=d.socials.find(p=>p.id===d.accounts.find(a=>a.id===id)?.social)!;consumption.set(plan.good,(consumption.get(plan.good)??0)+h.meals*2);}
 for(const [good,n] of consumption)if(n>e.consumed[good]!)throw Error('Companion history exceeds consumed food');
 const t=e.gathering;if(!t)return;const plan=d.socials.find(p=>p.id===t.id),host=d.accounts.find(a=>a.id===t.host),guest=d.accounts.find(a=>a.id===t.guest);
 if(e.shared || e.invitation || !plan?.peers?.includes(t.guest) || host?.social!==t.id || !guest || t.host===t.guest || [t.host,t.guest].some(id=>!companionFree(state,scene,id)) || t.startedAtS>e.atS+1e-6)throw Error('Invalid companion meal ownership');
 const own=findSeat(scene,t.hostTrip.seat),other=findSeat(scene,t.guestTrip.seat);
 if(!own || !other || own.objectId!==other.objectId || sameSeat(own,other) || !plan.seats.includes(own.objectId))throw Error('Invalid companion furniture');
 if(t.phase==='home' ? t.portions!==0 || t.eatUntilS!==undefined : t.portions!==2 || e.consumed[plan.good]!>1e9-2 || state.timeS-t.startedAtS>120.26)throw Error('Invalid companion portions');
 if(t.phase==='eat' ? t.eatUntilS===undefined || t.eatUntilS<e.atS-1e-6 || t.eatUntilS>e.atS+plan.eat_s+1e-6 : t.eatUntilS!==undefined)throw Error('Invalid companion timer');
 const donor=e.accounts.find(a=>a.id===t.host)!;if(Object.values(donor.inventory).reduce((sum,n)=>sum+n,0)+t.portions>host.capacity)throw Error('Invalid companion refund capacity');
 for(const [id,trip] of [[t.host,t.hostTrip],[t.guest,t.guestTrip]] as const){const spec=d.accounts.find(a=>a.id===id)!,a=e.accounts.find(a=>a.id===id)!,object=scene.objects.find(o=>o.id===spec.actor)!,home=a.shift ? a.shift.at : actorPose(scene,object,state.timeS,{...state,economy:{...e,gathering:undefined}}),seat=findSeat(scene,trip.seat)!,area=socialArea(scene,id,t.id),end=t.phase==='home' ? trip.home : seat.approach;
  if(walkingDistance(scene,trip.home,home)>.01 || walkingDistance(scene,trip.at,end)>.01 || trip.routeAtS>state.timeS+1.01 || t.phase==='eat' && (walkingDistance(scene,trip,trip.at)>.1 || trip.speed!==0 || trip.path.length))throw Error('Invalid companion journey');
  if(t.phase!=='home' && (!seatAvailable(scene,state,seat,id) || !seatAccessClear(scene,seat,state.broken,area)))throw Error('Invalid companion seat claim');
  if(!workSegment(scene,area,trip,trip,state,true) || !workSegment(scene,area,trip.home,trip.home,state,true) || !workSegment(scene,area,trip.at,trip.at,state,true))throw Error('Invalid companion position');
  let previous:WalkingPoint=trip;for(const p of trip.path){if(!workSegment(scene,area,previous,p,state,true))throw Error('Invalid companion path');previous=p;}if(trip.path.length && walkingDistance(scene,previous,trip.at)>.01)throw Error('Invalid companion destination');
 }
}
