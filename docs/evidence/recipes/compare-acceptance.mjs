import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {createServer} from 'vite';

if(!process.argv[2] || !process.argv[3])throw Error('Usage from repository root: node docs/evidence/recipes/compare-acceptance.mjs baseline-git-ref output.json');
const root=process.cwd(),git=args=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024});
const baselineCommit=git(['rev-parse','--verify','--end-of-options',process.argv[2]+'^{commit}']).toString().trim();
const digest=value=>createHash('sha256').update(typeof value==='string' ? value : JSON.stringify(value,(_,v)=>typeof v==='number' && !Number.isFinite(v) ? String(v) : v)).digest('hex');
await mkdir(join(root,'.npm-cache'),{recursive:true});
const baselineRoot=await mkdtemp(join(root,'.npm-cache','acceptance-baseline-'));

async function inspect(directory){
 const server=await createServer({root:directory,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
 const load=p=>server.ssrLoadModule('/src/'+p+'.ts');
 try{
  const fixture=await load('scene/world-fixture'),compat=await load('scene/save-compatibility'),terrain=await load('scene/terrain'),{objectPlacement}=await load('scene/placement'),{ambientGraph}=await load('scene/ambient-navigation'),{sceneContactData}=await load('scene/contacts'),{repairNavigation}=await load('sim/repair'),{worldStreamBounds}=await load('game/world-streaming'),{buildMaskForScene}=await load('scene/fixture');
  const timings=[];
  const measure=async(name,fn)=>{const start=performance.now(),result=await fn();timings.push({name,ms:performance.now()-start});return result;};
  const sourceHash=await compat.sha256(JSON.stringify([fixture.worldSource,Object.entries(fixture.worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)]));
  const scene=await measure('compile and accept world',()=>fixture.createWorldScene(sourceHash)),bounds=await measure('streaming bounds',()=>worldStreamBounds(scene));
  const compatibility={};
  await measure('current and historical fingerprints',async()=>{for(const name of ['saveCompatibilitySource','preInteriorCompatibilitySource','preCourierCompatibilitySource','preFinishCompatibilitySource','prePlantCompatibilitySource','preVergeCompatibilitySource','prePoolCompatibilitySource','preNetworkCompatibilitySource','preSupplyCompatibilitySource','preRepairCompatibilitySource','preParkingCompatibilitySource'])compatibility[name]=await compat.sha256(compat[name](scene));});
  const packet=data=>{assert.equal(data.sourceHash,scene.sourceHash);const {sourceHash,...values}=data;return values;};
  const graph=doc=>{const g=packet(ambientGraph(doc));return {...g,starts:[...g.starts]};};
  const previousInterior=compat.preInteriorScene(scene),previousVerge=compat.preVergeScene(scene);
  const oldInterior=await measure('previous interior graph and contacts',()=>({navigation:graph(previousInterior),contacts:packet(sceneContactData(previousInterior))}));
  const oldVerge=await measure('previous verge graph',()=>graph(previousVerge));
  const navigation=graph(scene),contacts=packet(sceneContactData(scene)),repairs=packet(repairNavigation(scene)),mask=buildMaskForScene(scene);
  const placements=scene.objects.map(o=>{const p=objectPlacement(scene,o);return {id:o.id,base:p.base,low:p.low,rotation:p.rotation.toArray(),foundation:p.foundation};});
  const points=[];let seed=81;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(let i=0;i<2500;i++)points.push({x:random()*scene.canonical.width,y:random()*scene.canonical.height});
  for(const water of scene.terrain.landscape?.waters??[])for(const p of water.polygon)for(const e of [-.01,0,.01])points.push({x:p.x+e,y:p.y-e});
  for(const b of scene.terrain.landscape?.bridges??[])for(let i=-2;i<=22;i++)for(const side of [-1,0,1]){const length=Math.hypot(b.b.x-b.a.x,b.b.y-b.a.y),t=i/20;points.push({x:b.a.x+(b.b.x-b.a.x)*t-(b.b.y-b.a.y)/length*b.width/2*side,y:b.a.y+(b.b.y-b.a.y)*t+(b.b.x-b.a.x)/length*b.width/2*side});}
  const samples=points.map(p=>({x:p.x,y:p.y,height:terrain.terrainHeight(scene.terrain,p.x,p.y),driving:terrain.drivingHeight(scene.terrain,p.x,p.y),surface:terrain.terrainSurfaceHeight(scene.terrain,p.x,p.y),slope:terrain.sampleTerrain(scene.terrain,p.x,p.y,83,-37),water:terrain.waterAt(scene.terrain,p.x,p.y)?.id}));
  const prior=compat.preRecipeScene ? compat.preRecipeScene(scene) : scene;
  const {revisionId,sourceHash:identity,provenance,...stable}=prior;
  const unchanged={...stable,behaviors:stable.behaviors.map(p=>({...p,states:p.states.map(({say,...rules})=>rules)}))};
  return {timings,data:{scene:unchanged,bounds,compatibility,contacts,navigation,repairs,oldInterior,oldVerge,placements,samples,mask:{width:mask.width,height:mask.height,cellSize:mask.cellSize,data:mask.data}}};
 }finally{await server.close();}
}

try{
 execFileSync('tar',['-xf','-','-C',baselineRoot],{input:git(['archive',baselineCommit,'src','package.json','tsconfig.json']),maxBuffer:32*1024*1024});
 const before=await inspect(baselineRoot),after=await inspect(root),checks=[];
 for(const name of Object.keys(before.data)){
  if(name==='compatibility'){const old=before.data[name],next=after.data[name];assert.equal(old.saveCompatibilitySource,'f7b5f8bc696e111422148d51e068413050785a6dc03dcc418cbeb80d9f8adcfc');assert.equal(next.saveCompatibilitySource,'97f4bf439e7eb4a1998c36851128724123b16861e4ce277d295d1e4e182ab5a4');const {saveCompatibilitySource:a,...oldRest}=old,{saveCompatibilitySource:b,...newRest}=next;assert.equal(isDeepStrictEqual(oldRest,newRest),true,'historical fingerprints changed');checks.push({name:'historical fingerprints',exact:true,sha256:digest(newRest)});checks.push({name:'current simulation fingerprint',from:a,to:b,expected:'registered 13 to 14 recipe upgrade'});continue;}
  assert.equal(isDeepStrictEqual(before.data[name],after.data[name]),true,name+' changed');
  checks.push({name,sha256:digest(after.data[name]),exact:true});
 }
 const result={baselineCommit,currentCommit:git(['rev-parse','HEAD']).toString().trim(),workingSourceDiffSha256:digest(git(['diff','--','src']).toString()),node:process.version,scope:'two cold Node SSR constructions; exact accepted data, placements, masks, current/legacy navigation, historical fingerprints and terrain samples; current fingerprint changes from pinned simulation 13 to 14; Scene comparison removes only new recipe definitions/finite stock via the registered projection, host identity, verified packet source identities and nonsemantic say text; not browser startup, frame rate, heap or VRAM',before:before.timings,after:after.timings,objects:after.data.scene.objects.length,terrainSamples:after.data.samples.length,checks};
 await writeFile(resolve(process.argv[3]),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await rm(baselineRoot,{recursive:true,force:true});}
