import type { WebGLRenderer } from "three";

/** Dev-only real render timings. Fixed simulation inputs make before/after runs comparable. */
export function renderProfile(renderer:WebGLRenderer,reset:()=>void,input:(drive:boolean,frame:number)=>void) {
  if(!new URLSearchParams(location.search).has("profile"))return;
  const panel=document.createElement("aside");panel.id="render-profile";
  panel.style.cssText="position:fixed;bottom:16px;left:16px;z-index:99;background:#152825;color:#fff;padding:12px;font:13px monospace;max-width:570px";
  const still=document.createElement("button"),drive=document.createElement("button"),journey=document.createElement("button"),output=document.createElement("pre");
  still.textContent="Measure still";drive.textContent="Measure drive";output.textContent="Full quality · streamed world · 60 warm-up + 300 measured frames";
  journey.textContent="Measure journey";journey.title="Use normal controls: 60 warm-up + 3600 measured frames. Stay on this tab.";
  panel.append(still,drive,journey,output);document.body.append(panel);
  const gl=renderer.getContext() as WebGL2RenderingContext,ext=gl.getExtension("EXT_disjoint_timer_query_webgl2");
  const pending:{query:WebGLQuery;measured:boolean}[]=[],gpu:number[]=[],samples:{prepare:number;submit:number;frame:number;presentation:number;calls:number;triangles:number}[]=[];
  let running=false,scenario:'still'|'drive'|'journey'='still',frame=0,query:WebGLQuery|null=null,start=0,renderStart=0,interval=0;
  let runStart=0,lastPresentation=0,holdStart:number|undefined,heldMs=0,totalHeldMs=0,waitEpisodes=0;
  const buttons=(disabled:boolean)=>{still.disabled=drive.disabled=journey.disabled=disabled;};
  const interrupt=()=>{if(!running || !document.hidden)return false;running=false;input(false,0);buttons(false);output.textContent="Interrupted: keep this tab visible to measure.";return true;};
  const run=(next:typeof scenario)=>{for(const item of pending)gl.deleteQuery(item.query);pending.length=0;reset();input(false,0);scenario=next;frame=0;running=true;samples.length=gpu.length=0;runStart=lastPresentation=performance.now();holdStart=undefined;heldMs=totalHeldMs=waitEpisodes=0;buttons(true);delete panel.dataset.result;output.textContent=next==='journey' ? 'Use normal controls · warming up' : 'Warming up';};
  still.onclick=()=>run('still');drive.onclick=()=>run('drive');journey.onclick=()=>run('journey');
  const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {mean:values.reduce((a,b)=>a+b,0)/values.length,p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1)};};
  return {
    begin(elapsed:number){
      start=performance.now();interval=elapsed;
      if(!running)return 0;
      heldMs=0;
      if(interrupt())return 0;
      if(scenario==='journey')return Math.min(elapsed/1000,.1);
      input(scenario==='drive',frame);return scenario==='drive' ? 1/60 : 0;
    },
    hold(){if(running && holdStart===undefined){holdStart=performance.now();waitEpisodes++;}},
    resume(){if(holdStart!==undefined){heldMs=performance.now()-holdStart;totalHeldMs+=heldMs;holdStart=undefined;}},
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
      if(!running || interrupt())return;
      if(frame>=60)samples.push({prepare:renderStart-start-heldMs,submit:end-renderStart,frame:interval,presentation:end-lastPresentation,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
      lastPresentation=end;
      frame++;
      const frames=scenario==='journey' ? 3660 : 360;
      if(frame<frames){if(frame%60===0)output.textContent=`${frame} / ${frames} frames${scenario==='journey' ? ' · use normal controls' : ''}`;return;}
      running=false;input(false,0);buttons(false);
      const report={scenario,samples:samples.length,wallMs:end-runStart,wait:{episodes:waitEpisodes,ms:totalHeldMs},viewport:[renderer.domElement.width,renderer.domElement.height],pixelRatio:renderer.getPixelRatio(),
        cpuMs:stats(samples.map(s=>s.prepare+s.submit)),prepareMs:stats(samples.map(s=>s.prepare)),submitMs:stats(samples.map(s=>s.submit)),rafMs:stats(samples.map(s=>s.frame)),
        presentationMs:stats(samples.map(s=>s.presentation)),
        gpuMs:gpu.length?stats(gpu):null,gpuSamples:gpu.length,draws:stats(samples.map(s=>s.calls)),triangles:stats(samples.map(s=>s.triangles)),geometries:renderer.info.memory.geometries};
      output.textContent=JSON.stringify(report,null,2);panel.dataset.result=JSON.stringify(report);
    }
  };
}
