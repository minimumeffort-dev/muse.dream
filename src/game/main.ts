import {SunShadows} from "./sun";
import {mediaCapture} from "./media-capture";
import {vehicleReviewStart} from "./review-start";
import { measuredScale, playerRadius, playerHeight } from "../scene/measure";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { buildMaskForScene } from "../scene/fixture";
import { createWorldScene } from "../scene/world-fixture";
import { drivingHeight } from "../scene/terrain";
import { archetypeOf, objectRadius } from "../sim/archetypes";
import { buildPaperMask } from "../sim/mask";
import { createCarAtSpawn, FixedStepper, resetCar, type World } from "../sim/car";
import { MAX_FLIGHT_CLEARANCE,nearbyRide,toggleRide,stepInteractive,occupiedObject,exitPosition } from "../sim/interaction";
import { actorPoses } from "../sim/actors";
import { interactiveWorld } from "../scene/interactive-world";
import { buildRoutes } from "./routes";
import { compactObject } from "./compact-object";
import { worldTime, worldMotion, terrainPlayer, terrainView, worldGradeShader } from "./shaders";
import { animateObject, buildObject, buildPlayer } from "./world3d";
import { buildEnvironment, roadGeometry, terrainNormal, worldPosition } from "./environment";
import { cameraPosition, followCamera, followCameraZoom, rideCameraZoom, DEFAULT_CAMERA_ZOOM, type FollowTarget } from "./camera";
import { hasAnimatedJoints,impactOf,isReactive,controlOf } from "../scene/object-dsl";
import { buildDamageObject,updateDamage } from "./damage";
import { WorldDebris } from "./debris";
import type { ImpactEvent } from "../sim/impacts";
import { objectPlacement } from "../scene/placement";
import { WorldLandscape } from "./landscape";
import { WorldParticles } from "./particles";
import { SceneryOcclusion } from "./occlusion";
import { WorldScenery } from "./scenery";
import { createWorldMap } from "./navigation";

const container = document.querySelector<HTMLElement>("#game")!;
const pauseButton = document.querySelector<HTMLButtonElement>("#pause")!;
const pauseMenu = document.querySelector<HTMLDialogElement>("#pause-menu")!;
const lap = document.querySelector<HTMLElement>("#lap")!;
const progress = document.querySelector<HTMLElement>("#progress")!;
const surface = document.querySelector<HTMLElement>("#surface")!;
const interact=document.querySelector<HTMLButtonElement>("#interact")!;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

