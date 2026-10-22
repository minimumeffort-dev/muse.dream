import type {CarState} from './car';
import type {Scene} from '../scene/schema';
import {repairTargets,repairApproach,repairClear,repairNetwork,repairPath} from './repair';
import {cityJourneys} from './city-upgrade';
/** Registered r97→r98 layout change: keep escrow and progress while moving the table's service approach. */
export function stairsUpgrade(state:CarState,scene:Scene):CarState{
 if(!state.economy || !scene.economy)return state;
 const accounts=state.economy.accounts.map(a=>{
  const t=a.repair;if(!t || t.objectId!=='home_table')return a;
  const plan=scene.economy!.repairs.find(r=>r.id===t.id)!,target=repairTargets(scene,plan).find(r=>r.objectId===t.objectId && r.zoneId===t.zoneId)!,owner=scene.economy!.accounts.find(d=>d.id===a.id)!;
  const starts=owner.actor==='player' ? [state] : repairClear(scene,plan,t) ? [t] : repairNetwork(scene,plan).filter(p=>p.links.length && repairClear(scene,plan,p) && Math.hypot(p.x-t.x,p.y-t.y)<=128).sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y)).slice(0,32);
  for(const start of starts){
   const approach=repairApproach(scene,plan,target,start);if(!approach)continue;
   if(owner.actor==='player')return {...a,repair:{...t,at:approach.end}};
   const path=t.phase==='home' ? repairPath(scene,plan,start,scene.objects.find(o=>o.id===owner.actor)!) : approach.path;
   if(path)return {...a,repair:{...t,x:start.x,y:start.y,at:approach.end,path,speed:0,...(t.phase==='work' ? {phase:'out' as const} : {})}};
  }
  throw Error('This update cannot preserve the saved home-table repair.');
 });
 return cityJourneys({...state,economy:{...state.economy,accounts}},scene);
}
