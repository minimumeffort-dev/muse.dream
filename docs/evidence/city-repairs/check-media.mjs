import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const ffmpeg=process.argv[2];if(!ffmpeg)throw Error('Pass the local ffmpeg executable');
const hash=b=>createHash('sha256').update(b).digest('hex'),dir='.npm-cache/media/airportrepair',count=600,poster=240;
const paths=execFileSync('git',['ls-files','src','index.html','scripts/encode-media.mjs','scripts/media-middleware.ts'],{encoding:'utf8'}).trim().split('\n');
const sources=await Promise.all(paths.map(async file=>({file,sha256:hash(await readFile(file)),mtime:(await stat(file)).mtimeMs}))),after=Math.max(...sources.map(s=>s.mtime));
const names=(await readdir(dir)).filter(n=>/^\d{4}\.png$/.test(n)).sort();assert.deepEqual(names,Array.from({length:count},(_,i)=>String(i).padStart(4,'0')+'.png'));
const frames=[];for(const name of names){const file=dir+'/'+name,bytes=await readFile(file);assert.equal(bytes.readUInt32BE(16),2400);assert.equal(bytes.readUInt32BE(20),1350);assert((await stat(file)).mtimeMs>=after,file+': superseded source frame');frames.push({file,sha256:hash(bytes)});}
execFileSync(ffmpeg,['-v','error','-y','-i',`${dir}/${String(poster).padStart(4,'0')}.png`,'-q:v','2','-pix_fmt','yuvj444p','docs/media/airportrepair.jpg']);
const outputs=[];for(const extension of ['mp4','gif','jpg']){
 const file='docs/media/airportrepair.'+extension,bytes=await readFile(file);let decodedFrames;
 if(extension!=='jpg'){const progress=execFileSync(ffmpeg,['-v','error','-i',file,'-progress','pipe:1','-nostats','-fps_mode','passthrough','-f','null','-'],{encoding:'utf8',maxBuffer:1024*1024});decodedFrames=Number([...progress.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1]);assert(decodedFrames>0);if(extension==='mp4')assert.equal(decodedFrames,count);}
 outputs.push({file,bytes:bytes.length,sha256:hash(bytes),decodedFrames});
}
await writeFile('docs/evidence/city-repairs/media.json',JSON.stringify({provenance:'Native dev exporter, 30 actually rendered frames per simulation second, no interpolation. Offline capture, not live performance.',sourceIdentity:JSON.parse(await readFile('docs/evidence/city-repairs/identity.json','utf8')),clip:'airportrepair',count,poster,sources,frames,outputs},null,2)+'\n');
console.log('Airport repair: 600 consecutive 2400x1350 rendered frames; GIF, HD and matching still verified.');
