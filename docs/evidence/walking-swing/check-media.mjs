import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,readdir,stat,writeFile} from 'node:fs/promises';
const ffmpeg=process.argv[2];if(!ffmpeg)throw Error('Pass the local ffmpeg executable');
const clips=[['character',180,[['character-motion.jpg',68]]],['pedestrians',720,[['pedestrians.jpg',90]]],['locomotion',180,[['jumping.jpg',70]]]];
const renderFiles=['src/game/humanoid-gait.ts','src/game/character-animation.ts','src/game/ambient-population.ts','src/game/shaders.ts','tests/visual/locomotion.js','tests/visual/locomotion.html'];
const captureSource='src/game/main.ts',captureChangedAt=(await stat(captureSource)).mtimeMs;
const newestSource=Math.max(...await Promise.all(renderFiles.map(async file=>(await stat(file)).mtimeMs)));
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex'),rows=[];
for(const [name,count,stills] of clips){
 const dir=`.npm-cache/media/${name}`,frames=(await readdir(dir)).filter(f=>/^\d{4}\.png$/.test(f)).sort();assert.deepEqual(frames,Array.from({length:count},(_,i)=>String(i).padStart(4,'0')+'.png'));
 for(const frame of frames)assert((await stat(`${dir}/${frame}`)).mtimeMs>=Math.max(newestSource,name==='locomotion' ? captureChangedAt : 0),`${name}/${frame}: superseded draft frame`);
 const first=await readFile(`${dir}/0000.png`),size=[first.readUInt32BE(16),first.readUInt32BE(20)];assert.deepEqual(size,[2400,1350]);
 for(const [file,frame] of stills)execFileSync(ffmpeg,['-v','error','-y','-i',`${dir}/${String(frame).padStart(4,'0')}.png`,'-q:v','2','-pix_fmt','yuvj444p',`docs/media/${file}`]);
 const files=[];
 for(const extension of ['gif','mp4']){
  const path=`docs/media/${name}.${extension}`,progress=execFileSync(ffmpeg,['-v','error','-i',path,'-progress','pipe:1','-nostats','-fps_mode','passthrough','-f','null','-'],{encoding:'utf8',maxBuffer:1024*1024});
  const decoded=Number([...progress.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1]);assert(decoded>0);if(extension==='mp4')assert.equal(decoded,count);files.push({path,sha256:await hash(path),decodedFrames:decoded});
 }
 rows.push({clip:name,sourceFrames:count,sourceSize:size,renderedFramesPerSimulationSecond:30,files,stills:await Promise.all(stills.map(async([file,frame])=>({path:`docs/media/${file}`,sourceFrame:frame,sha256:await hash(`docs/media/${file}`)})))});console.log(`${name}: source sequence, GIF, HD and matching still verified`);
}
await writeFile('docs/evidence/walking-swing/media.json',JSON.stringify({offlineExport:true,livePerformanceMeasurement:false,capturePreparation:{path:captureSource,sha256:await hash(captureSource),changedClip:'locomotion',notes:'Only the locomotion start moved to the existing clear park review pose. Other clip preparation is unchanged.'},renderSources:await Promise.all(renderFiles.map(async path=>({path,sha256:await hash(path)}))),sourceFrames:rows.reduce((n,r)=>n+r.sourceFrames,0),clips:rows},null,2)+'\n');
