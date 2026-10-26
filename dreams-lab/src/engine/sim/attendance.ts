import {dayHour} from '../scene/daylight';
import type {Scene} from '../scene/schema';
import {marketIsOpen} from './market-hours';
/** A workday is pinned to its actual departure, so a delayed return cannot roll into tomorrow's shift. */
export function attendanceEnd(scene:Pick<Scene,'daylight'>,hours:[number,number],departedAtS:number):number{
 const remaining=(hours[1]-dayHour(scene.daylight!,departedAtS)+24)%24;
 return departedAtS+(remaining || 24)/24*scene.daylight!.cycleSeconds;
}
export const attendanceOpen=(scene:Pick<Scene,'daylight'>,hours:[number,number],timeS:number)=>marketIsOpen(scene,{hours},timeS);
