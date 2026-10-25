import officeR113 from './compatibility/r113-office.json';
import maintenanceR111 from './compatibility/r111-maintenance.json';
import marketR55 from './compatibility/r55-market.json';
import marketR106 from './compatibility/r106-market.json';
import cityR67 from './compatibility/r67-city.json';
import parkR68 from './compatibility/r68-park.json';
import junctionR69 from './compatibility/r69-junction.json';
import type {Scene} from './schema';
import type {ObjectDslV2} from './object-dsl';
import peopleR70 from './compatibility/r70-people.json';
import treesR73 from './compatibility/r73-trees.json';
import treesR75 from './compatibility/r75-trees.json';
import plantsR76 from './compatibility/r76-plants.json';
import furnitureR77 from './compatibility/r77-furniture.json';
import wildlifeR78 from './compatibility/r78-wildlife.json';
import fixturesR79 from './compatibility/r79-street-furniture.json';
import charactersR80 from './compatibility/r80-characters.json';
import serviceR81 from './compatibility/r81-indoor-service.json';
import schoolR90 from './compatibility/r90-school.json';
import homeR93 from './compatibility/r93-home.json';
import homeR98 from './compatibility/r98-home.json';
import homeR97 from './compatibility/r97-home.json';

// Bump when simulation/save semantics change, even if the Dream source does not.
export const SAVE_SIMULATION_VERSION=57;

type CompatibilityEncoder=(value:object,rounded:boolean)=>string;
/** One immutable worker-bootstrap batch; release before chunk construction. */
export function compatibilityBatchEncoder():CompatibilityEncoder {
 const roundedCache=new WeakMap<object,string>(),rawCache=new WeakMap<object,string>();
 let cachedUnits=0;
 const encode=(value:unknown,rounded:boolean,depth:number):string|undefined=>{
  if(value===null || typeof value!=='object')return JSON.stringify(typeof value==='number' && rounded ? Math.round(value*1e8)/1e8 : value);
  // Shared world-list entries avoid caching every nested vertex or projected root.
  const cache=rounded ? roundedCache : rawCache,remember=depth===3,cached=remember ? cache.get(value) : undefined;
  if(cached!==undefined)return cached;
  const parts:string[]=[];
  if(Array.isArray(value)){
   for(let i=0;i<value.length;i++)parts.push(encode(value[i],rounded,depth+1)??'null');
  }else{
   const record=value as Record<string,unknown>,indices:string[]=[],names:string[]=[];
   for(const key of Object.keys(record))(String(Number(key)>>>0)===key && key!=='4294967295' ? indices : names).push(key);
   for(const key of indices.concat(names.sort())){const text=encode(record[key],rounded,depth+1);if(text!==undefined)parts.push(JSON.stringify(key)+':'+text);}
  }
  const text=Array.isArray(value) ? '['+parts.join(',')+']' : '{'+parts.join(',')+'}';
  // Limit retained UTF-16 text to 32 MiB; full checks continue when reuse is full.
  if(remember && cachedUnits+text.length<=16*1024*1024){cache.set(value,text);cachedUnits+=text.length;}return text;
 };
 return (value,rounded)=>encode(value,rounded,0)!;
}

/** A conservative contract: only host provenance and spoken text may differ. */
export function saveCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string {
  return projection(scene,SAVE_SIMULATION_VERSION,true,encode);
}
function projection(scene:Scene,simulationVersion:number,rounded=true,encode?:CompatibilityEncoder):string {
  if(simulationVersion<51)scene=preCompanyScene(scene);
  if(simulationVersion<50)scene=preLoftScene(scene);
  if(simulationVersion<49)scene=prePeerRecipeScene(scene);
  if(simulationVersion<48)scene=preCompanionScene(scene);
  if(simulationVersion<47)scene=preStationScene(scene);
  if(simulationVersion<46)scene=preBondScene(scene);
  if(simulationVersion<45)scene=preShelterScene(scene);
  if(simulationVersion<44)scene=preAttendanceScene(scene);
  if(simulationVersion<43)scene=preFloorsScene(scene);
  if(simulationVersion<42)scene=preStairsScene(scene);
  if(simulationVersion<41)scene=preRestScene(scene);
  const {revisionId,sourceHash,provenance,...world}=scene;
  let economy=world.economy;
  if(economy && simulationVersion<21){const {socials,...old}=economy;economy=old as typeof economy;}
  if(economy && simulationVersion<20){const {shifts,...old}=economy;economy=old as typeof economy;}
  if(economy && simulationVersion<16){const {meals,...old}=economy;economy=old as typeof economy;}
  if(economy && simulationVersion<15){const {milestones,...old}=economy;economy=old as typeof economy;}
  const data={simulationVersion,world:{...world,...(economy ? {economy} : {}),...(simulationVersion<5 && world.economy ? {economy:{...economy,repairs:undefined}} : {}),behaviors:scene.behaviors.map(program=>({...program,states:program.states.map(state=>{
    const {say,...rules}=state;return rules;
  })}))}};
  if(encode)return encode(data,rounded);
  // Property insertion order is not part of the contract; array order still is.
  // Derived trig transforms vary at machine precision across browser engines.
  return JSON.stringify(data,(_key,value)=>typeof value==='number' && rounded ? Math.round(value*1e8)/1e8 : value && typeof value==='object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])) : value);
}

/** Pre-market rules for the registered upgrade chain; every physical field stays. */
export function preCommerceCompatibilitySource(scene:Scene,simulationVersion=1,encode?:CompatibilityEncoder):string{
  return projection({...scene,economy:undefined},simulationVersion,simulationVersion!==1,encode);
}
export const R44_SAVE_SOURCE='6dd2a1418f815c48b445ede8a08a83cb455028a6712f4e59d4d17057f243fbc9';
export function registeredLegacySource(hash:string):string|undefined{
  return hash==='4ecdf39e61caed3fbf59e451ce973d9ac99d5893a93525de754f4a24b639cb0b' ? R44_SAVE_SOURCE : undefined;
}
export function supportsPreCommerceUpgrade(scene:Pick<Scene,'economy'>,hash:string):boolean{
  return !scene.economy || (hash===PROGRESS_COMPATIBILITY || hash===MEAL_COMPATIBILITY || hash===KITCHEN_COMPATIBILITY || hash===SEATING_COMPATIBILITY || hash===HOURS_COMPATIBILITY || hash===SHIFT_COMPATIBILITY || hash===SOCIAL_COMPATIBILITY || hash===SCHOOL_REPAIR_COMPATIBILITY || hash===BUSINESS_COMPATIBILITY || hash===MATCH_COMPATIBILITY || hash===CITY_COMPATIBILITY || hash===PARK_COMPATIBILITY || hash===SPACING_COMPATIBILITY || hash===JUNCTION_COMPATIBILITY || hash===PEOPLE_COMPATIBILITY || hash===INVITATION_COMPATIBILITY || hash===COVERAGE_COMPATIBILITY || hash===TREE_COMPATIBILITY || hash===FLEET_COMPATIBILITY || hash===CANOPY_COMPATIBILITY || hash===BOTANY_COMPATIBILITY || hash===FURNITURE_COMPATIBILITY || hash===WILDLIFE_COMPATIBILITY || hash===FIXTURES_COMPATIBILITY);
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
export const INTERIOR_COMPATIBILITY='36a6b350b49fa07044768fde832c838f9a4be007484d285a93c18a8beb77f136';
export const EGRESS_COMPATIBILITY='f7b5f8bc696e111422148d51e068413050785a6dc03dcc418cbeb80d9f8adcfc';
export const RECIPE_COMPATIBILITY='97f4bf439e7eb4a1998c36851128724123b16861e4ce277d295d1e4e182ab5a4';
export const PROGRESS_COMPATIBILITY='46a0824a39fbddaae24bae941554b33cddaf84437d24dfb0d9eaea8daed6bbcd';
export const MEAL_COMPATIBILITY='b797ee47140b40a889d0bd5b28de4926b01b6fdbf916260139974993cdb7d634';
export const KITCHEN_COMPATIBILITY='6d52318e971ff660899fd39229f652d6ff3df011e109a71629a062c818c7587c';
export const SEATING_COMPATIBILITY='34e38f9a8ccb723174d60d26eabf3f28246df880a0ae6a21208d010bb54bfc74';
export const HOURS_COMPATIBILITY='91b2ba2a543b7e6c31dd1889602404f6b0dcc75ff3a363b9643a4362b47d576c';
export const SHIFT_COMPATIBILITY='d1530dd0d802e67408e27f4d7167dd81d142c911107959d979c7ef7066497023';
export const SOCIAL_COMPATIBILITY='8e4b7baa6a34ee91f7bb86a99a5fdda917be740e05e3d68986b11cdb7c5e11bd';
export const SCHOOL_REPAIR_COMPATIBILITY='2f926f10804ba28a2413a01fc4a0b690695c66ee7cf9a2cf8029d4d0693382e7';
/** r116 connects a goods-free office and an existing resident to nearby home/work premises. */
export const OFFICE_WORK_COMPATIBILITY='f29382de98ecf72a17233b07c50ea046adbe3625a670fdd8c384ec9fae86dc31';
const officeWorkProjections=new WeakMap<Scene,Scene>();
export function preOfficeWorkScene(scene:Scene):Scene{
 const cached=officeWorkProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.markets.some(m=>m.id==='office_business'))return scene;
 const prior={...scene,objects:scene.objects.map(o=>o.id==='hospital_visitor' ? {...o,x:4040,y:6610} : o),economy:{...scene.economy,stations:scene.economy.stations?.filter(s=>s.id!=='office_records'),rests:scene.economy.rests?.filter(s=>s.id!=='office_home_rest'),jobs:scene.economy.jobs.filter(j=>j.id!=='check_records'),markets:scene.economy.markets.filter(m=>m.id!=='office_business'),accounts:scene.economy.accounts.filter(a=>a.id!=='office_clerk')}};
 officeWorkProjections.set(scene,prior);return prior;
}
export function preOfficeWorkCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preOfficeWorkScene(scene),56,true,encode);}

