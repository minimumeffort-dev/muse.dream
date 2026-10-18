import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {Vector3,Quaternion} from 'three';
const baseline='ff88bb13a44c6df3a75b2b15c5c8a5b2e1f535f9',dir=await mkdtemp(resolve('.npm-cache/swing-before-'));
const open=root=>createServer({root,configFile:false,cacheDir:resolve('.npm-cache/swing-check'),optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom'});
let before,after;
try{
 execFileSync('tar',['-x','-C',dir],{input:execFileSync('git',['archive',baseline,'src','package.json'],{maxBuffer:64*1024*1024})});before=await open(dir);after=await open(process.cwd());
 async function measure(vite){
  const {CharacterAnimator}=await vite.ssrLoadModule('/src/game/character-animation.ts'),{buildObject}=await vite.ssrLoadModule('/src/game/world3d.ts'),{interactiveWorld}=await vite.ssrLoadModule('/src/scene/interactive-world.ts');
  const spec=interactiveWorld.assemblies.find(s=>s.displayName==='Explorer'),rows=[];
  for(const velocity of [14,55,95])for(const fps of [30,60,144])for(const mode of ['straight','curve','reverse','restart']){
   const scale=.306,group=buildObject({id:'check',kind:'custom',labelText:'Check',x:0,y:0,scale,spec}),anim=new CharacterAnimator(group,spec),ankles=['left','right'].map(side=>group.getObjectByName(spec.joints.find(j=>j.bone===side+'_ankle').id));
   let x=0,z=0,maxHorizontalStep=0,maxContactDrift=0,minPelvis=Infinity,contacts=0;const previous=[];
   for(let f=0;f<fps*6;f++){
    const t=f/fps,heading=mode==='reverse'?Number(t>=1.15)*Math.PI:mode==='curve'?Math.min(1.6,Math.max(0,t-.8)*1.3):0,speed=mode==='restart'&&t>=1.2&&t<3?0:velocity;
    x+=Math.cos(heading)*speed/fps;z+=Math.sin(heading)*speed/fps;group.position.set(x,0,z);group.rotation.y=-heading;
    anim.update({speed,travel:{x,z,heading},swimming:false,grounded:true,verticalSpeed:0,time:t,enabled:true},1/fps);group.updateMatrixWorld(true);
    minPelvis=Math.min(minPelvis,group.getObjectByName(spec.joints.find(j=>j.bone==='root').id).position.y);
    for(const [i,ankle] of ankles.entries()){
     const p=ankle.getWorldPosition(new Vector3()),flat=new Vector3(0,1,0).applyQuaternion(ankle.getWorldQuaternion(new Quaternion())).y>1-1e-12,old=previous[i];
     if(old){const step=Math.hypot(p.x-old.p.x,p.z-old.p.z);maxHorizontalStep=Math.max(maxHorizontalStep,step);if(flat&&old.flat){maxContactDrift=Math.max(maxContactDrift,step);contacts++;}}
     previous[i]={p,flat};
    }
   }
   rows.push({speed:velocity,fps,mode,maxHorizontalStep,maxHorizontalSpeed:maxHorizontalStep*fps,maxContactDrift,contacts,minPelvisLocal:minPelvis});
  }return rows;
 }
 const old=await measure(before),fixed=await measure(after);assert(old.filter(r=>r.mode==='reverse'&&r.speed===14).every(r=>r.maxHorizontalStep>7));assert(fixed.every(r=>r.maxHorizontalSpeed<r.speed*4+1&&r.maxContactDrift<.002&&r.minPelvisLocal>16));
 const {createWorldScene}=await after.ssrLoadModule('/src/scene/world-fixture.ts'),{saveCompatibilitySource,INVITATION_COMPATIBILITY}=await after.ssrLoadModule('/src/scene/save-compatibility.ts'),{AmbientPopulation}=await after.ssrLoadModule('/src/game/ambient-population.ts');
 const scene=createWorldScene(),fingerprint=createHash('sha256').update(saveCompatibilitySource(scene)).digest('hex');assert.equal(fingerprint,INVITATION_COMPATIBILITY);
 const population=new AmbientPopulation(scene),PreviousPopulation=(await before.ssrLoadModule('/src/game/ambient-population.ts')).AmbientPopulation,previousPopulation=new PreviousPopulation(scene);assert.equal(population.group.children.length,previousPopulation.group.children.length);assert.deepEqual(population.group.children.map(m=>m.geometry.index.count),previousPopulation.group.children.map(m=>m.geometry.index.count));const extraBytes=population.group.children.reduce((n,m)=>n+(m.geometry.getAttribute('popLift')?.array.byteLength??0),0),result={baseline,revision:scene.revisionId,fingerprint,objects:scene.objects.length,ambient:population.count,extraResidentLiftAttributeBytes:extraBytes,draws:population.group.children.length,units:'World units (10 per metre), flat support-plane rig checks. Rendered step rates are synthetic sampling, not browser FPS or independent review.',before:old,after:fixed};
 await writeFile('docs/evidence/walking-swing/metrics.json',JSON.stringify(result,null,2)+'\n');console.log({walkingBeforeMaxStep:Math.max(...old.filter(r=>r.speed===14).map(r=>r.maxHorizontalStep)),walkingAfterMaxStep:Math.max(...fixed.filter(r=>r.speed===14).map(r=>r.maxHorizontalStep)),maxContactDrift:Math.max(...fixed.map(r=>r.maxContactDrift)),minPelvisLocal:Math.min(...fixed.map(r=>r.minPelvisLocal)),extraBytes,fingerprint});
}finally{await before?.close();await after?.close();await rm(dir,{recursive:true,force:true});}
