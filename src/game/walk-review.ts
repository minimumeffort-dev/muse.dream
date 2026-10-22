import type {WalkingPoint} from '../scene/floors';
import type {CarState,World} from '../sim/car';
import {stepInteractive,FOOT_RADIUS,FOOT_HEIGHT} from '../sim/interaction';
import {workPath,type WalkingArea} from '../sim/work-navigation';

/** Dev walkthroughs use the real foot body and controls in the default camera view. */
export function* walkReviewSteps(state:CarState,world:World,area:WalkingArea,end:WalkingPoint):Generator<void,CarState>{
 let next=state;
 const profile={...area,id:`review/foot/${area.id}`,radius:FOOT_RADIUS,height:FOOT_HEIGHT},path=workPath(world.scene,profile,next,end,next);
 if(!path)throw Error('Review needs a body-clear walking path: '+JSON.stringify({from:{x:next.x,y:next.y},end}));
 for(const target of path)for(let i=0;Math.hypot(next.x-target.x,next.y-target.y)>.2;i++){
  if(i>=120*20)throw Error('Review could not follow its walking path: '+JSON.stringify({timeS:next.timeS,at:{x:next.x,y:next.y,elevation:next.elevation},target}));
  const dx=target.x-next.x,dy=target.y-next.y,d=Math.hypot(dx,dy),slow=Math.min(1,d/3),a=Math.atan2(180,480);
  next=stepInteractive(next,{steer:(dx*Math.cos(a)-dy*Math.sin(a))/d*slow,throttle:(-dx*Math.sin(a)-dy*Math.cos(a))/d*slow},1/120,world);if(i%30===0)yield;
 }
 for(let i=0;i<30;i++)next=stepInteractive(next,{steer:0,throttle:0},1/120,world);
 return next;
}
