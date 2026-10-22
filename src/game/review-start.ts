import {strikeTarget} from '../sim/strike';
import {courierApproach} from '../sim/courier';
import {objectContacts} from '../scene/contacts';
import {worldSeats} from '../scene/seating';
import {sceneInteriors,portalPoints,walkingHeight} from '../scene/interiors';
import type {CarInput} from '../sim/car';
import {carFootprintClear,resetCar,type CarState,type World} from "../sim/car";
import {drivingHeight,terrainHeight,waterAt} from "../scene/terrain";
import {actorPose,routeObjects} from "../sim/actors";
import {toggleRide,stepInteractive,bodyWorld,FOOT_HEIGHT} from "../sim/interaction";
import {controlFor,roleOf} from "../scene/agents";
import {controlOf} from '../scene/object-dsl';
import {aircraftFloor} from '../scene/aircraft-support';

/** Real mock-world positions for exercising terrain contact, jumping and water navigation. */
export function movementReviewStart(state:CarState,world:World,scenario:string|null):CarState {
  if(scenario==='park'){const seat=worldSeats(world.scene).find(s=>s.objectId==='garden_bench_nw')!;const foot=toggleRide(drivingReviewStart(state,world,'park'),world);return {...foot,x:seat.approach.x,y:seat.approach.y,elevation:walkingHeight(world.scene,seat.approach.x,seat.approach.y)};}
  if(scenario==='seating'){const seat=worldSeats(world.scene).find(s=>s.objectId==='hall_bench')!;const foot=interiorReviewStart(state,world,true);return {...foot,x:seat.approach.x,y:seat.approach.y,elevation:walkingHeight(world.scene,seat.approach.x,seat.approach.y)};}
  if(scenario==='interior')return interiorReviewStart(state,world,true);
  if(scenario==='walk')return toggleRide(state,world);
  if(scenario==='football' || scenario==='basketball'){
    const court=world.scene.sports.find(s=>s.kind===scenario),ball=court && world.scene.objects.find(o=>o.id===court.ballId);if(!ball)return state;
    const x=ball.x-6,y=ball.y;
    const next:CarState={...state,control:{kind:'foot'},x,y,elevation:drivingHeight(world.scene.terrain,x,y),headingRad:0,
      vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
    return carFootprintClear(bodyWorld(next,world),x,y,next.elevation,state.timeS,next) ? next : state;
  }
  if(scenario==='plane-hill'){
    const plane=routeObjects(world.scene).find(o=>controlFor(o)==='plane');if(!plane)return state;
    const next:CarState={...state,x:12500,y:10200,headingRad:0,control:{kind:'vehicle',id:plane.id},vx:0,vy:0,vz:0,pitch:0,bank:0,grounded:true,
      vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
    next.elevation=aircraftFloor(world.scene,plane,next);
    return carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,state.timeS,next) ? next : state;
  }
  if(scenario!=='swim' && scenario!=='boat-bridge')return state;
  const boat=scenario==='boat-bridge',x=9000,y=boat ? 3980 : 3500,water=waterAt(world.scene.terrain,x,y,terrainHeight(world.scene.terrain,x,y));
  if(!water)return state;
  const next:CarState={...state,control:boat ? {kind:'vehicle',id:'canal_launch'} : {kind:'foot'},x,y,elevation:water.level-(boat ? 2 : FOOT_HEIGHT*.65),headingRad:Math.PI/2,vx:0,vy:0,vz:0,grounded:true,surface:'water',vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
  return carFootprintClear(bodyWorld(next,world),x,y,next.elevation,state.timeS,next) ? next : state;
}

/** Development inspection links start beside a vehicle using the real exit rules. */
export function vehicleReviewStart(state:CarState,world:World,id:string|null):CarState {
  const object=world.scene.objects.find(o=>o.id===id && (controlFor(o) || roleOf(o)==='npc' && o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.rideable && !controlOf(o.spec)));if(!object)return state;
  const pose=actorPose(world.scene,object,0);
  return toggleRide({...state,x:pose.x,y:pose.y,elevation:pose.elevation,headingRad:pose.headingRad,control:{kind:controlFor(object) ? 'vehicle' : 'passenger',id:object.id},
    vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]},world);
}

/** Inspect authored NPC reactions through the real fixed-step runtime and walking body. */
export function npcReviewStart(state:CarState,world:World,id:string|null):CarState {
  const object=world.scene.objects.find(o=>o.id===id && o.behavior);if(!object)return state;
  const pose=actorPose(world.scene,object,0,state),foot:CarState={...state,control:{kind:'foot'},vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
  const market=world.scene.economy?.markets.find(m=>m.actor===object.id),reach=Math.min(42,(market?.radius??80)-4);
  for(let side=0;side<8;side++){
    const angle=side*Math.PI/4,x=pose.x+Math.cos(angle)*reach,y=pose.y+Math.sin(angle)*reach,elevation=walkingHeight(world.scene,x,y);
    if(carFootprintClear(bodyWorld(foot,world),x,y,elevation,0,foot))return {...foot,x,y,elevation,vx:0,vy:0};
  }
  return state;
}

/** Known clear mock-world poses for checking neutral coasting and cross-slope grip. */
export function drivingReviewStart(state:CarState,world:World,scenario:string|null):CarState {
  if(scenario==='street-tree'){
    const tree=world.scene.objects.find(o=>o.id==='garden_rowan_north');if(!tree)throw Error('Street tree review target is missing');
    const x=tree.x,y=tree.y-140,elevation=drivingHeight(world.scene.terrain,x,y);
    if(!carFootprintClear(world,x,y,elevation,state.timeS,state))throw Error('Street tree review start is blocked');
    return {...state,x,y,elevation,headingRad:Math.PI/2,vx:0,vy:0};
  }
  if(scenario==='airport-lamp'){
    const lamp=world.scene.objects.find(o=>o.id==='airport_lamps_1_5_r');if(!lamp)throw Error('Airport lamp review target is missing');
    const x=lamp.x,y=lamp.y-140,elevation=drivingHeight(world.scene.terrain,x,y);
    if(!carFootprintClear(world,x,y,elevation,state.timeS,state))throw Error('Airport lamp review start is blocked');
    return {...state,x,y,elevation,headingRad:Math.PI/2,vx:0,vy:0};
  }
  if(scenario==='street-stall' || scenario==='street-tub'){
    const stall=world.scene.objects.find(o=>o.id===(scenario==='street-tub' ? 'destination_planters_4_5_r' : 'market_stall_east'));if(!stall)throw Error('Street fixture review target is missing');
    const tub=scenario==='street-tub',x=stall.x+(tub ? 0 : 140),y=stall.y-(tub ? 140 : 0),elevation=drivingHeight(world.scene.terrain,x,y);
    if(!carFootprintClear(world,x,y,elevation,state.timeS,state))throw Error('Street fixture review start is blocked');
    return {...state,x,y,elevation,headingRad:tub ? Math.PI/2 : Math.PI,vx:0,vy:0};
  }
  const district=scenario==='terrace-junction' ? [4470,7753.5,0] : scenario==='hospital-junction' ? [3300,7000,-Math.PI/2] : scenario==='park' ? [2380,3480,0] : scenario==='school-bench' ? [4480,3890,Math.PI] : scenario==='orchard' ? [4750,4620,Math.PI/2] : scenario==='street-crossing' ? [5217.41935483871,6339.354838709678,0] : scenario==='street-lamp' ? [6135.612721988243,4165,-Math.PI/2] : scenario==='lamp' ? [7510,7350,Math.PI/2] : scenario==='repair' ? [6540,4350,Math.PI] : scenario==='voxels' ? [7440,7460,0] : scenario==='airport' ? [2000,9250,Math.PI/2] : scenario==='medical' ? [12000,5200,0] : scenario==='town' ? [6330,4233,0] : scenario==='suburbs' ? [3600,3300,0] : scenario==='sports' ? [10400,5200,0] : scenario==='waterfront' ? [9900,2800,Math.PI/2] : scenario==='canal-bridge' ? [8610,4200,0] : scenario==='lake-bridge' ? [8865,6200,0] : undefined;
  if(district){const [x,y,headingRad]=district as [number,number,number],elevation=drivingHeight(world.scene.terrain,x,y);
    if(carFootprintClear(world,x,y,elevation,state.timeS,state))return {...state,x,y,headingRad,elevation,vx:0,vy:0};
  }
  if(scenario!=="sidehill" && scenario!=="coast")return state;
  const hill=scenario==="sidehill",x=hill ? 1150 : state.x,y=hill ? 1750 : state.y,elevation=drivingHeight(world.scene.terrain,x,y);
  if(!carFootprintClear(world,x,y,elevation,state.timeS,state))return state;
  return {...state,x,y,elevation,headingRad:hill ? Math.PI/2 : Math.PI,vx:hill ? 0 : -80,vy:0};
}

/** Dev-only close views of actual Dream population members; normal starts are untouched. */
export function populationReviewStart(state:CarState,world:World,scenario:string|null):CarState{
 if(scenario!=='wildlife' && scenario!=='pedestrians' && scenario!=='crowd')return state;
 const object=scenario==='crowd' ? world.scene.objects.find(o=>o.id==='garden_visitor_0') : world.scene.objects.find(o=>o.ambient?.motion.kind===(scenario==='wildlife' ? 'roam' : 'walk') && (scenario!=='wildlife' || o.ambient.motion.kind==='roam' && o.ambient.motion.gait==='walk'));
 if(!object)return state;
 const x=object.x+(scenario==='crowd' ? 32 : 25),y=scenario==='crowd' ? 3556 : object.y,next:CarState={...state,control:{kind:'foot'},x,y,vx:0,vy:0,vz:0,grounded:true,elevation:drivingHeight(world.scene.terrain,x,y),vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
 return carFootprintClear(bodyWorld(next,world),x,y,next.elevation,state.timeS,next) ? next : state;
}

/** Profile the same driving start with cargo collected through the real engine. */
export function cargoReviewStart(state:CarState,world:World,id:string|null):CarState{
 const task=world.scene.economy?.deliveries.find(d=>d.id===id);if(!task)return state;
 const market=world.scene.economy!.markets.find(m=>m.id===task.from)!;
 const foot=npcReviewStart(state,world,market.actor);if(foot.control.kind!=='foot')return state;
 const next=stepInteractive(foot,{steer:0,throttle:0,commerce:{kind:'collect',delivery:task.id}},1/120,world);
 return next.economy?.accounts.some(a=>a.delivery?.id===id) ? resetCar(next,world.scene) : state;
}

/** Dev-only fixed-step review: real park impacts and dispatch, then a clear view behind the worker. */
export function maintenanceReviewStart(state:CarState,world:World):CarState{
 if(!world.scene.economy?.repairs.some(r=>r.grounds))return state;
 let next=drivingReviewStart(state,world,'voxels');
 for(let i=0;i<132;i++)next=stepInteractive(next,{steer:0,throttle:1},1/120,world);
 for(let i=0;i<78;i++)next=stepInteractive(next,{steer:0,throttle:-1},1/120,world);
 next=toggleRide(next,world);
 for(let i=210;i<5280;i++)next=stepInteractive(next,{steer:0,throttle:0},1/120,world);
 const task=next.economy?.accounts.find(a=>a.repair?.phase==='out')?.repair;if(!task)return state;
 for(let side=0;side<8;side++){
  const angle=task.headingRad+Math.PI+side*Math.PI/4,x=task.x+Math.cos(angle)*50,y=task.y+Math.sin(angle)*50,elevation=drivingHeight(world.scene.terrain,x,y),foot:CarState={...next,control:{kind:'foot'},x,y,elevation,vx:0,vy:0,vz:0,surface:'paper'};
  if(carFootprintClear(bodyWorld(foot,world),x,y,elevation,next.timeS,foot))return foot;
 }
 return next;
}


/** Offline review replays actual impacts, dispatch and pedestrian travel; no worker teleport. */
export function* repairReviewSteps(state:CarState,world:World,scenario:'lamp'|'street-lamp'|'airport-lamp'|'orchard'|'street-tree'|'school-bench'|'street-stall'|'street-tub'='lamp',stage:'approach'|'work'|'planted'='work'):Generator<void,CarState>{
 if(!world.scene.damagePool)throw Error('The maintenance review needs the pooled world');
 const targets=new Set(world.scene.objects.filter(o=>scenario==='airport-lamp' ? o.id==='airport_lamps_1_5_r' : scenario==='school-bench' ? o.id==='school_bench' : scenario==='street-stall' ? o.id==='market_stall_east' : scenario==='street-tub' ? o.id==='destination_planters_4_5_r' : o.spec && 'measure' in o.spec && o.spec.measure?.kind===(scenario==='orchard' || scenario==='street-tree' ? 'tree' : 'lamp')).map(o=>o.id));
 let next=drivingReviewStart(state,world,scenario);const fixture=scenario==='street-stall' || scenario==='street-tub',driving=scenario==='school-bench' || fixture ? 240 : scenario!=='lamp' ? 180 : 132,exit=scenario==='school-bench' || fixture ? 720 : scenario!=='lamp' ? 336 : 312;
 for(let i=0;i<120*1200;i++){
  if(i===exit){if(fixture && ![...targets].some(id=>next.broken.includes(id)))throw Error('The fixture review drive did not reach its target');next=toggleRide(next,world);}
  next=stepInteractive(next,{steer:0,throttle:i<driving ? 1 : i<exit ? -1 : 0},1/120,world);
  const worker=next.economy?.accounts.find(a=>a.repair && targets.has(a.repair.objectId))?.repair;
  if(stage==='approach' ? worker?.phase==='out' && Math.hypot(worker.x-worker.at.x,worker.y-worker.at.y)<60 : stage==='work' ? worker?.phase==='work' : next.growing?.some(p=>targets.has(p.objectId)))return next;
  if(i%30===0)yield;
 }
 throw Error('The maintenance worker did not reach its review stage within twenty simulation minutes');
}

/** Offline resupply evidence starts with real furniture impacts and retains every walking step. */
export function* courierReviewSteps(state:CarState,world:World,stage:'pickup'|'handoff'='pickup'):Generator<CarState,CarState>{
 let next=drivingReviewStart(state,world,'repair');
 for(let i=0;i<120*1800;i++){
  if(i===396)next=toggleRide(next,world);
  const dx=6360-next.x,dy=4350-next.y,distance=Math.hypot(dx,dy),angle=Math.atan2(180,480),walking=i>=396 && distance>3;
  const steer=walking ? (dx*Math.cos(angle)-dy*Math.sin(angle))/distance : 0,throttle=i<220 ? 1 : i<396 ? -1 : walking ? (-dx*Math.sin(angle)-dy*Math.cos(angle))/distance : 0;
  next=stepInteractive(next,{steer,throttle},1/120,world);
  const t=next.economy?.accounts.find(a=>a.courier)?.courier;
  if(t && (stage==='pickup' ? t.phase==='pickup' : t.phase==='dropoff' && t.path.reduce((sum,p,j)=>{const q=j ? t.path[j-1]! : t;return sum+Math.hypot(p.x-q.x,p.y-q.y);},0)<=120))return next;
  if(i%30===0)yield next;
 }
 throw Error('The supply courier did not reach its review stage within thirty simulation minutes');
}

/** Review setup retains real repair demand, cargo and the complete courier journey. */
export function* businessReviewSteps(state:CarState,world:World):Generator<CarState,CarState>{
 const prepared=yield* courierReviewSteps(state,world,'handoff');
 if(!prepared.economy?.accounts.some(a=>a.courier?.id==='kits_run' && a.courier.phase==='dropoff'))throw Error('The depot review needs a real pending supplier payment');
 return {...npcReviewStart(prepared,world,'station_resident'),vehicles:prepared.vehicles};
}

/** Walk from the public doorway to the table; no indoor car or seeded damage. */
export function* handReviewSteps(state:CarState,world:World,working=false):Generator<void,CarState>{
 const table=world.scene.objects.find(o=>o.id==='hall_table_east');if(!table)throw Error('The hand review needs the hall table');
 const contact=objectContacts(world.scene,table)[0]!,approach={x:contact.x+contact.r+7,y:contact.y};
 let next=interiorReviewStart(state,world);
 for(let i=0;i<120*8;i++){const input=interiorReviewInput(next,world,Math.floor(i/4));next=stepInteractive(next,{steer:input.steer,throttle:input.throttle},1/120,world);if(i%30===0)yield;}
 for(const at of [{x:approach.x+20,y:approach.y},approach]){
  let arrived=false;
  for(let i=0;i<120*10;i++){
   const dx=at.x-next.x,dy=at.y-next.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480);
   if(d<1){arrived=true;break;}
   next=stepInteractive(next,{steer:(dx*Math.cos(a)-dy*Math.sin(a))/d,throttle:(-dx*Math.sin(a)-dy*Math.cos(a))/d},1/120,world);if(i%30===0)yield;
  }
  if(!arrived)throw Error('The hand review did not reach its table approach');
 }
 for(let i=0;i<24;i++)next=stepInteractive(next,{steer:0,throttle:0},1/120,world);
 if(strikeTarget(next,world)?.id!==table.id)throw Error('The on-foot review cannot reach its work table: '+JSON.stringify({x:next.x,y:next.y,heading:next.headingRad,elevation:next.elevation,grounded:next.grounded,target:strikeTarget(next,world)?.id,contact}));
 if(working){next=stepInteractive(next,{steer:0,throttle:0,commerce:{kind:'work',job:'bake'}},1/120,world);if(next.economy?.accounts.find(a=>a.id==='pocket')?.work?.id!=='bake')throw Error('The hand review did not start its paid batch');}
 return next;
}

/** Real consumption opens receiving space; the existing cargo fixture uses collect and R. */
export function* workshopReviewSteps(state:CarState,world:World):Generator<void,CarState>{
 let next=yield* handReviewSteps(state,world);
 for(let cycle=0;cycle<2;cycle++){
  next=stepInteractive(next,{steer:0,throttle:0,strikePressed:true},1/120,world);
  if(!next.broken.includes('hall_table_east'))throw Error('Workshop review did not break its table');
  for(let i=0;i<120*25;i++){
   next=stepInteractive(next,{steer:0,throttle:0,...(i===239 ? {commerce:{kind:'repair',repair:'market_tables'} as const} : {})},1/120,world);if(i%30===0)yield;
  }
  if(next.broken.includes('hall_table_east') || next.economy!.accounts.find(a=>a.id==='baker')!.completed.work.assemble_kit!<cycle+1)throw Error('Workshop review did not repair and replace its kit');
 }
 next=cargoReviewStart(next,world,'fasteners_run');
 if(next.economy!.accounts.find(a=>a.id==='pocket')!.delivery?.id!=='fasteners_run')throw Error('Workshop review did not collect real fasteners');
 return yield* handReviewSteps(next,world);
}

/** Dev fixture starts a car inside the hall; damage and the complete repair still use real fixed steps. */
export function* equipmentReviewSteps(state:CarState,world:World):Generator<void,CarState>{
 const table=world.scene.objects.find(o=>o.id==='hall_table_east');if(!table)throw Error('The equipment review needs the hall table');
 let next:CarState={...state,control:{kind:'car'},x:table.x,y:table.y+65,elevation:walkingHeight(world.scene,table.x,table.y+65),headingRad:-Math.PI/2,vx:0,vy:0,vz:0,grounded:true,vehicles:[]};
 if(!carFootprintClear(world,next.x,next.y,next.elevation,next.timeS,next))throw Error('The equipment review car needs a clear starting pose');
 let hit=false;
 for(let i=0;i<120*3;i++){next=stepInteractive(next,{steer:0,throttle:1},1/120,world);if(next.broken.includes(table.id)){hit=true;break;}if(i%30===0)yield;}
 if(!hit)throw Error('The review car did not damage its work table');
 for(let i=0;i<120*3;i++){next=stepInteractive(next,{steer:0,throttle:-1},1/120,world);if(i%30===0)yield;}
 next=npcReviewStart(next,world,'vendor');
 for(let i=0;i<120*90;i++){
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);
  const task=next.economy?.accounts.find(a=>a.repair?.objectId===table.id)?.repair;
  if(task?.phase==='work')return next;
  if(!next.broken.includes(table.id))throw Error('The table was repaired before its review start');
  if(i%30===0)yield;
 }
 throw Error('The caretaker did not reach the damaged equipment');
}

/** Dev-only ground-floor walkthrough; all movement and transactions use the ordinary engine. */
export function interiorReviewStart(state:CarState,world:World,night=false):CarState{
 const f=sceneInteriors(world.scene).find(f=>f.object.id==='market_hall');if(!f)return state;
 const p=night ? f.toWorld(0,-8) : portalPoints(f,f.room.portals[0]!,24).outside;
 const next:CarState={...state,control:{kind:'foot'},x:p.x,y:p.y,elevation:walkingHeight(world.scene,p.x,p.y),vx:0,vy:0,vz:0,headingRad:Math.PI/2,grounded:true,vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
 return carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next) ? next : state;
}
export function interiorReviewInput(state:CarState,world:World,frame:number,viewAngle=0,night=false):CarInput{
 const f=sceneInteriors(world.scene).find(f=>f.object.id==='market_hall');if(!f)return {steer:0,throttle:0};
 const vendor=world.scene.objects.find(o=>o.id==='vendor')!,aisle=f.toWorld(0,-2.5),counter={x:vendor.x+36,y:aisle.y};
 const target=night ? f.toWorld(frame<120 ? 12 : -12,-4) : frame<90 ? f.toWorld(0,-15) : frame<480 ? state.y<aisle.y-2 && state.x<vendor.x-20 ? aisle : counter : frame<540 ? aisle : portalPoints(f,f.room.portals[0]!,24).outside;
 const dx=target.x-state.x,dy=target.y-state.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480)+viewAngle,c=Math.cos(a),s=Math.sin(a),move=d>1.5;
 return {steer:move ? (dx*c-dy*s)/d : 0,throttle:move ? (-dx*s-dy*c)/d : 0,...(!night && frame===240 ? {commerce:{kind:'work',job:'bake'} as const} : !night && frame===450 ? {commerce:{kind:'buy',market:'market_stall',good:'bread'} as const} : !night && frame===460 ? {commerce:{kind:'eat',good:'bread'} as const} : {})};
}

