import {createServer} from 'vite';
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Vector3} from 'three';
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null},appType:'custom'}),tag=process.argv[2]??'baseline';
try{
 const {createWorldScene}=await server.ssrLoadModule('/src/scene/world-fixture.ts'),{objectSupport}=await server.ssrLoadModule('/src/scene/object-support.ts'),scene=createWorldScene(),trials=[],clone=Vector3.prototype.clone;
 for(let run=0;run<5;run++){
  const copy=structuredClone(scene),hash=createHash('sha256');let clones=0,points=0;global.gc?.();
  Vector3.prototype.clone=function(){clones++;return clone.call(this);};
  const start=performance.now(),profiles=new Set();
  try{for(const object of copy.objects){const p=objectSupport(copy,object);profiles.add(p);points+=p.length;hash.update(object.id+'\n'+JSON.stringify(p.map(p=>[p.x,p.y,p.z]))+'\n');}}
  finally{Vector3.prototype.clone=clone;}
  trials.push({ms:performance.now()-start,clones,profiles:profiles.size,points,sha256:hash.digest('hex')});
 }
 const report={tag,sourceCommit:process.env.SUPPORT_BENCH_COMMIT,context:'Node fixture benchmark; geometry warm, support profiles cold per cloned accepted world. No browser frame-rate or memory claim.',objects:scene.objects.length,trials};
 await mkdir('.npm-cache/support-review',{recursive:true});
 await writeFile(`.npm-cache/support-review/${tag}.json`,JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await server.close();}
