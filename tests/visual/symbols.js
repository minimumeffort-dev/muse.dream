import * as THREE from 'three';
import {icon} from '../../src/game/icons';
import {buildStreets} from '../../src/game/streets';
import {parseScene} from '../../src/scene/schema';
import {createFixtureScene} from '../../src/scene/fixture';
import {cameraPosition} from '../../src/game/camera';
for(const name of ['food','bicycle'])document.getElementById(name).innerHTML=['small','','large'].map(size=>`<span class="sample ${size}">${icon(name)}<span>${name==='food' ? 'Eat' : 'Ride'}</span></span>`).join('');
const street={id:'main',width:100,cycleWidth:20,sidewalk:20,points:[{x:100,y:360},{x:850,y:360}]};
const doc=parseScene({...createFixtureScene(),objects:[],regions:[],terrain:{hills:[]},streets:[street],voxelWorld:{objectCell:1,groundCell:8,heightStep:1}});
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=false;
const scene=new THREE.Scene();scene.background=new THREE.Color('#526b42');scene.add(new THREE.HemisphereLight('#fff9e5','#50653e',2));const light=new THREE.DirectionalLight('#ffe9be',2);light.position.set(100,500,200);scene.add(light);
const streets=buildStreets(doc);scene.add(streets);const camera=new THREE.OrthographicCamera(-200,200,100,-100,1,4000),focus=new THREE.Vector3(550-480,0,360-360);let angle=0;
function draw(){renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.left=-155*canvas.clientWidth/canvas.clientHeight;camera.right=-camera.left;camera.top=155;camera.bottom=-155;camera.updateProjectionMatrix();const p=cameraPosition({x:focus.x,y:focus.y,z:focus.z},angle);camera.position.set(p.x,p.y,p.z);camera.lookAt(focus);renderer.render(scene,camera);document.body.dataset.ready='true';}
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{angle=Number(button.dataset.view);for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b===button));draw();});
new ResizeObserver(draw).observe(canvas);draw();document.getElementById('status').textContent='Actual renderer · both directions · terrain-projected paint · no physical or simulation changes';
