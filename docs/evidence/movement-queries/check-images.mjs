import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const ffmpeg=process.argv[2];if(!ffmpeg)throw Error('Pass the local ffmpeg executable');
const root='docs/evidence/movement-queries/';
for(const [prefix,names,output,scope] of [
 ['browser',['browser-before.jpg','browser-after.jpg'],'pixels.json','Full native screenshot outside both profiler-panel rectangles, with two CSS pixels of margin. Same frozen end of the 360-frame drive; dust is randomized.'],
 ['still',['still-before.jpg','still-after.jpg'],'still-pixels.json','Static world after equal drive/reset sequences. Full native screenshots outside both profiler panels, plus two CSS pixels of margin. These runs overlap regression tests and are visual checks only.'],
]){
 const panels=Object.values(JSON.parse(await readFile(root+prefix+'-panels.json','utf8'))),[width,height]=panels[0].viewport;
 assert(width<=5000 && height<=5000);for(const panel of panels)assert.deepEqual(panel.viewport,[width,height]);
 const buffers=names.map(p=>{const result=spawnSync(ffmpeg,['-hide_banner','-i',root+p,'-vf','showinfo','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:80_000_000});assert.equal(result.status,0,String(result.stderr));const dimensions=/showinfo[^\n]* s:(\d+)x(\d+)/.exec(result.stderr.toString());assert(dimensions);assert.deepEqual(dimensions.slice(1).map(Number),[width,height],'These recorded screenshots use native CSS-pixel dimensions');return result.stdout;});for(const data of buffers)assert.equal(data.length,width*height*3);
 let checkedPixels=0,changedPixels=0,maximumChannelDifference=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(panels.some(p=>x>=Math.floor(p.x)-2 && x<=Math.ceil(p.x+p.width)+2 && y>=Math.floor(p.y)-2 && y<=Math.ceil(p.y+p.height)+2))continue;
  const i=(y*width+x)*3,d=Math.max(...[0,1,2].map(c=>Math.abs(buffers[0][i+c]-buffers[1][i+c])));checkedPixels++;changedPixels+=Number(d>0);maximumChannelDifference=Math.max(maximumChannelDifference,d);
 }
 if(prefix==='still')assert.equal(changedPixels,0,'Frozen world pixels changed');
 const report={size:[width,height],scope,checkedPixels,changedPixels,maximumChannelDifference};await writeFile(root+output,JSON.stringify(report,null,2)+'\n');console.log(report);
}
