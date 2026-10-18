import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {Vector3,OrthographicCamera,DirectionalLight} from 'three';
const baseline='6fafe47be2b9396b0cb9b935e1da6d60250aa8d3',dir=await mkdtemp(resolve('.npm-cache/footing-before-'));
const open=root=>createServer({root,configFile:false,cacheDir:resolve('.npm-cache/footing-check'),optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom'});
let before,after;
try{
 execFileSync('tar',['-x','-C',dir],{input:execFileSync('git',['archive',baseline,'src','package.json'],{maxBuffer:64*1024*1024})});before=await open(dir);after=await open(process.cwd());
 async function measure(vite){
  const {CharacterAnimator}=await vite.ssrLoadModule('/src/game/character-animation.ts'),{buildObject}=await vite.ssrLoadModule('/src/game/world3d.ts'),{interactiveWorld}=await vite.ssrLoadModule('/src/scene/interactive-world.ts');
  const spec=interactiveWorld.assemblies.find(s=>s.displayName==='Explorer'),rows=[];
  for(const fps of [30,60,144]){
   const scale=.306,group=buildObject({id:'check',kind:'custom',labelText:'Check',x:0,y:0,scale,spec}),animation=new CharacterAnimator(group,spec),ankles=['left','right'].map(side=>group.getObjectByName(spec.joints.find(j=>j.bone===side+'_ankle').id));
   const ground=x=>({height:x*.2,slopeX:.2,slopeZ:0});let verticalDrift=0,contacts=0;const old=[];
   for(let f=0;f<fps*4;f++){
    const x=14*f/fps,y=ground(x).height;group.position.set(x,y,0);
    animation.update({speed:14,grounded:true,swimming:false,verticalSpeed:0,time:f/fps,enabled:true,travel:{x,y,z:0,heading:0},ground},1/fps);group.updateMatrixWorld(true);
    for(const [i,ankle] of ankles.entries()){const at=ankle.getWorldPosition(new Vector3()),previous=old[i];if(previous && Math.hypot(at.x-previous.x,at.z-previous.z)<.00001){contacts++;verticalDrift=Math.max(verticalDrift,Math.abs(at.y-previous.y));}old[i]=at;}
   }
   rows.push({fps,contacts,maxVerticalDriftWorldUnits:verticalDrift});
  }return rows;
 }
 const old=await measure(before),fixed=await measure(after);assert(old.every(r=>r.maxVerticalDriftWorldUnits>.01));assert(fixed.every(r=>r.contacts>r.fps && r.maxVerticalDriftWorldUnits<.002));
 const {createWorldScene}=await after.ssrLoadModule('/src/scene/world-fixture.ts'),{saveCompatibilitySource,TREE_COMPATIBILITY}=await after.ssrLoadModule('/src/scene/save-compatibility.ts'),{prepareCharacterGround,characterGround}=await after.ssrLoadModule('/src/game/character-ground.ts');
 const scene=createWorldScene(),fingerprint=createHash('sha256').update(saveCompatibilitySource(scene)).digest('hex');assert.equal(fingerprint,TREE_COMPATIBILITY);
 const start=performance.now(),groundData=prepareCharacterGround(scene),prepareMs=performance.now()-start,ground=characterGround(scene);
 const {AmbientPopulation}=await after.ssrLoadModule('/src/game/ambient-population.ts'),OldPopulation=(await before.ssrLoadModule('/src/game/ambient-population.ts')).AmbientPopulation;
 const population=new AmbientPopulation(scene),previous=new OldPopulation(scene);assert.equal(population.group.children.length,previous.group.children.length);assert.deepEqual(population.group.children.map(m=>m.geometry.index.count),previous.group.children.map(m=>m.geometry.index.count));
 const attributes=p=>p.group.children.reduce((n,m)=>n+Object.entries(m.geometry.attributes).filter(([key])=>key.startsWith('pop')).reduce((s,[,a])=>s+a.array.byteLength,0),0),extraBytes=attributes(population)-attributes(previous);
 const {createCarAtSpawn}=await after.ssrLoadModule('/src/sim/car.ts'),{initialAmbient,stepAmbient}=await after.ssrLoadModule('/src/sim/ambient.ts'),state=createCarAtSpawn(scene),camera=new OrthographicCamera(-15000,15000,15000,-15000,.1,50000),sun=new DirectionalLight();camera.position.set(0,20000,10000);camera.lookAt(0,0,0);camera.updateMatrixWorld();sun.shadow.camera.updateMatrixWorld();
 state.population=initialAmbient(scene);const states=[];
 for(let f=0;f<180;f++){state.population=stepAmbient(state,.05,scene);state.timeS+=.05;states.push({...state});}
 const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return {median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.ceil(sorted.length*.95)-1]};};
 const costs=[];for(let repeat=0;repeat<4;repeat++)for(const [name,p] of [['baseline',previous],['current',population]]){const ms=[];for(const [f,s] of states.entries()){const at=performance.now();p.update(s,camera,sun,.05);if(f>=30)ms.push(performance.now()-at);}costs.push({repeat,name,cpuUpdateMs:stats(ms)});}
 const probe=scene.objects.find(o=>o.ambient?.motion.kind==='walk');assert(probe);const at=performance.now();for(let i=0;i<10000;i++)ground(probe.x+i%10,probe.y,0,2);const probeMs=performance.now()-at;
 const result={baseline,revision:scene.revisionId,fingerprint,objects:scene.objects.length,ambient:population.count,draws:population.group.children.length,extraInstanceAttributeBytes:extraBytes,groundPatches:groundData.patches.length,groundPoints:groundData.patches.reduce((n,p)=>n+p.polygon.length,0),groundSerializedBytes:Buffer.byteLength(JSON.stringify(groundData)),groundPreparationMs:prepareMs,tenThousandSupportProbesMs:probeMs,before:old,after:fixed,costs,limitations:'Node CPU update timings on this host with the whole crowd visible, not browser FPS, VRAM or weaker-laptop results. The new support work has a cost; no speedup is claimed.'};
 await writeFile('docs/evidence/terrain-footing/metrics.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await before?.close();await after?.close();await rm(dir,{recursive:true,force:true});}
