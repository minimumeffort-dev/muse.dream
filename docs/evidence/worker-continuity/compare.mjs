import {createServer} from 'vite';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const base='629b11c563959ac5f102a58c3f14fa012c339ee8',dir='.npm-cache/worker-continuity';
await mkdir(dir,{recursive:true});
const before=execFileSync('git',['show',`${base}:src/game/repair-view.ts`],{encoding:'utf8'});
await writeFile(`${dir}/before.ts`,before.replace("'../scene/commerce'","'/src/scene/commerce.ts'"));
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
try{
 const old=await server.ssrLoadModule(`/${dir}/before.ts`),current=await server.ssrLoadModule('/src/game/repair-view.ts');
 const ticks=[0,.25,.3,.375,.55,.8,.825,.9,1.15,1.4],speed=14;
 const measure=(factory,fps)=>{
  const view=factory();let index=0,last=0,maxFrameTravel=0,maxClockError=0,maxBuffered=0;
  for(let frame=0;frame<=fps*1.4;frame++){
   const now=frame/fps;while(index+1<ticks.length && ticks[index+1]<=now+1e-8)index++;
   const tick=ticks[index],p=Object.freeze({id:'worker',x:tick*speed,y:0,elevation:0,headingRad:0,kind:'path',speed,distance:tick*speed,travelled:tick*speed});
   const visible=view.sample(p,true,tick,now);
   maxFrameTravel=Math.max(maxFrameTravel,Math.abs(visible.x-last));maxClockError=Math.max(maxClockError,Math.abs(visible.x-speed*Math.max(0,now-.25)));maxBuffered=Math.max(maxBuffered,view.buffered??0);last=visible.x;
  }
  return {maxFrameTravel,maxClockError,...(maxBuffered ? {maxBuffered} : {})};
 };
 const samples=[30,60,144].map(renderHz=>({renderHz,before:measure(old.repairView,renderHz),after:measure(current.repairView,renderHz),expectedFrameTravel:speed/renderHz}));
 for(const s of samples){assert(s.before.maxClockError>1);assert(s.after.maxClockError<1e-7);assert(s.after.maxFrameTravel<=s.expectedFrameTravel+1e-7);assert(s.after.maxBuffered<=64);}
 const {createWorldScene}=await server.ssrLoadModule('/src/scene/world-fixture.ts'),c=await server.ssrLoadModule('/src/scene/save-compatibility.ts'),scene=createWorldScene();
 const compatibility=await c.sha256(c.saveCompatibilitySource(scene));assert.equal(compatibility,c.CHARACTERS_COMPATIBILITY);
 const result={baseCommit:base,kind:'Deterministic presentation replay, not a live frame-rate benchmark',speed,commerceTicks:ticks,samples,sourceHash:scene.sourceHash,compatibilityHash:compatibility,addedBodies:0,addedRigs:0,addedDrawPasses:0};
 await writeFile('docs/evidence/worker-continuity/comparison.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await server.close();}
