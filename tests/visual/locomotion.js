import * as THREE from 'three';
import {interactiveWorld} from '../../src/scene/interactive-world';
import {measuredScale} from '../../src/scene/measure';
import {buildObject} from '../../src/game/world3d';
import {compactObject} from '../../src/game/compact-object';
import {CharacterAnimator} from '../../src/game/character-animation';
import {ambientPrototype} from '../../src/game/ambient-population';
import {ambientMaterial} from '../../src/game/shaders';
import {FootPlants,humanoidSoles,gaitStride,gaitRun,gaitStance,gaitPlantReach,strideFoot} from '../../src/game/humanoid-gait';
import {mediaCapture} from '../../src/game/media-capture';
const canvas=document.querySelector('canvas'),phase=document.querySelector('#phase'),view=document.querySelector('#view'),path=document.querySelector('#path');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setScissorTest(true);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
let playing=true,time=0,last=performance.now();
document.querySelector('#motion').onclick=()=>{playing=!playing;document.querySelector('#motion').textContent=playing?'Pause animation':'Play animation';};
const spec={...interactiveWorld.assemblies.find(s=>s.displayName==='Explorer'),voxelSize:1};
const items=[{speed:14},{speed:14,gpu:true},{speed:55},{speed:48,swimming:true}].map(({speed,gpu,swimming})=>{
  const scene=new THREE.Scene();scene.background=new THREE.Color('#ecebe5');scene.add(new THREE.HemisphereLight('#c9dfed','#6f7458',1.4));const sun=new THREE.DirectionalLight('#ffedcf',2.4);sun.position.set(30,60,35);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-28,right:28,top:35,bottom:-20,near:1,far:150});sun.shadow.bias=-.0002;scene.add(sun);
  const object={id:'explorer',kind:'custom',labelText:'Explorer',x:0,y:0,scale:measuredScale(spec),spec};
  let group;
  if(gpu){
    group=new THREE.Group();group.scale.setScalar(object.scale);const prototype=ambientPrototype(object),soles=humanoidSoles(spec);
    for(const child of prototype.children){const geometry=child.geometry;geometry.setAttribute('popCycle',new THREE.InstancedBufferAttribute(new Float32Array([0,0,0]),3));geometry.setAttribute('popPlant',new THREE.InstancedBufferAttribute(new Float32Array(4),4));geometry.setAttribute('popFacing',new THREE.InstancedBufferAttribute(new Float32Array(2),2));geometry.setAttribute('popLift',new THREE.InstancedBufferAttribute(new Float32Array(2),2));
      const mesh=new THREE.InstancedMesh(geometry,ambientMaterial(child.material,spec.joints,false,false,soles,true),1);mesh.setMatrixAt(0,new THREE.Matrix4());mesh.castShadow=mesh.receiveShadow=true;
      mesh.customDepthMaterial=ambientMaterial(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),spec.joints,true,false,soles,true);group.add(mesh);
    }
  }else group=compactObject(buildObject(object));scene.add(group);
  if(swimming)group.position.y=-11.375+.2;
  const floor=new THREE.Mesh(new THREE.BoxGeometry(2000,1,2000),new THREE.MeshToonMaterial({color:swimming?'#639a9d':'#c6c9bb',transparent:!!swimming,opacity:swimming?.5:1,depthWrite:!swimming}));floor.position.y=-.5;floor.receiveShadow=!swimming;scene.add(floor);
  const grid=swimming ? undefined : new THREE.GridHelper(2000,400,0xb2b4aa,0xb2b4aa);if(grid){grid.position.y=.01;scene.add(grid);}
  const hips=['left','right'].map(side=>spec.joints.find(j=>j.bone===side+'_hip').position[2]),reaches=['left','right'].map(side=>gaitPlantReach(-spec.joints.find(j=>j.bone===side+'_knee').position[1],-spec.joints.find(j=>j.bone===side+'_ankle').position[1]));
  const animation=gpu ? undefined : new CharacterAnimator(group,spec),camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,500);
  return {scene,group,animation,camera,sun,floor,grid,speed,swimming,gpu,hips,reaches,plants:new FootPlants(),cycle:gaitStance(0)/2,amount:0};
});
const pose=(item,t,dt)=>{
 const speed=item.speed*(path.value!=='straight' && !item.swimming ? Math.min(1,t/.8)*Number(t<4.5) : 1),heading=item.swimming ? 0 : path.value==='reverse' ? Number(t>=2)*Math.PI : path.value==='turn' ? Math.min(Math.PI/2,Math.max(0,t-1.5)*.75) : 0;
 item.group.position.x+=Math.cos(heading)*speed*dt;item.group.position.z+=Math.sin(heading)*speed*dt;item.group.rotation.y=-heading;
 item.floor.position.x=Math.floor(item.group.position.x/5)*5;item.floor.position.z=Math.floor(item.group.position.z/5)*5;if(item.grid){item.grid.position.x=item.floor.position.x;item.grid.position.z=item.floor.position.z;}
 const travel={x:item.group.position.x,z:item.group.position.z,heading};
 if(item.animation)item.animation.update({travel,speed,swimming:!!item.swimming,grounded:true,verticalSpeed:0,time:t,enabled:true},dt);
 else{
  const unit=spec.joints.find(j=>j.bone==='root').position[1]/25,scale=measuredScale(spec);
  item.cycle+=speed*dt/(scale*unit*gaitStride(gaitRun(speed)));item.amount+=(Number(speed>.01)-item.amount)*(1-Math.exp(-dt*12));item.plants.begin(travel,scale*unit,dt);
  const {hips,reaches}=item;
  const feet=[0,1].map(i=>{const f=strideFoot(item.cycle+i*.5,0);return item.plants.sample(i,travel,scale,f.x*unit*item.amount,hips[i],f.y===0 || item.amount<.001,Math.floor(item.cycle+i*.5),unit,reaches[i]);});
  for(const mesh of item.group.children){mesh.geometry.getAttribute('popCycle').setXYZ(0,t,item.cycle,item.amount);mesh.geometry.getAttribute('popPlant').setXYZW(0,feet[0].x,feet[0].z-hips[0],feet[1].x,feet[1].z-hips[1]);mesh.geometry.getAttribute('popFacing').setXY(0,feet[0].yaw,feet[1].yaw);mesh.geometry.getAttribute('popLift').setXY(0,feet[0].lift,feet[1].lift);for(const name of ['popCycle','popPlant','popFacing','popLift'])mesh.geometry.getAttribute(name).needsUpdate=true;}
 }
};
const reset=()=>{time=0;for(const item of items){item.animation?.reset();item.plants.reset();item.cycle=gaitStance(0)/2;item.amount=0;item.group.position.x=item.group.position.z=0;pose(item,0,0);}};
phase.oninput=()=>{const end=Number(phase.value);reset();playing=false;time=end;document.querySelector('#motion').textContent='Play animation';for(let f=1;f<=Math.round(time*60);f++)for(const item of items)pose(item,f/60,1/60);};
path.onchange=()=>{reset();playing=true;document.querySelector('#motion').textContent='Pause animation';};
const capture=mediaCapture(canvas,{character:180},()=>{reset();playing=true;},()=>{});
reset();
new ResizeObserver(()=>renderer.setSize(canvas.clientWidth,canvas.clientHeight,false)).observe(canvas);
renderer.setAnimationLoop(()=>{
  const stamp=performance.now(),exportDt=capture?.begin();if(exportDt===null)return;const dt=exportDt??Math.min(.05,(stamp-last)/1000);last=stamp;
  if(playing){time+=dt;phase.value=String(time%6);for(const item of items)pose(item,time,dt);}
  const w=canvas.clientWidth/items.length,h=canvas.clientHeight;
  for(let i=0;i<items.length;i++){
    const {camera,scene,group,sun,swimming}=items[i],angle=Number(view.value),center=new THREE.Vector3(group.position.x+(swimming?3:0),swimming?0:8,group.position.z),aspect=w/h;
    camera.left=-17;camera.right=17;camera.top=17/aspect;camera.bottom=-17/aspect;camera.updateProjectionMatrix();
    camera.position.copy(center).add(new THREE.Vector3(35*Math.cos(angle)-45*Math.sin(angle),27,45*Math.cos(angle)+35*Math.sin(angle)));camera.lookAt(center);
    sun.position.x=group.position.x+30;sun.position.z=group.position.z+35;sun.target.position.x=group.position.x;sun.target.position.z=group.position.z;sun.target.updateMatrixWorld();
    renderer.setViewport(i*w,0,w,h);renderer.setScissor(i*w,0,w,h);renderer.render(scene,camera);
  }
  document.body.dataset.ready='true';capture?.end();
});