/** r115 adds finite service tasks and one existing worker preference, without physical or resource changes. */
export const SERVICE_WORK_COMPATIBILITY='180aa45b5573fec413014be184ca16a4f06eb90bcb1840ea012cf905f13d9aa8';
const serviceWorkProjections=new WeakMap<Scene,Scene>();
export function preServiceWorkScene(scene:Scene):Scene{
 scene=preOfficeWorkScene(scene);
 const cached=serviceWorkProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.jobs.some(j=>j.id==='stocktake'))return scene;
 const prior={...scene,economy:{...scene.economy,jobs:scene.economy.jobs.filter(j=>j.id!=='stocktake'),accounts:scene.economy.accounts.map(a=>a.id==='regular' ? {...a,works:a.works?.filter(id=>id!=='stocktake')} : a)}};
 serviceWorkProjections.set(scene,prior);return prior;
}
export function preServiceWorkCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preServiceWorkScene(scene),55,true,encode);}

/** r114 opens the first office mezzanine using existing floor, seating and repair rules. */
export const TOWER_ROOM_COMPATIBILITY='783e51cc974118b4d28c283a48546c99a37aad7f28a09dee2c0ad7c65495f55f';
const towerRoomProjections=new WeakMap<Scene,Scene>();
const towerRoomFloors=new Set(['office_mezzanine','office_landing']);
const towerRoomObjects=new Set(['station_quarter_gallery_south','station_quarter_gallery_north','station_quarter_gallery_table']);
export function preTowerRoomScene(scene:Scene):Scene{
 scene=preServiceWorkScene(scene);
 const cached=towerRoomProjections.get(scene);if(cached)return cached;
 if(!scene.floors?.some(f=>towerRoomFloors.has(f.id)))return scene;
 const prior={...scene,floors:scene.floors.filter(f=>!towerRoomFloors.has(f.id)),objects:scene.objects.filter(o=>!towerRoomObjects.has(o.id)).map(o=>o.id==='station_quarter_offices' ? {...o,spec:officeR113 as ObjectDslV2} : o),economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>r.id==='classroom_furniture' ? {...r,label:'Repair school furniture',grounds:r.grounds?.filter(id=>!towerRoomFloors.has(id))} : r)}};
 towerRoomProjections.set(scene,prior);return prior;
}
export function preTowerRoomCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preTowerRoomScene(scene),55,true,encode);}

/** Simulation 55 lets bounded walking populations clear shared portals. */
export const CROWD_FLOW_COMPATIBILITY='38d148c136e56816af6b70d32d9786aa79d15a9e952de13c71fd940d2f33ce87';
export function preCrowdFlowCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preTowerRoomScene(scene),54,true,encode);}

/** Simulation 54 improves future work routes without changing accepted world data. */
export const WALKING_LINKS_COMPATIBILITY='6f51da4a8fd320851d05e664f6f72d5ed9f7be57050e26ad31339a2c57f597d2';
export function preWalkingLinksCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preTowerRoomScene(scene),53,true,encode);}

/** r113 completes four authored junction crossings; only derived pedestrian indices change. */
export const CROSSING_ACCESS_COMPATIBILITY='5d8cf576772c3ebebead408d764fa6d6e90e060d314a0ed8ba62a9d30b57f15f';
const crossingAccessProjections=new WeakMap<Scene,Scene>();
const crossingAccessIds=new Set(['crossing_medical_access','crossing_copper_access','crossing_weavers_access','crossing_terrace_access']);
export function preCrossingAccessScene(scene:Scene):Scene{
 scene=preTowerRoomScene(scene);
 const cached=crossingAccessProjections.get(scene);if(cached)return cached;
 if(!scene.crossings.some(c=>crossingAccessIds.has(c.id)))return scene;
 const prior={...scene,crossings:scene.crossings.filter(c=>!crossingAccessIds.has(c.id))};crossingAccessProjections.set(scene,prior);return prior;
}
export function preCrossingAccessCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preCrossingAccessScene(scene),53,true,encode);}

/** r112 extends existing maintenance coverage without changing physical state or resources. */
export const STATION_MAINTENANCE_COMPATIBILITY='910bdcc30bce4f13de0c4f7ec52995d8e1c0383520b86e8346505c75a61df02f';
const stationMaintenanceProjections=new WeakMap<Scene,Scene>();
const stationMaintenanceGrounds=new Set(['station_repair_work','station_tree_work_west','station_tree_work_center','station_tree_work_east']);
export function preStationMaintenanceScene(scene:Scene):Scene{
 scene=preCrossingAccessScene(scene);
 const cached=stationMaintenanceProjections.get(scene);if(cached)return cached;
 if(!scene.surfaces.some(s=>stationMaintenanceGrounds.has(s.id)))return scene;
 const prior={...scene,surfaces:scene.surfaces.filter(s=>!stationMaintenanceGrounds.has(s.id)),economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>(maintenanceR111.find(old=>old.id===r.id)??r) as NonNullable<Scene['economy']>['repairs'][number])}};
 stationMaintenanceProjections.set(scene,prior);return prior;
}
export function preStationMaintenanceCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preStationMaintenanceScene(scene),53,true,encode);}

/** r111 adds a connected station quarter without changing simulation semantics. */
export const DISTRICT_COMPATIBILITY='b07395b81db63f19fae5d5688c0a45ab5d8d7b67bd7a63565dfebef37299f337';
const districtProjections=new WeakMap<Scene,Scene>();
export function preDistrictScene(scene:Scene):Scene{
 scene=preStationMaintenanceScene(scene);
 const cached=districtProjections.get(scene);if(cached)return cached;
 const added=(id:string)=>id.startsWith('station_quarter_');
 if(!scene.objects.some(o=>added(o.id)))return scene;
 const prior={...scene,objects:scene.objects.filter(o=>!added(o.id)),surfaces:scene.surfaces.filter(s=>!added(s.id)),sites:scene.sites.filter(s=>!added(s.id)),floors:scene.floors?.filter(f=>!added(f.id))};
 districtProjections.set(scene,prior);return prior;
}
export function preDistrictCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preDistrictScene(scene),53,true,encode);}

/** r110 shares supported stair travel with social meals; existing claims keep their seats. */
export const UPSTAIRS_SOCIAL_COMPATIBILITY='4b10448683d5eea828b3d229eaa7ab0bef09f19e6876eafc5f2611c6de09bf4a';
const upstairsSocialProjections=new WeakMap<Scene,Scene>();
export function preUpstairsSocialScene(scene:Scene):Scene{
 scene=preDistrictScene(scene);
 const cached=upstairsSocialProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.socials.some(s=>s.id==='hall_break' && s.seats.includes('home_upper_settee')))return scene;
 const prior={...scene,economy:{...scene.economy,socials:scene.economy.socials.map(s=>s.id==='hall_break' ? {...s,seats:s.seats.filter(id=>id!=='home_upper_settee'),grounds:s.grounds?.filter(id=>id!=='home_upper' && id!=='home_landing')} : s)}};
 upstairsSocialProjections.set(scene,prior);return prior;
}
export function preUpstairsSocialCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preUpstairsSocialScene(scene),52,true,encode);}

/** r109 applies authored energy recovery to every occupied meal/rest seat. */
export const SEATED_REST_COMPATIBILITY='cf4a6bffe75b42fdab3872242948b8350f269c16e3ad19fc1a9d1ecd356f78e0';
export function preSeatedRestCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preUpstairsSocialScene(scene),51,true,encode);}

/** r108 gives three existing people a shared, bounded social need. */
export const COMPANY_COMPATIBILITY='3335e4520386d33466a409caaa0d451b8772d904c09c6a8d76d3371d0390effd';
const companyProjections=new WeakMap<Scene,Scene>();
export function preCompanyScene(scene:Scene):Scene{
 scene=preUpstairsSocialScene(scene);
 const cached=companyProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.accounts.some(a=>a.company))return scene;
 const prior={...scene,economy:{...scene.economy,accounts:scene.economy.accounts.map(a=>{const {company,...old}=a;return old;})}};companyProjections.set(scene,prior);return prior;
}
export function preCompanyCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preCompanyScene(scene),50,true,encode);}

