import {createWorldScene,worldSource,worldModules} from './world-fixture';
import {buildWorldChunk} from '../game/chunk-builder';
import {packChunk,disposeChunk} from '../game/chunk-packet';
import {saveCompatibilitySource,preCommerceCompatibilitySource,registeredLegacySource,supportsPreCommerceUpgrade,preDeliveryCompatibilitySource,R45_COMPATIBILITY,preParkingScene,preParkingCompatibilitySource,PARKING_COMPATIBILITY,DELIVERY_COMPATIBILITY,sha256} from './save-compatibility';
import {ambientGraph} from './ambient-navigation';
import {sceneContactData} from './contacts';
import {worldStreamBounds} from '../game/world-streaming';

// Only accepted engine data and bounded mesh requests cross this boundary.
async function boot(){try {
  const start=performance.now(),source=JSON.stringify([worldSource,Object.entries(worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)]);
  const sourceHash=await sha256(source);
  const scene=createWorldScene(sourceHash);
  const bounds=worldStreamBounds(scene);
  const saveCompatibility=await sha256(saveCompatibilitySource(scene));
  const parkingHash=await sha256(preParkingCompatibilitySource(scene)),parkingUpgrade=saveCompatibility===PARKING_COMPATIBILITY && parkingHash===DELIVERY_COMPATIBILITY;
  const previousScene=parkingUpgrade ? preParkingScene(scene) : scene;
  const previousSaveCompatibility=await sha256(preCommerceCompatibilitySource(previousScene)),emptyEconomySaveCompatibility=await sha256(preCommerceCompatibilitySource(previousScene,2)),previousSaveSource=registeredLegacySource(emptyEconomySaveCompatibility);
  const previousMarketHash=await sha256(preDeliveryCompatibilitySource(previousScene));
  const upgrade=supportsPreCommerceUpgrade(scene,saveCompatibility);
  postMessage({scene,bounds,navigation:ambientGraph(scene),contacts:sceneContactData(scene),saveCompatibility,previousParkingSaveCompatibility:parkingUpgrade ? parkingHash : undefined,previousMarketSaveCompatibility:upgrade && previousMarketHash===R45_COMPATIBILITY ? previousMarketHash : undefined,previousSaveCompatibility:upgrade ? previousSaveCompatibility : undefined,emptyEconomySaveCompatibility:upgrade ? emptyEconomySaveCompatibility : undefined,previousSaveSource:upgrade ? previousSaveSource : undefined,compileMs:performance.now()-start});
  onmessage=({data})=>{
    try {
      const root=buildWorldChunk(scene,data.region),{packet,transfer}=packChunk(root);
      postMessage({id:data.id,packet},{transfer});disposeChunk(root);
    }catch(error){postMessage({error:error instanceof Error ? error.message : String(error)});}
  };
} catch(error) {postMessage({error:error instanceof Error ? error.message : String(error)});}}
void boot();
