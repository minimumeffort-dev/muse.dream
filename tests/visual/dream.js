import { measuredScale } from "../../src/scene/measure";
import * as THREE from 'three';
import { dreamExamples } from '../../src/scene/dream-creations';
import { buildObject, animateObject } from '../../src/game/world3d';
import {CharacterAnimator} from '../../src/game/character-animation';
import { worldTime, worldMotion } from '../../src/game/shaders';
import { interactiveWorld } from '../../src/scene/interactive-world';
import { compileDreamWorld } from '../../src/scene/dream';
import { worldSource, worldModules } from '../../src/scene/world-fixture';
import materialExample from '../../docs/examples/material-finishes.dream?raw';
import personExample from '../../docs/examples/city-person.dream?raw';
import {mediaCapture} from '../../src/game/media-capture';
import utilityExample from '../../docs/examples/utility-vehicles.dream?raw';
import priorTrees from '../../src/scene/compatibility/r75-trees.json';
import priorPlants from '../../src/scene/compatibility/r76-plants.json';
import priorCharacters from '../../docs/evidence/character-construction/r80-visuals.json';
import coverExample from '../../src/scene/ground-cover.dream?raw';

const canvas=document.querySelector('canvas'),grid=document.querySelector('.grid');
const view=document.querySelector('#view'),phase=document.querySelector('#phase');
// Review-only: retain native pixels for documentation exports between frames.
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setScissorTest(true);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const params=new URLSearchParams(location.search),coverExamples=params.has('cover'),faunaExamples=params.has('fauna'),furnitureExamples=params.has('furniture'),canopyExamples=params.has('canopy'),botanyExamples=params.has('botany'),focus=faunaExamples ? ['Roe deer','Meadow hare','Copper fox','Neighborhood dog','Garden cat','City pigeon','River gull','Red kite','Perched sparrow'] : furnitureExamples ? ['Slatted park bench','Breakaway table','Produce crate','Terracotta planter','Produce stall'] : coverExamples ? ['Ground-cover grass','Ground-cover flower','Ground-cover pairing'] : botanyExamples ? ['Woodland fern','Pink foxglove','Planted street tub','Blue hydrangea'] : canopyExamples ? ['Young rowan','Silver fir','Weeping willow','Old apple tree'] : params.getAll('asset');
const utilityExamples=params.has('utility');
if(utilityExamples)document.querySelector('header a').href='/docs/examples/utility-vehicles.dream';
const peopleExamples=params.has('people');
const neutral=peopleExamples || utilityExamples || canopyExamples || botanyExamples || coverExamples || furnitureExamples || faunaExamples || params.has('neutral');
if(neutral)document.body.classList.add('people');
if(peopleExamples){document.querySelector('header a').href='/docs/examples/city-person.dream';}
const worldExamples=params.has('world');
const allExamples=params.has('all');
// A full native-resolution atlas must fit within the WebGL renderbuffer height.
// The ordinary responsive two-column view can exceed it with the full asset library.
if(params.has('sheet')){document.body.style.width='1600px';grid.style.gridTemplateColumns='repeat(4,1fr)';}
if((peopleExamples || utilityExamples || canopyExamples || botanyExamples || coverExamples || furnitureExamples || faunaExamples) && params.has('capture'))document.body.style.width='1600px';
const focusHeight=peopleExamples && params.has('capture') ? '225px' : faunaExamples && params.has('capture') ? '300px' : furnitureExamples && params.has('capture') ? '300px' : (canopyExamples || botanyExamples || coverExamples) && params.has('capture') ? '450px' : utilityExamples && params.has('capture') ? '900px' : focus.length>2 ? '360px' : '650px';
if(focus.length){grid.style.gridTemplateColumns=`repeat(${Math.min(2,focus.length)},1fr)`;document.querySelector('main').style.setProperty('min-height',focusHeight);}
if(faunaExamples){grid.style.gridTemplateColumns='repeat(3,1fr)';document.querySelector('header a').href='/docs/examples/wildlife-construction.dream';}
if(worldExamples)document.querySelector('header a').href='/src/scene/interactive-world.dream';
if(allExamples || canopyExamples || botanyExamples)document.querySelector('header a').href='/src/scene/world/open-world.dream';
if(botanyExamples)document.querySelector('header a').href='/docs/examples/plant-construction.dream';
if(furnitureExamples)document.querySelector('header a').href='/docs/examples/furniture-construction.dream';
if(coverExamples)document.querySelector('header a').href='/docs/examples/ground-cover.dream';
const items=(coverExamples ? compileDreamWorld(coverExample).assemblies.map(s=>({...s,voxelSize:1})) : utilityExamples ? compileDreamWorld(utilityExample).assemblies.map(s=>({...s,voxelSize:1})) : peopleExamples ? compileDreamWorld(personExample).assemblies.map(s=>({...s,voxelSize:1})) : params.has('materials') ? compileDreamWorld(materialExample).assemblies : allExamples || canopyExamples || botanyExamples || furnitureExamples || faunaExamples ? compileDreamWorld(worldSource,worldModules).assemblies : worldExamples ? interactiveWorld.assemblies : dreamExamples).filter(spec=>!focus.length || focus.includes(spec.displayName)).sort((a,b)=>faunaExamples ? focus.indexOf(a.displayName)-focus.indexOf(b.displayName) : 0).map(spec=>params.has('characters-before') ? priorCharacters.find(s=>s.displayName===spec.displayName && s.measure?.meters===spec.measure?.meters)??spec : params.has('tree-before') ? priorTrees.templates.find(t=>t.spec.displayName===spec.displayName)?.spec??spec : params.has('plants-before') ? priorPlants.templates.find(t=>t.spec.displayName===spec.displayName)?.spec??spec : spec).map(spec=>{
  const cell=document.createElement('article'),name=document.createElement('strong'),detail=document.createElement('small');
  if(focus.length || peopleExamples && params.has('capture'))cell.style.height=focusHeight;
  name.textContent=spec.displayName;detail.textContent=`${spec.parts.length} parts · ${spec.joints?.length??0} joints`;
  cell.append(name,detail);grid.append(cell);
  const scene=new THREE.Scene();scene.background=new THREE.Color(neutral ? '#e9e7df' : '#52714d');
  scene.add(new THREE.HemisphereLight('#bad4e2','#384736',1.25));
  const sun=new THREE.DirectionalLight('#ffe5b8',2.4);sun.position.set(-300,690,220);scene.add(sun);
  const group=buildObject({id:spec.displayName,kind:'custom',labelText:spec.displayName,x:0,y:0,scale:measuredScale(spec),spec});scene.add(group);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:neutral ? '#e9e7df' : '#52714d'}));
  floor.visible=!faunaExamples;floor.rotation.x=-Math.PI/2;floor.position.y=-.5;scene.add(floor);
  const bounds=new THREE.Box3().setFromObject(group,true);group.position.y-=bounds.min.y;bounds.setFromObject(group,true);const center=bounds.getCenter(new THREE.Vector3());
  const size=Math.max(...bounds.getSize(new THREE.Vector3()).toArray())*(params.has('materials') ? .4 : .76);
  return {cell,scene,group,center,size,meters:spec.measure?.meters??1,character:spec.joints?.some(j=>j.bone) ? new CharacterAnimator(group,spec) : undefined,phase:-1,camera:new THREE.OrthographicCamera(-1,1,1,-1,.1,2000)};
});
// Center a lone final specimen instead of leaving an unrendered atlas cell.
if(!faunaExamples && items.length%2===1 && (focus.length || items.length%4===1))items.at(-1).cell.style.gridColumn='1 / -1';
new ResizeObserver(()=>renderer.setSize(canvas.clientWidth,canvas.clientHeight,false)).observe(canvas);
let capturePhase,captureAngle;
const capture=peopleExamples || utilityExamples || canopyExamples || botanyExamples || coverExamples || furnitureExamples || faunaExamples ? mediaCapture(canvas,peopleExamples ? {wardrobe:240} : faunaExamples ? {fauna:240} : furnitureExamples ? {furniture:240} : coverExamples ? {cover:240} : botanyExamples ? {botany:240} : canopyExamples ? {canopy:240} : {utility:240},()=>{},(_clip,frame)=>{capturePhase=frame/30;captureAngle=frame/240*Math.PI*2;}) : undefined;
view.onchange=phase.onchange=()=>{capturePhase=captureAngle=undefined;};
renderer.setAnimationLoop(()=>{
  if(capture?.begin()===null)return;
  const time=capturePhase??Number(phase.value);worldTime.value=time;worldMotion.value=1;
  const bounds=canvas.getBoundingClientRect();
  renderer.setScissorTest(false);renderer.setClearColor(neutral ? '#e9e7df' : '#52714d');renderer.clear();renderer.setScissorTest(true);
  for(const item of items){
    const rect=item.cell.getBoundingClientRect(),aspect=rect.width/rect.height,half=Math.max(item.size,item.size/aspect);
    const camera=item.camera,angle=captureAngle??Number(view.value);
    Object.assign(camera,{left:-half*aspect,right:half*aspect,top:half,bottom:-half});camera.updateProjectionMatrix();
    camera.position.copy(item.center).add(new THREE.Vector3(110*Math.cos(angle)+150*Math.sin(angle),110,150*Math.cos(angle)-110*Math.sin(angle)));
    camera.lookAt(item.center);
    if(item.character){
      if(item.phase!==time){const first=item.phase>=0 && item.phase<=time ? Math.floor(item.phase*60) : 0;if(first===0)item.character.reset();for(let f=first;f<Math.floor(time*60);f++)item.character.update({speed:40,swimming:false,grounded:true,verticalSpeed:0,time:f/60,enabled:true},1/60);item.phase=time;}
    }else animateObject(item.group,time,true,time*(faunaExamples ? item.meters*3 : 40),0,Number(document.querySelector('#near').value));
    renderer.setViewport(rect.left-bounds.left,bounds.bottom-rect.bottom,rect.width,rect.height);
    renderer.setScissor(rect.left-bounds.left,bounds.bottom-rect.bottom,rect.width,rect.height);renderer.render(item.scene,camera);
  }
  document.body.dataset.ready='true';capture?.end();
});

// Export the complete rendered canvas, including rows below the browser viewport.
const download=document.createElement('button');download.textContent='Save PNG';document.querySelector('header').append(download);
download.onclick=()=>canvas.toBlob(blob=>{
 if(!blob)return;const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='dream-assets.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
