import {createWorldScene,worldSource,worldModules} from './world-fixture';
import {buildWorldChunk} from '../game/chunk-builder';
import {packChunk,disposeChunk} from '../game/chunk-packet';
import {saveCompatibilitySource,sha256} from './save-compatibility';

// Only accepted engine data and bounded mesh requests cross this boundary.
async function boot(){try {
  const start=performance.now(),source=JSON.stringify([worldSource,Object.entries(worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)]);
  const sourceHash=await sha256(source);
  const scene=createWorldScene(sourceHash);
  const saveCompatibility=await sha256(saveCompatibilitySource(scene));
  postMessage({scene,saveCompatibility,compileMs:performance.now()-start});
  onmessage=({data})=>{
    try {
      const root=buildWorldChunk(scene,data.region),{packet,transfer}=packChunk(root);
      postMessage({id:data.id,packet},{transfer});disposeChunk(root);
    }catch(error){postMessage({error:error instanceof Error ? error.message : String(error)});}
  };
} catch(error) {postMessage({error:error instanceof Error ? error.message : String(error)});}}
void boot();
