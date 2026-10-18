// Pure fixed-step evidence. Review starts position the player at the real counter; no live FPS claim.
import {createServer} from 'vite';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
try{
 const load=p=>server.ssrLoadModule('/src/'+p),{createWorldScene,worldSource,worldModules}=await load('scene/world-fixture.ts'),{buildMaskForScene}=await load('scene/fixture.ts'),{buildPaperMask}=await load('sim/mask.ts'),{playerRadius}=await load('scene/measure.ts'),{createCarAtSpawn}=await load('sim/car.ts'),{stepInteractive}=await load('sim/interaction.ts'),{kitchenReviewSteps,npcReviewStart}=await load('game/review-start.ts'),{checkEconomyState}=await load('sim/commerce.ts'),{encodeSave,decodeSave}=await load('sim/save.ts'),{saveCompatibilitySource,sha256,SAVE_SIMULATION_VERSION}=await load('scene/save-compatibility.ts');
 const sourceHash=await sha256(JSON.stringify([worldSource,Object.entries(worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)])),scene=createWorldScene(sourceHash),world={scene,saveCompatibility:await sha256(saveCompatibilitySource(scene)),roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:playerRadius(scene)},dir='.npm-cache/kitchen/replay';await mkdir(dir,{recursive:true});
 const acct=(s,id)=>s.economy.accounts.find(a=>a.id===id),snapshot=async(s,name)=>{const text=encodeSave(s,s.timeS,world);assert.deepEqual(decodeSave(text,world).state,JSON.parse(JSON.stringify(s)));await writeFile(`${dir}/${name}.json`,text);};
 let state=createCarAtSpawn(scene);const prep=kitchenReviewSteps(state,world);for(let r=prep.next();;r=prep.next())if(r.done){state=r.value;break;}
 assert.equal(acct(state,'pocket').credits,20);assert.equal(state.economy.batches.pack_lunch,2);assert.equal(acct(state,'baker').completed.work.pack_lunch,2);await snapshot(state,'capture-start');
 for(let frame=0;frame<480;frame++)for(let sub=0;sub<4;sub++)state=stepInteractive(state,{steer:0,throttle:0,...(sub===0 && frame===15 ? {commerce:{kind:'buy',market:'market_stall',good:'lunch'}} : sub===0 && frame===90 ? {commerce:{kind:'eat',good:'lunch'}} : {})},1/120,world);
 checkEconomyState(state,scene);assert.equal(acct(state,'pocket').credits,12);assert.equal(acct(state,'regular').credits,22);assert.equal(state.economy.consumed.lunch,2);assert.equal(state.economy.batches.pack_lunch,4);assert.equal(acct(state,'baker').completed.work.pack_lunch,4);assert.equal(acct(state,'pocket').completed.work.pack_lunch,0);await snapshot(state,'capture-end');const capture={timeS:state.timeS,economy:state.economy};
 // Two ordinary paid player batches create flour shelf room and real shared courier demand.
 state=npcReviewStart(createCarAtSpawn(scene),world,'vendor');const tick=action=>{state=stepInteractive(state,{steer:0,throttle:0,...(action?{commerce:action}:{})},1/120,world);};
 for(let n=0;n<2;n++){tick({kind:'work',job:'bake'});assert.equal(acct(state,'pocket').work?.id,'bake');for(let i=0;i<120*8 && acct(state,'pocket').work;i++)tick();assert.equal(acct(state,'pocket').completed.work.bake,n+1);}
 const events=[],saved=new Set();let phase='',finished=false;
 for(let i=0;i<120*1200;i++){
  const helper=acct(state,'caretaker'),trip=helper.courier,key=trip?.id==='flour_run' ? trip.phase : 'routine';
  if(i%30===0){checkEconomyState(state,scene);if(key!==phase){phase=key;events.push({phase,timeS:state.timeS,credits:helper.credits,at:trip?{x:trip.x,y:trip.y}:undefined,delivered:state.economy.delivered.flour_run});}
   if(trip?.id==='flour_run' && !saved.has(key)){saved.add(key);await snapshot(state,'flour-'+key);}
   if(state.economy.delivered.flour_run===1 && !trip){await snapshot(state,'flour-complete');finished=true;break;}
  }tick();
 }
 assert(finished,'The flour courier did not return');assert.equal(state.economy.markets.find(m=>m.id==='station_supplies').stock.flour,78);assert(events.some(e=>e.phase==='home' && e.credits===4));assert.equal(acct(state,'caretaker').credits,2);assert(state.economy.events.some(e=>e.account==='caretaker' && e.kind==='buy' && e.ref==='vegetables'));assert.equal(acct(state,'caretaker').completed.delivery.flour_run,1);assert.equal(acct(state,'pocket').completed.delivery.flour_run,0);assert.equal(acct(state,'pocket').completed.work.bake,2);
 await writeFile(`${dir}/verification.json`,JSON.stringify({sourceHash,simulationVersion:SAVE_SIMULATION_VERSION,compatibilityHash:world.saveCompatibility,capture,flour:{events,finalTimeS:state.timeS,economy:state.economy,finished}},null,2));console.log(JSON.stringify({sourceHash,capture:{timeS:capture.timeS,pocket:acct({economy:capture.economy},'pocket').credits,staffPacked:capture.economy.batches.pack_lunch,consumed:capture.economy.consumed.lunch},flour:events,finished}));
}catch(error){console.error(error);process.exitCode=1;}finally{await server.close();}
