import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
if(!process.argv[2])throw Error('Usage: node --expose-gc scripts/profile-world-streaming.mjs output.json');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=await createServer({root,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
const load=p=>server.ssrLoadModule('/src/'+p+'.ts');
try{
 const THREE=await import('three'),{createWorldScene}=await load('scene/world-fixture'),{WorldStreaming}=await load('game/world-streaming'),{buildWorldChunk}=await load('game/chunk-builder'),{packChunk,disposeChunk}=await load('game/chunk-packet'),{WorldLandscape}=await load('game/landscape'),{buildRoutes}=await load('game/routes'),{buildFlocks}=await load('game/flocks'),{AmbientPopulation}=await load('game/ambient-population'),{geometryMemory}=await load('game/geometry-memory');
 const scene=createWorldScene(),landscape=new WorldLandscape(scene,true),resident=new THREE.Group();resident.add(landscape.group,buildRoutes(scene),buildFlocks(scene),new AmbientPopulation(scene).group);
 const stream=new WorldStreaming(scene,async region=>{
  const group=buildWorldChunk(scene,region),{packet,transfer}=packChunk(group),received=structuredClone(packet,{transfer});disposeChunk(group);return received;
 },id=>landscape.waters.find(w=>w.water.id===id).material);resident.add(stream.group);
 const views=[],sun=new THREE.Vector3(-300,690,220).normalize();
 for(const [name,x,y] of [['town',6330,4233],['airport',2000,9400],['waterfront',9900,2800],['town-return',6330,4233]]){
  const position=new THREE.Vector3(x-scene.canonical.width/2,0,y-scene.canonical.height/2),camera=new THREE.OrthographicCamera(-480,480,270,-270,1,10000);camera.zoom=1.18;camera.position.copy(position).add(new THREE.Vector3(180,1000,480));camera.lookAt(position);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const start=performance.now();stream.update(camera,sun,position,{x:0,y:0},0,false);
  while(stream.stats.pending && !stream.error)await new Promise(resolve=>setTimeout(resolve,1));if(stream.error)throw stream.error;
  global.gc?.();const view={name,position:[x,y],ms:performance.now()-start,stream:stream.stats,geometry:geometryMemory(resident)};views.push(view);console.log(name,JSON.stringify({resident:view.stream.resident,loaded:view.stream.loaded,unloaded:view.stream.unloaded,bytes:view.geometry.bytes}));
 }
 stream.dispose();global.gc?.();
 const disposed={stream:stream.stats,geometry:geometryMemory(stream.group)};
 assert.equal(disposed.stream.resident,0);assert.equal(disposed.stream.bytes,0);assert.equal(disposed.geometry.bytes,0);assert.equal(stream.group.children.length,0);
 const result={node:process.version,scope:'same major groups as profile-world-memory; streamed geometry plus resident bridges, routes, flocks and ambient populations; excludes live actors, player, effects, textures, render targets and worker caches',bounds:stream.bounds,views,disposed};
 await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
}finally{await server.close();}
