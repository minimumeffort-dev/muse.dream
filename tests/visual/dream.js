import * as THREE from 'three';
import { dreamExamples } from '../../src/scene/dream-creations';
import { buildObject, animateObject } from '../../src/game/world3d';
import { worldTime, worldMotion } from '../../src/game/shaders';
import { interactiveWorld } from '../../src/scene/interactive-world';

const canvas=document.querySelector('canvas'),grid=document.querySelector('.grid');
const view=document.querySelector('#view'),phase=document.querySelector('#phase');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setScissorTest(true);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const worldExamples=new URLSearchParams(location.search).has('world');
if(worldExamples)document.querySelector('header a').href='/src/scene/interactive-world.dream';
const items=(worldExamples ? interactiveWorld.assemblies : dreamExamples).map(spec=>{
  const cell=document.createElement('article'),name=document.createElement('strong'),detail=document.createElement('small');
  name.textContent=spec.displayName;detail.textContent=`${spec.parts.length} parts · ${spec.joints?.length??0} joints`;
  cell.append(name,detail);grid.append(cell);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#52714d');
  scene.add(new THREE.HemisphereLight('#bad4e2','#384736',1.25));
  const sun=new THREE.DirectionalLight('#ffe5b8',2.4);sun.position.set(-300,690,220);scene.add(sun);
  const group=buildObject({id:spec.displayName,kind:'custom',labelText:spec.displayName,x:0,y:0,scale:1,spec});scene.add(group);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({color:'#52714d'}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.5;scene.add(floor);
  const bounds=new THREE.Box3().setFromObject(group,true);group.position.y-=bounds.min.y;bounds.setFromObject(group,true);const center=bounds.getCenter(new THREE.Vector3());
  const size=Math.max(...bounds.getSize(new THREE.Vector3()).toArray())*.76;
  return {cell,scene,group,center,size,camera:new THREE.OrthographicCamera(-1,1,1,-1,.1,2000)};
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
    camera.lookAt(item.center);animateObject(item.group,time,true,time*40,0,Number(document.querySelector('#near').value));
    renderer.setViewport(rect.left-bounds.left,bounds.bottom-rect.bottom,rect.width,rect.height);
    renderer.setScissor(rect.left-bounds.left,bounds.bottom-rect.bottom,rect.width,rect.height);renderer.render(item.scene,camera);
  }
  document.body.dataset.ready='true';
});
