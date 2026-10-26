import {createServer} from 'vite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url)),server=await createServer({root,configFile:false,server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'silent'});
try{
 const {createWorldScene}=await server.ssrLoadModule('/src/scene/world-fixture.ts'),c=await server.ssrLoadModule('/src/scene/save-compatibility.ts'),{createCarAtSpawn}=await server.ssrLoadModule('/src/sim/car.ts'),{buildMaskForScene}=await server.ssrLoadModule('/src/scene/fixture.ts'),{buildPaperMask}=await server.ssrLoadModule('/src/sim/mask.ts'),{stepCommerce}=await server.ssrLoadModule('/src/sim/commerce.ts'),{stepNpcs}=await server.ssrLoadModule('/src/sim/npcs.ts'),{stepAmbient}=await server.ssrLoadModule('/src/sim/ambient.ts'),{encodeSave}=await server.ssrLoadModule('/src/sim/save.ts');
 const scene=createWorldScene(),world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.RESIDENTIAL_ROOM_COMPATIBILITY};
 let state=createCarAtSpawn(scene),checkpoint=false,ate=false,done=false,previous='',steps=0;const transitions=[],start=performance.now();
 for(;steps<14000;steps++){
  state=stepCommerce({...state,timeS:state.timeS+.25,npcs:stepNpcs(state,.25,scene),population:stepAmbient(state,.25,scene)},{},.25,scene);
  const a=state.economy.accounts.find(a=>a.id==='office_clerk'),key=JSON.stringify([a.resting?.phase,a.commute?.phase,a.work?.id,a.meal?.phase,a.completed.work.check_records]);
  if(key!==previous){transitions.push({timeS:state.timeS,phase:key,credits:a.credits,energy:a.energy,bread:a.inventory.bread});previous=key;}
  if(!checkpoint && a.meal?.seat?.objectId==='station_quarter_lounge_seat' && a.meal.phase!=='eat' && a.inventory.bread===1){writeFileSync(root+'tests/fixtures/residential-before-meal.json',encodeSave(state,state.timeS,world)+'\n');checkpoint=true;}
  ate ||= a.meal?.phase==='eat';if(ate && !a.meal){done=true;break;}
 }
 if(!checkpoint || !done)throw Error('The complete office wage/food/lounge journey did not finish');
 mkdirSync(root+'docs/evidence/residential-room',{recursive:true});writeFileSync(root+'docs/evidence/residential-room/meal-returned.json',encodeSave(state,state.timeS,world)+'\n');
 console.log(JSON.stringify({done,steps:steps+1,stepSeconds:.25,wallMs:performance.now()-start,simulationVersion:c.SAVE_SIMULATION_VERSION,compatibilityHash:c.RESIDENTIAL_ROOM_COMPATIBILITY,sourceRevision:scene.revisionId,transitions,sources:Object.fromEntries(['src/scene/world/tower_assets.dream','src/scene/world/station_quarter.dream','src/scene/world/life.dream','src/sim/commerce.ts'].map(p=>[p,createHash('sha256').update(readFileSync(root+p)).digest('hex')]))},null,2));
}finally{await server.close();}