/** Capture setup earns practice through ordinary paid work; no completion counters are assigned. */
export function* progressionReviewSteps(state:CarState,world:World):Generator<void,CarState>{
 let next=npcReviewStart(state,world,'vendor');
 const tick=(commerce?:CarInput['commerce'])=>{next=stepInteractive(next,{steer:0,throttle:0,commerce},1/120,world);};
 const player=()=>next.economy!.accounts.find(a=>a.id===world.scene.economy!.accounts.find(a=>a.actor==='player')!.id)!;
 for(let batch=0;batch<3;batch++){
  tick({kind:'work',job:'bake'});if(!player().work)throw Error('Review could not start bread work');
  for(let i=0;i<840 && player().work;i++){tick();if(i%30===0)yield;}
  if(player().completed.work.bake!==batch+1)throw Error('Review did not complete bread work');
 }
 // The larger batch needs shelf room and enough fullness, through the same finite stock.
 for(let i=0;i<3;i++)tick({kind:'buy',market:'market_stall',good:'bread'});
 tick({kind:'eat',good:'bread'});
 return next;
}

/** One packed lunch made through player work, followed by a real NPC walking trip. */
export function* mealReviewSteps(state:CarState,world:World):Generator<void,CarState>{
 let next=npcReviewStart(state,world,'vendor');
 const tick=(commerce?:CarInput['commerce'])=>{next=stepInteractive(next,{steer:0,throttle:0,commerce},1/120,world);};
 tick({kind:'work',job:'pack_lunch'});
 if(!next.economy!.accounts.find(a=>a.id==='pocket')?.work)throw Error('Review could not prepare lunch');
 for(let i=0;i<120*180;i++){
  tick();if(i%30===0)yield;
  const meal=next.economy!.accounts.find(a=>a.id==='regular')?.meal;
  if(meal?.phase==='out' && Math.hypot(meal.x-meal.at.x,meal.y-meal.at.y)<18)return next;
 }
 throw Error('Review customer could not reach the market');
}

