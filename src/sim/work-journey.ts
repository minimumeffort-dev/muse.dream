import {indoorAreas,indoorOwner,indoorSupport} from './indoor-navigation';
import {walkingDistance,type WalkingPoint} from '../scene/floors';
import {walkingHeight} from '../scene/interiors';
import type {Scene,Point} from '../scene/schema';
import type {CarState} from './car';
import {actorContacts} from './actors';
import {workPath,workSegment,type WalkingArea} from './work-navigation';
import {repairPlayerContact,REPAIR_RADIUS,REPAIR_SPEED} from './repair';

export interface WorkJourney extends WalkingPoint {headingRad:number;speed:number;distance:number;path:WalkingPoint[];routeAtS:number}
/** One resident work clock owns both maintenance and courier walking. Contacts stay live. */
export function advanceWorkJourney(t:WorkJourney,end:WalkingPoint,area:WalkingArea,state:CarState,dt:number,scene:Scene):void{
 const now=state.timeS,radius=area.radius??REPAIR_RADIUS,height=area.height??18;
 if(t.path.length===0 && walkingDistance(scene,end,t)>.1 && now>=t.routeAtS){t.path=workPath(scene,area,t,end,state)??[];t.routeAtS=now+1;}
 const before=t.distance,player=repairPlayerContact(scene,state);let remaining=REPAIR_SPEED*dt;
 while(t.path.length && remaining>0){
  const next=t.path[0]!,raised=t.elevation!==undefined || next.elevation!==undefined,distance=Math.hypot(next.x-t.x,next.y-t.y),d=Math.min(remaining,distance),p:WalkingPoint=distance>.001 ? {x:t.x+(next.x-t.x)*d/distance,y:t.y+(next.y-t.y)*d/distance} : next;
  const from=t.elevation??walkingHeight(scene,t.x,t.y),expected=from+((next.elevation??walkingHeight(scene,next.x,next.y))-from)*(distance>.001 ? d/distance : 1),areas=raised ? indoorAreas(scene,area) : [],inside=indoorOwner(scene,areas,{...p,elevation:expected})??indoorOwner(scene,areas,t),floor=inside ? indoorSupport(scene,inside,p,from) : walkingHeight(scene,p.x,p.y);if(raised)p.elevation=floor;
  const blocked=Math.hypot(player.x-p.x,player.y-p.y)<radius+player.r && player.bottom<floor+height && player.top>floor || actorContacts(scene,now,state).some(c=>Math.hypot(c.x-p.x,c.y-p.y)<c.r+radius && c.top>floor && c.bottom<floor+height);
  if(blocked || !workSegment(scene,area,t,p,state)){t.path=[];t.routeAtS=now+1;break;}
  if(distance>.001)t.headingRad=Math.atan2(next.y-t.y,next.x-t.x);
  t.x=p.x;t.y=p.y;if(raised)t.elevation=floor;t.distance+=d;remaining-=d;if(distance<=d+.001)t.path.shift();else break;
 }
 t.speed=Math.min(REPAIR_SPEED,(t.distance-before)/Math.max(1e-8,dt));
}
