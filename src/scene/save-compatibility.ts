import type {Scene} from './schema';

// Bump when simulation/save semantics change, even if the Dream source does not.
export const SAVE_SIMULATION_VERSION=1;

/** A conservative contract: only host provenance and spoken text may differ. */
export function saveCompatibilitySource(scene:Scene):string {
  const {revisionId,sourceHash,provenance,...world}=scene;
  const data={simulationVersion:SAVE_SIMULATION_VERSION,world:{...world,behaviors:scene.behaviors.map(program=>({...program,states:program.states.map(state=>{
    const {say,...rules}=state;return rules;
  })}))}};
  // Property insertion order is not part of the contract; array order still is.
  return JSON.stringify(data,(_key,value)=>value && typeof value==='object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])) : value);
}

export async function sha256(text:string):Promise<string>{
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
