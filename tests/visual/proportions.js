import * as THREE from 'three';
import {createWorldScene} from '../../src/scene/world-fixture';
import {buildObject} from '../../src/game/world3d';
import {measuredScale} from '../../src/scene/measure';
import {compileDream} from '../../src/scene/dream';
import creations from '../../src/scene/world/creations.dream?raw';

const world=createWorldScene(),canvas=document.querySelector('canvas'),footer=document.querySelector('footer');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#52714d');scene.add(new THREE.HemisphereLight('#bcd4e2','#384736',1.1));
const sun=new THREE.DirectionalLight('#ffe5bc',2.4);sun.position.set(-150,350,180);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-240,right:240,top:200,bottom:-200,near:1,far:800});scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(1000,600),new THREE.MeshStandardMaterial({color:'#52714d'}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(1000,100,'#a7b497','#718968');grid.position.y=.02;grid.material.transparent=true;grid.material.opacity=.25;scene.add(grid);
const bread=compileDream(creations).find(s=>s.displayName==='Crusty bread');
const examples=[['Birch',-150],['Cloudhopper plane',-65],['Little rally car',10],['Commuter',48],['Meadow bicycle',78],['Slatted park bench',108],['Maple skateboard',138],['Crusty bread',158]];
const metrics=[];
for(const [name,x] of examples){
  const spec=name===world.player.displayName ? world.player : name==='Crusty bread' ? bread : world.objects.find(o=>o.spec.displayName===name).spec;
  const scale=measuredScale(spec),group=buildObject({id:name,kind:'custom',labelText:name,x:0,y:0,scale,spec});
  group.position.set(x,0,0);group.position.y-=new THREE.Box3().setFromObject(group,true).min.y;scene.add(group);
  const label=document.createElement('span'),title=document.createElement('b');title.textContent=name;label.append(title,`${spec.measure.meters} m · ${spec.measure.axis.toUpperCase()}`);footer.append(label);
  metrics.push({name,meters:spec.measure.meters,axis:spec.measure.axis,scale,size:new THREE.Box3().setFromObject(group,true).getSize(new THREE.Vector3()).toArray()});
}
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1200);camera.position.set(15,190,340);camera.lookAt(0,35,0);
function render(){const width=canvas.clientWidth,height=canvas.clientHeight,half=Math.max(108,190*height/width);renderer.setSize(width,height,false);Object.assign(camera,{left:-half*width/height,right:half*width/height,top:half,bottom:-half});camera.updateProjectionMatrix();renderer.render(scene,camera);document.body.dataset.ready='true';document.body.dataset.metrics=JSON.stringify(metrics);}
new ResizeObserver(render).observe(canvas);render();
