import {objectPlacement} from '../scene/placement';
import {streetFootprints,onPolygon} from '../scene/streets';
import {sitePolygons} from '../scene/sites';
import {routeInfrastructure} from '../scene/routes';
import {distanceToRoad} from '../scene/road';
import {playerHeight,assemblyHorizontalRadius} from '../scene/measure';
import {objectHeight} from './archetypes';
import {initialAmbient,ambientObjects} from './ambient';
import {cityJourneys} from './city-upgrade';
import {schoolInteriorUpgrade} from './school-interior-upgrade';
import {indoorServiceUpgrade} from './indoor-service-upgrade';
import {checkSeatingState} from './seating';
import {interactionSight} from './sight';
import {homeVehicles} from './home-upgrade';
import {walkingHeight} from '../scene/interiors';
import {repairTargets,recoverySourceIds,inheritPriorRepairCoverage} from '../scene/commerce';
import {GROWTH_LIMITS} from '../scene/growth';
import {DAMAGE_POOL_LIMITS} from '../scene/damage-pool';
import {z} from 'zod';
import {createCarAtSpawn,carFootprintClear,resetCar,type CarState,type World} from './car';
import {bodyWorld} from './interaction';
import {cancelSportAction,initialSports} from './sports';
import {teamStateSchema,checkTeams} from './team-sports';
import {isParkedVehicle,controlFor,behaviorFor} from '../scene/agents';
import {controlOf,impactOf,zonesOf} from '../scene/object-dsl';
import {objectFragments} from '../scene/fragments';
import {actorPose} from './actors';
import {AMBIENT_LIMITS} from '../scene/ambient';
import {refundDamagedWork,priorRecoveryEconomyStateSchema,priorInvitationEconomyStateSchema,economyStateSchema,socialEconomyStateSchema,shiftEconomyStateSchema,hoursEconomyStateSchema,mealEconomyStateSchema,progressEconomyStateSchema,recipeEconomyStateSchema,withPersonalHistory,priorCourierEconomyStateSchema,priorGrowthEconomyStateSchema,parkingEconomyStateSchema,previousEconomyStateSchema,initialEconomy,checkEconomyState} from './commerce';
import {WORK_COMMUTE_COMPATIBILITY,preWorkCommuteScene,HOME_MEALS_COMPATIBILITY,preHomeMealsScene,HOME_INTERIOR_COMPATIBILITY,preHomeInteriorScene,WEATHER_COMPATIBILITY,preWeatherScene,RATIONS_COMPATIBILITY,preRationsScene,SCHOOL_INTERIOR_COMPATIBILITY,preSchoolInteriorScene,NURSERY_COMPATIBILITY,preNurseryScene,HARDWARE_COMPATIBILITY,preHardwareScene,RECOVERY_COMPATIBILITY,preRecoveryScene,RESIDENT_SUPPLY_COMPATIBILITY,preResidentSupplyScene,WORKSHOP_SUPPLY_COMPATIBILITY,preWorkshopSupplyScene,KIT_PRODUCTION_COMPATIBILITY,preKitProductionScene,STRIKE_COMPATIBILITY,preStrikeScene,EQUIPMENT_COMPATIBILITY,preEquipmentScene,SERVICE_COMPATIBILITY,preServiceScene,CHARACTERS_COMPATIBILITY,preCharactersScene,FIXTURES_COMPATIBILITY,preFixturesScene,WILDLIFE_COMPATIBILITY,preWildlifeScene,FURNITURE_COMPATIBILITY,preFurnitureScene,BOTANY_COMPATIBILITY,preBotanyScene,CANOPY_COMPATIBILITY,preCanopyScene,FLEET_COMPATIBILITY,preFleetScene,TREE_COMPATIBILITY,preTreeScene,COVERAGE_COMPATIBILITY,preCoverageScene,INVITATION_COMPATIBILITY,preInvitationScene,SAVE_SIMULATION_VERSION,PEOPLE_COMPATIBILITY,prePeopleScene,JUNCTION_COMPATIBILITY,preJunctionScene,SPACING_COMPATIBILITY,PARK_COMPATIBILITY,preParkScene,CITY_COMPATIBILITY,preCityScene,MATCH_COMPATIBILITY,preMatchScene,BUSINESS_COMPATIBILITY,preBusinessScene,SCHOOL_REPAIR_COMPATIBILITY,preSchoolRepairScene,SOCIAL_COMPATIBILITY,preSocialScene,SHIFT_COMPATIBILITY,preShiftScene,HOURS_COMPATIBILITY,preHoursScene,SEATING_COMPATIBILITY,preSeatingScene,KITCHEN_COMPATIBILITY,preKitchenScene,MEAL_COMPATIBILITY,preMealScene,PROGRESS_COMPATIBILITY,preProgressScene,RECIPE_COMPATIBILITY,preRecipeScene,EGRESS_COMPATIBILITY,INTERIOR_COMPATIBILITY,preInteriorScene,COURIER_COMPATIBILITY,preCourierScene,NATURAL_COMPATIBILITY,preFinishScene,PLANT_COMPATIBILITY,VERGE_COMPATIBILITY,prePlantScene,R44_COMPATIBILITIES,preDeliveryScene,preParkingScene,preRepairScene,preSupplyScene,preNetworkScene,prePoolScene,preVergeScene} from '../scene/save-compatibility';
import {primeSceneContacts,sceneContactData} from '../scene/contacts';
import {primeAmbientNavigation,ambientGraph,ambientNavigation} from '../scene/ambient-navigation';
import {PARKING_LIMITS} from '../scene/agents';

