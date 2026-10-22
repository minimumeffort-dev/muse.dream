import {createServer} from 'vite';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {serialize,deserialize} from 'node:v8';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {cpus,arch,platform} from 'node:os';
const mode=process.argv[2]??'after';
if(!['baseline','after'].includes(mode))throw Error('Use baseline or after');
const root=fileURLToPath(new URL('../../../',import.meta.url)),marks={},calls=[];
const hash=value=>createHash('sha256').update(value).digest('hex');
globalThis.onmessage=null;
globalThis.__profileMark=label=>{marks[label]=performance.now();};
globalThis.__profileCall=(name,run)=>{const start=performance.now(),result=run();calls.push({name,ms:performance.now()-start,result});return result;};
let resolve,reject;
const ready=new Promise((a,b)=>{resolve=a;reject=b;});
globalThis.postMessage=data=>data.error ? reject(Error(data.error)) : resolve(data);
const server=await createServer({root,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom',plugins:[{
 name:'measure-worker-foundations',enforce:'pre',transform(code,id){
  if(!id.endsWith('/src/scene/world-worker.ts'))return;
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
    if(mode==='baseline' && name==='shareFoundationPlacements')edits.push([node.getStart(source),node.end,'undefined']);
    else if(['ambientGraph','sceneContactData','prepareCharacterGround','repairNavigation'].includes(name))edits.push([node.getStart(source),node.end,'__profileCall('+JSON.stringify(call)+',()=>'+call+')']);
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
 const packetFile='.npm-cache/foundation-reuse/'+mode+'.bin';mkdirSync(root+'.npm-cache/foundation-reuse',{recursive:true});writeFileSync(root+packetFile,text);
 const encode=value=>JSON.stringify(value,(_key,v)=>v instanceof Map ? [...v] : v===undefined ? {type:'undefined'} : typeof v==='number' && !Number.isFinite(v) ? {type:String(v)} : Object.is(v,-0) ? {type:'-0'} : v);
 console.log(JSON.stringify({mode,node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,compileMs,phases,objects:data.scene.objects.length,current:data.saveCompatibility,sourceHash:data.scene.sourceHash,packetFile,packetEncoding:'node:v8.serialize',packetBytes:text.length,packetHash:hash(text),fingerprints:Object.fromEntries(Object.entries(data).filter(([key,value])=>key.endsWith('SaveCompatibility') && value!==undefined)),calls:calls.map(({name,ms,result})=>({name,ms,hash:hash(encode(result))})),sources:Object.fromEntries(['src/scene/placement.ts','src/scene/world-worker.ts','docs/evidence/foundation-reuse/benchmark.mjs'].map(path=>[path,hash(readFileSync(root+path))]))},null,2));
}finally{await server.close();}
