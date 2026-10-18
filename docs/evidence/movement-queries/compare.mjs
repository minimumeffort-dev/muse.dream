import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const ref='631fdf3c46e3911c02eeba36d00103c9c6068045',paths=['src/sim/spatial.ts','src/sim/ambient.ts','src/scene/ambient-navigation.ts'];
async function load(baseline){
 const sources=baseline ? new Map(paths.map(p=>[p,execFileSync('git',['show',`${ref}:${p}`],{encoding:'utf8'})])) : new Map();
 const server=await createServer({configFile:false,plugins:[{name:'pinned-query-baseline',enforce:'pre',load(id){for(const [p,source] of sources)if(id.endsWith('/'+p))return source;}}],cacheDir:'.npm-cache/movement-query-compare',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
 try{
  const {createWorldScene}=await server.ssrLoadModule('/src/scene/world-fixture.ts'),{ambientNavigation}=await server.ssrLoadModule('/src/scene/ambient-navigation.ts'),{createCarAtSpawn}=await server.ssrLoadModule('/src/sim/car.ts'),{sceneContactData}=await server.ssrLoadModule('/src/scene/contacts.ts'),{walkingNetwork}=await server.ssrLoadModule('/src/scene/sites.ts'),{repairTargets}=await server.ssrLoadModule('/src/scene/commerce.ts');
  const scene=createWorldScene(),nav=ambientNavigation(scene),state=createCarAtSpawn(scene),parked=scene.objects.filter(o=>o.parked).slice(0,8),service=scene.economy.repairs.find(r=>r.regrow_s),tree=repairTargets(scene,service)[0];
  const moved={...state,vehicles:parked.map(o=>({id:o.id,x:o.x+80,y:o.y+60,elevation:0,headingRad:.7,distance:0}))};
  const growing={...moved,growing:[{objectId:tree.objectId,serviceId:service.id,plantedAtS:0,progressS:service.regrow_s/2}],control:{kind:'vehicle',id:parked[0].id}};
  return {scene,nav,states:[undefined,state,moved,growing],contacts:sceneContactData(scene).contacts,polygons:walkingNetwork(scene).polygons};
 }finally{await server.close();}
}
const before=await load(true),after=await load(false);assert.deepEqual(after.scene,before.scene);assert.deepEqual(after.nav.nodes,before.nav.nodes);assert.deepEqual(after.nav.starts,before.nav.starts);assert.deepEqual(after.contacts,before.contacts);
let seed=81;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const probes=[];
for(let i=0;i<2500;i++)probes.push({x:random()*14000,y:random()*11000});
for(const p of before.polygons)probes.push({x:p.reduce((s,p)=>s+p.x,0)/p.length,y:p.reduce((s,p)=>s+p.y,0)/p.length});
for(let i=0;i<before.contacts.length;i+=Math.max(1,Math.floor(before.contacts.length/400))){const c=before.contacts[i];for(const angle of [0,.7,Math.PI/2])for(const eps of [-1e-8,0,1e-8])probes.push({x:c.x+Math.cos(angle)*(c.r+4+eps),y:c.y+Math.sin(angle)*(c.r+4+eps)});}
for(const x of [0,256,512,14000])for(const y of [0,256,512,11000])for(const e of [-1e-9,0,1e-9])probes.push({x:x+e,y:y-e});
const hash=createHash('sha256');let comparisons=0;
for(const a of probes){const b={x:a.x+(random()-.5)*80,y:a.y+(random()-.5)*80},r=1+random()*7;
 for(const [i,state] of before.states.entries())for(const walk of [false,true]){
  const expected=[before.nav.clear(a.x,a.y,r,walk,state),before.nav.segment(a,b,r,walk,state)],actual=[after.nav.clear(a.x,a.y,r,walk,after.states[i]),after.nav.segment(a,b,r,walk,after.states[i])];
  assert.deepEqual(actual,expected,JSON.stringify({a,b,r,walk,state:i}));hash.update(actual.map(Number).join(''));comparisons+=2;
 }
}
const result={baseline:ref,probes:probes.length,queryFixtures:['no state','spawn','moved parking','growing tree with occupied dormant vehicle'],comparisons,queriesIdentical:true,graphIdentical:true,contactsIdentical:true,resultsSha256:hash.digest('hex')};
await writeFile(process.argv[2]??'.npm-cache/query-comparison.json',JSON.stringify(result,null,2)+'\n');console.log(result);