/** r107 opens a connected workshop loft without adding stock, wages or actors. */
export const LOFT_COMPATIBILITY='1dc29cda7770917eb18cb167dd0caa5b5149d8f3e983857a253903ad24cd85d6';
const loftProjections=new WeakMap<Scene,Scene>();
export function preLoftScene(scene:Scene):Scene{
 scene=preCompanyScene(scene);
 const cached=loftProjections.get(scene);if(cached)return cached;
 if(!scene.floors?.some(f=>f.id==='hall_loft'))return scene;
 const grounds=(ids:string[]|undefined)=>ids?.filter(id=>id!=='hall_loft' && id!=='hall_landing');
 const prior={...scene,floors:scene.floors.filter(f=>f.id!=='hall_loft' && f.id!=='hall_landing'),objects:scene.objects.filter(o=>o.id!=='hall_workbench').map(o=>o.id==='market_hall' ? {...o,spec:marketR106 as ObjectDslV2} : o),economy:scene.economy && {...scene.economy,stations:scene.economy.stations?.filter(s=>s.id!=='workshop_prep').map(s=>({...s,grounds:grounds(s.grounds)})),accounts:scene.economy.accounts.map(a=>a.grounds ? {...a,grounds:grounds(a.grounds)} : a),jobs:scene.economy.jobs.map(j=>j.id==='assemble_kit' || j.id==='propagate_saplings' ? {...j,equipment:['hall_table_east'],station:'bakery_prep'} : j),repairs:scene.economy.repairs.map(r=>r.id==='home_furniture' ? {...r,label:'Repair home furniture',grounds:grounds(r.grounds)?.filter(id=>id!=='market_hall')} : r)}};
 loftProjections.set(scene,prior);return prior;
}
export function preLoftCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preLoftScene(scene),49,true,encode);}

/** r106 derives recipe eligibility from completed, explicitly named resident pairs. */
export const PEER_RECIPE_COMPATIBILITY='eac00f9a8d8b0de82607c53e068c66880828c03e3680d8337b40ad81a35cf64e';
const peerRecipeProjections=new WeakMap<Scene,Scene>();
export function prePeerRecipeScene(scene:Scene):Scene{
 scene=preLoftScene(scene);
 const cached=peerRecipeProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.milestones.some(m=>m.id==='bakers_pair' && m.peer==='regular'))return scene;
 const prior={...scene,economy:{...scene.economy,milestones:scene.economy.milestones.filter(m=>m.id!=='bakers_pair'),accounts:scene.economy.accounts.map(a=>a.id==='baker' ? {...a,works:a.works?.filter(id=>id!=='large_bake')} : a),jobs:scene.economy.jobs.map(j=>j.id==='large_bake' ? {...j,requires_any:j.requires_any?.filter(id=>id!=='bakers_pair')} : j)}};
 peerRecipeProjections.set(scene,prior);return prior;
}
export function prePeerRecipeCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(prePeerRecipeScene(scene),48,true,encode);}

/** r105 connects funded, persistent resident-to-resident meals. */
export const COMPANION_COMPATIBILITY='8989717956ee55328cf06ae424fff171d91aff76d9ff41638384496506cfa2e1';
const companionProjections=new WeakMap<Scene,Scene>();
export function preCompanionScene(scene:Scene):Scene{
 scene=prePeerRecipeScene(scene);
 const cached=companionProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.socials.some(s=>s.peers))return scene;
 const prior={...scene,objects:scene.objects.map(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='bench' && o.spec.seats?.length===2 && o.spec.seats.every(s=>Math.abs(s.position[0])===14 && s.position[1]===18 && s.position[2]===12 && s.approach[0]===s.position[0]) ? {...o,spec:{...o.spec,seats:o.spec.seats?.map(s=>({...s,position:[s.id==='left' ? -13 : 13,s.position[1],s.position[2]] as [number,number,number],approach:[s.id==='left' ? -13 : 13,s.approach[1]] as [number,number]}))}} : o),economy:{...scene.economy,socials:scene.economy.socials.map(s=>{const {peers,...old}=s;return s.id==='hall_break' ? {...old,grounds:['market_square']} : old;})}};
 companionProjections.set(scene,prior);return prior;
}
export function preCompanionCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preCompanionScene(scene),47,true,encode);}

/** r104 adds data-only work motion without changing simulation transitions. */
export const GESTURE_COMPATIBILITY='a4107f0d54f50cc0c4c0045ef84ed31e6e64b89416963622c0727a141cd208bb';
const gestureProjections=new WeakMap<Scene,Scene>();
export function preGestureScene(scene:Scene):Scene{
 scene=preCompanionScene(scene);
 const cached=gestureProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.gestures?.some(g=>g.id==='kneading'))return scene;
 const {gestures,...economy}=scene.economy;
 const prior={...scene,economy:{...economy,jobs:economy.jobs.map(j=>{const {gesture,...old}=j;return old;}),repairs:economy.repairs.map(r=>{const {gesture,...old}=r;return old;})}};
 gestureProjections.set(scene,prior);return prior;
}
export function preGestureCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preGestureScene(scene),47,true,encode);}

/** r103 binds existing paid jobs to physical shared workstations. */
export const STATION_COMPATIBILITY='ba0749ebc87cea40ce37bd5d71f8adf69a75970811039062d6b650ca90cc59b3';
const stationProjections=new WeakMap<Scene,Scene>();
export function preStationScene(scene:Scene):Scene{
 scene=preGestureScene(scene);
 const cached=stationProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.stations?.some(s=>s.id==='bakery_prep'))return scene;
 const {stations,...economy}=scene.economy;
 const prior={...scene,economy:{...economy,jobs:economy.jobs.map(j=>{const {station,...old}=j;if(j.id!=='assemble_kit')return old;const {equipment,...legacy}=old;return legacy;})}};
 stationProjections.set(scene,prior);return prior;
}
export function preStationCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preStationScene(scene),46,true,encode);}

export const BOND_COMPATIBILITY='924a4c63641fed528986e698d8a5ad3c72c7201d1cf8ed94df4a0264c6b9827c';
const bondProjections=new WeakMap<Scene,Scene>();
export function preBondScene(scene:Scene):Scene{
 scene=preStationScene(scene);
 const cached=bondProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.milestones.some(m=>m.id==='bakers_table' && m.kind==='shared_meal'))return scene;
 const prior={...scene,economy:{...scene.economy,milestones:scene.economy.milestones.filter(m=>m.id!=='bakers_table'),jobs:scene.economy.jobs.map(j=>{if(j.id!=='large_bake')return j;const {requires_any,...old}=j;return {...old,requires:'practiced_baker'};})}};bondProjections.set(scene,prior);return prior;
}
export function preBondCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preBondScene(scene),45,true,encode);}

export const SHELTER_COMPATIBILITY='508f47125d575a0d10ff7122fe92a3cbea2495d90235120e50bbb24114167e02';
const shelterProjections=new WeakMap<Scene,Scene>();
export function preShelterScene(scene:Scene):Scene{
 scene=preBondScene(scene);
 const cached=shelterProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.rests?.some(r=>r.id==='home_rest' && r.shelter))return scene;
 const prior={...scene,weather:scene.weather && {...scene.weather,cycleSeconds:600},economy:{...scene.economy,rests:scene.economy.rests.map(r=>{if(r.id!=='home_rest')return r;const {shelter,...old}=r;return old;})}};shelterProjections.set(scene,prior);return prior;
}
export function preShelterCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preShelterScene(scene),44,true,encode);}

/** r100 adds bounded daily attendance; existing one-batch trips finish unchanged. */
export const ATTENDANCE_COMPATIBILITY='26bc063d3ad03e482ec65626ea6653403c59dec91211227e97687860f772545e';
const attendanceProjections=new WeakMap<Scene,Scene>();
export function preAttendanceScene(scene:Scene):Scene{
 scene=preShelterScene(scene);
 const cached=attendanceProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.accounts.some(a=>a.id==='regular' && a.attendance))return scene;
 const prior={...scene,economy:{...scene.economy,accounts:scene.economy.accounts.map(a=>{if(a.id!=='regular')return a;const {attendance,...old}=a;return old;})}};attendanceProjections.set(scene,prior);return prior;
}
export function preAttendanceCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preAttendanceScene(scene),43,true,encode);}

/** r99 binds upper-storey props and journeys to retained slab/stair contacts. */
export const FLOORS_COMPATIBILITY='c5eb87dd0dcf58f2c0aff89875203b51bc29673aeab3b40b560f81ee43c906ad';
const floorProjections=new WeakMap<Scene,Scene>();
export function preFloorsScene(scene:Scene):Scene{
 scene=preAttendanceScene(scene);
 const cached=floorProjections.get(scene);if(cached)return cached;if(!scene.floors?.some(f=>f.id==='home_upper'))return scene;
 const {floors,...old}=scene;
 const prior={...old,objects:scene.objects.filter(o=>!['home_upper_settee','home_upper_table','home_upper_planter'].includes(o.id)).map(o=>o.id==='oldtown_044' ? {...o,spec:homeR98 as ObjectDslV2} : o),economy:scene.economy && {...scene.economy,rests:scene.economy.rests?.map(r=>r.id==='home_rest' ? {...r,seats:['home_settee'],grounds:['home_entry','market_square','market_hall']} : r),repairs:scene.economy.repairs.map(r=>r.id==='home_furniture' ? {...r,grounds:['oldtown_044']} : r)}};
 floorProjections.set(scene,prior);return prior;
}
export function preFloorsCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preFloorsScene(scene),42,true,encode);}

