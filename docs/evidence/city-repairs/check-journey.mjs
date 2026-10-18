import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const server=await createServer({configFile:false,logLevel:'silent',cacheDir:'.npm-cache/city-repair-check',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom'});
try{
 const load=p=>server.ssrLoadModule('/src/'+p+'.ts'),f=await load('scene/world-fixture'),c=await load('scene/save-compatibility'),{createCarAtSpawn}=await load('sim/car'),{playerRadius}=await load('scene/measure'),{buildMaskForScene}=await load('scene/fixture'),{buildPaperMask}=await load('sim/mask'),{drivingReviewStart}=await load('game/review-start'),{stepInteractive,toggleRide}=await load('sim/interaction'),{checkEconomyState}=await load('sim/commerce'),{encodeSave,decodeSave}=await load('sim/save');
 const source=await c.sha256(JSON.stringify([f.worldSource,Object.entries(f.worldModules).sort(([a],[b])=>a<b?-1:a>b?1:0)])),scene=f.createWorldScene(source),hash=await c.sha256(c.saveCompatibilitySource(scene));assert.equal(hash,c.COVERAGE_COMPATIBILITY);
 const world={scene,saveCompatibility:hash,carRadius:playerRadius(scene),roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height)},start=performance.now(),target='airport_lamps_1_5_r',phases=[],seen=new Set();let state=drivingReviewStart(createCarAtSpawn(scene),world,'airport-lamp'),damaged=false,finished=false;
 for(let tick=0;tick<120*3600;tick++){
  if(tick===336)state=toggleRide(state,world);
  state=stepInteractive(state,{steer:0,throttle:tick<180?1:tick<336?-1:0},1/120,world);
  damaged ||= state.broken.includes(target);const a=state.economy.accounts.find(a=>a.id==='caretaker'),task=a.repair,phase=task?.objectId===target?task.phase:undefined;
  const stage=phase==='out'&&Math.hypot(task.x-task.at.x,task.y-task.at.y)<60?'approach':phase??(damaged&&!state.broken.includes(target)?'returned':undefined);
  if(stage&&!seen.has(stage)){
   checkEconomyState(state,scene);const text=encodeSave(state,state.timeS,world),restored=decodeSave(text,world);assert.deepEqual(restored.state.economy,JSON.parse(JSON.stringify(state.economy)));assert.equal(restored.worldTime,state.timeS);
   await writeFile(`docs/evidence/city-repairs/engine-${stage}.json`,text+'\n');seen.add(stage);const row={stage,timeS:state.timeS,worker:task?{x:task.x,y:task.y,distance:task.distance}:undefined,credits:a.credits,satiety:a.satiety,broken:state.broken.includes(target),populationTick:state.population.tick,wallMs:performance.now()-start};phases.push(row);console.log(row);
  }
  if(tick%(120*60)===0){checkEconomyState(state,scene);console.log({progressS:state.timeS,phase,x:task?.x,y:task?.y,speed:task?.speed,wallMs:performance.now()-start});await new Promise(r=>setImmediate(r));}
  if(seen.has('home')&&!task&&a.satiety>0){finished=true;break;}
 }
 await writeFile('docs/evidence/city-repairs/engine-fed.json',encodeSave(state,state.timeS,world)+'\n');
 assert(damaged);assert(finished,'The caretaker must repair and return with the complete world advancing');assert.equal(state.economy.repaired.market_tables,1);assert(!state.broken.includes(target));checkEconomyState(state,scene);
 const report={source,hash,target,simulationHz:120,allSystemsAdvanced:true,seededDamage:false,providerCalls:false,kind:'Full engine replay in Node, not native browser play or browser FPS',wallMs:performance.now()-start,phases,finishedAtS:state.timeS,finalWorker:state.economy.accounts.find(a=>a.id==='caretaker')};await writeFile('docs/evidence/city-repairs/journey.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await server.close();}
