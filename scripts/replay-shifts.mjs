// Pure fixed-step evidence; these timings do not measure browser rendering speed.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({configFile:false,cacheDir:'.npm-cache/replay-shifts/vite',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
try{
 const load=p=>server.ssrLoadModule('/src/'+p),{createWorldScene,worldSource,worldModules}=await load('scene/world-fixture.ts'),{buildMaskForScene}=await load('scene/fixture.ts'),{buildPaperMask}=await load('sim/mask.ts'),{playerRadius}=await load('scene/measure.ts'),{createCarAtSpawn}=await load('sim/car.ts'),{stepInteractive}=await load('sim/interaction.ts'),{hoursReviewSteps,shiftReviewInput}=await load('game/review-start.ts'),{checkEconomyState}=await load('sim/commerce.ts'),{encodeSave,decodeSave}=await load('sim/save.ts'),{saveCompatibilitySource,sha256,SAVE_SIMULATION_VERSION}=await load('scene/save-compatibility.ts');
 const sourceHash=await sha256(JSON.stringify([worldSource,Object.entries(worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)])),scene=createWorldScene(sourceHash),world={scene,saveCompatibility:await sha256(saveCompatibilitySource(scene)),roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:playerRadius(scene)},dir='.npm-cache/staff-shifts/replay';await mkdir(dir,{recursive:true});
 const account=(s,id)=>s.economy.accounts.find(a=>a.id===id),seen=new Set(),last=new Map(),events=[];
 const snapshot=async(state,name)=>{const text=encodeSave(state,state.timeS,world);assert.deepEqual(decodeSave(text,world).state,JSON.parse(JSON.stringify(state)));await writeFile(`${dir}/${name}.json`,text);};
 let state=createCarAtSpawn(scene),prep=hoursReviewSteps(state,world);for(let r=prep.next();;r=prep.next())if(r.done){state=r.value;break;}
 await snapshot(state,'capture-start');
 const record=async()=>{checkEconomyState(state,scene);for(const id of ['baker','school_staff']){const a=account(state,id),phase=a.shift?.phase??'work',key=id+'-'+phase;if(last.get(id)!==phase){last.set(id,phase);seen.add(key);events.push({account:id,phase,timeS:state.timeS,position:a.shift?{x:a.shift.x,y:a.shift.y}:undefined});await snapshot(state,key+'-'+events.length);}}};
 for(let frame=0;frame<600;frame++){
  const input=shiftReviewInput(state,world,frame,Math.PI);
  for(let sub=0;sub<4;sub++)state=stepInteractive(state,{...input,viewAngle:Math.PI,talkPressed:sub===0 && frame===540},1/120,world);
  if(frame%30===0)await record();
 }
 assert.equal(account(state,'baker').shift?.phase,'rest');assert(state.npcs.find(n=>n.id==='vendor').known,'Followed staff should be available to talk');
 assert(Math.hypot(state.x-6360,state.y-4490)<55,'The player should reach the actual hall rest point');await snapshot(state,'capture-end');
 // Walk clear of the returning path instead of assigning a player or NPC pose.
 for(let i=0;i<120*4;i++){const dx=6330-state.x,dy=4490-state.y,d=Math.hypot(dx,dy),angle=Math.atan2(180,480);state=stepInteractive(state,{steer:d>2 ? (dx*Math.cos(angle)-dy*Math.sin(angle))/d : 0,throttle:d>2 ? (-dx*Math.sin(angle)-dy*Math.cos(angle))/d : 0},1/120,world);}
 assert(Math.hypot(state.x-6330,state.y-4490)<3,'The player must walk clear of the staff path');
 for(let i=0;state.timeS<560;i++){
  state=stepInteractive(state,{steer:0,throttle:0},1/120,world);if(i%30===0)await record();
 }
 assert.equal(account(state,'baker').shift,undefined);assert.equal(account(state,'school_staff').shift,undefined);assert(state.npcs.find(n=>n.id==='vendor').known);
 for(const id of ['baker','school_staff'])assert(seen.has(id+'-in'),'Staff must physically return');await snapshot(state,'returned');
 await writeFile(`${dir}/verification.json`,JSON.stringify({sourceHash,compatibilityHash:world.saveCompatibility,simulationVersion:SAVE_SIMULATION_VERSION,events,player:{x:state.x,y:state.y},vendorKnown:state.npcs.find(n=>n.id==='vendor').known},null,2));console.log(JSON.stringify({sourceHash,events,vendorKnown:true}));
}catch(error){console.error(error);process.exitCode=1;}finally{await server.close();}
