import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../../../',import.meta.url)),ref='7608dc7ff996f309950d2109e41a8c8fbf251562',out=root+'docs/evidence/route-contact-bounds/',dir=await mkdtemp(root+'.npm-cache/route-cold-');
const file='src/sim/work-navigation.ts',hash=b=>createHash('sha256').update(b).digest('hex'),beforeCode=execFileSync('git',['show',ref+':'+file],{cwd:root}),afterCode=await readFile(root+file);
assert.deepEqual(execFileSync('git',['diff','--name-only',ref,'--','src'],{cwd:root,encoding:'utf8'}).trim().split('\n'),[file]);
execFileSync('tar',['-xf','-','-C',dir],{input:execFileSync('git',['archive',ref,'src','package.json'],{cwd:root,maxBuffer:32*1024*1024})});
const options={configFile:false,logLevel:'silent',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom'};
const measured=[],before=[],after=[];let routeProof;
try{
 for(let pair=-1;pair<5;pair++){
  const samples={},servers=[];
  try{
   for(const variant of pair%2 ? ['after','before'] : ['before','after']){
    const server=await createServer({...options,root:variant==='before'?dir:root,cacheDir:root+`.npm-cache/route-cold-vite-${variant}`});servers.push(server);
    const get=p=>server.ssrLoadModule('/src/'+p+'.ts'),f=await get('scene/world-fixture'),c=await get('scene/save-compatibility'),repair=await get('sim/repair'),contacts=await get('scene/contacts'),ambient=await get('scene/ambient-navigation'),commerce=await get('scene/commerce');
    const source=await c.sha256(JSON.stringify([f.worldSource,Object.entries(f.worldModules).sort(([a],[b])=>a<b?-1:a>b?1:0)]));
    const start=performance.now(),scene=f.createWorldScene(source),acceptanceMs=performance.now()-start;
    const fingerprint=await c.sha256(c.saveCompatibilitySource(scene));assert.equal(fingerprint,c.COVERAGE_COMPATIBILITY);
    samples[variant]={source,scene,repair,commerce,acceptanceMs,fingerprint,contacts:contacts.sceneContactData(scene),ambient:ambient.ambientGraph(scene),navigation:repair.repairNavigation(scene)};
    console.log({pair,variant,acceptanceMs});
   }
   const old=samples.before,next=samples.after;assert.equal(old.source,next.source);assert.deepEqual(next.scene,old.scene);assert.deepEqual(next.contacts,old.contacts);assert.deepEqual(next.ambient,old.ambient);assert.deepEqual(next.navigation,old.navigation);
   if(pair===0){
    let count=0;const paths=createHash('sha256');
    for(const r of old.scene.economy.repairs){const workers=old.scene.economy.accounts.filter(a=>old.commerce.accountRepairs(a).includes(r.id)).map(a=>old.scene.objects.find(o=>o.id===a.actor)),homes=workers.length?workers:[old.scene.objects.find(o=>o.id===old.scene.economy.markets.find(m=>m.id===r.market).actor)];
     for(const home of homes)for(const target of old.repair.repairTargets(old.scene,r)){
      const expected=old.repair.repairApproach(old.scene,r,target,home),actual=next.repair.repairApproach(next.scene,next.scene.economy.repairs.find(v=>v.id===r.id),target,next.scene.objects.find(o=>o.id===home.id));assert(expected);assert.deepEqual(actual,expected,target.objectId);paths.update(JSON.stringify([r.id,home.id,target.objectId,target.zoneId,actual]));count++;
     }
    }
    routeProof={count,sha256:paths.digest('hex'),allEndsAndOrderedWaypointsExact:true};console.log(routeProof);
   }
   if(pair>=0){before.push(old.acceptanceMs);after.push(next.acceptanceMs);measured.push({pair,beforeMs:old.acceptanceMs,afterMs:next.acceptanceMs,source:old.source,fingerprint:old.fingerprint});}
  }finally{for(const server of servers)await server.close();}
 }
 assert.equal(hash(await readFile(root+file)),hash(afterCode),'Source changed during measurement');
 const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
 const report={baseline:ref,kind:'Paired Node complete-world acceptance diagnostic with a fresh Vite module graph per sample; module loading is outside the timer. Not browser FPS, total memory or VRAM.',node:process.version,hardware:'Apple M3 Ultra, 96 GiB memory',warmupPairs:1,measuredPairs:5,sourceFile:file,beforeSha256:hash(beforeCode),afterSha256:hash(afterCode),acceptedScenesAndOrderedHostCachesExact:true,routeProof,medianBeforeMs:median(before),medianAfterMs:median(after),measured};
 await writeFile(out+'acceptance.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await rm(dir,{recursive:true,force:true});}