/** Existing staff make lunch, and the customer takes a normal walking meal trip. */
export function* kitchenReviewSteps(state:CarState,world:World):Generator<void,CarState>{
 let next=npcReviewStart(state,world,'vendor');
 for(let i=0;i<120*180;i++){
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;
  const meal=next.economy!.accounts.find(a=>a.id==='regular')?.meal;
  if(meal?.phase==='out' && Math.hypot(meal.x-meal.at.x,meal.y-meal.at.y)<18)return next;
 }
 throw Error('Review staff could not serve the hungry customer');
}

/** Review setup advances the complete simulation, including every resource and clock. */
export function* hoursReviewSteps(state:CarState,world:World,stage='closing'):Generator<void,CarState>{
 let next=npcReviewStart(state,world,'vendor');
 const config=world.scene.daylight!,targetHour=stage==='opening' ? 6 : 22;
 const target=((targetHour-config.startHour+24)%24)/24*config.cycleSeconds+(stage==='closed' ? 3 : -3);
 next=stepInteractive(next,{steer:0,throttle:0,commerce:{kind:'buy',market:'market_stall',good:'bread'}},1/120,world);
 if(!next.economy!.accounts.find(a=>a.id==='pocket')!.inventory.bread)throw Error('Hours review could not buy food during service');
 for(let i=0;next.timeS<target;i++){
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;
 }
 return next;
}

