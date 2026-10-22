import {createServer} from 'vite';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
// Run from the repository root: node docs/evidence/work-network-build/benchmark.mjs before|after
const phase=process.argv[2];assert(['before','after'].includes(phase));
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {createWorldScene}=await server.ssrLoadModule('/src/scene/world-fixture.ts');
 const {repairNavigation}=await server.ssrLoadModule('/src/sim/repair.ts');
 const {ambientNavigation}=await server.ssrLoadModule('/src/scene/ambient-navigation.ts');
 const {nearestWorkNodes}=await server.ssrLoadModule('/src/sim/work-navigation.ts');
 const start=performance.now(),scene=createWorldScene(),acceptanceMs=performance.now()-start;
 const navigation=repairNavigation(scene),nodes=ambientNavigation(scene).nodes;
 const seen=new Set(),probes=navigation.services.flatMap(s=>s.nodes.slice(nodes.length)).filter(p=>{const key=p.x+','+p.y;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,512);
 const reference=p=>nodes.map((n,i)=>({i,d:Math.hypot(n.x-p.x,n.y-p.y)})).filter(v=>nodes[v.i].links.length).sort((a,b)=>a.d-b.d||a.i-b.i).slice(0,32);
 const indexAt=performance.now();nearestWorkNodes(nodes,probes[0]);const indexAndFirstQueryMs=performance.now()-indexAt;
 for(const p of probes)assert.deepEqual(nearestWorkNodes(nodes,p),reference(p));
 let checksum=0;const timed=fn=>{const at=performance.now();for(const p of probes)for(const n of fn(p))checksum+=n.i;return performance.now()-at;};
 const referenceMs=[],indexedMs=[];for(let i=0;i<7;i++){if(i%2){indexedMs.push(timed(p=>nearestWorkNodes(nodes,p)));referenceMs.push(timed(reference));}else{referenceMs.push(timed(reference));indexedMs.push(timed(p=>nearestWorkNodes(nodes,p)));}}
 const report={phase,environment:{node:process.version,platform:process.platform,arch:process.arch},navigationSourceSha256:crypto.createHash('sha256').update(fs.readFileSync('src/sim/work-navigation.ts')).digest('hex'),acceptanceMs,services:navigation.services.map(s=>({id:s.id,nodes:s.nodes.length,links:s.nodes.reduce((n,p)=>n+p.links.length,0)})),navigationSha256:crypto.createHash('sha256').update(JSON.stringify(navigation)).digest('hex'),publicNodes:nodes.length,probes:probes.length,indexAndFirstQueryMs,referenceMs,indexedMs,checksum,note:'Node/Vite SSR lookup benchmark; not browser FPS, total startup or full-suite speed.'};
 fs.writeFileSync(`docs/evidence/work-network-build/${phase}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await server.close();}
