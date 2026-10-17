import {createWorldScene} from './world-fixture';
import {buildWorldChunk} from '../game/chunk-builder';
import {packChunk,disposeChunk} from '../game/chunk-packet';

// Only accepted engine data and bounded mesh requests cross this boundary.
try {
  const start=performance.now(),scene=createWorldScene();
  postMessage({scene,compileMs:performance.now()-start});
  onmessage=({data})=>{
    try {
      const root=buildWorldChunk(scene,data.region),{packet,transfer}=packChunk(root);
      postMessage({id:data.id,packet},{transfer});disposeChunk(root);
    }catch(error){postMessage({error:error instanceof Error ? error.message : String(error)});}
  };
} catch(error) {postMessage({error:error instanceof Error ? error.message : String(error)});}
