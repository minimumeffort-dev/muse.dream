import {createWorldScene,worldSource,worldModules} from './world-fixture';
import {buildWorldChunk} from '../game/chunk-builder';
import {packChunk,disposeChunk} from '../game/chunk-packet';
import {saveCompatibilitySource,preCommerceCompatibilitySource,registeredLegacySource,supportsPreCommerceUpgrade,preDeliveryCompatibilitySource,R45_COMPATIBILITY,preParkingScene,preParkingCompatibilitySource,PARKING_COMPATIBILITY,REPAIR_COMPATIBILITY,preRepairCompatibilitySource,SUPPLY_COMPATIBILITY,preSupplyCompatibilitySource,PLANT_COMPATIBILITY,prePlantCompatibilitySource,VERGE_COMPATIBILITY,preVergeScene,preVergeCompatibilitySource,POOL_COMPATIBILITY,prePoolCompatibilitySource,NETWORK_COMPATIBILITY,preNetworkCompatibilitySource,DELIVERY_COMPATIBILITY,sha256} from './save-compatibility';
import {ambientGraph} from './ambient-navigation';
import {sceneContactData} from './contacts';
import {repairNavigation} from '../sim/repair';
import {worldStreamBounds} from '../game/world-streaming';

// Only accepted engine data and bounded mesh requests cross this boundary.
async function boot(){try {
  const start=performance.now(),source=JSON.stringify([worldSource,Object.entries(worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)]);
  const sourceHash=await sha256(source);
  const scene=createWorldScene(sourceHash);
  const bounds=worldStreamBounds(scene);
  const saveCompatibility=await sha256(saveCompatibilitySource(scene));
  const plantHash=await sha256(prePlantCompatibilitySource(scene)),plantUpgrade=saveCompatibility===PLANT_COMPATIBILITY && plantHash===VERGE_COMPATIBILITY;
  const vergeHash=await sha256(preVergeCompatibilitySource(scene)),vergeUpgrade=(saveCompatibility===VERGE_COMPATIBILITY || plantUpgrade) && vergeHash===POOL_COMPATIBILITY;
  const poolHash=await sha256(prePoolCompatibilitySource(scene)),poolUpgrade=(saveCompatibility===POOL_COMPATIBILITY || vergeUpgrade) && poolHash===NETWORK_COMPATIBILITY;
  const networkHash=await sha256(preNetworkCompatibilitySource(scene)),networkUpgrade=(saveCompatibility===NETWORK_COMPATIBILITY || poolUpgrade) && networkHash===SUPPLY_COMPATIBILITY;
  const supplyHash=await sha256(preSupplyCompatibilitySource(scene)),supplyUpgrade=(saveCompatibility===SUPPLY_COMPATIBILITY || networkUpgrade) && supplyHash===REPAIR_COMPATIBILITY;
  const repairHash=await sha256(preRepairCompatibilitySource(scene)),repairUpgrade=(saveCompatibility===REPAIR_COMPATIBILITY || supplyUpgrade) && repairHash===PARKING_COMPATIBILITY;
  const parkingHash=await sha256(preParkingCompatibilitySource(scene)),parkingUpgrade=(saveCompatibility===PARKING_COMPATIBILITY || repairUpgrade) && parkingHash===DELIVERY_COMPATIBILITY;
  const previousScene=parkingUpgrade ? preParkingScene(scene) : scene;
  const previousSaveCompatibility=await sha256(preCommerceCompatibilitySource(previousScene)),emptyEconomySaveCompatibility=await sha256(preCommerceCompatibilitySource(previousScene,2)),previousSaveSource=registeredLegacySource(emptyEconomySaveCompatibility);
  const previousMarketHash=await sha256(preDeliveryCompatibilitySource(previousScene));
  const upgrade=supportsPreCommerceUpgrade(scene,saveCompatibility);
  postMessage({scene,bounds,previousPlantSaveCompatibility:plantUpgrade ? plantHash : undefined,previousVergeSaveCompatibility:vergeUpgrade ? vergeHash : undefined,previousVergeNavigation:vergeUpgrade ? ambientGraph(preVergeScene(scene)) : undefined,previousPoolSaveCompatibility:poolUpgrade ? poolHash : undefined,previousNetworkSaveCompatibility:networkUpgrade ? networkHash : undefined,repairNavigation:repairNavigation(scene),previousSupplySaveCompatibility:supplyUpgrade ? supplyHash : undefined,previousRepairSaveCompatibility:repairUpgrade ? repairHash : undefined,navigation:ambientGraph(scene),contacts:sceneContactData(scene),saveCompatibility,previousParkingSaveCompatibility:parkingUpgrade ? parkingHash : undefined,previousMarketSaveCompatibility:upgrade && previousMarketHash===R45_COMPATIBILITY ? previousMarketHash : undefined,previousSaveCompatibility:upgrade ? previousSaveCompatibility : undefined,emptyEconomySaveCompatibility:upgrade ? emptyEconomySaveCompatibility : undefined,previousSaveSource:upgrade ? previousSaveSource : undefined,compileMs:performance.now()-start});
  onmessage=({data})=>{
    try {
      const root=buildWorldChunk(scene,data.region),{packet,transfer}=packChunk(root);
      postMessage({id:data.id,packet},{transfer});disposeChunk(root);
    }catch(error){postMessage({error:error instanceof Error ? error.message : String(error)});}
  };
} catch(error) {postMessage({error:error instanceof Error ? error.message : String(error)});}}
void boot();
