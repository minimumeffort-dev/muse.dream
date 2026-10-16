// Development-only, frame-by-frame PNG export through Vite. No interpolated frames.
export function mediaCapture(canvas:HTMLCanvasElement, clips:Record<string,number>, start:(clip:string)=>void, input:(clip:string,frame:number)=>void=()=>{}) {
  if(!new URLSearchParams(location.search).has('capture'))return;
  const style=document.createElement('style');style.textContent='body{width:1600px;height:900px;overflow:hidden}#game{position:absolute;width:1600px;height:900px;inset:0}body>canvas:not(#world-map){width:1600px!important;height:900px!important}#media-capture{position:fixed;bottom:12px;left:16px;z-index:99;padding:10px;background:#17241f;color:#e6e9df;font:14px system-ui;display:flex;gap:10px}';document.head.append(style);
  const panel=document.createElement('div');panel.id='media-capture';
  const select=document.createElement('select');select.setAttribute('aria-label','Capture clip');
  for(const [name,frames] of Object.entries(clips))select.add(new Option(`${name} · ${frames} frames`,name));
  const button=document.createElement('button');button.textContent='Capture PNG frames';
  const status=document.createElement('output');status.setAttribute('aria-live','polite');status.textContent='1600 × 900 · 30 fps';
  panel.append(select,button,status);document.body.append(panel);
  let clip='',frame=0,busy=false;
  button.onclick=()=>{clip=select.value;frame=0;button.disabled=select.disabled=true;start(clip);status.textContent='Capturing';};
  return {
    begin(){if(busy)return null;if(!clip)return undefined;input(clip,frame);return 1/30;},
    end(){
      if(!clip)return;
      busy=true;
      canvas.toBlob(async blob=>{
        try{
          if(!blob)throw Error('PNG encoding failed');
          const response=await fetch(`/__media/${clip}/${String(frame).padStart(4,'0')}.png`,{method:'POST',headers:{'Content-Type':'image/png'},body:blob});
          if(!response.ok)throw Error(`Frame export failed: ${response.status}`);
          frame++;status.textContent=`${frame} / ${clips[clip]} frames`;
          if(frame===clips[clip]){clip='';status.textContent=`Saved ${frame} frames · complete`;button.disabled=select.disabled=false;}
        }catch(error){clip='';status.textContent=String(error);button.disabled=select.disabled=false;}
        finally{busy=false;}
      },'image/png');
    }
  };
}
