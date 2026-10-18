import {checkSeatingState} from './seating';
import {interactionSight} from './sight';
import {walkingHeight} from '../scene/interiors';
import {repairTargets} from '../scene/commerce';
import {GROWTH_LIMITS} from '../scene/growth';
import {DAMAGE_POOL_LIMITS} from '../scene/damage-pool';
import {z} from 'zod';
import {createCarAtSpawn,carFootprintClear,resetCar,type CarState,type World} from './car';
import {bodyWorld} from './interaction';
import {cancelSportAction,initialSports} from './sports';
import {teamStateSchema,checkTeams} from './team-sports';
import {controlFor,behaviorFor} from '../scene/agents';
import {controlOf,impactOf,zonesOf} from '../scene/object-dsl';
import {objectFragments} from '../scene/fragments';
import {actorPose} from './actors';
import {AMBIENT_LIMITS} from '../scene/ambient';
import {economyStateSchema,socialEconomyStateSchema,shiftEconomyStateSchema,hoursEconomyStateSchema,mealEconomyStateSchema,progressEconomyStateSchema,recipeEconomyStateSchema,withPersonalHistory,priorCourierEconomyStateSchema,priorGrowthEconomyStateSchema,parkingEconomyStateSchema,previousEconomyStateSchema,initialEconomy,checkEconomyState} from './commerce';
import {SAVE_SIMULATION_VERSION,MATCH_COMPATIBILITY,preMatchScene,BUSINESS_COMPATIBILITY,preBusinessScene,SCHOOL_REPAIR_COMPATIBILITY,preSchoolRepairScene,SOCIAL_COMPATIBILITY,preSocialScene,SHIFT_COMPATIBILITY,preShiftScene,HOURS_COMPATIBILITY,preHoursScene,SEATING_COMPATIBILITY,preSeatingScene,KITCHEN_COMPATIBILITY,preKitchenScene,MEAL_COMPATIBILITY,preMealScene,PROGRESS_COMPATIBILITY,preProgressScene,RECIPE_COMPATIBILITY,preRecipeScene,EGRESS_COMPATIBILITY,INTERIOR_COMPATIBILITY,preInteriorScene,COURIER_COMPATIBILITY,preCourierScene,NATURAL_COMPATIBILITY,preFinishScene,PLANT_COMPATIBILITY,VERGE_COMPATIBILITY,prePlantScene,R44_COMPATIBILITIES,preDeliveryScene,preParkingScene,preRepairScene,preSupplyScene,preNetworkScene,prePoolScene,preVergeScene} from '../scene/save-compatibility';
import {primeSceneContacts,sceneContactData} from '../scene/contacts';
import {primeAmbientNavigation,ambientGraph,ambientNavigation} from '../scene/ambient-navigation';
import {PARKING_LIMITS} from '../scene/agents';

