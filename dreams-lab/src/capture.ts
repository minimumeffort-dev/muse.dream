import type {ExperimentRun} from './runner';
import type {ExperimentWorld} from './world-view';

/** The live Three renderer supplies every source frame at 30 fps. */
export async function captureRun(run:ExperimentRun,view:ExperimentWorld,frame:(step:number)=>void){
  if(!run.ended||run.length!==27)throw new Error('Capture requires a completed 27-step delivery run.');
  await document.fonts.ready;view.beginCapture();
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900;const context=canvas.getContext('2d')!;
  let lastStep=-1;
  for(let index=0;index<840;index++){
    const position=index/30,step=Math.min(run.length,Math.ceil(position));
    const fraction=step===0?1:Math.min(1,position-(step-1));
    if(step!==lastStep){frame(step);lastStep=step;}
    const rendered=view.capture(run.at(step),run.at(Math.max(0,step-1)),fraction,index===0);
    context.fillStyle='#fafaf7';context.fillRect(0,0,1600,900);context.drawImage(rendered.canvas,0,80);
    context.font='600 16px Manrope';context.textAlign='center';
    for(const label of rendered.labels){
      const width=context.measureText(label.text).width+20,x=label.x,y=label.y+80;if(x<0||x>1600||y<80||y>820)continue;
      context.fillStyle=label.agent?label.color:'#fafaf7';context.fillRect(x-width/2,y-23,width,25);
      context.fillStyle=label.agent&&label.text!=='A'?'#fafaf7':'#171717';context.fillText(label.text,x,y-5);
    }
    context.fillStyle='#171717';context.textAlign='left';context.font='600 28px Manrope';context.fillText(run.scenario.id.replaceAll('_',' '),40,48);
    const metrics=run.metrics(step);context.font='20px Manrope';context.fillText(step+' / '+run.scenario.maxSteps+' steps · '+metrics.completed+'/'+metrics.total+' tasks · '+metrics.creditsSpent+' coins · '+metrics.violations+' violations',40,862);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG encoding failed.')),'image/png'));
    const response=await fetch('/__lab-media/'+String(index).padStart(4,'0')+'.png',{method:'POST',headers:{'content-type':'image/png'},body:blob});
    if(!response.ok)throw new Error('Frame '+index+' could not be saved ('+response.status+').');
    document.querySelector<HTMLElement>('#experiment-world')!.dataset.captureFrame=String(index);
  }
  frame(run.length);
}
