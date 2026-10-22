import {objectContacts} from '../scene/contacts';
import {strikeTarget} from '../sim/strike';
import {restArea} from '../sim/courier';
import {workPath} from '../sim/work-navigation';
import {homeReviewStart} from './home-review';
import {sceneInteriors,portalPoints,walkingHeight} from '../scene/interiors';
import {worldSeats} from '../scene/seating';
import type {CarState,CarInput,World} from '../sim/car';
import {stepInteractive} from '../sim/interaction';
const idle={steer:0,throttle:0};
export function upstairsInput(state:CarState,x:number,y:number,viewAngle=0):CarInput{
 const dx=x-state.x,dy=y-state.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480)+viewAngle;
 return d<=1.1 ? idle : {steer:(dx*Math.cos(a)-dy*Math.sin(a))/d,throttle:(-dx*Math.sin(a)-dy*Math.cos(a))/d};
}
/** Only the outside review pose is seeded; the resident and player use ordinary travel and claims. */
export function* upstairsReviewSteps(state:CarState,world:World,follow=false,repair=false):Generator<void,CarState>{
 const initial=homeReviewStart(state,world);let next={...initial,x:initial.x+24,elevation:walkingHeight(world.scene,initial.x+24,initial.y)};
 for(let i=0;i<120*600;i++){
  next=stepInteractive(next,idle,1/120,world);const t=next.economy!.accounts.find(a=>a.id==='regular')!.resting;
  if(t && (follow ? t.phase==='out' && (t.elevation??0)>8 : t.phase==='sit' && t.seat?.objectId==='home_upper_settee'))break;
  if(i===120*600-1)throw Error('Resident did not climb to rest: '+JSON.stringify(next.economy!.accounts.find(a=>a.id==='regular')));
  if(i%30===0)yield;
 }
 if(follow)return next;
 const room=sceneInteriors(world.scene).find(r=>r.object.id==='oldtown_044')!,t=next.economy!.accounts.find(a=>a.id==='regular')!.resting!,seat=worldSeats(world.scene).find(s=>s.objectId==='home_upper_settee' && s.seatId!==t.seat!.seatId)!;
 const points=[portalPoints(room,room.room.portals[0]!,14).inside,room.toWorld(0,-13),room.toWorld(6,-13),room.toWorld(6,13.5),room.toWorld(0,13.5)];
 function* walk(points:{x:number;y:number}[]):Generator<void,void>{
  for(const p of points){let i=0;for(;i<120*20 && Math.hypot(next.x-p.x,next.y-p.y)>1.1;i++){next=stepInteractive(next,upstairsInput(next,p.x,p.y),1/120,world);if(i%16===0)yield;}if(i===120*20)throw Error('Upstairs review path blocked at '+JSON.stringify({target:p,x:next.x,y:next.y}));}
 }
 yield* walk(points);
 const area=restArea(world.scene,world.scene.economy!.accounts.find(a=>a.id==='regular')!),path=workPath(world.scene,area,next,seat.approach,next);if(!path)throw Error('No upstairs seat approach');yield* walk(path);
 if(repair){
  const table=world.scene.objects.find(o=>o.id==='home_upper_table')!,c=objectContacts(world.scene,table)[0]!,at={x:c.x-c.r-7,y:c.y,elevation:next.elevation},path=workPath(world.scene,area,next,at,next);if(!path)throw Error('No upstairs table approach');yield* walk(path);
  for(let i=0;i<48;i++)next=stepInteractive(next,upstairsInput(next,c.x,c.y),1/120,world);
  for(let i=0;i<24;i++)next=stepInteractive(next,idle,1/120,world);
  if(strikeTarget(next,world)?.id!==table.id)throw Error('Upper table is not reachable by hand: '+JSON.stringify({x:next.x,y:next.y,elevation:next.elevation,heading:next.headingRad,grounded:next.grounded,c,target:strikeTarget(next,world)}));
 }
 return next;
}
