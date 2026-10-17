export interface Loading {
  stage(label:string):Promise<void>;
  build<T>(label:string,steps:Generator<void,T>):Promise<T>;
  ready():void;
  fail(error:unknown):void;
}
const yieldToPage=()=>new Promise<void>(resolve=>setTimeout(resolve,0));

/** Phase names describe real work; no invented percentage or minimum delay. */
export function loadingScreen() {
  const screen=document.querySelector<HTMLElement>('#loading')!,status=document.querySelector<HTMLElement>('#loading-status')!;
  const start=performance.now(),phases:{label:string;startMs:number;endMs?:number}[]=[];
  let lastYield=start,previous=start,maxGap=0,heartbeats=0;
  const heartbeat=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-previous);previous=now;heartbeats++;},50);
  const stage=async(label:string)=>{
    const now=performance.now();if(phases.length)phases.at(-1)!.endMs=now-start;
    phases.push({label,startMs:now-start});status.textContent=label;
    await yieldToPage();lastYield=performance.now();
  };
  const stop=()=>{clearInterval(heartbeat);maxGap=Math.max(maxGap,performance.now()-previous);if(phases.length)phases.at(-1)!.endMs=performance.now()-start;};
  return {
    stage,
    async build<T>(label:string,steps:Generator<void,T>):Promise<T>{
      await stage(label);
      let result=steps.next();while(!result.done){if(performance.now()-lastYield>=12){await yieldToPage();lastYield=performance.now();}result=steps.next();}return result.value;
    },
    ready(){
      stop();screen.hidden=true;document.body.dataset.loading='ready';document.querySelector('#game')!.setAttribute('aria-busy','false');
      screen.dataset.result=JSON.stringify({totalMs:performance.now()-start,phases,heartbeat:{samples:heartbeats,maxGapMs:maxGap}});
    },
    fail(error:unknown){
      stop();screen.hidden=false;document.body.dataset.loading='error';status.setAttribute('role','alert');status.textContent='The world couldn’t start. Reload to try again.';
      document.querySelector<HTMLButtonElement>('#loading-retry')!.hidden=false;document.querySelector('#loading-track')!.setAttribute('hidden','');
      console.error(error);
    },
  };
}