/** Follow the staff's actual journey through ordinary walking controls. */
export function shiftReviewInput(state:CarState,world:World,frame:number,viewAngle=0):CarInput{
 const vendor=world.scene.objects.find(o=>o.id==='vendor')!,pose=actorPose(world.scene,vendor,state.timeS,state);
 const dx=pose.x+14-state.x,dy=pose.y-10-state.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480)+viewAngle,move=frame>=90 && d>3;
 return {steer:move ? (dx*Math.cos(a)-dy*Math.sin(a))/d : 0,throttle:move ? (-dx*Math.sin(a)-dy*Math.cos(a))/d : 0,...(frame===540 ? {talkPressed:true} : {})};
}


/** Real staff purchases and meal travel precede a review-only starting pose in the hall. */
export function* seatingReviewSteps(state:CarState,world:World):Generator<void,CarState>{
 let next=npcReviewStart(state,world,'vendor');
 next=stepInteractive(next,{steer:0,throttle:0,commerce:{kind:'buy',market:'market_stall',good:'bread'}},1/120,world);
 for(let i=0;i<120*180;i++){
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;
  const meal=next.economy!.accounts.find(a=>a.id==='regular')?.meal;
  if(meal?.phase!=='eat' || !meal.seat)continue;
  const seat=worldSeats(world.scene).find(s=>s.objectId==='hall_bench' && s.seatId!==meal.seat!.seatId)!;
  next={...next,x:seat.approach.x,y:seat.approach.y,elevation:walkingHeight(world.scene,seat.approach.x,seat.approach.y)};
  next=toggleRide(next,world);if(!next.seated)throw Error('Review could not sit beside the customer');return next;
 }
 throw Error('Review customer could not reach a seat');
}
export function seatingReviewInput(state:CarState,world:World,frame:number,viewAngle=0):CarInput{
 const seat=worldSeats(world.scene).find(s=>s.objectId==='hall_bench' && s.seatId==='right')!,far=frame>=120 && frame<180;
 const target={x:seat.approach.x+(far ? 25 : 0),y:seat.approach.y-(far ? 25 : 0)},dx=target.x-state.x,dy=target.y-state.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480)+viewAngle,move=frame>=120 && frame<270 && d>1;
 return {steer:move ? (dx*Math.cos(a)-dy*Math.sin(a))/d : 0,throttle:move ? (-dx*Math.sin(a)-dy*Math.cos(a))/d : 0};
}

