import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {Vector3,Quaternion} from 'three';
const vite=await createServer({configFile:false,cacheDir:'.npm-cache/contact-check',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
try{
 const {createWorldScene}=await vite.ssrLoadModule('/src/scene/world-fixture.ts'),{saveCompatibilitySource,PEOPLE_COMPATIBILITY}=await vite.ssrLoadModule('/src/scene/save-compatibility.ts');
 const scene=createWorldScene(),fingerprint=createHash('sha256').update(saveCompatibilitySource(scene)).digest('hex');assert.equal(fingerprint,PEOPLE_COMPATIBILITY);
 const {CharacterAnimator}=await vite.ssrLoadModule('/src/game/character-animation.ts'),{buildObject}=await vite.ssrLoadModule('/src/game/world3d.ts'),{interactiveWorld}=await vite.ssrLoadModule('/src/scene/interactive-world.ts');
 const spec=interactiveWorld.assemblies.find(s=>s.displayName==='Explorer'),rows=[];
 for(const scale of [.2,.306,1,2])for(const speed of [4,14,35,55,95])for(const fps of [30,60,144]){
  const group=buildObject({id:'check',kind:'custom',labelText:'Contact check',x:0,y:0,scale,spec}),animation=new CharacterAnimator(group,spec),ankles=['left','right'].map(side=>group.getObjectByName(spec.joints.find(j=>j.bone===`${side}_ankle`).id));
  const previous=[null,null],rotation=new Quaternion();let x=0,z=0,maxDrift=0,contacts=0;
  for(let f=0;f<8*fps;f++){
   const t=f/fps,v=t<1 ? speed*t : t<5 ? speed : 0,heading=Math.min(Math.PI/2,Math.max(0,t-2)*.5);x+=Math.cos(heading)*v/fps;z+=Math.sin(heading)*v/fps;group.position.set(x,0,z);group.rotation.y=-heading;
   animation.update({speed:v,travel:{x,z,heading},swimming:false,grounded:true,verticalSpeed:0,time:t,enabled:true},1/fps);group.updateMatrixWorld(true);
   for(const [i,ankle] of ankles.entries()){
    const flat=new Vector3(0,1,0).applyQuaternion(ankle.getWorldQuaternion(rotation)).y>1-1e-12,p=ankle.getWorldPosition(new Vector3());
    if(flat && previous[i]){contacts++;maxDrift=Math.max(maxDrift,Math.hypot(p.x-previous[i].x,p.z-previous[i].z));}previous[i]=flat ? p : null;
   }
  }
  assert(contacts>100);assert(maxDrift<.002,JSON.stringify({scale,speed,fps,maxDrift}));rows.push({scale,speed,fps,contacts,maxDrift});
 }
 const result={sceneRevision:scene.revisionId,fingerprint,objects:scene.objects.length,ambient:scene.objects.filter(o=>o.ambient).length,cases:rows.length,maxDrift:Math.max(...rows.map(r=>r.maxDrift)),units:'world units, horizontal ankle displacement between consecutive flat-sole frames',rows};
 await writeFile('docs/evidence/foot-contacts/metrics.json',JSON.stringify(result,null,2)+'\n');console.log({fingerprint,cases:rows.length,maxDrift:result.maxDrift});
}finally{await vite.close();}
