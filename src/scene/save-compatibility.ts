import type {Scene} from './schema';

// Bump when simulation/save semantics change, even if the Dream source does not.
export const SAVE_SIMULATION_VERSION=11;

/** A conservative contract: only host provenance and spoken text may differ. */
export function saveCompatibilitySource(scene:Scene):string {
  return projection(scene,SAVE_SIMULATION_VERSION);
}
function projection(scene:Scene,simulationVersion:number,rounded=true):string {
  const {revisionId,sourceHash,provenance,...world}=scene;
  const data={simulationVersion,world:{...world,...(simulationVersion<5 && world.economy ? {economy:{...world.economy,repairs:undefined}} : {}),behaviors:scene.behaviors.map(program=>({...program,states:program.states.map(state=>{
    const {say,...rules}=state;return rules;
  })}))}};
  // Property insertion order is not part of the contract; array order still is.
  // Derived trig transforms vary at machine precision across browser engines.
  return JSON.stringify(data,(_key,value)=>typeof value==='number' && rounded ? Math.round(value*1e8)/1e8 : value && typeof value==='object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])) : value);
}

/** Pre-market rules for the registered upgrade chain; every physical field stays. */
export function preCommerceCompatibilitySource(scene:Scene,simulationVersion=1):string{
  return projection({...scene,economy:undefined},simulationVersion,simulationVersion!==1);
}
export const R44_SAVE_SOURCE='6dd2a1418f815c48b445ede8a08a83cb455028a6712f4e59d4d17057f243fbc9';
export function registeredLegacySource(hash:string):string|undefined{
  return hash==='4ecdf39e61caed3fbf59e451ce973d9ac99d5893a93525de754f4a24b639cb0b' ? R44_SAVE_SOURCE : undefined;
}
export function supportsPreCommerceUpgrade(scene:Pick<Scene,'economy'>,hash:string):boolean{
  return !scene.economy || hash===COURIER_COMPATIBILITY;
}

export const R45_COMPATIBILITY='7e7924b86ad629d97771b9717f6817a25105005329ace6032573df39b4469ada';
// A registered release upgrade, not an author-controlled migration policy.
export const DELIVERY_COMPATIBILITY='41d7da9d2228df8a28a08d7db9713602482f312be20a04b6e50be2c028909def';
export const PARKING_COMPATIBILITY='12bf26fd5c21822fa347406211a5e7abe71c00c0d08199b4f58c7fc755470e75';
export const REPAIR_COMPATIBILITY='5cc3b8f0d07cdd7548cde3f57cef97dc17a900dbaeb6f2efa95c71d6ff0fdb5b';
export const SUPPLY_COMPATIBILITY='0fa752fb32d4b251900d87d82b50c554a91a278b8a980bf3bb0bada5add9ba75';
export const NETWORK_COMPATIBILITY='482bfddc34e420e75d9eaa762816a09c7eb4810f1649c3e88d24b9d11b4b5657';
export const POOL_COMPATIBILITY='14d169db7f71cf494d85aacec65a606328bc4a590f20b37685ffb7d17f7b9622';
export const VERGE_COMPATIBILITY='54269457677d740420e755511a55e932e99f0cd6f28e56d2e92a255f6f34cbb9';
export const PLANT_COMPATIBILITY='5603fcbdc725e4cfe36e5284d0123a37d6cf46785904c3d235b44e6a52739f05';
export const NATURAL_COMPATIBILITY='9d9cc87cdc01a9d2d67cfd6411a2724109308fcc354af58e13e6b415e9f0604e';
export const COURIER_COMPATIBILITY='e0ae71a17aa055c0ca146651434ccd52341ed2d5a1798759f423b5ddca1afff9';
/** Registered r54 projection preserves geometry, clocks and every existing ledger field. */
export function preCourierScene(scene:Scene):Scene{
 return {...scene,economy:scene.economy && {...scene.economy,accounts:scene.economy.accounts.map(a=>{const {deliveries,...old}=a;return old;}),deliveries:scene.economy.deliveries.map(d=>{const {on,grounds,...old}=d;return old;})}};
}
export function preCourierCompatibilitySource(scene:Scene):string{return projection(preCourierScene(scene),10);}
/** Registered r53 appearance projection. Movement, ledgers and clocks are identical. */
export function preFinishScene(scene:Scene):Scene{
 scene=preCourierScene(scene);return {...scene,surfaces:scene.surfaces.map(s=>{if(s.id!=='orchard_work')return s;const {finish,...old}=s;return {...old,color:'#819461'};})};
}
export function preFinishCompatibilitySource(scene:Scene):string{return projection(preFinishScene(scene),10);}
/** Registered r52 projection preserves every placement, contact and public walkway. */
export function prePlantScene(scene:Scene):Scene{
 scene=preFinishScene(scene);const e=scene.economy;return {...scene,surfaces:scene.surfaces.filter(s=>!['orchard_work','orchard_path'].includes(s.id)),economy:e && {...e,goods:e.goods.filter(g=>g.id!=='sapling'),accounts:e.accounts.map(a=>{if(a.id!=='caretaker' || !a.repairs)return a;const {repairs,...old}=a;return {...old,repair:'market_tables'};}),markets:e.markets.map(m=>({...m,lots:m.lots.filter(l=>l.good!=='sapling')})),deliveries:e.deliveries.filter(d=>d.id!=='saplings_run'),repairs:e.repairs.filter(r=>r.id!=='orchard_trees')}};
}
export function prePlantCompatibilitySource(scene:Scene):string{return projection(prePlantScene(scene),9);}
/** Registered r51 projection keeps every object, surface and existing crossing. */
export function preVergeScene(scene:Scene):Scene{
 scene=prePlantScene(scene);
 return {...scene,crossings:scene.crossings.filter(c=>c.id!=='repair_high_south'),economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>{if(r.id!=='market_tables')return r;const {streets,verge,...old}=r;return old;})}};
}
export function preVergeCompatibilitySource(scene:Scene):string{return projection(preVergeScene(scene),8);}
/** Registered r50 projection: lamp geometry, contacts and every existing placement are retained. */
export function prePoolScene(scene:Scene):Scene{
 scene=preVergeScene(scene);
 if(!scene.damagePool)return scene;
 const {damagePool,...old}=scene;
 return {...old,interactionRules:scene.interactionRules.filter(r=>r.kind!=='lamp'),objects:scene.objects.map(o=>{
  if(!o.spec || !('dslVersion' in o.spec) || o.spec.dslVersion!==2 || o.spec.measure?.kind!=='lamp')return o;
  const {impact,...spec}=o.spec;return {...o,spec:{...spec,measure:{...spec.measure!,kind:'custom'},parts:spec.parts.map(({fragment,...p})=>p)}};
 }),economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>r.kinds ? {...r,kinds:r.kinds.filter(k=>k!=='lamp')} : r)}};
}
export function prePoolCompatibilitySource(scene:Scene):string{return projection(prePoolScene(scene),7);}
/** Registered r49 projection: the two added seating grounds leave all objects/contacts intact. */
export function preNetworkScene(scene:Scene):Scene{
 scene=prePoolScene(scene);
 return {...scene,surfaces:scene.surfaces.filter(s=>!['park_seating','station_seating'].includes(s.id)),economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>{if(r.id!=='market_tables')return r;const {grounds,...old}=r;return {...old,label:'Repair market furniture',kinds:['table','custom']};})}};
}
export function preNetworkCompatibilitySource(scene:Scene):string{return projection(preNetworkScene(scene),6);}
/** Reconstruct the registered r48 economy without changing any physical field. */
export function preSupplyScene(scene:Scene):Scene{
 scene=preNetworkScene(scene);const e=scene.economy;if(!e)return scene;
 return {...scene,economy:{...e,deliveries:e.deliveries.filter(d=>d.id!=='kits_run').map(({price,...d})=>d),markets:e.markets.map(m=>({...m,lots:m.lots.filter(l=>l.id!=='depot_kits')})),repairs:e.repairs.map(r=>{if(r.id!=='market_tables')return r;const {kinds,...old}=r;return {...old,label:'Repair a market table',kind:'table'};})}};
}
export function preSupplyCompatibilitySource(scene:Scene):string{return projection(preSupplyScene(scene),5);}
/** Only the registered market repair release adds these members. Physical fields are untouched. */
export function preRepairScene(scene:Scene):Scene{
 scene=preSupplyScene(scene);const e=scene.economy;if(!e)return scene;
 return {...scene,economy:{...e,repairs:[],goods:e.goods.filter(g=>g.id!=='timber'),accounts:e.accounts.filter(a=>a.id!=='caretaker'),markets:e.markets.map(m=>({...m,lots:m.lots.filter(l=>l.id!=='repair_kits')}))}};
}
export function preRepairCompatibilitySource(scene:Scene):string{return projection(preRepairScene(scene),4);}
// These r46 seats were passenger-only props. Original moving NPC templates stay unchanged.
const adaptedParking=new Set(['civic_parking_3_7_r','civic_parking_4_7_r','east_parking_0_4_r','east_parking_0_5_r','east_parking_0_6_r','east_parking_1_7_l','east_parking_2_5_r','east_parking_3_4_r','east_parking_3_5_r','east_parking_3_6_r']);
export function preParkingScene(scene:Scene):Scene{
 scene=preRepairScene(scene);
 return {...scene,objects:scene.objects.map(o=>{
  if(!o.parked)return o;
  const {parked,...old}=o,spec=o.spec;
  if(!spec || !('dslVersion' in spec) || spec.dslVersion!==2)throw Error('Invalid registered parking projection');
  return {...old,role:'prop',spec:{...spec,...(spec.joints ? {joints:spec.joints.map(({animation,...joint})=>joint)} : {}),...(adaptedParking.has(o.id) && spec.rideable ? {rideable:{seat:spec.rideable.seat}} : {})}};
 })};
}
export function preParkingCompatibilitySource(scene:Scene):string{return projection(preParkingScene(scene),3);}
export function preDeliveryScene(scene:Scene):Scene{
 scene=preRepairScene(scene);const e=scene.economy;if(!e)return scene;
 return {...scene,economy:{...e,accounts:e.accounts.filter(a=>['pocket','baker','regular'].includes(a.id)),markets:e.markets.filter(m=>m.id==='market_stall'),deliveries:[]}};
}
export function preDeliveryCompatibilitySource(scene:Scene):string{
 const old=preDeliveryScene(scene);
 return projection({...old,economy:old.economy && {...old.economy,deliveries:undefined}} as Scene,2);
}

export const R44_COMPATIBILITIES=['3dcc5c36ef9319b57520f2b561a988259cddebc4aedcc3a41fa27b9fbdc85ab9','1b54ff160d6487ca8cac74e702fa99c9af15aced255444ea7af5adc818c5de63'] as const;

export async function sha256(text:string):Promise<string>{
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
