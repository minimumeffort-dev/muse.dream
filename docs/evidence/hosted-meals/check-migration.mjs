import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';

const root=fileURLToPath(new URL('../../../',import.meta.url)),ref='e7045c74bb1fefab8ae4f52401605c4cf39e48a3';
const dir=await mkdtemp(root+'.npm-cache/hosted-release-'),path=root+'tests/fixtures/hosted-meal-r71-save-v16.json';
const archive=execFileSync('git',['archive',ref,'src','package.json'],{cwd:root,maxBuffer:32*1024*1024});execFileSync('tar',['-xf','-','-C',dir],{input:archive});
const options={configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom'};
const before=await createServer({...options,root:dir}),after=await createServer({...options,root});
try{
 const load=p=>before.ssrLoadModule('/src/'+p+'.ts'),f=await load('scene/world-fixture'),c=await load('scene/save-compatibility');
 const {buildMaskForScene}=await load('scene/fixture'),{buildPaperMask}=await load('sim/mask'),{playerRadius}=await load('scene/measure'),{createCarAtSpawn}=await load('sim/car'),{stepInteractive}=await load('sim/interaction'),{sharedMealReviewSteps}=await load('game/review-start'),{encodeSave,decodeSave}=await load('sim/save');
 const source=await c.sha256(JSON.stringify([f.worldSource,Object.entries(f.worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)])),scene=f.createWorldScene(source),hash=await c.sha256(c.saveCompatibilitySource(scene));
 assert.equal(hash,'5297667c16ec9218ef46e6cbf82cfdffe826220f92572f16d85f88ef5c8c2c53');
 const world={scene,saveCompatibility:hash,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:playerRadius(scene)};
 if(process.argv.includes('--write')){
  const steps=sharedMealReviewSteps(createCarAtSpawn(scene),world);let result=steps.next(),n=0;
  while(!result.done){if(++n%30===0)await new Promise(r=>setImmediate(r));result=steps.next();}
  let s=stepInteractive(result.value,{steer:0,throttle:0,commerce:{kind:'share',partner:'baker'}},1/120,world);
  for(let i=0;i<120*120 && s.economy?.shared?.phase!=='eat';i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,world);
  assert.equal(s.economy?.shared?.phase,'eat');await writeFile(path,JSON.stringify(JSON.parse(encodeSave(s,s.timeS,world)),null,2)+'\n');
 }
 const text=await readFile(path,'utf8'),packet=JSON.parse(text),old=decodeSave(text,world);assert.equal(packet.version,16);
 const nextFixture=await after.ssrLoadModule('/src/scene/world-fixture.ts'),nextCompat=await after.ssrLoadModule('/src/scene/save-compatibility.ts'),nextSave=await after.ssrLoadModule('/src/sim/save.ts');
 const nextScene=nextFixture.createWorldScene(),nextHash=await nextCompat.sha256(nextCompat.saveCompatibilitySource(nextScene));
 const nextWorld={...world,scene:nextScene,saveCompatibility:nextHash,previousInvitationSaveCompatibility:hash},restored=nextSave.decodeSave(text,nextWorld);
 assert.deepEqual(restored.state,old.state);assert.equal(restored.worldTime,old.worldTime);assert.equal(restored.migrated,true);
 const prior=nextCompat.preInvitationScene(nextScene),strip=({revisionId,sourceHash,provenance,...data})=>data;assert.deepEqual(strip(prior),strip(scene));
 const fingerprints=[];for(const name of Object.keys(c).filter(n=>n.endsWith('CompatibilitySource') && n!=='saveCompatibilitySource')){
  const args=name==='preCommerceCompatibilitySource' ? [scene,1] : [scene],nextArgs=name==='preCommerceCompatibilitySource' ? [nextScene,1] : [nextScene];
  assert.equal(await c.sha256(c[name](...args)),await nextCompat.sha256(nextCompat[name](...nextArgs)),name);fingerprints.push(name);
 }
 const report={baseline:ref,fixture:'Released engine in Node, using ordinary paid purchases, acquaintance, walking and player-hosted eating; not a native browser backup.',version:packet.version,source,previous:hash,current:nextHash,stateExact:true,worldTimeExact:true,priorSceneExact:true,historicalFingerprintsExact:fingerprints.length};
 await writeFile(root+'docs/evidence/hosted-meals/migration.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await before.close();await after.close();await rm(dir,{recursive:true,force:true});}
