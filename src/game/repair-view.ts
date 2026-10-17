import type {ActorPose} from '../sim/actors';
import {COMMERCE_LIMITS} from '../scene/commerce';

/** One commerce-tick visual delay smooths maintenance walking without moving contacts. */
export function repairView(){
 const views=new Map<string,{from:ActorPose;to:ActorPose;tick:number;released?:number}>(),step=COMMERCE_LIMITS.decisionS;
 return {reset(){views.clear();},get resident(){return views.size;},sample(pose:ActorPose,active:boolean,tick:number,now:number,snap=false):ActorPose{
  if(snap){views.delete(pose.id);return pose;}
  let view=views.get(pose.id);
  if(!view){if(active && views.size<COMMERCE_LIMITS.accounts)views.set(pose.id,{from:pose,to:pose,tick});return pose;}
  if(!active){view.released??=tick;if(now-view.released>=step-1e-8){views.delete(pose.id);return pose;}}
  if(tick!==view.tick){const distance=Math.hypot(pose.x-view.to.x,pose.y-view.to.y);view.from=view.to;view.to=active ? pose : {...pose,travelled:view.to.travelled+distance,distance:view.to.distance+distance,speed:distance/step};view.tick=tick;}
  const t=Math.max(0,Math.min(1,(now-view.tick)/step)),mix=(a:number,b:number)=>a+(b-a)*t,turn=Math.atan2(Math.sin(view.to.headingRad-view.from.headingRad),Math.cos(view.to.headingRad-view.from.headingRad));
  return {...view.to,x:mix(view.from.x,view.to.x),y:mix(view.from.y,view.to.y),elevation:mix(view.from.elevation,view.to.elevation),headingRad:view.from.headingRad+turn*t,travelled:mix(view.from.travelled,view.to.travelled),distance:mix(view.from.distance,view.to.distance)};
 }};
}
