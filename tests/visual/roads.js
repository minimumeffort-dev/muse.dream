import {WorldDaylight} from "../../src/game/daylight";
import {buildFlocks} from '../../src/game/flocks';
import {SunShadows} from "../../src/game/sun";
import {MAX_FLIGHT_CLEARANCE} from "../../src/sim/interaction";
import * as THREE from 'three';
import { createWorldScene } from '../../src/scene/world-fixture';
import dreamV2Source from '../../docs/examples/dream-v2-world.dream?raw';
import { compileDreamScene } from '../../src/scene/dream';
import { buildEnvironment, worldPosition, terrainNormal } from '../../src/game/environment';
import { WorldLandscape } from '../../src/game/landscape';
import { WorldScenery } from '../../src/game/scenery';
import { hasAnimatedJoints, impactOf,isReactive } from '../../src/scene/object-dsl';
import { objectPlacement } from '../../src/scene/placement';
import { buildObject,animateObject,buildPlayer } from '../../src/game/world3d';
import { archetypeOf } from '../../src/sim/archetypes';
import { cameraPosition } from '../../src/game/camera';
import { worldTime, terrainPlayer } from '../../src/game/shaders';
import { buildRoutes } from '../../src/game/routes';
import {isActor} from "../../src/scene/agents";
import {createCarAtSpawn} from "../../src/sim/car";
import {stepNpcs} from "../../src/sim/npcs";
import { actorPose } from '../../src/sim/actors';
import { buildDamageObject } from '../../src/game/damage';
import { compactObject } from '../../src/game/compact-object';
const dreamV2 = new URLSearchParams(location.search).has('dream2');
const doc = dreamV2 ? compileDreamScene(dreamV2Source,{sceneId:'dream2-review',revisionId:'r1',sourceHash:'handmade-dream2-example'}) : createWorldScene(), locations = [{ name: 'Start', ...doc.spawn }];
for (const region of doc.regions) locations.push({ name: region.rule.effect, x: region.polygon.reduce((sum,p)=>sum+p.x,0)/region.polygon.length, y: region.polygon.reduce((sum,p)=>sum+p.y,0)/region.polygon.length });
for (const hill of doc.terrain.hills) locations.push({ name: hill.id, x: hill.x, y: hill.y });
for (const checkpoint of doc.checkpoints) locations.push({ name: `Road ${checkpoint.id}`, x: (checkpoint.a.x + checkpoint.b.x) / 2, y: (checkpoint.a.y + checkpoint.b.y) / 2 });
for (const id of ['sketch_245','sketch_3828','sketch_1482', 'castle', 'mill', 'cottage', 'ruins', 'farm_barn', 'farm_log', 'sketch_1071', 'sketch_1177', 'cottage_well', 'crystal_garden','orchard_baker','orchard_picnic','meadow_granite']) {
  const object = doc.objects.find(object => object.id === id);
  if(object)locations.push({ name: id, x: object.x, y: object.y });
}
for(const object of doc.objects.filter(o=>isReactive(o.spec)))locations.push({name:object.id,x:object.x,y:object.y});
for(const bridge of doc.terrain.landscape?.bridges ?? []) locations.push({name:bridge.id,x:(bridge.a.x+bridge.b.x)/2,y:(bridge.a.y+bridge.b.y)/2});
for(const object of doc.objects.filter(object=>['orchard_cart','orchard_bench','orchard_bread','farm_naturalist','pond_tortoise','farm_sunflowers','ridge_cairn'].includes(object.id))) locations.push({name:object.id,x:object.x,y:object.y});
for(const object of doc.objects.filter(o=>o.route || ['meadow_station','lake_boathouse','rail_passage'].includes(o.id)))locations.push({name:object.id,x:object.x,y:object.y,object,...(object.route && doc.routes.find(r=>r.id===object.route.id)?.kind==='ambient' ? {half:80} : {})});
if(!dreamV2)locations.push({name:'City cycle tracks',x:9000,y:4200,half:420});
if(!dreamV2)locations.push({name:'River source',x:9000,y:450},{name:'River outlet',x:10100,y:10500});
for(const water of doc.terrain.landscape?.waters ?? []) locations.push({name:water.id,x:water.polygon.reduce((s,p)=>s+p.x,0)/water.polygon.length,y:water.polygon.reduce((s,p)=>s+p.y,0)/water.polygon.length});
for(const object of doc.objects.filter(o=>['eco_woodland_fern_0','eco_foxglove_0','eco_river_reeds_0','eco_weeping_willow_0'].includes(o.id)))locations.push({name:object.id,x:object.x,y:object.y,half:110});
if(!dreamV2)locations.push({name:'Lake shallows',x:10550,y:9300},{name:'Fern understory',x:1500,y:5700},{name:'Riverbank plants',x:8400,y:7200});
if(!dreamV2)locations.push({ name:'Mixed grove', x:1200, y:2100 }, { name:'Open meadow', x:2500, y:6500 });
if(!dreamV2)locations.push({name:'Town center',x:6400,y:4000,half:1050},{name:'Town square',x:6400,y:4350,half:380},{name:'Hospital',x:3900,y:6800,half:520},{name:'School',x:4430,y:3650,half:500},{name:'Central station',x:11000,y:4030,half:500},{name:'Suburbs',x:3350,y:4300,half:950},{name:'Football pitch',x:10600,y:4690,half:620},{name:'Basketball court',x:7280,y:7975,half:250},{name:'Golf park',x:6200,y:9600,half:600},{name:'South lake',x:10100,y:9300,half:1000},{name:'Canal district',x:10500,y:4200,half:2100},{name:'Canal bridge',x:9000,y:4200,half:500},{name:'Lake boulevard',x:9255,y:6200,half:600},{name:'Connected waterway',x:9700,y:6000,half:5700});
else for(const object of doc.objects.filter(o=>!o.route))locations.push({name:object.id,x:object.x,y:object.y});
const select = document.querySelector('#location'), view = document.querySelector('#view'), canvas = document.querySelector('canvas');
locations.forEach((location, index) => select.add(new Option(location.name, String(index))));
// Review-only: retain native pixels for documentation exports between frames.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#526b76');
const hemisphere=new THREE.HemisphereLight('#bad4e2', '#384736', 1.25);scene.add(hemisphere);
const fill=new THREE.DirectionalLight('#a7c4eb',.3);fill.position.set(350,250,-300);scene.add(fill);
const sun = new THREE.DirectionalLight('#ffe5b8', 2.4); sun.castShadow = true;
scene.add(sun, sun.target,buildFlocks(doc), buildEnvironment(doc), new WorldScenery(doc).group,buildRoutes(doc));
const landscape=new WorldLandscape(doc);scene.add(landscape.group);
const live=[];
for (const object of doc.objects) if (isActor(object) || hasAnimatedJoints(object.spec) || isReactive(object.spec) || archetypeOf(object).interaction === 'knockable') {
  const group = isReactive(object.spec) && impactOf(object.spec)?.kind!=='bounce' ? buildDamageObject(object) : isActor(object) ? compactObject(buildObject(object)) : buildObject(object),placement=objectPlacement(doc,object); group.position.copy(worldPosition(doc, object.x, object.y, 1.5)); group.position.y=placement.base+1.5;group.quaternion.copy(placement.rotation);group.userData.object=object;group.userData.ambient=!!object.route && doc.routes.find(r=>r.id===object.route.id)?.kind==='ambient'; scene.add(group);live.push(group);
}
if(dreamV2){const player=buildPlayer(doc);player.position.copy(worldPosition(doc,doc.spawn.x,doc.spawn.y,1.5));player.rotation.y=-doc.spawn.headingRad;scene.add(player);}
const daylight=new WorldDaylight(doc,scene,hemisphere,sun,fill);
const worldBounds=new THREE.Box3().setFromObject(scene),sunShadows=new SunShadows(sun,worldBounds.min.y-32,worldBounds.max.y+MAX_FLIGHT_CLEARANCE);
document.body.dataset.source=dreamV2 ? 'dream-2' : 'main-world';
terrainPlayer.value.set(0, -10000, 0);
let running = true, time = 0, previous = performance.now(), preview=createCarAtSpawn(doc);
document.querySelector("#motion").onclick = event => { running = !running; event.target.textContent = running ? "Pause animation" : "Resume animation"; };
const wake=document.createElement('button');wake.textContent='Ripple';document.querySelector('header').append(wake);
wake.onclick=()=>{const location=locations[Number(select.value)];for(const {waves} of landscape.waters) waves.disturb(location.x,location.y,2);};
const download=document.createElement('button');download.textContent='Save PNG';document.querySelector('header').append(download);
download.onclick=()=>canvas.toBlob(blob=>{
  if(!blob)return;
  const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;
  link.download=`${select.selectedOptions[0].text.toLowerCase().replaceAll(' ','-')}.png`;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10000);
new ResizeObserver(() => renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)).observe(canvas);
renderer.setAnimationLoop(() => {
  const now = performance.now(),dt=Math.min(.1,(now-previous)/1000); if (running) {preview={...preview,npcs:stepNpcs(preview,dt,doc),timeS:preview.timeS+dt};time+=dt;for(const {waves} of landscape.waters) waves.step(dt);landscape.upload();} previous = now; worldTime.value = time;
  for(const group of live){
    const object=group.userData.object,p=isActor(object) ? actorPose(doc,object,time,preview) : undefined;
    if(p){group.position.copy(worldPosition(doc,p.x,p.y));group.position.y=p.elevation+(group.userData.ambient || p.activity && p.kind==='path' ? .2 : 1.5);group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),!p.activity && (p.kind==='rail'||p.kind==='path') || object.spec?.grounding==='surface' ? terrainNormal(doc,p.x,p.y) : new THREE.Vector3(0,1,0));group.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-p.headingRad));}
    animateObject(group,p?.animationTimeS??time,p?.activity ? p.activity==='perform' || p.activity==='patrol' && p.speed>0 : !group.userData.ambient || !!p?.speed,p?.travelled??0,0,select.selectedOptions[0].text===object.id ? 0 : Infinity);
  }
  const location = locations[Number(select.value)], p=location.object?.route ? actorPose(doc,location.object,time,preview) : location;
  const target = worldPosition(doc, p.x+Number(document.querySelector("#pan").value), p.y, 20);if(p.elevation!==undefined)target.y=p.elevation+20;
  const point = cameraPosition(target, Number(view.value)), aspect = canvas.clientWidth / canvas.clientHeight, half = Math.max(location.half??(new URLSearchParams(location.search).has("shadows") ? 270 : 210), (location.half??205) / aspect);
  Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
  camera.updateProjectionMatrix(); camera.position.set(point.x, target.y+Number(document.querySelector("#pitch").value), point.z); camera.lookAt(target);
  camera.updateMatrixWorld();
  if(document.querySelector('#shadows').value==='previous'){
    Object.assign(sun.shadow.camera,{left:-410,right:410,top:410,bottom:-410,near:.5,far:1800});sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.copy(target);sun.position.copy(target).add(new THREE.Vector3(-300,690,220));
    sun.updateMatrixWorld();sun.target.updateMatrixWorld();sun.shadow.updateMatrices(sun);
  }else {
    const hour=Number(document.querySelector('#hour').value),clock=doc.daylight ? ((hour-doc.daylight.startHour+24)%24)/24*doc.daylight.cycleSeconds : 0;
    daylight.update(clock);sunShadows.update(camera,daylight.direction);
  }
  document.body.dataset.shadow=JSON.stringify({mode:document.querySelector('#shadows').value,span:[sun.shadow.camera.right*2,sun.shadow.camera.top*2],map:sun.shadow.mapSize.toArray()});
  renderer.render(scene, camera);
});
