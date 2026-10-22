import {homeReviewStart} from './home-review';
import {walkingHeight} from '../scene/interiors';
import {sampleWeather} from '../scene/weather';
import {carFootprintClear,type CarState,type World} from '../sim/car';
import {stepInteractive,bodyWorld} from '../sim/interaction';

/** Only the distant player observation pose is seeded; all resident decisions use ordinary ticks. */
export function* shelterReviewSteps(state:CarState,world:World,stage:'out'|'sit'|'clear'|'home'='clear'):Generator<void,CarState>{
 const initial=homeReviewStart(state,world),x=initial.x+96;
 let next={...initial,x,elevation:walkingHeight(world.scene,x,initial.y)},seen=false;
 if(!carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))throw Error('Shelter observation pose is blocked');
 const weather=world.scene.weather!,start=weather.cycleSeconds+weather.rainStartS,end=weather.cycleSeconds+weather.rainEndS;
 const plan=world.scene.economy!.rests!.find(r=>r.id==='home_rest')!;
 for(let i=0;i<120*720;i++){
  const resident=next.economy!.accounts.find(a=>a.id==='regular')!,trip=resident.resting;
  if(!seen && next.timeS>=start && trip?.phase==='out' && resident.energy!>plan.below && sampleWeather(weather,next.timeS).raining)seen=true;
  if(seen && (stage==='out' && trip?.phase==='out' || stage==='sit' && trip?.phase==='sit' || stage==='clear' && trip?.phase==='sit' && next.timeS>=end-4 || stage==='home' && !trip))return next;
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;
 }
 throw Error('Resident did not complete the rain shelter review: '+JSON.stringify({stage,time:next.timeS,regular:next.economy!.accounts.find(a=>a.id==='regular')}));
}
