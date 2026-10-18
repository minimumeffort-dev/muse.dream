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

const canvas=document.querySelector('canvas'),grid=document.querySelector('.grid');
const view=document.querySelector('#view'),phase=document.querySelector('#phase');
// Review-only: retain native pixels for documentation exports between frames.
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setScissorTest(true);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const params=new URLSearchParams(location.search),focus=params.getAll('asset');
const peopleExamples=params.has('people');
if(peopleExamples){document.body.classList.add('people');document.querySelector('header a').href='/docs/examples/city-person.dream';}
const worldExamples=params.has('world');
const allExamples=params.has('all');
// A full native-resolution atlas must fit within the WebGL renderbuffer height.
// The ordinary responsive two-column view can exceed it with the full asset library.
if(params.has('sheet')){document.body.style.width='1600px';grid.style.gridTemplateColumns='repeat(4,1fr)';}
const focusHeight=focus.length>2 ? '360px' : '650px';
if(focus.length){grid.style.gridTemplateColumns=`repeat(${Math.min(2,focus.length)},1fr)`;document.querySelector('main').style.setProperty('min-height',focusHeight);}
if(worldExamples)document.querySelector('header a').href='/src/scene/interactive-world.dream';
if(allExamples)document.querySelector('header a').href='/src/scene/world/open-world.dream';
const items=(peopleExamples ? compileDreamWorld(personExample).assemblies.map(s=>({...s,voxelSize:1})) : params.has('materials') ? compileDreamWorld(materialExample).assemblies : allExamples ? compileDreamWorld(worldSource,worldModules).assemblies : worldExamples ? interactiveWorld.assemblies : dreamExamples).filter(spec=>!focus.length || focus.includes(spec.displayName)).map(spec=>{
  const cell=document.createElement('article'),name=document.createElement('strong'),detail=document.createElement('small');
  if(focus.length)cell.style.height=focusHeight;
  name.textContent=spec.displayName;detail.textContent=`${spec.parts.length} parts · ${spec.joints?.length??0} joints`;
  cell.append(name,detail);grid.append(cell);
  const scene=new THREE.Scene();scene.background=new THREE.Color(peopleExamples ? '#e9e7df' : '#52714d');
  scene.add(new THREE.HemisphereLight('#bad4e2','#384736',1.25));
  const sun=new THREE.DirectionalLight('#ffe5b8',2.4);sun.position.set(-300,690,220);scene.add(sun);
  const group=buildObject({id:spec.displayName,kind:'custom',labelText:spec.displayName,x:0,y:0,scale:measuredScale(spec),spec});scene.add(group);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({color:peopleExamples ? '#e9e7df' : '#52714d'}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.5;scene.add(floor);
  const bounds=new THREE.Box3().setFromObject(group,true);group.position.y-=bounds.min.y;bounds.setFromObject(group,true);const center=bounds.getCenter(new THREE.Vector3());
  const size=Math.max(...bounds.getSize(new THREE.Vector3()).toArray())*(params.has('materials') ? .4 : .76);
  return {cell,scene,group,center,size,character:spec.joints?.some(j=>j.bone) ? new CharacterAnimator(group,spec) : undefined,phase:-1,camera:new THREE.OrthographicCamera(-1,1,1,-1,.1,2000)};
});
new ResizeObserver(()=>renderer.setSize(canvas.clientWidth,canvas.clientHeight,false)).observe(canvas);
renderer.setAnimationLoop(()=>{
  const time=Number(phase.value);worldTime.value=time;worldMotion.value=1;
  const bounds=canvas.getBoundingClientRect();
  for(const item of items){
    const rect=item.cell.getBoundingClientRect(),aspect=rect.width/rect.height,half=Math.max(item.size,item.size/aspect);
    const camera=item.camera,angle=Number(view.value);
    Object.assign(camera,{left:-half*aspect,right:half*aspect,top:half,bottom:-half});camera.updateProjectionMatrix();
    camera.position.copy(item.center).add(new THREE.Vector3(110*Math.cos(angle)+150*Math.sin(angle),110,150*Math.cos(angle)-110*Math.sin(angle)));
    camera.lookAt(item.center);
    if(item.character){
      if(item.phase!==time){item.character.reset();for(let f=0;f<time*60;f++)item.character.update({speed:40,swimming:false,grounded:true,verticalSpeed:0,time:f/60,enabled:true},1/60);item.phase=time;}
    }else animateObject(item.group,time,true,time*40,0,Number(document.querySelector('#near').value));
    renderer.setViewport(rect.left-bounds.left,bounds.bottom-rect.bottom,rect.width,rect.height);
    renderer.setScissor(rect.left-bounds.left,bounds.bottom-rect.bottom,rect.width,rect.height);renderer.render(item.scene,camera);
  }
  document.body.dataset.ready='true';
});

// Export the complete rendered canvas, including rows below the browser viewport.
const download=document.createElement('button');download.textContent='Save PNG';document.querySelector('header').append(download);
download.onclick=()=>canvas.toBlob(blob=>{
 if(!blob)return;const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='dream-assets.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
