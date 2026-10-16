import {mediaCapture} from '../../src/game/media-capture';
import { measuredScale } from "../../src/scene/measure";
import * as THREE from 'three';
import { impactWorld } from '../../src/scene/impact-creations';
import damageSource from '../../src/scene/world/destructible.dream?raw';
import { compileDreamWorld } from '../../src/scene/dream';
import { objectContacts } from '../../src/scene/contacts';
import { buildDamageObject,updateDamage } from '../../src/game/damage';
const assemblies=[...impactWorld.assemblies,...compileDreamWorld(damageSource).assemblies];
import { createFixtureScene,buildMaskForScene } from '../../src/scene/fixture';
import { parseScene } from '../../src/scene/schema';
import { createCarAtSpawn,stepCar } from '../../src/sim/car';
import { buildPaperMask } from '../../src/sim/mask';
import { buildObject,buildPlayer,animateObject } from '../../src/game/world3d';
import { WorldDebris } from '../../src/game/debris';
import { WorldParticles } from '../../src/game/particles';
import { worldPosition } from '../../src/game/environment';
import { objectPlacement } from '../../src/scene/placement';
import { objectRadius } from '../../src/sim/archetypes';
import { worldTime } from '../../src/game/shaders';

const canvas=document.querySelector('canvas'),select=document.querySelector('#object'),phase=document.querySelector('#time'),speed=document.querySelector('#speed');
for(const spec of assemblies)select.add(new Option(spec.displayName,spec.displayName));
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color('#52714d');
scene.add(new THREE.HemisphereLight('#bad4e2','#384736',1.25));
const sun=new THREE.DirectionalLight('#ffe5b8',2.4);sun.position.set(-200,400,150);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=sun.shadow.camera.bottom=-220;sun.shadow.camera.right=sun.shadow.camera.top=220;sun.shadow.camera.far=900;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:'#52714d'}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2000),content=new THREE.Group();scene.add(content);
if(new URLSearchParams(location.search).has('docs'))camera.zoom=2.4;
let previousKey='',owned=[],captureTime;
phase.addEventListener('change',()=>{captureTime=undefined;});
function renderState(){
  const key=[select.value,captureTime??phase.value,speed.value,document.querySelector('#reduced').checked].join('/');
  if(key===previousKey)return;previousKey=key;
  for(const node of owned)node.traverse(child=>{if(child.isMesh || child.isPoints){child.geometry.dispose();for(const mat of Array.isArray(child.material)?child.material:[child.material])mat.dispose();}});
  content.clear();owned=[];
  const spec=assemblies.find(s=>s.displayName===select.value),object={id:'target',kind:'custom',labelText:spec.displayName,x:480,y:360,scale:measuredScale(spec),spec};
  const doc=parseScene({...createFixtureScene(),objects:[object],regions:[],terrain:{hills:[]}}),world={scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(960,720),carRadius:11};
  const zone=objectContacts(doc,object).find(c=>c.zoneId);
  let state={...createCarAtSpawn(doc),x:zone ? zone.x+zone.r+12 : 480-objectRadius(object)-12,y:zone?.y??360,vx:Number(speed.value)*(zone?-1:1),headingRad:zone?Math.PI:0};
  const particles=new WorldParticles(doc),steps=Math.round(Number(captureTime??phase.value)*120);
  for(let i=0;i<steps;i++){state=stepCar(state,{throttle:0,steer:0},1/120,world);particles.update(state,1/120,!document.querySelector('#reduced').checked);particles.objectImpacts(state,state.impacts,!document.querySelector('#reduced').checked);}
  const target=spec.breakZones || spec.impact?.kind==='topple' ? buildDamageObject(object) : buildObject(object),placement=objectPlacement(doc,object),prop=state.props[0];target.position.copy(worldPosition(doc,prop?.x??object.x,prop?.y??object.y));target.position.y=(prop?.elevation??placement.base)+1.5;updateDamage(target,'target',state);
  animateObject(target,Number(captureTime??phase.value),!document.querySelector('#reduced').checked,prop ? Math.hypot(prop.x-object.x,prop.y-object.y) : 0);
  const debris=new WorldDebris(doc);debris.update(state,document.querySelector('#reduced').checked);
  const car=buildPlayer(doc);car.position.copy(worldPosition(doc,state.x,state.y));car.position.y=state.elevation+1.5;
  content.add(target,debris.group,particles.mesh,car);owned=[target,debris.group,particles.mesh,car];
  document.querySelector('output').textContent=`${state.brokenZones.length?'Section broken':state.broken.length?'Broken':'Intact'} · ${state.debris.length} pieces`;
  document.body.dataset.state=JSON.stringify({broken:state.broken,zones:state.brokenZones,toppling:state.debris.filter(p=>p.topple).map(p=>p.topple.angle),debris:state.debris.length,props:state.props,car:{x:state.x,y:state.y},particles:particles.activeCount});
}
new ResizeObserver(()=>renderer.setSize(canvas.clientWidth,canvas.clientHeight,false)).observe(canvas);
const capture=mediaCapture(canvas,{destruction:120},()=>{
  select.value='Slatted park bench';document.querySelector('#view').value='1.57079632679';previousKey='';
},(_clip,frame)=>{captureTime=Math.max(0,frame/30-.7);});
renderer.setAnimationLoop(()=>{
  if(capture?.begin()===null)return;
  renderState();const aspect=canvas.clientWidth/canvas.clientHeight,half=140,angle=Number(document.querySelector('#view').value);
  Object.assign(camera,{left:-half*aspect,right:half*aspect,top:half,bottom:-half});camera.updateProjectionMatrix();
  camera.position.set(90*Math.cos(angle)+120*Math.sin(angle),140,120*Math.cos(angle)-90*Math.sin(angle));camera.lookAt(0,20,0);worldTime.value=Number(captureTime??phase.value);renderer.render(scene,camera);capture?.end();
});
