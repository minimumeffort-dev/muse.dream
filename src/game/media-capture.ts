/** Match normal wrapped caption text; long words remain bounded by the visible panel. */
export function captionLines(text:string,width:number,measure:(text:string)=>number):string[]{
  const lines:string[]=[];let line='';
  for(const word of text.trim().split(/\s+/)){
    if(line && measure(line+' '+word)<=width){line+=' '+word;continue;}
    if(line){lines.push(line);line='';}
    for(const character of word){if(line && measure(line+character)>width){lines.push(line);line='';}line+=character;}
  }
  if(line)lines.push(line);return lines;
}
// Development-only, frame-by-frame PNG export through Vite. No interpolated frames.
export function mediaCapture(canvas:HTMLCanvasElement, clips:Record<string,number>, start:(clip:string)=>void, input:(clip:string,frame:number)=>void=()=>{}) {
  if(!new URLSearchParams(location.search).has('capture'))return;
  const style=document.createElement('style');style.textContent='body{width:1600px;height:900px;overflow:hidden}#game{position:absolute;width:1600px;height:900px;inset:0}body>canvas:not(#world-map){width:1600px!important;height:900px!important}#media-capture{position:fixed;bottom:12px;left:16px;z-index:99;padding:10px;background:#17241f;color:#e6e9df;font:14px system-ui;display:flex;gap:10px}';document.head.append(style);
  const panel=document.createElement('div');panel.id='media-capture';
  const select=document.createElement('select');select.setAttribute('aria-label','Capture clip');
  for(const [name,frames] of Object.entries(clips))select.add(new Option(`${name} · ${frames} frames`,name));
  const button=document.createElement('button');button.textContent='Capture PNG frames';
  const status=document.createElement('output');status.setAttribute('aria-live','polite');status.textContent='30 fps · rendered PNG frames';
  panel.append(select,button,status);document.body.append(panel);
  let clip='',frame=0,busy=false,composite:HTMLCanvasElement|undefined;
  button.onclick=()=>{clip=select.value;frame=0;button.disabled=select.disabled=true;start(clip);status.textContent='Capturing';};
  return {
    begin(){if(busy)return null;if(!clip)return undefined;input(clip,frame);return 1/30;},
    end(){
      if(!clip)return;
      busy=true;
      let output=canvas;
      const captions=[...document.querySelectorAll<HTMLElement>('#npc-speech:not([hidden]),#commerce-panel:not([hidden])')];
      if(captions.length){
        composite??=document.createElement('canvas');
        if(composite.width!==canvas.width || composite.height!==canvas.height){composite.width=canvas.width;composite.height=canvas.height;}
        const ctx=composite.getContext('2d')!,view=canvas.getBoundingClientRect(),scale=canvas.width/view.width;
        ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(canvas,0,0);ctx.save();ctx.scale(scale,scale);
        for(const caption of captions){const box=caption.getBoundingClientRect(),style=getComputedStyle(caption);
        const x=box.x-view.x,y=box.y-view.y;ctx.fillStyle=style.backgroundColor;ctx.beginPath();ctx.roundRect(x,y,box.width,box.height,parseFloat(style.borderRadius));ctx.fill();
        ctx.strokeStyle=style.borderColor;ctx.lineWidth=parseFloat(style.borderWidth)||1;ctx.stroke();ctx.textBaseline='top';
        for(const element of caption.querySelectorAll<HTMLElement>('strong,p,button,output,select')){
          if(element.hidden || !element.getClientRects().length)continue;
          const rect=element.getBoundingClientRect(),textStyle=getComputedStyle(element),fontSize=parseFloat(textStyle.fontSize),lineHeight=parseFloat(textStyle.lineHeight)||fontSize*1.2;
          const padding=parseFloat(textStyle.paddingLeft)||0,top=parseFloat(textStyle.paddingTop)||0;
          if(element instanceof HTMLButtonElement || element instanceof HTMLSelectElement){ctx.fillStyle=textStyle.backgroundColor;ctx.beginPath();ctx.roundRect(rect.x-view.x,rect.y-view.y,rect.width,rect.height,parseFloat(textStyle.borderRadius)||0);ctx.fill();ctx.strokeStyle=textStyle.borderColor;ctx.lineWidth=parseFloat(textStyle.borderWidth)||1;ctx.stroke();}
          ctx.font=textStyle.font;ctx.fillStyle=textStyle.color;ctx.textAlign=textStyle.textAlign==='center' ? 'center' : 'left';
          const text=element instanceof HTMLSelectElement ? element.selectedOptions[0]?.text??'' : element.textContent??'';
          captionLines(text,rect.width-padding*2,text=>ctx.measureText(text).width).forEach((line,i)=>ctx.fillText(line,rect.x-view.x+(ctx.textAlign==='center' ? rect.width/2 : padding),rect.y-view.y+top+(lineHeight-fontSize)/2+i*lineHeight));
        }
        }
        ctx.restore();output=composite;
      }
      output.toBlob(async blob=>{
        try{
          if(!blob)throw Error('PNG encoding failed');
          const response=await fetch(`/__media/${clip}/${String(frame).padStart(4,'0')}.png`,{method:'POST',headers:{'Content-Type':'image/png'},body:blob});
          if(!response.ok)throw Error(`Frame export failed: ${response.status}`);
          frame++;status.textContent=`${frame} / ${clips[clip]} frames`;
          if(frame===clips[clip]){clip='';status.textContent=`Saved ${frame} frames · complete`;button.disabled=select.disabled=false;}
        }catch(error){clip='';status.textContent=String(error);button.disabled=select.disabled=false;}
        finally{busy=false;if(!clip && composite){composite.width=composite.height=0;composite=undefined;}}
      },'image/png');
    }
  };
}
