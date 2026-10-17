import {decodeSave,encodeSave,MAX_SAVE_CHARACTERS} from '../sim/save';
import type {CarState,World} from '../sim/car';

type Snapshot={state:CarState;worldTime:number};

/** File reads only preview. The explicit Restore action owns the storage/session change. */
export function saveTools(world:World,current:()=>Snapshot,persist:(snapshot:Snapshot)=>boolean,apply:(snapshot:Snapshot)=>void){
 const tools=document.querySelector<HTMLDetailsElement>('#save-tools')!,menu=document.querySelector<HTMLDialogElement>('#pause-menu')!;
 const download=document.querySelector<HTMLAnchorElement>('#export-save')!,open=document.querySelector<HTMLButtonElement>('#open-save')!,file=document.querySelector<HTMLInputElement>('#import-save')!;
 const preview=document.querySelector<HTMLElement>('#save-preview')!,summary=document.querySelector<HTMLElement>('#backup-summary')!,status=document.querySelector<HTMLElement>('#backup-status')!,restore=document.querySelector<HTMLButtonElement>('#restore-save')!;
 let url:string|undefined,request=0,candidate:ReturnType<typeof decodeSave>|undefined;
 const invalidate=()=>{request++;candidate=undefined;preview.hidden=true;file.value='';status.textContent='';};
 const release=()=>{if(url)URL.revokeObjectURL(url);url=undefined;download.removeAttribute('href');};
 tools.addEventListener('toggle',()=>{
  release();if(!tools.open)return;
  try{const snapshot=current(),text=encodeSave(snapshot.state,snapshot.worldTime,world);url=URL.createObjectURL(new Blob([text],{type:'application/json'}));download.href=url;download.download=`muse-dream-${world.scene.sourceHash.slice(0,12)}-${Math.floor(snapshot.state.timeS)}s.json`;}
  catch{status.textContent='Could not prepare a backup. Your current progress has not changed.';}
 });
 open.addEventListener('click',()=>file.click());
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];invalidate();if(!selected)return;const token=request;
  try{
   if(selected.size>MAX_SAVE_CHARACTERS*4)throw Error('This backup is too large.');
   status.textContent='Checking backup…';const text=await selected.text();if(token!==request || !menu.open)return;
   candidate=decodeSave(text,world);const state=candidate.state,people=state.npcs.filter(n=>n.known).length;
   const control=state.control.kind==='foot' ? 'On foot' : state.control.kind==='car' ? 'Driving' : state.control.kind==='passenger' ? 'Passenger' : 'Riding';
   summary.textContent=`${control} · ${Math.floor(state.timeS/60)} min played · ${people} ${people===1 ? 'person' : 'people'} met · ${state.broken.length+state.brokenZones.length} damaged objects or sections. ${candidate.compatible ? 'Compatible world update.' : 'Same world source.'}`;
   status.textContent='';preview.hidden=false;
  }catch(error){if(token!==request || !menu.open)return;candidate=undefined;status.textContent=`${error instanceof Error ? error.message : 'Could not read this backup.'} Your current progress has not changed.`;}
 });
 document.querySelector('#cancel-restore')!.addEventListener('click',()=>{invalidate();open.focus({preventScroll:true});});
 restore.addEventListener('click',()=>{
  if(!candidate || !menu.open)return;const snapshot=candidate;
  if(!persist(snapshot)){status.textContent='Could not save the backup on this device. Your current session has not changed.';return;}
  apply(snapshot);invalidate();tools.open=false;release();document.querySelector<HTMLButtonElement>('#save-game')!.focus({preventScroll:true});
 });
 const close=()=>{invalidate();tools.open=false;release();};
 addEventListener('pagehide',close);
 return {close};
}
