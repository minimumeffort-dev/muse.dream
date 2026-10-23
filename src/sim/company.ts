import type {Scene} from '../scene/schema';
import type {CarState} from './car';
import {dayHour} from '../scene/daylight';
import {marketIsOpen} from './market-hours';

/** Company is a bounded game need, not a psychological model or pair relationship. */
export function stepCompanyNeeds(state:CarState,dt:number,scene:Scene):void{
 for(const a of state.economy!.accounts){const need=scene.economy!.accounts.find(s=>s.id===a.id)!.company;if(need)a.company=Math.max(0,a.company!-dt*need.drainPerS);}
}
export function wantsCompany(state:CarState,scene:Scene,id:string):boolean{
 const need=scene.economy!.accounts.find(a=>a.id===id)!.company;return !need || state.economy!.accounts.find(a=>a.id===id)!.company!<=need.below;
}
/** Stock a future break before its supply counter closes, using ordinary finite trade. */
export function companyShoppingDue(state:CarState,scene:Scene,id:string):boolean{
 if(wantsCompany(state,scene,id))return true;
 const d=scene.economy!,spec=d.accounts.find(a=>a.id===id)!,need=spec.company!,a=state.economy!.accounts.find(a=>a.id===id)!,plan=d.socials.find(p=>p.id===spec.social);
 return !!scene.daylight && !!need.drainPerS && !!plan?.markets?.some(id=>{const market=d.markets.find(m=>m.id===id)!;if(!market.hours || market.hours[1]-market.hours[0]===24 || !marketIsOpen(scene,market,state.timeS))return false;const hours=(market.hours[0]-dayHour(scene.daylight!,state.timeS)+24)%24||24;return a.company!-hours/24*scene.daylight!.cycleSeconds*need.drainPerS<=need.below;});
}
/** Completion restores only the actual participants, once, through the shared meal owner. */
export function restoreCompany(state:CarState,scene:Scene,ids:readonly string[]):void{
 for(const id of ids){const need=scene.economy!.accounts.find(a=>a.id===id)!.company;if(need){const a=state.economy!.accounts.find(a=>a.id===id)!;a.company=Math.min(100,a.company!+need.gain);}}
}
export function checkCompanyState(state:CarState,scene:Scene):void{
 for(const a of state.economy!.accounts){const need=scene.economy!.accounts.find(s=>s.id===a.id)!.company;if(need ? a.company===undefined : a.company!==undefined)throw Error('Invalid saved company owner');}
}
