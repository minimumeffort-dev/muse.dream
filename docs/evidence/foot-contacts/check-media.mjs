import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,readdir,writeFile} from 'node:fs/promises';
const ffmpeg=process.argv[2];if(!ffmpeg)throw Error('Pass the local ffmpeg executable');
const clips=[['character',180,[['character-motion.jpg',90]]],['pedestrians',720,[['pedestrians.jpg',90]]],['football',480,[['football-practice.jpg',180],['sports-park.jpg',180]]],['basketball',480,[['basketball-practice.jpg',180],['basketball.jpg',180],['basketball-court.jpg',180]]],['locomotion',180,[['jumping.jpg',70]]],['switching',240,[['on-foot.jpg',35],['riding.jpg',110]]]];
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex'),rows=[];
for(const [name,count,stills] of clips){
 const dir=`.npm-cache/media/${name}`,frames=(await readdir(dir)).filter(f=>/^\d{4}\.png$/.test(f)).sort();assert.deepEqual(frames,Array.from({length:count},(_,i)=>String(i).padStart(4,'0')+'.png'));
 const first=await readFile(`${dir}/0000.png`),size=[first.readUInt32BE(16),first.readUInt32BE(20)];assert.deepEqual(size,[2400,1350]);
 for(const [file,frame] of stills)execFileSync(ffmpeg,['-v','error','-y','-i',`${dir}/${String(frame).padStart(4,'0')}.png`,'-q:v','2','-pix_fmt','yuvj444p',`docs/media/${file}`]);
 const files=[];
 for(const extension of ['gif','mp4']){
  const path=`docs/media/${name}.${extension}`,progress=execFileSync(ffmpeg,['-v','error','-i',path,'-progress','pipe:1','-nostats','-fps_mode','passthrough','-f','null','-'],{encoding:'utf8',maxBuffer:1024*1024});
  const decoded=Number([...progress.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1]);assert(decoded>0);if(extension==='mp4')assert.equal(decoded,count);files.push({path,sha256:await hash(path),decodedFrames:decoded});
 }
 rows.push({clip:name,sourceFrames:count,sourceSize:size,renderedFramesPerSimulationSecond:30,files,stills:await Promise.all(stills.map(async([file,frame])=>({path:`docs/media/${file}`,sourceFrame:frame,sha256:await hash(`docs/media/${file}`)})))});console.log(`${name}: source sequence, GIF, HD and matching still verified`);
}
await writeFile('docs/evidence/foot-contacts/media.json',JSON.stringify({offlineExport:true,livePerformanceMeasurement:false,sourceFrames:rows.reduce((n,r)=>n+r.sourceFrames,0),clips:rows},null,2)+'\n');