export const SAVE_VERSION=16,MAX_SAVE_CHARACTERS=1_000_000;
const n=z.number().finite().min(-1e7).max(1e7),clock=z.number().finite().min(0).max(1e9),count=z.number().int().min(0).max(1e9),id=z.string().min(1).max(128),v2=z.tuple([n,n]),v3=z.tuple([n,n,n]),q=z.tuple([n,n,n,n]).refine(v=>Math.abs(Math.hypot(...v)-1)<.01);
const wheelTravel=z.number().finite().min(-1e9).max(1e9);
const prop=z.object({id,x:n,y:n,vx:n,vy:n,elevation:n.optional(),vz:n.optional()}).strict();
const npc=z.object({id,stateId:id,elapsedS:clock,routeTimeS:clock,animationTimeS:clock,headingRad:n,known:z.boolean(),replyAtS:clock.optional()}).strict();
const legacySport=z.object({id,score:count,shots:count,made:count,held:z.boolean(),possessed:z.boolean(),chargeStartS:clock.nullable(),lockUntilS:clock,resetAtS:clock,event:z.enum(['goal','basket','out']).nullable(),eventUntilS:clock,shotFrom:v2.optional(),shotAtS:clock,aim:v2.optional()}).strict();
const sport=legacySport.extend({match:teamStateSchema.optional()}).strict();
const oldDebris=z.object({objectId:id,fragmentId:id,x:n,y:n,elevation:n,vx:n,vy:n,vz:n,pattern:z.enum(['scatter','splinter','crumble']).optional(),topple:z.object({pivot:v3,offset:v3,axis:v3,rest:q,duration:n.positive(),angle:n}).strict().optional(),rotation:q,spin:v3,age:clock,lifetime:n.positive(),settled:z.boolean()}).strict();
const debris=oldDebris.extend({sizeScale:z.number().finite().min(GROWTH_LIMITS.minScale).max(1).optional()}).strict();
const growing=z.object({objectId:id,serviceId:id,plantedAtS:clock,progressS:clock.max(GROWTH_LIMITS.maxSeconds)}).strict();
const member=z.object({x:n,y:n,fromX:n,fromY:n,heading:n,fromHeading:n,distance:clock,fromDistance:clock,node:z.number().int().min(-1).max(8191),previous:z.number().int().min(-1).max(8191),random:z.number().int().min(0).max(4294967295),until:clock,pauseUntil:clock,mode:z.enum(['walk','roam','flee','alert']),speed:n}).strict();
const parkedVehicle=z.object({id:id.nullable(),x:n,y:n,elevation:n,headingRad:n,distance:wheelTravel}).strict();
const stateSchema=z.object({
 x:n,y:n,vx:n,vy:n,headingRad:n,elevation:n,vz:n,grounded:z.boolean(),landingSpeed:n,timeS:clock,lap:count,nextCheckpoint:count,surface:z.enum(['road','paper','ice','water']),
 boostReadyAtS:z.record(clock),boostedThisStep:z.boolean(),carBoost:z.object({held:z.boolean(),activeUntilS:clock,readyAtS:clock}).strict(),
 sports:z.array(sport).max(8),props:z.array(prop).max(4096),broken:z.array(id).max(DAMAGE_POOL_LIMITS.instances),brokenZones:z.array(z.object({objectId:id,zoneId:id}).strict()).max(128),debris:z.array(debris).max(128),impacts:z.array(z.never()).max(0),
 seated:z.object({objectId:id,seatId:id}).strict().optional(),
 control:z.discriminatedUnion('kind',[z.object({kind:z.literal('car')}).strict(),z.object({kind:z.literal('foot')}).strict(),z.object({kind:z.literal('vehicle'),id}).strict(),z.object({kind:z.literal('passenger'),id}).strict()]),
 vehicles:z.array(parkedVehicle).max(PARKING_LIMITS.vehicles+25),npcs:z.array(npc).max(32),population:z.object({tick:count,members:z.array(member).max(192)}).strict().optional(),distance:wheelTravel,pitch:n,bank:n,jump:z.object({held:z.boolean(),bufferUntilS:clock,coyoteUntilS:clock}).strict(),
 growing:z.array(growing).max(GROWTH_LIMITS.plants).optional(),economy:economyStateSchema.optional(),
}).strict();
const preMatchState=stateSchema.extend({sports:z.array(legacySport).max(8)}).strict();
const historicalStateSchema=preMatchState.omit({seated:true}).strict();
const seventhState=historicalStateSchema.omit({growing:true}).extend({debris:z.array(oldDebris).max(128),economy:priorGrowthEconomyStateSchema.optional()}).strict();
const legacyDamageState=seventhState.extend({broken:z.array(id).max(24)});
const fifthState=legacyDamageState.extend({economy:parkingEconomyStateSchema.optional()});
const oldState=fifthState.extend({vehicles:z.array(parkedVehicle).max(24)});
const legacyPacket=z.object({kind:z.literal('dream-save'),version:z.literal(1),sourceHash:z.string().min(1).max(128),sceneId:id,worldTime:clock,state:oldState.omit({economy:true})}).strict();
const hash=z.string().regex(/^[a-f0-9]{64}$/).optional();
const secondPacket=legacyPacket.extend({version:z.literal(2),compatibilityHash:hash}).strict();
const thirdPacket=legacyPacket.extend({version:z.literal(3),compatibilityHash:hash,state:oldState.omit({economy:true}).extend({economy:previousEconomyStateSchema.optional()}).strict()}).strict();
const fourthPacket=legacyPacket.extend({version:z.literal(4),compatibilityHash:hash,state:oldState}).strict();
const fifthPacket=legacyPacket.extend({version:z.literal(5),compatibilityHash:hash,state:fifthState}).strict();
const sixthPacket=legacyPacket.extend({version:z.literal(6),compatibilityHash:hash,state:legacyDamageState}).strict();
const seventhPacket=legacyPacket.extend({version:z.literal(7),compatibilityHash:hash,state:seventhState}).strict();
const eighthPacket=legacyPacket.extend({version:z.literal(8),compatibilityHash:hash,state:historicalStateSchema.extend({economy:priorCourierEconomyStateSchema.optional()}).strict()}).strict();
const ninthPacket=legacyPacket.extend({version:z.literal(9),compatibilityHash:hash,state:historicalStateSchema.extend({economy:recipeEconomyStateSchema.optional()}).strict()}).strict();
const tenthPacket=legacyPacket.extend({version:z.literal(10),compatibilityHash:hash,state:historicalStateSchema.extend({economy:progressEconomyStateSchema.optional()}).strict()}).strict();
const eleventhPacket=legacyPacket.extend({version:z.literal(11),compatibilityHash:hash,state:historicalStateSchema.extend({economy:mealEconomyStateSchema.optional()}).strict()}).strict();
const twelfthPacket=legacyPacket.extend({version:z.literal(12),compatibilityHash:hash,state:preMatchState.extend({economy:hoursEconomyStateSchema.optional()}).strict()}).strict();
const thirteenthPacket=legacyPacket.extend({version:z.literal(13),compatibilityHash:hash,state:preMatchState.extend({economy:shiftEconomyStateSchema.optional()}).strict()}).strict();
const fourteenthPacket=legacyPacket.extend({version:z.literal(14),compatibilityHash:hash,state:preMatchState.extend({economy:socialEconomyStateSchema.optional()}).strict()}).strict();
const fifteenthPacket=legacyPacket.extend({version:z.literal(15),compatibilityHash:hash,state:preMatchState}).strict();
const packet=legacyPacket.extend({version:z.literal(SAVE_VERSION),compatibilityHash:hash,state:stateSchema}).strict();
const supported=z.discriminatedUnion('version',[legacyPacket,secondPacket,thirdPacket,fourthPacket,fifthPacket,sixthPacket,seventhPacket,eighthPacket,ninthPacket,tenthPacket,eleventhPacket,twelfthPacket,thirteenthPacket,fourteenthPacket,fifteenthPacket,packet]);
const unique=(values:unknown[])=>new Set(values).size===values.length;
const expected=new WeakMap<World['scene'],ReturnType<typeof createCarAtSpawn>>();
const previousWorlds=new WeakMap<World['scene'],Map<string,World['scene']>>();
function previousPhysicalScene(world:World,stage:'match'|'business'|'schoolRepair'|'social'|'shift'|'hours'|'seating'|'kitchen'|'meal'|'progress'|'recipe'|'interior'|'courier'|'finish'|'plant'|'verge'|'pool'|'network'|'supply'|'repair'|'parking'|'delivery'|'commerce'='repair'):World['scene']{
 let stages=previousWorlds.get(world.scene);if(!stages){stages=new Map();previousWorlds.set(world.scene,stages);}
 let scene=stages.get(stage);if(scene)return scene;
 if(stage==='match'){const prior=preMatchScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 if(stage==='business'){const prior=preBusinessScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 if(stage==='schoolRepair'){const prior=preSchoolRepairScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 if(stage==='social'){const prior=preSocialScene(world.scene),data=sceneContactData(world.scene);primeSceneContacts(prior,{...data,contacts:data.contacts.filter(c=>c.id!=='school_bench')});primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 if(stage==='shift'){const prior=preShiftScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 if(stage==='hours'){const prior=preHoursScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 if(stage==='seating'){const prior=preSeatingScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 if(stage==='kitchen'){const prior=preKitchenScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 if(stage==='meal'){const prior=preMealScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 if(stage==='progress'){const prior=preProgressScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 if(stage==='recipe'){const prior=preRecipeScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));stages.set(stage,prior);return prior;}
 const physical=stage==='interior' ? preInteriorScene(world.scene) : world.previousInteriorSaveCompatibility ? previousPhysicalScene(world,'interior') : world.scene;
 if(stage==='interior'){if(world.previousInteriorContacts)primeSceneContacts(physical,world.previousInteriorContacts);if(world.previousInteriorNavigation)primeAmbientNavigation(physical,world.previousInteriorNavigation);stages.set(stage,physical);return physical;}

 if(stage==='courier'){scene=preCourierScene(physical);primeSceneContacts(scene,sceneContactData(physical));primeAmbientNavigation(scene,ambientGraph(physical));stages.set(stage,scene);return scene;}
 if(stage==='finish'){scene=preFinishScene(physical);primeSceneContacts(scene,sceneContactData(physical));primeAmbientNavigation(scene,ambientGraph(physical));stages.set(stage,scene);return scene;}
 if(stage==='plant'){scene=prePlantScene(physical);primeSceneContacts(scene,sceneContactData(physical));primeAmbientNavigation(scene,ambientGraph(physical));stages.set(stage,scene);return scene;}
 const plantBase=world.previousPlantSaveCompatibility ? previousPhysicalScene(world,'plant') : physical;
 if(stage==='verge'){scene=preVergeScene(plantBase);primeSceneContacts(scene,sceneContactData(physical));if(world.previousVergeNavigation)primeAmbientNavigation(scene,world.previousVergeNavigation);stages.set(stage,scene);return scene;}
 const base=world.previousVergeSaveCompatibility ? previousPhysicalScene(world,'verge') : plantBase;
 const original=world.previousPoolSaveCompatibility ? prePoolScene(base) : base;
 const upgraded=stage==='pool' ? original : world.previousNetworkSaveCompatibility ? preNetworkScene(original) : original;
 const current=stage==='pool' || stage==='network' ? upgraded : world.previousSupplySaveCompatibility ? preSupplyScene(upgraded) : upgraded;
 const prior=stage==='pool' || stage==='network' || stage==='supply' ? current : world.previousRepairSaveCompatibility ? preRepairScene(current) : current;
 const staged=stage==='pool' || stage==='network' || stage==='supply' || stage==='repair' ? prior : world.previousParkingSaveCompatibility ? preParkingScene(prior) : prior;
 scene=stage==='delivery' ? preDeliveryScene(staged) : stage==='commerce' ? {...staged,economy:undefined} : staged;
 // Older stages share the registered pre-crossing pavement and unchanged contacts.
 primeSceneContacts(scene,sceneContactData(physical));primeAmbientNavigation(scene,ambientGraph(base));stages.set(stage,scene);return scene;
}
/** Rebase derived node indices; positions, travel history, random state and clocks stay saved. */
function rebasePopulation(state:CarState,previous:World['scene'],current:World['scene'],retarget=false):CarState{
 if(!state.population)return state;
 const before=ambientNavigation(previous).nodes,after=ambientNavigation(current).nodes,key=(p:{x:number;y:number})=>p.x.toFixed(6)+','+p.y.toFixed(6),indices=new Map<string,number[]>();
 after.forEach((p,i)=>{const ids=indices.get(key(p))??[];ids.push(i);indices.set(key(p),ids);});
 const mapped=before.map(p=>{const candidates=indices.get(key(p));if(!candidates?.length){if(retarget)return -1;throw Error('This update cannot preserve saved pedestrian navigation.');}const neighbors=p.links.map(i=>key(before[i]!));return candidates.find(i=>neighbors.every(k=>after[i]!.links.some(j=>key(after[j]!)===k)))??candidates[0]!;});
 const members=current.objects.filter(o=>!!o.ambient),nav=ambientNavigation(current);
 return {...state,population:{...state.population,members:state.population.members.map((m,index)=>{
  let node=m.node<0 ? m.node : mapped[m.node]!;
  if(retarget && members[index]!.ambient!.motion.kind==='walk' && (node<0 || !nav.segment(m,after[node]!,nav.radius(members[index]!),true))){
   const candidate=after.map((p,i)=>({p,i,d:Math.hypot(p.x-m.x,p.y-m.y)})).filter(p=>p.p.links.length).sort((a,b)=>a.d-b.d || a.i-b.i).slice(0,32).find(p=>nav.segment(m,p.p,nav.radius(members[index]!),true));
   if(!candidate)throw Error('This update cannot preserve this saved pedestrian position.');node=candidate.i;
  }
  return {...m,node,previous:m.previous<0 ? m.previous : mapped[m.previous]!};
 })}};
}
function historicalState(s:unknown):CarState{const state=s as CarState;return state.economy ? {...state,economy:{...state.economy,repaired:{}}} : state;}
function checkLegacyState(s:Omit<CarState,'economy'> & {economy?:Parameters<typeof withPersonalHistory>[0]},world:World){checkState({...s,economy:s.economy && withPersonalHistory(s.economy)},world);}
function checkState(s:CarState,world:World){
 checkTeams(s,world.scene);
 checkSeatingState(s,world.scene);
 checkEconomyState(s,world.scene);
 const scene=world.scene,objects=new Map(scene.objects.map(o=>[o.id,o]));let fresh=expected.get(scene);if(!fresh){fresh=createCarAtSpawn(scene);expected.set(scene,fresh);}
 const ambient=scene.objects.filter(o=>o.ambient);
 const sameIds=(a:{id:string}[],b:{id:string}[])=>{const ids=new Set(b.map(m=>m.id));return a.length===b.length && unique(a.map(n=>n.id)) && a.every(n=>ids.has(n.id));};
 if(!sameIds(s.props,fresh.props) || !sameIds(s.npcs,fresh.npcs) || !sameIds(s.sports,fresh.sports) || s.nextCheckpoint>=scene.checkpoints.length)throw Error('Saved members or checkpoint do not match this world');
 if(s.x<0 || s.y<0 || s.x>scene.canonical.width || s.y>scene.canonical.height)throw Error('Saved player is outside this world');
 if([...s.props,...s.vehicles].some(p=>p.x<0 || p.y<0 || p.x>scene.canonical.width || p.y>scene.canonical.height))throw Error('Saved prop or vehicle is outside this world');
 if(Object.keys(s.boostReadyAtS).some(id=>!scene.regions.some(r=>r.id===id && r.rule.effect==='BOOST')))throw Error('Unknown saved boost region');
 for(const snapshot of s.npcs){const program=behaviorFor(scene,objects.get(snapshot.id)!)!;if(snapshot.routeTimeS>s.timeS+1e-6 || snapshot.elapsedS>s.timeS+1e-6 || snapshot.animationTimeS>s.timeS+1e-6 || !program.states.some(state=>state.id===snapshot.stateId) || snapshot.replyAtS!==undefined && snapshot.replyAtS>s.timeS+1e-6)throw Error('Invalid saved NPC state');}
 const control=s.control;
 const occupied=control.kind==='vehicle' || control.kind==='passenger' ? objects.get(control.id) : undefined;
 const seat=occupied?.spec && 'rideable' in occupied.spec ? occupied.spec.rideable : undefined;
 if(control.kind==='vehicle' && !controlFor(occupied) || control.kind==='passenger' && (!seat || controlOf(occupied?.spec)))throw Error('Invalid saved vehicle owner');
 if(control.kind==='passenger'){const pose=actorPose(scene,occupied!,s.timeS,s);if(Math.hypot(s.x-pose.x,s.y-pose.y,s.elevation-pose.elevation)>1)throw Error('Saved passenger is separated from their vehicle');}
 if(!unique(s.vehicles.map(v=>v.id)) || s.vehicles.some(v=>v.id===null ? control.kind==='car' : !controlFor(objects.get(v.id)) || control.kind==='vehicle' && v.id===control.id) || control.kind!=='car' && !s.vehicles.some(v=>v.id===null))throw Error('Saved vehicle ownership is inconsistent');
 if(!scene.damagePool && s.broken.length>24 || scene.damagePool && new Set(s.debris.map(p=>p.objectId)).size>DAMAGE_POOL_LIMITS.assemblies)throw Error('Saved damage exceeds its world budget');
 if(!unique(s.broken) || s.broken.some(id=>!['break','topple'].includes(impactOf(objects.get(id)?.spec)?.kind??'')))throw Error('Invalid saved destruction');
 if(!unique(s.brokenZones.map(z=>JSON.stringify([z.objectId,z.zoneId]))) || s.brokenZones.some(z=>!zonesOf(objects.get(z.objectId)?.spec).some(zone=>zone.id===z.zoneId)))throw Error('Invalid saved building damage');
 if(!unique(s.debris.map(d=>JSON.stringify([d.objectId,d.fragmentId]))))throw Error('Duplicate saved fragments');
 for(const piece of s.debris){const spec=objects.get(piece.objectId)?.spec;if(!spec || !('dslVersion' in spec) || spec.dslVersion!==2)throw Error('Unknown saved fragment');const fragment=objectFragments(spec).find(f=>f.id===piece.fragmentId);if(piece.sizeScale!==undefined && !scene.economy?.repairs.some(r=>r.regrow_s!==undefined && repairTargets(scene,r).some(t=>t.objectId===piece.objectId)))throw Error('Invalid saved fragment growth scale');if(!fragment || !(fragment.zone ? s.brokenZones.some(z=>z.objectId===piece.objectId && z.zoneId===fragment.zone) : s.broken.includes(piece.objectId)))throw Error('Saved fragment has no matching damage');}
 const population=s.population,tick=Math.floor((s.timeS+1e-8)/AMBIENT_LIMITS.tickSeconds);
 if(population?.members.length!==fresh.population?.members.length)throw Error('Invalid saved population');
 // A stale clock would replay unbounded ambient ticks on the first movement input.
 if(population && (population.tick>Math.floor((s.timeS+1e-6)/AMBIENT_LIMITS.tickSeconds) || ambient.length>0 && population.tick<Math.max(0,tick-1)))throw Error('Invalid saved population clock');
 if(population?.members.some((m,i)=>{const o=ambient[i]!;return m.x<0 || m.y<0 || m.x>scene.canonical.width || m.y>scene.canonical.height || o.ambient!.motion.kind==='walk' && (m.mode!=='walk' || m.node<0 || m.node>=ambientNavigation(scene).nodes.length); }))throw Error('Invalid saved population member');
}
/** Registered geometry upgrade: step onto the new floor or clear its wall locally, retaining ownership. */
function interiorPose(state:CarState,world:World):CarState{
 if(state.control.kind==='passenger' || !state.grounded)return state;
 const player=world.scene.economy?.accounts.find(a=>a.actor==='player'),job=state.economy?.accounts.find(a=>a.id===player?.id)?.work,market=job && world.scene.economy!.markets.find(m=>m.id===world.scene.economy!.jobs.find(j=>j.id===job.id)!.market),vendor=market && world.scene.objects.find(o=>o.id===market.actor),pose=vendor && actorPose(world.scene,vendor,state.timeS,state);
 const context=(p:CarState)=>!market || !pose || Math.hypot(p.x-pose.x,p.y-pose.y,p.elevation-pose.elevation)<=market.radius && interactionSight(world.scene,p,pose,p,market.actor);
 const body=bodyWorld(state,world);let fallback:CarState|undefined;
 const fit=(x:number,y:number)=>{
  const elevation=walkingHeight(world.scene,x,y,body.carRadius);
  if(Math.abs(elevation-state.elevation)>4.05)return;
  if(!carFootprintClear(body,x,y,elevation,state.timeS,state))return;
  const candidate={...state,x,y,elevation};fallback??=candidate;return context(candidate) ? candidate : undefined;
 };
 if(carFootprintClear(body,state.x,state.y,state.elevation,state.timeS,state) && context(state))return state;
 const raised=fit(state.x,state.y);if(raised)return raised;
 for(let distance=1;distance<=32;distance++)for(let side=0;side<16;side++){
  const angle=side*Math.PI/8,next=fit(state.x+Math.cos(angle)*distance,state.y+Math.sin(angle)*distance);if(next)return next;
 }
 return fallback??state;
}
/** Save simulation data only. Held input and transient effects are deliberately cancelled. */
export function encodeSave(state:CarState,worldTime:number,world:World):string{
 const clean=cancelSportAction(state),safe={...clean,impacts:[],boostedThisStep:false,jump:{...clean.jump,held:false,bufferUntilS:0},carBoost:{...clean.carBoost,held:false}};
 const data=packet.parse({kind:'dream-save',version:SAVE_VERSION,sceneId:world.scene.sceneId,sourceHash:world.scene.sourceHash,compatibilityHash:world.saveCompatibility,worldTime,state:safe});
 checkState(data.state,world);const text=JSON.stringify(data);if(text.length>MAX_SAVE_CHARACTERS)throw Error('Save exceeds one million characters');return text;
}
export function decodeSave(text:string,world:World):{state:CarState;worldTime:number;sourceHash:string;version:number;migrated:boolean;compatible:boolean}{
 if(text.length>MAX_SAVE_CHARACTERS)throw Error('Save exceeds one million characters');
 let data:z.infer<typeof supported>;
 try{data=supported.parse(JSON.parse(text));}catch{throw Error('This file is not a supported Muse Dream backup.');}
 if(world.saveCompatibility===MATCH_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==MATCH_COMPATIBILITY)){
  if(world.previousMatchSaveCompatibility!==BUSINESS_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'match'),saveCompatibility:BUSINESS_COMPATIBILITY,previousMatchSaveCompatibility:undefined});
  const fresh=initialSports(world.scene),state={...restored.state,sports:restored.state.sports.map(game=>({...game,held:false,possessed:false,chargeStartS:null,aim:undefined,match:fresh.find(g=>g.id===game.id)?.match}))};
  try{checkState(state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===BUSINESS_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==BUSINESS_COMPATIBILITY)){
  if(world.previousBusinessSaveCompatibility!==SCHOOL_REPAIR_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'business'),saveCompatibility:SCHOOL_REPAIR_COMPATIBILITY,previousBusinessSaveCompatibility:undefined});
  const fresh=initialEconomy(world.scene,restored.state.timeS)!,old=restored.state.economy!;
  const state={...restored.state,economy:{...old,accounts:[...old.accounts,...fresh.accounts.filter(a=>!old.accounts.some(b=>b.id===a.id))],markets:old.markets.map(m=>({...m,...(fresh.markets.find(n=>n.id===m.id)?.owner ? {owner:fresh.markets.find(n=>n.id===m.id)!.owner} : {})}))}};
  try{checkState(state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===SCHOOL_REPAIR_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==SCHOOL_REPAIR_COMPATIBILITY)){
  if(world.previousSchoolRepairSaveCompatibility!==SOCIAL_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'schoolRepair'),saveCompatibility:SOCIAL_COMPATIBILITY,previousSchoolRepairSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===SOCIAL_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==SOCIAL_COMPATIBILITY)){
  if(world.previousSocialSaveCompatibility!==SHIFT_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'social'),saveCompatibility:SHIFT_COMPATIBILITY,previousSocialSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===SHIFT_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==SHIFT_COMPATIBILITY)){
  if(world.previousShiftSaveCompatibility!==HOURS_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'shift'),saveCompatibility:HOURS_COMPATIBILITY,previousShiftSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===HOURS_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==HOURS_COMPATIBILITY)){
  if(world.previousHoursSaveCompatibility!==SEATING_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'hours'),saveCompatibility:SEATING_COMPATIBILITY,previousHoursSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===SEATING_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==SEATING_COMPATIBILITY)){
  if(world.previousSeatingSaveCompatibility!==KITCHEN_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'seating'),saveCompatibility:KITCHEN_COMPATIBILITY,previousSeatingSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 // The registered staff/navigation upgrade retains the packet shape and saved fields.
 if(world.saveCompatibility===KITCHEN_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==KITCHEN_COMPATIBILITY)){
  if(world.previousKitchenSaveCompatibility!==MEAL_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'kitchen'),saveCompatibility:MEAL_COMPATIBILITY,previousKitchenSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 // The registered rules-only upgrade first validates using the complete prior contract.
 // Existing records are retained exactly; do not run historical attribution again.
 if(world.saveCompatibility===MEAL_COMPATIBILITY && data.version<11){
  if(world.previousMealSaveCompatibility!==PROGRESS_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'meal'),saveCompatibility:PROGRESS_COMPATIBILITY,previousMealSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 const currentFormat=data.version===SAVE_VERSION || data.version===15 && world.saveCompatibility===BUSINESS_COMPATIBILITY || data.version===14 && (world.saveCompatibility===SCHOOL_REPAIR_COMPATIBILITY || world.saveCompatibility===SOCIAL_COMPATIBILITY) || data.version===13 && world.saveCompatibility===SHIFT_COMPATIBILITY || data.version===12 && (world.saveCompatibility===HOURS_COMPATIBILITY || world.saveCompatibility===SEATING_COMPATIBILITY) || data.version===11 && (world.saveCompatibility===KITCHEN_COMPATIBILITY || world.saveCompatibility===MEAL_COMPATIBILITY) || data.version===10 && world.saveCompatibility===PROGRESS_COMPATIBILITY;
 const exact=data.sourceHash===world.scene.sourceHash,compatible=currentFormat && data.version!==1 && data.compatibilityHash!==undefined && data.compatibilityHash===world.saveCompatibility;
 const untaggedExact=exact && !world.scene.economy;
 const knownSource=world.previousSaveSource!==undefined && data.sourceHash===world.previousSaveSource;
 const oldFingerprint=data.version===2 && data.compatibilityHash!==undefined && (data.compatibilityHash===world.previousSaveCompatibility || !!world.previousSaveSource && (R44_COMPATIBILITIES as readonly string[]).includes(data.compatibilityHash));
 const oldRules=Number(SAVE_SIMULATION_VERSION)===24 && (data.version===2 ? oldFingerprint || knownSource || data.compatibilityHash===undefined && untaggedExact && world.saveCompatibility===undefined : data.version===1 && (knownSource || untaggedExact));
 const addEconomy=Number(SAVE_SIMULATION_VERSION)===24 && data.version===3 && !data.state.economy && data.compatibilityHash!==undefined && data.compatibilityHash===world.emptyEconomySaveCompatibility;
 const addDeliveries=Number(SAVE_SIMULATION_VERSION)===24 && data.version===3 && !!data.state.economy && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousMarketSaveCompatibility;
 const addProgress=Number(SAVE_SIMULATION_VERSION)===24 && data.version===9 && world.saveCompatibility===PROGRESS_COMPATIBILITY && world.previousProgressSaveCompatibility===RECIPE_COMPATIBILITY && data.compatibilityHash===world.previousProgressSaveCompatibility;
 const addRecipes=Number(SAVE_SIMULATION_VERSION)===24 && data.version===9 && (world.saveCompatibility===RECIPE_COMPATIBILITY || world.saveCompatibility===PROGRESS_COMPATIBILITY) && world.previousRecipeSaveCompatibility===EGRESS_COMPATIBILITY && data.compatibilityHash===world.previousRecipeSaveCompatibility;
 const updateEgress=Number(SAVE_SIMULATION_VERSION)===24 && data.version===9 && (world.saveCompatibility===EGRESS_COMPATIBILITY || world.saveCompatibility===RECIPE_COMPATIBILITY || world.saveCompatibility===PROGRESS_COMPATIBILITY) && world.previousEgressSaveCompatibility===INTERIOR_COMPATIBILITY && data.compatibilityHash===world.previousEgressSaveCompatibility;
 const addInterior=Number(SAVE_SIMULATION_VERSION)===24 && data.version===9 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousInteriorSaveCompatibility;
 const addCourier=Number(SAVE_SIMULATION_VERSION)===24 && data.version===8 && data.compatibilityHash===world.previousCourierSaveCompatibility && data.compatibilityHash!==undefined;
 const addFinish=Number(SAVE_SIMULATION_VERSION)===24 && data.version===8 && data.compatibilityHash===world.previousFinishSaveCompatibility && data.compatibilityHash!==undefined;
 const addPlant=Number(SAVE_SIMULATION_VERSION)===24 && data.version===7 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousPlantSaveCompatibility;
 const addVerge=Number(SAVE_SIMULATION_VERSION)===24 && data.version===7 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousVergeSaveCompatibility;
 const addPool=Number(SAVE_SIMULATION_VERSION)===24 && data.version===6 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousPoolSaveCompatibility;
 const addNetwork=Number(SAVE_SIMULATION_VERSION)===24 && data.version===6 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousNetworkSaveCompatibility;
 const addSupply=Number(SAVE_SIMULATION_VERSION)===24 && data.version===6 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousSupplySaveCompatibility;
 const addRepairs=Number(SAVE_SIMULATION_VERSION)===24 && data.version===5 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousRepairSaveCompatibility;
 const addParking=Number(SAVE_SIMULATION_VERSION)===24 && data.version===4 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousParkingSaveCompatibility;
 if(data.sceneId!==world.scene.sceneId || !(addProgress || addRecipes || updateEgress || oldRules || addEconomy || addDeliveries || addParking || addRepairs || addSupply || addNetwork || addPool || addVerge || addPlant || addFinish || addCourier || addInterior || currentFormat && data.version!==1 && (exact || compatible) && data.compatibilityHash===world.saveCompatibility))throw Error('This backup needs a different world or simulation version.');
 const legacyMigrated=!!(oldRules || addEconomy || addDeliveries || addParking || addRepairs || addSupply || addNetwork || addPool || addVerge || addPlant || addFinish || addCourier || addInterior);
 const migrated=legacyMigrated || updateEgress || addRecipes || addProgress;
 if(migrated && world.saveCompatibility===PROGRESS_COMPATIBILITY && world.previousProgressSaveCompatibility!==RECIPE_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
 if(migrated && (world.saveCompatibility===RECIPE_COMPATIBILITY || world.saveCompatibility===PROGRESS_COMPATIBILITY) && !addProgress && (world.previousRecipeSaveCompatibility!==EGRESS_COMPATIBILITY || legacyMigrated && !world.previousInteriorSaveCompatibility))throw Error('This backup needs a different world or simulation version.');
 if(migrated && world.saveCompatibility===EGRESS_COMPATIBILITY && (world.previousEgressSaveCompatibility!==INTERIOR_COMPATIBILITY || legacyMigrated && !world.previousInteriorSaveCompatibility))throw Error('This backup needs a different world or simulation version.');
 if(migrated && world.saveCompatibility===INTERIOR_COMPATIBILITY && !world.previousInteriorSaveCompatibility)throw Error('This backup needs a different world or simulation version.');if(migrated && world.saveCompatibility===COURIER_COMPATIBILITY && !world.previousCourierSaveCompatibility)throw Error('This backup needs a different world or simulation version.');if(migrated && world.saveCompatibility===NATURAL_COMPATIBILITY && (!world.previousFinishSaveCompatibility || !addFinish && !world.previousPlantSaveCompatibility))throw Error('This backup needs a different world or simulation version.');if(migrated && world.saveCompatibility===PLANT_COMPATIBILITY && !world.previousPlantSaveCompatibility)throw Error('This backup needs a different world or simulation version.');if(migrated && world.saveCompatibility===VERGE_COMPATIBILITY && !world.previousVergeSaveCompatibility)throw Error('This backup needs a different world or simulation version.');let restored:CarState;
 if(oldRules || addEconomy){try{checkLegacyState(historicalState(data.state),{...world,scene:previousPhysicalScene(world,'commerce')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addParking){try{checkLegacyState(historicalState(data.state),{...world,scene:previousPhysicalScene(world,'parking')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addDeliveries && data.version===3 && data.state.economy){
  const previous={...data.state,economy:{...data.state.economy,delivered:{},repaired:{}}};
  try{checkLegacyState(previous,{...world,scene:previousPhysicalScene(world,'delivery')});}catch{throw Error('This backup contains invalid world state.');}
  const next=initialEconomy(previousPhysicalScene(world),data.state.timeS)!,old=data.state.economy;
  restored={...data.state,economy:{...next,...old,accounts:next.accounts.map(a=>({...a,...old.accounts.find(b=>b.id===a.id)})),markets:next.markets.map(m=>old.markets.find(n=>n.id===m.id)??m),delivered:next.delivered,repaired:next.repaired}};
 }else restored=oldRules || addEconomy ? {...data.state,economy:initialEconomy(world.scene,data.state.timeS)} : data.version>=6 ? data.state as CarState : historicalState(data.state);
 if(addProgress){try{checkLegacyState(data.state as CarState,{...world,scene:previousPhysicalScene(world,'progress')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addRecipes || updateEgress){try{checkLegacyState(data.state as CarState,{...world,scene:previousPhysicalScene(world,'recipe')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addInterior){try{checkLegacyState(data.state as CarState,{...world,scene:previousPhysicalScene(world,'interior')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addCourier){try{checkLegacyState(data.state as CarState,{...world,scene:previousPhysicalScene(world,'courier')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addFinish){try{checkLegacyState(data.state as CarState,{...world,scene:previousPhysicalScene(world,'finish')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addPlant){try{checkLegacyState(data.state as CarState,{...world,scene:previousPhysicalScene(world,'plant')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addVerge){try{checkLegacyState(data.state as CarState,{...world,scene:previousPhysicalScene(world,'verge')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addPool){try{checkLegacyState(data.state as CarState,{...world,scene:previousPhysicalScene(world,'pool')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addNetwork){try{checkLegacyState(data.state as CarState,{...world,scene:previousPhysicalScene(world,'network')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addSupply){try{checkLegacyState(data.state as CarState,{...world,scene:previousPhysicalScene(world,'supply')});}catch{throw Error('This backup contains invalid world state.');}}
 if(addRepairs){try{checkLegacyState(historicalState(data.state),{...world,scene:previousPhysicalScene(world)});}catch{throw Error('This backup contains invalid world state.');}}
 if((addProgress || addRecipes || updateEgress || legacyMigrated && (world.previousRecipeSaveCompatibility || world.previousRepairSaveCompatibility || world.previousSupplySaveCompatibility || world.previousPlantSaveCompatibility)) && restored.economy){const fresh=initialEconomy(world.scene,restored.timeS)!,old=restored.economy;restored={...restored,economy:{...fresh,...old,accounts:fresh.accounts.map(a=>{const existing=old.accounts.find(b=>b.id===a.id);return existing ? {...existing,inventory:{...a.inventory,...existing.inventory}} : a;}),markets:fresh.markets.map(m=>{const existing=old.markets.find(n=>n.id===m.id);return existing ? {...existing,stock:{...m.stock,...existing.stock}} : m;}),consumed:{...fresh.consumed,...old.consumed},batches:{...fresh.batches,...old.batches},delivered:{...fresh.delivered,...old.delivered},repaired:{...fresh.repaired,...old.repaired}}};}
 if(migrated && restored.economy)restored={...restored,economy:withPersonalHistory(restored.economy)};
 if(legacyMigrated && world.previousInteriorSaveCompatibility){
  const previous=addInterior ? previousPhysicalScene(world,'interior') : addCourier || addFinish || addPlant ? previousPhysicalScene(world,'courier') : previousPhysicalScene(world,'verge');
  restored=rebasePopulation(restored,previous,world.scene,true);
 }else if(legacyMigrated && !addPlant && !addFinish && !addCourier && world.previousVergeSaveCompatibility)restored=rebasePopulation(restored,previousPhysicalScene(world,'verge'),world.scene);
 try{checkState(restored,world);}catch{throw Error('This backup contains invalid world state.');}
 if(legacyMigrated && world.previousInteriorSaveCompatibility)restored=interiorPose(restored,world);
 // A valid saved world can outlive a safe active-body pose. Recover only the player.
 const state=restored.control.kind==='passenger' || carFootprintClear(bodyWorld(restored,world),restored.x,restored.y,restored.elevation,restored.timeS,restored) ? restored : resetCar({...restored,grounded:false},world.scene);
 return {state,worldTime:data.worldTime,sourceHash:data.sourceHash,version:data.version,migrated,compatible:data.sourceHash!==world.scene.sourceHash};
}
