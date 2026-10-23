import {createServer} from 'vite';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {serialize,deserialize} from 'node:v8';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {cpus,arch,platform} from 'node:os';
const mode=process.argv[2]??'after';
if(!['before','after'].includes(mode))throw Error('Use before for the foundation-only hook, or after for static reuse');
const root=fileURLToPath(new URL('../../../',import.meta.url)),marks={},calls=[];
const hash=value=>createHash('sha256').update(value).digest('hex');
globalThis.onmessage=null;
globalThis.__profileMark=label=>{marks[label]=performance.now();};
globalThis.__profileCall=(name,run)=>{const start=performance.now(),result=run();calls.push({name,ms:performance.now()-start,result});return result;};
let resolve,reject;
const ready=new Promise((a,b)=>{resolve=a;reject=b;});
globalThis.postMessage=data=>data.error ? reject(Error(data.error)) : resolve(data);
const server=await createServer({root,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom',plugins:[{
 name:'measure-worker-preparation',enforce:'pre',transform(code,id){
  if(!id.endsWith('/src/scene/world-worker.ts'))return;
  if(mode==='before'){const hook='import {shareStaticPlacements}';if(!code.includes(hook))throw Error('Missing static placement hook');code=code.replace(hook,'import {shareFoundationPlacements as shareStaticPlacements}');}
  const anchors=[
   ['const scene=createWorldScene(sourceHash);',"__profileMark('source');const scene=createWorldScene(sourceHash);__profileMark('acceptance');"],
   ['const bounds=worldStreamBounds(scene);',"const bounds=worldStreamBounds(scene);__profileMark('bounds');"],
   ['encode=undefined;',"encode=undefined;__profileMark('compatibility');"],
   ['postMessage({scene,bounds,',"__profileMark('packetStart');postMessage({scene,bounds,"]
  ];
  for(const [from,to] of anchors){if(!code.includes(from))throw Error('Missing profile anchor '+from);code=code.replace(from,to);}
  const source=ts.createSourceFile(id,code,ts.ScriptTarget.Latest,true),edits=[];
  const visit=node=>{
   if(ts.isCallExpression(node)){
    const name=node.expression.getText(source),call=node.getText(source);
    if(['ambientGraph','sceneContactData','prepareCharacterGround','repairNavigation'].includes(name))edits.push([node.getStart(source),node.end,'__profileCall('+JSON.stringify(call)+',()=>'+call+')']);
   }
   ts.forEachChild(node,visit);
  };
  visit(source);
  for(const [start,end,text] of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,start)+text+code.slice(end);
  return code;
 }
}]});
try{
 await server.ssrLoadModule('/src/scene/world-worker.ts');const data=await ready;marks.packetEnd=performance.now();
 let previous=marks.source;const phases={};
 for(const key of ['acceptance','bounds','compatibility','packetStart','packetEnd']){phases[key]=marks[key]-previous;previous=marks[key];}
 const {compileMs,...packet}=data,text=serialize(packet);assert.deepEqual(deserialize(text),packet,'Comparison encoding must retain every packet value');
 const packetFile='.npm-cache/startup-preparation/'+mode+'.bin';mkdirSync(root+'.npm-cache/startup-preparation',{recursive:true});writeFileSync(root+packetFile,text);
 const host=await createServer({root,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
 const hostCalls=[];
 try{
  const contact=await host.ssrLoadModule('/src/scene/contacts.ts'),ambient=await host.ssrLoadModule('/src/scene/ambient-navigation.ts'),repair=await host.ssrLoadModule('/src/sim/repair.ts'),ground=await host.ssrLoadModule('/src/game/character-ground.ts'),fixture=await host.ssrLoadModule('/src/scene/fixture.ts'),sim=await host.ssrLoadModule('/src/sim/car.ts');
  const received=deserialize(text),scene=received.scene;
  const run=(name,fn)=>{const start=performance.now(),value=fn();hostCalls.push({name,ms:performance.now()-start});return value;};
  run('primeSceneContacts',()=>contact.primeSceneContacts(scene,received.contacts));
  run('primeAmbientNavigation',()=>ambient.primeAmbientNavigation(scene,received.navigation));
  run('primeRepairNavigation',()=>repair.primeRepairNavigation(scene,received.repairNavigation));
  run('primeCharacterGround',()=>ground.primeCharacterGround(scene,received.characterGround));
  run('characterGround',()=>ground.characterGround(scene));
  run('buildMaskForScene',()=>fixture.buildMaskForScene(scene));
  run('createCarAtSpawn',()=>sim.createCarAtSpawn(scene));
 }finally{await host.close();}

 const encode=value=>JSON.stringify(value,(_key,v)=>v instanceof Map ? [...v] : v===undefined ? {type:'undefined'} : typeof v==='number' && !Number.isFinite(v) ? {type:String(v)} : Object.is(v,-0) ? {type:'-0'} : v);
 console.log(JSON.stringify({mode,placementHook:mode==='before' ? 'foundation-only' : 'static-with-floor-guard',hostCalls,node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,compileMs,phases,objects:data.scene.objects.length,current:data.saveCompatibility,sourceHash:data.scene.sourceHash,packetFile,packetEncoding:'node:v8.serialize',packetBytes:text.length,packetHash:hash(text),fingerprints:Object.fromEntries(Object.entries(data).filter(([key,value])=>key.endsWith('SaveCompatibility') && value!==undefined)),calls:calls.map(({name,ms,result})=>({name,ms,hash:hash(encode(result))})),sources:Object.fromEntries(['src/scene/placement.ts','src/scene/world-worker.ts','docs/evidence/startup-preparation/benchmark.mjs','src/sim/indoor-navigation.ts','src/game/compact-object.ts'].map(path=>[path,hash(readFileSync(root+path))]))},null,2));
}finally{await server.close();}
