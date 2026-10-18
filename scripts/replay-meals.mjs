// Pure fixed-step evidence. Review starts place the player near the actual shop; no browser FPS claim.
import {createServer} from 'vite';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
try{
 const load=p=>server.ssrLoadModule('/src/'+p),{createWorldScene,worldSource,worldModules}=await load('scene/world-fixture.ts'),{buildMaskForScene}=await load('scene/fixture.ts'),{buildPaperMask}=await load('sim/mask.ts'),{playerRadius}=await load('scene/measure.ts'),{createCarAtSpawn}=await load('sim/car.ts'),{stepInteractive}=await load('sim/interaction.ts'),{mealReviewSteps}=await load('game/review-start.ts'),{checkEconomyState}=await load('sim/commerce.ts'),{encodeSave,decodeSave}=await load('sim/save.ts'),{saveCompatibilitySource,sha256,SAVE_SIMULATION_VERSION}=await load('scene/save-compatibility.ts'),{repairNavigation}=await load('sim/repair.ts'),{actorPose}=await load('sim/actors.ts');
 const sourceHash=await sha256(JSON.stringify([worldSource,Object.entries(worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)])),scene=createWorldScene(sourceHash),world={scene,saveCompatibility:await sha256(saveCompatibilitySource(scene)),roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:playerRadius(scene)};
 const directory='.npm-cache/food-errands/replay';await mkdir(directory,{recursive:true});let state=createCarAtSpawn(scene);const account=()=>state.economy.accounts.find(a=>a.id==='regular');
 const steps=mealReviewSteps(state,world);for(let r=steps.next();;r=steps.next()){if(r.done){state=r.value;break;}}
 const snapshots=new Set(),events=[];let phase='',finished=false;const routine=structuredClone(state.npcs.find(n=>n.id==='market_commuter')),home={...account().meal.home},startCredits=account().credits;
 for(let tick=0;tick<120*120;tick++){
  checkEconomyState(state,scene);const meal=account().meal,key=meal?.phase??'routine';
  if(key!==phase){phase=key;events.push({phase,timeS:state.timeS,credits:account().credits,food:account().inventory.lunch,satiety:account().satiety,pose:meal ? {x:meal.x,y:meal.y} : undefined});}
  if(!snapshots.has(key)){const text=encodeSave(state,state.timeS,world);assert.deepEqual(decodeSave(text,world).state,JSON.parse(JSON.stringify(state)));await writeFile(`${directory}/${key}.json`,text);snapshots.add(key);}
  if(!meal){finished=true;break;}
  assert.deepEqual(state.npcs.find(n=>n.id==='market_commuter'),routine);
  state=stepInteractive(state,{steer:0,throttle:0},1/120,world);
 }
 assert(finished,'Customer did not return to routine');assert.equal(account().credits,startCredits-8);assert.equal(account().inventory.lunch,0);assert.equal(state.economy.consumed.lunch,1);assert.equal(state.economy.batches.pack_lunch,1);assert.equal(state.economy.accounts[0].completed.work.pack_lunch,1);
 const pose=actorPose(scene,scene.objects.find(o=>o.id==='market_commuter'),state.timeS,state);assert(Math.hypot(pose.x-home.x,pose.y-home.y)<.01);
 await writeFile(`${directory}/verification.json`,JSON.stringify({sourceHash,simulationVersion:SAVE_SIMULATION_VERSION,compatibilityHash:world.saveCompatibility,events,final:state.economy,home,navigation:repairNavigation(scene).services.map(a=>({id:a.id,nodes:a.nodes.length,links:a.nodes.reduce((n,p)=>n+p.links.length,0)}))},null,2));console.log(JSON.stringify({sourceHash,events,home,finished}));
}catch(error){console.error(error);process.exitCode=1;}finally{await server.close();}
