import {schoolReviewSteps} from './school-review';
import {strikeTarget} from '../sim/strike';
import {characterGround,primeCharacterGround} from './character-ground';
import {controlGuide,type GuideContext} from './control-guide';
import {controlIcon,setIcon,type Icon} from './icons';
import {nearbySeat,seatedPose} from '../sim/seating';
import {growthScale,growthScales} from '../scene/growth';
import {pooledImpact} from '../scene/damage-pool';
import {gameSave} from './save';
import {primeAmbientNavigation} from '../scene/ambient-navigation';
import {primeSceneContacts} from '../scene/contacts';
import {commerceControls} from './commerce';
import type {CommerceAction} from '../sim/commerce';
import {saveTools} from './save-tools';
import {nearbyNpc,npcSpeech} from '../sim/npcs';
import {AmbientPopulation} from './ambient-population';
import {CharacterAnimator} from './character-animation';
import {actorOrientation} from './actor-orientation';
import {nightFactor} from "./shaders";
import {attackTarget,teamPassAction,teamPose} from '../sim/team-sports';
import {activeSport,closestSportTarget,sportCharge,cancelSportAction} from '../sim/sports';
import {SportsVisuals,SportsTeamsVisuals,rollSportBall} from './sports';
import {presentState} from './presentation';
import {WorldDaylight} from "./daylight";
import {buildFlocks} from "./flocks";
import {SunShadows} from "./sun";
import {mediaCapture} from "./media-capture";
import {renderProfile} from "./render-profile";
import {freezeStatic} from "./batching";
import {nurseryReviewSteps,recoveryReviewSteps,workshopReviewSteps,handReviewSteps,equipmentReviewSteps,sharedMealReviewSteps,shiftReviewInput,hoursReviewSteps,seatingReviewSteps,seatingReviewInput,kitchenReviewSteps,mealReviewSteps,progressionReviewSteps,interiorReviewStart,interiorReviewInput,vehicleReviewStart,drivingReviewStart,npcReviewStart,cargoReviewStart,maintenanceReviewStart,repairReviewSteps,businessReviewSteps,courierReviewSteps,movementReviewStart,populationReviewStart} from "./review-start";
import { measuredScale, playerRadius, playerHeight } from "../scene/measure";
import * as THREE from "three";
import {worldEdgeSmoothing,prepareWorldEdges} from './edge-smoothing';
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { buildMaskForScene } from "../scene/fixture";
import type {Scene} from "../scene/schema";
import {firstFrameReady,type Loading} from "./loading";
import { drivingHeight,waterAt } from "../scene/terrain";
import { archetypeOf, objectRadius } from "../sim/archetypes";
import { buildPaperMask } from "../sim/mask";
import { CAR_BOOST, isCarControl, createCarAtSpawn, FixedStepper, resetCar, type World } from "../sim/car";
import { MAX_FLIGHT_CLEARANCE,isSwimming,nearbyRide,toggleRide,standUp,stepInteractive,occupiedObject,exitPosition } from "../sim/interaction";
import {repairView} from './repair-view';
import {primeRepairNavigation} from '../sim/repair';
import { actorPoses,workJourneyForActor } from "../sim/actors";
import {isActor} from '../scene/agents';
import { interactiveWorld } from "../scene/interactive-world";
import { buildRoutesSteps } from "./routes";
import { compactObject } from "./compact-object";
import { worldTime, worldMotion, terrainPlayer, terrainView, worldGradeShader } from "./shaders";
import { animateObject, buildObject, buildPlayer,objectGroundLift,MAX_SUSPENSION_COMPRESSION } from "./world3d";
import { roadGeometry, terrainNormal, worldPosition } from "./environment";
import { cameraPosition, followCamera, followCameraZoom, rideCameraZoom, sportCameraFrame, DEFAULT_CAMERA_ZOOM, type FollowTarget } from "./camera";
import { cameraZoomInput } from "./camera-input";
import { hasAnimatedJoints,impactOf,isReactive,controlOf } from "../scene/object-dsl";
import { buildDamageObject,updateDamage } from "./damage";
import { WorldDebris } from "./debris";
import type { ImpactEvent } from "../sim/impacts";
import { objectPlacement } from "../scene/placement";
import { WorldLandscape } from "./landscape";
import { WorldParticles } from "./particles";
import { SceneryOcclusion } from "./occlusion";
import {WorldStreaming} from './world-streaming';
import {WorldParking} from './parking';
import type {WorldWorkerClient} from './world-worker-client';
import { worldMap } from "./world-map";
import {geometryMemory} from './geometry-memory';

const container = document.querySelector<HTMLElement>("#game")!;
const pauseButton = document.querySelector<HTMLButtonElement>("#pause")!;
const pauseMenu = document.querySelector<HTMLDialogElement>("#pause-menu")!;
const surface = document.querySelector<HTMLElement>("#surface")!,statusIcon=document.querySelector<HTMLElement>("#status-icon")!;
const interact=document.querySelector<HTMLButtonElement>("#interact")!;
const interactLabel=document.querySelector<HTMLElement>('#interact-label')!,interactIcon=document.querySelector<HTMLElement>('#interact-icon')!;
for(const slot of document.querySelectorAll<HTMLElement>('[data-icon-name]'))setIcon(slot,slot.dataset.iconName as Icon);
const talkButton=document.querySelector<HTMLButtonElement>("#talk")!,speech=document.querySelector<HTMLElement>("#npc-speech")!,speaker=document.querySelector<HTMLElement>("#npc-speaker")!,replyText=document.querySelector<HTMLElement>("#npc-reply")!;
const boostButton=document.querySelector<HTMLButtonElement>("#boost")!;
const boostLabel=document.querySelector<HTMLElement>("#boost-label")!;
const strikeButton=document.querySelector<HTMLButtonElement>('#strike-action')!;
const sportButton=document.querySelector<HTMLButtonElement>('#sport-action')!;
const matchButton=document.querySelector<HTMLButtonElement>('#match-action')!,matchLabel=document.querySelector<HTMLElement>('#match-action-label')!,passButton=document.querySelector<HTMLButtonElement>('#pass-action')!,passLabel=document.querySelector<HTMLElement>('#pass-action-label')!;
const matchScore=document.querySelector<HTMLElement>('#match-score')!,matchState=document.querySelector<HTMLElement>('#match-state')!,matchClock=document.querySelector<HTMLElement>('#match-clock')!,matchScoreline=document.querySelector<HTMLElement>('#match-scoreline')!;
const sportLabel=document.querySelector<HTMLElement>('#sport-action-label')!;
const saveButton=document.querySelector<HTMLButtonElement>("#save-game")!,saveLabel=document.querySelector<HTMLElement>("#save-label")!,saveStatus=document.querySelector<HTMLElement>("#save-status")!,saveError=document.querySelector<HTMLElement>("#save-error")!;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

