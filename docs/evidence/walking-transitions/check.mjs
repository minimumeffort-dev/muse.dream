import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {Vector3,Quaternion} from 'three';
const baseline='e7045c74bb1fefab8ae4f52401605c4cf39e48a3',dir=await mkdtemp(resolve('.npm-cache/walking-before-'));
const open=root=>createServer({root,configFile:false,cacheDir:resolve('.npm-cache/walking-check'),optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom'});
let before,after;
try{
 execFileSync('tar',['-x','-C',dir],{input:execFileSync('git',['archive',baseline,'src','package.json'],{maxBuffer:64*1024*1024})});
 before=await open(dir);after=await open(process.cwd());
 async function check(vite,reverse){
  const {CharacterAnimator}=await vite.ssrLoadModule('/src/game/character-animation.ts'),{buildObject}=await vite.ssrLoadModule('/src/game/world3d.ts'),{interactiveWorld}=await vite.ssrLoadModule('/src/scene/interactive-world.ts');
  const spec=interactiveWorld.assemblies.find(s=>s.displayName==='Explorer'),rows=[];
  for(const scale of reverse ? [.306] : [.2,.306,1,2])for(const speed of reverse ? [14] : [4,14,35,55,95])for(const fps of [30,60,144])for(const turn of reverse ? [0,Math.PI/2,Math.PI] : [Math.PI/2]){
   const group=buildObject({id:'check',kind:'custom',labelText:'Walking check',x:0,y:0,scale,spec}),animation=new CharacterAnimator(group,spec),ankles=['left','right'].map(side=>group.getObjectByName(spec.joints.find(j=>j.bone===`${side}_ankle`).id));
   const previous=[null,null],rotation=new Quaternion();let x=0,z=0,maxDrift=0,contacts=0;
   for(let f=0;f<(reverse ? 4 : 8)*fps;f++){
    const t=f/fps,v=reverse ? t<3 ? speed : 0 : t<1 ? speed*t : t<5 ? speed : 0,heading=reverse ? t>1 ? turn : 0 : Math.min(turn,Math.max(0,t-2)*.5);
    x+=Math.cos(heading)*v/fps;z+=Math.sin(heading)*v/fps;group.position.set(x,0,z);group.rotation.y=-heading;
    animation.update({speed:v,travel:{x,z,heading},swimming:false,grounded:true,verticalSpeed:0,time:t,enabled:true},1/fps);group.updateMatrixWorld(true);
    for(const [i,ankle] of ankles.entries()){
     const flat=new Vector3(0,1,0).applyQuaternion(ankle.getWorldQuaternion(rotation)).y>1-1e-12,p=ankle.getWorldPosition(new Vector3());
     if(flat && previous[i]){contacts++;maxDrift=Math.max(maxDrift,Math.hypot(p.x-previous[i].x,p.z-previous[i].z));}previous[i]=flat ? p : null;
    }
   }
   assert(contacts>40);rows.push({scale,speed,fps,turn,contacts,maxDrift});
  }
  return rows;
 }
 const old=await check(before,true),fixed=await check(after,true),steady=await check(after,false);
 assert(old.filter(r=>r.turn===Math.PI).every(r=>r.maxDrift>3));assert([...fixed,...steady].every(r=>r.maxDrift<.002));
 const {createWorldScene}=await after.ssrLoadModule('/src/scene/world-fixture.ts'),{saveCompatibilitySource,PEOPLE_COMPATIBILITY}=await after.ssrLoadModule('/src/scene/save-compatibility.ts'),{gaitStride}=await after.ssrLoadModule('/src/game/humanoid-gait.ts');
 const scene=createWorldScene(),fingerprint=createHash('sha256').update(saveCompatibilitySource(scene)).digest('hex');assert.equal(fingerprint,PEOPLE_COMPATIBILITY);
 const result={baseline,revision:scene.revisionId,fingerprint,objects:scene.objects.length,ambient:scene.objects.filter(o=>o.ambient).length,strideAtScale306Meters:gaitStride(0)*.306/10,units:'Horizontal ankle displacement between consecutive flat-sole samples, in world units. Flat plane rig checks, not browser FPS or independent animation review.',before:old,after:fixed,curves:steady};
 await writeFile('docs/evidence/walking-transitions/metrics.json',JSON.stringify(result,null,2)+'\n');console.log({fingerprint,beforeMax:Math.max(...old.map(r=>r.maxDrift)),afterMax:Math.max(...fixed.map(r=>r.maxDrift)),curveCases:steady.length,curveMax:Math.max(...steady.map(r=>r.maxDrift)),strideMeters:result.strideAtScale306Meters});
}finally{await before?.close();await after?.close();await rm(dir,{recursive:true,force:true});}
