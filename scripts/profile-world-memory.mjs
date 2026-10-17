import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
if(!['voxel','shapes'].includes(process.argv[2]) || !process.argv[3])throw Error('Usage: node --expose-gc scripts/profile-world-memory.mjs voxel|shapes output.json');
const server=await createServer({root,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
const load=p=>server.ssrLoadModule('/src/'+p+'.ts');
const {worldSource,worldModules}=await load('scene/world-fixture');
const {compileDreamScene}=await load('scene/dream');
const mode=process.argv[2];
const result={mode,node:process.version,scope:'environment, landscape, routes, flocks, static scenery and ambient populations; excludes live actors, player, effects, textures and render targets',phases:[]};
const roots=[];
function step(label,fn){const t=performance.now(),value=fn();result.phases.push({label,ms:performance.now()-t,heap:process.memoryUsage()});console.log(label,result.phases.at(-1).ms.toFixed(1));return value;}
try {
const doc=step('compile',()=>compileDreamScene(mode==='voxel'?worldSource:worldSource.replace(/voxel_world\([^;]+;/,''),{sceneId:'profile',revisionId:'r1',sourceHash:'profile'},worldModules));
for(const [path,fn] of [['game/environment','buildEnvironment'],['game/landscape','WorldLandscape'],['game/routes','buildRoutes'],['game/flocks','buildFlocks'],['game/scenery','WorldScenery'],['game/ambient-population','AmbientPopulation']]){
 const mod=await load(path);const root=step(path,()=>fn.startsWith('build')?mod[fn](doc):new mod[fn](doc).group);roots.push(root);
}
const {geometryMemory}=await server.ssrLoadModule('/src/game/geometry-memory.ts');
const {Group}=await import('three');const resident=new Group();roots.forEach(root=>resident.add(root));
result.geometry=geometryMemory(resident);
result.groups=roots.map((root,i)=>({name:['environment','landscape','routes','flocks','scenery','populations'][i],...geometryMemory(root)}));
global.gc?.();result.resident=process.memoryUsage();result.placements=doc.objects.length;
await writeFile(process.argv[3],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.geometry));}finally {await server.close();}
