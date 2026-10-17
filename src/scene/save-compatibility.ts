import type {Scene} from './schema';

// Bump when simulation/save semantics change, even if the Dream source does not.
export const SAVE_SIMULATION_VERSION=2;

/** A conservative contract: only host provenance and spoken text may differ. */
export function saveCompatibilitySource(scene:Scene):string {
  return projection(scene,SAVE_SIMULATION_VERSION);
}
function projection(scene:Scene,simulationVersion:number,rounded=true):string {
  const {revisionId,sourceHash,provenance,...world}=scene;
  const data={simulationVersion,world:{...world,behaviors:scene.behaviors.map(program=>({...program,states:program.states.map(state=>{
    const {say,...rules}=state;return rules;
  })}))}};
  // Property insertion order is not part of the contract; array order still is.
  // Derived trig transforms vary at machine precision across browser engines.
  return JSON.stringify(data,(_key,value)=>typeof value==='number' && rounded ? Math.round(value*1e8)/1e8 : value && typeof value==='object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])) : value);
}

/** The only additive migration drops the new economy, preserving every older rule. */
export function preCommerceCompatibilitySource(scene:Scene,simulationVersion=1):string{
  return projection({...scene,economy:undefined},simulationVersion,simulationVersion!==1);
}
export const R44_SAVE_SOURCE='6dd2a1418f815c48b445ede8a08a83cb455028a6712f4e59d4d17057f243fbc9';
export function registeredLegacySource(hash:string):string|undefined{
  return hash==='4ecdf39e61caed3fbf59e451ce973d9ac99d5893a93525de754f4a24b639cb0b' ? R44_SAVE_SOURCE : undefined;
}
export function supportsPreCommerceUpgrade(scene:Pick<Scene,'economy'>,hash:string):boolean{
  return !scene.economy || hash==='7e7924b86ad629d97771b9717f6817a25105005329ace6032573df39b4469ada';
}
export const R44_COMPATIBILITIES=['3dcc5c36ef9319b57520f2b561a988259cddebc4aedcc3a41fa27b9fbdc85ab9','1b54ff160d6487ca8cac74e702fa99c9af15aced255444ea7af5adc818c5de63'] as const;

export async function sha256(text:string):Promise<string>{
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
