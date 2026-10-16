import * as THREE from 'three';
import source from '../../docs/examples/toppling-tree.dream?raw';
import {compileDream} from '../../src/scene/dream';
import {measuredScale} from '../../src/scene/measure';
import {buildObject} from '../../src/game/world3d';

import {highlightDream} from '../../docs/site/dream-highlight.mjs';
import {DREAM_V2_COMMANDS} from '../../src/scene/dream-contract';
document.querySelector('pre').innerHTML=highlightDream(source,DREAM_V2_COMMANDS);
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#405a43');scene.add(new THREE.HemisphereLight('#c5d6df','#34462f',1.1));
const sun=new THREE.DirectionalLight('#ffe6ba',2.3);sun.position.set(-100,220,180);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-100,right:100,top:150,bottom:-100,far:500});scene.add(sun);
const spec=compileDream(source)[0],tree=buildObject({id:'oak',kind:'custom',labelText:spec.displayName,x:0,y:0,scale:measuredScale(spec),spec});scene.add(tree);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(700,700),new THREE.MeshStandardMaterial({color:'#405a43'}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000);camera.position.set(140,130,200);camera.lookAt(-3,50,0);
function render(){const w=canvas.clientWidth,h=canvas.clientHeight,half=95;renderer.setSize(w,h,false);Object.assign(camera,{left:-half*w/h,right:half*w/h,top:half,bottom:-half});camera.updateProjectionMatrix();renderer.render(scene,camera);document.body.dataset.ready='true';}
new ResizeObserver(render).observe(canvas);render();
