import type {CarState,World} from '../sim/car';
import {stepInteractive,bodyWorld} from '../sim/interaction';
import {carFootprintClear} from '../sim/car';
import {workstation} from '../scene/workstations';
import {walkingHeight} from '../scene/interiors';
import {hasMilestone} from '../sim/commerce';
import {jobRequirements} from '../scene/commerce';
import {npcReviewStart} from './review-start';

/** Observe ordinary decisions after a real shared meal, without seeding resources or history. */
export function* peerRecipeReviewSteps(state:CarState,world:World,stage:'work'|'paid'='work'):Generator<CarState,CarState>{
 const milestone=world.scene.economy?.milestones.find(m=>m.peer),host=world.scene.economy?.accounts.find(a=>a.id===milestone?.task),job=world.scene.economy?.jobs.find(j=>milestone && jobRequirements(j).includes(milestone.id));
 if(!milestone || !host || !job)throw Error('Peer recipe review needs an authored pair and dependent job');
 let next=npcReviewStart(state,world,host.actor);
 const station=workstation(world.scene,job.station);
 if(station){next={...next,x:station.x+10,y:station.y,elevation:walkingHeight(world.scene,station.x+10,station.y)};if(!carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))throw Error('Recipe observation is blocked');}
 for(let i=0;i<120*900;i++){
  const a=next.economy!.accounts.find(a=>a.id===host.id)!;
  if(hasMilestone(next,world.scene,host.id,milestone.id) && (stage==='work' ? a.work?.id===job.id : a.completed.work[job.id]!>0))return next;
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield next;
 }
 throw Error('The resident could not reach the requested recipe stage within fifteen simulation minutes');
}
