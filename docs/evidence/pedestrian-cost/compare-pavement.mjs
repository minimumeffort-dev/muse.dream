import {createServer} from 'vite';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const path='.npm-cache/crowd-review/pavement-released.ts';await fs.mkdir('.npm-cache/crowd-review',{recursive:true});
await fs.writeFile(path,execFileSync('git',['show','5091c75:src/scene/pavement.ts'],{encoding:'utf8'}).replaceAll("from './","from '/src/scene/"));
const v=await createServer({configFile:false,server:{middlewareMode:true,watch:null},appType:'custom'});
try{
 const {createWorldScene}=await v.ssrLoadModule('/src/scene/world-fixture.ts'),{walkingNetwork}=await v.ssrLoadModule('/src/scene/sites.ts'),{pavementSurface:next}=await v.ssrLoadModule('/src/scene/pavement.ts'),{pavementSurface:old}=await v.ssrLoadModule('/'+path),scene=createWorldScene(),polygons=walkingNetwork(scene).polygons;
 const cases=[polygons,[[{x:0,y:0},{x:40,y:0},{x:40,y:40},{x:30,y:40},{x:30,y:10},{x:10,y:10},{x:10,y:40},{x:0,y:40}]],[[{x:0,y:20},{x:20,y:0},{x:40,y:20},{x:20,y:40}]],[[{x:0,y:0},{x:18.75,y:0},{x:18.75,y:20},{x:0,y:20}],[{x:19,y:0},{x:40,y:0},{x:40,y:20},{x:19,y:20}]]];
 let random=123,comparisons=0;const rng=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;},hash=createHash('sha256');
 for(const pieces of cases){const a=old(pieces),b=next(pieces);for(let i=0;i<20000;i++){
  const p=pieces[Math.floor(rng()*pieces.length)],edge=Math.floor(rng()*p.length),u=p[edge],w=p[(edge+1)%p.length],t=rng(),start={x:u.x+(w.x-u.x)*t+(rng()-.5)*30,y:u.y+(w.y-u.y)*t+(rng()-.5)*30},end={x:start.x+(rng()-.5)*60,y:start.y+(rng()-.5)*60},r=rng()*8,expected=a.segment(start,end,r);
  assert.equal(b.segment(start,end,r),expected,JSON.stringify({start,end,r}));hash.update(expected?'1':'0');comparisons++;
 }}
 const report={baselineCommit:'5091c75c307b1d09c81161e9dcd68fb5520c8743',comparisons,resultHash:hash.digest('hex'),description:'Seeded whole-world pavement and rotated, concave and thin-gap boundary queries; no renderer or timing claim.'};console.log(report);await fs.writeFile('docs/evidence/pedestrian-cost/pavement.json',JSON.stringify(report,null,2)+'\n');
}finally{await v.close();}
