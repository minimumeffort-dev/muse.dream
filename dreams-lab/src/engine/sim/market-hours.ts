import {dayHour} from '../scene/daylight';
import type {Scene} from '../scene/schema';
import type {Market} from '../scene/commerce';
import type {EconomyState} from './commerce';

/** Economic hours follow simulation time; reduced motion freezes only the sky. */
export function marketIsOpen(scene:Pick<Scene,'daylight'>,market:Pick<Market,'hours'>,timeS:number):boolean{
 if(!market.hours)return true;
 const [start,end]=market.hours,hour=dayHour(scene.daylight!,timeS);
 return end>start ? hour>=start && hour<end : hour>=start || hour<end;
}
export function marketOpening(scene:Pick<Scene,'daylight'>,market:Pick<Market,'hours'>,timeS:number){
 if(!market.hours || marketIsOpen(scene,market,timeS))return;
 const hour=dayHour(scene.daylight!,timeS),[start]=market.hours;
 return {hour:start,seconds:((start-hour+24)%24)/24*scene.daylight!.cycleSeconds};
}
export function marketIsStaffed(scene:Pick<Scene,'economy'>,market:Pick<Market,'actor'>,state:Pick<EconomyState,'accounts'|'shared'|'gathering'>|undefined):boolean{
 const staff=scene.economy?.accounts.find(a=>a.actor===market.actor);
 return (!state?.gathering || state.gathering.host!==staff?.id && state.gathering.guest!==staff?.id) && (!state?.shared || state.shared.partner!==staff?.id) && (!staff?.shift || !state?.accounts.find(a=>a.id===staff.id)?.shift);
}
