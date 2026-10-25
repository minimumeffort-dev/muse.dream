import type {CarState,World} from '../sim/car';
import {carFootprintClear} from '../sim/car';
import {bodyWorld,stepInteractive,toggleRide} from '../sim/interaction';
import {strikeTarget} from '../sim/strike';
import {objectContacts} from '../scene/contacts';
import {walkingHeight} from '../scene/interiors';
import {drivingHeight} from '../scene/terrain';
import {repairArea} from '../sim/repair';
import {walkReviewSteps} from './walk-review';

export type StationRepairTarget='bench'|'lamp'|'tree'|'lobby';
const targets:Record<StationRepairTarget,string>={bench:'station_quarter_bench_nw',lamp:'station_quarter_lamp_east',tree:'station_quarter_tree_east',lobby:'station_quarter_home_seat'};
export const stationRepairObject=(target:StationRepairTarget)=>targets[target];

/** Dev-only observer uses a clear hand approach, or a car run-up for the stronger tree. */
export function stationMaintenanceReviewStart(state:CarState,world:World,target:StationRepairTarget='bench'):CarState{
 const object=world.scene.objects.find(o=>o.id===targets[target]);if(!object)throw Error('Station maintenance target is missing');
 if(target==='tree'){
  const car=state.control.kind==='car' ? state : toggleRide(state,world),x=object.x+170,y=object.y,elevation=drivingHeight(world.scene.terrain,x,y);
  if(car.control.kind!=='car')throw Error('Tree review needs the original car');
  const next={...car,x,y,elevation,headingRad:Math.PI,vx:0,vy:0,vz:0,grounded:true};
  if(!carFootprintClear(world,x,y,elevation,next.timeS,next))throw Error('Tree review run-up is blocked');return next;
 }
 const contact=objectContacts(world.scene,object)[0]!;
 const foot=state.control.kind==='foot' ? state : toggleRide(state,world);
 for(let side=0;side<8;side++){
  const angle=Math.PI+side*Math.PI/4,x=contact.x+Math.cos(angle)*(contact.r+6),y=contact.y+Math.sin(angle)*(contact.r+6),elevation=walkingHeight(world.scene,x,y);
  const next:CarState={...foot,control:{kind:'foot'},x,y,elevation,headingRad:Math.atan2(contact.y-y,contact.x-x),vx:0,vy:0,vz:0,grounded:true};
  if(carFootprintClear(bodyWorld(next,world),x,y,elevation,next.timeS,next) && strikeTarget(next,world)?.id===object.id)return next;
 }
 throw Error('Station maintenance needs a clear standing approach');
}

/** Actual strike, a short walking retreat, then finite dispatch/work/return. No seeded damage or pay. */
export function* stationMaintenanceReviewSteps(state:CarState,world:World,target:StationRepairTarget='bench',stage:'damaged'|'approach'|'work'|'returned'='work'):Generator<void,CarState>{
 const id=targets[target],service=world.scene.economy!.repairs.find(r=>r.id===(target==='tree' ? 'orchard_trees' : 'classroom_furniture'))!;
 let next=stationMaintenanceReviewStart(state,world,target);
 if(target==='tree'){
  for(let i=0;i<120*6 && !next.broken.includes(id);i++){next=stepInteractive(next,{steer:0,throttle:1},1/120,world);if(i%30===0)yield;}
  for(let i=0;i<120*10 && (!next.grounded || Math.hypot(next.vx,next.vy)>.5);i++){next=stepInteractive(next,{steer:0,throttle:-1},1/120,world);if(i%30===0)yield;}
  const tree=world.scene.objects.find(o=>o.id===id)!;
  for(let i=0;i<120*12 && next.x<tree.x+23;i++){next=stepInteractive(next,{steer:0,throttle:-.2},1/120,world);if(i%30===0)yield;}
  for(let i=0;i<120*4 && next.vx>.1;i++){next=stepInteractive(next,{steer:0,throttle:1},1/120,world);if(i%30===0)yield;}
  for(let i=0;i<120*2 && Math.hypot(next.vx,next.vy)>.1;i++){next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;}
  next=toggleRide(next,world);if(next.control.kind!=='foot')throw Error('Tree review needs a dry exit after its impact');
 }else next=stepInteractive(next,{steer:0,throttle:0,strikePressed:true},1/120,world);
 if(!next.broken.includes(id))throw Error('Station maintenance impact did not damage its target');
 const retreat={x:next.x-22,y:next.y};
 const walkingService=target==='tree' ? world.scene.economy!.repairs.find(r=>r.id==='classroom_furniture')! : service;
 next=yield* walkReviewSteps(next,world,repairArea(world.scene,walkingService),retreat);
 if(stage==='damaged')return next;
 let dispatched=false;
 for(let i=0;i<120*1800;i++){
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);
  const worker=next.economy!.accounts.find(a=>a.id==='caretaker')!,task=worker.repair;
  if(task?.objectId===id)dispatched=true;
  if(stage==='approach' && task?.objectId===id && task.phase==='out' && Math.hypot(task.x-task.at.x,task.y-task.at.y)<55)return next;
  if(stage==='work' && task?.objectId===id && task.phase==='work')return next;
  if(stage==='returned' && dispatched && !task && (next.economy!.repaired[service.id]??0)>0)return next;
  if(i%30===0)yield;
 }
 throw Error('Station maintenance did not complete its real journey within thirty simulation minutes');
}