export const SAVE_VERSION=19,MAX_SAVE_CHARACTERS=1_000_000;
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
const priorStrikeState=z.object({
 x:n,y:n,vx:n,vy:n,headingRad:n,elevation:n,vz:n,grounded:z.boolean(),landingSpeed:n,timeS:clock,lap:count,nextCheckpoint:count,surface:z.enum(['road','paper','ice','water']),
 boostReadyAtS:z.record(clock),boostedThisStep:z.boolean(),carBoost:z.object({held:z.boolean(),activeUntilS:clock,readyAtS:clock}).strict(),
 sports:z.array(sport).max(8),props:z.array(prop).max(4096),broken:z.array(id).max(DAMAGE_POOL_LIMITS.instances),brokenZones:z.array(z.object({objectId:id,zoneId:id}).strict()).max(128),debris:z.array(debris).max(128),impacts:z.array(z.never()).max(0),
 seated:z.object({objectId:id,seatId:id}).strict().optional(),
 control:z.discriminatedUnion('kind',[z.object({kind:z.literal('car')}).strict(),z.object({kind:z.literal('foot')}).strict(),z.object({kind:z.literal('vehicle'),id}).strict(),z.object({kind:z.literal('passenger'),id}).strict()]),
 vehicles:z.array(parkedVehicle).max(PARKING_LIMITS.vehicles+25),npcs:z.array(npc).max(32),population:z.object({tick:count,members:z.array(member).max(192)}).strict().optional(),distance:wheelTravel,pitch:n,bank:n,jump:z.object({held:z.boolean(),bufferUntilS:clock,coyoteUntilS:clock}).strict(),
 growing:z.array(growing).max(GROWTH_LIMITS.plants).optional(),economy:priorRecoveryEconomyStateSchema.optional(),
}).strict();
const preRecoveryState=priorStrikeState.extend({strikeReadyAtS:clock.optional()}).strict();
const stateSchema=preRecoveryState.extend({economy:economyStateSchema.optional()}).strict();
const preMatchState=priorStrikeState.extend({sports:z.array(legacySport).max(8),economy:priorInvitationEconomyStateSchema.optional()}).strict();
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
const sixteenthPacket=legacyPacket.extend({version:z.literal(16),compatibilityHash:hash,state:priorStrikeState.extend({economy:priorInvitationEconomyStateSchema.optional()}).strict()}).strict();
const seventeenthPacket=legacyPacket.extend({version:z.literal(17),compatibilityHash:hash,state:priorStrikeState}).strict();
const eighteenthPacket=legacyPacket.extend({version:z.literal(18),compatibilityHash:hash,state:preRecoveryState}).strict();
const packet=legacyPacket.extend({version:z.literal(SAVE_VERSION),compatibilityHash:hash,state:stateSchema}).strict();
const supported=z.discriminatedUnion('version',[legacyPacket,secondPacket,thirdPacket,fourthPacket,fifthPacket,sixthPacket,seventhPacket,eighthPacket,ninthPacket,tenthPacket,eleventhPacket,twelfthPacket,thirteenthPacket,fourteenthPacket,fifteenthPacket,sixteenthPacket,seventeenthPacket,eighteenthPacket,packet]);
const unique=(values:unknown[])=>new Set(values).size===values.length;
const expected=new WeakMap<World['scene'],ReturnType<typeof createCarAtSpawn>>();
const previousWorlds=new WeakMap<World['scene'],Map<string,World['scene']>>();
function previousPhysicalScene(world:World,stage:'workCommute'|'homeMeals'|'homeInterior'|'weather'|'rations'|'schoolInterior'|'nursery'|'hardware'|'recovery'|'residentSupply'|'workshopSupply'|'kitProduction'|'strike'|'equipment'|'service'|'characters'|'fixtures'|'wildlife'|'furniture'|'botany'|'canopy'|'fleet'|'tree'|'coverage'|'invitation'|'people'|'junction'|'park'|'city'|'match'|'business'|'schoolRepair'|'social'|'shift'|'hours'|'seating'|'kitchen'|'meal'|'progress'|'recipe'|'interior'|'courier'|'finish'|'plant'|'verge'|'pool'|'network'|'supply'|'repair'|'parking'|'delivery'|'commerce'='repair'):World['scene']{
 let stages=previousWorlds.get(world.scene);if(!stages){stages=new Map();previousWorlds.set(world.scene,stages);}
 let scene=stages.get(stage);if(scene)return scene;
 const remember=(prior:World['scene'])=>{if(stage!=='workCommute' && stage!=='homeMeals' && stage!=='homeInterior' && stage!=='weather' && stage!=='rations' && stage!=='schoolInterior' && stage!=='nursery' && stage!=='hardware' && stage!=='recovery' && stage!=='residentSupply' && stage!=='service' && stage!=='equipment' && stage!=='strike' && stage!=='kitProduction' && stage!=='workshopSupply')inheritPriorRepairCoverage(prior,stage==='coverage' ? undefined : world.scene);stages!.set(stage,prior);return prior;};
 if(stage==='workCommute'){const prior=preWorkCommuteScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='homeMeals'){const prior=preHomeMealsScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='homeInterior'){const prior=preHomeInteriorScene(world.scene);if(world.previousHomeInteriorContacts)primeSceneContacts(prior,world.previousHomeInteriorContacts);if(world.previousHomeInteriorNavigation)primeAmbientNavigation(prior,world.previousHomeInteriorNavigation);return remember(prior);}
 if(stage==='weather'){const prior=preWeatherScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='rations'){const prior=preRationsScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='schoolInterior'){const prior=preSchoolInteriorScene(world.scene);if(world.previousSchoolInteriorContacts)primeSceneContacts(prior,world.previousSchoolInteriorContacts);if(world.previousSchoolInteriorNavigation)primeAmbientNavigation(prior,world.previousSchoolInteriorNavigation);return remember(prior);}
 if(stage==='nursery'){const prior=preNurseryScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='hardware'){const prior=preHardwareScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='recovery'){const prior=preRecoveryScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='residentSupply'){const prior=preResidentSupplyScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='workshopSupply'){const prior=preWorkshopSupplyScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='kitProduction'){const prior=preKitProductionScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='strike'){const prior=preStrikeScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='equipment'){const prior=preEquipmentScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='service'){const prior=preServiceScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));if(world.previousServiceNavigation)primeAmbientNavigation(prior,world.previousServiceNavigation);return remember(prior);}
 if(stage==='characters'){const prior=preCharactersScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='fixtures'){const prior=preFixturesScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='wildlife'){const prior=preWildlifeScene(world.scene);if(world.previousWildlifeContacts)primeSceneContacts(prior,world.previousWildlifeContacts);primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='furniture'){const prior=preFurnitureScene(world.scene);if(world.previousFurnitureContacts)primeSceneContacts(prior,world.previousFurnitureContacts);primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='botany'){const prior=preBotanyScene(world.scene);if(world.previousBotanyContacts)primeSceneContacts(prior,world.previousBotanyContacts);primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='canopy'){const prior=preCanopyScene(world.scene);if(world.previousCanopyContacts)primeSceneContacts(prior,world.previousCanopyContacts);primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='fleet'){
  const prior=preFleetScene(world.scene),ids=new Set(prior.objects.map(o=>o.id)),contacts=sceneContactData(world.scene);
  primeSceneContacts(prior,{...contacts,contacts:contacts.contacts.filter(c=>!c.id || ids.has(c.id))});
  primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);
 }
 if(stage==='tree'){const prior=preTreeScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='coverage'){const prior=preCoverageScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='invitation'){const prior=preInvitationScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='people'){const prior=prePeopleScene(world.scene);if(world.previousPeopleContacts)primeSceneContacts(prior,world.previousPeopleContacts);if(world.previousPeopleNavigation)primeAmbientNavigation(prior,world.previousPeopleNavigation);return remember(prior);}
 if(stage==='junction'){const prior=preJunctionScene(world.scene);if(world.previousJunctionContacts)primeSceneContacts(prior,world.previousJunctionContacts);if(world.previousJunctionNavigation)primeAmbientNavigation(prior,world.previousJunctionNavigation);return remember(prior);}
 if(stage==='park'){const prior=preParkScene(world.scene),ids=new Set(world.scene.objects.filter(o=>!prior.objects.some(p=>p.id===o.id)).map(o=>o.id)),contacts=sceneContactData(world.scene);primeSceneContacts(prior,{...contacts,contacts:contacts.contacts.filter(c=>!c.id || !ids.has(c.id))});if(world.previousParkNavigation)primeAmbientNavigation(prior,world.previousParkNavigation);return remember(prior);}
 if(stage==='city'){const prior=preCityScene(world.scene),ids=new Set(world.scene.objects.filter(o=>!prior.objects.some(p=>p.id===o.id)).map(o=>o.id)),contacts=sceneContactData(world.scene);primeSceneContacts(prior,{...contacts,contacts:contacts.contacts.filter(c=>!c.id || !ids.has(c.id))});if(world.previousCityNavigation)primeAmbientNavigation(prior,world.previousCityNavigation);return remember(prior);}
 if(stage==='match'){const prior=preMatchScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='business'){const prior=preBusinessScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='schoolRepair'){const prior=preSchoolRepairScene(world.scene);primeSceneContacts(prior,sceneContactData(world.scene));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='social'){const prior=preSocialScene(world.scene),data=sceneContactData(world.scene);primeSceneContacts(prior,{...data,contacts:data.contacts.filter(c=>c.id!=='school_bench')});primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='shift'){const prior=preShiftScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='hours'){const prior=preHoursScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='seating'){const prior=preSeatingScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='kitchen'){const prior=preKitchenScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='meal'){const prior=preMealScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='progress'){const prior=preProgressScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 if(stage==='recipe'){const prior=preRecipeScene(world.scene);primeSceneContacts(prior,sceneContactData(previousPhysicalScene(world,'social')));primeAmbientNavigation(prior,ambientGraph(world.scene));return remember(prior);}
 const physical=stage==='interior' ? preInteriorScene(world.scene) : world.previousInteriorSaveCompatibility ? previousPhysicalScene(world,'interior') : world.scene;
 if(stage==='interior'){if(world.previousInteriorContacts)primeSceneContacts(physical,world.previousInteriorContacts);if(world.previousInteriorNavigation)primeAmbientNavigation(physical,world.previousInteriorNavigation);return remember(physical);}

 if(stage==='courier'){scene=preCourierScene(physical);primeSceneContacts(scene,sceneContactData(physical));primeAmbientNavigation(scene,ambientGraph(physical));return remember(scene);}
 if(stage==='finish'){scene=preFinishScene(physical);primeSceneContacts(scene,sceneContactData(physical));primeAmbientNavigation(scene,ambientGraph(physical));return remember(scene);}
 if(stage==='plant'){scene=prePlantScene(physical);primeSceneContacts(scene,sceneContactData(physical));primeAmbientNavigation(scene,ambientGraph(physical));return remember(scene);}
 const plantBase=world.previousPlantSaveCompatibility ? previousPhysicalScene(world,'plant') : physical;
 if(stage==='verge'){scene=preVergeScene(plantBase);primeSceneContacts(scene,sceneContactData(physical));if(world.previousVergeNavigation)primeAmbientNavigation(scene,world.previousVergeNavigation);return remember(scene);}
 const base=world.previousVergeSaveCompatibility ? previousPhysicalScene(world,'verge') : plantBase;
 const original=world.previousPoolSaveCompatibility ? prePoolScene(base) : base;
 const upgraded=stage==='pool' ? original : world.previousNetworkSaveCompatibility ? preNetworkScene(original) : original;
 const current=stage==='pool' || stage==='network' ? upgraded : world.previousSupplySaveCompatibility ? preSupplyScene(upgraded) : upgraded;
 const prior=stage==='pool' || stage==='network' || stage==='supply' ? current : world.previousRepairSaveCompatibility ? preRepairScene(current) : current;
 const staged=stage==='pool' || stage==='network' || stage==='supply' || stage==='repair' ? prior : world.previousParkingSaveCompatibility ? preParkingScene(prior) : prior;
 scene=stage==='delivery' ? preDeliveryScene(staged) : stage==='commerce' ? {...staged,economy:undefined} : staged;
 // Older stages share the registered pre-crossing pavement and unchanged contacts.
 primeSceneContacts(scene,sceneContactData(physical));primeAmbientNavigation(scene,ambientGraph(base));return remember(scene);
}
/** A new seed yields to saved bodies; never move the player's existing parked vehicles. */
function fleetParking(state:CarState,world:World,previous:World['scene']):CarState{
 const oldIds=new Set(previous.objects.map(o=>o.id)),oldSurfaces=new Set(previous.surfaces.map(s=>s.id));
 const activeBody=bodyWorld(state,world),activeHeight=activeBody.bodyHeight??playerHeight(world.scene);
 const active=state.control.kind==='car' || state.control.kind==='vehicle' ? {id:state.control.kind==='car' ? null : state.control.id,x:state.x,y:state.y,elevation:state.elevation,headingRad:state.headingRad,distance:state.distance} : undefined;
 const people=previous.objects.filter(o=>o.role==='npc' && o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.measure?.kind==='person').map(o=>({...actorPose(previous,o,state.timeS,state),radius:assemblyHorizontalRadius(o.spec as import('../scene/object-dsl').ObjectDslV2,o.scale),height:objectHeight(o)}));
 const journeys=(state.economy?.accounts??[]).flatMap(a=>{
  const owner=previous.economy?.accounts.find(d=>d.id===a.id)?.actor;if(!owner || owner==='player')return [];
  return [a.repair,a.courier,a.meal,a.shift].flatMap(t=>t?.path.length ? [{points:t.path,radius:people.find(p=>p.id===owner)?.radius??7}] : []);
 });
 if(state.economy?.shared?.path.length)journeys.push({points:state.economy.shared.path,radius:7});
 let result=state,protectedGround:ReturnType<typeof streetFootprints>['reserved']|undefined;
 const corridors=world.scene.routes.filter(r=>r.kind==='rail' || r.kind==='path' || r.kind==='air').map(routeInfrastructure);
 for(const object of world.scene.objects.filter(o=>isParkedVehicle(o) && !oldIds.has(o.id))){
  const vehicles=active ? [...result.vehicles,active] : result.vehicles;
  const pose=(x:number,y:number)=>({id:object.id,x,y,elevation:objectPlacement(world.scene,object,x,y).base,headingRad:object.headingRad??0,distance:0});
  const home=pose(object.x,object.y),probe={...result,...home,seated:undefined,control:{kind:'vehicle' as const,id:object.id},vehicles};
  const body={...bodyWorld(probe,world),dryGround:true},radius=body.carRadius,height=body.bodyHeight!;
  const clear=(p:ReturnType<typeof pose>)=>{
   if(state.control.kind!=='passenger' && p.elevation<state.elevation+activeHeight && p.elevation+height>state.elevation && Math.hypot(p.x-state.x,p.y-state.y)<radius+activeBody.carRadius)return false;
   if(people.some(n=>p.elevation<n.elevation+n.height && p.elevation+height>n.elevation && Math.hypot(p.x-n.x,p.y-n.y)<radius+n.radius+2) || journeys.some(j=>distanceToRoad(j.points,p.x,p.y)<radius+j.radius+2))return false;
   return carFootprintClear(body,p.x,p.y,p.elevation,state.timeS,{...probe,...p});
  };
  if(clear(home))continue;
  protectedGround??=[...streetFootprints(world.scene).reserved,...world.scene.sites.flatMap(s=>sitePolygons(world.scene,s)),...world.scene.surfaces.filter(s=>oldSurfaces.has(s.id) && s.finish!=='terrain').map(s=>s.points),...(world.scene.terrain.landscape?.waters??[]).map(w=>w.polygon)];
  let chosen:ReturnType<typeof pose>|undefined;
  for(let ring=1;ring<=16 && !chosen;ring++)for(let side=0;side<16;side++){
   const angle=side*Math.PI/8,x=home.x+Math.cos(angle)*ring*20,y=home.y+Math.sin(angle)*ring*20;
   if(protectedGround.some(p=>onPolygon(p,x,y,radius+4)) || corridors.some(c=>distanceToRoad(c.points,x,y)<c.radius+radius+4))continue;
   const p=pose(x,y);if(clear(p)){chosen=p;break;}
  }
  if(!chosen)throw Error('This world update needs clear parking near '+object.id+'. Your original save is unchanged.');
  result={...result,vehicles:[...result.vehicles,chosen]};
 }
 return result;
}
/** Rebase derived node indices; positions, travel history, random state and clocks stay saved. */
function rebasePopulation(state:CarState,previous:World['scene'],current:World['scene'],retarget=false,relocate=false):CarState{
 if(!state.population)return state;
 const before=ambientNavigation(previous).nodes,after=ambientNavigation(current).nodes,key=(p:{x:number;y:number})=>p.x.toFixed(6)+','+p.y.toFixed(6),indices=new Map<string,number[]>();
 after.forEach((p,i)=>{const ids=indices.get(key(p))??[];ids.push(i);indices.set(key(p),ids);});
 const mapped=before.map(p=>{const candidates=indices.get(key(p));if(!candidates?.length){if(retarget)return -1;throw Error('This update cannot preserve saved pedestrian navigation.');}const neighbors=p.links.map(i=>key(before[i]!));return candidates.find(i=>neighbors.every(k=>after[i]!.links.some(j=>key(after[j]!)===k)))??candidates[0]!;});
 const currentMembers=new Map(ambientObjects(current).map(o=>[o.id,o])),members=ambientObjects(previous).map(o=>currentMembers.get(o.id)!),nav=ambientNavigation(current);
 return {...state,population:{...state.population,members:state.population.members.map((m,index)=>{
  let node=m.node<0 ? m.node : mapped[m.node]!;
  if(relocate && members[index]!.ambient!.motion.kind==='walk' && !nav.clear(m.x,m.y,nav.radius(members[index]!),true)){
   const closest=after.map((p,i)=>({p,i,d:Math.hypot(p.x-m.x,p.y-m.y)})).filter(p=>p.p.links.length && p.d<=256 && nav.clear(p.p.x,p.p.y,nav.radius(members[index]!),true)).sort((a,b)=>a.d-b.d || a.i-b.i)[0];
   if(!closest)throw Error('This update cannot preserve this saved pedestrian position.');
   return {...m,x:closest.p.x,y:closest.p.y,fromX:closest.p.x,fromY:closest.p.y,node:closest.i,previous:-1,speed:0};
  }
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
 if(world.scene.strike ? s.strikeReadyAtS===undefined || !Number.isFinite(s.strikeReadyAtS) || s.strikeReadyAtS<0 || s.strikeReadyAtS>s.timeS+world.scene.strike.cooldownS+1e-6 : s.strikeReadyAtS!==undefined)throw Error('Invalid hand-action cooldown');

 checkTeams(s,world.scene);
 checkSeatingState(s,world.scene);
 checkEconomyState(s,world.scene);
 const scene=world.scene,objects=new Map(scene.objects.map(o=>[o.id,o]));let fresh=expected.get(scene);if(!fresh){fresh=createCarAtSpawn(scene);expected.set(scene,fresh);}
 const ambient=scene.objects.filter(o=>o.ambient);
 const sameIds=(a:{id:string}[],b:{id:string}[])=>{const ids=new Set(b.map(m=>m.id));return a.length===b.length && unique(a.map(n=>n.id)) && a.every(n=>ids.has(n.id));};
 if(!sameIds(s.props,fresh.props) || !sameIds(s.npcs,fresh.npcs) || !sameIds(s.sports,fresh.sports) || s.nextCheckpoint>=Math.max(1,scene.checkpoints.length))throw Error('Saved members or checkpoint do not match this world');
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
 if(world.saveCompatibility===WORK_COMMUTE_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==WORK_COMMUTE_COMPATIBILITY)){
  if(world.previousWorkCommuteSaveCompatibility!==HOME_MEALS_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'workCommute'),saveCompatibility:HOME_MEALS_COMPATIBILITY,previousWorkCommuteSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===HOME_MEALS_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==HOME_MEALS_COMPATIBILITY)){
  if(world.previousHomeMealsSaveCompatibility!==HOME_INTERIOR_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'homeMeals'),saveCompatibility:HOME_INTERIOR_COMPATIBILITY,previousHomeMealsSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===HOME_INTERIOR_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==HOME_INTERIOR_COMPATIBILITY)){
  if(world.previousHomeInteriorSaveCompatibility!==WEATHER_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const previous=previousPhysicalScene(world,'homeInterior'),restored=decodeSave(text,{...world,scene:previous,saveCompatibility:WEATHER_COMPATIBILITY,previousHomeInteriorSaveCompatibility:undefined});
  const rebased=rebasePopulation(restored.state,previous,world.scene,true,true),old=rebased.economy!,zero={home_furniture:0};
  const economy={...old,repaired:{...old.repaired,...zero},recovered:{...old.recovered,...zero},unattributed:{...old.unattributed,repair:{...old.unattributed.repair,...zero}},accounts:old.accounts.map(a=>({...a,completed:{...a.completed,repair:{...a.completed.repair,...zero}}}))};
  const fitted=interiorPose(homeVehicles(cityJourneys({...rebased,economy},world.scene),world),world),state=fitted.control.kind==='passenger' || carFootprintClear(bodyWorld(fitted,world),fitted.x,fitted.y,fitted.elevation,fitted.timeS,fitted) ? fitted : resetCar({...fitted,grounded:false},world.scene);
  try{checkState(state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===WEATHER_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==WEATHER_COMPATIBILITY)){
  if(world.previousWeatherSaveCompatibility!==RATIONS_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'weather'),saveCompatibility:RATIONS_COMPATIBILITY,previousWeatherSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===RATIONS_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==RATIONS_COMPATIBILITY)){
  if(world.previousRationsSaveCompatibility!==SCHOOL_INTERIOR_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'rations'),saveCompatibility:SCHOOL_INTERIOR_COMPATIBILITY,previousRationsSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===SCHOOL_INTERIOR_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==SCHOOL_INTERIOR_COMPATIBILITY)){
  if(world.previousSchoolInteriorSaveCompatibility!==NURSERY_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const previous=previousPhysicalScene(world,'schoolInterior'),restored=decodeSave(text,{...world,scene:previous,saveCompatibility:NURSERY_COMPATIBILITY,previousSchoolInteriorSaveCompatibility:undefined});
  const migrated=cityJourneys(schoolInteriorUpgrade(rebasePopulation(restored.state,previous,world.scene,true),world.scene),world.scene),fitted=interiorPose(migrated,world);
  const state=fitted.control.kind==='passenger' || carFootprintClear(bodyWorld(fitted,world),fitted.x,fitted.y,fitted.elevation,fitted.timeS,fitted) ? fitted : resetCar({...fitted,grounded:false},world.scene);
  try{checkState(state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===NURSERY_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==NURSERY_COMPATIBILITY)){
  if(world.previousNurserySaveCompatibility!==HARDWARE_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'nursery'),saveCompatibility:HARDWARE_COMPATIBILITY,previousNurserySaveCompatibility:undefined});
  const old=restored.state.economy!,zero={propagate_saplings:0};
  const state={...restored.state,economy:{...old,batches:{...old.batches,...zero},unattributed:{...old.unattributed,work:{...old.unattributed.work,...zero}},accounts:old.accounts.map(a=>({...a,completed:{...a.completed,work:{...a.completed.work,...zero}}}))}};
  try{checkState(state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===HARDWARE_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==HARDWARE_COMPATIBILITY)){
  if(world.previousHardwareSaveCompatibility!==RECOVERY_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'hardware'),saveCompatibility:RECOVERY_COMPATIBILITY,previousHardwareSaveCompatibility:undefined});
  const state={...restored.state,economy:{...restored.state.economy!,recovered:{...restored.state.economy!.recovered,market_tables:0}}};
  try{checkState(state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===RECOVERY_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==RECOVERY_COMPATIBILITY)){
  if(world.previousRecoverySaveCompatibility!==RESIDENT_SUPPLY_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'recovery'),saveCompatibility:RESIDENT_SUPPLY_COMPATIBILITY,previousRecoverySaveCompatibility:undefined});
  const sources=recoverySourceIds(world.scene),economy=restored.state.economy!;
  const state={...restored.state,economy:{...economy,recovered:Object.fromEntries(world.scene.economy!.repairs.filter(r=>r.recover).map(r=>[r.id,0])),recoverySpent:[...sources].filter(id=>restored.state.broken.includes(id) || restored.state.growing?.some(p=>p.objectId===id))}};
  try{checkState(state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===RESIDENT_SUPPLY_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==RESIDENT_SUPPLY_COMPATIBILITY)){
  if(world.previousResidentSupplySaveCompatibility!==WORKSHOP_SUPPLY_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'residentSupply'),saveCompatibility:WORKSHOP_SUPPLY_COMPATIBILITY,previousResidentSupplySaveCompatibility:undefined});
  const economy=restored.state.economy!,porter=initialEconomy(world.scene,economy.atS)!.accounts.find(a=>a.id==='porter')!;
  const state={...restored.state,economy:{...economy,accounts:world.scene.economy!.accounts.map(a=>economy.accounts.find(old=>old.id===a.id)??porter)}};
  try{checkState(state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===WORKSHOP_SUPPLY_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==WORKSHOP_SUPPLY_COMPATIBILITY)){
  if(world.previousWorkshopSupplySaveCompatibility!==KIT_PRODUCTION_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'workshopSupply'),saveCompatibility:KIT_PRODUCTION_COMPATIBILITY,previousWorkshopSupplySaveCompatibility:undefined});
  const economy=restored.state.economy!;
  const counts={boards_run:0,fasteners_run:0};
  const state={...restored.state,economy:{...economy,delivered:{...economy.delivered,...counts},unattributed:{...economy.unattributed,delivery:{...economy.unattributed.delivery,...counts}},accounts:economy.accounts.map(a=>({...a,completed:{...a.completed,delivery:{...a.completed.delivery,...counts}}})),markets:economy.markets.map(m=>m.id==='station_supplies' ? {...m,stock:{...m.stock,boards:16,fasteners:16}} : m)}};
  try{checkState(state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===KIT_PRODUCTION_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==KIT_PRODUCTION_COMPATIBILITY)){
  if(world.previousKitProductionSaveCompatibility!==STRIKE_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'kitProduction'),saveCompatibility:STRIKE_COMPATIBILITY,previousKitProductionSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===STRIKE_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==STRIKE_COMPATIBILITY)){
  if(world.previousStrikeSaveCompatibility!==EQUIPMENT_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'strike'),saveCompatibility:EQUIPMENT_COMPATIBILITY,previousStrikeSaveCompatibility:undefined});
  const state={...restored.state,strikeReadyAtS:restored.state.timeS};
  try{checkState(state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===EQUIPMENT_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==EQUIPMENT_COMPATIBILITY)){
  if(world.previousEquipmentSaveCompatibility!==SERVICE_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'equipment'),saveCompatibility:SERVICE_COMPATIBILITY,previousEquipmentSaveCompatibility:undefined});
  const state=refundDamagedWork(restored.state,world.scene);
  try{checkState(state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===SERVICE_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==SERVICE_COMPATIBILITY)){
  if(world.previousServiceSaveCompatibility!==CHARACTERS_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const previous=previousPhysicalScene(world,'service'),restored=decodeSave(text,{...world,scene:previous,saveCompatibility:CHARACTERS_COMPATIBILITY,previousServiceSaveCompatibility:undefined,previousServiceNavigation:undefined});
  const state=indoorServiceUpgrade(rebasePopulation(restored.state,previous,world.scene,true),previous,world);
  try{checkState(state,world);}catch(cause){throw Error('This backup contains invalid world state.',{cause});}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===CHARACTERS_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==CHARACTERS_COMPATIBILITY)){
  if(world.previousCharactersSaveCompatibility!==FIXTURES_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'characters'),saveCompatibility:FIXTURES_COMPATIBILITY,previousCharactersSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===FIXTURES_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==FIXTURES_COMPATIBILITY)){
  if(world.previousFixturesSaveCompatibility!==WILDLIFE_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'fixtures'),saveCompatibility:WILDLIFE_COMPATIBILITY,previousFixturesSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===WILDLIFE_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==WILDLIFE_COMPATIBILITY)){
  if(world.previousWildlifeSaveCompatibility!==FURNITURE_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'wildlife'),saveCompatibility:FURNITURE_COMPATIBILITY,previousWildlifeSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===FURNITURE_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==FURNITURE_COMPATIBILITY)){
  if(world.previousFurnitureSaveCompatibility!==BOTANY_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'furniture'),saveCompatibility:BOTANY_COMPATIBILITY,previousFurnitureSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===BOTANY_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==BOTANY_COMPATIBILITY)){
  if(world.previousBotanySaveCompatibility!==CANOPY_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'botany'),saveCompatibility:CANOPY_COMPATIBILITY,previousBotanySaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===CANOPY_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==CANOPY_COMPATIBILITY)){
  if(world.previousCanopySaveCompatibility!==FLEET_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'canopy'),saveCompatibility:FLEET_COMPATIBILITY,previousCanopySaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===FLEET_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==FLEET_COMPATIBILITY)){
  if(world.previousFleetSaveCompatibility!==TREE_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const previous=previousPhysicalScene(world,'fleet'),restored=decodeSave(text,{...world,scene:previous,saveCompatibility:TREE_COMPATIBILITY,previousFleetSaveCompatibility:undefined});
  const initialized=fleetParking(restored.state,world,previous);
  try{checkState(initialized,world);}catch{throw Error('This backup contains invalid world state.');}
  const state=initialized,safe=state.control.kind==='passenger' || carFootprintClear(bodyWorld(state,world),state.x,state.y,state.elevation,state.timeS,state) ? state : resetCar({...state,grounded:false},world.scene);
  return {...restored,state:safe,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===TREE_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==TREE_COMPATIBILITY)){
  if(world.previousTreeSaveCompatibility!==COVERAGE_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'tree'),saveCompatibility:COVERAGE_COMPATIBILITY,previousTreeSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===COVERAGE_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==COVERAGE_COMPATIBILITY)){
  if(world.previousCoverageSaveCompatibility!==INVITATION_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'coverage'),saveCompatibility:INVITATION_COMPATIBILITY,previousCoverageSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===INVITATION_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==INVITATION_COMPATIBILITY)){
  if(world.previousInvitationSaveCompatibility!==PEOPLE_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,scene:previousPhysicalScene(world,'invitation'),saveCompatibility:PEOPLE_COMPATIBILITY,previousInvitationSaveCompatibility:undefined});
  try{checkState(restored.state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===PEOPLE_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==PEOPLE_COMPATIBILITY)){
  if(world.previousPeopleSaveCompatibility!==JUNCTION_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const previous=previousPhysicalScene(world,'people'),restored=decodeSave(text,{...world,scene:previous,saveCompatibility:JUNCTION_COMPATIBILITY,previousPeopleSaveCompatibility:undefined,previousPeopleNavigation:undefined,previousPeopleContacts:undefined});
  const state=rebasePopulation(restored.state,previous,world.scene,true);
  try{checkState(state,world);}catch{throw Error('This backup contains invalid world state.');}
  return {...restored,state,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===JUNCTION_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==JUNCTION_COMPATIBILITY)){
  if(world.previousJunctionSaveCompatibility!==SPACING_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const previous=previousPhysicalScene(world,'junction'),restored=decodeSave(text,{...world,scene:previous,saveCompatibility:SPACING_COMPATIBILITY,previousJunctionSaveCompatibility:undefined,previousJunctionNavigation:undefined,previousJunctionContacts:undefined});
  const rebased=rebasePopulation(restored.state,previous,world.scene,true,true),fresh=initialAmbient(world.scene),old=new Map(ambientObjects(previous).map((o,i)=>[o.id,rebased.population!.members[i]!]));
  let state=cityJourneys({...rebased,population:{tick:rebased.population!.tick,members:ambientObjects(world.scene).map((o,i)=>old.get(o.id)??{...fresh.members[i]!,until:rebased.timeS,pauseUntil:rebased.timeS})}},world.scene);
  const control=state.control;
  if(control.kind==='passenger'){
   const object=world.scene.objects.find(o=>o.id===control.id)!;
   if(object.route?.id==='airport_bus'){const p=actorPose(world.scene,object,state.timeS,state);state={...state,x:p.x,y:p.y,elevation:p.elevation,headingRad:p.headingRad,vx:p.vx??0,vy:p.vy??0,distance:p.travelled};}
  }
  try{checkState(state,world);}catch{throw Error('This backup contains invalid world state.');}
  const fitted=interiorPose(state,world),safe=fitted.control.kind==='passenger' || carFootprintClear(bodyWorld(fitted,world),fitted.x,fitted.y,fitted.elevation,fitted.timeS,fitted) ? fitted : resetCar({...fitted,grounded:false},world.scene);
  return {...restored,state:safe,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===SPACING_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==SPACING_COMPATIBILITY)){
  if(world.previousSpacingSaveCompatibility!==PARK_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const restored=decodeSave(text,{...world,saveCompatibility:PARK_COMPATIBILITY,previousSpacingSaveCompatibility:undefined});
  return {...restored,migrated:true};
 }
 if(world.saveCompatibility===PARK_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==PARK_COMPATIBILITY)){
  if(world.previousParkSaveCompatibility!==CITY_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const previous=previousPhysicalScene(world,'park'),restored=decodeSave(text,{...world,scene:previous,saveCompatibility:CITY_COMPATIBILITY,previousParkSaveCompatibility:undefined,previousParkNavigation:undefined});
  const rebased=rebasePopulation(restored.state,previous,world.scene,true),fresh=initialAmbient(world.scene),old=new Map(ambientObjects(previous).map((o,i)=>[o.id,rebased.population!.members[i]!]));
  const state={...rebased,population:{tick:rebased.population!.tick,members:ambientObjects(world.scene).map((o,i)=>old.get(o.id)??{...fresh.members[i]!,until:rebased.timeS,pauseUntil:rebased.timeS})}};
  try{checkState(state,world);}catch{throw Error('This backup contains invalid world state.');}
  const fitted=interiorPose(state,world),safe=fitted.control.kind==='passenger' || carFootprintClear(bodyWorld(fitted,world),fitted.x,fitted.y,fitted.elevation,fitted.timeS,fitted) ? fitted : resetCar({...fitted,grounded:false},world.scene);
  return {...restored,state:safe,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
 if(world.saveCompatibility===CITY_COMPATIBILITY && (data.version===1 || data.compatibilityHash!==CITY_COMPATIBILITY)){
  if(world.previousCitySaveCompatibility!==MATCH_COMPATIBILITY)throw Error('This backup needs a different world or simulation version.');
  const previous=previousPhysicalScene(world,'city'),restored=decodeSave(text,{...world,scene:previous,saveCompatibility:MATCH_COMPATIBILITY,previousCitySaveCompatibility:undefined,previousCityNavigation:undefined});
  const state=cityJourneys(rebasePopulation({...restored.state,nextCheckpoint:0,boostReadyAtS:{}},previous,world.scene,true,true),world.scene);
  try{checkState(state,world);}catch{throw Error('This backup contains invalid world state.');}
  const safe=state.control.kind==='passenger' || carFootprintClear(bodyWorld(state,world),state.x,state.y,state.elevation,state.timeS,state) ? state : resetCar({...state,grounded:false},world.scene);
  return {...restored,state:safe,migrated:true,compatible:data.sourceHash!==world.scene.sourceHash};
 }
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
 const currentFormat=data.version===SAVE_VERSION || data.version===18 && [RESIDENT_SUPPLY_COMPATIBILITY,WORKSHOP_SUPPLY_COMPATIBILITY,KIT_PRODUCTION_COMPATIBILITY,STRIKE_COMPATIBILITY].includes(world.saveCompatibility??'') || data.version===17 && [EQUIPMENT_COMPATIBILITY,SERVICE_COMPATIBILITY,CHARACTERS_COMPATIBILITY,FIXTURES_COMPATIBILITY,WILDLIFE_COMPATIBILITY,FURNITURE_COMPATIBILITY,BOTANY_COMPATIBILITY,CANOPY_COMPATIBILITY,FLEET_COMPATIBILITY,TREE_COMPATIBILITY,COVERAGE_COMPATIBILITY,INVITATION_COMPATIBILITY].includes(world.saveCompatibility??'') || data.version===16 && [PEOPLE_COMPATIBILITY,JUNCTION_COMPATIBILITY,SPACING_COMPATIBILITY,PARK_COMPATIBILITY,CITY_COMPATIBILITY,MATCH_COMPATIBILITY].includes(world.saveCompatibility??'') || data.version===15 && world.saveCompatibility===BUSINESS_COMPATIBILITY || data.version===14 && (world.saveCompatibility===SCHOOL_REPAIR_COMPATIBILITY || world.saveCompatibility===SOCIAL_COMPATIBILITY) || data.version===13 && world.saveCompatibility===SHIFT_COMPATIBILITY || data.version===12 && (world.saveCompatibility===HOURS_COMPATIBILITY || world.saveCompatibility===SEATING_COMPATIBILITY) || data.version===11 && (world.saveCompatibility===KITCHEN_COMPATIBILITY || world.saveCompatibility===MEAL_COMPATIBILITY) || data.version===10 && world.saveCompatibility===PROGRESS_COMPATIBILITY;
 const exact=data.sourceHash===world.scene.sourceHash,compatible=currentFormat && data.version!==1 && data.compatibilityHash!==undefined && data.compatibilityHash===world.saveCompatibility;
 const untaggedExact=exact && !world.scene.economy;
 const knownSource=world.previousSaveSource!==undefined && data.sourceHash===world.previousSaveSource;
 const oldFingerprint=data.version===2 && data.compatibilityHash!==undefined && (data.compatibilityHash===world.previousSaveCompatibility || !!world.previousSaveSource && (R44_COMPATIBILITIES as readonly string[]).includes(data.compatibilityHash));
 const oldRules=Number(SAVE_SIMULATION_VERSION)===40 && (data.version===2 ? oldFingerprint || knownSource || data.compatibilityHash===undefined && untaggedExact && world.saveCompatibility===undefined : data.version===1 && (knownSource || untaggedExact));
 const addEconomy=Number(SAVE_SIMULATION_VERSION)===40 && data.version===3 && !data.state.economy && data.compatibilityHash!==undefined && data.compatibilityHash===world.emptyEconomySaveCompatibility;
 const addDeliveries=Number(SAVE_SIMULATION_VERSION)===40 && data.version===3 && !!data.state.economy && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousMarketSaveCompatibility;
 const addProgress=Number(SAVE_SIMULATION_VERSION)===40 && data.version===9 && world.saveCompatibility===PROGRESS_COMPATIBILITY && world.previousProgressSaveCompatibility===RECIPE_COMPATIBILITY && data.compatibilityHash===world.previousProgressSaveCompatibility;
 const addRecipes=Number(SAVE_SIMULATION_VERSION)===40 && data.version===9 && (world.saveCompatibility===RECIPE_COMPATIBILITY || world.saveCompatibility===PROGRESS_COMPATIBILITY) && world.previousRecipeSaveCompatibility===EGRESS_COMPATIBILITY && data.compatibilityHash===world.previousRecipeSaveCompatibility;
 const updateEgress=Number(SAVE_SIMULATION_VERSION)===40 && data.version===9 && (world.saveCompatibility===EGRESS_COMPATIBILITY || world.saveCompatibility===RECIPE_COMPATIBILITY || world.saveCompatibility===PROGRESS_COMPATIBILITY) && world.previousEgressSaveCompatibility===INTERIOR_COMPATIBILITY && data.compatibilityHash===world.previousEgressSaveCompatibility;
 const addInterior=Number(SAVE_SIMULATION_VERSION)===40 && data.version===9 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousInteriorSaveCompatibility;
 const addCourier=Number(SAVE_SIMULATION_VERSION)===40 && data.version===8 && data.compatibilityHash===world.previousCourierSaveCompatibility && data.compatibilityHash!==undefined;
 const addFinish=Number(SAVE_SIMULATION_VERSION)===40 && data.version===8 && data.compatibilityHash===world.previousFinishSaveCompatibility && data.compatibilityHash!==undefined;
 const addPlant=Number(SAVE_SIMULATION_VERSION)===40 && data.version===7 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousPlantSaveCompatibility;
 const addVerge=Number(SAVE_SIMULATION_VERSION)===40 && data.version===7 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousVergeSaveCompatibility;
 const addPool=Number(SAVE_SIMULATION_VERSION)===40 && data.version===6 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousPoolSaveCompatibility;
 const addNetwork=Number(SAVE_SIMULATION_VERSION)===40 && data.version===6 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousNetworkSaveCompatibility;
 const addSupply=Number(SAVE_SIMULATION_VERSION)===40 && data.version===6 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousSupplySaveCompatibility;
 const addRepairs=Number(SAVE_SIMULATION_VERSION)===40 && data.version===5 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousRepairSaveCompatibility;
 const addParking=Number(SAVE_SIMULATION_VERSION)===40 && data.version===4 && data.compatibilityHash!==undefined && data.compatibilityHash===world.previousParkingSaveCompatibility;
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