/** Real purchases, wages, a first meeting and ordinary walking prepare either meal owner. */
export function* sharedMealReviewSteps(state:CarState,world:World,hosted=false):Generator<void,CarState>{
 let next=npcReviewStart(state,world,'vendor');
 for(let i=0;i<(hosted ? 0 : 2);i++)next=stepInteractive(next,{steer:0,throttle:0,commerce:{kind:'buy',market:'market_stall',good:'bread'}},1/120,world);
 next=stepInteractive(next,{steer:0,throttle:0,talkPressed:true},1/120,world);
 if(next.economy!.accounts.find(a=>a.id==='pocket')!.inventory.bread!==(hosted ? 0 : 2) || !next.npcs.find(n=>n.id==='vendor')!.known)throw Error('Shared review needs paid food and a real meeting');
 for(let i=0;i<120*360 && (next.timeS<303 || next.economy!.accounts.find(a=>a.id==='baker')!.shift?.phase!=='rest');i++){
  next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;
 }
 const hall=sceneInteriors(world.scene).find(f=>f.object.id==='market_hall')!,door=portalPoints(hall,hall.room.portals[0]!,24),seat=worldSeats(world.scene).find(s=>s.objectId==='hall_bench' && s.seatId==='left')!;
 for(const target of [door.outside,door.inside,seat.approach]){
  for(let i=0;Math.hypot(next.x-target.x,next.y-target.y)>1.5;i++){
   if(i>=120*20)throw Error('Shared review could not walk through the market door');
   const dx=target.x-next.x,dy=target.y-next.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480);
   next=stepInteractive(next,{steer:(dx*Math.cos(a)-dy*Math.sin(a))/d,throttle:(-dx*Math.sin(a)-dy*Math.cos(a))/d},1/120,world);if(i%30===0)yield;
  }
 }
 next=toggleRide(next,world);if(!next.seated)throw Error('Shared review could not sit on the bench');
 if(hosted){
  for(let i=0;i<120*3 && !next.economy!.invitation;i++){next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;}
  if(next.economy!.invitation?.partner!=='baker' || next.economy!.accounts.find(a=>a.id==='pocket')!.credits!==20)throw Error('Host review needs a real paid offer and unchanged player funds');
 }
 return next;
}

