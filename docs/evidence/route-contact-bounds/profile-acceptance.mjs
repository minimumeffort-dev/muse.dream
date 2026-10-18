import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const dir='.npm-cache/world-acceptance-profile';await mkdir(dir,{recursive:true});
const paths=execFileSync('git',['ls-files','src'],{encoding:'utf8'}).trim().split('\n');
const sources=await Promise.all(paths.map(async file=>({file,sha256:createHash('sha256').update(await readFile(file)).digest('hex')})));
const server=await createServer({configFile:false,logLevel:'silent',cacheDir:dir+'/vite',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom'}),session=new Session();session.connect();
const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,result)=>error?reject(error):resolve(result)));
try{
 const f=await server.ssrLoadModule('/src/scene/world-fixture.ts'),c=await server.ssrLoadModule('/src/scene/save-compatibility.ts');
 const source=await c.sha256(JSON.stringify([f.worldSource,Object.entries(f.worldModules).sort(([a],[b])=>a<b?-1:a>b?1:0)]));
 await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');
 const start=performance.now(),scene=f.createWorldScene(source),wallMs=performance.now()-start;
 const {profile}=await post('Profiler.stop');await writeFile(dir+'/acceptance.cpuprofile',JSON.stringify(profile));
 const counts=new Map();for(const id of profile.samples??[])counts.set(id,(counts.get(id)??0)+1);
 const self=profile.nodes.map(n=>({function:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber+1,samples:counts.get(n.id)??0})).filter(n=>n.samples).sort((a,b)=>b.samples-a.samples);
 const fingerprint=await c.sha256(c.saveCompatibilitySource(scene));assert.equal(fingerprint,c.COVERAGE_COMPATIBILITY);
 const report={kind:'Single cold complete-world acceptance CPU profile in Node after module loading; profiling overhead included, not a startup benchmark or browser FPS',node:process.version,source,fingerprint,objects:scene.objects.length,wallMs,profileDurationUs:profile.endTime-profile.startTime,samples:profile.samples.length,self,sources};
 await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({wallMs,source,fingerprint,samples:profile.samples.length,self:self.slice(0,24)});
}finally{session.disconnect();await server.close();}
