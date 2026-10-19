import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const ffmpeg=process.argv[2];if(!ffmpeg)throw Error('Pass the local ffmpeg executable');
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src','index.html','tests/visual/locomotion.html','tests/visual/locomotion.js','scripts/media-middleware.ts'],{encoding:'utf8'}).trim().split('\n');
const sources=await Promise.all([...new Set(paths)].map(async file=>({file,sha256:hash(await readFile(file)),mtime:(await stat(file)).mtimeMs}))),newest=Math.max(...sources.map(s=>s.mtime)),clips=[];
for(const [name,count,poster,still] of [['character',180,40,'character-motion'],['pedestrians',720,90,'pedestrians'],['locomotion',180,70,'jumping']]){
 const dir='.npm-cache/media/'+name,names=(await readdir(dir)).filter(n=>/^\d{4}\.png$/.test(n)).sort();assert.deepEqual(names,Array.from({length:count},(_,i)=>String(i).padStart(4,'0')+'.png'));
 const frames=[];for(const name of names){const file=dir+'/'+name,bytes=await readFile(file);assert.equal(bytes.readUInt32BE(16),2400);assert.equal(bytes.readUInt32BE(20),1350);assert((await stat(file)).mtimeMs>=newest,file+': superseded source frame');frames.push({file,sha256:hash(bytes)});}
 execFileSync(ffmpeg,['-v','error','-y','-i',`${dir}/${String(poster).padStart(4,'0')}.png`,'-q:v','2','-pix_fmt','yuvj444p',`docs/media/${still}.jpg`]);
 const outputs=[];for(const extension of ['mp4','gif','jpg']){
  const file=`docs/media/${extension==='jpg' ? still : name}.${extension}`,bytes=await readFile(file);let decodedFrames,durationS;
  if(extension!=='jpg'){const progress=execFileSync(ffmpeg,['-v','error','-i',file,'-progress','pipe:1','-nostats','-fps_mode','passthrough','-f','null','-'],{encoding:'utf8',maxBuffer:1024*1024});decodedFrames=Number([...progress.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1]);durationS=Number([...progress.matchAll(/^out_time_us=(\d+)$/gm)].at(-1)?.[1])/1e6;assert(Math.abs(durationS-count/30)<.04);assert(decodedFrames>0);if(extension==='mp4')assert.equal(decodedFrames,count);}
  outputs.push({file,bytes:bytes.length,sha256:hash(bytes),decodedFrames,durationS});
 }
 clips.push({name,count,poster,frames,outputs});
}
const identity=JSON.parse(await readFile('docs/evidence/walker-orientation/world.json','utf8'));
await writeFile('docs/evidence/walker-orientation/media.json',JSON.stringify({provenance:'Native dev exporter, 30 actually rendered frames per simulation second, no interpolation. Offline capture, not live performance.',fingerprint:identity.fingerprint,sources,clips},null,2)+'\n');
console.log('Character, crowd and locomotion: 1,080 consecutive 2400x1350 rendered frames, GIF/HD pairs and matching stills verified.');
