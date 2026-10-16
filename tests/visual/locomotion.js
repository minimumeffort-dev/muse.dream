import * as THREE from 'three';
import {interactiveWorld} from '../../src/scene/interactive-world';
import {measuredScale} from '../../src/scene/measure';
import {buildObject} from '../../src/game/world3d';
import {compactObject} from '../../src/game/compact-object';
import {CharacterAnimator} from '../../src/game/character-animation';
import {mediaCapture} from '../../src/game/media-capture';
const canvas=document.querySelector('canvas'),phase=document.querySelector('#phase'),view=document.querySelector('#view');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setScissorTest(true);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
let playing=true,time=0,last=performance.now();
document.querySelector('#motion').onclick=()=>{playing=!playing;document.querySelector('#motion').textContent=playing?'Pause animation':'Play animation';};
const spec={...interactiveWorld.assemblies.find(s=>s.displayName==='Explorer'),voxelSize:1};
const items=[55,95,48].map((speed,i)=>{
  const scene=new THREE.Scene();scene.background=new THREE.Color('#ecebe5');scene.add(new THREE.HemisphereLight('#c9dfed','#6f7458',1.4));const sun=new THREE.DirectionalLight('#ffedcf',2.4);sun.position.set(30,60,35);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-28,right:28,top:35,bottom:-20,near:1,far:150});sun.shadow.bias=-.0002;scene.add(sun);
  const group=compactObject(buildObject({id:'explorer',kind:'custom',labelText:'Explorer',x:0,y:0,scale:measuredScale(spec),spec}));scene.add(group);
  if(i===2)group.position.y=-11.375+.2;
  const floor=new THREE.Mesh(new THREE.BoxGeometry(120,1,120),new THREE.MeshToonMaterial({color:i===2?'#639a9d':'#c6c9bb',transparent:i===2,opacity:i===2?.5:1,depthWrite:i!==2}));floor.position.y=-.5;floor.receiveShadow=i!==2;scene.add(floor);
  const animation=new CharacterAnimator(group,spec),camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,500);
  return {scene,group,animation,camera,speed,swimming:i===2};
});
const pose=(item,t,dt)=>item.animation.update({speed:item.speed,swimming:item.swimming,grounded:true,verticalSpeed:0,time:t,enabled:true},dt);
phase.oninput=()=>{playing=false;time=Number(phase.value);document.querySelector('#motion').textContent='Play animation';for(const item of items){item.animation.reset();for(let f=0;f<Math.round(time*60);f++)pose(item,f/60,1/60);}};
const capture=mediaCapture(canvas,{character:180},()=>{time=0;items.forEach(i=>i.animation.reset());playing=true;},()=>{});
new ResizeObserver(()=>renderer.setSize(canvas.clientWidth,canvas.clientHeight,false)).observe(canvas);
renderer.setAnimationLoop(()=>{
  const stamp=performance.now(),exportDt=capture?.begin();if(exportDt===null)return;const dt=exportDt??Math.min(.05,(stamp-last)/1000);last=stamp;
  if(playing){time+=dt;phase.value=String(time%6);for(const item of items)pose(item,time,dt);}
  const w=canvas.clientWidth/3,h=canvas.clientHeight;
  for(let i=0;i<3;i++){
    const {camera,scene}=items[i],angle=Number(view.value),center=new THREE.Vector3(i===2?3:0,i===2?0:8,0),aspect=w/h;
    camera.left=-17;camera.right=17;camera.top=17/aspect;camera.bottom=-17/aspect;camera.updateProjectionMatrix();
    camera.position.copy(center).add(new THREE.Vector3(35*Math.cos(angle)-45*Math.sin(angle),27,45*Math.cos(angle)+35*Math.sin(angle)));camera.lookAt(center);
    renderer.setViewport(i*w,0,w,h);renderer.setScissor(i*w,0,w,h);renderer.render(scene,camera);
  }
  document.body.dataset.ready='true';capture?.end();
});
