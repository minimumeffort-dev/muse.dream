import type {CarInput,CarState,World} from '../sim/car';
import type {WalkingPoint} from '../scene/floors';
import {workstation} from '../scene/workstations';
import {stepInteractive,FOOT_RADIUS,FOOT_HEIGHT} from '../sim/interaction';
import {commerceReason} from '../sim/commerce';
import {deliveryArea} from '../sim/courier';
import {indoorAreas,indoorEntries} from '../sim/indoor-navigation';
import {workPath} from '../sim/work-navigation';
import {handReviewSteps} from './review-start';
import {walkReviewSteps} from './walk-review';
const player=(s:CarState,w:World)=>s.economy!.accounts.find(a=>a.id===w.scene.economy!.accounts.find(a=>a.actor==='player')!.id)!;
export function loftReviewPath(state:CarState,world:World){
 const plan=world.scene.economy!.stations!.find(s=>s.id==='workshop_prep')!,station=workstation(world.scene,plan.id)!,area={...deliveryArea(plan),id:'review/loft',radius:FOOT_RADIUS,height:FOOT_HEIGHT},path=workPath(world.scene,area,state,station,state);
 if(!path)throw Error('Loft review needs a physical route to its workbench');return path;
}
/** Two real break/repair/handoff cycles open finite shelf room before the climb. */
export function* loftReviewSteps(state:CarState,world:World,stage:'base'|'work'|'paid'='base'):Generator<void,CarState>{
 let next=yield* handReviewSteps(state,world);const tick=(commerce?:CarInput['commerce'],strikePressed=false)=>{next=stepInteractive(next,{steer:0,throttle:0,commerce,strikePressed},1/120,world);};
 for(let cycle=0;cycle<2;cycle++){
  tick(undefined,true);if(!next.broken.includes('hall_table_east'))throw Error('Loft review could not damage its table');tick({kind:'repair',repair:'market_tables'});if(!player(next,world).repair)throw Error('Loft review could not reserve a repair');
  for(let i=0;i<120*30 && next.broken.includes('hall_table_east');i++){tick();if(i%30===0)yield;}
  if(next.broken.includes('hall_table_east'))throw Error('Loft review did not finish its paid repair');tick({kind:'deliver'});if(player(next,world).repair)throw Error('Loft review could not return its recovered hardware');
 }
 const plan=world.scene.economy!.stations!.find(s=>s.id==='workshop_prep')!,area={...deliveryArea(plan),id:'review/loft',radius:FOOT_RADIUS,height:FOOT_HEIGHT},entry=indoorEntries(world.scene,indoorAreas(world.scene,area)[0]!)[0]!;
 next=yield* walkReviewSteps(next,world,area,entry);if(stage==='base')return next;
 next=yield* walkReviewSteps(next,world,area,workstation(world.scene,plan.id)!);
 for(let i=0;i<120*120 && commerceReason(next,world.scene,player(next,world).id,{kind:'work',job:'assemble_kit'})==='busy';i++){tick();if(i%30===0)yield;}
 const reason=commerceReason(next,world.scene,player(next,world).id,{kind:'work',job:'assemble_kit'});if(reason)throw Error('Loft review cannot start its batch: '+reason);
 const before=player(next,world).completed.work.assemble_kit!,credits=player(next,world).credits;tick({kind:'work',job:'assemble_kit'});if(player(next,world).work?.id!=='assemble_kit')throw Error('Loft review lost its station claim');if(stage==='work')return next;
 for(let i=0;i<120*20 && player(next,world).work;i++){tick();if(i%30===0)yield;}
 if(player(next,world).completed.work.assemble_kit!==before+1 || player(next,world).credits!==credits+3)throw Error('Loft review did not complete one paid batch');return next;
}
/** Capture input follows the accepted path using ordinary foot controls each rendered frame. */
export function loftReviewInput(state:CarState,path:WalkingPoint[],viewAngle:number):CarInput{
 while(path.length && Math.hypot(state.x-path[0]!.x,state.y-path[0]!.y)<.3 && Math.abs(state.elevation-(path[0]!.elevation??state.elevation))<4)path.shift();
 const at=path[0];if(!at)return {steer:0,throttle:0};const dx=at.x-state.x,dy=at.y-state.y,d=Math.hypot(dx,dy);if(d<1e-8)return {steer:0,throttle:0};const a=Math.atan2(180,480)+viewAngle,slow=Math.min(1,d/3);return {steer:(dx*Math.cos(a)-dy*Math.sin(a))/d*slow,throttle:(-dx*Math.sin(a)-dy*Math.cos(a))/d*slow};
}
