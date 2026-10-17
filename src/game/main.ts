import {gameSave} from './save';
import {saveTools} from './save-tools';
import {nearbyNpc,npcSpeech} from '../sim/npcs';
import {AmbientPopulation} from './ambient-population';
import {CharacterAnimator} from './character-animation';
import {nightFactor} from "./shaders";
import {activeSport,closestSportTarget,sportCharge,cancelSportAction} from '../sim/sports';
import {SportsVisuals,poseSportBall} from './sports';
import {WorldDaylight} from "./daylight";
import {buildFlocks} from "./flocks";
import {SunShadows} from "./sun";
import {mediaCapture} from "./media-capture";
import {renderProfile} from "./render-profile";
import {freezeStatic} from "./batching";
import {vehicleReviewStart,drivingReviewStart,npcReviewStart,movementReviewStart,populationReviewStart} from "./review-start";
import { measuredScale, playerRadius, playerHeight } from "../scene/measure";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { buildMaskForScene } from "../scene/fixture";
import type {Scene} from "../scene/schema";
import type {Loading} from "./loading";
import { drivingHeight,waterAt } from "../scene/terrain";
import { archetypeOf, objectRadius } from "../sim/archetypes";
import { buildPaperMask } from "../sim/mask";
import { CAR_BOOST, isCarControl, createCarAtSpawn, FixedStepper, resetCar, type World } from "../sim/car";
import { MAX_FLIGHT_CLEARANCE,isSwimming,nearbyRide,toggleRide,stepInteractive,occupiedObject,exitPosition } from "../sim/interaction";
import { actorPoses } from "../sim/actors";
import {isActor} from '../scene/agents';
import { interactiveWorld } from "../scene/interactive-world";
import { buildRoutes } from "./routes";
import { compactObject } from "./compact-object";
import { worldTime, worldMotion, terrainPlayer, terrainView, worldGradeShader } from "./shaders";
import { animateObject, buildObject, buildPlayer,MAX_SUSPENSION_COMPRESSION } from "./world3d";
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
import type {WorldWorkerClient} from './world-worker-client';
import { createWorldMap } from "./navigation";
import {geometryMemory} from './geometry-memory';

const container = document.querySelector<HTMLElement>("#game")!;
const pauseButton = document.querySelector<HTMLButtonElement>("#pause")!;
const pauseMenu = document.querySelector<HTMLDialogElement>("#pause-menu")!;
const surface = document.querySelector<HTMLElement>("#surface")!;
const interact=document.querySelector<HTMLButtonElement>("#interact")!;
const talkButton=document.querySelector<HTMLButtonElement>("#talk")!,speech=document.querySelector<HTMLElement>("#npc-speech")!,speaker=document.querySelector<HTMLElement>("#npc-speaker")!,replyText=document.querySelector<HTMLElement>("#npc-reply")!;
const boostButton=document.querySelector<HTMLButtonElement>("#boost")!;
const boostLabel=document.querySelector<HTMLElement>("#boost-label")!;
const sportButton=document.querySelector<HTMLButtonElement>('#sport-action')!;
const sportLabel=document.querySelector<HTMLElement>('#sport-action-label')!;
const saveButton=document.querySelector<HTMLButtonElement>("#save-game")!,saveStatus=document.querySelector<HTMLElement>("#save-status")!,saveError=document.querySelector<HTMLElement>("#save-error")!;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

