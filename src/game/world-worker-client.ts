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
  private failure:Error|undefined;
  private rejectScene!:(error:Error)=>void;
  constructor(private worker:Worker,onCompile:(ms:number)=>void=()=>{}){
    this.scene=new Promise((resolve,reject)=>{
      this.rejectScene=reject;
      worker.onmessage=({data})=>{
        if(data.error){this.fail(new Error(data.error));return;}
        if(data.scene){this.navigation=data.navigation;this.repairNavigation=data.repairNavigation;this.contacts=data.contacts;this.bounds=data.bounds;this.saveCompatibility=data.saveCompatibility;this.previousParkingSaveCompatibility=data.previousParkingSaveCompatibility;this.previousRepairSaveCompatibility=data.previousRepairSaveCompatibility;this.previousSupplySaveCompatibility=data.previousSupplySaveCompatibility;this.previousNetworkSaveCompatibility=data.previousNetworkSaveCompatibility;this.previousPoolSaveCompatibility=data.previousPoolSaveCompatibility;this.previousVergeSaveCompatibility=data.previousVergeSaveCompatibility;this.previousPlantSaveCompatibility=data.previousPlantSaveCompatibility;this.previousFinishSaveCompatibility=data.previousFinishSaveCompatibility;this.previousCourierSaveCompatibility=data.previousCourierSaveCompatibility;this.previousInvitationSaveCompatibility=data.previousInvitationSaveCompatibility;this.previousPeopleSaveCompatibility=data.previousPeopleSaveCompatibility;this.previousPeopleNavigation=data.previousPeopleNavigation;this.previousPeopleContacts=data.previousPeopleContacts;this.previousJunctionSaveCompatibility=data.previousJunctionSaveCompatibility;this.previousJunctionNavigation=data.previousJunctionNavigation;this.previousJunctionContacts=data.previousJunctionContacts;this.previousSpacingSaveCompatibility=data.previousSpacingSaveCompatibility;this.previousParkSaveCompatibility=data.previousParkSaveCompatibility;this.previousParkNavigation=data.previousParkNavigation;this.previousCitySaveCompatibility=data.previousCitySaveCompatibility;this.previousCityNavigation=data.previousCityNavigation;this.previousMatchSaveCompatibility=data.previousMatchSaveCompatibility;this.previousBusinessSaveCompatibility=data.previousBusinessSaveCompatibility;this.previousSchoolRepairSaveCompatibility=data.previousSchoolRepairSaveCompatibility;this.previousSocialSaveCompatibility=data.previousSocialSaveCompatibility;this.previousShiftSaveCompatibility=data.previousShiftSaveCompatibility;this.previousHoursSaveCompatibility=data.previousHoursSaveCompatibility;this.previousSeatingSaveCompatibility=data.previousSeatingSaveCompatibility;this.previousKitchenSaveCompatibility=data.previousKitchenSaveCompatibility;this.previousMealSaveCompatibility=data.previousMealSaveCompatibility;this.previousProgressSaveCompatibility=data.previousProgressSaveCompatibility;this.previousRecipeSaveCompatibility=data.previousRecipeSaveCompatibility;this.previousEgressSaveCompatibility=data.previousEgressSaveCompatibility;this.previousInteriorSaveCompatibility=data.previousInteriorSaveCompatibility;this.previousInteriorNavigation=data.previousInteriorNavigation;this.previousInteriorContacts=data.previousInteriorContacts;this.previousVergeNavigation=data.previousVergeNavigation;this.previousSaveCompatibility=data.previousSaveCompatibility;this.previousMarketSaveCompatibility=data.previousMarketSaveCompatibility;this.emptyEconomySaveCompatibility=data.emptyEconomySaveCompatibility;this.previousSaveSource=data.previousSaveSource;onCompile(data.compileMs);resolve(data.scene);return;}
        const pending=this.pending.get(data.id);if(!pending)return;this.pending.delete(data.id);pending.resolve(data.packet);
      };
    });
    worker.onerror=event=>{event.preventDefault();this.fail(new Error(event.message||'World worker failed'));};
    worker.onmessageerror=()=>this.fail(new Error('World data could not be read'));
  }
  build(region:RenderRegion):Promise<ChunkPacket>{
    if(this.failure)return Promise.reject(this.failure);
    const id=this.next++;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker.postMessage({id,region});});
  }
  private fail(error:Error):void{this.failure=error;this.worker.terminate();this.rejectScene(error);this.pending.forEach(p=>p.reject(error));this.pending.clear();}
  dispose():void{this.fail(new Error('World worker stopped'));}
}
