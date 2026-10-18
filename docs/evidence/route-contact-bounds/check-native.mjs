import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
const dir='docs/evidence/route-contact-bounds/',read=async path=>JSON.parse(await readFile(path,'utf8'));
const before=await Promise.all([1,2,3].map(i=>read(dir+`native-before-${i}.json`))),after=await Promise.all([1,2,3].map(i=>read(dir+`native-after-${i}.json`)));
for(const sample of [...before,...after]){assert(sample.totalMs>0);assert(sample.firstRenderMs>0);assert.deepEqual(sample.phases.map(p=>p.label),before[0].phases.map(p=>p.label));for(const p of sample.phases)assert(p.endMs>=p.startMs);}
const median=v=>[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)],stats=v=>({medianMs:median(v),minMs:Math.min(...v),maxMs:Math.max(...v)});
const summarize=rows=>({total:stats(rows.map(r=>r.totalMs)),worker:stats(rows.map(r=>r.phases[0].endMs-r.phases[0].startMs)),firstDraw:stats(rows.map(r=>r.firstRenderMs)),maximumHeartbeatGapMs:Math.max(...rows.map(r=>r.heartbeat.maxGapMs))});
const original=await read('docs/evidence/city-repairs/native-work.json'),work=await read(dir+'native-work-before.json'),home=await read(dir+'native-home.json');assert.deepEqual(work.state,original.state);assert.equal(work.worldTime,original.worldTime);
assert.deepEqual(await read(dir+'native-work-before-economy.json'),work.state.economy);assert.deepEqual(await read(dir+'native-home-economy.json'),home.state.economy);
const worker=home.state.economy.accounts.find(a=>a.id==='caretaker');assert.equal(worker.repair.phase,'home');assert.equal(worker.credits,4);assert.equal(worker.completed.repair.market_tables,1);assert.equal(home.state.economy.repaired.market_tables,1);assert(!home.state.broken.includes('airport_lamps_1_5_r'));
const codeSha=createHash('sha256').update(await readFile('src/sim/work-navigation.ts')).digest('hex'),profile=await read(dir+'profile-after.json');assert.equal(codeSha,profile.sources.find(s=>s.file==='src/sim/work-navigation.ts').sha256);
const server=await createServer({configFile:false,logLevel:'silent',cacheDir:'.npm-cache/route-native-check',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom'});
try{
 const get=p=>server.ssrLoadModule('/src/'+p+'.ts'),f=await get('scene/world-fixture'),c=await get('scene/save-compatibility'),save=await get('sim/save'),{checkEconomyState}=await get('sim/commerce'),{buildMaskForScene}=await get('scene/fixture'),{buildPaperMask}=await get('sim/mask'),{playerRadius}=await get('scene/measure');
 const scene=f.createWorldScene(work.sourceHash),world={scene,saveCompatibility:c.COVERAGE_COMPATIBILITY,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:playerRadius(scene)};
 for(const packet of [work,home]){const restored=save.decodeSave(JSON.stringify(packet),world);assert.deepEqual(restored.state,packet.state);assert.equal(restored.worldTime,packet.worldTime);checkEconomyState(restored.state,scene);}
}finally{await server.close();}
const report={baseline:'7608dc7ff996f309950d2109e41a8c8fbf251562',codeSha,conditions:'Three sequential development reloads before and after at 1280x720 in the native in-app browser, same paused fresh-review URL, full settings, Apple M3 Ultra / 96 GiB. No concurrent local tests or Node benchmarks. Other desktop applications were open.',url:'http://127.0.0.1:5223/?profile&test-paused',before:summarize(before),after:summarize(after),limits:'Small desktop sample; total ranges overlap, first draw and heartbeat did not improve. Not a browser FPS, memory, production-network or low-powered-laptop benchmark.',restoredNativeStateAndClockExact:true,onePaidRepair:true,workAtS:work.state.timeS,returnAtS:home.state.timeS};
await writeFile(dir+'native.json',JSON.stringify(report,null,2)+'\n');console.log(report);
