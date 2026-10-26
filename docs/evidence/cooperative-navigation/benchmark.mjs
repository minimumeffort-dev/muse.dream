import {createServer} from 'vite';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {cpus,platform,arch} from 'node:os';
import {fileURLToPath} from 'node:url';
import {deserialize} from 'node:v8';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../../../',import.meta.url)),baseline='ddddd6bf1629ea29f7afa41d119fdecd2eda2675';
const hash=value=>createHash('sha256').update(value).digest('hex');
let resolve,reject;
const ready=new Promise((a,b)=>{resolve=a;reject=b;});
globalThis.postMessage=data=>data.error ? reject(Error(data.error)) : resolve(data);
globalThis.onmessage=null;
const options={root,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'};
const worker=await createServer(options);
let packet;
try{await worker.ssrLoadModule('/src/scene/world-worker.ts');packet=await ready;}finally{await worker.close();}
const {compileMs,...data}=packet,original=JSON.stringify(data),oldRepair=execFileSync('git',['show',baseline+':src/sim/repair.ts'],{cwd:root,encoding:'utf8'}),runs=[];
if(process.argv[2])assert.deepEqual(data,deserialize(readFileSync(process.argv[2])),'Complete packet must equal the pre-edit worker packet');
for(const mode of ['before','after']){
 const host=await createServer({...options,plugins:mode==='before' ? [{name:'baseline-repair',enforce:'pre',transform(code,id){if(id.endsWith('/src/sim/repair.ts'))return oldRepair;}}] : []});
 try{
  const contacts=await host.ssrLoadModule('/src/scene/contacts.ts'),ambient=await host.ssrLoadModule('/src/scene/ambient-navigation.ts'),repair=await host.ssrLoadModule('/src/sim/repair.ts');
  const received=structuredClone(data),scene=received.scene;
  contacts.primeSceneContacts(scene,received.contacts);ambient.primeAmbientNavigation(scene,received.navigation);
  let yields=0,slices=0,maxActiveSliceMs=0,activeMs=0;
  const start=performance.now();
  if(mode==='before'){repair.primeRepairNavigation(scene,received.repairNavigation);maxActiveSliceMs=activeMs=performance.now()-start;slices=1;}
  else{
   const steps=repair.primeRepairNavigationSteps(scene,received.repairNavigation);let sliceStart=performance.now(),result=steps.next();
   while(!result.done){yields++;const now=performance.now();if(now-sliceStart>=12){const ms=now-sliceStart;maxActiveSliceMs=Math.max(maxActiveSliceMs,ms);activeMs+=ms;slices++;await new Promise(r=>setTimeout(r,0));sliceStart=performance.now();}result=steps.next();}
   const ms=performance.now()-sliceStart;maxActiveSliceMs=Math.max(maxActiveSliceMs,ms);activeMs+=ms;slices++;
  }
  const wallMs=performance.now()-start;
  assert.deepEqual(repair.repairNavigation(scene),received.repairNavigation,'Every installed node/link/coverage value and order must match the worker packet');
  assert.equal(JSON.stringify(data),original,'Validation cannot mutate the packet');
  runs.push({mode,wallMs,activeMs,maxActiveSliceMs,slices,yields,services:received.repairNavigation.services.length,nodes:received.repairNavigation.services.reduce((n,s)=>n+s.nodes.length,0),links:received.repairNavigation.services.reduce((n,s)=>n+s.nodes.reduce((m,p)=>m+p.links.length,0),0),navigationHash:hash(JSON.stringify(repair.repairNavigation(scene)))});
 }finally{await host.close();}
}
assert.equal(runs[0].navigationHash,runs[1].navigationHash);
console.log(JSON.stringify({baseline,node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,sourceHash:data.scene.sourceHash,compatibility:data.saveCompatibility,packetHash:hash(original),completePacketMatchesBaseline:process.argv[2] ? true : undefined,fingerprints:Object.fromEntries(Object.entries(data).filter(([key,value])=>key.endsWith('SaveCompatibility') && value!==undefined)),runs,sources:Object.fromEntries(['src/sim/repair.ts','src/game/main.ts','docs/evidence/cooperative-navigation/benchmark.mjs'].map(path=>[path,hash(readFileSync(root+path))]))},null,2));
