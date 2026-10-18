import {createWorldScene,worldSource,worldModules} from './world-fixture';
import {buildWorldChunk} from '../game/chunk-builder';
import {packChunk,disposeChunk} from '../game/chunk-packet';
import {compatibilityBatchEncoder,CITY_COMPATIBILITY,preCityScene,preCityCompatibilitySource,MATCH_COMPATIBILITY,preMatchCompatibilitySource,BUSINESS_COMPATIBILITY,preBusinessCompatibilitySource,SCHOOL_REPAIR_COMPATIBILITY,preSchoolRepairCompatibilitySource,SOCIAL_COMPATIBILITY,preSocialCompatibilitySource,SHIFT_COMPATIBILITY,preShiftCompatibilitySource,HOURS_COMPATIBILITY,preHoursCompatibilitySource,SEATING_COMPATIBILITY,preSeatingCompatibilitySource,KITCHEN_COMPATIBILITY,preKitchenCompatibilitySource,MEAL_COMPATIBILITY,preMealCompatibilitySource,PROGRESS_COMPATIBILITY,preProgressCompatibilitySource,RECIPE_COMPATIBILITY,preRecipeCompatibilitySource,EGRESS_COMPATIBILITY,preEgressCompatibilitySource,INTERIOR_COMPATIBILITY,preInteriorScene,preInteriorCompatibilitySource,COURIER_COMPATIBILITY,preCourierCompatibilitySource,saveCompatibilitySource,preCommerceCompatibilitySource,registeredLegacySource,supportsPreCommerceUpgrade,preDeliveryCompatibilitySource,R45_COMPATIBILITY,preParkingScene,preParkingCompatibilitySource,PARKING_COMPATIBILITY,REPAIR_COMPATIBILITY,preRepairCompatibilitySource,SUPPLY_COMPATIBILITY,preSupplyCompatibilitySource,PLANT_COMPATIBILITY,NATURAL_COMPATIBILITY,preFinishCompatibilitySource,prePlantCompatibilitySource,VERGE_COMPATIBILITY,preVergeScene,preVergeCompatibilitySource,POOL_COMPATIBILITY,prePoolCompatibilitySource,NETWORK_COMPATIBILITY,preNetworkCompatibilitySource,DELIVERY_COMPATIBILITY,sha256} from './save-compatibility';
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
  let encode:ReturnType<typeof compatibilityBatchEncoder>|undefined=compatibilityBatchEncoder();
  const saveCompatibility=await sha256(saveCompatibilitySource(scene,encode));
  const cityHash=await sha256(preCityCompatibilitySource(scene,encode)),cityUpgrade=saveCompatibility===CITY_COMPATIBILITY && cityHash===MATCH_COMPATIBILITY;
  const compatibilityScene=cityUpgrade ? preCityScene(scene) : scene;
  const matchHash=await sha256(preMatchCompatibilitySource(compatibilityScene,encode)),matchUpgrade=(saveCompatibility===MATCH_COMPATIBILITY || cityUpgrade) && matchHash===BUSINESS_COMPATIBILITY;
  const businessHash=await sha256(preBusinessCompatibilitySource(compatibilityScene,encode)),businessUpgrade=(saveCompatibility===BUSINESS_COMPATIBILITY || matchUpgrade) && businessHash===SCHOOL_REPAIR_COMPATIBILITY;
  const schoolRepairHash=await sha256(preSchoolRepairCompatibilitySource(compatibilityScene,encode)),schoolRepairUpgrade=(saveCompatibility===SCHOOL_REPAIR_COMPATIBILITY || businessUpgrade) && schoolRepairHash===SOCIAL_COMPATIBILITY;
  const socialHash=await sha256(preSocialCompatibilitySource(compatibilityScene,encode)),socialUpgrade=(saveCompatibility===SOCIAL_COMPATIBILITY || schoolRepairUpgrade) && socialHash===SHIFT_COMPATIBILITY;
  const shiftHash=await sha256(preShiftCompatibilitySource(compatibilityScene,encode)),shiftUpgrade=(saveCompatibility===SHIFT_COMPATIBILITY || socialUpgrade) && shiftHash===HOURS_COMPATIBILITY;
  const hoursHash=await sha256(preHoursCompatibilitySource(compatibilityScene,encode)),hoursUpgrade=(saveCompatibility===HOURS_COMPATIBILITY || shiftUpgrade) && hoursHash===SEATING_COMPATIBILITY;
  const seatingHash=await sha256(preSeatingCompatibilitySource(compatibilityScene,encode)),seatingUpgrade=(saveCompatibility===SEATING_COMPATIBILITY || hoursUpgrade) && seatingHash===KITCHEN_COMPATIBILITY;
  const kitchenHash=await sha256(preKitchenCompatibilitySource(compatibilityScene,encode)),kitchenUpgrade=(saveCompatibility===KITCHEN_COMPATIBILITY || seatingUpgrade) && kitchenHash===MEAL_COMPATIBILITY;
  const mealHash=await sha256(preMealCompatibilitySource(compatibilityScene,encode)),mealUpgrade=(saveCompatibility===MEAL_COMPATIBILITY || kitchenUpgrade) && mealHash===PROGRESS_COMPATIBILITY;
  const progressHash=await sha256(preProgressCompatibilitySource(compatibilityScene,encode)),progressUpgrade=(saveCompatibility===PROGRESS_COMPATIBILITY || mealUpgrade) && progressHash===RECIPE_COMPATIBILITY;
  const recipeHash=await sha256(preRecipeCompatibilitySource(compatibilityScene,encode)),recipeUpgrade=(saveCompatibility===RECIPE_COMPATIBILITY || progressUpgrade) && recipeHash===EGRESS_COMPATIBILITY;
  const egressHash=await sha256(preEgressCompatibilitySource(compatibilityScene,encode)),egressUpgrade=(saveCompatibility===EGRESS_COMPATIBILITY || recipeUpgrade) && egressHash===INTERIOR_COMPATIBILITY;
  const interiorHash=await sha256(preInteriorCompatibilitySource(compatibilityScene,encode)),interiorUpgrade=(saveCompatibility===INTERIOR_COMPATIBILITY || egressUpgrade) && interiorHash===COURIER_COMPATIBILITY,previousInterior=interiorUpgrade ? preInteriorScene(compatibilityScene) : undefined;
  const courierHash=await sha256(preCourierCompatibilitySource(compatibilityScene,encode)),courierUpgrade=(saveCompatibility===COURIER_COMPATIBILITY || interiorUpgrade) && courierHash===NATURAL_COMPATIBILITY;
  const finishHash=await sha256(preFinishCompatibilitySource(compatibilityScene,encode)),finishUpgrade=(saveCompatibility===NATURAL_COMPATIBILITY || courierUpgrade) && finishHash===PLANT_COMPATIBILITY;
  const plantHash=await sha256(prePlantCompatibilitySource(compatibilityScene,encode)),plantUpgrade=(saveCompatibility===PLANT_COMPATIBILITY || finishUpgrade) && plantHash===VERGE_COMPATIBILITY;
  const vergeHash=await sha256(preVergeCompatibilitySource(compatibilityScene,encode)),vergeUpgrade=(saveCompatibility===VERGE_COMPATIBILITY || plantUpgrade) && vergeHash===POOL_COMPATIBILITY;
  const poolHash=await sha256(prePoolCompatibilitySource(compatibilityScene,encode)),poolUpgrade=(saveCompatibility===POOL_COMPATIBILITY || vergeUpgrade) && poolHash===NETWORK_COMPATIBILITY;
  const networkHash=await sha256(preNetworkCompatibilitySource(compatibilityScene,encode)),networkUpgrade=(saveCompatibility===NETWORK_COMPATIBILITY || poolUpgrade) && networkHash===SUPPLY_COMPATIBILITY;
  const supplyHash=await sha256(preSupplyCompatibilitySource(compatibilityScene,encode)),supplyUpgrade=(saveCompatibility===SUPPLY_COMPATIBILITY || networkUpgrade) && supplyHash===REPAIR_COMPATIBILITY;
  const repairHash=await sha256(preRepairCompatibilitySource(compatibilityScene,encode)),repairUpgrade=(saveCompatibility===REPAIR_COMPATIBILITY || supplyUpgrade) && repairHash===PARKING_COMPATIBILITY;
  const parkingHash=await sha256(preParkingCompatibilitySource(compatibilityScene,encode)),parkingUpgrade=(saveCompatibility===PARKING_COMPATIBILITY || repairUpgrade) && parkingHash===DELIVERY_COMPATIBILITY;
  const previousScene=parkingUpgrade ? preParkingScene(compatibilityScene) : compatibilityScene;
  const previousSaveCompatibility=await sha256(preCommerceCompatibilitySource(previousScene,1,encode)),emptyEconomySaveCompatibility=await sha256(preCommerceCompatibilitySource(previousScene,2,encode)),previousSaveSource=registeredLegacySource(emptyEconomySaveCompatibility);
  const previousMarketHash=await sha256(preDeliveryCompatibilitySource(previousScene,encode));
  encode=undefined;
  const upgrade=supportsPreCommerceUpgrade(scene,saveCompatibility);
  postMessage({scene,bounds,previousCitySaveCompatibility:cityUpgrade ? cityHash : undefined,previousCityNavigation:cityUpgrade ? ambientGraph(compatibilityScene) : undefined,previousMatchSaveCompatibility:matchUpgrade ? matchHash : undefined,previousBusinessSaveCompatibility:businessUpgrade ? businessHash : undefined,previousSchoolRepairSaveCompatibility:schoolRepairUpgrade ? schoolRepairHash : undefined,previousSocialSaveCompatibility:socialUpgrade ? socialHash : undefined,previousShiftSaveCompatibility:shiftUpgrade ? shiftHash : undefined,previousHoursSaveCompatibility:hoursUpgrade ? hoursHash : undefined,previousSeatingSaveCompatibility:seatingUpgrade ? seatingHash : undefined,previousKitchenSaveCompatibility:kitchenUpgrade ? kitchenHash : undefined,previousMealSaveCompatibility:mealUpgrade ? mealHash : undefined,previousProgressSaveCompatibility:progressUpgrade ? progressHash : undefined,previousRecipeSaveCompatibility:recipeUpgrade ? recipeHash : undefined,previousEgressSaveCompatibility:egressUpgrade ? egressHash : undefined,previousInteriorSaveCompatibility:interiorUpgrade ? interiorHash : undefined,previousInteriorNavigation:previousInterior ? ambientGraph(previousInterior) : undefined,previousInteriorContacts:previousInterior ? sceneContactData(previousInterior) : undefined,previousCourierSaveCompatibility:courierUpgrade ? courierHash : undefined,previousFinishSaveCompatibility:finishUpgrade ? finishHash : undefined,previousPlantSaveCompatibility:plantUpgrade ? plantHash : undefined,previousVergeSaveCompatibility:vergeUpgrade ? vergeHash : undefined,previousVergeNavigation:vergeUpgrade ? ambientGraph(preVergeScene(compatibilityScene)) : undefined,previousPoolSaveCompatibility:poolUpgrade ? poolHash : undefined,previousNetworkSaveCompatibility:networkUpgrade ? networkHash : undefined,repairNavigation:repairNavigation(scene),previousSupplySaveCompatibility:supplyUpgrade ? supplyHash : undefined,previousRepairSaveCompatibility:repairUpgrade ? repairHash : undefined,navigation:ambientGraph(scene),contacts:sceneContactData(scene),saveCompatibility,previousParkingSaveCompatibility:parkingUpgrade ? parkingHash : undefined,previousMarketSaveCompatibility:upgrade && previousMarketHash===R45_COMPATIBILITY ? previousMarketHash : undefined,previousSaveCompatibility:upgrade ? previousSaveCompatibility : undefined,emptyEconomySaveCompatibility:upgrade ? emptyEconomySaveCompatibility : undefined,previousSaveSource:upgrade ? previousSaveSource : undefined,compileMs:performance.now()-start});
  onmessage=({data})=>{
    try {
      const root=buildWorldChunk(scene,data.region),{packet,transfer}=packChunk(root);
      postMessage({id:data.id,packet},{transfer});disposeChunk(root);
    }catch(error){postMessage({error:error instanceof Error ? error.message : String(error)});}
  };
} catch(error) {postMessage({error:error instanceof Error ? error.message : String(error)});}}
void boot();
