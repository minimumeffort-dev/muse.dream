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
        if(data.scene){this.characterGround=data.characterGround;this.navigation=data.navigation;this.repairNavigation=data.repairNavigation;this.contacts=data.contacts;this.bounds=data.bounds;this.saveCompatibility=data.saveCompatibility;this.previousParkingSaveCompatibility=data.previousParkingSaveCompatibility;this.previousRepairSaveCompatibility=data.previousRepairSaveCompatibility;this.previousSupplySaveCompatibility=data.previousSupplySaveCompatibility;this.previousNetworkSaveCompatibility=data.previousNetworkSaveCompatibility;this.previousPoolSaveCompatibility=data.previousPoolSaveCompatibility;this.previousVergeSaveCompatibility=data.previousVergeSaveCompatibility;this.previousPlantSaveCompatibility=data.previousPlantSaveCompatibility;this.previousFinishSaveCompatibility=data.previousFinishSaveCompatibility;this.previousCourierSaveCompatibility=data.previousCourierSaveCompatibility;this.previousCharactersSaveCompatibility=data.previousCharactersSaveCompatibility;this.previousFixturesSaveCompatibility=data.previousFixturesSaveCompatibility;this.previousWildlifeSaveCompatibility=data.previousWildlifeSaveCompatibility;this.previousWildlifeContacts=data.previousWildlifeContacts;this.previousFurnitureSaveCompatibility=data.previousFurnitureSaveCompatibility;this.previousFurnitureContacts=data.previousFurnitureContacts;this.previousBotanySaveCompatibility=data.previousBotanySaveCompatibility;this.previousBotanyContacts=data.previousBotanyContacts;this.previousCanopySaveCompatibility=data.previousCanopySaveCompatibility;this.previousCanopyContacts=data.previousCanopyContacts;this.previousFleetSaveCompatibility=data.previousFleetSaveCompatibility;this.previousTreeSaveCompatibility=data.previousTreeSaveCompatibility;this.previousCoverageSaveCompatibility=data.previousCoverageSaveCompatibility;this.previousInvitationSaveCompatibility=data.previousInvitationSaveCompatibility;this.previousPeopleSaveCompatibility=data.previousPeopleSaveCompatibility;this.previousPeopleNavigation=data.previousPeopleNavigation;this.previousPeopleContacts=data.previousPeopleContacts;this.previousJunctionSaveCompatibility=data.previousJunctionSaveCompatibility;this.previousJunctionNavigation=data.previousJunctionNavigation;this.previousJunctionContacts=data.previousJunctionContacts;this.previousSpacingSaveCompatibility=data.previousSpacingSaveCompatibility;this.previousParkSaveCompatibility=data.previousParkSaveCompatibility;this.previousParkNavigation=data.previousParkNavigation;this.previousCitySaveCompatibility=data.previousCitySaveCompatibility;this.previousCityNavigation=data.previousCityNavigation;this.previousMatchSaveCompatibility=data.previousMatchSaveCompatibility;this.previousBusinessSaveCompatibility=data.previousBusinessSaveCompatibility;this.previousSchoolRepairSaveCompatibility=data.previousSchoolRepairSaveCompatibility;this.previousSocialSaveCompatibility=data.previousSocialSaveCompatibility;this.previousShiftSaveCompatibility=data.previousShiftSaveCompatibility;this.previousHoursSaveCompatibility=data.previousHoursSaveCompatibility;this.previousSeatingSaveCompatibility=data.previousSeatingSaveCompatibility;this.previousKitchenSaveCompatibility=data.previousKitchenSaveCompatibility;this.previousMealSaveCompatibility=data.previousMealSaveCompatibility;this.previousProgressSaveCompatibility=data.previousProgressSaveCompatibility;this.previousRecipeSaveCompatibility=data.previousRecipeSaveCompatibility;this.previousEgressSaveCompatibility=data.previousEgressSaveCompatibility;this.previousInteriorSaveCompatibility=data.previousInteriorSaveCompatibility;this.previousInteriorNavigation=data.previousInteriorNavigation;this.previousInteriorContacts=data.previousInteriorContacts;this.previousVergeNavigation=data.previousVergeNavigation;this.previousSaveCompatibility=data.previousSaveCompatibility;this.previousMarketSaveCompatibility=data.previousMarketSaveCompatibility;this.emptyEconomySaveCompatibility=data.emptyEconomySaveCompatibility;this.previousSaveSource=data.previousSaveSource;onCompile(data.compileMs);resolve(data.scene);return;}
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
