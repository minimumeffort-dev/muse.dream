import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {writeFile,mkdir} from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {createWorldScene}=await server.ssrLoadModule('/src/scene/world-fixture.ts');
 const {createCarAtSpawn}=await server.ssrLoadModule('/src/sim/car.ts');
 const {stepInteractive,toggleRide}=await server.ssrLoadModule('/src/sim/interaction.ts');
 const {buildMaskForScene}=await server.ssrLoadModule('/src/scene/fixture.ts'),{buildPaperMask}=await server.ssrLoadModule('/src/sim/mask.ts');
 const live=createWorldScene(),scene={...live,economy:{...live.economy,markets:live.economy.markets.map(m=>({...m,lots:m.lots.map(l=>l.good==='bread' ? {...l,quantity:1} : l)}))}},base={...scene,economy:undefined},roadMask=buildMaskForScene(scene),driveMask=buildPaperMask(scene.canonical.width,scene.canonical.height),world=scene=>({scene,roadMask,driveMask,carRadius:11});
 const measure=(scene,seconds)=>{const w=world(scene);let state=toggleRide(createCarAtSpawn(scene),w);state={...state,x:6429,y:4379,elevation:0};const start=performance.now();
  for(let i=0;i<seconds*120;i++)state=stepInteractive(state,{throttle:0,steer:0,...(i===120 || i===2400 ? {commerce:{kind:'work',job:'bake'}} : i===1200 ? {commerce:{kind:'buy',market:'market_stall',good:'bread'}} : i===1320 ? {commerce:{kind:'eat',good:'bread'}} : {})},1/120,w);
  const ms=performance.now()-start;if(scene.economy && seconds>2){assert.ok(state.economy.batches.bake>=2);assert.ok(state.economy.accounts.find(a=>a.id==='regular').credits<30);}
  return {ms,steps:seconds*120,commerceCharacters:JSON.stringify(state.economy??null).length,batches:state.economy?.batches};
 };
 measure(base,45);measure(scene,45);const samples=[];
 for(let i=0;i<3;i++)for(const [label,s] of i%2 ? [['commerce',scene],['baseline',base]] : [['baseline',base],['commerce',scene]])samples.push({label,...measure(s,45)});
 const median=label=>samples.filter(s=>s.label===label).map(s=>s.ms/s.steps).sort((a,b)=>a-b)[1];
 const result={method:'Matched 45-second low-stock fixed-step on-foot market simulation; shared masks, full 45-second warmups, 3 alternating samples. No renderer or startup timing.',runtime:process.version,baselineMsPerStep:median('baseline'),commerceMsPerStep:median('commerce'),samples};
 await mkdir('docs/evidence/commerce',{recursive:true});await writeFile('docs/evidence/commerce/simulation-profile.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await server.close();}
