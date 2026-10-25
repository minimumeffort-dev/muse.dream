import {workstation} from '../scene/workstations';
import {deliveryArea} from '../sim/courier';
import {commerceReason} from '../sim/commerce';
import {stepInteractive,bodyWorld} from '../sim/interaction';
import {carFootprintClear,type CarState,type World} from '../sim/car';
import {walkingHeight} from '../scene/interiors';
import {npcReviewStart} from './review-start';
import {walkReviewSteps} from './walk-review';

/** Only the initial observation pose is seeded; walking, claims and wages are real. */
export function* stationReviewSteps(state:CarState,world:World,stage:'ready'|'work'|'paid'|'npc'='ready',jobId='bake'):Generator<void,CarState>{
 const scene=world.scene,job=scene.economy!.jobs.find(j=>j.id===jobId)!,station=workstation(scene,job.station)!,plan=scene.economy!.stations!.find(s=>s.id===job.station)!;
 let next=npcReviewStart(state,world,'vendor');next={...next,x:station.x+10,y:station.y,elevation:walkingHeight(scene,station.x+10,station.y)};
 if(!carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))throw Error('Station observation is blocked');
 const player=()=>next.economy!.accounts.find(a=>a.id==='pocket')!;
 if(stage==='npc'){
  for(let i=0;i<120*60;i++){if(next.economy!.accounts.some(a=>a.id!=='pocket' && a.work && scene.economy!.jobs.find(j=>j.id===a.work!.id)?.station===station.id))return next;next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;}
  throw Error('No NPC reached the station');
 }
 next=yield* walkReviewSteps(next,world,deliveryArea(plan),station);
 const reason=commerceReason(next,scene,'pocket',{kind:'work',job:job.id});if(reason)throw Error('Station review cannot start: '+reason);
 if(stage==='ready')return next;
 const credits=player().credits;next=stepInteractive(next,{steer:0,throttle:0,commerce:{kind:'work',job:job.id}},1/120,world);
 if(!player().work)throw Error('Station review did not reserve work');if(stage==='work')return next;
 for(let i=0;i<120*20 && player().work;i++){next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;}
 if(player().credits!==credits+job.pay || player().completed.work[jobId]!==1)throw Error('Station review needs one paid batch');return next;
}
