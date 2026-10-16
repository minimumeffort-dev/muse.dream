import type { WebGLRenderer } from "three";

/** Dev-only real render timings. Fixed simulation inputs make before/after runs comparable. */
export function renderProfile(renderer:WebGLRenderer,reset:()=>void,input:(drive:boolean,frame:number)=>void) {
  if(!new URLSearchParams(location.search).has("profile"))return;
  const panel=document.createElement("aside");panel.id="render-profile";
  panel.style.cssText="position:fixed;bottom:16px;left:16px;z-index:99;background:#152825;color:#fff;padding:12px;font:13px monospace;max-width:570px";
  const still=document.createElement("button"),drive=document.createElement("button"),output=document.createElement("pre");
  still.textContent="Measure still";drive.textContent="Measure drive";output.textContent="Full quality · full resident world · 60 warm-up + 300 measured frames";
  panel.append(still,drive,output);document.body.append(panel);
  const gl=renderer.getContext() as WebGL2RenderingContext,ext=gl.getExtension("EXT_disjoint_timer_query_webgl2");
  const pending:{query:WebGLQuery;measured:boolean}[]=[],gpu:number[]=[],samples:{prepare:number;submit:number;frame:number;calls:number;triangles:number}[]=[];
  let running=false,driving=false,frame=0,query:WebGLQuery|null=null,start=0,renderStart=0,interval=0;
  const run=(moving:boolean)=>{for(const item of pending)gl.deleteQuery(item.query);pending.length=0;reset();input(false,0);driving=moving;frame=0;running=true;samples.length=gpu.length=0;still.disabled=drive.disabled=true;delete panel.dataset.result;output.textContent="Warming up";};
  still.onclick=()=>run(false);drive.onclick=()=>run(true);
  const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {mean:values.reduce((a,b)=>a+b,0)/values.length,p95:sorted[Math.ceil(sorted.length*.95)-1]};};
  return {
    begin(elapsed:number){
      start=performance.now();interval=elapsed;
      if(!running)return 0;
      if(document.hidden){running=false;still.disabled=drive.disabled=false;output.textContent="Interrupted: keep this tab visible to measure.";return 0;}
      input(driving,frame);return driving ? 1/60 : 0;
    },
    beforeRender(){
      renderStart=performance.now();
      if(ext && running && pending.length<8){query=gl.createQuery();if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);}
    },
    end(){
      const end=performance.now();
      if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({query,measured:frame>=60});query=null;}
      const disjoint=ext && gl.getParameter(ext.GPU_DISJOINT_EXT);
      if(disjoint)gpu.length=0;
      for(let i=pending.length-1;i>=0;i--){const item=pending[i]!;
        if(disjoint || gl.getQueryParameter(item.query,gl.QUERY_RESULT_AVAILABLE)){
          if(!disjoint && item.measured)gpu.push(gl.getQueryParameter(item.query,gl.QUERY_RESULT)/1e6);
          gl.deleteQuery(item.query);pending.splice(i,1);
        }
      }
      if(!running)return;
      if(frame>=60)samples.push({prepare:renderStart-start,submit:end-renderStart,frame:interval,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
      frame++;
      if(frame<360){if(frame%60===0)output.textContent=`${frame} / 360 frames`;return;}
      running=false;input(false,0);still.disabled=drive.disabled=false;
      const report={scenario:driving?"drive":"still",samples:samples.length,viewport:[renderer.domElement.width,renderer.domElement.height],pixelRatio:renderer.getPixelRatio(),
        cpuMs:stats(samples.map(s=>s.prepare+s.submit)),prepareMs:stats(samples.map(s=>s.prepare)),submitMs:stats(samples.map(s=>s.submit)),rafMs:stats(samples.map(s=>s.frame)),
        gpuMs:gpu.length?stats(gpu):null,gpuSamples:gpu.length,draws:stats(samples.map(s=>s.calls)),triangles:stats(samples.map(s=>s.triangles)),geometries:renderer.info.memory.geometries};
      output.textContent=JSON.stringify(report,null,2);panel.dataset.result=JSON.stringify(report);
    }
  };
}