function start(): void {
  const doc = createWorldScene();
  const carRadius = playerRadius(doc);
  const roadMask = buildMaskForScene(doc);
  const world: World = { scene: doc, roadMask,
    driveMask: buildPaperMask(doc.canonical.width, doc.canonical.height), carRadius };
  let car = createCarAtSpawn(doc);
  if(import.meta.env.DEV)car=vehicleReviewStart(car,world,new URLSearchParams(location.search).get("test-vehicle"));
  const stepper = new FixedStepper();
  const keys = new Set<string>();
  let mode: "playing" | "paused" = "playing";

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-label", "WASD walks or drives. F enters or exits a vehicle. Space climbs and Shift descends in an aircraft. P pauses; R returns to the start.");
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#526b76");
  scene.fog = new THREE.Fog("#526b76", 1700, 3400);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10000);
  camera.zoom = DEFAULT_CAMERA_ZOOM;
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
  scene.add(new THREE.HemisphereLight("#bad4e2", "#384736", 1.25));
  const sun = new THREE.DirectionalLight("#ffe5b8", 2.4);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight("#a7c4eb", .3);
  fill.position.set(350, 250, -300); scene.add(fill);
  scene.add(buildEnvironment(doc));
  const landscape=new WorldLandscape(doc);scene.add(landscape.group);
  scene.add(buildRoutes(doc));

  const scenery = new WorldScenery(doc); scene.add(scenery.group);
  const propMeshes = new Map<string, THREE.Group>();
  const actorMeshes=new Map<string,THREE.Group>();
  const rideZooms=new Map<string,number>();
  const breakMeshes=new Map<string,THREE.Group>();
  const objects: THREE.Group[] = [];
  for (const object of doc.objects) {
    if (!object.route && !controlOf(object.spec) && !isReactive(object.spec) && archetypeOf(object).interaction !== "knockable" && !hasAnimatedJoints(object.spec)) continue;
    const destructible=isReactive(object.spec) && impactOf(object.spec)?.kind!=="bounce";
    const group = destructible ? buildDamageObject(object) : compactObject(buildObject(object));
    group.position.copy(worldPosition(doc, object.x, object.y, 1.5));
    const placement=objectPlacement(doc,object);
    group.position.y=placement.base+1.5;group.quaternion.copy(placement.rotation);
    group.userData.sceneObject=object;
    scene.add(group);
    objects.push(group);
    if(archetypeOf(object).interaction === "knockable") propMeshes.set(object.id, group);
    if(object.route || controlOf(object.spec)){actorMeshes.set(object.id,group);rideZooms.set(object.id,rideCameraZoom(doc.player,object));}
    if(destructible)breakMeshes.set(object.id,group);
  }
  const debris=new WorldDebris(doc);scene.add(debris.group);
  const traveler=interactiveWorld.assemblies.find(a=>a.displayName==="Traveler")!;
  const avatar=compactObject(buildObject({id:"traveler",kind:"custom",labelText:"Traveler",x:0,y:0,scale:measuredScale(traveler),spec:traveler}));avatar.visible=false;objects.push(avatar);
  const walkerSpec=interactiveWorld.assemblies.find(a=>a.displayName==="Explorer")!;
  const walker=compactObject(buildObject({id:"explorer",kind:"custom",labelText:"Explorer",x:0,y:0,scale:measuredScale(walkerSpec),spec:walkerSpec}));
  walker.visible=false;scene.add(walker);
  const carRoot = new THREE.Group(), carMesh = compactObject(buildPlayer(doc));
  carRoot.add(carMesh); scene.add(carRoot);
  const particles = new WorldParticles(doc); scene.add(particles.mesh);
  const occlusion = new SceneryOcclusion(objects.filter(object=>object!==avatar));
  const updateMap = createWorldMap(document.querySelector<HTMLCanvasElement>("#world-map")!, doc);

  const worldBounds=new THREE.Box3().setFromObject(scene);
  const sunShadows=new SunShadows(sun,worldBounds.min.y-32,worldBounds.max.y+MAX_FLIGHT_CLEARANCE);

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

  function resetPosition(restartRace = false): void {
    car = resetCar(car, doc, restartRace);
    stepper.reset(); particles.clear(); landscape.clear(); snap = true; cameraAngle=viewAngle;
    boostUntil = 0; surface.textContent = "";
    flight = { jumps: 0, landings: 0, maxClearance: 0 }; landingBounce = 0;
    wheelDistance = 0;
    if (restartRace) for (const group of propMeshes.values()) group.userData.distance = 0;
  }

  function setMode(next: typeof mode): void {
    mode = next; keys.clear(); stepper.reset();
    if(next === "paused") cameraAngle=viewAngle;
    if (next === "paused" && !pauseMenu.open) pauseMenu.showModal();
    else if (next === "playing" && pauseMenu.open) pauseMenu.close();
    pauseButton.setAttribute("aria-label", next === "paused" ? "Resume" : "Pause");
    pauseButton.setAttribute("aria-pressed", String(next === "paused"));
    pauseButton.dataset.paused = String(next === "paused");
    if(next==="playing")container.focus({preventScroll:true});
  }
  pauseButton.addEventListener("click", () => setMode(mode === "playing" ? "paused" : "playing"));
  const useRide=()=>{if(mode==="playing"){car=toggleRide(car,world);container.focus({preventScroll:true});}};
  interact.addEventListener("click",useRide);
  pauseMenu.addEventListener("cancel", (e) => { e.preventDefault(); setMode("playing"); });
  reduced.addEventListener("change", () => { particles.clear(); landscape.clear(); snap = true; });
  document.querySelector("#resume")!.addEventListener("click", () => { setMode("playing"); });
  document.querySelector("#restart")!.addEventListener("click", () => {
    resetPosition(true);
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
    }
    keys.add(e.code);
  });
  addEventListener("keyup", (e) => keys.delete(e.code));
  addEventListener("blur", () => { keys.clear(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) setMode("paused"); });
  const dots = doc.checkpoints.map(() => document.createElement("i"));
  progress.append(...dots);
  container.dataset.world=JSON.stringify({width:doc.canonical.width,height:doc.canonical.height,objects:doc.objects.length,checkpoints:doc.checkpoints.length});
  container.dataset.source="dream-2";
  let previous = performance.now(), hudTime = 0;
  let frameMs = 16.7;
  const capture=import.meta.env.DEV ? mediaCapture(renderer.domElement,{driving:210,switching:240},()=>{
    resetPosition(true);worldTime.value=0;setMode("playing");
  },(clip:string,frame:number)=>{
    keys.clear();
    if(clip==="driving"){if(frame<175)keys.add("KeyW");return;}
    if(frame===18 || frame===78 || frame===210)useRide();
    if(frame>=18 && frame<63)keys.add("KeyS");
    if(frame>=100 && frame<165)keys.add("KeyW");
    if(frame>=140 && frame<160)keys.add("KeyD");
    if(frame>=168 && frame<198)keys.add("KeyS");
  }) : undefined;
  renderer.setAnimationLoop(() => {
    const captureDt=capture?.begin();
    if(captureDt===null)return;
    const now = performance.now(), elapsedMs = now - previous, dt = captureDt ?? Math.min(elapsedMs / 1000, .1); previous = now;
    frameMs += (elapsedMs - frameMs) * .05;
    worldMotion.value = reduced.matches ? 0 : 1;
    let boosted = false, impact = 0, collision = 0;
    const objectImpacts:ImpactEvent[]=[];
    if (mode === "playing") {
      if (!reduced.matches) worldTime.value += dt;
      const input = {
        steer: Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft")),
        throttle: Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown")),
        lift:Number(keys.has("Space"))-Number(keys.has("ShiftLeft") || keys.has("ShiftRight")),viewAngle:cameraAngle,
      };
      const steps = stepper.push(dt);
      for (let i = 0; i < steps; i++) {
        const wasGrounded = car.grounded, previousSpeed=Math.hypot(car.vx,car.vy),riding=car.control.kind!=="car";
        car = stepInteractive(car, input, stepper.stepDt, world);
        objectImpacts.push(...car.impacts);
        landscape.step(car,stepper.stepDt,!reduced.matches); boosted ||= car.boostedThisStep;
        landscape.stepActors(actorPoses(doc,car.timeS,car).filter(p=>!(car.control.kind==="vehicle" && p.id===car.control.id)),stepper.stepDt,!reduced.matches);
        if (!riding && wasGrounded && !car.grounded) flight.jumps++;
        if (!riding && !wasGrounded && car.grounded) flight.landings++;
        if(!riding)flight.maxClearance = Math.max(flight.maxClearance, car.elevation - drivingHeight(doc.terrain, car.x, car.y));
        impact = Math.max(impact, car.landingSpeed);
        if(!riding && car.landingSpeed===0) collision=Math.max(collision,previousSpeed-Math.hypot(car.vx,car.vy));
      }
      if (boosted) boostUntil = car.timeS + .5;
      particles.update(car, dt, !reduced.matches, boosted, impact, collision,actorPoses(doc,car.timeS,car));
      particles.objectImpacts(car,objectImpacts,!reduced.matches);
      landingBounce = Math.max(landingBounce * Math.exp(-dt * 12), Math.min(1.8, impact * .008));
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
    const poses=actorPoses(doc,car.timeS,car);
    for(const pose of poses){
      const group=actorMeshes.get(pose.id)!;
      group.position.copy(worldPosition(doc,pose.x,pose.y));group.position.y=pose.elevation+1.5;
      const normal=pose.kind==="rail" || pose.kind==="path" ? terrainNormal(doc,pose.x,pose.y) : new THREE.Vector3(0,1,0);
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-pose.headingRad));
      group.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.bank??0,0,pose.pitch??0)));
      group.userData.distance=pose.travelled;
    }
    const occupied=occupiedObject(car,world);
    const standingRide=controlOf(occupied?.spec)==="skateboard";
    avatar.visible=!!occupied && !standingRide;
    if(occupied && !standingRide){
      const group=actorMeshes.get(occupied.id)!;group.add(avatar);
      const spec=group.userData.sceneObject.spec;
      avatar.position.fromArray(spec.rideable.seat);
      avatar.scale.setScalar(measuredScale(traveler)/group.scale.x);
    }
    walker.visible=car.control.kind==="foot" || standingRide;
    if(standingRide){
      const group=actorMeshes.get(occupied!.id)!;group.add(walker);
      const spec=group.userData.sceneObject.spec;
      walker.position.fromArray(spec.rideable.seat);walker.rotation.set(0,0,0);
      walker.scale.setScalar(measuredScale(walkerSpec)/group.scale.x);animateObject(walker,car.timeS,false);
    }else if(walker.visible){
      scene.add(walker);walker.scale.setScalar(measuredScale(walkerSpec));
      walker.position.copy(position);walker.rotation.set(0,-car.headingRad,0);
      animateObject(walker,car.timeS,!reduced.matches && Math.hypot(car.vx,car.vy)>3);
    }
    for (const object of objects) {
      const spec=object.userData.sceneObject;
      animateObject(object, worldTime.value, !reduced.matches, object.userData.distance ?? 0,0,
        spec ? Math.hypot(object.position.x-position.x,object.position.z-position.z)/spec.scale : Infinity);
    }
    const target = { x: position.x, y: (car.control.kind!=="car" ? car.elevation : drivingHeight(doc.terrain, car.x, car.y)) + 12, z: position.z };
    if (mode === "playing" || snap) {
      follow = followCamera(follow, target, dt, snap || reduced.matches);
      follow.x = target.x; follow.z = target.z;
      const zoom = car.control.kind==="foot" ? 2.25 : occupied ? rideZooms.get(occupied.id)! : DEFAULT_CAMERA_ZOOM;
      camera.zoom = followCameraZoom(camera.zoom, zoom, dt, snap || reduced.matches);
      camera.updateProjectionMatrix();
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
    scenery.update(camera, position.clone().add(new THREE.Vector3(0, 7, 0)), dt, reduced.matches);
    occlusion.update(camera, position.clone().add(new THREE.Vector3(0, playerHeight(doc) / 2, 0)), dt, reduced.matches,occupied ? actorMeshes.get(occupied.id) : undefined);
    sunShadows.update(camera);
    hudTime += dt;
    if (hudTime > .1) {
      hudTime = 0;
      lap.textContent = `Lap ${car.lap + 1}`;
      progress.setAttribute("aria-label", `Checkpoint ${car.nextCheckpoint === 0 ? dots.length : car.nextCheckpoint} of ${dots.length}`);
      dots.forEach((dot, i) => dot.classList.toggle("passed", car.nextCheckpoint === 0 || i < car.nextCheckpoint));
      surface.textContent = occupied ? occupied.labelText+(controlOf(occupied.spec)==="plane" ? " · Space ↑ / Shift ↓" : "") : car.control.kind==="foot" ? "On foot" : !car.grounded ? "Airborne" : car.timeS < boostUntil ? "Boost" : car.surface === "ice" ? "Sliding" : car.surface === "water" ? "Water" : "";
      surface.dataset.effect = car.surface === "ice" ? "ice" : "boost";
      // DOM diagnostics let browser checks observe real simulation and camera state.
      container.dataset.car = [car.x, car.y, position.y].map((v) => v.toFixed(1)).join(",");
      container.dataset.camera = [follow.x, follow.y, follow.z].map((v) => v.toFixed(1)).join(",");
      container.dataset.mode = mode;
      container.dataset.particles = String(particles.activeCount);
      container.dataset.grounded = String(car.grounded);
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
      interact.hidden=mode!=="playing" || foot && !nearby;
      interact.disabled=!foot && !exit;
      interact.textContent=foot ? `F · ${nearby?.object && !controlOf(nearby.object.spec) ? "Ride" : "Drive"} ${nearby?.labelText??""}` : exit ? "F · Exit vehicle" : controlOf(occupied?.spec)==="boat" ? "Dock to exit" : car.surface==="water" ? "R · Recover plane" : "Land to exit";
      container.dataset.riding=occupied?.id??"";
      container.dataset.control=JSON.stringify(car.control);
      container.dataset.avatar=standingRide ? "standing" : walker.visible ? "walking" : occupied ? "seated" : "in-car";
      container.dataset.vehicles=JSON.stringify(car.vehicles);
      container.dataset.actors=JSON.stringify(poses.map(p=>({id:p.id,x:p.x,y:p.y,elevation:p.elevation})));
      container.dataset.destruction=JSON.stringify({broken:car.broken,zones:car.brokenZones,debris:car.debris.length,toppling:car.debris.filter(p=>p.topple).map(p=>({id:p.objectId,angle:p.topple!.angle,settled:p.settled})),props:car.props.filter(p=>p.elevation!==undefined).map(p=>({id:p.id,x:p.x,y:p.y,elevation:p.elevation,vz:p.vz}))});
    }
    if (hudTime === 0) updateMap(car, cameraAngle);
    renderer.info.reset();
    composer.render();
    capture?.end();
  });
}

try { start(); }
catch (error) {
  container.textContent = "The world could not start. Please try reloading in a browser with WebGL enabled.";
  container.classList.add("error"); container.setAttribute("role", "alert");
  pauseButton.hidden = true;
  console.error(error);
}
