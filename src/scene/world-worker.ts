import {createWorldScene} from './world-fixture';

// Only accepted engine data crosses this boundary. No model code or provider calls.
try {
  const start=performance.now(),scene=createWorldScene();
  postMessage({scene,compileMs:performance.now()-start});
} catch(error) {
  postMessage({error:error instanceof Error ? error.message : String(error)});
}
