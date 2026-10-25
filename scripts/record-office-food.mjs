import {createServer} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url)),server=await createServer({root,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
try{
 const {createWorldScene}=await server.ssrLoadModule('/src/scene/world-fixture.ts'),c=await server.ssrLoadModule('/src/scene/save-compatibility.ts'),{createCarAtSpawn}=await server.ssrLoadModule('/src/sim/car.ts'),{buildMaskForScene}=await server.ssrLoadModule('/src/scene/fixture.ts'),{buildPaperMask}=await server.ssrLoadModule('/src/sim/mask.ts'),{stepCommerce,checkEconomyState}=await server.ssrLoadModule('/src/sim/commerce.ts'),{stepNpcs}=await server.ssrLoadModule('/src/sim/npcs.ts'),{stepAmbient}=await server.ssrLoadModule('/src/sim/ambient.ts'),{encodeSave,decodeSave}=await server.ssrLoadModule('/src/sim/save.ts');
 const scene=createWorldScene(),world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.OFFICE_FOOD_COMPATIBILITY,previousOfficeFoodSaveCompatibility:c.OFFICE_WORK_COMPATIBILITY},native=await readFile(root+'tests/fixtures/office-food-r116-save-v19.json','utf8');
 await mkdir(root+'tests/fixtures/office-food',{recursive:true});
 for(const [name,start,full] of [['fresh',createCarAtSpawn(scene),true],['restored',decodeSave(native,world).state,false]]){
  let s=start,paid=false,bought=false,ate=false,home=false;const packet=()=>JSON.parse(encodeSave(s,s.timeS,world)),points=[{steps:0,packet:packet()}];
  for(let i=1;i<=14000;i++){
   const was=s.economy.accounts.find(a=>a.id==='office_clerk');s=stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene),population:stepAmbient(s,.25,scene)},{},.25,scene);const a=s.economy.accounts.find(a=>a.id==='office_clerk');paid ||= a.completed.work.check_records>0;bought ||= !was.inventory.bread&&a.inventory.bread>0;ate ||= was.meal?.phase==='eat'&&was.inventory.bread>0&&!a.inventory.bread;home ||= ate&&!a.meal;
   const done=full ? home&&a.completed.work.check_records===6&&s.economy.delivered.station_bread>0 : paid&&bought;
   if(i%800===0||done){checkEconomyState(s,scene);points.push({steps:i,packet:packet()});console.log(name+' '+s.timeS.toFixed(2)+'s · '+a.completed.work.check_records+' tasks · '+a.credits+' coins · meal '+(a.meal?.phase??'none')+' · resupply '+s.economy.delivered.station_bread);}
   if(done)break;if(i===14000)throw Error(name+' did not complete');
  }
  if(!paid||!bought||full&&(!ate||!home))throw Error(name+' lacks real wages/food');
  await writeFile(root+'tests/fixtures/office-food/'+name+'.json',JSON.stringify({provenance:'Node pure engine; 0.25-second ticks, whole NPC and ambient simulation; not browser performance evidence',simulationVersion:c.SAVE_SIMULATION_VERSION,compatibilityHash:c.OFFICE_FOOD_COMPATIBILITY,sourceRevision:scene.revisionId,...(!full?{initialBackupSha256:createHash('sha256').update(native).digest('hex')}:{}),points})+'\n');
 }
}finally{await server.close();}
