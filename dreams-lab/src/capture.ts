import type {ExperimentRun} from './runner';

/** Dev-only source-frame export: 30 rendered frames per display second. */
export async function captureRun(run:ExperimentRun,svg:SVGSVGElement,frame:(step:number,fraction:number)=>void){
  if(!run.ended||run.length!==27)throw new Error('Capture requires a completed 27-step delivery run.');
  await document.fonts.ready;
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900;
  const context=canvas.getContext('2d')!,fontFaces=[...document.querySelectorAll('style')].map(s=>s.textContent??'').join('').match(/@font-face\{[^}]+\}/g)?.join('')??'';
  for(let index=0;index<210;index++){
    const position=index/30*4,step=Math.min(run.length,Math.floor(position));
    frame(step,step===run.length?1:position%1);
    const clone=svg.cloneNode(true) as SVGSVGElement;
    const originals=[svg,...svg.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
    originals.forEach((el,i)=>{
      const computed=getComputedStyle(el),copy=copies[i] as SVGElement;
      for(const name of ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','font-family','font-size','font-weight','paint-order'])copy.style.setProperty(name,computed.getPropertyValue(name));
    });
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width','1600');clone.setAttribute('height','740');
    const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=fontFaces;clone.prepend(style);
    const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone));await image.decode();
    context.fillStyle='#fafaf7';context.fillRect(0,0,1600,900);context.drawImage(image,0,80,1600,740);
    context.fillStyle='#171717';context.font='600 28px Manrope';context.fillText(run.scenario.id.replaceAll('_',' '),40,48);
    const metrics=run.metrics(step);context.font='20px Manrope';context.fillText(`${step} / ${run.scenario.maxSteps} steps · ${metrics.completed}/${metrics.total} tasks · ${metrics.creditsSpent} coins · ${metrics.violations} violations`,40,862);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG encoding failed.')),'image/png'));
    const response=await fetch(`/__lab-media/${String(index).padStart(4,'0')}.png`,{method:'POST',headers:{'content-type':'image/png'},body:blob});
    if(!response.ok)throw new Error(`Frame ${index} could not be saved (${response.status}).`);
    svg.dataset.captureFrame=String(index);
  }
  frame(run.length,1);
}
