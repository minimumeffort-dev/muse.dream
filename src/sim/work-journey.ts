import {walkingHeight} from '../scene/interiors';
import type {Scene,Point} from '../scene/schema';
import type {CarState} from './car';
import {actorContacts} from './actors';
import {workPath,workSegment,type WalkingArea} from './work-navigation';
import {repairPlayerContact,REPAIR_RADIUS,REPAIR_SPEED} from './repair';

export interface WorkJourney extends Point {headingRad:number;speed:number;distance:number;path:Point[];routeAtS:number}
/** One resident work clock owns both maintenance and courier walking. Contacts stay live. */
export function advanceWorkJourney(t:WorkJourney,end:Point,area:WalkingArea,state:CarState,dt:number,scene:Scene):void{
 const now=state.timeS;
 if(t.path.length===0 && Math.hypot(end.x-t.x,end.y-t.y)>.1 && now>=t.routeAtS){t.path=workPath(scene,area,t,end,state)??[];t.routeAtS=now+1;}
 const before=t.distance,player=repairPlayerContact(scene,state);let remaining=REPAIR_SPEED*dt;
 while(t.path.length && remaining>0){
  const next=t.path[0]!,distance=Math.hypot(next.x-t.x,next.y-t.y),d=Math.min(remaining,distance),p=distance>.001 ? {x:t.x+(next.x-t.x)*d/distance,y:t.y+(next.y-t.y)*d/distance} : next;
  const floor=walkingHeight(scene,p.x,p.y),blocked=Math.hypot(player.x-p.x,player.y-p.y)<REPAIR_RADIUS+player.r && player.bottom<floor+18 && player.top>floor || actorContacts(scene,now,state).some(c=>Math.hypot(c.x-p.x,c.y-p.y)<c.r+REPAIR_RADIUS && c.top>floor && c.bottom<floor+18);
  if(blocked || !workSegment(scene,area,t,p,state)){t.path=[];t.routeAtS=now+1;break;}
  if(distance>.001)t.headingRad=Math.atan2(next.y-t.y,next.x-t.x);
  t.x=p.x;t.y=p.y;t.distance+=d;remaining-=d;if(distance<=d+.001)t.path.shift();else break;
 }
 t.speed=Math.min(REPAIR_SPEED,(t.distance-before)/Math.max(1e-8,dt));
}
