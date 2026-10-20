import * as THREE from 'three';
import {groundMaterial,roadMaterial,sceneryMaterial,sceneryDepthMaterial,terrainPlayer,terrainView,toonMaterial} from '../../src/game/shaders';

const reports=[];
for(const kind of ['scenery','terrain','road'] as const){
 const section=document.createElement('section'),title=document.createElement('h2'),output=document.createElement('output');title.textContent=kind;section.append(title);document.querySelector('#cases')!.append(section);
 const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(600,320);renderer.shadowMap.enabled=true;section.append(renderer.domElement,output);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#fafaf7');scene.add(new THREE.HemisphereLight('#ffffff','#ffffff',2));
 const light=new THREE.DirectionalLight('#ffffff',1);light.position.set(30,80,40);light.castShadow=true;light.shadow.mapSize.set(64,64);Object.assign(light.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:200});scene.add(light,light.target);
 const camera=new THREE.OrthographicCamera(-90,90,48,-48,1,200);camera.position.set(0,25,50);camera.lookAt(0,3,0);camera.updateMatrixWorld();terrainView.value.copy(camera.position).sub(new THREE.Vector3(0,3,0)).normalize();
 const geometry=new THREE.BoxGeometry(50,48,2),visibility=new THREE.InstancedBufferAttribute(new Float32Array([1,1]),1);geometry.setAttribute('visibility',visibility);
 geometry.setAttribute('pivot',new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count*3),3));geometry.setAttribute('spinAxis',new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count*3),3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count*3).fill(.45),3));
 const material=kind==='scenery' ? sceneryMaterial(toonMaterial('#808080')) : kind==='terrain' ? groundMaterial() : roadMaterial();
 const wall=new THREE.InstancedMesh(geometry,material,2);wall.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,12,20));wall.setMatrixAt(1,new THREE.Matrix4().makeTranslation(60,12,20));wall.castShadow=true;wall.customDepthMaterial=sceneryDepthMaterial();scene.add(wall);
 const player=new THREE.Mesh(new THREE.BoxGeometry(4,6,3),new THREE.MeshBasicMaterial({color:'#ef3333'}));player.position.set(0,3,0);scene.add(player);
 const target=new THREE.WebGLRenderTarget(600,320),pixels=new Uint8Array(600*320*4),projected=new THREE.Vector3();
 const draw=(reveal=true)=>{terrainPlayer.value.copy(player.position);if(!reveal)terrainPlayer.value.x+=1000;renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,600,320,pixels);};
 const probe=()=>{projected.copy(player.position).project(camera);const cx=Math.round((projected.x*.5+.5)*600),cy=Math.round((projected.y*.5+.5)*320);let blocked=0;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const at=((cy+dy)*600+cx+dx)*4;blocked+=Number(pixels[at]!<pixels[at+1]!*2);}return blocked;};
 const shadow=()=>{const data=new Uint8Array(64*64*4);renderer.readRenderTargetPixels(light.shadow.map!,0,0,64,64,data);return data;};
 draw(false);const baseline=pixels.slice(),shadowBefore=shadow(),opaqueBlocked=probe(),shadowValueCount=new Set(Array.from({length:64*64},(_,i)=>shadowBefore.slice(i*4,i*4+4).join(','))).size;visibility.setX(0,.22);visibility.needsUpdate=true;
 let blocked=0,total=0,neighbourChanged=0,shadowChanged=0;
 for(let frame=0;frame<8;frame++){
  player.position.x=frame*2-7;draw();blocked+=probe();total+=9;
  projected.set(60,12,20).project(camera);const at=(Math.round((projected.y*.5+.5)*320)*600+Math.round((projected.x*.5+.5)*600))*4;neighbourChanged+=Number(pixels.slice(at,at+4).some((n,i)=>n!==baseline[at+i]));
  shadowChanged+=Number(shadow().some((n,i)=>n!==shadowBefore[i]));
 }
 visibility.setX(0,1);visibility.needsUpdate=true;draw(kind==='scenery');const restoredBlocked=probe();
 let midRevealBlocked=0;if(kind==='scenery'){visibility.setX(0,.61);visibility.needsUpdate=true;draw();midRevealBlocked=probe();}
 let hiddenBlocked=0;if(kind==='scenery'){visibility.setX(0,0);visibility.needsUpdate=true;draw(false);hiddenBlocked=probe();shadowChanged+=Number(shadow().some((n,i)=>n!==shadowBefore[i]));projected.set(60,12,20).project(camera);const at=(Math.round((projected.y*.5+.5)*320)*600+Math.round((projected.x*.5+.5)*600))*4;neighbourChanged+=Number(pixels.slice(at,at+4).some((n,i)=>n!==baseline[at+i]));}
 visibility.setX(0,.22);visibility.needsUpdate=true;player.position.x=0;terrainPlayer.value.copy(player.position);renderer.setRenderTarget(null);renderer.render(scene,camera);
 const report={kind,blocked,total,opaqueBlocked,restoredBlocked,midRevealBlocked,hiddenBlocked,neighbourChanged,shadowChanged,shadowValueCount,passed:blocked===0 && opaqueBlocked===9 && restoredBlocked===9 && midRevealBlocked===0 && hiddenBlocked===0 && neighbourChanged===0 && shadowChanged===0 && shadowValueCount>1};reports.push(report);output.textContent=JSON.stringify(report);
 target.dispose();
}
document.body.dataset.cutaway=JSON.stringify(reports);
if(reports.some(r=>!r.passed))throw Error('Cutaway visibility, restoration or shadow regression');
