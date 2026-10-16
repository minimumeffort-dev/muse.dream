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
if(!dreamV2)locations.push({name:'Cycle meadow',x:1165,y:1615,half:330},{name:'Riverside skate circuit',x:2250,y:2350,half:300});
if(!dreamV2)locations.push({name:'River source',x:1930,y:1050},{name:'River outlet pool',x:1830,y:2010});
for(const water of doc.terrain.landscape?.waters ?? []) locations.push({name:water.id,x:water.polygon.reduce((s,p)=>s+p.x,0)/water.polygon.length,y:water.polygon.reduce((s,p)=>s+p.y,0)/water.polygon.length});
for(const object of doc.objects.filter(o=>['eco_woodland_fern_0','eco_foxglove_0','eco_river_reeds_0','eco_weeping_willow_0'].includes(o.id)))locations.push({name:object.id,x:object.x,y:object.y,half:110});
if(!dreamV2)locations.push({name:'Pond shallows',x:2910,y:2460},{name:'Fern understory',x:1550,y:2850},{name:'Riverbank plants',x:1860,y:1960});
if(!dreamV2)locations.push({ name:'Mixed grove', x:1550, y:2850 }, { name:'Open meadow', x:3150, y:2650 });
if(!dreamV2)locations.push({name:'Town center',x:6900,y:1800,half:1000},{name:'Town square',x:6925,y:1525,half:330},{name:'Suburbs',x:2100,y:5870,half:1000},{name:'Football pitch',x:6400,y:5020,half:440},{name:'Basketball court',x:7300,y:4945,half:180},{name:'Golf park',x:6700,y:6500,half:850},{name:'South lake',x:4750,y:5500,half:650});
else for(const object of doc.objects.filter(o=>!o.route))locations.push({name:object.id,x:object.x,y:object.y});
const select = document.querySelector('#location'), view = document.querySelector('#view'), canvas = document.querySelector('canvas');
locations.forEach((location, index) => select.add(new Option(location.name, String(index))));
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#526b76');
scene.add(new THREE.HemisphereLight('#bad4e2', '#384736', 1.25));
const sun = new THREE.DirectionalLight('#ffe5b8', 2.4); sun.castShadow = true;
scene.add(sun, sun.target, buildEnvironment(doc), new WorldScenery(doc).group,buildRoutes(doc));
const landscape=new WorldLandscape(doc);scene.add(landscape.group);
const live=[];
for (const object of doc.objects) if (object.route || hasAnimatedJoints(object.spec) || isReactive(object.spec) || archetypeOf(object).interaction === 'knockable') {
  const group = isReactive(object.spec) && impactOf(object.spec)?.kind!=='bounce' ? buildDamageObject(object) : object.route ? compactObject(buildObject(object)) : buildObject(object),placement=objectPlacement(doc,object); group.position.copy(worldPosition(doc, object.x, object.y, 1.5)); group.position.y=placement.base+1.5;group.quaternion.copy(placement.rotation);group.userData.object=object;group.userData.ambient=!!object.route && doc.routes.find(r=>r.id===object.route.id)?.kind==='ambient'; scene.add(group);live.push(group);
}
if(dreamV2){const player=buildPlayer(doc);player.position.copy(worldPosition(doc,doc.spawn.x,doc.spawn.y,1.5));player.rotation.y=-doc.spawn.headingRad;scene.add(player);}
const worldBounds=new THREE.Box3().setFromObject(scene),sunShadows=new SunShadows(sun,worldBounds.min.y-32,worldBounds.max.y+MAX_FLIGHT_CLEARANCE);
document.body.dataset.source=dreamV2 ? 'dream-2' : 'main-world';
terrainPlayer.value.set(0, -10000, 0);
let running = true, time = 0, previous = performance.now();
document.querySelector("#motion").onclick = event => { running = !running; event.target.textContent = running ? "Pause animation" : "Resume animation"; };
const wake=document.createElement('button');wake.textContent='Ripple';document.querySelector('header').append(wake);
wake.onclick=()=>{const location=locations[Number(select.value)];for(const {waves} of landscape.waters) waves.disturb(location.x,location.y,2);};
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10000);
new ResizeObserver(() => renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)).observe(canvas);
renderer.setAnimationLoop(() => {
  const now = performance.now(),dt=Math.min(.1,(now-previous)/1000); if (running) {time+=dt;for(const {waves} of landscape.waters) waves.step(dt);landscape.upload();} previous = now; worldTime.value = time;
  for(const group of live){
    const object=group.userData.object,p=object.route ? actorPose(doc,object,time) : undefined;
    if(p){group.position.copy(worldPosition(doc,p.x,p.y));group.position.y=p.elevation+(group.userData.ambient ? .2 : 1.5);group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),p.kind==='rail'||p.kind==='path' ? terrainNormal(doc,p.x,p.y) : new THREE.Vector3(0,1,0));group.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-p.headingRad));}
    animateObject(group,time,!group.userData.ambient || !!p?.speed,p?.travelled??0,0,select.selectedOptions[0].text===object.id ? 0 : Infinity);
  }
  const location = locations[Number(select.value)], p=location.object?.route ? actorPose(doc,location.object,time) : location;
  const target = worldPosition(doc, p.x+Number(document.querySelector("#pan").value), p.y, 20);if(p.elevation!==undefined)target.y=p.elevation+20;
  const point = cameraPosition(target, Number(view.value)), aspect = canvas.clientWidth / canvas.clientHeight, half = Math.max(location.half??(new URLSearchParams(location.search).has("shadows") ? 270 : 210), (location.half??205) / aspect);
  Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
  camera.updateProjectionMatrix(); camera.position.set(point.x, target.y+Number(document.querySelector("#pitch").value), point.z); camera.lookAt(target);
  camera.updateMatrixWorld();
  if(document.querySelector('#shadows').value==='previous'){
    Object.assign(sun.shadow.camera,{left:-410,right:410,top:410,bottom:-410,near:.5,far:1800});sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.copy(target);sun.position.copy(target).add(new THREE.Vector3(-300,690,220));
    sun.updateMatrixWorld();sun.target.updateMatrixWorld();sun.shadow.updateMatrices(sun);
  }else sunShadows.update(camera);
  document.body.dataset.shadow=JSON.stringify({mode:document.querySelector('#shadows').value,span:[sun.shadow.camera.right*2,sun.shadow.camera.top*2],map:sun.shadow.mapSize.toArray()});
  renderer.render(scene, camera);
});
