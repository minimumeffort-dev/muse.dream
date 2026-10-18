import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const ffmpeg=process.argv[2];if(!ffmpeg)throw Error('Pass the local ffmpeg executable');
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src','index.html','scripts/encode-media.mjs','scripts/media-middleware.ts'],{encoding:'utf8'}).trim().split('\n');
const sources=await Promise.all([...new Set(paths)].map(async file=>({file,sha256:hash(await readFile(file)),mtime:(await stat(file)).mtimeMs}))),after=Math.max(...sources.map(s=>s.mtime)),clips=[];
for(const [name,count,poster] of [['treefall',240,150],['planting',360,325],['growth',900,450]]){
 const dir='.npm-cache/media/'+name,names=(await readdir(dir)).filter(n=>/^\d{4}\.png$/.test(n)).sort();assert.deepEqual(names,Array.from({length:count},(_,i)=>String(i).padStart(4,'0')+'.png'));
 const frames=[];for(const name of names){const file=dir+'/'+name,bytes=await readFile(file);assert.equal(bytes.readUInt32BE(16),2400);assert.equal(bytes.readUInt32BE(20),1350);assert((await stat(file)).mtimeMs>=after,file+': superseded source frame');frames.push({file,sha256:hash(bytes)});}
 execFileSync(ffmpeg,['-v','error','-y','-i',`${dir}/${String(poster).padStart(4,'0')}.png`,'-q:v','2','-pix_fmt','yuvj444p',`docs/media/${name}.jpg`]);
 const outputs=[];for(const extension of ['mp4','gif','jpg']){
  const file=`docs/media/${name}.${extension}`,bytes=await readFile(file);let decodedFrames,durationS;
  if(extension!=='jpg'){const progress=execFileSync(ffmpeg,['-v','error','-i',file,'-progress','pipe:1','-nostats','-fps_mode','passthrough','-f','null','-'],{encoding:'utf8',maxBuffer:1024*1024});decodedFrames=Number([...progress.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1]);durationS=Number([...progress.matchAll(/^out_time_us=(\d+)$/gm)].at(-1)?.[1])/1e6;assert(Math.abs(durationS-count/30)<.04);assert(decodedFrames>0);if(extension==='mp4')assert.equal(decodedFrames,count);}
  outputs.push({file,bytes:bytes.length,sha256:hash(bytes),decodedFrames,durationS});
 }
 clips.push({name,count,poster,frames,outputs});
}
const identity=JSON.parse(await readFile('docs/evidence/city-trees/migration.json','utf8'));
const illustrationFile='docs/media/code-to-tree.jpg',illustrationBytes=await readFile(illustrationFile),illustrationSources=await Promise.all(['docs/examples/toppling-tree.dream','tests/visual/docs.html','tests/visual/docs.js','docs/site/style.css','docs/site/dream-highlight.mjs'].map(async file=>({file,sha256:hash(await readFile(file)),mtime:(await stat(file)).mtimeMs})));
assert((await stat(illustrationFile)).mtimeMs>=Math.max(...illustrationSources.map(s=>s.mtime)));
const illustration={file:illustrationFile,sha256:hash(illustrationBytes),sources:illustrationSources,native:JSON.parse(await readFile('docs/evidence/city-trees/source-illustration.json','utf8'))};
assert(illustration.native.fullSourceMatches && illustration.native.sourceFits);
await writeFile('docs/evidence/city-trees/media.json',JSON.stringify({provenance:'Native dev exporter, 30 actually rendered frames per simulation second, no interpolation. Offline capture, not live performance.',sourceHash:identity.newSource,compatibilityHash:identity.current,sources,clips,illustration},null,2)+'\n');
console.log('Treefall, planting and growth: 1,500 consecutive 2400x1350 rendered frames; GIFs, HD and matching stills verified.');
