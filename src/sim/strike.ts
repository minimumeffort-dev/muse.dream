import {roleOf} from '../scene/agents';
import type {CarInput,CarState,World} from './car';
import {impactOf,zonesOf} from '../scene/object-dsl';
import {sceneContacts,queryStaticContacts,type Contact} from '../scene/contacts';
import {contactSeparation,segmentContactDistance} from '../scene/contact-geometry';
import {objectPlacement} from '../scene/placement';
import {objectRadius,objectHeight} from './archetypes';
import {STRIKE_LIMITS} from '../scene/strike';
import {waterAt} from '../scene/terrain';
import {activeSport} from './sports';
import {breakOnContact,bounceOnContact,constrainBounce,capBounceSpeed,isBroken} from './impacts';

export interface StrikeTarget {id:string;label:string;contact:Contact;prop?:CarState['props'][number];x:number;y:number;height:number;distance:number}
function standing(state:CarState,world:World):boolean{
 return !!world.scene.strike && state.control.kind==='foot' && !state.seated && state.grounded && !activeSport(state,world.scene) && !waterAt(world.scene.terrain,state.x,state.y,state.elevation);
}
/** Exact nearest boundary, one forward target, with real vertical reach and intervening walls. */
export function strikeTarget(state:CarState,world:World):StrikeTarget|undefined{
 if(!standing(state,world))return;
 const scene=world.scene,objects=sceneContacts(scene).objects,reach=scene.strike!.reach,candidates:StrikeTarget[]=[];
 const consider=(contact:Contact,prop?:CarState['props'][number])=>{
  if(!contact.id || isBroken(state,contact) || contact.top<=state.elevation+2 || contact.bottom>=state.elevation+15)return;
  const object=objects.get(contact.id)!;if(roleOf(object)!=='prop')return;
  const impact=contact.zoneId ? zonesOf(object.spec).find(z=>z.id===contact.zoneId)?.impact : impactOf(object.spec);
  if(!impact || !!prop!==(impact.kind==='bounce'))return;
  const {distance,nx,ny}=contactSeparation(contact,state.x,state.y);
  if(distance<0 || distance>reach || -nx*Math.cos(state.headingRad)-ny*Math.sin(state.headingRad)<.5)return;
  const x=state.x-nx*(distance-.75),y=state.y-ny*(distance-.75),height=Math.min(contact.top-.1,Math.max(contact.bottom+.1,state.elevation+10));
  const blocked=queryStaticContacts(scene,(state.x+x)/2,(state.y+y)/2,reach/2+1,state).some(c=>
   !(c.id===contact.id && c.zoneId===contact.zoneId) && !isBroken(state,c) && c.bottom<height && c.top>height && segmentContactDistance(c,state,{x,y})<STRIKE_LIMITS.handRadius);
  if(!blocked)candidates.push({id:object.id,label:object.labelText,contact,prop,x,y,height,distance});
 };
 for(const contact of queryStaticContacts(scene,state.x,state.y,reach,state))consider(contact);
 for(const prop of state.props){if(scene.sports.some(s=>s.ballId===prop.id))continue;const object=objects.get(prop.id)!;const bottom=prop.elevation??objectPlacement(scene,object,prop.x,prop.y).base;consider({id:prop.id,x:prop.x,y:prop.y,r:objectRadius(object),bottom,top:bottom+objectHeight(object)},prop);}
 return candidates.sort((a,b)=>a.distance-b.distance || (a.id<b.id ? -1 : a.id>b.id ? 1 : (a.contact.zoneId??'')<(b.contact.zoneId??'') ? -1 : (a.contact.zoneId??'')>(b.contact.zoneId??'') ? 1 : 0))[0];
}
export function stepStrike(state:CarState,input:CarInput,world:World):CarState{
 if(!input.strikePressed || state.timeS+1e-8<(state.strikeReadyAtS??0))return state;
 const target=strikeTarget(state,world);if(!target)return state;
 const config=world.scene.strike!,dx=target.contact.x-target.x,dy=target.contact.y-target.y,d=Math.hypot(dx,dy)||1;
 const hand:CarState={...state,x:target.x,y:target.y,elevation:target.height-.5,vx:dx/d*config.speed,vy:dy/d*config.speed,debris:[...state.debris],impacts:[...state.impacts]};
 const body={...world,carRadius:STRIKE_LIMITS.handRadius,bodyHeight:1};
 const prop=target.prop ? {...target.prop} : undefined;
 if(prop){const object=sceneContacts(world.scene).objects.get(target.id)!;bounceOnContact(hand,body,prop,object);capBounceSpeed(prop);constrainBounce(hand,body,prop,object);}
 else breakOnContact(hand,body,target.x+dx/d*.5,target.y+dy/d*.5,[target.contact]);
 return {...state,strikeReadyAtS:state.timeS+config.cooldownS,broken:hand.broken,brokenZones:hand.brokenZones,debris:hand.debris,...(hand.growing ? {growing:hand.growing} : {}),props:prop ? state.props.map(p=>p.id===prop.id ? prop : p) : state.props,impacts:hand.impacts};
}
