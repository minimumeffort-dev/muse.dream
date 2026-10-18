import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=execFileSync('git',['ls-files','src','index.html','scripts/encode-media.mjs','scripts/media-middleware.ts'],{encoding:'utf8'}).trim().split('\n');
const sources=await Promise.all(files.map(async file=>({file,sha256:hash(await readFile(file)),mtime:(await stat(file)).mtimeMs}))),after=Math.max(...sources.map(s=>s.mtime)),clips=[];
for(const [clip,count,poster] of [['hosted',420,30],['shared',720,120]]){
 const directory='.npm-cache/media/'+clip,names=(await readdir(directory)).filter(f=>/^\d{4}\.png$/.test(f)).sort();assert.equal(names.length,count);
 const frames=[];for(const [i,name] of names.entries()){
  assert.equal(name,String(i).padStart(4,'0')+'.png');const file=directory+'/'+name,bytes=await readFile(file),info=await stat(file);assert.equal(bytes.readUInt32BE(16),2400);assert.equal(bytes.readUInt32BE(20),1350);assert.ok(info.mtimeMs>=after,`${file}: stale source frame`);frames.push({file,sha256:hash(bytes)});
 }
 const outputs=[];for(const type of ['mp4','gif','jpg']){const file=`docs/media/${clip}.${type}`,bytes=await readFile(file);outputs.push({file,bytes:bytes.length,sha256:hash(bytes)});}
 const ffmpeg=process.argv[2]||'ffmpeg';for(const type of ['mp4','gif'])execFileSync(ffmpeg,['-v','error','-i',`docs/media/${clip}.${type}`,'-f','null','-'],{stdio:['ignore','ignore','pipe']});
 clips.push({clip,count,poster,frames,outputs});console.log(`${clip}: ${count} consecutive 2400x1350 source frames; GIF and HD decode`);
}
await writeFile('docs/evidence/hosted-meals/media.json',JSON.stringify({provenance:'Native dev exporter at 30 actually rendered frames per simulation second. No interpolation; not a live FPS measurement.',sourceIdentity:JSON.parse(await readFile('docs/evidence/hosted-meals/identity.json','utf8')),sources,clips},null,2)+'\n');
