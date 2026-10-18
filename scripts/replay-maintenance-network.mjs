// Fixed-step engine evidence. This does not measure browser FPS.
import {createServer} from 'vite';import {mkdir,writeFile} from 'node:fs/promises';
const cityTrees=process.argv.includes('--city-trees'),trees=cityTrees || process.argv.includes('--trees'),street=process.argv.includes('--street'),lamps=street || process.argv.includes('--lamps');
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
try{
 const load=p=>server.ssrLoadModule('/src/'+p),{createWorldScene,worldSource,worldModules}=await load('scene/world-fixture.ts'),{buildMaskForScene}=await load('scene/fixture.ts'),{buildPaperMask}=await load('sim/mask.ts'),{playerRadius}=await load('scene/measure.ts'),{createCarAtSpawn}=await load('sim/car.ts'),{stepInteractive,toggleRide}=await load('sim/interaction.ts'),{drivingReviewStart}=await load('game/review-start.ts'),{checkEconomyState}=await load('sim/commerce.ts'),{encodeSave,decodeSave}=await load('sim/save.ts'),{saveCompatibilitySource,sha256,SAVE_SIMULATION_VERSION}=await load('scene/save-compatibility.ts'),{repairNavigation}=await load('sim/repair.ts');
 const sourceHash=await sha256(JSON.stringify([worldSource,Object.entries(worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)])),scene=createWorldScene(sourceHash),world={scene,saveCompatibility:await sha256(saveCompatibilitySource(scene)),roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:playerRadius(scene)};
 const service=trees ? 'orchard_trees' : 'market_tables',directory=cityTrees ? '.npm-cache/city-trees/replay' : trees ? '.npm-cache/tree-recovery/replay' : street ? '.npm-cache/verge-repairs/replay' : lamps ? '.npm-cache/lamp-pool/replay' : '.npm-cache/network-repair/replay';await mkdir(directory,{recursive:true});
 let state=drivingReviewStart(createCarAtSpawn(scene),world,cityTrees ? 'street-tree' : trees ? 'orchard' : street ? 'street-lamp' : lamps ? 'lamp' : 'voxels'),previous='',returned=false,wageCredits; const events=[],samples=[],saved=new Set();
 const snapshot=async name=>{if(saved.has(name))return;saved.add(name);const text=encodeSave(state,state.timeS,world);decodeSave(text,world);await writeFile(`${directory}/${name}.json`,text);};
 for(let tick=0;tick<120*1200;tick++){
  if(tick===(trees || street ? 336 : lamps ? 312 : 210))state=toggleRide(state,world);
  const begin=performance.now();state=stepInteractive(state,{steer:0,throttle:tick<(trees || street ? 180 : 132) ? 1 : tick<(trees || street ? 336 : lamps ? 312 : 210) ? -1 : 0},1/120,world);samples.push(performance.now()-begin);
  if(tick%30!==0)continue;checkEconomyState(state,scene);
  const worker=state.economy.accounts.find(a=>a.id==='caretaker'),task=worker.repair,key=state.broken.join(',')+'|'+(task?.phase??'idle')+'|'+state.economy.repaired[service]+'|'+(state.growing?.length??0);
  if(state.economy.repaired[service]>=1 && wageCredits===undefined)wageCredits=worker.credits;
  if(key!==previous){previous=key;events.push({tick,timeS:state.timeS,broken:state.broken,phase:task?.phase??'idle',target:task?.objectId,at:task ? [task.x,task.y] : undefined,credits:worker.credits,repaired:state.economy.repaired[service]});}
  if(Math.floor(state.timeS)===120)await snapshot('mid-route');
  if(task?.phase==='work')await snapshot('working');
  if(task?.phase==='home')await snapshot('returning');
  if(trees && state.growing?.length){await snapshot('planted');if(state.growing[0].progressS>=90)await snapshot('half-grown');}
  if(tick%120===0)decodeSave(encodeSave(state,state.timeS,world),world);
  if(state.economy.repaired[service]>=1 && !task && (!trees || !state.growing?.length)){await snapshot('home');returned=true;break;}
 }
 if(!returned || state.broken.includes(cityTrees ? 'garden_rowan_north' : trees ? 'orchard_birch' : street ? 'center_lamps_0_11_l' : lamps ? 'south_lamps_4_1_r' : 'park_wall_west') || state.economy.repaired[service]!==1 || wageCredits!==(trees ? 6 : 4))throw Error('The first remote repair did not finish and return within twenty simulation minutes');
 samples.sort((a,b)=>a-b);const packet=repairNavigation(scene),result={sourceHash,simulationVersion:SAVE_SIMULATION_VERSION,compatibilityHash:world.saveCompatibility,wageCredits,events,final:{timeS:state.timeS,broken:state.broken,growing:state.growing,economy:state.economy},navigation:packet.services.map(s=>({id:s.id,nodes:s.nodes.length,links:s.nodes.reduce((n,p)=>n+p.links.length,0)})),cpuMs:{samples:samples.length,mean:samples.reduce((a,b)=>a+b,0)/samples.length,p95:samples[Math.ceil(samples.length*.95)-1],max:samples.at(-1)},snapshots:[...saved]};
 await writeFile(`${directory}/verification.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){console.error(error);process.exitCode=1;}finally{await server.close();}