export async function start(doc:Scene,loading:Loading,worker:WorldWorkerClient):Promise<void> {
  await loading.stage("Preparing driving and walking");
  const carRadius = playerRadius(doc);
  const roadMask = buildMaskForScene(doc);
  const world: World = { scene: doc, roadMask,saveCompatibility:worker.saveCompatibility,
    driveMask: buildPaperMask(doc.canonical.width, doc.canonical.height), carRadius };
  let car = createCarAtSpawn(doc);
  if(import.meta.env.DEV)car=vehicleReviewStart(car,world,new URLSearchParams(location.search).get("test-vehicle"));
  if(import.meta.env.DEV)car=drivingReviewStart(car,world,new URLSearchParams(location.search).get("test-driving"));
  if(import.meta.env.DEV)car=npcReviewStart(car,world,new URLSearchParams(location.search).get("test-npc"));
  if(import.meta.env.DEV)car=movementReviewStart(car,world,new URLSearchParams(location.search).get("test-movement"));
  if(import.meta.env.DEV)car=populationReviewStart(car,world,new URLSearchParams(location.search).get("test-population"));
  const params=new URLSearchParams(location.search),review=import.meta.env.DEV && [...params.keys()].some(key=>key.startsWith('test-') || key==='capture' || key==='profile');
  const reviewSave=import.meta.env.DEV && params.has('test-save') && !params.has('capture') && !params.has('profile');
  const saves=!review || reviewSave ? gameSave(world,()=>localStorage,reviewSave ? 'muse-dream.review-save' : 'muse-dream.save') : undefined;
  if(saves?.restored){car=saves.restored.state;worldTime.value=saves.restored.worldTime;}
  let saveAt=car.timeS,saveDirty=false;
  const saveIdentity={sourceHash:doc.sourceHash,compatibilityHash:world.saveCompatibility};
  saveButton.hidden=!saves;saveButton.textContent=saves?.blocked ? "Save current session" : "Save now";saveStatus.textContent=saves?.status??'Review session: saves disabled.';
  const saveNow=(replace=false,state=car,time=worldTime.value)=>{
    if(!saves)return false;const start=performance.now(),saved=saves.write(state,time,replace),ms=performance.now()-start;saveAt=car.timeS;saveDirty=false;saveStatus.textContent=saves.status;saveButton.textContent=saves.blocked ? "Save current session" : "Save now";saveError.hidden=saved;const warning=saved ? "" : saves.status;if(saveError.textContent!==warning)saveError.textContent=warning;
    container.dataset.save=JSON.stringify({...saveIdentity,restored:!!saves.restored,saved,ms,characters:saves.characters,timeS:state.timeS,known:state.npcs.filter(n=>n.known).map(n=>n.id),review:reviewSave,status:saves.status});return saved;
  };
  container.dataset.save=JSON.stringify({...saveIdentity,restored:!!saves?.restored,enabled:!!saves,review:reviewSave,status:saveStatus.textContent});
  saveButton.addEventListener('click',()=>saveNow(saves?.blocked??false));addEventListener('pagehide',()=>saveNow());
  if(saves && !saves.restored && saves.status.startsWith("Could not")){saveError.hidden=false;saveError.textContent=saves.status;}
  const stepper = new FixedStepper();
  const keys = new Set<string>();
  let boostRequested=false,talkRequested=false;
  let speechKey="";
  let shootButtonHeld=false,shootPressed=false,shootReleased=false;
  let pointerAim:{x:number;y:number}|undefined;
  const clearShot=()=>{shootButtonHeld=shootPressed=shootReleased=false;pointerAim=undefined;car=cancelSportAction(car);};
  let mode: "playing" | "paused" = "playing";
  let pendingDraw:(()=>void)|undefined;

  await loading.stage("Starting the renderer");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const profileDpr=import.meta.env.DEV && new URLSearchParams(location.search).has('profile') ? Number(new URLSearchParams(location.search).get('profile-dpr')) : 0;
  renderer.setPixelRatio(profileDpr>=1 && profileDpr<=1.5 ? profileDpr : Math.min(devicePixelRatio, 1.5));
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-label", "WASD walks, swims or drives. On sports grounds, approach the ball, hold J or the shot button, then release to kick or shoot. Shift or the Boost button gives a car burst. F enters or exits a vehicle. T talks to nearby people. Space jumps on foot or on a bicycle, skateboard or scooter, and hops a boat. Shift runs or swims faster. In an aircraft Space climbs and Shift descends. Pinch or scroll to zoom. Q and E rotate the view. P pauses; R returns to the start.");
  container.append(renderer.domElement);
  const manualZoom = cameraZoomInput(renderer.domElement, () => mode === "playing");
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
  const routes=buildRoutes(doc);scene.add(routes);

  const flocks=buildFlocks(doc);scene.add(flocks);
  const scenery=new WorldStreaming(doc,region=>worker.build(region),id=>landscape.waters.find(w=>w.water.id===id)!.material);scene.add(scenery.group);
  const streamStatus=document.createElement('output');streamStatus.id='world-stream-status';streamStatus.setAttribute('role','status');streamStatus.textContent='Loading nearby world';streamStatus.hidden=true;container.append(streamStatus);
  let streamWaitStarted=0;
  const streamState=()=>{
    if(scenery.error){loading.fail(scenery.error);renderer.setAnimationLoop(null);return false;}
    if(!scenery.ready){streamWaitStarted ||= performance.now();streamStatus.hidden=performance.now()-streamWaitStarted<200;container.setAttribute('aria-busy','true');}
    else{streamWaitStarted=0;streamStatus.hidden=true;container.setAttribute('aria-busy','false');}
    if(import.meta.env.DEV)container.dataset.streaming=JSON.stringify(scenery.stats);
    return scenery.ready;
  };
  addEventListener('pagehide',event=>{if(!event.persisted)scenery.dispose();});
  await loading.stage("Assembling people and wildlife");
  const populations=new AmbientPopulation(doc);scene.add(populations.group);
  const propMeshes = new Map<string, THREE.Group>();
  const actorMeshes=new Map<string,THREE.Group>();
  const rideZooms=new Map<string,number>();
  const breakMeshes=new Map<string,THREE.Group>();
  const objects: THREE.Group[] = [];
  const characters=new Map<THREE.Group,CharacterAnimator>();
  await loading.stage("Preparing vehicles and interactive objects");
  for (const object of doc.objects) {
    if (!isActor(object) && !isReactive(object.spec) && archetypeOf(object).interaction !== "knockable" && !hasAnimatedJoints(object.spec)) continue;
    const destructible=isReactive(object.spec) && impactOf(object.spec)?.kind!=="bounce";
    const group = destructible ? buildDamageObject(object) : compactObject(buildObject(object));
    group.position.copy(worldPosition(doc, object.x, object.y, 1.5));
    const placement=objectPlacement(doc,object);
    group.position.y=placement.base+1.5;group.quaternion.copy(placement.rotation);
    group.userData.sceneObject=object;
    group.userData.ambient=!!object.route && ["ambient","walk"].includes(doc.routes.find(r=>r.id===object.route!.id)?.kind??"");
    scene.add(group);
    objects.push(group);
    if(object.spec && 'dslVersion' in object.spec && object.spec.dslVersion===2 && object.spec.joints?.some(j=>j.bone))characters.set(group,new CharacterAnimator(group,object.spec));
    if(archetypeOf(object).interaction === "knockable") propMeshes.set(object.id, group);
    if(isActor(object)){actorMeshes.set(object.id,group);rideZooms.set(object.id,rideCameraZoom(doc.player,object));}
    if(destructible)breakMeshes.set(object.id,group);
  }
  const debris=new WorldDebris(doc);scene.add(debris.group);
  const traveler={...interactiveWorld.assemblies.find(a=>a.displayName==="Traveler")!,voxelSize:doc.voxelWorld?.objectCell};
  const avatar=compactObject(buildObject({id:"traveler",kind:"custom",labelText:"Traveler",x:0,y:0,scale:measuredScale(traveler),spec:traveler}));avatar.visible=false;objects.push(avatar);
  const walkerSpec={...interactiveWorld.assemblies.find(a=>a.displayName==="Explorer")!,voxelSize:doc.voxelWorld?.objectCell};
  const walker=compactObject(buildObject({id:"explorer",kind:"custom",labelText:"Explorer",x:0,y:0,scale:measuredScale(walkerSpec),spec:walkerSpec}));
  walker.visible=false;scene.add(walker);
  const walkerAnimation=new CharacterAnimator(walker,walkerSpec);
  const carRoot = new THREE.Group(), carMesh = compactObject(buildPlayer(doc));
  carRoot.add(carMesh); scene.add(carRoot);
  const particles = new WorldParticles(doc); scene.add(particles.mesh);
  const sportVisuals=new SportsVisuals(doc);scene.add(sportVisuals.group);
  const sportBalls=new Set(doc.sports.map(s=>s.ballId));
  const occlusion = new SceneryOcclusion(objects.filter(object=>object!==avatar && !sportBalls.has(object.userData.sceneObject?.id)));
  const updateMap = createWorldMap(document.querySelector<HTMLCanvasElement>("#world-map")!, doc);

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
    car=snapshot.state;worldTime.value=snapshot.worldTime;saveDirty=false;saveAt=car.timeS;resetPresentation();saveStatus.textContent='Backup restored on this device.';
  }) : undefined;

  function resetPosition(restartRace = false): void {
    backups?.close();
    pendingDraw=undefined;saveDirty=true;
    car = resetCar(car, doc, restartRace);
    resetPresentation(restartRace);
    if(restartRace){worldTime.value=0;manualZoom.factor=1;}
  }
  function resetPresentation(resetProps=true):void{
    pendingDraw=undefined;
    walkerAnimation.reset();
    clearShot();
    pointerAim=undefined;
    boostRequested=false;talkRequested=false;
    stepper.reset(); particles.clear(); landscape.clear(); snap = true; cameraAngle=viewAngle;
    boostUntil = 0; surface.textContent = "";
    flight = { jumps: 0, landings: 0, maxClearance: 0 }; landingBounce = 0;
    wheelDistance = 0;
    if(resetProps)for (const group of propMeshes.values()) group.userData.distance = 0;
  }

  function setMode(next: typeof mode): void {
    if(next==='playing')backups?.close();
    mode = next; keys.clear(); boostRequested=false;talkRequested=false; pointerAim=undefined; clearShot(); stepper.reset();
    if(next === "paused") cameraAngle=viewAngle;
    if (next === "paused" && !pauseMenu.open) pauseMenu.showModal();
    else if (next === "playing" && pauseMenu.open) pauseMenu.close();
    pauseButton.setAttribute("aria-label", next === "paused" ? "Resume" : "Pause");
    pauseButton.setAttribute("aria-pressed", String(next === "paused"));
    pauseButton.dataset.paused = String(next === "paused");
    if(next==="playing")container.focus({preventScroll:true});
  }
  pauseButton.addEventListener("click", () => setMode(mode === "playing" ? "paused" : "playing"));
  const useRide=()=>{if(mode==="playing"){car=toggleRide(car,world);boostRequested=false;talkRequested=false;clearShot();container.focus({preventScroll:true});}};
  interact.addEventListener("click",useRide);
  talkButton.addEventListener("click",()=>{if(mode==="playing")talkRequested=true;container.focus({preventScroll:true});});
  boostButton.addEventListener('click',()=>{
    if(mode==='playing' && isCarControl(car,world))boostRequested=true;
    container.focus({preventScroll:true});
  });
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
      if(mode==='playing' && e.code==='KeyT')talkRequested=true;
    }
    keys.add(e.code);
    if(!e.repeat && ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))pointerAim=undefined;
  });
  addEventListener("keyup", (e) => {keys.delete(e.code);if(e.code==='KeyJ')shootReleased=true;});
  addEventListener("blur", () => { keys.clear(); boostRequested=false;talkRequested=false;clearShot(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) setMode("paused"); });
  container.dataset.world=JSON.stringify({width:doc.canonical.width,height:doc.canonical.height,objects:doc.objects.length,checkpoints:doc.checkpoints.length,birds:doc.flocks.reduce((n,f)=>n+f.count,0)});
  container.dataset.source="dream-2";
  let previous = performance.now(), hudTime = 0;
  let frameMs = 16.7;
  const profile=import.meta.env.DEV ? renderProfile(renderer,()=>{
    resetPosition(true);car=drivingReviewStart(car,world,new URLSearchParams(location.search).get("test-driving"));worldTime.value=0;
  },(drive,frame)=>{keys.clear();if(drive && frame<300)keys.add("KeyW");}) : undefined;
  let captureTime:number|undefined;
  const capture=import.meta.env.DEV ? mediaCapture(renderer.domElement,{driving:210,boost:210,football:240,basketball:210,switching:240,locomotion:180,swimming:180,daynight:360,flight:300,pedestrians:360,wildlife:360,conversation:240},(clip)=>{
    captureTime=undefined;
    resetPosition(true);worldTime.value=0;setMode("playing");
    characters.forEach(character=>character.reset());
    if(clip==='conversation')car=npcReviewStart(car,world,'vendor');
    if(clip==='pedestrians' || clip==='wildlife')car=populationReviewStart(car,world,clip);
    if(clip==='switching'){const bike=doc.objects.find(o=>o.id==='village_bike')!;car={...car,x:bike.x-40,y:bike.y,headingRad:0,elevation:drivingHeight(doc.terrain,bike.x-40,bike.y)};}
    if(clip==='locomotion' || clip==='swimming')car=movementReviewStart(car,world,clip==='swimming' ? 'swim' : 'walk');
    if(clip==='flight')car=toggleRide(vehicleReviewStart(car,world,'cloudhopper'),world);
    if(clip==='football' || clip==='basketball')car=movementReviewStart(car,world,clip);
  },(clip:string,frame:number)=>{
    keys.clear();
    if(clip==='conversation'){if(frame===25 || frame===125)talkRequested=true;return;}
    if(clip==='pedestrians' || clip==='wildlife')return;
    if(clip==="daynight"){captureTime=frame/359*(doc.daylight?.cycleSeconds??600);return;}
    if(clip==="driving"){if(frame<175)keys.add("KeyW");return;}
    if(clip==='boost'){if(frame<175)keys.add('KeyW');if(frame>=25 && frame<50)keys.add('ShiftLeft');return;}
    if(clip==='football'){if(frame>=20 && frame<48)keys.add('KeyJ');return;}
    if(clip==='basketball'){if(frame>=20 && frame<38)keys.add('KeyJ');return;}
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
  let memoryRevision="";
  const frame=() => {
    if(pendingDraw){if(streamState()){pendingDraw();pendingDraw=undefined;previous=performance.now();}return;}
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
      };
      const steps = stepper.push(dt);
      for (let i = 0; i < steps; i++) {
        const wasGrounded = car.grounded, previousSpeed=Math.hypot(car.vx,car.vy),riding=car.control.kind!=="car";
        saveDirty ||= talkRequested;
        car = stepInteractive(car, {...input,boostPressed:boostRequested,talkPressed:talkRequested,shootPressed,shootReleased}, stepper.stepDt, world);
        shootPressed=shootReleased=false;
        boostRequested=false;talkRequested=false;
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
    for(const [id,group] of breakMeshes)updateDamage(group,id,car);
    debris.update(car,reduced.matches);
    const parked=car.vehicles.find(v=>v.id===null),visual=car.control.kind==="car" ? car : {...car,...(parked??doc.spawn),grounded:true,vz:0,vx:0,vy:0};
    const position = worldPosition(doc, car.x, car.y, 1.5), normal = terrainNormal(doc, visual.x, visual.y);
    position.y = car.elevation + 1.5;
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
    for (const prop of car.props) {
      const group = propMeshes.get(prop.id)!;
      group.position.copy(worldPosition(doc, prop.x, prop.y, 1.5));
      const placement=objectPlacement(doc,group.userData.sceneObject,prop.x,prop.y);
      group.position.y=(prop.elevation??placement.base)+1.5;group.quaternion.copy(placement.rotation);
      if(sportBalls.has(prop.id)){
        const rotation=group.userData.ballRotation??=new THREE.Quaternion(),speed=Math.hypot(prop.vx,prop.vy);
        if(mode==='playing' && !reduced.matches && speed>1)rotation.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-prop.vy,0,prop.vx).normalize(),speed*dt/objectRadius(group.userData.sceneObject)));
        poseSportBall(group,rotation,objectRadius(group.userData.sceneObject));
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
    poses??=actorPoses(doc,car.timeS,car);
    for(const pose of poses){
      const group=actorMeshes.get(pose.id)!;
      group.position.copy(worldPosition(doc,pose.x,pose.y));group.position.y=pose.elevation+(group.userData.ambient || pose.activity && pose.kind==="path" ? .2 : 1.5);
      const spec=group.userData.sceneObject.spec;
      const upright=pose.activity && spec?.grounding!=='surface';
      const normal=!upright && (pose.kind==="rail" || pose.kind==="path") ? terrainNormal(doc,pose.x,pose.y) : new THREE.Vector3(0,1,0);
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-pose.headingRad));
      group.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.bank??0,0,pose.pitch??0)));
      group.userData.distance=pose.travelled;
      group.userData.moving=pose.speed>0;
      group.userData.speed=pose.speed;
      group.userData.npcActive=pose.activity ? pose.activity==='perform' || pose.activity==='patrol' && pose.speed>0 : undefined;
      group.userData.npcTime=pose.animationTimeS;
    }
    const occupied=occupiedObject(car,world);
    const court=activeSport(car,doc),sportGame=court && car.sports.find(g=>g.id===court.sport.id)!;
    sportVisuals.update(car,court);
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
      walker.position.copy(position);walker.position.y=car.elevation+.2;walker.rotation.set(0,-car.headingRad,0);
      const swimming=isSwimming(car,world),water=swimming && waterAt(doc.terrain,car.x,car.y,car.elevation);
      const speed=Math.hypot(car.vx-(water ? water.flow.x : 0),car.vy-(water ? water.flow.y : 0));
      walkerAnimation.update({speed,swimming,grounded:car.grounded,verticalSpeed:car.vz,time:car.timeS,enabled:!reduced.matches,
        sport:court && sportGame ? {kind:court.sport.kind,possessed:sportGame.possessed,charging:sportGame.chargeStartS!==null,shotAge:sportGame.shots ? car.timeS-sportGame.shotAtS : Infinity} : undefined},mode==='playing' ? dt : 0);
    }
    for (const object of objects) {
      const spec=object.userData.sceneObject;
      const character=characters.get(object);
      if(character){character.update({speed:object.userData.npcActive===false ? 0 : object.userData.speed??0,swimming:false,grounded:true,verticalSpeed:0,time:object.userData.npcTime??worldTime.value,enabled:!reduced.matches},mode==='playing' ? dt : 0);continue;}
      animateObject(object, object.userData.npcTime??worldTime.value, !reduced.matches && (object.userData.npcActive??(!object.userData.ambient || object.userData.moving)), object.userData.distance ?? 0,0,
        spec ? Math.hypot(object.position.x-position.x,object.position.z-position.z)/spec.scale : Infinity);
    }
    if(!walker.visible)walkerAnimation.reset();
    const sportBall=court && car.props.find(p=>p.id===court.sport.ballId)!,sportsFrame=court && sportBall && sportCameraFrame(car,sportGame?.event==='out' ? car : sportBall,court.sport.kind,court.sport.kind==='basketball' && sportGame?.possessed ? closestSportTarget(court,sportGame.aim?.[0]??car.x,sportGame.aim?.[1]??car.y) : undefined);
    const framing=sportsFrame ? worldPosition(doc,sportsFrame.x,sportsFrame.y) : position;
    const target = { x: framing.x, y: (car.control.kind!=="car" ? car.elevation : drivingHeight(doc.terrain, car.x, car.y)) + 12, z: framing.z };
    if (mode === "playing" || snap) {
      follow = followCamera(follow, target, dt, snap || reduced.matches);
      if(!court){follow.x = target.x; follow.z = target.z;}
      const zoom = sportsFrame ? sportsFrame.zoom : car.control.kind==="foot" ? 2.25 : occupied ? rideZooms.get(occupied.id)! : DEFAULT_CAMERA_ZOOM;
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
    occlusion.update(camera, position.clone().add(new THREE.Vector3(0, playerHeight(doc) / 2, 0)), dt, reduced.matches,occupied ? actorMeshes.get(occupied.id) : undefined);
    daylight.update(captureTime??(worldTime.value+hourOffset));
    scenery.update(camera,daylight.direction,position.clone().add(new THREE.Vector3(0,7,0)),{x:car.vx,y:car.vy},dt,reduced.matches);
    sunShadows.update(camera,daylight.direction,DEFAULT_CAMERA_ZOOM * manualZoom.factor);
    populations.update(car,camera,sun,mode==='playing' ? dt : 0,reduced.matches);
    hudTime += dt;
    if (hudTime > .1) {
      hudTime = 0;
      const sportsStatus=court && sportGame ? `${court.sport.kind==='football' ? 'Football' : 'Basketball'} · ${sportGame.score} ${court.sport.kind==='football' ? sportGame.score===1 ? 'goal' : 'goals' : 'pts'} · ${sportGame.event==='goal' ? 'Goal!' : sportGame.event==='basket' ? 'Basket!' : sportGame.event==='out' ? 'Out · ball returning' : !sportGame.possessed ? 'Move to the ball' : court.sport.kind==='football' ? 'WASD aim · J kick' : 'Release J at the gold mark'}` : '';
      const surfaceText = sportsStatus || (occupied ? occupied.labelText+(controlOf(occupied.spec)==="plane" ? " · Space ↑ / Shift ↓" : controlOf(occupied.spec)==='bicycle' || controlOf(occupied.spec)==='skateboard' || controlOf(occupied.spec)==='scooter' ? ' · Space jump' : controlOf(occupied.spec)==='boat' ? ' · Space hop' : "") : car.control.kind==="foot" ? isSwimming(car,world) ? 'Swimming · Shift faster' : 'On foot · Space jump / Shift run' : !car.grounded ? "Airborne" : car.timeS < boostUntil ? "Boost" : car.surface === "ice" ? "Sliding" : car.surface === "water" ? "Water" : "");
      if(surface.textContent!==surfaceText)surface.textContent=surfaceText;
      surface.dataset.effect = car.surface === "ice" ? "ice" : "boost";
      sportButton.hidden=mode!=='playing' || !court;
      sportButton.disabled=!sportGame?.possessed || !!sportGame.resetAtS;
      sportButton.dataset.kind=court?.sport.kind??'';
      const power=sportGame ? sportCharge(car,sportGame) : 0;
      sportLabel.textContent=!sportGame?.possessed ? 'Find the ball' : court?.sport.kind==='football' ? 'Hold J · Kick' : 'Hold J · Shoot';
      sportButton.setAttribute('aria-label',`${court?.sport.kind==='football' ? 'Kick' : 'Shoot'}: hold J or this button, release for power${court?.sport.kind==='basketball' ? '. Release at the gold mark' : ''}`);
      if(import.meta.env.DEV && car.population)container.dataset.population=JSON.stringify({count:populations.count,moving:car.population.members.filter(m=>m.speed>0).length,fleeing:car.population.members.filter(m=>m.mode==='flee').length,time:car.timeS,sample:doc.objects.filter(o=>o.ambient).map((o,i)=>({id:o.id,...car.population!.members[i]!})).sort((a,b)=>Math.hypot(a.x-car.x,a.y-car.y)-Math.hypot(b.x-car.x,b.y-car.y)).slice(0,6)});
      container.dataset.sport=JSON.stringify({active:court?.sport.id??null,possessed:sportGame?.possessed??false,power,games:car.sports,balls:doc.sports.map(s=>car.props.find(p=>p.id===s.ballId))});
      const carControl=isCarControl(car,world),boostActive=car.timeS<car.carBoost.activeUntilS,boostWait=Math.max(0,car.carBoost.readyAtS-car.timeS);
      const boostBlocked=!car.grounded || car.surface==='water' || car.vx*Math.cos(car.headingRad)+car.vy*Math.sin(car.headingRad)<-1 || keys.has('KeyS') || keys.has('ArrowDown');
      boostButton.hidden=mode!=='playing' || !carControl;
      boostButton.disabled=boostWait>0 || boostBlocked;
      boostButton.dataset.active=String(boostActive);
      boostButton.style.setProperty('--charge',String(boostActive ? 1 : Math.max(0,1-boostWait/CAR_BOOST.rechargeS)));
      boostLabel.textContent=boostActive ? 'Boosting' : boostWait>0 ? `Boost · ${boostWait.toFixed(1)}s` : 'Boost';
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
      container.dataset.render = JSON.stringify({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries });
      const foot=car.control.kind==="foot",nearby=foot ? nearbyRide(car,world) : undefined,exit=foot ? undefined : exitPosition(car,world);
      const person=mode==='playing' ? nearbyNpc(car,doc) : undefined,reply=mode==='playing' ? npcSpeech(car,doc) : undefined;
      talkButton.hidden=!person;talkButton.textContent=`T · Talk to ${person?.labelText??'neighbor'}`;
      speech.hidden=!reply;
      const nextSpeech=reply ? JSON.stringify(reply) : '';
      if(nextSpeech!==speechKey){speaker.textContent=reply?.label??'';replyText.textContent=reply?.text??'';speechKey=nextSpeech;}
      if(import.meta.env.DEV)container.dataset.speech=nextSpeech;
      interact.hidden=mode!=="playing" || foot && !nearby;
      interact.disabled=!foot && !exit;
      interact.textContent=foot ? `F · ${nearby?.object && !controlOf(nearby.object.spec) ? "Ride" : "Drive"} ${nearby?.labelText??""}` : exit ? 'F · Exit vehicle' : !car.grounded ? 'Land to exit' : 'Move to a clear exit';
      container.dataset.riding=occupied?.id??"";
      container.dataset.control=JSON.stringify(car.control);
      container.dataset.avatar=standingRide ? "standing" : walker.visible ? isSwimming(car,world) ? "swimming" : "walking" : occupied ? "seated" : "in-car";
      container.dataset.vehicles=JSON.stringify(car.vehicles);
      container.dataset.actors=JSON.stringify(poses.map(p=>({id:p.id,x:p.x,y:p.y,elevation:p.elevation})));
      if(import.meta.env.DEV)container.dataset.npcs=JSON.stringify(poses.filter(p=>p.stateId).map(p=>({id:p.id,state:p.stateId,action:p.activity,x:p.x,y:p.y,heading:p.headingRad,animationTime:p.animationTimeS,known:car.npcs.find(n=>n.id===p.id)?.known})));
      container.dataset.destruction=JSON.stringify({broken:car.broken,zones:car.brokenZones,debris:car.debris.length,toppling:car.debris.filter(p=>p.topple).map(p=>({id:p.objectId,angle:p.topple!.angle,settled:p.settled})),props:car.props.filter(p=>p.elevation!==undefined).map(p=>({id:p.id,x:p.x,y:p.y,elevation:p.elevation,vz:p.vz}))});
    }
    if (hudTime === 0) updateMap(car, cameraAngle);
    const draw=()=>{
      if(saves && (saveDirty || car.timeS-saveAt>=10))saveNow();
      renderer.info.reset();profile?.beforeRender();composer.render();profile?.end();capture?.end();
      if(document.body.dataset.loading!=="ready")loading.ready();
      if(import.meta.env.DEV){container.dataset.streaming=JSON.stringify(scenery.stats);const revision=`${scenery.stats.loaded},${scenery.stats.unloaded}`;if(revision!==memoryRevision){memoryRevision=revision;container.dataset.memory=JSON.stringify(geometryMemory(scene));}}
    };
    if(streamState())draw();else pendingDraw=draw;
  };
  await loading.stage("Loading the first neighbourhood");
  frame();
  if(import.meta.env.DEV)container.dataset.memory=JSON.stringify(geometryMemory(scene));
  renderer.setAnimationLoop(frame);
}