export async function start(doc:Scene,loading:Loading,worker:WorldWorkerClient):Promise<void> {
  await loading.stage("Preparing driving and walking");
  primeSceneContacts(doc,worker.contacts);
  primeAmbientNavigation(doc,worker.navigation);
  primeRepairNavigation(doc,worker.repairNavigation);
  primeCharacterGround(doc,worker.characterGround);
  const footGround=characterGround(doc),sampleFoot=(x:number,z:number,from:number,radius:number)=>footGround(x+doc.canonical.width/2,z+doc.canonical.height/2,from,radius,car);
  const carRadius = playerRadius(doc);
  const roadMask = buildMaskForScene(doc);
  const world: World = { scene: doc, roadMask,saveCompatibility:worker.saveCompatibility,previousParkingSaveCompatibility:worker.previousParkingSaveCompatibility,previousRepairSaveCompatibility:worker.previousRepairSaveCompatibility,previousSupplySaveCompatibility:worker.previousSupplySaveCompatibility,previousNetworkSaveCompatibility:worker.previousNetworkSaveCompatibility,previousPoolSaveCompatibility:worker.previousPoolSaveCompatibility,previousVergeSaveCompatibility:worker.previousVergeSaveCompatibility,previousPlantSaveCompatibility:worker.previousPlantSaveCompatibility,previousFinishSaveCompatibility:worker.previousFinishSaveCompatibility,previousCourierSaveCompatibility:worker.previousCourierSaveCompatibility,previousRationsSaveCompatibility:worker.previousRationsSaveCompatibility,previousSchoolInteriorSaveCompatibility:worker.previousSchoolInteriorSaveCompatibility,previousSchoolInteriorNavigation:worker.previousSchoolInteriorNavigation,previousSchoolInteriorContacts:worker.previousSchoolInteriorContacts,previousNurserySaveCompatibility:worker.previousNurserySaveCompatibility,previousHardwareSaveCompatibility:worker.previousHardwareSaveCompatibility,previousRecoverySaveCompatibility:worker.previousRecoverySaveCompatibility,previousResidentSupplySaveCompatibility:worker.previousResidentSupplySaveCompatibility,previousWorkshopSupplySaveCompatibility:worker.previousWorkshopSupplySaveCompatibility,previousKitProductionSaveCompatibility:worker.previousKitProductionSaveCompatibility,previousStrikeSaveCompatibility:worker.previousStrikeSaveCompatibility,previousEquipmentSaveCompatibility:worker.previousEquipmentSaveCompatibility,previousServiceSaveCompatibility:worker.previousServiceSaveCompatibility,previousServiceNavigation:worker.previousServiceNavigation,previousCharactersSaveCompatibility:worker.previousCharactersSaveCompatibility,previousFixturesSaveCompatibility:worker.previousFixturesSaveCompatibility,previousWildlifeSaveCompatibility:worker.previousWildlifeSaveCompatibility,previousWildlifeContacts:worker.previousWildlifeContacts,previousFurnitureSaveCompatibility:worker.previousFurnitureSaveCompatibility,previousFurnitureContacts:worker.previousFurnitureContacts,previousBotanySaveCompatibility:worker.previousBotanySaveCompatibility,previousBotanyContacts:worker.previousBotanyContacts,previousCanopySaveCompatibility:worker.previousCanopySaveCompatibility,previousCanopyContacts:worker.previousCanopyContacts,previousFleetSaveCompatibility:worker.previousFleetSaveCompatibility,previousTreeSaveCompatibility:worker.previousTreeSaveCompatibility,previousCoverageSaveCompatibility:worker.previousCoverageSaveCompatibility,previousInvitationSaveCompatibility:worker.previousInvitationSaveCompatibility,previousPeopleSaveCompatibility:worker.previousPeopleSaveCompatibility,previousPeopleNavigation:worker.previousPeopleNavigation,previousPeopleContacts:worker.previousPeopleContacts,previousJunctionSaveCompatibility:worker.previousJunctionSaveCompatibility,previousJunctionNavigation:worker.previousJunctionNavigation,previousJunctionContacts:worker.previousJunctionContacts,previousSpacingSaveCompatibility:worker.previousSpacingSaveCompatibility,previousParkSaveCompatibility:worker.previousParkSaveCompatibility,previousParkNavigation:worker.previousParkNavigation,previousCitySaveCompatibility:worker.previousCitySaveCompatibility,previousCityNavigation:worker.previousCityNavigation,previousMatchSaveCompatibility:worker.previousMatchSaveCompatibility,previousBusinessSaveCompatibility:worker.previousBusinessSaveCompatibility,previousSchoolRepairSaveCompatibility:worker.previousSchoolRepairSaveCompatibility,previousSocialSaveCompatibility:worker.previousSocialSaveCompatibility,previousShiftSaveCompatibility:worker.previousShiftSaveCompatibility,previousHoursSaveCompatibility:worker.previousHoursSaveCompatibility,previousSeatingSaveCompatibility:worker.previousSeatingSaveCompatibility,previousKitchenSaveCompatibility:worker.previousKitchenSaveCompatibility,previousMealSaveCompatibility:worker.previousMealSaveCompatibility,previousProgressSaveCompatibility:worker.previousProgressSaveCompatibility,previousRecipeSaveCompatibility:worker.previousRecipeSaveCompatibility,previousEgressSaveCompatibility:worker.previousEgressSaveCompatibility,previousInteriorSaveCompatibility:worker.previousInteriorSaveCompatibility,previousInteriorNavigation:worker.previousInteriorNavigation,previousInteriorContacts:worker.previousInteriorContacts,previousVergeNavigation:worker.previousVergeNavigation,previousMarketSaveCompatibility:worker.previousMarketSaveCompatibility,previousSaveCompatibility:worker.previousSaveCompatibility,emptyEconomySaveCompatibility:worker.emptyEconomySaveCompatibility,previousSaveSource:worker.previousSaveSource,
    driveMask: buildPaperMask(doc.canonical.width, doc.canonical.height), carRadius };
  const params=new URLSearchParams(location.search);
  let car = createCarAtSpawn(doc);
  const repairViews=repairView();
  if(import.meta.env.DEV)car=vehicleReviewStart(car,world,new URLSearchParams(location.search).get("test-vehicle"));
  if(import.meta.env.DEV)car=drivingReviewStart(car,world,new URLSearchParams(location.search).get("test-driving"));
  if(import.meta.env.DEV)car=npcReviewStart(car,world,new URLSearchParams(location.search).get("test-npc"));
  if(import.meta.env.DEV)car=movementReviewStart(car,world,new URLSearchParams(location.search).get("test-movement"));
  if(import.meta.env.DEV)car=populationReviewStart(car,world,new URLSearchParams(location.search).get("test-population"));
  if(import.meta.env.DEV && params.has("test-fleet")){car=cargoReviewStart(car,world,params.get("test-cargo"));car=vehicleReviewStart(car,world,params.get("test-fleet"));}
  if(import.meta.env.DEV && params.has('test-fixture'))car=drivingReviewStart(car,world,params.get('test-fixture')==='tub' ? 'street-tub' : 'street-stall');
  const review=import.meta.env.DEV && [...params.keys()].some(key=>key.startsWith('test-') || key==='capture' || key==='profile');
  const reviewSave=import.meta.env.DEV && params.has('test-save') && !params.has('capture') && !params.has('profile');
  const saves=!review || reviewSave ? gameSave(world,()=>localStorage,reviewSave ? params.has('test-school-interior') ? 'muse-dream.review-school-room-r91' : params.has('test-nursery') ? 'muse-dream.review-nursery-r90' : params.has('test-recovery') ? 'muse-dream.review-recovery-r88' : params.has('test-workshop') ? 'muse-dream.review-workshop-r86' : params.has('test-strike') ? 'muse-dream.review-strike-r84' : params.has('test-fixture') ? 'muse-dream.review-fixtures-r80-'+(params.get('test-fixture')==='tub' ? 'tub' : 'stall') : params.has('test-fleet') ? 'muse-dream.review-fleet-r75' : params.has('test-tree-repair') ? 'muse-dream.review-trees-r74' : params.has('test-city-repair') ? 'muse-dream.review-city-repair' : params.has('test-business') ? 'muse-dream.review-business' : params.has('test-hosted') ? 'muse-dream.review-hosted-r72' : params.has('test-social') ? 'muse-dream.review-social' : params.has('test-school-repair') ? 'muse-dream.review-school' : 'muse-dream.review-save' : 'muse-dream.save') : undefined;
  if(import.meta.env.DEV && !saves?.restored){
    if(params.has('test-school-interior')){
      await loading.stage('Preparing the school common room');const steps=schoolReviewSteps(car,world,params.get('test-school-interior')!=='door');let result=steps.next(),yieldAt=performance.now();while(!result.done){if(performance.now()-yieldAt>8){await new Promise(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}car=result.value;worldTime.value=car.timeS;
    }else if(params.has('test-nursery')){
      await loading.stage('Preparing nursery work');const steps=nurseryReviewSteps(car,world,params.get('test-nursery')!=='ready');let result=steps.next(),yieldAt=performance.now();while(!result.done){if(performance.now()-yieldAt>8){await new Promise(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}car=result.value;worldTime.value=car.timeS;
    }
    if(params.has('test-recovery')){
      await loading.stage('Recovering physical materials');const steps=params.get('test-recovery')==='hardware' ? workshopReviewSteps(car,world) : recoveryReviewSteps(car,world,params.get('test-recovery')==='work' ? 'work' : 'counter');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}car=result.value;worldTime.value=car.timeS;
    }
    if(params.has('test-workshop')){
      await loading.stage('Following workshop supplies');const steps=workshopReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;
    }
    if(params.has('test-strike')){
      await loading.stage('Walking to the work table');const steps=handReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;
    }

    if(params.has('test-equipment')){
      await loading.stage('Following the equipment repair');const steps=equipmentReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;
    }

    if(params.has('test-maintenance'))car=maintenanceReviewStart(car,world);
    if(params.has('test-hours')){
      await loading.stage('Advancing the opening-hours review');
      const steps=hoursReviewSteps(car,world,params.get('test-hours')!);let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;
    }
    if(params.has('test-tree-repair')){
      await loading.stage('Following the tree planting journey');const steps=repairReviewSteps(car,world,'street-tree',params.get('test-tree-repair')==='planted' ? 'planted' : params.get('test-tree-repair')==='approach' ? 'approach' : 'work');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;
    }
    if(params.has('test-fixture') && params.get('test-fixture-stage')==='work'){
      await loading.stage('Following the street fixture repair');const steps=repairReviewSteps(car,world,params.get('test-fixture')==='tub' ? 'street-tub' : 'street-stall','work');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}car=result.value;worldTime.value=car.timeS;
    }
    if(params.has('test-city-repair')){
      await loading.stage('Preparing the airport maintenance review');const steps=repairReviewSteps(car,world,'airport-lamp','work');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;
    }
    if(params.has('test-social') || params.has('test-hosted')){
      await loading.stage('Preparing the shared-meal review');const steps=sharedMealReviewSteps(car,world,params.has('test-hosted'));let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}car=result.value;worldTime.value=car.timeS;
    }
    if(params.has('test-school-repair')){
      await loading.stage('Following the school repair journey');const steps=repairReviewSteps(car,world,'school-bench',params.get('test-school-repair')==='work' ? 'work' : 'approach');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}car=result.value;worldTime.value=car.timeS;
    }
    if(params.has('test-business')){
      await loading.stage('Following the depot supply journey');const steps=businessReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}car=result.value;worldTime.value=car.timeS;
    }
  }
  if(saves?.restored){car=saves.restored.state;worldTime.value=saves.restored.worldTime;}
  let saveAt=car.timeS,saveDirty=false;
  const saveIdentity={sourceHash:doc.sourceHash,compatibilityHash:world.saveCompatibility};
  saveButton.hidden=!saves;saveLabel.textContent=saves?.blocked ? "Save current session" : "Save now";saveStatus.textContent=saves?.status??'Review session: saves disabled.';
  const saveNow=(replace=false,state=car,time=worldTime.value)=>{
    if(!saves)return false;const start=performance.now(),saved=saves.write(state,time,replace),ms=performance.now()-start;saveAt=car.timeS;saveDirty=false;saveStatus.textContent=saves.status;saveLabel.textContent=saves.blocked ? "Save current session" : "Save now";saveError.hidden=saved;const warning=saved ? "" : saves.status;if(saveError.textContent!==warning)saveError.textContent=warning;
    container.dataset.save=JSON.stringify({...saveIdentity,restored:!!saves.restored,saved,ms,characters:saves.characters,timeS:state.timeS,known:state.npcs.filter(n=>n.known).map(n=>n.id),review:reviewSave,status:saves.status});return saved;
  };
  container.dataset.save=JSON.stringify({...saveIdentity,restored:!!saves?.restored,enabled:!!saves,review:reviewSave,status:saveStatus.textContent});
  saveButton.addEventListener('click',()=>saveNow(saves?.blocked??false));addEventListener('pagehide',()=>saveNow());
  if(saves && !saves.restored && saves.status.startsWith("Could not")){saveError.hidden=false;saveError.textContent=saves.status;}
  const stepper = new FixedStepper();
  const keys = new Set<string>();
  let boostRequested=false,talkRequested=false,strikeRequested=false;
  let speechKey="";
  let shootButtonHeld=false,shootPressed=false,shootReleased=false,matchRequested=false,passRequested=false;
  let pointerAim:{x:number;y:number}|undefined;
  const clearShot=()=>{shootButtonHeld=shootPressed=shootReleased=matchRequested=passRequested=strikeRequested=false;pointerAim=undefined;car=cancelSportAction(car);};
  let mode: "playing" | "paused" | "map" = "playing";
  let pendingCommerce:CommerceAction|undefined;
  const commerce=commerceControls(doc,action=>{if(mode==='playing')pendingCommerce=action;if(document.querySelector<HTMLElement>('#commerce-panel')!.hidden)container.focus({preventScroll:true});},()=>{keys.clear();boostRequested=false;talkRequested=false;matchRequested=passRequested=false;clearShot();});
  const controls=controlGuide();
  const accountOwners=new Map(doc.economy?.accounts.map(a=>[a.id,a.actor]));
  let pendingDraw:(()=>void)|undefined;
  let previousRenderCar=car;

  await loading.stage("Starting the renderer");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const profileDpr=import.meta.env.DEV && new URLSearchParams(location.search).has('profile') ? Number(new URLSearchParams(location.search).get('profile-dpr')) : 0;
  renderer.setPixelRatio(import.meta.env.DEV && params.has('capture') ? 1.5 : profileDpr>=1 && profileDpr<=1.5 ? profileDpr : Math.min(devicePixelRatio, 1.5));
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-label", "WASD walks, swims or drives. On sports grounds, N joins or rests a match. Hold J then release to shoot. K passes, calls for a pass or tackles the nearby ball carrier. Outside sports grounds, K hits a reachable prop on foot. Shift or the Boost button gives a car burst. F sits, stands, or enters or exits a vehicle. T talks to nearby people. B buys, V sells, H starts work, collects cargo or completes a delivery; G eats carried food. Y shares food or accepts a meal invitation while seated. X declines an invitation. Space jumps on foot or on a bicycle, skateboard or scooter, and hops a boat. Shift runs or swims faster. In an aircraft Space climbs and Shift descends. Plus and minus, pinch or scroll to zoom; 0 resets framing. Q and E rotate the view. C opens the world map. P pauses; R returns to the start.");
  container.append(renderer.domElement);
  const manualZoom = cameraZoomInput(renderer.domElement, () => mode === "playing");
  if(import.meta.env.DEV && params.has('test-school-interior'))manualZoom.factor=.8;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#526b76");
  scene.fog = new THREE.Fog("#526b76", 1700, 3400);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10000);
  camera.zoom = DEFAULT_CAMERA_ZOOM;
  const aimRay=new THREE.Raycaster(),aimPlane=new THREE.Plane(),aimHit=new THREE.Vector3();
  const aimFromPointer=(e:PointerEvent)=>{
    if(mode!=='playing' || !activeSport(car,doc)){pointerAim=undefined;return;}
    const rect=renderer.domElement.getBoundingClientRect();
    aimRay.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
    aimPlane.set(new THREE.Vector3(0,1,0),-car.elevation);
    if(aimRay.ray.intersectPlane(aimPlane,aimHit))pointerAim={x:aimHit.x+doc.canonical.width/2,y:aimHit.z+doc.canonical.height/2};
    container.focus({preventScroll:true});
  };
  renderer.domElement.addEventListener('pointerdown',aimFromPointer);
  renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons&1)aimFromPointer(e);});
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .12, .35, 1.6);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(worldGradeShader));
  composer.addPass(new OutputPass());
  const smoothing=await worldEdgeSmoothing();composer.addPass(smoothing);
  addEventListener('pagehide',e=>{if(!e.persisted)smoothing.dispose();});

  function resize(): void {
    const width = container.clientWidth, height = container.clientHeight;
    renderer.setSize(width, height);
    composer.setSize(width, height);
    bloom.setSize(width*renderer.getPixelRatio()/2,height*renderer.getPixelRatio()/2);
    const aspect = width / height, half = Math.max(270, 205 / aspect);
    camera.left = -half * aspect; camera.right = half * aspect;
    camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  const hemisphere=new THREE.HemisphereLight("#bad4e2", "#384736", 1.25);scene.add(hemisphere);
  const sun = new THREE.DirectionalLight("#ffe5b8", 2.4);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight("#a7c4eb", .3);
  fill.position.set(350, 250, -300); scene.add(fill);
  await loading.stage("Building water and bridges");
  const landscape=new WorldLandscape(doc,true);scene.add(landscape.group);
  const routes=await loading.build("Building roads and transit",buildRoutesSteps(doc));scene.add(routes);
  const scenery=new WorldStreaming(doc,region=>worker.build(region),id=>landscape.waters.find(w=>w.water.id===id)!.material,worker.bounds);scene.add(scenery.group);
  const streamStatus=document.createElement('output');streamStatus.id='world-stream-status';streamStatus.setAttribute('role','status');streamStatus.textContent='Loading nearby world';streamStatus.hidden=true;container.append(streamStatus);
  let streamWaitStarted=0;
  const streamState=()=>{
    if(scenery.error || debris.error){loading.fail(scenery.error??debris.error!);renderer.setAnimationLoop(null);scenery.dispose();debris.dispose();worker.dispose();return false;}
    const ready=scenery.ready && debris.ready;
    if(!ready){streamWaitStarted ||= performance.now();streamStatus.hidden=performance.now()-streamWaitStarted<200;container.setAttribute('aria-busy','true');}
    else{streamWaitStarted=0;streamStatus.hidden=true;container.setAttribute('aria-busy','false');}
    if(import.meta.env.DEV)container.dataset.streaming=JSON.stringify(scenery.stats);
    return ready;
  };
  addEventListener('pagehide',event=>{if(!event.persisted)scenery.dispose();});
  const {flocks,populations}=await loading.build("Assembling people and wildlife",(function*(){
    const flocks=buildFlocks(doc);scene.add(flocks);yield;
    const populations=yield* AmbientPopulation.buildSteps(doc);scene.add(populations.group);
    return {flocks,populations};
  })());
  const propMeshes = new Map<string, THREE.Group>();
  const actorMeshes=new Map<string,THREE.Group>();
  const rideZooms=new Map<string,number>();
  const breakMeshes=new Map<string,THREE.Group>();
  const objects: THREE.Group[] = [];
  const characters=new Map<THREE.Group,CharacterAnimator>();
  const teamResidents=new Set(doc.sports.flatMap(s=>s.match?.teams.flatMap(t=>t.members)??[]));
  const {debris,traveler,avatar,walkerSpec,walker,walkerAnimation,carRoot,carMesh,particles,sportVisuals,sportsTeams}=await loading.build("Preparing vehicles and interactive objects",(function*(){
  for (const object of doc.objects) {
    if(object.parked || teamResidents.has(object.id))continue;
    if (!isActor(object) && (!isReactive(object.spec) || pooledImpact(doc,object)) && archetypeOf(object).interaction !== "knockable" && !hasAnimatedJoints(object.spec)) continue;
    yield;
    const destructible=isReactive(object.spec) && impactOf(object.spec)?.kind!=="bounce";
    const group = destructible ? buildDamageObject(object) : compactObject(buildObject(object));
    group.position.copy(worldPosition(doc, object.x, object.y, 1.5));
    const placement=objectPlacement(doc,object);
    group.position.y=placement.base+objectGroundLift(object);group.quaternion.copy(placement.rotation);
    group.userData.sceneObject=object;group.userData.groundLift=objectGroundLift(object);
    group.userData.ambient=!!object.route && ["ambient","walk"].includes(doc.routes.find(r=>r.id===object.route!.id)?.kind??"");
    scene.add(group);
    objects.push(group);
    if(object.spec && 'dslVersion' in object.spec && object.spec.dslVersion===2 && object.spec.joints?.some(j=>j.bone))characters.set(group,new CharacterAnimator(group,object.spec));
    if(archetypeOf(object).interaction === "knockable") propMeshes.set(object.id, group);
    if(isActor(object)){actorMeshes.set(object.id,group);rideZooms.set(object.id,rideCameraZoom(doc.player,object));}
    if(destructible)breakMeshes.set(object.id,group);
  }
  yield;
  const debris=new WorldDebris(doc,object=>scenery.objectMeshes(object),(id,signal)=>worker.topple(id,signal));scene.add(debris.group);addEventListener('pagehide',event=>{if(!event.persisted)debris.dispose();});
  yield;
  const traveler={...interactiveWorld.assemblies.find(a=>a.displayName==="Traveler")!,voxelSize:doc.voxelWorld?.objectCell};
  const avatar=compactObject(buildObject({id:"traveler",kind:"custom",labelText:"Traveler",x:0,y:0,scale:measuredScale(traveler),spec:traveler}));avatar.visible=false;objects.push(avatar);
  yield;
  const walkerSpec={...interactiveWorld.assemblies.find(a=>a.displayName==="Explorer")!,voxelSize:doc.voxelWorld?.objectCell};
  const walker=compactObject(buildObject({id:"explorer",kind:"custom",labelText:"Explorer",x:0,y:0,scale:measuredScale(walkerSpec),spec:walkerSpec}));
  walker.visible=false;scene.add(walker);
  const walkerAnimation=new CharacterAnimator(walker,walkerSpec);
  yield;
  const carRoot = new THREE.Group(), carMesh = compactObject(buildPlayer(doc));
  carRoot.add(carMesh); scene.add(carRoot);
  const particles = new WorldParticles(doc); scene.add(particles.mesh);
  const sportVisuals=new SportsVisuals(doc);scene.add(sportVisuals.group);
  const sportsTeams=yield* SportsTeamsVisuals.buildSteps(doc);scene.add(sportsTeams.group);addEventListener('pagehide',e=>{if(!e.persisted)sportsTeams.dispose();});
  return {debris,traveler,avatar,walkerSpec,walker,walkerAnimation,carRoot,carMesh,particles,sportVisuals,sportsTeams};
  })());
  const parking=new WorldParking(doc);scene.add(parking.group);
  const releaseParked=(object:Scene['objects'][number],root:THREE.Group)=>{
    if(avatar.parent===root)scene.add(avatar);if(walker.parent===root)scene.add(walker);
    actorMeshes.delete(object.id);rideZooms.delete(object.id);const index=objects.indexOf(root);if(index>=0)objects.splice(index,1);
  };
  addEventListener('pagehide',event=>{if(!event.persisted)parking.dispose(releaseParked);});
  const sportBalls=new Set(doc.sports.map(s=>s.ballId));
  const occlusion = new SceneryOcclusion(objects.filter(object=>object!==avatar && !sportBalls.has(object.userData.sceneObject?.id)));
  const navigation=worldMap(doc,{
    canOpen:()=>mode==='playing' && document.body.dataset.loading==='ready',
    onOpen:()=>{setMode('map');navigation.update(car,cameraAngle);},onClose:()=>setMode('playing'),
    storage:!review || reviewSave || params.has('test-navigation') ? ()=>localStorage : undefined,
    storageKey:`${review ? 'muse-dream.review-navigation' : 'muse-dream.navigation'}.v1.${doc.sceneId}.${doc.canonical.width}x${doc.canonical.height}`,
  });

  await loading.stage("Preparing lighting");
  const daylight=new WorldDaylight(doc,scene,hemisphere,sun,fill);
  const reviewHour=import.meta.env.DEV ? Number(new URLSearchParams(location.search).get("test-hour")) : NaN;
  const hourOffset=import.meta.env.DEV && new URLSearchParams(location.search).has("test-hour") && Number.isFinite(reviewHour) && reviewHour>=0 && reviewHour<24 && doc.daylight ? ((reviewHour-doc.daylight.startHour+24)%24)/24*doc.daylight.cycleSeconds : 0;
  const sunShadows=new SunShadows(sun,scenery.bounds.min,scenery.bounds.max+MAX_FLIGHT_CLEARANCE);
  for(const root of [landscape.group,routes,flocks,daylight.pools,populations.group])freezeStatic(root);
  // Matrices are updated once below, before both occlusion and rendering consume them.
  scene.matrixWorldAutoUpdate=false;

  // Keyboard-only diagnostics stay out of the play surface.
  const debug = new THREE.Group();
  const colliderLines = new Map<string, THREE.Line>();
  let debugReady=false;
  function prepareDebug():void {
    if(debugReady) return;
    debugReady=true;
    debug.add(new THREE.Mesh(roadGeometry(doc), new THREE.MeshBasicMaterial({ color: "#65cfff", wireframe: true, transparent: true, opacity: .4 })));
    for (const object of doc.objects) {
      if (archetypeOf(object).interaction === "decor") continue;
      const points = Array.from({ length: 49 }, (_, i) => {
        const angle = i / 48 * Math.PI * 2, r = objectRadius(object);
        return worldPosition(doc, object.x + Math.cos(angle) * r, object.y + Math.sin(angle) * r, 3);
      });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: "#ffb56d", depthTest: false }));
      line.frustumCulled = false;
      debug.add(line);
      if (archetypeOf(object).interaction === "knockable") colliderLines.set(object.id, line);
    }
    for (const cp of doc.checkpoints) {
      const points = Array.from({ length: 20 }, (_, i) => worldPosition(doc,
        THREE.MathUtils.lerp(cp.a.x, cp.b.x, i / 19), THREE.MathUtils.lerp(cp.a.y, cp.b.y, i / 19), 3));
      debug.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: "#ffe0a1", depthTest: false })));
    }
  }
  debug.visible = false; scene.add(debug);
  let follow: FollowTarget = worldPosition(doc, car.x, car.y);
  let snap = true, wheelDistance = 0;
  const basis = new THREE.Matrix4(), forward = new THREE.Vector3(), side = new THREE.Vector3();
  let boostUntil = 0;
  let cameraAngle = 0, viewAngle = 0, landingBounce = 0;
  let flight = { jumps: 0, landings: 0, maxClearance: 0 };
  document.querySelector<HTMLElement>('#save-tools')!.hidden=!saves;
  const backups=saves ? saveTools(world,()=>({state:car,worldTime:worldTime.value}),snapshot=>saveNow(true,snapshot.state,snapshot.worldTime),snapshot=>{
    car=snapshot.state;worldTime.value=snapshot.worldTime;saveDirty=false;saveAt=car.timeS;resetPresentation();updateControlGuide();saveStatus.textContent='Backup restored on this device.';
  }) : undefined;

  function resetPosition(restartRace = false): void {
    backups?.close();
    pendingDraw=undefined;saveDirty=true;
    car = resetCar(car, doc, restartRace);
    resetPresentation(restartRace);
    if(restartRace){worldTime.value=0;manualZoom.factor=1;navigation.clear();}
  }
  function resetPresentation(resetProps=true):void{
    previousRenderCar=car;
    commerce.close(false);
    repairViews.reset();
    pendingCommerce=undefined;
    pendingDraw=undefined;
    walkerAnimation.reset();
    clearShot();
    pointerAim=undefined;
    boostRequested=false;talkRequested=false;matchRequested=passRequested=false;
    stepper.reset(); particles.clear(); landscape.clear(); snap = true; cameraAngle=viewAngle;
    boostUntil = 0; surface.textContent = "";
    flight = { jumps: 0, landings: 0, maxClearance: 0 }; landingBounce = 0;
    wheelDistance = 0;
    for(const group of propMeshes.values())delete group.userData.ballPrevious;
    if(resetProps)for (const group of propMeshes.values()) group.userData.distance = 0;
  }

  function updateControlGuide():void{
    const context:GuideContext=car.seated ? 'seated' : car.control.kind==='foot' ? activeSport(car,doc) ? 'sport' : isSwimming(car,world) ? 'swim' : 'foot' : car.control.kind==='passenger' ? 'passenger' : controlOf(occupiedObject(car,world)?.spec)??'car';
    controls.update(context);
  }
  function setMode(next: typeof mode): void {
    if(next!=='map')navigation.close(false);
    commerce.close(false);
    pendingCommerce=undefined;
    if(next==='playing')backups?.close();
    mode = next;previousRenderCar=car; keys.clear(); boostRequested=false;talkRequested=false;matchRequested=passRequested=false; pointerAim=undefined; clearShot(); stepper.reset();
    if(next === "paused"){
      cameraAngle=viewAngle;
      updateControlGuide();
    }else controls.close();
    if (next === "paused" && !pauseMenu.open) pauseMenu.showModal();
    else if (next !== "paused" && pauseMenu.open) pauseMenu.close();
    pauseButton.setAttribute("aria-label", next === "paused" ? "Resume" : "Pause");
    pauseButton.setAttribute("aria-pressed", String(next === "paused"));
    pauseButton.dataset.paused = String(next === "paused");
    if(next==="playing")container.focus({preventScroll:true});
    else saveNow();
    commerce.update(car,next==="playing");
  }
  pauseButton.addEventListener("click", () => setMode(mode === "playing" ? "paused" : "playing"));
  const useRide=()=>{if(mode==="playing" && !pendingDraw){car=toggleRide(car,world);pendingCommerce=undefined;boostRequested=false;talkRequested=false;matchRequested=passRequested=false;clearShot();container.focus({preventScroll:true});}};
  interact.addEventListener("click",useRide);
  talkButton.addEventListener("click",()=>{if(mode==="playing")talkRequested=true;container.focus({preventScroll:true});});
  boostButton.addEventListener('click',()=>{
    if(mode==='playing' && isCarControl(car,world))boostRequested=true;
    container.focus({preventScroll:true});
  });
  matchButton.addEventListener('click',()=>{if(mode==='playing')matchRequested=true;container.focus({preventScroll:true});});
  const useStrike=()=>{if(mode==='playing' && !pendingDraw && !activeSport(car,doc))strikeRequested=true;container.focus({preventScroll:true});};
  strikeButton.addEventListener('click',useStrike);
  strikeButton.addEventListener('keydown',event=>{if(event.code==='Enter' || event.code==='Space'){event.preventDefault();event.stopPropagation();if(!event.repeat)useStrike();}});
  passButton.addEventListener('click',()=>{if(mode==='playing' && !passButton.disabled)passRequested=true;container.focus({preventScroll:true});});
  const beginShot=()=>{if(mode==='playing' && !sportButton.disabled){shootButtonHeld=true;shootPressed=true;}};
  const releaseShot=()=>{if(shootButtonHeld){shootButtonHeld=false;shootReleased=true;}container.focus({preventScroll:true});};
  sportButton.addEventListener('pointerdown',e=>{e.preventDefault();sportButton.setPointerCapture(e.pointerId);beginShot();container.focus({preventScroll:true});});
  sportButton.addEventListener('pointerup',releaseShot);
  sportButton.addEventListener('pointercancel',clearShot);
  sportButton.addEventListener('keydown',e=>{if(e.code==='Space' || e.code==='Enter'){e.preventDefault();e.stopPropagation();if(!e.repeat)beginShot();}});
  sportButton.addEventListener('keyup',e=>{if(e.code==='Space' || e.code==='Enter'){e.preventDefault();e.stopPropagation();releaseShot();}});
  sportButton.addEventListener('click',e=>{if(e.detail===0){beginShot();releaseShot();}});
  pauseMenu.addEventListener("cancel", (e) => { e.preventDefault(); setMode("playing"); });
  reduced.addEventListener("change", () => { particles.clear(); landscape.clear(); snap = true; });
  document.querySelector("#resume")!.addEventListener("click", () => { setMode("playing"); });
  document.querySelector("#restart")!.addEventListener("click", () => {
    resetPosition(true);saveNow(true);
    setMode("playing");
  });
  addEventListener("keydown", (e) => {
    if(e.metaKey || e.ctrlKey || e.altKey)return;
    if(navigation.open){navigation.key(e);return;}
    if(mode==='paused'){if(!e.repeat && (e.code==='Escape' || e.code==='KeyP')){e.preventDefault();setMode('playing');}return;}
    if(commerce.key(e.code,e.target,e.repeat,e.shiftKey)){e.preventDefault();return;}
    if(e.code==='KeyC'){e.preventDefault();if(!e.repeat)navigation.show();return;}
    if(e.target instanceof HTMLElement && e.target.closest('button,input,select,summary') && e.code!=='Escape' && e.code!=='KeyP')return;
    if(!e.ctrlKey && !e.metaKey && !e.altKey && manualZoom.key(e.code)){e.preventDefault();return;}
    if (e.code.startsWith("Arrow") || e.code === "Space" && e.target === container) e.preventDefault();
    if (!e.repeat) {
      if (e.code === "KeyP" || e.code === "Escape") setMode(mode === "playing" ? "paused" : "playing");
      if (e.code === "KeyR") resetPosition();
      if (e.code === "KeyO") { prepareDebug(); debug.visible = !debug.visible; }
      if (mode === "playing" && e.code === "KeyQ") viewAngle -= Math.PI / 2;
      if (mode === "playing" && e.code === "KeyE") viewAngle += Math.PI / 2;
      if(mode==="playing" && e.code==="KeyF")useRide();
      if(mode==='playing' && (e.code==='ShiftLeft' || e.code==='ShiftRight'))boostRequested=true;
      if(mode==='playing' && e.code==='KeyJ')shootPressed=true;
      if(mode==='playing' && e.code==='KeyN')matchRequested=true;
      if(mode==='playing' && e.code==='KeyK'){if(activeSport(car,doc))passRequested=true;else strikeRequested=true;}
      if(mode==='playing' && e.code==='KeyT')talkRequested=true;
    }
    keys.add(e.code);
    if(!e.repeat && ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))pointerAim=undefined;
  });
  addEventListener("keyup", (e) => {keys.delete(e.code);if(e.code==='KeyJ')shootReleased=true;});
  addEventListener("blur", () => { keys.clear(); pendingCommerce=undefined;boostRequested=false;talkRequested=false;matchRequested=passRequested=false;clearShot(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) setMode("paused"); });
  container.dataset.world=JSON.stringify({width:doc.canonical.width,height:doc.canonical.height,objects:doc.objects.length,checkpoints:doc.checkpoints.length,birds:doc.flocks.reduce((n,f)=>n+f.count,0)});
  container.dataset.source="dream-2";
  let previous = performance.now(), hudTime = 0;
  let frameMs = 16.7;
  const profile=import.meta.env.DEV ? renderProfile(renderer,()=>{
    resetPosition(true);car=drivingReviewStart(car,world,params.get("test-driving"));car=movementReviewStart(car,world,params.get("test-movement"));car=cargoReviewStart(car,world,params.get("test-cargo"));if(params.has("test-fleet"))car=toggleRide(vehicleReviewStart(car,world,params.get("test-fleet")),world);if(params.has("profile-match") && activeSport(car,doc)?.sport.match)car=stepInteractive(car,{steer:0,throttle:0,matchPressed:true},1/120,world);worldTime.value=0;
  },(drive,frame)=>{keys.clear();if(drive && frame<300)keys.add("KeyW");}) : undefined;
  let captureWalk:ReturnType<typeof interiorReviewInput>|undefined;
  let captureTime:number|undefined,captureActor:string|undefined,captureFocus:THREE.Vector3|undefined;
  const capture=import.meta.env.DEV ? mediaCapture(renderer.domElement,{schoolroom:600,nursery:420,recovery:300,actions:180,hand:600,equipment:480,fixturefall:240,fixturerepair:600,driving:210,boost:210,football:480,basketball:480,switching:240,locomotion:180,swimming:180,daynight:360,flight:300,pedestrians:720,wildlife:360,conversation:240,commerce:360,delivery:360,parking:360,repair:840,maintenance:600,lamps:240,treefall:240,lamprepair:360,streetrepair:360,planting:360,growth:900,courier:360,handoff:540,interior:600,interiornight:240,transit:240,recipes:360,progression:480,meals:480,kitchen:480,seating:480,hours:480,shifts:600,shared:720,hosted:420,airportrepair:600,schoolrepair:600,business:600,park:360,scooter:240},async(clip)=>{
    captureTime=undefined;captureActor=undefined;captureFocus=undefined;captureWalk=undefined;viewAngle=0;cameraAngle=0;
    resetPosition(true);worldTime.value=0;setMode("playing");
    commerce.resetChoices();
    characters.forEach(character=>character.reset());
    if(clip==='hand' || clip==='actions'){
      const steps=handReviewSteps(car,world,clip==='hand');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;manualZoom.factor=1.6;
    }
    if(clip==='schoolroom'){const steps=schoolReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();while(!result.done){if(performance.now()-yieldAt>8){await new Promise(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}car=result.value;worldTime.value=car.timeS;manualZoom.factor=.8;}
    if(clip==='nursery'){const steps=nurseryReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();while(!result.done){if(performance.now()-yieldAt>8){await new Promise(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}car=result.value;worldTime.value=car.timeS;manualZoom.factor=1.5;}
    if(clip==='recovery'){const steps=recoveryReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}car=result.value;worldTime.value=car.timeS;manualZoom.factor=1.5;}
    if(clip==='equipment'){
      const steps=equipmentReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;manualZoom.factor=1.6;
    }
    if(clip==='interior' || clip==='interiornight')car=interiorReviewStart(car,world,clip==='interiornight');
    if(clip==='maintenance'){car=maintenanceReviewStart(car,world);worldTime.value=car.timeS;captureActor=doc.economy?.accounts.find(a=>car.economy?.accounts.find(b=>b.id===a.id)?.repair)?.actor;}
    if(clip==='fixturefall'){car=drivingReviewStart(car,world,'street-stall');manualZoom.factor=1.8;}
    if(clip==='lamps')car=drivingReviewStart(car,world,'lamp');
    if(clip==='treefall'){car=drivingReviewStart(car,world,'street-tree');const tree=doc.objects.find(o=>o.id==='garden_rowan_north')!;captureFocus=worldPosition(doc,tree.x,tree.y);captureFocus.y=objectPlacement(doc,tree).base;manualZoom.factor=2.4;}
    if(clip==='fixturerepair' || clip==='lamprepair' || clip==='streetrepair' || clip==='planting' || clip==='growth'){
      const steps=repairReviewSteps(car,world,clip==='fixturerepair' ? 'street-tub' : clip==='planting' || clip==='growth' ? 'street-tree' : clip==='streetrepair' ? 'street-lamp' : 'lamp',clip==='growth' ? 'planted' : 'work');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>=12){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;if(clip==='fixturerepair')manualZoom.factor=2.4;if(clip==='planting' || clip==='growth')manualZoom.factor=2.4;if(clip==='growth'){const object=doc.objects.find(o=>o.id===car.growing![0]!.objectId)!;captureFocus=worldPosition(doc,object.x,object.y);captureFocus.y=objectPlacement(doc,object).base;}else captureActor=doc.economy?.accounts.find(a=>car.economy?.accounts.find(b=>b.id===a.id)?.repair)?.actor;
    }

    if(clip==='courier' || clip==='handoff'){
      const steps=courierReviewSteps(car,world,clip==='courier' ? 'pickup' : 'handoff');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>=12){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;captureActor=doc.economy?.accounts.find(a=>car.economy?.accounts.find(b=>b.id===a.id)?.courier)?.actor;
    }
    if(clip==='business'){
      const steps=businessReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;viewAngle=Math.PI;manualZoom.factor=1.5;
    }
    if(clip==='airportrepair'){
      const steps=repairReviewSteps(car,world,'airport-lamp','approach');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;captureActor=doc.economy?.accounts.find(a=>car.economy?.accounts.find(b=>b.id===a.id)?.repair)?.actor;viewAngle=Math.PI;manualZoom.factor=2;
    }
    if(clip==='schoolrepair'){
      const steps=repairReviewSteps(car,world,'school-bench','approach');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;captureActor=doc.economy?.accounts.find(a=>car.economy?.accounts.find(b=>b.id===a.id)?.repair)?.actor;viewAngle=Math.PI;manualZoom.factor=1.5;
    }
    if(clip==='shared' || clip==='hosted'){
      const steps=sharedMealReviewSteps(car,world,clip==='hosted');let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;captureFocus=undefined;viewAngle=Math.PI;manualZoom.factor=2;
    }
    if(clip==='hours' || clip==='shifts'){
      const steps=hoursReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>8){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;const vendor=doc.objects.find(o=>o.id==='vendor')!;captureFocus=worldPosition(doc,vendor.x,vendor.y-60);captureFocus.y=objectPlacement(doc,vendor).base;if(clip==='shifts'){captureFocus=undefined;viewAngle=Math.PI;manualZoom.factor=1.5;}
    }
    if(clip==='meals' || clip==='kitchen' || clip==='seating'){
      const steps=clip==='seating' ? seatingReviewSteps(car,world) : clip==='kitchen' ? kitchenReviewSteps(car,world) : mealReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>=12){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;const vendor=doc.objects.find(o=>o.id==='vendor')!;captureFocus=worldPosition(doc,vendor.x,vendor.y-60);captureFocus.y=objectPlacement(doc,vendor).base;if(clip==='seating'){captureFocus=undefined;viewAngle=Math.PI;manualZoom.factor=2;}
    }
    if(clip==='progression'){
      const steps=progressionReviewSteps(car,world);let result=steps.next(),yieldAt=performance.now();
      while(!result.done){if(performance.now()-yieldAt>=12){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}result=steps.next();}
      car=result.value;worldTime.value=car.timeS;
    }
    if(clip==='repair')car=drivingReviewStart(car,world,'repair');
    if(clip==='conversation' || clip==='commerce' || clip==='delivery' || clip==='recipes')car=npcReviewStart(car,world,'vendor');
    if(clip==='pedestrians' || clip==='wildlife')car=populationReviewStart(car,world,clip==='pedestrians' ? 'crowd' : clip);
    if(clip==='switching'){const bike=doc.objects.find(o=>o.id==='village_bike')!;car={...car,x:bike.x-40,y:bike.y,headingRad:0,elevation:drivingHeight(doc.terrain,bike.x-40,bike.y)};}
    if(clip==='locomotion')car=drivingReviewStart(car,world,'park');
    if(clip==='locomotion' || clip==='swimming')car=movementReviewStart(car,world,clip==='swimming' ? 'swim' : 'walk');
    if(clip==='flight')car=toggleRide(vehicleReviewStart(car,world,'cloudhopper'),world);
    if(clip==='transit')car=vehicleReviewStart(car,world,'market_tram_vehicle');
    if(clip==='parking')car=vehicleReviewStart(car,world,'transit_bicycles_0_5_r');
    if(clip==='scooter'){car=toggleRide(vehicleReviewStart(car,world,'market_scooter'),world);if(car.control.kind!=='vehicle' || car.control.id!=='market_scooter')throw Error('Scooter capture could not board');}
    if(clip==='park'){car=movementReviewStart(car,world,'park');manualZoom.factor=.8;}
    if(clip==='football' || clip==='basketball')car=movementReviewStart(car,world,clip);
  },(clip:string,frame:number)=>{
    keys.clear();
    if(clip==='interior' || clip==='interiornight'){
      const night=clip==='interiornight',config=doc.daylight;captureTime=config ? (((night ? 22 : 14)-config.startHour+24)%24)/24*config.cycleSeconds+frame/30 : undefined;
      if(frame===360 && !night || frame===120 && night)viewAngle+=Math.PI/2;
      captureWalk=interiorReviewInput(car,world,frame,cameraAngle,night);pendingCommerce=captureWalk.commerce;return;
    }
    if(clip==='actions'){
      if(frame===2){commerce.open('work');for(let i=0;i<3;i++)commerce.key('ArrowDown');}
      if(frame===90)commerce.key('ArrowUp');
      return;
    }
    if(clip==='hand'){
      if(frame===599){
        const player=car.economy?.accounts.find(a=>a.id==='pocket');
        if(car.broken.includes('hall_table_east') || player?.credits!==27 || player.completed.work.bake!==1 || player.completed.repair.market_tables!==1 || !car.economy?.events.some(e=>e.account==='pocket' && e.kind==='cancel' && e.reason==='equipment'))throw Error('The hand capture did not refund, repair and complete its paid batch');
        container.dataset.handCapture=JSON.stringify({timeS:car.timeS,player,economy:car.economy,broken:car.broken,strikeReadyAtS:car.strikeReadyAtS});
      }
      if(frame===30)strikeRequested=true;
      if(frame===60)pendingCommerce={kind:'repair',repair:'market_tables'};
      if(frame===330)pendingCommerce={kind:'work',job:'bake'};
      return;
    }
    if(clip==='schoolroom'){if(frame===30)pendingCommerce={kind:'share',partner:'school_staff'};return;}
    if(clip==='nursery'){if(frame===5){commerce.open('work');for(let i=0;i<4;i++)commerce.key('ArrowDown');}return;}
    if(clip==='recovery'){if(frame===5)commerce.key('KeyM');if(frame===90)commerce.key('KeyH');return;}
    if(clip==='equipment'){
      if(frame===5){commerce.key('KeyM');commerce.key('Digit2');}
      if(frame===15 || frame===255)commerce.key('KeyH');
      if(frame===300)commerce.key('KeyM');
      return;
    }
    if(clip==='park'){if(frame===30 || frame===180)useRide();if(frame>=210 && frame<330)keys.add('KeyD');return;}
    if(clip==='fixturefall'){if(frame<160)keys.add('KeyW');if(frame>=160 && frame<190)keys.add('KeyS');return;}
    if(clip==='hosted'){if(frame===60)commerce.key('KeyY');return;}
    if(clip==='shared'){if(frame===10)commerce.key('KeyX');if(frame===30)commerce.key('KeyY');if(frame===420)useRide();if(frame===450 || frame===480)talkRequested=true;return;}
    if(clip==='shifts'){captureWalk=shiftReviewInput(car,world,frame,cameraAngle);if(frame===101)commerce.key('KeyG');if(frame===540)talkRequested=true;return;}
    if(clip==='hours'){if(frame===30)commerce.key('KeyH');if(frame===300)commerce.key('KeyG');return;}
    if(clip==='seating'){
      const config=doc.daylight;captureTime=config ? ((14-config.startHour+24)%24)/24*config.cycleSeconds+frame/30 : undefined;
      if(frame===60)commerce.key('KeyG');if(frame===120 || frame===270)useRide();captureWalk=seatingReviewInput(car,world,frame,cameraAngle);return;
    }
    if(clip==='transit'){if(frame===20 || frame===105 || frame===120 || frame===210)useRide();return;}
    if(clip==='maintenance')return;
    if(clip==='business'){
      const config=doc.daylight;captureTime=config ? ((14-config.startHour+24)%24)/24*config.cycleSeconds+frame/30 : undefined;
      if(frame===1)commerce.open('business');
      if(frame===30)document.querySelector<HTMLButtonElement>('#business-buy')!.click();
      if(frame===90)document.querySelector<HTMLButtonElement>('#business-deposit')!.click();
      if(frame===420)document.querySelector<HTMLButtonElement>('#business-withdraw')!.click();
      if(frame===599 && (car.economy?.markets.find(m=>m.id==='station_supplies')?.owner!=='pocket' || !car.economy.delivered.kits_run))throw Error('The ownership capture did not complete its purchase and supplier payment');
      return;
    }
    if(clip==='fixturerepair' || clip==='schoolrepair' || clip==='airportrepair'){const config=doc.daylight;captureTime=config ? ((14-config.startHour+24)%24)/24*config.cycleSeconds+frame/30 : undefined;return;}
    if(clip==='kitchen'){
      const config=doc.daylight;captureTime=config ? ((14-config.startHour+24)%24)/24*config.cycleSeconds+frame/30 : undefined;
      if(frame===5){commerce.choose('goods','lunch');}
      if(frame===15)commerce.key('KeyB');if(frame===90)commerce.key('KeyG');return;
    }
    if(clip==='treefall'){const config=doc.daylight;captureTime=config ? ((14-config.startHour+24)%24)/24*config.cycleSeconds+frame/30 : undefined;if(frame<45)keys.add('KeyW');if(frame>=45 && frame<85)keys.add('KeyS');if(frame===75 || frame===120 || frame===165)viewAngle+=Math.PI/2;return;}
    if(clip==='planting' || clip==='growth' || clip==='courier' || clip==='handoff' || clip==='meals'){const config=doc.daylight;captureTime=config ? ((14-config.startHour+24)%24)/24*config.cycleSeconds+frame/30 : undefined;return;}
    if(clip==='lamps' || clip==='lamprepair' || clip==='streetrepair'){
      const config=doc.daylight;captureTime=config ? ((22-config.startHour+24)%24)/24*config.cycleSeconds+frame/30 : undefined;
      if(clip==='lamps'){if(frame<33)keys.add('KeyW');if(frame>=33 && frame<78)keys.add('KeyS');if(frame===84)useRide();}return;
    }

    if(clip==='scooter'){if(frame<150)keys.add('KeyW');if(frame>=40 && frame<65)keys.add('KeyD');if(frame>=90 && frame<100)keys.add('Space');if(frame>=150 && frame<210)keys.add('KeyS');return;}
    if(clip==='repair'){if(frame<38)keys.add('KeyW');if(frame>=38 && frame<58)keys.add('KeyS');if(frame===60)useRide();return;}
    if(clip==='parking'){
      if(frame===18 || frame===230 || frame===270)useRide();
      if(frame>=25 && frame<130 || frame>=285 && frame<315)keys.add('KeyW');
      if(frame>=45 && frame<65)keys.add('KeyA');
      if(frame>=165 && frame<195)keys.add('KeyS');return;
    }
    if(clip==='delivery'){
      if(frame===5){commerce.choose('jobs','delivery:school_run');}
      if(frame===20)commerce.key('KeyH');
      if(frame>=40 && frame<100)keys.add('KeyW');
      if(frame>=100 && frame<136){keys.add('KeyW');keys.add('KeyA');}
      if(frame===145 || frame===300)useRide();
      if(frame>=160 && frame<270)keys.add('KeyS');return;
    }
    if(clip==='progression'){
      if(frame===5){commerce.choose('jobs','work:large_bake');}
      if(frame===15)talkRequested=true;
      if(frame===150)commerce.key('KeyH');return;
    }
    if(clip==='recipes'){
      if(frame===5){commerce.choose('jobs','work:pack_lunch');}
      if(frame===20)commerce.key('KeyH');
      if(frame===195){commerce.choose('goods','lunch');}
      if(frame===205)commerce.key('KeyB');if(frame===230)commerce.key('KeyG');return;
    }
    if(clip==='commerce'){if(frame===1)commerce.open('market');if(frame===30)commerce.open('bag');if(frame===65)commerce.open('work');if(frame===315)commerce.close(false);if(frame===20)commerce.key('KeyB');if(frame===45)commerce.key('KeyG');if(frame===75)commerce.key('KeyH');return;}
    if(clip==='conversation'){if(frame===25 || frame===125)talkRequested=true;return;}
    if(clip==='pedestrians' || clip==='wildlife')return;
    if(clip==="daynight"){captureTime=frame/359*(doc.daylight?.cycleSeconds??600);return;}
    if(clip==="driving"){if(frame<175)keys.add("KeyW");return;}
    if(clip==='boost'){if(frame<175)keys.add('KeyW');if(frame>=25 && frame<50)keys.add('ShiftLeft');return;}
    if(clip==='football' || clip==='basketball'){if(frame===1)matchRequested=true;if(frame===25 || frame===125 || frame===300)passRequested=true;if(frame>=180 && frame<198)keys.add('KeyJ');return;}
    if(clip==='flight'){
      keys.add('KeyW');
      if(frame>=40 && frame<170)keys.add('Space');
      if(frame>=170 && frame<225)keys.add('KeyD');
      if(frame>=240)keys.add('ShiftLeft');return;
    }
    if(clip==='locomotion'){
      if(frame<130){keys.add('KeyS');if(frame>40)keys.add('ShiftLeft');}
      if(frame>=62 && frame<78 || frame>=105 && frame<120)keys.add('Space');return;
    }
    if(clip==='swimming'){
      if(frame<140)keys.add('KeyS');if(frame>=50 && frame<125)keys.add('ShiftLeft');
      if(frame>=85 && frame<110)keys.add('KeyA');return;
    }
    if(frame===18 || frame===52 || frame===180)useRide();
    if(frame>=22 && frame<44)keys.add("KeyD");
    if(frame>=68 && frame<130)keys.add("KeyW");
    if(frame>=135 && frame<162)keys.add("KeyS");

  }) : undefined;
  let hiddenBroken:typeof car.broken|undefined,hiddenParking:ReadonlySet<string>|undefined,hiddenSeeds=new Set<string>();
  function hiddenScenery(){
    if(hiddenBroken!==car.broken || hiddenParking!==parking.hiddenSeeds){hiddenBroken=car.broken;hiddenParking=parking.hiddenSeeds;hiddenSeeds=new Set([...parking.hiddenSeeds,...car.broken]);}
    return hiddenSeeds;
  }
  let memoryRevision="";
  const shadersReady=firstFrameReady(async()=>{
    await loading.stage('Preparing the first frame');
    const start=performance.now();
    await renderer.compileAsync(scene,camera);
    await prepareWorldEdges(renderer,smoothing);
    if(import.meta.env.DEV)container.dataset.shaderWarmup=JSON.stringify({ms:performance.now()-start,parallel:renderer.extensions.has('KHR_parallel_shader_compile')});
  },error=>{renderer.setAnimationLoop(null);scenery.dispose();debris.dispose();worker.dispose();loading.fail(error);});
  const frame=() => {
    if(pendingDraw){debris.update(car,reduced.matches);if(streamState() && shadersReady()){profile?.resume();pendingDraw();pendingDraw=undefined;previous=performance.now();}return;}
    const captureDt=capture?.begin();
    if(captureDt===null)return;
    const now = performance.now(), elapsedMs = now - previous, dt = profile?.begin(elapsedMs) ?? captureDt ?? Math.min(elapsedMs / 1000, .1); previous = now;
    frameMs += (elapsedMs - frameMs) * .05;
    worldMotion.value = reduced.matches ? 0 : 1;
    let boosted = false, impact = 0, collision = 0;
    let poses:ReturnType<typeof actorPoses>|undefined;
    const objectImpacts:ImpactEvent[]=[];
    if (mode === "playing") {
      if (!reduced.matches) worldTime.value += dt;
      const input = {
        steer: Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft")),
        throttle: Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown")),
        lift:Number(keys.has("Space"))-Number(keys.has("ShiftLeft") || keys.has("ShiftRight")),viewAngle:cameraAngle,
        jump:keys.has('Space'),sprint:keys.has('ShiftLeft') || keys.has('ShiftRight'),
        boost:keys.has('ShiftLeft') || keys.has('ShiftRight'),
        shoot:keys.has('KeyJ') || shootButtonHeld,
        aim:pointerAim,
        ...(captureDt ? captureWalk : undefined),
      };
      const steps = stepper.push(dt);
      for (let i = 0; i < steps; i++) {
        previousRenderCar=car;
        const previousCommerceEvent=car.economy?.events.at(-1);
        const wasGrounded = car.grounded, previousSpeed=Math.hypot(car.vx,car.vy),riding=car.control.kind!=="car";
        saveDirty ||= strikeRequested || talkRequested || matchRequested || passRequested || !!pendingCommerce;
        car = stepInteractive(car, {...input,commerce:pendingCommerce,boostPressed:boostRequested,talkPressed:talkRequested,strikePressed:strikeRequested,shootPressed,shootReleased,matchPressed:matchRequested,passPressed:passRequested}, stepper.stepDt, world);pendingCommerce=undefined;
        saveDirty ||= car.economy?.events.at(-1)!==previousCommerceEvent;
        shootPressed=shootReleased=matchRequested=passRequested=strikeRequested=false;
        boostRequested=false;talkRequested=false;matchRequested=passRequested=false;
        objectImpacts.push(...car.impacts);
        landscape.step(car,stepper.stepDt,!reduced.matches); boosted ||= car.boostedThisStep;
        poses=actorPoses(doc,car.timeS,car);
        landscape.stepActors(poses.filter(p=>!(car.control.kind==="vehicle" && p.id===car.control.id)),stepper.stepDt,!reduced.matches);
        if (!riding && wasGrounded && !car.grounded) flight.jumps++;
        if (!riding && !wasGrounded && car.grounded) flight.landings++;
        if(!riding)flight.maxClearance = Math.max(flight.maxClearance, car.elevation - drivingHeight(doc.terrain, car.x, car.y));
        impact = Math.max(impact, car.landingSpeed);
        if(!riding && car.landingSpeed===0) collision=Math.max(collision,previousSpeed-Math.hypot(car.vx,car.vy));
      }
      if (boosted) boostUntil = car.timeS + .5;
      poses??=actorPoses(doc,car.timeS,car);
      particles.update(car, dt, !reduced.matches, boosted, impact, collision,poses);
      particles.objectImpacts(car,objectImpacts,!reduced.matches);
      landingBounce = Math.max(landingBounce * Math.exp(-dt * 12), Math.min(MAX_SUSPENSION_COMPRESSION, impact * .008));
      if(car.control.kind==="car")wheelDistance += (car.vx * Math.cos(car.headingRad) + car.vy * Math.sin(car.headingRad)) * dt;
    }
    landscape.upload();
    for(const [id,group] of breakMeshes)updateDamage(group,id,car,growthScale(doc,car,id));
    debris.update(car,reduced.matches);
    const viewCar=presentState(previousRenderCar,car,mode==='playing' && !snap && !reduced.matches ? stepper.alpha : 1,doc);
    const parked=car.vehicles.find(v=>v.id===null),visual=car.control.kind==="car" ? viewCar : {...viewCar,...(parked??doc.spawn),grounded:true,vz:0,vx:0,vy:0};
    const position = worldPosition(doc, viewCar.x, viewCar.y, 1.5), normal = terrainNormal(doc, visual.x, visual.y);
    position.y = viewCar.elevation + 1.5;
    carRoot.visible=car.control.kind==="car" || !!parked;
    carRoot.position.copy(worldPosition(doc,visual.x,visual.y));carRoot.position.y=visual.elevation+1.5;
    forward.set(Math.cos(visual.headingRad), 0, Math.sin(visual.headingRad));
    if (visual.grounded) {
      if (visual.elevation > drivingHeight(doc.terrain, visual.x, visual.y) + .5) normal.set(0, 1, 0);
      forward.addScaledVector(normal, -forward.dot(normal)).normalize();
    } else {
      const pitch = THREE.MathUtils.clamp(Math.atan2(car.vz, Math.hypot(car.vx, car.vy)), -.6, .6);
      forward.multiplyScalar(Math.cos(pitch)); forward.y = Math.sin(pitch);
      side.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize(); normal.crossVectors(side, forward).normalize();
    }
    side.crossVectors(forward, normal).normalize();
    basis.makeBasis(forward, normal, side); carRoot.quaternion.setFromRotationMatrix(basis);
    const lateral = -Math.sin(visual.headingRad) * visual.vx + Math.cos(visual.headingRad) * visual.vy;
    carMesh.rotation.x = reduced.matches ? 0 : THREE.MathUtils.clamp(lateral * .001, -.07, .07);
    animateObject(carMesh, worldTime.value, !reduced.matches, wheelDistance, reduced.matches ? 0 : landingBounce);
    for (const prop of viewCar.props) {
      const group = propMeshes.get(prop.id)!;
      group.position.copy(worldPosition(doc, prop.x, prop.y, 1.5));
      const placement=objectPlacement(doc,group.userData.sceneObject,prop.x,prop.y);
      group.position.y=(prop.elevation??placement.base)+1.5;group.quaternion.copy(placement.rotation);
      if(sportBalls.has(prop.id)){
        rollSportBall(group,prop,objectRadius(group.userData.sceneObject),mode==='playing' && !reduced.matches);
      }
      if (mode === "playing") group.userData.distance = (group.userData.distance ?? 0) + Math.hypot(prop.vx, prop.vy) * dt;
      if (debug.visible) {
        const line = colliderLines.get(prop.id)!;
        const vertices = line.geometry.getAttribute("position");
        const object = doc.objects.find((o) => o.id === prop.id)!;
        for (let i = 0; i < vertices.count; i++) {
          const angle = i / 48 * Math.PI * 2, r = objectRadius(object);
          const p = worldPosition(doc, prop.x + Math.cos(angle) * r, prop.y + Math.sin(angle) * r, 3);
          vertices.setXYZ(i, p.x, p.y, p.z);
        }
        vertices.needsUpdate = true;
      }
    }
    const activeParking=parking.syncActive(car,releaseParked);
    if(activeParking && !actorMeshes.has(activeParking.userData.sceneObject.id)){
      const object=activeParking.userData.sceneObject;actorMeshes.set(object.id,activeParking);rideZooms.set(object.id,rideCameraZoom(doc.player,object));objects.push(activeParking);
    }
    poses=actorPoses(doc,viewCar.timeS,viewCar);
    const walkingPresentation=import.meta.env.DEV ? [] as {id:string;x:number;y:number;rawX:number;rawY:number;speed:number;clock?:number}[] : undefined;
    for(const rawPose of poses){
      if(teamResidents.has(rawPose.id))continue;
      const journey=workJourneyForActor(car,doc,rawPose.id);
      const pose=repairViews.sample(rawPose,!!journey && journey.phase!=='rest',car.economy?.atS??car.timeS,viewCar.timeS,snap || reduced.matches);
      if(journey)walkingPresentation?.push({id:pose.id,x:pose.x,y:pose.y,rawX:rawPose.x,rawY:rawPose.y,speed:pose.speed,clock:pose.animationTimeS});
      const group=actorMeshes.get(pose.id)!;
      group.position.copy(worldPosition(doc,pose.x,pose.y));group.position.y=pose.elevation+(pose.seatHeight===undefined ? group.userData.groundLift??1.5 : .2);
      const spec=group.userData.sceneObject.spec;
      group.quaternion.copy(actorOrientation(doc,pose,characters.has(group),spec?.grounding==='surface'));
      group.userData.distance=pose.travelled;
      group.userData.moving=pose.speed>0;
      group.userData.speed=pose.speed;
      group.userData.seatHeight=pose.seatHeight;
      group.userData.npcActive=pose.activity ? pose.activity==='perform' || pose.activity==='patrol' && pose.speed>0 : undefined;
      group.userData.npcTime=pose.animationTimeS;
    }
    const occupied=occupiedObject(car,world);
    const court=activeSport(car,doc),sportGame=court && car.sports.find(g=>g.id===court.sport.id)!;
    sportVisuals.update(viewCar,court);
    sportButton.style.setProperty('--power',String(sportGame ? sportCharge(car,sportGame) : 0));
    const standingRide=["skateboard","scooter"].includes(controlOf(occupied?.spec)??"");
    avatar.visible=!!occupied && !standingRide;
    if(occupied && !standingRide){
      const group=actorMeshes.get(occupied.id)!;if(avatar.parent!==group)group.add(avatar);
      const spec=group.userData.sceneObject.spec;
      avatar.position.fromArray(spec.rideable.seat);
      avatar.scale.setScalar(measuredScale(traveler)/group.scale.x);
    }
    walker.visible=car.control.kind==="foot" || standingRide;
    if(standingRide){
      const group=actorMeshes.get(occupied!.id)!;if(walker.parent!==group)group.add(walker);
      const spec=group.userData.sceneObject.spec;
      walker.position.fromArray(spec.rideable.seat);walker.rotation.set(0,0,0);
      walker.scale.setScalar(measuredScale(walkerSpec)/group.scale.x);walkerAnimation.reset();
    }else if(walker.visible){
      if(walker.parent!==scene)scene.add(walker);walker.scale.setScalar(measuredScale(walkerSpec));
      walker.position.copy(position);walker.position.y=viewCar.elevation+.2;walker.rotation.set(0,-viewCar.headingRad,0);
      const swimming=isSwimming(car,world),water=swimming && waterAt(doc.terrain,car.x,car.y,car.elevation);
      const speed=Math.hypot(car.vx-(water ? water.flow.x : 0),car.vy-(water ? water.flow.y : 0));
      const seat=seatedPose(car,doc);
      const eating=car.economy?.shared?.phase==='eat' || car.economy?.events.some(e=>e.kind==='eat' && accountOwners.get(e.account)==='player' && car.timeS-e.atS<1.4);
      walkerAnimation.update({ground:sampleFoot,travel:{x:walker.position.x,y:walker.position.y,z:walker.position.z,heading:viewCar.headingRad},eating,sittingHeight:seat ? seat.hipHeight/walker.scale.x : undefined,speed,swimming,grounded:car.grounded,verticalSpeed:car.vz,time:viewCar.timeS,enabled:!reduced.matches,
        striking:doc.strike && car.control.kind==='foot' ? (viewCar.timeS-(car.strikeReadyAtS??0)+doc.strike.cooldownS)/Math.min(.3,doc.strike.cooldownS*.7) : undefined,
        working:!!car.economy?.accounts.find(a=>accountOwners.get(a.id)==='player')?.work || car.economy?.accounts.find(a=>accountOwners.get(a.id)==='player')?.repair?.phase==='work',
        sport:court && sportGame ? {kind:court.sport.kind,possessed:sportGame.possessed,charging:sportGame.chargeStartS!==null,shotAge:sportGame.shots ? car.timeS-sportGame.shotAtS : Infinity,...(sportGame.match?.playerAction ? {action:{kind:sportGame.match.playerAction.kind,age:sportGame.match.elapsedS-sportGame.match.playerAction.atS}} : {})} : undefined},mode==='playing' ? dt : 0);
    }
    for (const object of objects) {
      const spec=object.userData.sceneObject;
      const character=characters.get(object);
      if(character){const account=car.economy?.accounts.find(a=>accountOwners.get(a.id)===spec?.id),working=!!account?.work || account?.repair?.phase==='work';character.update({ground:sampleFoot,travel:{x:object.position.x,y:object.position.y,z:object.position.z,heading:-object.rotation.y},speed:object.userData.npcActive===false ? 0 : object.userData.speed??0,swimming:false,grounded:true,verticalSpeed:0,time:working ? car.timeS : object.userData.npcTime??worldTime.value,enabled:!reduced.matches,sittingHeight:object.userData.seatHeight===undefined ? undefined : object.userData.seatHeight/object.scale.x,working,eating:account?.meal?.phase==='eat' || car.economy?.shared?.partner===account?.id && car.economy?.shared?.phase==='eat'},mode==='playing' ? dt : 0);continue;}
      animateObject(object, object.userData.npcTime??worldTime.value, !reduced.matches && (object.userData.npcActive??(!object.userData.ambient || object.userData.moving)), object.userData.distance ?? 0,0,
        spec ? Math.hypot(object.position.x-position.x,object.position.z-position.z)/spec.scale : Infinity);
    }
    if(!walker.visible)walkerAnimation.reset();
    const sportBall=court && viewCar.props.find(p=>p.id===court.sport.ballId)!,sportsFrame=court && sportBall && sportCameraFrame(viewCar,sportGame?.event==='out' ? viewCar : sportBall,court.sport.kind,sportGame?.match?.status==='playing' ? attackTarget(court) : court.sport.kind==='basketball' && sportGame?.possessed ? closestSportTarget(court,sportGame.aim?.[0]??viewCar.x,sportGame.aim?.[1]??viewCar.y) : undefined,!!court.sport.match);
    const inspection=import.meta.env.DEV ? captureFocus??(captureActor ? actorMeshes.get(captureActor)?.position : undefined) : undefined;
    const framing=inspection ?? (sportsFrame ? worldPosition(doc,sportsFrame.x,sportsFrame.y) : position);
    const target = { x: framing.x, y: (inspection ? inspection.y : car.control.kind!=="car" ? viewCar.elevation : drivingHeight(doc.terrain, viewCar.x, viewCar.y)) + 12, z: framing.z };
    if (mode === "playing" || snap) {
      follow = followCamera(follow, target, dt, snap || reduced.matches);
      if(!court){follow.x = target.x; follow.z = target.z;}
      const zoom = sportsFrame ? sportsFrame.zoom : car.control.kind==="foot" ? car.seated ? 3.6 : 2.25 : occupied ? rideZooms.get(occupied.id)! : DEFAULT_CAMERA_ZOOM;
      const nextZoom=followCameraZoom(camera.zoom, zoom * manualZoom.factor, dt, snap || reduced.matches);
      if(camera.zoom!==nextZoom){camera.zoom=nextZoom;camera.updateProjectionMatrix();}
    }
    snap = false;
    if (mode === "playing") cameraAngle += (viewAngle - cameraAngle) * (reduced.matches ? 1 : 1 - Math.exp(-dt * 8));
    const cameraPoint = cameraPosition(follow, cameraAngle);
    camera.position.set(cameraPoint.x, cameraPoint.y, cameraPoint.z);
    camera.lookAt(follow.x, follow.y, follow.z);
    terrainPlayer.value.copy(position).y += 7;
    terrainView.value.set(cameraPoint.x-follow.x,cameraPoint.y-follow.y,cameraPoint.z-follow.z).normalize();
    (scene.fog as THREE.Fog).near = camera.position.distanceTo(new THREE.Vector3(follow.x, follow.y, follow.z)) + 650;
    (scene.fog as THREE.Fog).far = (scene.fog as THREE.Fog).near + 1700;
    camera.updateMatrixWorld(); scene.updateMatrixWorld();
    const settleView=reduced.matches || !!profile && dt===0;
    occlusion.update(camera, position.clone().add(new THREE.Vector3(0, playerHeight(doc) / 2, 0)), dt, settleView,occupied ? actorMeshes.get(occupied.id) : undefined);
    daylight.update(captureTime??(worldTime.value+hourOffset),car.broken);
    const sceneryPlayer=position.clone().add(new THREE.Vector3(0,7,0));
    parking.update(car,scenery,camera,sceneryPlayer,dt,reduced.matches);
    scenery.update(camera,daylight.direction,sceneryPlayer,{x:car.vx,y:car.vy},dt,settleView,hiddenScenery(),growthScales(doc,car.growing));
    sunShadows.update(camera,daylight.direction,DEFAULT_CAMERA_ZOOM * manualZoom.factor);
    populations.update(viewCar,camera,sun,mode==='playing' ? dt : 0,reduced.matches);
    sportsTeams.update(viewCar,camera,sun,reduced.matches);
    hudTime += dt;
    if (hudTime > .1) {
      hudTime = 0;
      const sportsStatus=court && sportGame?.match ? `${court.sport.kind==='football' ? 'Football' : 'Basketball'} · 6v6` : court && sportGame ? `${court.sport.kind==='football' ? 'Football' : 'Basketball'} · ${sportGame.score} ${court.sport.kind==='football' ? sportGame.score===1 ? 'goal' : 'goals' : 'pts'} · ${sportGame.event==='goal' ? 'Goal!' : sportGame.event==='basket' ? 'Basket!' : sportGame.event==='out' ? 'Out · ball returning' : !sportGame.possessed ? 'Move to the ball' : court.sport.kind==='football' ? 'Ready to kick' : 'Ready to shoot'}` : '';
      const surfaceText = sportsStatus || (occupied ? occupied.labelText : car.control.kind==='foot' ? car.seated ? 'Seated' : isSwimming(car,world) ? 'Swimming' : 'On foot' : !car.grounded ? 'Airborne' : car.timeS < boostUntil ? 'Boost' : car.surface==='ice' ? 'Ice' : 'Driving');
      if(surface.textContent!==surfaceText)surface.textContent=surfaceText;
      setIcon(statusIcon,court ? 'sport' : car.control.kind==='foot' ? isSwimming(car,world) ? 'swim' : car.seated ? 'seat' : 'walking' : car.control.kind==='passenger' ? 'seat' : controlIcon(occupied ? controlOf(occupied.spec) : undefined));
      surface.dataset.effect = car.surface === "ice" ? "ice" : "boost";
      const match=sportGame?.match,teamVisible=mode==='playing' && !!court?.sport.match && !!match;
      matchButton.hidden=passButton.hidden=matchScore.hidden=!teamVisible;
      if(teamVisible){
        const action=teamPassAction(car,sportGame!,court!);passLabel.textContent=action.kind==='call' ? 'Call' : action.kind==='tackle' ? 'Tackle' : 'Pass';passButton.disabled=!action.ready;passButton.title=action.reason;passButton.setAttribute('aria-label',`${passLabel.textContent} (K): ${action.reason}`);
        matchLabel.textContent=match.status==='playing' ? 'Rest' : match.status==='finished' ? 'New match' : match.status==='ready' ? 'Join 6v6' : 'Resume';matchButton.setAttribute('aria-label',`${matchLabel.textContent} (N)`);
        const remaining=Math.max(0,Math.ceil(court!.sport.match!.durationS-match.elapsedS));matchClock.textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
        matchScore.setAttribute('aria-label',`Six-a-side ${court!.sport.kind}`);matchState.textContent=match.status==='finished' ? match.home===match.away ? 'Draw' : match.home>match.away ? 'Home wins' : 'Away wins' : match.status==='playing' ? sportGame!.event==='goal' ? 'Goal!' : sportGame!.event==='basket' ? 'Basket!' : sportGame!.event==='out' ? 'Ball returning' : '6v6 · Playing' : match.status==='ready' ? '6v6 · Ready' : '6v6 · Resting';
        const score=`Home ${match.home} : ${match.away} Away`;if(matchScoreline.textContent!==score)matchScoreline.textContent=score;
      }
      sportButton.hidden=mode!=='playing' || !court;
      sportButton.disabled=!sportGame?.possessed || !!sportGame.resetAtS;
      sportButton.dataset.kind=court?.sport.kind??'';
      const power=sportGame ? sportCharge(car,sportGame) : 0;
      sportLabel.textContent=!sportGame?.possessed ? 'Get ball' : court?.sport.kind==='football' ? 'Kick' : 'Shoot';
      sportButton.setAttribute('aria-label',`${court?.sport.kind==='football' ? 'Kick' : 'Shoot'}: hold J or this button, release for power${court?.sport.kind==='basketball' ? '. Release at the gold mark' : ''}`);
      if(import.meta.env.DEV && car.population)container.dataset.population=JSON.stringify({count:populations.count,moving:car.population.members.filter(m=>m.speed>0).length,fleeing:car.population.members.filter(m=>m.mode==='flee').length,time:car.timeS,sample:doc.objects.filter(o=>o.ambient).map((o,i)=>({id:o.id,...car.population!.members[i]!})).sort((a,b)=>Math.hypot(a.x-car.x,a.y-car.y)-Math.hypot(b.x-car.x,b.y-car.y)).slice(0,6)});
      container.dataset.sport=JSON.stringify({active:court?.sport.id??null,possessed:sportGame?.possessed??false,power,games:car.sports,balls:doc.sports.map(s=>car.props.find(p=>p.id===s.ballId))});
      const hit=mode==='playing' ? strikeTarget(car,world) : undefined;
      strikeButton.hidden=!hit;strikeButton.disabled=car.timeS<(car.strikeReadyAtS??0);
      strikeButton.title=hit ? `Hit ${hit.label} (K)` : 'Hit a reachable prop (K)';strikeButton.setAttribute('aria-label',strikeButton.title);
      if(import.meta.env.DEV)container.dataset.strike=JSON.stringify({target:hit?.id??null,ready:!!hit && !strikeButton.disabled,readyAtS:car.strikeReadyAtS,timeS:car.timeS});
      const carControl=isCarControl(car,world),boostActive=car.timeS<car.carBoost.activeUntilS,boostWait=Math.max(0,car.carBoost.readyAtS-car.timeS);
      const boostBlocked=!car.grounded || car.surface==='water' || car.vx*Math.cos(car.headingRad)+car.vy*Math.sin(car.headingRad)<-1 || keys.has('KeyS') || keys.has('ArrowDown');
      boostButton.hidden=mode!=='playing' || !carControl;
      boostButton.disabled=boostWait>0 || boostBlocked;
      boostButton.dataset.active=String(boostActive);
      boostButton.style.setProperty('--charge',String(boostActive ? 1 : Math.max(0,1-boostWait/CAR_BOOST.rechargeS)));
      boostLabel.textContent=boostActive ? 'Boosting' : boostWait>0 ? `${Math.ceil(boostWait)}s` : 'Boost';
      boostButton.setAttribute('aria-label',boostActive ? 'Boost active' : boostWait>0 ? `Boost recharging, ${Math.ceil(boostWait)} seconds` : boostBlocked ? 'Boost unavailable: drive forward on dry ground' : 'Boost (Shift)');
      container.dataset.boost=JSON.stringify({active:boostActive,ready:carControl && boostWait===0 && !boostBlocked,remaining:boostWait,timeS:car.timeS});
      // DOM diagnostics let browser checks observe real simulation and camera state.
      container.dataset.car = [car.x, car.y, position.y].map((v) => v.toFixed(1)).join(",");
      container.dataset.daylight=JSON.stringify({hour:daylight.hour,night:nightFactor.value,direction:daylight.direction.toArray()});
      container.dataset.camera = [follow.x, follow.y, follow.z].map((v) => v.toFixed(1)).join(",");
      container.dataset.mode = mode;
      container.dataset.particles = String(particles.activeCount);
      container.dataset.grounded = String(car.grounded);
      if(import.meta.env.DEV)container.dataset.movement=JSON.stringify({swimming:isSwimming(car,world),vz:car.vz,pitch:car.pitch,bank:car.bank});
      container.dataset.speed = Math.hypot(car.vx, car.vy).toFixed(1);
      container.dataset.flight = JSON.stringify(flight);
      container.dataset.heading = car.headingRad.toFixed(3);
      container.dataset.fps = (1000 / frameMs).toFixed(1);
      container.dataset.occluders = String(occlusion.obscuredCount + scenery.obscuredCount);
      container.dataset.view = camera.quaternion.toArray().map(v => v.toFixed(5)).join(",");
      container.dataset.zoom = camera.zoom.toFixed(3);
      if(import.meta.env.DEV)container.dataset.shadow=JSON.stringify({span:[sun.shadow.camera.right*2,sun.shadow.camera.top*2],map:sun.shadow.mapSize.toArray(),direction:sun.position.clone().sub(sun.target.position).normalize().toArray()});
      if(import.meta.env.DEV)container.dataset.presentation=JSON.stringify({time:car.timeS,renderTime:viewCar.timeS,alpha:stepper.alpha,player:{x:viewCar.x,y:viewCar.y,elevation:viewCar.elevation},walkers:walkingPresentation,balls:doc.sports.map(s=>{const game=viewCar.sports.find(g=>g.id===s.id)!,ball=viewCar.props.find(p=>p.id===s.ballId)!,owner=game.match?.owner,member=game.match?.members.find(m=>m.id===owner);return {id:ball.id,x:ball.x,y:ball.y,owner,member:member ? teamPose(game.match!,member) : undefined};})});
      container.dataset.render = JSON.stringify({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries });
      const seat=nearbySeat(car,world),canStand=car.seated ? !standUp(car,world).seated : false;
      const foot=car.control.kind==="foot",nearby=foot ? nearbyRide(car,world) : undefined,exit=foot ? undefined : exitPosition(car,world);
      const person=mode==='playing' ? nearbyNpc(car,doc) : undefined,reply=mode==='playing' ? npcSpeech(car,doc) : undefined;
      talkButton.hidden=!person;talkButton.title=`Talk to ${person?.labelText??'neighbor'} (T)`;talkButton.setAttribute('aria-label',`Talk to ${person?.labelText??'neighbor'} (T)`);
      speech.hidden=!reply;
      const nextSpeech=reply ? JSON.stringify(reply) : '';
      if(nextSpeech!==speechKey){speaker.textContent=reply?.label??'';replyText.textContent=reply?.text??'';speechKey=nextSpeech;}
      if(import.meta.env.DEV)container.dataset.speech=nextSpeech;
      interact.hidden=mode!=="playing" || foot && !nearby && !seat && !car.seated;
      interact.disabled=car.seated ? !canStand : !foot && !exit;
      const nearbyControl=nearby?.object && controlOf(nearby.object.spec);
      interactLabel.textContent=car.seated ? 'Stand' : !foot ? 'Exit' : seat ? 'Sit' : nearbyControl==='plane' ? 'Fly' : nearbyControl==='boat' ? 'Sail' : nearbyControl==='bicycle' || nearbyControl==='scooter' || nearbyControl==='skateboard' || nearby?.object && !nearbyControl ? 'Ride' : 'Drive';
      setIcon(interactIcon,car.seated || !foot ? 'exit' : seat ? 'seat' : controlIcon(nearbyControl));
      interact.title=car.seated ? canStand ? 'Stand up (F)' : 'Waiting for a clear exit' : seat ? 'Sit down (F)' : foot ? `${interactLabel.textContent} ${nearby?.labelText??''} (F)` : exit ? 'Exit vehicle (F)' : !car.grounded ? 'Land to exit' : 'Move to a clear exit';
      interact.setAttribute('aria-label',interact.title);
      container.dataset.riding=occupied?.id??"";
      container.dataset.control=JSON.stringify(car.control);
      container.dataset.seated=car.seated ? JSON.stringify(car.seated) : "";
      container.dataset.avatar=standingRide ? "standing" : walker.visible ? isSwimming(car,world) ? "swimming" : "walking" : occupied ? "seated" : "in-car";
      container.dataset.vehicles=JSON.stringify(car.vehicles);
      container.dataset.actors=JSON.stringify(poses.map(p=>({id:p.id,x:p.x,y:p.y,elevation:p.elevation})));
      if(import.meta.env.DEV)container.dataset.npcs=JSON.stringify(poses.filter(p=>p.stateId).map(p=>({id:p.id,state:p.stateId,action:p.activity,x:p.x,y:p.y,heading:p.headingRad,animationTime:p.animationTimeS,known:car.npcs.find(n=>n.id===p.id)?.known})));
      container.dataset.growing=JSON.stringify((car.growing??[]).map(p=>({...p,scale:growthScale(doc,car,p.objectId)})));
      container.dataset.destruction=JSON.stringify({broken:car.broken,zones:car.brokenZones,debris:car.debris.length,renderer:debris.stats,toppling:car.debris.filter(p=>p.topple).map(p=>({id:p.objectId,angle:p.topple!.angle,settled:p.settled})),props:car.props.filter(p=>p.elevation!==undefined).map(p=>({id:p.id,x:p.x,y:p.y,elevation:p.elevation,vz:p.vz}))});
    }
    if (hudTime === 0) navigation.update(car, cameraAngle);
    const draw=()=>{
      commerce.update(car,mode==='playing');
      if(import.meta.env.DEV && car.economy)container.dataset.economy=JSON.stringify(car.economy);
      if(saves && (saveDirty || car.timeS-saveAt>=10))saveNow();
      const first=document.body.dataset.loading!=="ready",renderStart=first ? performance.now() : 0;
      renderer.info.reset();profile?.beforeRender();composer.render();profile?.end();capture?.end();
      if(first)loading.ready(performance.now()-renderStart);
      if(import.meta.env.DEV){container.dataset.streaming=JSON.stringify(scenery.stats);container.dataset.parking=JSON.stringify(parking.stats);const revision=`${scenery.stats.loaded},${scenery.stats.unloaded},${car.vehicles.length},${parking.stats.active},${debris.stats.templates},${debris.stats.pieces},${debris.stats.cachedFragments}`;if(revision!==memoryRevision){memoryRevision=revision;container.dataset.memory=JSON.stringify(geometryMemory(scene,...debris.cachedRoots));}}
    };
    if(streamState() && shadersReady())draw();else {pendingDraw=draw;profile?.hold();}
  };
  await loading.stage("Loading the first neighbourhood");
  if(import.meta.env.DEV && params.has('test-paused'))setMode('paused');
  frame();
  if(import.meta.env.DEV)container.dataset.memory=JSON.stringify(geometryMemory(scene,...debris.cachedRoots));
  renderer.setAnimationLoop(frame);
}
