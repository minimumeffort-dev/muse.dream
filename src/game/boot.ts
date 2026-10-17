import type {Scene} from '../scene/schema';
import {loadingScreen} from './loading';

const loading=loadingScreen();
document.querySelector('#loading-retry')!.addEventListener('click',()=>location.reload());
function loadWorld():Promise<Scene>{
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('../scene/world-worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=({data}:{data:{scene:Scene;compileMs:number;error?:string}})=>{
      worker.terminate();if(data.error){reject(new Error(data.error));return;}
      document.querySelector<HTMLElement>('#loading')!.dataset.compileMs=String(data.compileMs);resolve(data.scene);
    };
    worker.onerror=event=>{event.preventDefault();worker.terminate();reject(new Error(event.message||'World worker failed'));};
    worker.onmessageerror=()=>{worker.terminate();reject(new Error('World data could not be read'));};
  });
}
async function boot(){
  try {
    await loading.stage('Reading Dream · checking the world');
    const [scene,game]=await Promise.all([loadWorld(),import('./main')]);
    await game.start(scene,loading);
  } catch(error) {loading.fail(error);}
}
void boot();
