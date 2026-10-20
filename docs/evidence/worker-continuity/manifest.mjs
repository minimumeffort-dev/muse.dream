import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const hash=b=>createHash('sha256').update(b).digest('hex'),dir='.npm-cache/media/shifts';
const frames=(await readdir(dir)).filter(n=>/^\d{4}\.png$/.test(n)).sort();
assert.equal(frames.length,600);
const aggregate=createHash('sha256'),selected=[];
for(const [i,name] of frames.entries()){
 assert.equal(name,String(i).padStart(4,'0')+'.png');const bytes=await readFile(`${dir}/${name}`);
 assert.equal(bytes.readUInt32BE(16),2400);assert.equal(bytes.readUInt32BE(20),1350);
 const sha256=hash(bytes);aggregate.update(name+'\n'+sha256+'\n');
 if([0,101,570,599].includes(i))selected.push({name,bytes:bytes.length,sha256});
}
const files=async paths=>Promise.all(paths.map(async path=>{const b=await readFile(path);return {path,bytes:b.length,sha256:hash(b)};}));
const ffmpeg='.npm-cache/media-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1',gifsicle='.npm-cache/media-tools/node_modules/gifsicle/vendor/gifsicle';
const video=spawnSync(ffmpeg,['-hide_banner','-i','docs/media/shifts.mp4','-map','0:v','-c','copy','-f','null','-'],{encoding:'utf8'});assert.equal(video.status,0);assert.match(video.stderr,/1600x900/);assert.match(video.stderr,/30 fps/);assert.match(video.stderr,/frame=\s*600\s/);
const gif=spawnSync(gifsicle,['--info','docs/media/shifts.gif'],{encoding:'utf8'}),info=gif.stdout+gif.stderr;assert.equal(gif.status,0);assert.match(info,/600 images/);assert.match(info,/1280x720/);
const result={date:'2026-10-20',baseCommit:'629b11c563959ac5f102a58c3f14fa012c339ee8',sources:await files(['src/game/repair-view.ts','src/game/main.ts','tests/repair-view.test.ts','tests/staff-shifts.test.ts','scripts/encode-media.mjs']),frames:{count:frames.length,dimensions:[2400,1350],renderedPerSimulationSecond:30,aggregateSha256:aggregate.digest('hex'),selected},outputs:await files(['docs/media/shifts.mp4','docs/media/shifts.gif','docs/media/shifts.jpg']),native:await files(['docs/evidence/worker-continuity/native-after.json','docs/evidence/worker-continuity/native-during.json','docs/evidence/worker-continuity/native-pause.json']),videoCheck:video.stderr.split(/\r?\n|\r/).filter(l=>/Duration:|Stream #0:0: Video:|frame=\s*600/.test(l)),gifCheck:info.split('\n').slice(0,2),commands:[`node scripts/encode-media.mjs ${ffmpeg} ${gifsicle} shifts`,`${ffmpeg} -y -i ${dir}/0570.png -frames:v 1 -q:v 2 docs/media/shifts.jpg`],limits:'Offline native rendering and deterministic replay, not live FPS, total browser memory or a hardware comparison.'};
await writeFile('docs/evidence/worker-continuity/manifest.json',JSON.stringify(result,null,2)+'\n');console.log(`Verified ${frames.length} native frames, 600 video/GIF frames, source and output hashes.`);
