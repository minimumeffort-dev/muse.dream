import {occupiedInterior,walkingHeight} from '../scene/interiors';
import {queryStaticContacts} from '../scene/contacts';
import {contactSeparation} from '../scene/contact-geometry';
import type {Scene} from '../scene/schema';
import type {WalkingPoint} from '../scene/floors';
import type {CarState} from './car';
import {isBroken} from './impacts';

/** A whole standing footprint under a retained interior ceiling, using ordinary collision data. */
export function sheltered(scene:Scene,p:WalkingPoint,radius:number,height:number,state?:CarState):boolean{
 const elevation=p.elevation??walkingHeight(scene,p.x,p.y),room=occupiedInterior(scene,p.x,p.y,elevation);
 return !!room && room.contains(p.x,p.y,radius) && queryStaticContacts(scene,p.x,p.y,radius,state).some(c=>c.id===room.object.id && !c.zoneId && (!state || !isBroken(state,c)) && c.bottom>=elevation+height-.05 && contactSeparation(c,p.x,p.y).distance<=-radius+.001);
}
