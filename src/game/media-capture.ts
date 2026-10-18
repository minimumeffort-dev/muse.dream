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
export function mediaCapture(canvas:HTMLCanvasElement, clips:Record<string,number>, start:(clip:string)=>void|Promise<void>, input:(clip:string,frame:number)=>void=()=>{}) {
  if(!new URLSearchParams(location.search).has('capture'))return;
  const style=document.createElement('style');style.textContent='body{position:relative;width:1600px;height:900px;overflow:hidden}.hud,#npc-speech,#commerce-panel,#map-frame,#action-bar,#match-score,#social-invitation{position:absolute}#commerce-panel{bottom:104px;left:24px;width:344px;max-height:708px;overflow:auto}#action-bar{bottom:24px;max-width:calc(100% - 440px)}#map-frame{bottom:24px;width:184px}#world-map{width:168px;height:135px}#game{position:absolute;width:1600px;height:900px;inset:0}body>canvas:not(#world-map){width:1600px!important;height:900px!important}#media-capture{position:fixed;bottom:12px;left:16px;z-index:99;padding:10px;background:#17241f;color:#e6e9df;font:14px system-ui;display:flex;gap:10px}';document.head.append(style);
  const panel=document.createElement('div');panel.id='media-capture';
  const select=document.createElement('select');select.setAttribute('aria-label','Capture clip');
  for(const [name,frames] of Object.entries(clips))select.add(new Option(`${name} · ${frames} frames`,name));
  const button=document.createElement('button');button.textContent='Capture PNG frames';
  const status=document.createElement('output');status.setAttribute('aria-live','polite');status.textContent='30 fps · rendered PNG frames';
  panel.append(select,button,status);document.body.append(panel);
  let clip='',frame=0,busy=false,composite:HTMLCanvasElement|undefined;
  button.onclick=async()=>{clip=select.value;frame=0;busy=true;button.disabled=select.disabled=true;status.textContent='Preparing simulation';try{await start(clip);status.textContent='Capturing';}catch(error){clip='';status.textContent=String(error);button.disabled=select.disabled=false;}finally{busy=false;}};
  return {
    begin(){if(busy)return null;if(!clip)return undefined;input(clip,frame);return 1/30;},
    end(){
      if(!clip)return;
      busy=true;
      let output=canvas;
      const captions=[...document.querySelectorAll<HTMLElement>('#social-invitation:not([hidden]),#npc-speech:not([hidden]),#commerce-panel:not([hidden]),#action-bar,.hud,#map-frame,#action-feedback:not([hidden]),#match-score:not([hidden])')];
      if(captions.length){
        composite??=document.createElement('canvas');
        if(composite.width!==canvas.width || composite.height!==canvas.height){composite.width=canvas.width;composite.height=canvas.height;}
        const ctx=composite.getContext('2d')!,view=canvas.getBoundingClientRect(),scale=canvas.width/view.width;
        ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(canvas,0,0);ctx.save();ctx.scale(scale,scale);
        const clipSlots=(element:Element)=>{const grid=element.closest('.choice-grid');if(grid){const r=grid.getBoundingClientRect();ctx.beginPath();ctx.rect(r.x-view.x,r.y-view.y,r.width,r.height);ctx.clip();}};
        for(const caption of captions){if(getComputedStyle(caption).visibility==='hidden' || !caption.getClientRects().length)continue;const box=caption.getBoundingClientRect(),style=getComputedStyle(caption);
        const x=box.x-view.x,y=box.y-view.y;ctx.fillStyle=style.backgroundColor;ctx.beginPath();ctx.roundRect(x,y,box.width,box.height,parseFloat(style.borderRadius)||0);ctx.fill();
        if(parseFloat(style.borderWidth)>0){ctx.strokeStyle=style.borderColor;ctx.lineWidth=parseFloat(style.borderWidth);ctx.stroke();}ctx.save();ctx.clip();ctx.textBaseline='top';
        for(const element of [caption,...caption.querySelectorAll<HTMLElement>('strong,p,button,output,select,summary,label,input,.caption-text,.choice-label,.choice-detail,.action-copy,#activity-keys span,.ui-label,kbd,#boost-label,.boost-fill,.sport-meter,.sport-meter i,.sport-meter b,.status-card,.icon-slot,.fullness-track,.fullness-track i,#commerce-views,#match-state,#match-clock')]){
          if(element.hidden || element.classList.contains('sr-only') || !element.getClientRects().length)continue;
          ctx.save();try{clipSlots(element);
          const rect=element.getBoundingClientRect(),textStyle=getComputedStyle(element),fontSize=parseFloat(textStyle.fontSize),lineHeight=parseFloat(textStyle.lineHeight)||fontSize*1.2;
          const padding=parseFloat(textStyle.paddingLeft)||0,top=parseFloat(textStyle.paddingTop)||0;
          if(element instanceof HTMLButtonElement || element instanceof HTMLSelectElement || element instanceof HTMLInputElement || element.matches('kbd,.boost-fill,.sport-meter,.sport-meter i,.sport-meter b,.status-card,.icon-slot,.fullness-track,.fullness-track i,#commerce-views')){ctx.fillStyle=textStyle.backgroundColor;ctx.beginPath();ctx.roundRect(rect.x-view.x,rect.y-view.y,rect.width,rect.height,parseFloat(textStyle.borderRadius)||0);ctx.fill();if(parseFloat(textStyle.borderWidth)>0){ctx.strokeStyle=textStyle.borderColor;ctx.lineWidth=parseFloat(textStyle.borderWidth);ctx.stroke();}}
          if(element.childElementCount && !element.matches('select,summary,label'))continue;
          if(element===caption && !element.matches('button,output'))continue;
          ctx.font=textStyle.font;ctx.fillStyle=textStyle.color;ctx.textAlign=textStyle.textAlign==='center' ? 'center' : 'left';
          if(!element.childElementCount && element.firstChild?.nodeType===Node.TEXT_NODE){
            const node=element.firstChild;if(node?.nodeType===Node.TEXT_NODE){const range=document.createRange();let line='',left=0,top=0,height=0;
              const flush=()=>{if(line){ctx.textAlign='left';ctx.fillText(line,left-view.x,top-view.y+(height-fontSize)/2);line='';}};
              for(let i=0;i<node.textContent!.length;i++){range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();if(line && Math.abs(r.top-top)>1)flush();if(!line){left=r.left;top=r.top;height=r.height;}line+=node.textContent![i];}flush();
            }continue;
          }
          const text=element instanceof HTMLInputElement ? element.value : element instanceof HTMLElement && element.tagName==='SUMMARY' ? (element.parentElement instanceof HTMLDetailsElement && element.parentElement.open ? '▾ ' : '▸ ')+element.textContent : element instanceof HTMLSelectElement ? element.selectedOptions[0]?.text??'' : element.textContent??'';
          captionLines(text,rect.width-padding*2,text=>ctx.measureText(text).width).forEach((line,i)=>ctx.fillText(line,rect.x-view.x+(ctx.textAlign==='center' ? rect.width/2 : padding),rect.y-view.y+top+(lineHeight-fontSize)/2+i*lineHeight));
          }finally{ctx.restore();}
        }
        for(const svg of caption.querySelectorAll<SVGSVGElement>('svg')){
          if(!svg.getClientRects().length || getComputedStyle(svg).display==='none')continue;
          const rect=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;
          ctx.save();clipSlots(svg);ctx.translate(rect.x-view.x,rect.y-view.y);ctx.scale(rect.width/vb.width,rect.height/vb.height);ctx.translate(-vb.x,-vb.y);
          for(const path of svg.querySelectorAll('path')){const ps=getComputedStyle(path),shape=new Path2D(path.getAttribute('d')!);if(ps.fill!=='none'){ctx.fillStyle=ps.fill;ctx.fill(shape);}if(ps.stroke!=='none'){ctx.strokeStyle=ps.stroke;ctx.lineWidth=parseFloat(ps.strokeWidth);ctx.lineCap=ps.strokeLinecap as CanvasLineCap;ctx.lineJoin=ps.strokeLinejoin as CanvasLineJoin;ctx.stroke(shape);}}
          ctx.restore();
        }
        ctx.restore();
        }
        {const map=document.querySelector<HTMLCanvasElement>('#world-map');if(map && !map.hidden && map.getClientRects().length && getComputedStyle(map).visibility!=='hidden'){const r=map.getBoundingClientRect();ctx.save();ctx.beginPath();ctx.roundRect(r.x-view.x,r.y-view.y,r.width,r.height,parseFloat(getComputedStyle(map).borderRadius)||0);ctx.clip();ctx.drawImage(map,r.x-view.x,r.y-view.y,r.width,r.height);ctx.restore();}}
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
