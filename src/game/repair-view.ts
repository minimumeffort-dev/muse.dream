import type {ActorPose} from '../sim/actors';
import {COMMERCE_LIMITS} from '../scene/commerce';

/** One commerce-tick visual delay smooths maintenance walking without moving contacts. */
export function repairView(){
 type Sample={pose:ActorPose;at:number};
 const views=new Map<string,{samples:Sample[];tick:number;now:number;released?:number}>(),step=COMMERCE_LIMITS.decisionS;
 return {reset(){views.clear();},get resident(){return views.size;},get buffered(){return [...views.values()].reduce((n,v)=>n+v.samples.length,0);},sample(pose:ActorPose,active:boolean,tick:number,now:number,snap=false):ActorPose{
  let view=views.get(pose.id);
  if(snap || view && (now<view.now-1e-8 || tick<view.tick-1e-8 || now-view.now>1)){views.delete(pose.id);return pose;}
  if(!view){if(active && views.size<COMMERCE_LIMITS.accounts)views.set(pose.id,{samples:[{pose,at:tick}],tick,now});return pose;}
  const last=view.samples.at(-1)!,leaving=!active && view.released===undefined,at=active || leaving ? tick : now;
  if(Math.hypot(pose.x-last.pose.x,pose.y-last.pose.y)>Math.max(8,Math.max(pose.speed,last.pose.speed)*Math.max(0,at-last.at)*2)){
   views.delete(pose.id);return pose;
  }
  if(active)view.released=undefined;else view.released??=tick;
  if(at>last.at+1e-8 && (active || at-last.at>=step/32)){
   const distance=Math.hypot(pose.x-last.pose.x,pose.y-last.pose.y);
   view.samples.push({at,pose:{...pose,travelled:last.pose.travelled+distance,distance:last.pose.distance+distance}});
  }
  view.tick=tick;view.now=now;
  const target=now-step;
  while(view.samples.length>2 && view.samples[1]!.at<=target)view.samples.shift();
  // Fixed updates are at most 120 Hz; retain the target bracket even at unusual render rates.
  while(view.samples.length>64)view.samples.splice(view.samples.length-2,1);
  const a=view.samples[0]!,b=view.samples[1]??a,span=b.at-a.at,t=span>0 ? Math.max(0,Math.min(1,(target-a.at)/span)) : 1;
  const mix=(x:number,y:number)=>x+(y-x)*t,turn=Math.atan2(Math.sin(b.pose.headingRad-a.pose.headingRad),Math.cos(b.pose.headingRad-a.pose.headingRad));
  const visible={...b.pose,x:mix(a.pose.x,b.pose.x),y:mix(a.pose.y,b.pose.y),elevation:mix(a.pose.elevation,b.pose.elevation),headingRad:a.pose.headingRad+turn*t,travelled:mix(a.pose.travelled,b.pose.travelled),distance:mix(a.pose.distance,b.pose.distance),speed:span>0 ? Math.max(0,(b.pose.travelled-a.pose.travelled)/span) : pose.speed,animationTimeS:pose.animationTimeS};
  // A resumed route keeps its delay until it stops, avoiding a jump when work hands control back.
  if(view.released!==undefined && now-view.released>=step-1e-8 && pose.speed===0 && visible.speed===0 && Math.hypot(visible.x-pose.x,visible.y-pose.y,visible.elevation-pose.elevation)<1e-6 && Math.abs(Math.atan2(Math.sin(visible.headingRad-pose.headingRad),Math.cos(visible.headingRad-pose.headingRad)))<1e-6){views.delete(pose.id);return pose;}
  return visible;
 }};
}