/** r98 opens a physical upper floor without changing the existing life ledger. */
export const STAIRS_COMPATIBILITY='ced2d2f3ab7f629d8e5f57b344e4aec70bc4bfbfeb2ac667ebf3eec1c2620e85';
const stairProjections=new WeakMap<Scene,Scene>();
export function preStairsScene(scene:Scene):Scene{
 scene=preFloorsScene(scene);
 const cached=stairProjections.get(scene);if(cached)return cached;
 if(!scene.objects.some(o=>o.id==='oldtown_044' && o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && (o.spec.interior?.size[1]??0)>8))return scene;
 const prior={...scene,objects:scene.objects.map(o=>o.id==='oldtown_044' ? {...o,spec:homeR97 as ObjectDslV2} : o.id==='home_table' ? {...o,x:6475} : o)};stairProjections.set(scene,prior);return prior;
}
export function preStairsCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preStairsScene(scene),41,true,encode);}

/** r97 adds authored energy and shared seated recovery, preserving existing commitments. */
export const REST_COMPATIBILITY='67ec3c6c263434eeb67f2dc17a986d719675505899452a283dedc53b071b8be9';
const restProjections=new WeakMap<Scene,Scene>();
export function preRestScene(scene:Scene):Scene{
 scene=preStairsScene(scene);
 const cached=restProjections.get(scene);if(cached)return cached;if(!scene.economy?.rests)return scene;
 const {rests,...economy}=scene.economy;
 const prior={...scene,economy:{...economy,accounts:economy.accounts.map(a=>{const {rest,...old}=a;return old;})}};restProjections.set(scene,prior);return prior;
}
export function preRestCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preRestScene(scene),40,true,encode);}

/** r96 adds opt-in work journeys without changing existing commitments or physical data. */
export const WORK_COMMUTE_COMPATIBILITY='9b818d954cf53fe239b685e7cc54600aa417f0541de32e3b9c99db1bef443cad';
const commuteProjections=new WeakMap<Scene,Scene>();
export function preWorkCommuteScene(scene:Scene):Scene{
 scene=preRestScene(scene);
 const cached=commuteProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.accounts.some(a=>a.id==='regular' && a.commute))return scene;
 const accounts=scene.economy.accounts.map(a=>{if(a.id!=='regular')return a;const {commute,on,grounds,works,...old}=a;return old;});
 const prior={...scene,economy:{...scene.economy,accounts}};commuteProjections.set(scene,prior);return prior;
}
export function preWorkCommuteCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preWorkCommuteScene(scene),39,true,encode);}

/** r95 prefers the commuter's home for meals; existing claims remain valid. */
export const HOME_MEALS_COMPATIBILITY='62198a1eb0f91bb6793276db568458a0a980823c492c7f1fb7f2e8cf7cc8cdd4';
const homeMealProjections=new WeakMap<Scene,Scene>();
export function preHomeMealsScene(scene:Scene):Scene{
 scene=preWorkCommuteScene(scene);
 const cached=homeMealProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.meals.some(m=>m.id==='market_break' && m.seats?.includes('home_settee')))return scene;
 const objects=scene.objects.map(o=>o.id==='home_settee' && o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2
  ? {...o,spec:{...o.spec,seats:o.spec.seats!.map(s=>({...s,approach:[s.approach[0],20] as [number,number]}))}} : o);
 const meals=scene.economy.meals.map(m=>m.id==='market_break'
  ? {...m,grounds:m.grounds!.filter(id=>id!=='oldtown_044' && id!=='home_entry'),seats:m.seats!.filter(id=>id!=='home_settee')} : m);
 const prior={...scene,objects,economy:{...scene.economy,meals}};
 homeMealProjections.set(scene,prior);return prior;
}
export function preHomeMealsCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preHomeMealsScene(scene),38,true,encode);}

/** r94 opens the commuter's existing home and adds its shared furniture service. */
export const HOME_INTERIOR_COMPATIBILITY='f003f9a1a23eac605a5a780ac34e471888fea029ac9b6d05c1d571df0d0f0275';
const homeProjections=new WeakMap<Scene,Scene>();
export function preHomeInteriorScene(scene:Scene):Scene{
 scene=preHomeMealsScene(scene);
 const cached=homeProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.repairs.some(r=>r.id==='home_furniture'))return scene;
 const added=new Set(['home_settee','home_table','home_planter']);
 const prior={...scene,objects:scene.objects.filter(o=>!added.has(o.id)).map(o=>o.id==='oldtown_044' ? homeR93.object as Scene['objects'][number] : o),sites:scene.sites.map(s=>s.id==='access_oldtown_044' ? homeR93.site as Scene['sites'][number] : s),surfaces:scene.surfaces.filter(s=>s.id!=='home_entry'),economy:{...scene.economy,repairs:scene.economy.repairs.filter(r=>r.id!=='home_furniture'),accounts:scene.economy.accounts.map(a=>a.id==='caretaker' ? {...a,repairs:a.repairs!.filter(id=>id!=='home_furniture')} : a)}};
 homeProjections.set(scene,prior);return prior;
}
export function preHomeInteriorCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preHomeInteriorScene(scene),38,true,encode);}

/** r93 adds authored weather and dry-weather maintenance rules without new saved fields. */
export const WEATHER_COMPATIBILITY='e79bef5a9b68401e438cb2eb94f1ae68e151fb65f29770e2fa166e382db817ec';
const weatherProjections=new WeakMap<Scene,Scene>();
export function preWeatherScene(scene:Scene):Scene{
 scene=preHomeInteriorScene(scene);
 const cached=weatherProjections.get(scene);if(cached)return cached;
 if(!scene.weather)return scene;
 const {weather,...rest}=scene;
 const prior={...rest,...(scene.economy ? {economy:{...scene.economy,repairs:scene.economy.repairs.map(r=>{const {dry,...old}=r;return old;})}} : {})};
 weatherProjections.set(scene,prior);return prior;
}
export function preWeatherCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preWeatherScene(scene),37,true,encode);}

/** r92 adds optional worker provisions and shared eating during a commitment. */
export const RATIONS_COMPATIBILITY='685d508191100e9740e378b70f14fbe60ffe02177e70c7d756aa6c626cb5abd0';
const rationProjections=new WeakMap<Scene,Scene>();
export function preRationsScene(scene:Scene):Scene{
 scene=preWeatherScene(scene);
 const cached=rationProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.rations)return scene;
 const {rations,...economy}=scene.economy;
 const prior={...scene,economy:{...economy,accounts:economy.accounts.map(a=>{const {ration,...old}=a;return old;})}};
 rationProjections.set(scene,prior);return prior;
}
export function preRationsCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preRationsScene(scene),36,true,encode);}

/** r91 opens the school's common room and connects its furniture and staff break. */
export const SCHOOL_INTERIOR_COMPATIBILITY='1563d4e8511812ec931cb475b615d75978b72a2efcd8f69e1c4190f24c7bc554';
const schoolInteriorProjections=new WeakMap<Scene,Scene>();
export function preSchoolInteriorScene(scene:Scene):Scene{
 scene=preRationsScene(scene);
 const cached=schoolInteriorProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.repairs.some(r=>r.id==='classroom_furniture'))return scene;
 const added=new Set(['school_common_bench','school_reading_bench','school_rear_bench','school_table_west','school_table_east']);
 const prior={...scene,objects:scene.objects.filter(o=>!added.has(o.id)).map(o=>o.id==='garden_school' ? schoolR90.object as Scene['objects'][number] : o),surfaces:scene.surfaces.filter(s=>s.id!=='school_doorstep'),economy:{...scene.economy,accounts:scene.economy.accounts.map(a=>a.id==='caretaker' ? {...a,repairs:a.repairs!.filter(id=>id!=='classroom_furniture')} : a),repairs:scene.economy.repairs.filter(r=>r.id!=='classroom_furniture'),shifts:scene.economy.shifts.map(s=>s.id==='school_day' ? schoolR90.shift : s),socials:scene.economy.socials.map(s=>s.id==='school_break' ? schoolR90.social : s)}};
 schoolInteriorProjections.set(scene,prior);return prior;
}
export function preSchoolInteriorCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preSchoolInteriorScene(scene),36,true,encode);}

/** r90 adds bounded same-good nursery work to the existing vendor policy. */
export const NURSERY_COMPATIBILITY='f2475e551ec0dc5c95f2f98ff04236fb2123a0efbea0f45e0ba694615f589baa';
const nurseryProjections=new WeakMap<Scene,Scene>();
export function preNurseryScene(scene:Scene):Scene{
 scene=preSchoolInteriorScene(scene);
 const cached=nurseryProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.jobs.some(j=>j.id==='propagate_saplings'))return scene;
 const prior={...scene,economy:{...scene.economy,accounts:scene.economy.accounts.map(a=>a.id==='baker' ? {...a,works:['assemble_kit','pack_lunch','large_bake','bake']} : a),jobs:scene.economy.jobs.filter(j=>j.id!=='propagate_saplings')}};
 nurseryProjections.set(scene,prior);return prior;
}
export function preNurseryCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preNurseryScene(scene),35,true,encode);}

/** r89 recovers fixture hardware through the existing carried-output transaction. */
export const HARDWARE_COMPATIBILITY='ff41ef8540f2b52d963f771948f948ce14f897a57936dad7e9ff30b2fb14096d';
const hardwareProjections=new WeakMap<Scene,Scene>();
export function preHardwareScene(scene:Scene):Scene{
 scene=preNurseryScene(scene);
 const cached=hardwareProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.repairs.some(r=>r.id==='market_tables' && r.recover))return scene;
 const prior={...scene,economy:{...scene.economy,repairs:scene.economy.repairs.map(r=>{if(r.id!=='market_tables')return r;const {recover,amount,...old}=r;return old;})}};
 hardwareProjections.set(scene,prior);return prior;
}
export function preHardwareCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preHardwareScene(scene),35,true,encode);}

