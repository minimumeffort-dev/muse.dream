import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
const paths=['src/sim/spatial.ts','src/scene/ambient-navigation.ts','src/sim/ambient.ts'];
const baseline=process.argv[3]==='baseline',sources=new Map(await Promise.all(paths.map(async p=>[p,baseline ? execFileSync('git',['show','631fdf3c46e3911c02eeba36d00103c9c6068045:'+p],{encoding:'utf8'}) : await readFile(p,'utf8')])));
const vite=await createServer({configFile:false,plugins:[{name:'pinned-baseline',enforce:'pre',load(id){if(baseline)for(const [p,source] of sources)if(id.endsWith('/'+p))return source;}}],cacheDir:'.npm-cache/movement-query-check',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
try{
 const {createWorldScene}=await vite.ssrLoadModule('/tests/fixtures/pre-city-world.ts'),{createCarAtSpawn}=await vite.ssrLoadModule('/src/sim/car.ts'),{stepNpcs}=await vite.ssrLoadModule('/src/sim/npcs.ts'),{stepAmbient}=await vite.ssrLoadModule('/src/sim/ambient.ts'),{stepCommerce,checkEconomyState}=await vite.ssrLoadModule('/src/sim/commerce.ts'),{repairTargets,repairSegment}=await vite.ssrLoadModule('/src/sim/repair.ts');
 const {encodeSave,decodeSave}=await vite.ssrLoadModule('/src/sim/save.ts'),{buildMaskForScene}=await vite.ssrLoadModule('/src/scene/fixture.ts'),{buildPaperMask}=await vite.ssrLoadModule('/src/sim/mask.ts'),{npcReviewStart}=await vite.ssrLoadModule('/src/game/review-start.ts'),{walkingHeight}=await vite.ssrLoadModule('/src/scene/interiors.ts');
 const {MATCH_COMPATIBILITY,BUSINESS_COMPATIBILITY,SCHOOL_REPAIR_COMPATIBILITY,SOCIAL_COMPATIBILITY}=await vite.ssrLoadModule('/src/scene/save-compatibility.ts');
 const scene=createWorldScene(),service=scene.economy.repairs.find(r=>r.id==='market_tables'),target=repairTargets(scene,service).find(t=>t.objectId==='school_bench');
 const world={scene,saveCompatibility:MATCH_COMPATIBILITY,previousMatchSaveCompatibility:BUSINESS_COMPATIBILITY,previousBusinessSaveCompatibility:SCHOOL_REPAIR_COMPATIBILITY,previousSchoolRepairSaveCompatibility:SOCIAL_COMPATIBILITY,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 let s={...npcReviewStart(createCarAtSpawn(scene),world,'vendor'),broken:['school_bench']},previous={x:scene.objects.find(o=>o.id==='market_neighbor').x,y:scene.objects.find(o=>o.id==='market_neighbor').y},waited=false,arrived=false,returned=false;
 const ms={npc:0,ambient:0,commerce:0,segment:0,save:0,validation:0},phases=[],digest=createHash('sha256');let ticks=0;
 const tick=()=>{let t=performance.now();const npcs=stepNpcs(s,.25,scene);ms.npc+=performance.now()-t;t=performance.now();const population=stepAmbient(s,.25,scene);ms.ambient+=performance.now()-t;t=performance.now();s=stepCommerce({...s,npcs,population,timeS:s.timeS+.25},{},.25,scene);ms.commerce+=performance.now()-t;ticks++;digest.update(JSON.stringify(s));};
 const worker=()=>s.economy.accounts.find(a=>a.id==='caretaker');
 const started=performance.now();
 for(let i=0;i<3600;i++){
  tick();const task=worker().repair;
  if(task){assert(Math.hypot(task.x-previous.x,task.y-previous.y)<=3.500001);let t=performance.now();assert(repairSegment(scene,service,previous,task,undefined,true));ms.segment+=performance.now()-t;previous={x:task.x,y:task.y};
   if(!phases.includes(task.phase)){phases.push(task.phase);t=performance.now();s=decodeSave(encodeSave(s,s.timeS,world),world).state;ms.save+=performance.now()-t;}
   if(task.phase==='work'&&!waited){arrived=true;const original=s.vehicles;s={...s,vehicles:s.vehicles.map(v=>v.id===null ? {...v,x:target.contact.x,y:target.contact.y,elevation:walkingHeight(scene,target.contact.x,target.contact.y)} : v)};for(let j=0;j<48;j++)tick();assert(s.broken.includes('school_bench'));assert.equal(s.economy.repaired.market_tables,0);t=performance.now();s=decodeSave(encodeSave(s,s.timeS,world),world).state;ms.save+=performance.now()-t;s={...s,vehicles:original};waited=true;}
  }else if(arrived){returned=true;break;}
  if(i%80===0){const t=performance.now();checkEconomyState(s,scene);ms.validation+=performance.now()-t;}
 }
 assert(returned&&waited);assert.equal(s.economy.repaired.market_tables,1);assert.equal(worker().credits,2);assert.equal(worker().inventory.vegetables,1);checkEconomyState(s,scene);
 const result={baseline,inputs:Object.fromEntries([...sources].map(([p,text])=>[p,createHash('sha256').update(text).digest('hex')])),runtime:process.version,ticks,timeS:s.timeS,phases,ms,wallMs:performance.now()-started,sequenceHash:digest.digest('hex'),finalHash:createHash('sha256').update(JSON.stringify(s)).digest('hex')};
 assert.equal(result.sequenceHash,'7e5563ffef6b062b532e09fc40f9e39fc88554119b6257ed0e8ea03b04755e9f');assert.equal(result.finalHash,'f5d73be4d5bb01af6b26bf44b3dae14eb41df5f3044fff411e21a6c7660a2710');
 await writeFile(process.argv[2]??'.npm-cache/movement-query-replay.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await vite.close();}
