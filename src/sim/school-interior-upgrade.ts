import type {CarState} from './car';
import type {Scene,Point} from '../scene/schema';
import {shiftArea} from './shifts';
import {socialArea} from './social';
import {workPath} from './work-navigation';

/** r90→r91: keep the visible journey, retargeting only the teacher's changed break destination. */
export function schoolInteriorUpgrade(state:CarState,scene:Scene):CarState{
 const e=state.economy!,account=scene.economy!.accounts.find(a=>a.shift==='school_day')!,plan=scene.economy!.shifts.find(s=>s.id===account.shift)!;
 const shared=e.shared?.partner===account.id ? e.shared : undefined;
 const path=(from:Point,to:Point,area:ReturnType<typeof shiftArea>)=>{
  // Restore a valid route even when a parked vehicle temporarily blocks it; movement waits normally.
  const route=workPath(scene,area,from,to);
  if(!route)throw Error('This update cannot preserve the school break journey.');
  return route;
 };
 const zero={classroom_furniture:0},accounts=e.accounts.map(a=>{
  let shift=a.shift;
  if(a.id===account.id && shift && shift.phase!=='in'){
   shift=shared ? {...shift,phase:'rest',...plan.rest,at:{...plan.rest},path:[],speed:0}
    : {...shift,phase:'out',at:{...plan.rest},path:path(shift,plan.rest,shiftArea(scene,plan)),speed:0};
  }
  return {...a,shift,completed:{...a.completed,repair:{...a.completed.repair,...zero}}};
 });
 return {...state,economy:{...e,accounts,repaired:{...e.repaired,...zero},recovered:{...e.recovered,...zero},unattributed:{...e.unattributed,repair:{...e.unattributed.repair,...zero}},
  ...(shared ? {shared:{...shared,home:{...plan.rest},...(shared.phase==='home' ? {at:{...plan.rest},path:path(shared,plan.rest,socialArea(scene,account.id))} : {})}} : {}),
  ...(e.invitation?.partner===account.id ? {invitation:undefined} : {})}};
}
