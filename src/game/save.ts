import {encodeSave,decodeSave,SAVE_VERSION} from '../sim/save';
import type {CarState,World} from '../sim/car';

/** One atomic, source-pinned local slot. Failed/corrupt saves are never silently overwritten. */
export function gameSave(world:World,getStorage:()=>Pick<Storage,'getItem'|'setItem'>=()=>localStorage,prefix='muse-dream.save'){
 const key=`${prefix}.v${SAVE_VERSION}.${world.scene.sceneId}.${world.scene.sourceHash}`;
 let lastSeen:string|null=null,characters=0,status='Progress saves on this device.',blocked=false,restored:ReturnType<typeof decodeSave>|undefined;
 try{const text=getStorage().getItem(key);lastSeen=text;if(text!==null){restored=decodeSave(text,world);status='Restored your saved world.';}}
 catch{status='Could not restore saved progress. Save current session to replace it, or keep playing without saving.';blocked=true;}
 return {key,restored,get blocked(){return blocked;},get characters(){return characters;},get status(){return status;},write(state:CarState,worldTime:number,replace=false){
  if(blocked && !replace)return false;
  try{const text=encodeSave(state,worldTime,world);const storage=getStorage();
   if(!replace && storage.getItem(key)!==lastSeen){blocked=true;status='Another tab changed this saved world. Reload, or save this session to replace it.';return false;}
   storage.setItem(key,text);lastSeen=text;characters=text.length;blocked=false;status='Saved on this device.';return true;}
  catch{status='Could not save on this device. Keep this tab open.';return false;}
 }};
}
