import {loadingScreen} from './loading';
import {WorldWorkerClient} from './world-worker-client';

const loading=loadingScreen();
document.querySelector('#loading-retry')!.addEventListener('click',()=>location.reload());
async function boot(){
  const worker=new WorldWorkerClient(new Worker(new URL('../scene/world-worker.ts',import.meta.url),{type:'module'}),ms=>{
    document.querySelector<HTMLElement>('#loading')!.dataset.compileMs=String(ms);
  });
  addEventListener('pagehide',event=>{if(!event.persisted)worker.dispose();});
  try {
    await loading.stage('Reading Dream · checking the world');
    const [scene,game]=await Promise.all([worker.scene,import('./main')]);
    await game.start(scene,loading,worker);
  } catch(error) {worker.dispose();loading.fail(error);}
}
void boot();
