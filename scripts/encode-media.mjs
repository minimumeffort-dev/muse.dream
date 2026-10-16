import {execFileSync} from 'node:child_process';
import {readdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
const ffmpeg=process.argv[2]||'ffmpeg',gifsicle=process.argv[3]||'gifsicle';
const clips=[['driving',210],['switching',240],['destruction',120],['locomotion',180],['swimming',180],['daynight',360],['flight',300]];
const selected=process.argv.slice(4);
if(selected.some(name=>!clips.some(([clip])=>clip===name)))throw Error('Unknown capture clip');
for(const [name,count] of clips.filter(([name])=>!selected.length || selected.includes(name))){
  const dir=resolve('.npm-cache/media',name),frames=(await readdir(dir)).filter(f=>/^\d{4}\.png$/.test(f)).sort();
  if(frames.length!==count || frames.some((f,i)=>f!==String(i).padStart(4,'0')+'.png'))throw Error(`${name}: expected ${count} consecutive source frames`);
  const input=['-y','-framerate','30','-i',`${dir}/%04d.png`];
  execFileSync(ffmpeg,[...input,'-vf','scale=1600:900:flags=lanczos','-c:v','libx264','-crf','18','-preset','slow','-pix_fmt','yuv420p','-movflags','+faststart',`docs/media/${name}.mp4`],{stdio:['ignore','ignore','pipe']});
  execFileSync(ffmpeg,[...input,'-filter_complex','scale=960:540:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',`${dir}/palette.gif`],{stdio:['ignore','ignore','pipe']});
  execFileSync(gifsicle,['-O3','--lossy=100','--colors=192',`${dir}/palette.gif`,'-o',`docs/media/${name}.gif`],{stdio:['ignore','ignore','pipe']});
  console.log(`${name}: ${count} frames at 30 fps · GIF ${((await stat(`docs/media/${name}.gif`)).size/1e6).toFixed(2)} MB`);
}