/** r88 carries recovered physical materials back to their receiving business. */
export const RECOVERY_COMPATIBILITY='f47a995c431246b6234b69a05a38f7220a65e56fbd4414d02f54405e817f0f5b';
const recoveryProjections=new WeakMap<Scene,Scene>();
export function preRecoveryScene(scene:Scene):Scene{
 scene=preNurseryScene(scene);
 const cached=recoveryProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.repairs.some(r=>r.recover))return scene;
 const prior={...scene,economy:{...scene.economy,repairs:scene.economy.repairs.map(({recover,amount,...r})=>r)}};
 recoveryProjections.set(scene,prior);return prior;
}
export function preRecoveryCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preRecoveryScene(scene),34,true,encode);}

/** r87 gives one existing resident connected school and hardware delivery work. */
export const RESIDENT_SUPPLY_COMPATIBILITY='e2317da9bd916988c3f252eb1f1e1660b8f2c2ebc54113d6f5c02492afca59a8';
const residentSupplyProjections=new WeakMap<Scene,Scene>();
export function preResidentSupplyScene(scene:Scene):Scene{
 scene=preRecoveryScene(scene);
 const cached=residentSupplyProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.accounts.some(a=>a.id==='porter'))return scene;
 const prior={...scene,objects:scene.objects.map(o=>o.id==='school_student' ? {...o,x:4490,y:3470} : o),economy:{...scene.economy,accounts:scene.economy.accounts.filter(a=>a.id!=='porter'),deliveries:scene.economy.deliveries.map(d=>{if(d.id==='school_run'){const {on,grounds,...old}=d;return old;}return d.id==='fasteners_run' ? {...d,grounds:['market_square']} : d;})}};
 residentSupplyProjections.set(scene,prior);return prior;
}
export function preResidentSupplyCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preResidentSupplyScene(scene),34,true,encode);}

/** r86 opens finite workshop-material stock and conserved delivery contracts. */
export const WORKSHOP_SUPPLY_COMPATIBILITY='595e9821e3a223698fdc272e097ce119730359e85dc65ea75d647409921d4329';
const workshopProjections=new WeakMap<Scene,Scene>();
export function preWorkshopSupplyScene(scene:Scene):Scene{
 scene=preResidentSupplyScene(scene);
 const cached=workshopProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.deliveries.some(d=>d.id==='boards_run'))return scene;
 const prior={...scene,economy:{...scene.economy,deliveries:scene.economy.deliveries.filter(d=>!['boards_run','fasteners_run'].includes(d.id)),accounts:scene.economy.accounts.map(a=>a.id==='caretaker' ? {...a,deliveries:a.deliveries?.filter(id=>id!=='boards_run')} : a),markets:scene.economy.markets.map(m=>m.id==='station_supplies' ? {...m,lots:m.lots.filter(l=>!['boards','fasteners'].includes(l.good))} : m)}};
 workshopProjections.set(scene,prior);return prior;
}
export function preWorkshopSupplyCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preWorkshopSupplyScene(scene),34,true,encode);}

/** r85 uses the existing shared recipe policy to replenish consumed repair kits. */
export const KIT_PRODUCTION_COMPATIBILITY='c8e3de0f54713b9c887145934b5b84f20511312062347dbd416e75e3321c8d02';
const kitProjections=new WeakMap<Scene,Scene>();
export function preKitProductionScene(scene:Scene):Scene{
 scene=preWorkshopSupplyScene(scene);
 const cached=kitProjections.get(scene);if(cached)return cached;
 if(!scene.economy?.accounts.some(a=>a.id==='baker' && a.works?.includes('assemble_kit')))return scene;
 const prior={...scene,economy:{...scene.economy,accounts:scene.economy.accounts.map(a=>a.id==='baker' && a.works?.includes('assemble_kit') ? {...a,works:a.works.filter(id=>id!=='assemble_kit')} : a),jobs:scene.economy.jobs.map(j=>j.id==='assemble_kit' ? {...j,target:4} : j)}};
 kitProjections.set(scene,prior);return prior;
}
export function preKitProductionCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preKitProductionScene(scene),34,true,encode);}

/** r84 adds bounded on-foot strikes and a saved cooldown; all old geometry stays exact. */
export const STRIKE_COMPATIBILITY='f1a8ec4b7803b4bbd21984e5baef2689b3fc6378f81cca0c95060e8d34d374f3';
const strikeProjections=new WeakMap<Scene,Scene>();
export function preStrikeScene(scene:Scene):Scene{
 scene=preKitProductionScene(scene);
 if(!scene.strike)return scene;
 const cached=strikeProjections.get(scene);if(cached)return cached;
 const {strike,...prior}=scene;strikeProjections.set(scene,prior);return prior;
}
export function preStrikeCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preStrikeScene(scene),33,true,encode);}

/** r83 binds work to existing physical equipment; the prior world keeps simulation 32. */
export const EQUIPMENT_COMPATIBILITY='a5b345f631855363a24d67e40268357e95970974fefd991788c46bf1c7f086ce';
const equipmentProjections=new WeakMap<Scene,Scene>();
export function preEquipmentScene(scene:Scene):Scene{
 scene=preStrikeScene(scene);
 if(!scene.economy?.jobs.some(j=>j.equipment))return scene;
 const cached=equipmentProjections.get(scene);if(cached)return cached;
 const prior={...scene,economy:{...scene.economy,jobs:scene.economy.jobs.map(({equipment,...job})=>job)}};
 equipmentProjections.set(scene,prior);return prior;
}
export function preEquipmentCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preEquipmentScene(scene),32,true,encode);}

/** r82 moves service indoors without changing any physical assembly or supply rule. */
export const SERVICE_COMPATIBILITY='08c37a536a120c91b5175e8a5771f04c12230bfe179ebe7da6afdc924938cada';
const serviceProjections=new WeakMap<Scene,Scene>();
function priorGrounds<T extends {id:string;on?:string;grounds?:string[]}>(rules:T[],prior:{id:string;on:string;grounds?:string[]}[]):T[]{
 return rules.map(rule=>{const old=prior.find(p=>p.id===rule.id);return old ? {...rule,on:old.on,grounds:old.grounds} : rule;});
}
export function preServiceScene(scene:Scene):Scene{
 scene=preEquipmentScene(scene);
 if(!scene.surfaces.some(s=>s.id==='hall_service'))return scene;
 const cached=serviceProjections.get(scene);if(cached)return cached;
 const e=scene.economy!,old=serviceR81.economy;
 const prior={...scene,objects:scene.objects.map(o=>{const p=serviceR81.objects.find(p=>p.id===o.id);return p ? {...o,x:p.x,y:p.y} : o;}),surfaces:scene.surfaces.filter(s=>s.id!=='hall_service').map(s=>s.id===serviceR81.orchardPath.id ? {...s,...serviceR81.orchardPath,walkable:undefined} : s),economy:{...e,markets:e.markets.map(m=>{const p=old.markets.find(p=>p.id===m.id);return p ? {...m,radius:p.radius} : m;}),deliveries:priorGrounds(e.deliveries,old.deliveries),repairs:priorGrounds(e.repairs,old.repairs),socials:priorGrounds(e.socials,old.socials),shifts:priorGrounds(e.shifts,old.shifts),meals:priorGrounds(e.meals,old.meals)}};
 serviceProjections.set(scene,prior);return prior;
}
export function preServiceCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preServiceScene(scene),32,true,encode);}

