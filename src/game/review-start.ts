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
  for(let side=0;side<8;side++){
    const angle=side*Math.PI/4,x=pose.x+Math.cos(angle)*42,y=pose.y+Math.sin(angle)*42,elevation=drivingHeight(world.scene.terrain,x,y);
    if(carFootprintClear(bodyWorld(foot,world),x,y,elevation,0,foot))return {...foot,x,y,elevation,vx:0,vy:0};
  }
  return state;
}

/** Known clear mock-world poses for checking neutral coasting and cross-slope grip. */
export function drivingReviewStart(state:CarState,world:World,scenario:string|null):CarState {
  const district=scenario==='orchard' ? [4750,4620,Math.PI/2] : scenario==='street-crossing' ? [5217.41935483871,6339.354838709678,0] : scenario==='street-lamp' ? [6135.612721988243,4165,-Math.PI/2] : scenario==='lamp' ? [7510,7350,Math.PI/2] : scenario==='repair' ? [6540,4350,Math.PI] : scenario==='voxels' ? [7440,7460,0] : scenario==='airport' ? [2000,9400,Math.PI/2] : scenario==='medical' ? [12000,5200,0] : scenario==='town' ? [6330,4233,0] : scenario==='suburbs' ? [3600,3300,0] : scenario==='sports' ? [10400,5200,0] : scenario==='waterfront' ? [9900,2800,Math.PI/2] : scenario==='canal-bridge' ? [8610,4200,0] : scenario==='lake-bridge' ? [8865,6200,0] : undefined;
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
 if(scenario!=='wildlife' && scenario!=='pedestrians')return state;
 const object=world.scene.objects.find(o=>o.ambient?.motion.kind===(scenario==='wildlife' ? 'roam' : 'walk') && (scenario!=='wildlife' || o.ambient.motion.kind==='roam' && o.ambient.motion.gait==='walk'));
 if(!object)return state;
 const x=object.x+25,y=object.y,next:CarState={...state,control:{kind:'foot'},x,y,vx:0,vy:0,vz:0,grounded:true,elevation:drivingHeight(world.scene.terrain,x,y),vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
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
export function* repairReviewSteps(state:CarState,world:World,scenario:'lamp'|'street-lamp'|'orchard'='lamp',stage:'work'|'planted'='work'):Generator<void,CarState>{
 if(!world.scene.damagePool)throw Error('The maintenance review needs the pooled world');
 const targets=new Set(world.scene.objects.filter(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind===(scenario==='orchard' ? 'tree' : 'lamp')).map(o=>o.id));
 let next=drivingReviewStart(state,world,scenario);const driving=scenario!=='lamp' ? 180 : 132,exit=scenario!=='lamp' ? 336 : 312;
 for(let i=0;i<120*1200;i++){
  if(i===exit)next=toggleRide(next,world);
  next=stepInteractive(next,{steer:0,throttle:i<driving ? 1 : i<exit ? -1 : 0},1/120,world);
  const worker=next.economy?.accounts.find(a=>a.repair?.phase==='work' && targets.has(a.repair.objectId));
  if(stage==='work' ? worker : next.growing?.some(p=>targets.has(p.objectId)))return next;
  if(i%30===0)yield;
 }
 throw Error('The streetlight worker did not reach its repair within twenty simulation minutes');
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

/** Dev-only ground-floor walkthrough; all movement and transactions use the ordinary engine. */
export function interiorReviewStart(state:CarState,world:World,night=false):CarState{
 const f=sceneInteriors(world.scene).find(f=>f.object.id==='market_hall');if(!f)return state;
 const p=night ? f.toWorld(0,-8) : portalPoints(f,f.room.portals[0]!,24).outside;
 const next:CarState={...state,control:{kind:'foot'},x:p.x,y:p.y,elevation:walkingHeight(world.scene,p.x,p.y),vx:0,vy:0,vz:0,headingRad:Math.PI/2,grounded:true,vehicles:[{id:null,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:0}]};
 return carFootprintClear(bodyWorld(next,world),next.x,next.y,next.elevation,next.timeS,next) ? next : state;
}
export function interiorReviewInput(state:CarState,world:World,frame:number,viewAngle=0,night=false):CarInput{
 const f=sceneInteriors(world.scene).find(f=>f.object.id==='market_hall');if(!f)return {steer:0,throttle:0};
 const target=night ? f.toWorld(frame<120 ? 12 : -12,-4) : frame<300 ? f.toWorld(0,-18) : frame<360 ? f.toWorld(0,-4) : frame<450 ? f.toWorld(14,-4) : frame<540 ? f.toWorld(-14,-4) : f.toWorld(0,-18);
 const dx=target.x-state.x,dy=target.y-state.y,d=Math.hypot(dx,dy),a=Math.atan2(180,480)+viewAngle,c=Math.cos(a),s=Math.sin(a),move=d>1.5;
 return {steer:move ? (dx*c-dy*s)/d : 0,throttle:move ? (-dx*s-dy*c)/d : 0,...(!night && frame===60 ? {commerce:{kind:'work',job:'bake'} as const} : !night && frame===270 ? {commerce:{kind:'buy',market:'market_stall',good:'bread'} as const} : !night && frame===280 ? {commerce:{kind:'eat',good:'bread'} as const} : {})};
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
