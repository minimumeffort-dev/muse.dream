import type {Scene} from '../scene/schema';
import type {CarState} from './car';
import {queryStaticContacts} from '../scene/contacts';
import {standingSightClear} from '../scene/contact-geometry';
import {isBroken} from './impacts';
type Pose={x:number;y:number;elevation:number};
/** Conversation and transactions share a clear standing-height reach through actual contacts. */
export function interactionSight(scene:Scene,a:Pose,b:Pose,state:CarState,ownerId?:string):boolean{
 const length=Math.hypot(b.x-a.x,b.y-a.y);
 return standingSightClear(queryStaticContacts(scene,(a.x+b.x)/2,(a.y+b.y)/2,length/2+.5,state),a,b,c=>!!ownerId && c.id===ownerId || isBroken(state,c));
}