/** r81 refines the shared character family, retaining the exact r80 world. */
export const CHARACTERS_COMPATIBILITY='5bd553a8bc5a9639513a5d19a2bcad969ec74e06b46627ffd6448b60067f16b3';
const characterPoses=new Map(charactersR80.placements.map(p=>[p.id,p])),characterSports=new Map(charactersR80.sports.map(s=>[s.id,s]));
const characterProjections=new WeakMap<Scene,Scene>();
export function preCharactersScene(scene:Scene):Scene{
 scene=preServiceScene(scene);
 if(!scene.objects.some(o=>characterPoses.has(o.id) && o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.parts.some(p=>p.shape==='prism' && p.size[0]===12 && p.size[1]===18)))return scene;
 const cached=characterProjections.get(scene);if(cached)return cached;
 const template=(index:number)=>charactersR80.templates[index] as unknown as ObjectDslV2;
 const prior={...scene,objects:scene.objects.map(o=>{const p=characterPoses.get(o.id);return p ? {...o,spec:template(p.template),scale:p.scale} : o;}),sports:scene.sports.map(s=>{const before=characterSports.get(s.id);return !before || !s.match ? s : {...s,match:{...s.match,teams:s.match.teams.map((t,i)=>{const old=before.teams[i]!;return {...t,specs:old.specs.map(template),...('keeperSpec' in old ? {keeperSpec:template(old.keeperSpec!)} : {})};})}};})};
 characterProjections.set(scene,prior);return prior;
}
export function preCharactersCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preCharactersScene(scene),32,true,encode);}
/** r80 makes street tubs and produce stalls topple, retaining exact released r79 data. */
export const FIXTURES_COMPATIBILITY='1c5352790e1f50878a43c4054eb9bb28af1e9bd970d3c5bf1f4636225acd8e76';
const fixturesTemplates=new Map(fixturesR79.templates.flatMap(t=>t.objects.map(id=>[id,t.spec as unknown as ObjectDslV2] as const))),fixturesPlacements=new Map(fixturesR79.placements.map(p=>[p.id,p]));
const fixturesProjections=new WeakMap<Scene,Scene>();
export function preFixturesScene(scene:Scene):Scene{
 scene=preCharactersScene(scene);
 if(!scene.objects.some(o=>fixturesTemplates.has(o.id) && o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.impact))return scene;
 const cached=fixturesProjections.get(scene);if(cached)return cached;
 const prior={...scene,objects:scene.objects.map(o=>{const spec=fixturesTemplates.get(o.id),pose=fixturesPlacements.get(o.id);return spec && pose ? {...o,spec,x:pose.x,y:pose.y,scale:pose.scale} : o;})};
 fixturesProjections.set(scene,prior);return prior;
}
export function preFixturesCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preFixturesScene(scene),32,true,encode);}
/** r79 refines fauna and distance-paced visuals, retaining exact released r78 data. */
export const WILDLIFE_COMPATIBILITY='696658252144cd41f8edfeba358d58d53320d4b6cec01d50147f12b24927d80a';
const wildlifeTemplates=new Map(wildlifeR78.variants.flatMap(t=>t.objects.map(id=>[id,t] as const))),wildlifePlacements=new Map(wildlifeR78.placements.map(p=>[p.id,p])),wildlifeFlocks=new Map(wildlifeR78.flocks.flatMap(f=>f.ids.map(id=>[id,f.spec as unknown as ObjectDslV2] as const)));
const wildlifeProjections=new WeakMap<Scene,Scene>();
export function preWildlifeScene(scene:Scene):Scene{
 scene=preFixturesScene(scene);
 if(!scene.objects.some(o=>wildlifeTemplates.has(o.id) && o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.body.clearanceRadius!==undefined))return scene;
 const cached=wildlifeProjections.get(scene);if(cached)return cached;
 const prior={...scene,objects:scene.objects.map(o=>{const t=wildlifeTemplates.get(o.id),p=wildlifePlacements.get(o.id);return t && p ? {...o,spec:t.spec as unknown as ObjectDslV2,x:p.x,y:p.y,scale:p.scale,...(o.ambient && 'joints' in t ? {ambient:{...o.ambient,joints:t.joints as NonNullable<typeof o.ambient>['joints']}} : {})} : o;}),flocks:scene.flocks.map(f=>({...f,spec:wildlifeFlocks.get(f.id)??f.spec}))};
 wildlifeProjections.set(scene,prior);return prior;
}
export function preWildlifeCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preWildlifeScene(scene),32,true,encode);}
/** r78 refines furniture, retaining the released r77 data for save validation. */
export const FURNITURE_COMPATIBILITY='8cf9454f4f42b1961b68c408f05d349cff8138a135ca701e7cef711ad3ec80ed';
const furnitureTemplates=new Map(furnitureR77.templates.flatMap(t=>t.objects.map(id=>[id,t.spec as unknown as ObjectDslV2] as const))),furniturePlacements=new Map(furnitureR77.placements.map(p=>[p.id,p]));
const furnitureProjections=new WeakMap<Scene,Scene>();
export function preFurnitureScene(scene:Scene):Scene{
 scene=preWildlifeScene(scene);
 if(!scene.objects.some(o=>furnitureTemplates.has(o.id) && o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.body.clearanceRadius!==undefined))return scene;
 const cached=furnitureProjections.get(scene);if(cached)return cached;
 const prior={...scene,objects:scene.objects.map(o=>{const spec=furnitureTemplates.get(o.id),pose=furniturePlacements.get(o.id);return spec && pose ? {...o,spec,x:pose.x,y:pose.y,scale:pose.scale} : o;})};
 furnitureProjections.set(scene,prior);return prior;
}
export function preFurnitureCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preFurnitureScene(scene),32,true,encode);}
/** r77 refines the plant family without changing saved simulation semantics. */
export const BOTANY_COMPATIBILITY='4c720d4d842a8941a91ee4743f49beb894aa24fe8456a50a32cdd0bd769c57e3';
const botanyTemplates=new Map(plantsR76.templates.flatMap(t=>t.objects.map(id=>[id,t.spec as unknown as ObjectDslV2] as const))),botanyPlacements=new Map(plantsR76.placements.map(p=>[p.id,p]));
const botanyProjections=new WeakMap<Scene,Scene>();
export function preBotanyScene(scene:Scene):Scene{
 scene=preFurnitureScene(scene);
 if(!scene.objects.some(o=>botanyTemplates.has(o.id) && o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.body.clearanceRadius!==undefined))return scene;
 const cached=botanyProjections.get(scene);if(cached)return cached;
 const prior={...scene,objects:scene.objects.map(o=>{const spec=botanyTemplates.get(o.id),pose=botanyPlacements.get(o.id);return spec && pose ? {...o,spec,x:pose.x,y:pose.y,scale:pose.scale} : o;})};
 botanyProjections.set(scene,prior);return prior;
}
export function preBotanyCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preBotanyScene(scene),32,true,encode);}
/** r76 refines tree construction with an exact projection of the released world. */
export const CANOPY_COMPATIBILITY='920239c4dcb094581be7a2abd04fae62af8cb712bcdf731495dfdc04ce551f31';
const canopyProjections=new WeakMap<Scene,Scene>();
export function preCanopyScene(scene:Scene):Scene{
 scene=preBotanyScene(scene);
 if(!scene.objects.some(o=>o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.parts.some(p=>p.faceted)))return scene;
 const cached=canopyProjections.get(scene);if(cached)return cached;
 const templates=new Map(treesR75.templates.flatMap(t=>t.objects.map(id=>[id,t.spec as unknown as ObjectDslV2] as const))),placements=new Map(treesR75.placements.map(p=>[p.id,p]));
 const prior={...scene,objects:scene.objects.map(o=>{const spec=templates.get(o.id),pose=placements.get(o.id);return spec && pose ? {...o,spec,x:pose.x,y:pose.y,scale:pose.scale} : o;})};
 canopyProjections.set(scene,prior);return prior;
}
export function preCanopyCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preCanopyScene(scene),32,true,encode);}
/** r75 adds four dormant utility vehicles and connected loading aprons. */
export const FLEET_COMPATIBILITY='705def1dcb0ef796f4017bf3b93074bf2ac9a0fddfc27c0ee54b6e98d4ee2ca5';
const fleetObjects=new Set(['station_field_pickup','station_parcel_truck','harbor_field_pickup','airport_parcel_truck']);
const fleetSurfaces=new Set(['station_loading_apron','east_depot_apron','workshop_loading_apron','airport_freight_apron']);
const fleetProjections=new WeakMap<Scene,Scene>();
export function preFleetScene(scene:Scene):Scene{
 scene=preCanopyScene(scene);
 if(!scene.objects.some(o=>fleetObjects.has(o.id)))return scene;
 const cached=fleetProjections.get(scene);if(cached)return cached;
 const prior={...scene,objects:scene.objects.filter(o=>!fleetObjects.has(o.id)),surfaces:scene.surfaces.filter(s=>!fleetSurfaces.has(s.id))};
 fleetProjections.set(scene,prior);return prior;
}
export function preFleetCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preFleetScene(scene),32,true,encode);}
/** r74 extends shared toppling and connected replanting; the prior shapes stay exact. */
const treeProjections=new WeakMap<Scene,Scene>();
export function preTreeScene(scene:Scene):Scene{
 scene=preFleetScene(scene);
 if(!scene.interactionRules.some(r=>r.id==='living_trees'))return scene;
 const cached=treeProjections.get(scene);if(cached)return cached;
 const snapshots=new Map(treesR73.templates.flatMap(t=>t.objects.map(id=>[id,t] as const))),old=treesR73.rule;
 const prior:Scene={...scene,interactionRules:scene.interactionRules.filter(r=>r.id!=='living_trees'),objects:scene.objects.map(o=>{
  const prior=snapshots.get(o.id);if(!prior || !o.spec || !('dslVersion' in o.spec) || o.spec.dslVersion!==2)return o;
  const fragments=new Map(prior.fragments.map(p=>[p.id,'fragment' in p ? p.fragment : undefined])),{impact,parts,...spec}=o.spec;
  return {...o,spec:{...spec,...('impact' in prior ? {impact:prior.impact as ObjectDslV2['impact']} : {}),parts:parts.map(({fragment,...p})=>{const f=fragments.get(p.id);return {...p,...(f!==undefined ? {fragment:f} : {})};})}};
 }),economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>{if(r.id!==old.id || r.market!==old.market)return r;const {streets,verge,...fields}=r;return {...fields,label:old.label,grounds:old.grounds};})}};
 treeProjections.set(scene,prior);return prior;
}
export function preTreeCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preTreeScene(scene),31,true,encode);}
export const TREE_COMPATIBILITY='9a92fe4e540748a1420268ce0221458d161d5a9ee6180f7dd21c4b59bc95b3f7';
export function preCoverageScene(scene:Scene):Scene{
 scene=preTreeScene(scene);
 return {...scene,economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>r.id==='market_tables' && r.market==='market_stall' ? {...r,label:'Repair neighborhood furniture',streets:['market_avenue','high_street','civic_walk']} : r)}};
}
export function preCoverageCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preCoverageScene(scene),30,true,encode);}
export const COVERAGE_COMPATIBILITY='c0f1953c39994af33d2e5f3fed33c1fda6bad6e648577d6309081ae55ae4589c';
/** r72 adds invitations and one more prepared lunch; prior ledgers stay exact. */
export function preInvitationScene(scene:Scene):Scene{
 scene=preCoverageScene(scene);
 return {...scene,economy:scene.economy && {...scene.economy,socials:scene.economy.socials.map(({markets,...plan})=>plan),jobs:scene.economy.jobs.map(j=>j.id==='pack_lunch' && j.market==='market_stall' ? {...j,target:2} : j)}};
}
export function preInvitationCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preInvitationScene(scene),29,true,encode);}
export const INVITATION_COMPATIBILITY='b1a3a8d992797f3b4d1286b6dd387d11938e4a263b613716a1f4f3b5bcb4f335';
export function prePeopleScene(scene:Scene):Scene{
 scene=preInvitationScene(scene);
 const templates=peopleR70.templates as unknown as {spec:ObjectDslV2;joints?:NonNullable<Scene['objects'][number]['ambient']>['joints']}[];
 const objects=new Map(peopleR70.objects.map(o=>[o.id,o])),sports=new Map(peopleR70.sports.map(s=>[s.id,s]));
 return {...scene,objects:scene.objects.map(o=>{
  const prior=objects.get(o.id);if(!prior)return o;const template=templates[prior.template]!;
  return {...o,spec:template.spec,scale:prior.scale,...(o.ambient && template.joints ? {ambient:{...o.ambient,joints:template.joints}} : {})};
 }),sports:scene.sports.map(s=>{
  const prior=sports.get(s.id);if(!prior || !s.match)return s;
  return {...s,match:{...s.match,teams:s.match.teams.map((t,i)=>{const old=prior.teams[i]!;return {...t,specs:old.specs.map(n=>templates[n]!.spec),...('keeperSpec' in old ? {keeperSpec:templates[old.keeperSpec!]!.spec} : {})};})}};
 })};
}
export function prePeopleCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(prePeopleScene(scene),28,true,encode);}
export const PEOPLE_COMPATIBILITY='5297667c16ec9218ef46e6cbf82cfdffe826220f92572f16d85f88ef5c8c2c53';
/** r70 replaces the acute airport merge; retain exact r69 data for registered backups. */
export function preJunctionScene(scene:Scene):Scene{
 scene=prePeopleScene(scene);
 const restore=<T extends {id:string}>(rows:T[],patch:{added:string[];changed:unknown[]}):T[]=>{
  const added=new Set(patch.added),changed=new Map((patch.changed as T[]).map(row=>[row.id,row]));
  return rows.filter(row=>!added.has(row.id)).map(row=>changed.get(row.id)??row);
 };
 return {...scene,streets:restore(scene.streets,junctionR69.streets),routes:restore(scene.routes,junctionR69.routes),crossings:restore(scene.crossings,junctionR69.crossings),objects:restore(scene.objects,junctionR69.objects)};
}
export function preJunctionCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preJunctionScene(scene),27,true,encode);}
export const JUNCTION_COMPATIBILITY='dc6d2c4b9ab4648a7ff99d47a20e60792c1d940e299e90bbe6fa047fb4e4b66f';
/** Walking spacing changes only future steps, without changing saved data or geometry. */
export function preSpacingCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preJunctionScene(scene),26,true,encode);}
export const SPACING_COMPATIBILITY='c411ce31c403cec896c2b6161fb925a0c2d72db6524c342a40009cb3ed4c68a6';
export const PARK_COMPATIBILITY='3c0314d1b78aa9b819a68d2727d76ad62d8e12f1a9f609b917d6192e458a39b4';
/** r69 adds connected park paths, furnishings and ambient visitors; old objects remain exact. */
export function preParkScene(scene:Scene):Scene{scene=preJunctionScene(scene);return {...scene,objects:scene.objects.filter(o=>!parkR68.objects.includes(o.id)),surfaces:scene.surfaces.filter(s=>!parkR68.surfaces.includes(s.id)),sites:scene.sites.filter(s=>!parkR68.sites.includes(s.id)),economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>r.id==='market_tables' && r.grounds ? {...r,grounds:r.grounds.filter(id=>id!=='garden_work')} : r)}};}
export function preParkCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preParkScene(scene),25,true,encode);}
export const CITY_COMPATIBILITY='14dd5d35da484b860586a706311ca7c0adcfedbce87464b8414816cfe51ba6e7';
/** r68 removes only the circuit and releases nineteen previously reserved furnishings. */
export function preCityScene(scene:Scene):Scene{scene=preParkScene(scene);return {...scene,roadMaskRef:cityR67.roadMaskRef as Scene['roadMaskRef'],checkpoints:cityR67.checkpoints,regions:cityR67.regions as Scene['regions'],objects:scene.objects.filter(o=>!cityR67.addedObjects.includes(o.id))};}
export function preCityCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preCityScene(scene),24,true,encode);}
export const MATCH_COMPATIBILITY='b06274e07914b9b26b720ac81f155e6e6f51406adb84768a5a1c1ec01e49b082';
/** r67 adds match rules; the previous complete physical world remains exact. */
export function preMatchScene(scene:Scene):Scene{scene=preInvitationScene(scene);return {...scene,objects:scene.objects.map(o=>['pitch_goal_0','pitch_goal_1'].includes(o.id) && o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 ? {...o,spec:{...o.spec,parts:o.spec.parts.slice(0,17)}} : o),sports:scene.sports.map(s=>{const {match,netDepth,...old}=s;return old;})};}
export function preMatchCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preMatchScene(scene),23,true,encode);}
export const BUSINESS_COMPATIBILITY='2ed89b889367d51c6ff3f458bc6faf16028e48076482fdbe4cdb3e69125276ab';
/** r66 adds depot ownership and a zero-funded seller, without rebasing old state. */
export function preBusinessScene(scene:Scene):Scene{
 scene=preMatchScene(scene);return {...scene,economy:scene.economy && {...scene.economy,accounts:scene.economy.accounts.filter(a=>a.id!=='depot_owner'),markets:scene.economy.markets.map(m=>{if(m.id!=='station_supplies')return m;const {owner,sale,...old}=m;return old;})}};
}
export function preBusinessCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preBusinessScene(scene),22,true,encode);}
/** r65 connects the existing school bench to the caretaker; old state stays exact. */
export function preSchoolRepairScene(scene:Scene):Scene{
 scene=preBusinessScene(scene);return {...scene,economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>r.id==='market_tables' && r.grounds ? {...r,grounds:r.grounds.filter(id=>!['school_yard','school_yard_access','school_yard_return'].includes(id))} : r)}};
}
export function preSchoolRepairCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preSchoolRepairScene(scene),21,true,encode);}
/** r64 adds social plans, remembered meals and one bench; old state stays exact. */
export function preSocialScene(scene:Scene):Scene{
 scene=preSchoolRepairScene(scene);return {...scene,objects:scene.objects.filter(o=>o.id!=='school_bench'),behaviors:scene.behaviors.map(b=>!['market_chat','school_chat'].includes(b.id) ? b : {...b,states:b.states.filter(s=>!['shared_lunch','friend'].includes(s.id)).map(s=>({...s,transitions:s.transitions.filter(t=>t.shared_meals===undefined)}))}),economy:scene.economy && {...scene.economy,socials:[],accounts:scene.economy.accounts.map(a=>{const {social,...old}=a;return old;})}};
}
export function preSocialCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preSocialScene(scene),20,true,encode);}
/** r63 adds staff journeys, centers the teacher and splits the existing L-shaped path. */
export function preShiftScene(scene:Scene):Scene{
 scene=preSocialScene(scene);return {...scene,surfaces:scene.surfaces.filter(s=>s.id!=='school_yard_return').map(s=>s.id==='school_yard_access' ? {...s,points:[[4435,3500],[4435,3516],[4288,3516],[4288,3770],[4272,3770],[4272,3500]].map(([x,y])=>({x:x!,y:y!}))} : s),objects:scene.objects.map(o=>o.id==='teacher' && o.x===4436 ? {...o,x:4430} : o),economy:scene.economy && {...scene.economy,shifts:[],accounts:scene.economy.accounts.map(a=>{const {shift,...old}=a;return old;})}};
}
export function preShiftCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preShiftScene(scene),19,true,encode);}
/** r62 adds counter hours without changing saved fields, geometry or resources. */
export function preHoursScene(scene:Scene):Scene{
 scene=preShiftScene(scene);return {...scene,economy:scene.economy && {...scene.economy,markets:scene.economy.markets.map(m=>{const {hours,...old}=m;return old;})}};
}
export function preHoursCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preHoursScene(scene),18,true,encode);}
/** r61 adds furniture metadata and a meal destination, retaining geometry and ledgers. */
export function preSeatingScene(scene:Scene):Scene{
 scene=preHoursScene(scene);return {...scene,objects:scene.objects.map(o=>{if(!o.spec || !('seats' in o.spec) || !o.spec.seats)return o;const {seats,...spec}=o.spec;return {...o,spec};}),economy:scene.economy && {...scene.economy,meals:scene.economy.meals.map(m=>{if(m.id!=='market_break')return m;const {seats,grounds,...old}=m;return old;})}};
}
export function preSeatingCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preSeatingScene(scene),17,true,encode);}
/** r60 changes only existing staff duties; no new world or ledger members. */
export function preKitchenScene(scene:Scene):Scene{
 scene=preSeatingScene(scene);const e=scene.economy;return {...scene,economy:e && {...e,accounts:e.accounts.map(a=>a.id==='baker' && a.works ? {...a,works:a.works.filter(id=>id!=='pack_lunch')} : a.id==='caretaker' && a.deliveries ? {...a,deliveries:a.deliveries.filter(id=>id!=='flour_run')} : a),deliveries:e.deliveries.map(d=>{if(d.id!=='flour_run' || d.on!=='market_square')return d;const {on,grounds,...old}=d;return old;})}};
}
export function preKitchenCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preKitchenScene(scene),16,true,encode);}
/** Registered r59 changes one customer's policy, without new stock, money or geometry. */
export function preMealScene(scene:Scene):Scene{
 scene=preKitchenScene(scene);const e=scene.economy;return {...scene,economy:e && {...e,meals:e.meals.filter(m=>m.id!=='market_break'),accounts:e.accounts.map(a=>{if(a.id!=='regular' || a.meal!=='market_break')return a;const {meal,...old}=a;return {...old,shop:true};})}};
}
export function preMealCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preMealScene(scene),15,true,encode);}
/** Registered r58 adds personal progression; geometry and previous task rules are unchanged. */
export function preProgressScene(scene:Scene):Scene{
 scene=preMealScene(scene);const e=scene.economy;
 return {...scene,behaviors:scene.behaviors.map(b=>!['market_chat','school_chat'].includes(b.id) ? b : {...b,states:b.states.filter(s=>s.id!==(b.id==='market_chat' ? 'recognized' : 'helped')).map(s=>({...s,transitions:s.transitions.filter(t=>!t.requires)}))}),economy:e && {...e,milestones:[],jobs:e.jobs.filter(j=>j.id!=='large_bake'),accounts:e.accounts.map(a=>{if(a.id!=='baker' || !a.works)return a;const {works,...old}=a;return {...old,work:'bake'};})}};
}
export function preProgressCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preProgressScene(scene),14,true,encode);}
/** Registered r57 keeps all old rules and initial ledgers; only new recipes/lots are removed. */
export function preRecipeScene(scene:Scene):Scene{
 scene=preProgressScene(scene);const e=scene.economy;if(!e)return scene;
 const added=new Set(['vegetables','lunch','boards','fasteners']);
 return {...scene,economy:{...e,goods:e.goods.filter(g=>!added.has(g.id)),markets:e.markets.map(m=>({...m,lots:m.lots.filter(l=>!added.has(l.good))})),jobs:e.jobs.filter(j=>!['pack_lunch','assemble_kit'].includes(j.id))}};
}
export function preRecipeCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preRecipeScene(scene),13,true,encode);}
/** Same physical world and ledgers; only passenger exit selection changes. */
export function preEgressCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preRecipeScene(scene),12,true,encode);}
/** The pinned r55 building and entrance are host migration data, never Dream policy. */
export function preInteriorScene(scene:Scene):Scene{
 scene=preRecipeScene(scene);
 if(!scene.objects.some(o=>o.id==='market_hall' && o.spec && 'interior' in o.spec && o.spec.interior))return scene;
 return {...scene,objects:scene.objects.filter(o=>!['hall_table_west','hall_table_east','hall_bench','hall_produce_crate'].includes(o.id)).map(o=>o.id==='market_hall' ? marketR55 as Scene['objects'][number] : o),sites:scene.sites.map(s=>s.id==='access_market_hall' ? {...s,entry:{x:0,y:-26.25}} : s),economy:scene.economy && {...scene.economy,markets:scene.economy.markets.map(m=>m.id==='market_stall' ? {...m,radius:70} : m),repairs:scene.economy.repairs.map(r=>r.id==='market_tables' ? {...r,grounds:r.grounds?.filter(id=>id!=='market_hall')} : r)}};
}
export function preInteriorCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preInteriorScene(scene),11,true,encode);}
/** Registered r54 projection preserves geometry, clocks and every existing ledger field. */
export function preCourierScene(scene:Scene):Scene{
 scene=preInteriorScene(scene);return {...scene,economy:scene.economy && {...scene.economy,accounts:scene.economy.accounts.map(a=>{const {deliveries,...old}=a;return old;}),deliveries:scene.economy.deliveries.map(d=>{const {on,grounds,...old}=d;return old;})}};
}
export function preCourierCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preCourierScene(scene),10,true,encode);}
/** Registered r53 appearance projection. Movement, ledgers and clocks are identical. */
export function preFinishScene(scene:Scene):Scene{
 scene=preCourierScene(scene);return {...scene,surfaces:scene.surfaces.map(s=>{if(s.id!=='orchard_work')return s;const {finish,...old}=s;return {...old,color:'#819461'};})};
}
export function preFinishCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preFinishScene(scene),10,true,encode);}
/** Registered r52 projection preserves every placement, contact and public walkway. */
export function prePlantScene(scene:Scene):Scene{
 scene=preFinishScene(scene);const e=scene.economy;return {...scene,surfaces:scene.surfaces.filter(s=>!['orchard_work','orchard_path'].includes(s.id)),economy:e && {...e,goods:e.goods.filter(g=>g.id!=='sapling'),accounts:e.accounts.map(a=>{if(a.id!=='caretaker' || !a.repairs)return a;const {repairs,...old}=a;return {...old,repair:'market_tables'};}),markets:e.markets.map(m=>({...m,lots:m.lots.filter(l=>l.good!=='sapling')})),deliveries:e.deliveries.filter(d=>d.id!=='saplings_run'),repairs:e.repairs.filter(r=>r.id!=='orchard_trees')}};
}
export function prePlantCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(prePlantScene(scene),9,true,encode);}
/** Registered r51 projection keeps every object, surface and existing crossing. */
export function preVergeScene(scene:Scene):Scene{
 scene=prePlantScene(scene);
 return {...scene,crossings:scene.crossings.filter(c=>c.id!=='repair_high_south'),economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>{if(r.id!=='market_tables')return r;const {streets,verge,...old}=r;return old;})}};
}
export function preVergeCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preVergeScene(scene),8,true,encode);}
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
export function prePoolCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(prePoolScene(scene),7,true,encode);}
/** Registered r49 projection: the two added seating grounds leave all objects/contacts intact. */
export function preNetworkScene(scene:Scene):Scene{
 scene=prePoolScene(scene);
 return {...scene,surfaces:scene.surfaces.filter(s=>!['park_seating','station_seating'].includes(s.id)),economy:scene.economy && {...scene.economy,repairs:scene.economy.repairs.map(r=>{if(r.id!=='market_tables')return r;const {grounds,...old}=r;return {...old,label:'Repair market furniture',kinds:['table','custom']};})}};
}
export function preNetworkCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preNetworkScene(scene),6,true,encode);}
/** Reconstruct the registered r48 economy without changing any physical field. */
export function preSupplyScene(scene:Scene):Scene{
 scene=preNetworkScene(scene);const e=scene.economy;if(!e)return scene;
 return {...scene,economy:{...e,deliveries:e.deliveries.filter(d=>d.id!=='kits_run').map(({price,...d})=>d),markets:e.markets.map(m=>({...m,lots:m.lots.filter(l=>l.id!=='depot_kits')})),repairs:e.repairs.map(r=>{if(r.id!=='market_tables')return r;const {kinds,...old}=r;return {...old,label:'Repair a market table',kind:'table'};})}};
}
export function preSupplyCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preSupplyScene(scene),5,true,encode);}
/** Only the registered market repair release adds these members. Physical fields are untouched. */
export function preRepairScene(scene:Scene):Scene{
 scene=preSupplyScene(scene);const e=scene.economy;if(!e)return scene;
 return {...scene,economy:{...e,repairs:[],goods:e.goods.filter(g=>g.id!=='timber'),accounts:e.accounts.filter(a=>a.id!=='caretaker'),markets:e.markets.map(m=>({...m,lots:m.lots.filter(l=>l.id!=='repair_kits')}))}};
}
export function preRepairCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preRepairScene(scene),4,true,encode);}
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
export function preParkingCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{return projection(preParkingScene(scene),3,true,encode);}
export function preDeliveryScene(scene:Scene):Scene{
 scene=preRepairScene(scene);const e=scene.economy;if(!e)return scene;
 return {...scene,economy:{...e,accounts:e.accounts.filter(a=>['pocket','baker','regular'].includes(a.id)),markets:e.markets.filter(m=>m.id==='market_stall'),deliveries:[]}};
}
export function preDeliveryCompatibilitySource(scene:Scene,encode?:CompatibilityEncoder):string{
 const old=preDeliveryScene(scene);
 return projection({...old,economy:old.economy && {...old.economy,deliveries:undefined}} as Scene,2,true,encode);
}

export const R44_COMPATIBILITIES=['3dcc5c36ef9319b57520f2b561a988259cddebc4aedcc3a41fa27b9fbdc85ab9','1b54ff160d6487ca8cac74e702fa99c9af15aced255444ea7af5adc818c5de63'] as const;

export async function sha256(text:string):Promise<string>{
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
