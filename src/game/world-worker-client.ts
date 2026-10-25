import type {CharacterGroundData} from './character-ground';
import type {RepairNavigation} from '../sim/repair';
import type {Scene} from '../scene/schema';
import type {RenderRegion} from './render-region';
import type {ChunkPacket} from './chunk-packet';
import type {AmbientGraph} from '../scene/ambient-navigation';
import type {SceneContactData} from '../scene/contacts';
import type {StreamBounds} from './world-streaming';

/** A single producer bounds CPU work and transferred buffers during fast travel. */
export class WorldWorkerClient {
  readonly scene:Promise<Scene>;
  navigation!:AmbientGraph;
  repairNavigation!:RepairNavigation;
  contacts!:SceneContactData;
  bounds!:StreamBounds;
  characterGround!:CharacterGroundData;
  saveCompatibility?:string;
  previousSaveCompatibility?:string;
  previousMarketSaveCompatibility?:string;
  previousParkingSaveCompatibility?:string;
  previousRepairSaveCompatibility?:string;
  previousSupplySaveCompatibility?:string;
  previousNetworkSaveCompatibility?:string;
  previousPoolSaveCompatibility?:string;
  previousVergeSaveCompatibility?:string;
  previousPlantSaveCompatibility?:string;
  previousFinishSaveCompatibility?:string;
  previousCourierSaveCompatibility?:string;
  previousPeopleSaveCompatibility?:string;
  previousInvitationSaveCompatibility?:string;
  previousOfficeWorkSaveCompatibility?:string;
  previousServiceWorkSaveCompatibility?:string;
  previousTowerRoomSaveCompatibility?:string;previousTowerRoomContacts?:import('../scene/contacts').SceneContactData;previousTowerRoomNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousCrowdFlowSaveCompatibility?:string;
  previousWalkingLinksSaveCompatibility?:string;
  previousCrossingAccessSaveCompatibility?:string;previousCrossingAccessContacts?:import('../scene/contacts').SceneContactData;previousCrossingAccessNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousStationMaintenanceSaveCompatibility?:string;
  previousDistrictSaveCompatibility?:string;previousDistrictContacts?:import('../scene/contacts').SceneContactData;previousDistrictNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousUpstairsSocialSaveCompatibility?:string;previousSeatedRestSaveCompatibility?:string;previousCompanySaveCompatibility?:string;previousLoftSaveCompatibility?:string;previousLoftContacts?:import('../scene/contacts').SceneContactData;previousLoftNavigation?:import('../scene/ambient-navigation').AmbientGraph;previousPeerRecipeSaveCompatibility?:string;previousCompanionSaveCompatibility?:string;previousGestureSaveCompatibility?:string;previousStationSaveCompatibility?:string;previousBondSaveCompatibility?:string;previousShelterSaveCompatibility?:string;previousAttendanceSaveCompatibility?:string;previousFloorsSaveCompatibility?:string;previousFloorsContacts?:import('../scene/contacts').SceneContactData;previousFloorsNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousStairsSaveCompatibility?:string;previousStairsContacts?:import('../scene/contacts').SceneContactData;previousStairsNavigation?:import('../scene/ambient-navigation').AmbientGraph;previousRestSaveCompatibility?:string;previousWorkCommuteSaveCompatibility?:string;
  previousHomeMealsSaveCompatibility?:string;
  previousHomeInteriorSaveCompatibility?:string;
  previousHomeInteriorNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousHomeInteriorContacts?:import('../scene/contacts').SceneContactData;
  previousWeatherSaveCompatibility?:string;
  previousRationsSaveCompatibility?:string;
  previousSchoolInteriorSaveCompatibility?:string;
  previousSchoolInteriorNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousSchoolInteriorContacts?:import('../scene/contacts').SceneContactData;
  previousNurserySaveCompatibility?:string;
  previousHardwareSaveCompatibility?:string;
  previousRecoverySaveCompatibility?:string;
  previousResidentSupplySaveCompatibility?:string;
  previousWorkshopSupplySaveCompatibility?:string;
  previousKitProductionSaveCompatibility?:string;
  previousStrikeSaveCompatibility?:string;
  previousEquipmentSaveCompatibility?:string;
  previousServiceSaveCompatibility?:string;
  previousServiceNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousCharactersSaveCompatibility?:string;
  previousFixturesSaveCompatibility?:string;
  previousWildlifeSaveCompatibility?:string;previousWildlifeContacts?:SceneContactData;previousFurnitureSaveCompatibility?:string;previousFurnitureContacts?:SceneContactData;previousBotanySaveCompatibility?:string;previousBotanyContacts?:SceneContactData;previousCanopySaveCompatibility?:string;previousCanopyContacts?:SceneContactData;previousFleetSaveCompatibility?:string;previousTreeSaveCompatibility?:string;
  previousCoverageSaveCompatibility?:string;
  previousPeopleNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousPeopleContacts?:import('../scene/contacts').SceneContactData;
  previousJunctionSaveCompatibility?:string;
  previousJunctionNavigation?:import('../scene/ambient-navigation').AmbientGraph;
  previousJunctionContacts?:import('../scene/contacts').SceneContactData;
  previousSpacingSaveCompatibility?:string;
  previousParkSaveCompatibility?:string;
  previousParkNavigation?:AmbientGraph;
  previousCitySaveCompatibility?:string;
  previousCityNavigation?:AmbientGraph;
  previousMatchSaveCompatibility?:string;
  previousBusinessSaveCompatibility?:string;previousSchoolRepairSaveCompatibility?:string;
  previousSocialSaveCompatibility?:string;
  previousShiftSaveCompatibility?:string;
  previousHoursSaveCompatibility?:string;
  previousSeatingSaveCompatibility?:string;
  previousKitchenSaveCompatibility?:string;
  previousMealSaveCompatibility?:string;
  previousProgressSaveCompatibility?:string;
  previousRecipeSaveCompatibility?:string;
  previousEgressSaveCompatibility?:string;
  previousInteriorSaveCompatibility?:string;
  previousInteriorNavigation?:AmbientGraph;
  previousInteriorContacts?:SceneContactData;
  previousVergeNavigation?:AmbientGraph;
  emptyEconomySaveCompatibility?:string;
  previousSaveSource?:string;
  private next=0;
  private pending=new Map<number,{resolve:(packet:ChunkPacket)=>void;reject:(error:Error)=>void}>();
  private queue:{id:number;region?:RenderRegion;topple?:string}[]=[];
  private active:number|undefined;
  private failure:Error|undefined;
  private rejectScene!:(error:Error)=>void;
  constructor(private worker:Worker,onCompile:(ms:number)=>void=()=>{}){
    this.scene=new Promise((resolve,reject)=>{
      this.rejectScene=reject;
      worker.onmessage=({data})=>{
        if(data.error){this.fail(new Error(data.error));return;}
        if(data.scene){this.characterGround=data.characterGround;this.navigation=data.navigation;this.repairNavigation=data.repairNavigation;this.contacts=data.contacts;this.bounds=data.bounds;this.saveCompatibility=data.saveCompatibility;this.previousParkingSaveCompatibility=data.previousParkingSaveCompatibility;this.previousRepairSaveCompatibility=data.previousRepairSaveCompatibility;this.previousSupplySaveCompatibility=data.previousSupplySaveCompatibility;this.previousNetworkSaveCompatibility=data.previousNetworkSaveCompatibility;this.previousPoolSaveCompatibility=data.previousPoolSaveCompatibility;this.previousVergeSaveCompatibility=data.previousVergeSaveCompatibility;this.previousPlantSaveCompatibility=data.previousPlantSaveCompatibility;this.previousFinishSaveCompatibility=data.previousFinishSaveCompatibility;this.previousCourierSaveCompatibility=data.previousCourierSaveCompatibility;this.previousOfficeWorkSaveCompatibility=data.previousOfficeWorkSaveCompatibility;this.previousServiceWorkSaveCompatibility=data.previousServiceWorkSaveCompatibility;this.previousTowerRoomSaveCompatibility=data.previousTowerRoomSaveCompatibility;this.previousTowerRoomContacts=data.previousTowerRoomContacts;this.previousTowerRoomNavigation=data.previousTowerRoomNavigation;this.previousCrowdFlowSaveCompatibility=data.previousCrowdFlowSaveCompatibility;this.previousWalkingLinksSaveCompatibility=data.previousWalkingLinksSaveCompatibility;this.previousCrossingAccessSaveCompatibility=data.previousCrossingAccessSaveCompatibility;this.previousCrossingAccessContacts=data.previousCrossingAccessContacts;this.previousCrossingAccessNavigation=data.previousCrossingAccessNavigation;this.previousStationMaintenanceSaveCompatibility=data.previousStationMaintenanceSaveCompatibility;this.previousDistrictSaveCompatibility=data.previousDistrictSaveCompatibility;this.previousDistrictContacts=data.previousDistrictContacts;this.previousDistrictNavigation=data.previousDistrictNavigation;this.previousUpstairsSocialSaveCompatibility=data.previousUpstairsSocialSaveCompatibility;this.previousSeatedRestSaveCompatibility=data.previousSeatedRestSaveCompatibility;this.previousCompanySaveCompatibility=data.previousCompanySaveCompatibility;this.previousLoftSaveCompatibility=data.previousLoftSaveCompatibility;this.previousLoftContacts=data.previousLoftContacts;this.previousLoftNavigation=data.previousLoftNavigation;this.previousPeerRecipeSaveCompatibility=data.previousPeerRecipeSaveCompatibility;this.previousCompanionSaveCompatibility=data.previousCompanionSaveCompatibility;this.previousGestureSaveCompatibility=data.previousGestureSaveCompatibility;this.previousStationSaveCompatibility=data.previousStationSaveCompatibility;this.previousBondSaveCompatibility=data.previousBondSaveCompatibility;this.previousShelterSaveCompatibility=data.previousShelterSaveCompatibility;this.previousAttendanceSaveCompatibility=data.previousAttendanceSaveCompatibility;this.previousFloorsSaveCompatibility=data.previousFloorsSaveCompatibility;this.previousFloorsContacts=data.previousFloorsContacts;this.previousFloorsNavigation=data.previousFloorsNavigation;this.previousStairsSaveCompatibility=data.previousStairsSaveCompatibility;this.previousStairsContacts=data.previousStairsContacts;this.previousStairsNavigation=data.previousStairsNavigation;this.previousRestSaveCompatibility=data.previousRestSaveCompatibility;this.previousWorkCommuteSaveCompatibility=data.previousWorkCommuteSaveCompatibility;this.previousHomeMealsSaveCompatibility=data.previousHomeMealsSaveCompatibility;this.previousHomeInteriorSaveCompatibility=data.previousHomeInteriorSaveCompatibility;this.previousHomeInteriorNavigation=data.previousHomeInteriorNavigation;this.previousHomeInteriorContacts=data.previousHomeInteriorContacts;this.previousWeatherSaveCompatibility=data.previousWeatherSaveCompatibility;this.previousRationsSaveCompatibility=data.previousRationsSaveCompatibility;this.previousSchoolInteriorSaveCompatibility=data.previousSchoolInteriorSaveCompatibility;this.previousSchoolInteriorNavigation=data.previousSchoolInteriorNavigation;this.previousSchoolInteriorContacts=data.previousSchoolInteriorContacts;this.previousNurserySaveCompatibility=data.previousNurserySaveCompatibility;this.previousHardwareSaveCompatibility=data.previousHardwareSaveCompatibility;this.previousRecoverySaveCompatibility=data.previousRecoverySaveCompatibility;this.previousResidentSupplySaveCompatibility=data.previousResidentSupplySaveCompatibility;this.previousWorkshopSupplySaveCompatibility=data.previousWorkshopSupplySaveCompatibility;this.previousKitProductionSaveCompatibility=data.previousKitProductionSaveCompatibility;this.previousStrikeSaveCompatibility=data.previousStrikeSaveCompatibility;this.previousEquipmentSaveCompatibility=data.previousEquipmentSaveCompatibility;this.previousServiceSaveCompatibility=data.previousServiceSaveCompatibility;this.previousServiceNavigation=data.previousServiceNavigation;this.previousCharactersSaveCompatibility=data.previousCharactersSaveCompatibility;this.previousFixturesSaveCompatibility=data.previousFixturesSaveCompatibility;this.previousWildlifeSaveCompatibility=data.previousWildlifeSaveCompatibility;this.previousWildlifeContacts=data.previousWildlifeContacts;this.previousFurnitureSaveCompatibility=data.previousFurnitureSaveCompatibility;this.previousFurnitureContacts=data.previousFurnitureContacts;this.previousBotanySaveCompatibility=data.previousBotanySaveCompatibility;this.previousBotanyContacts=data.previousBotanyContacts;this.previousCanopySaveCompatibility=data.previousCanopySaveCompatibility;this.previousCanopyContacts=data.previousCanopyContacts;this.previousFleetSaveCompatibility=data.previousFleetSaveCompatibility;this.previousTreeSaveCompatibility=data.previousTreeSaveCompatibility;this.previousCoverageSaveCompatibility=data.previousCoverageSaveCompatibility;this.previousInvitationSaveCompatibility=data.previousInvitationSaveCompatibility;this.previousPeopleSaveCompatibility=data.previousPeopleSaveCompatibility;this.previousPeopleNavigation=data.previousPeopleNavigation;this.previousPeopleContacts=data.previousPeopleContacts;this.previousJunctionSaveCompatibility=data.previousJunctionSaveCompatibility;this.previousJunctionNavigation=data.previousJunctionNavigation;this.previousJunctionContacts=data.previousJunctionContacts;this.previousSpacingSaveCompatibility=data.previousSpacingSaveCompatibility;this.previousParkSaveCompatibility=data.previousParkSaveCompatibility;this.previousParkNavigation=data.previousParkNavigation;this.previousCitySaveCompatibility=data.previousCitySaveCompatibility;this.previousCityNavigation=data.previousCityNavigation;this.previousMatchSaveCompatibility=data.previousMatchSaveCompatibility;this.previousBusinessSaveCompatibility=data.previousBusinessSaveCompatibility;this.previousSchoolRepairSaveCompatibility=data.previousSchoolRepairSaveCompatibility;this.previousSocialSaveCompatibility=data.previousSocialSaveCompatibility;this.previousShiftSaveCompatibility=data.previousShiftSaveCompatibility;this.previousHoursSaveCompatibility=data.previousHoursSaveCompatibility;this.previousSeatingSaveCompatibility=data.previousSeatingSaveCompatibility;this.previousKitchenSaveCompatibility=data.previousKitchenSaveCompatibility;this.previousMealSaveCompatibility=data.previousMealSaveCompatibility;this.previousProgressSaveCompatibility=data.previousProgressSaveCompatibility;this.previousRecipeSaveCompatibility=data.previousRecipeSaveCompatibility;this.previousEgressSaveCompatibility=data.previousEgressSaveCompatibility;this.previousInteriorSaveCompatibility=data.previousInteriorSaveCompatibility;this.previousInteriorNavigation=data.previousInteriorNavigation;this.previousInteriorContacts=data.previousInteriorContacts;this.previousVergeNavigation=data.previousVergeNavigation;this.previousSaveCompatibility=data.previousSaveCompatibility;this.previousMarketSaveCompatibility=data.previousMarketSaveCompatibility;this.emptyEconomySaveCompatibility=data.emptyEconomySaveCompatibility;this.previousSaveSource=data.previousSaveSource;onCompile(data.compileMs);resolve(data.scene);return;}
        if(data.id===this.active)this.active=undefined;
        const pending=this.pending.get(data.id);this.pending.delete(data.id);pending?.resolve(data.packet);this.pump();
      };
    });
    worker.onerror=event=>{event.preventDefault();this.fail(new Error(event.message||'World worker failed'));};
    worker.onmessageerror=()=>this.fail(new Error('World data could not be read'));
  }
  build(region:RenderRegion):Promise<ChunkPacket>{
    return this.request({region});
  }
  topple(objectId:string,signal:AbortSignal):Promise<ChunkPacket>{return this.request({topple:objectId},signal);}
  private request(message:{region?:RenderRegion;topple?:string},signal?:AbortSignal):Promise<ChunkPacket>{
    if(this.failure)return Promise.reject(this.failure);
    if(signal?.aborted)return Promise.reject(new Error('World request cancelled'));
    const id=this.next++;return new Promise((resolve,reject)=>{
      const abort=()=>{this.queue=this.queue.filter(request=>request.id!==id);this.pending.delete(id);reject(new Error('World request cancelled'));};
      const finish=()=>signal?.removeEventListener('abort',abort);
      this.pending.set(id,{resolve:packet=>{finish();resolve(packet);},reject:error=>{finish();reject(error);}});
      signal?.addEventListener('abort',abort,{once:true});this.queue.push({id,...message});this.pump();
    });
  }
  private pump():void{if(this.failure || this.active!==undefined)return;const next=this.queue.shift();if(next){this.active=next.id;try{this.worker.postMessage(next);}catch(error){this.fail(error instanceof Error ? error : new Error(String(error)));}}}
  private fail(error:Error):void{this.failure=error;this.worker.terminate();this.rejectScene(error);this.pending.forEach(p=>p.reject(error));this.pending.clear();this.queue=[];}
  dispose():void{this.fail(new Error('World worker stopped'));}
}