/** Review positions the car and task approach; impacts, work, R and the final walk remain real fixed steps. */
export function* recoveryReviewSteps(state:CarState,world:World,stage:'work'|'counter'='counter'):Generator<void,CarState>{
 let next=yield* handReviewSteps(state,world);
 next=stepInteractive(next,{steer:0,throttle:0,strikePressed:true},1/120,world);
 for(let i=0;i<120*25;i++){next=stepInteractive(next,{steer:0,throttle:0,...(i===239 ? {commerce:{kind:'repair',repair:'market_tables'} as const} : {})},1/120,world);if(i%30===0)yield;}
 const account=()=>next.economy!.accounts.find(a=>a.id==='pocket')!,market=()=>next.economy!.markets.find(m=>m.id==='market_stall')!;
 if(market().stock.boards!==7)throw Error('Recovery review needs one consumed board and real receiving space');
 next=drivingReviewStart({...next,control:{kind:'car'},vehicles:next.vehicles.filter(v=>v.id!==null)},world,'street-tree');
 for(let i=0;i<336;i++){next=stepInteractive(next,{steer:0,throttle:i<180 ? 1 : -1},1/120,world);if(i%30===0)yield;}
 if(!next.broken.includes('garden_rowan_north'))throw Error('Recovery review did not fell its tree');
 next=npcReviewStart(next,world,'vendor');next=stepInteractive(next,{steer:0,throttle:0,commerce:{kind:'repair',repair:'orchard_trees'}},1/120,world);
 const task=account().repair;if(!task?.recover || task.objectId!=='garden_rowan_north')throw Error('Recovery review did not reserve real tree work and timber space');
 next={...next,x:task.at.x,y:task.at.y,elevation:walkingHeight(world.scene,task.at.x,task.at.y),vx:0,vy:0,vz:0,grounded:true};
 if(!carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next))throw Error('Recovery review needs a clear on-foot work approach');
 for(let i=0;i<120*(stage==='work' ? 8 : 11);i++){next=stepInteractive(next,{steer:0,throttle:0},1/120,world);if(i%30===0)yield;}
 if(stage==='work')return next;
 if(account().repair?.phase!=='home' || !account().repair?.recover || market().stock.boards!==7)throw Error('Recovery review did not produce sealed return cargo');
 next=toggleRide(resetCar(next,world.scene),world);if(next.control.kind!=='foot')throw Error('Recovery review could not leave the recovered car');
 const r=world.scene.economy!.repairs.find(r=>r.id==='orchard_trees')!,hall=sceneInteriors(world.scene).find(f=>f.object.id==='market_hall')!,door=portalPoints(hall,hall.room.portals[0]!,24),offer=courierApproach(world.scene,r,r.market,door.inside,next);if(!offer)throw Error('Recovery review needs a connected return counter');
 for(const target of [door.outside,door.inside,...offer.path]){
  let reached=false;for(let i=0;i<120*20;i++){const dx=target.x-next.x,dy=target.y-next.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480);if(d<1.5){reached=true;break;}next=stepInteractive(next,{steer:(dx*Math.cos(a)-dy*Math.sin(a))/d,throttle:(-dx*Math.sin(a)-dy*Math.cos(a))/d},1/120,world);if(i%30===0)yield;}
  if(!reached)throw Error('Recovery review could not walk its return waypoint');
 }
 if(account().repair?.phase!=='home')throw Error('Recovery review lost its cargo before handoff');return next;
}
