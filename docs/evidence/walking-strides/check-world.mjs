import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,cacheDir:'.npm-cache/walking-check',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
try{
 const {createWorldScene}=await vite.ssrLoadModule('/src/scene/world-fixture.ts');
 const {saveCompatibilitySource,JUNCTION_COMPATIBILITY}=await vite.ssrLoadModule('/src/scene/save-compatibility.ts');
 const scene=createWorldScene(),fingerprint=createHash('sha256').update(saveCompatibilitySource(scene)).digest('hex');
 assert.equal(fingerprint,JUNCTION_COMPATIBILITY,'released r70 world and save contract must stay exact');
 const {CharacterAnimator}=await vite.ssrLoadModule('/src/game/character-animation.ts');
 const {buildObject}=await vite.ssrLoadModule('/src/game/world3d.ts');
 const {interactiveWorld}=await vite.ssrLoadModule('/src/scene/interactive-world.ts');
 const {Vector3,Quaternion}=await import('three');
 const spec=interactiveWorld.assemblies.find(s=>s.displayName==='Explorer'),rows=[];
 for(const scale of [.2,.306,1,2])for(const speed of [4,14,35,55,95]){
  const group=buildObject({id:'check',kind:'custom',labelText:'Stride check',x:0,y:0,scale,spec}),animation=new CharacterAnimator(group,spec);
  const input={speed,grounded:true,swimming:false,verticalSpeed:0,enabled:true,time:0};
  for(let f=0;f<360;f++)animation.update({...input,time:f/120},1/120);
  const ankles=['left','right'].map(side=>group.getObjectByName(spec.joints.find(j=>j.bone===`${side}_ankle`).id));
  const prior=[null,null],rotation=new Quaternion();let contacts=0,maxDrift=0;
  for(let f=0;f<720;f++){
   group.position.x+=speed/120;animation.update({...input,time:3+f/120},1/120);group.updateMatrixWorld(true);
   for(const [i,ankle] of ankles.entries()){
    const flat=Math.abs(ankle.getWorldQuaternion(rotation).z)<1e-6,p=ankle.getWorldPosition(new Vector3());
    if(flat && prior[i]){contacts++;maxDrift=Math.max(maxDrift,p.distanceTo(prior[i]));}prior[i]=flat ? p : null;
   }
  }
  assert(contacts>100);assert(maxDrift<.002);rows.push({scale,speed,contacts,maxDrift});
 }
 const result={baseCommit:'8fdd7aa',sceneRevision:scene.revisionId,fingerprint,objects:scene.objects.length,ambient:scene.objects.filter(o=>o.ambient).length,stepSeconds:1/120,rows};
 await writeFile('docs/evidence/walking-strides/metrics.json',JSON.stringify(result,null,2)+'\n');console.log({fingerprint,maxDrift:Math.max(...rows.map(r=>r.maxDrift)),cases:rows.length});
}finally{await vite.close();}
