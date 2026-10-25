import {objectFloor,walkingSupport,type WalkingPoint} from './floors';
import {Vector3,Matrix4,Quaternion,Euler,Ray} from 'three';
import {partGeometry} from './object-geometry';
import type {ObjectDslV2} from './object-dsl';
import {objectPlacement} from './placement';
import {walkingHeight} from './interiors';
import {queryStaticContacts} from './contacts';
import {contactOverlaps} from './contact-geometry';
import {waterAt} from './terrain';
import {roleOf} from './agents';
import type {Scene} from './schema';

export const SEATING_LIMITS=Object.freeze({perObject:4,world:512,supportTolerance:.2,radius:3,height:17.5,reach:12});
export interface SeatRef {objectId:string;seatId:string}
export interface WorldSeat extends SeatRef {x:number;y:number;elevation:number;hipHeight:number;headingRad:number;approach:WalkingPoint}
const cache=new WeakMap<Scene,WorldSeat[]>();
export function worldSeats(scene:Scene):WorldSeat[]{
 let seats=cache.get(scene);if(seats)return seats;
 seats=[];
 for(const o of scene.objects){const spec=o.spec;if(!spec || !('dslVersion' in spec) || spec.dslVersion!==2 || !spec.seats)continue;
  const p=objectPlacement(scene,o),point=(x:number,y:number,z:number)=>new Vector3(x,y,z).multiplyScalar(o.scale).applyQuaternion(p.rotation).add(new Vector3(o.x,p.base,o.y));
  for(const s of spec.seats){const at=point(...s.position),approach=point(s.approach[0],0,s.approach[1]),elevation=objectFloor(scene,o)?.elevation??walkingHeight(scene,at.x,at.z,3);
   seats.push({objectId:o.id,seatId:s.id,x:at.x,y:at.z,elevation,hipHeight:at.y-elevation,headingRad:(o.headingRad??0)+s.headingRad,approach:{x:approach.x,y:approach.z,...(o.floor ? {elevation} : {})}});
  }
 }
 cache.set(scene,seats);return seats;
}
export const sameSeat=(a:SeatRef|undefined,b:SeatRef|undefined)=>!!a && !!b && a.objectId===b.objectId && a.seatId===b.seatId;
export const findSeat=(scene:Scene,ref:SeatRef|undefined)=>ref && worldSeats(scene).find(s=>sameSeat(s,ref));
/** The furniture itself is the only solid omitted from its short authored transfer. */
export function seatAccessClear(scene:Scene,seat:WorldSeat,broken:readonly string[]=[],profile:{radius:number;height:number}={radius:SEATING_LIMITS.radius,height:SEATING_LIMITS.height}):boolean{
 const {radius,height}=profile;
 if(broken.includes(seat.objectId))return false;
 const distance=Math.hypot(seat.x-seat.approach.x,seat.y-seat.approach.y);if(distance<6 || distance>40 || seat.hipHeight<3 || seat.hipHeight>9)return false;
 const steps=Math.ceil(distance/2);let previous=seat.approach.elevation===undefined ? walkingHeight(scene,seat.approach.x,seat.approach.y,radius) : walkingSupport(scene,seat.approach.x,seat.approach.y,seat.elevation,radius,4,seat.objectId,broken);
 for(let i=0;i<=steps;i++){
  const t=i/steps,x=seat.approach.x+(seat.x-seat.approach.x)*t,y=seat.approach.y+(seat.y-seat.approach.y)*t,elevation=seat.approach.elevation===undefined ? walkingHeight(scene,x,y,radius) : walkingSupport(scene,x,y,previous,radius,4,seat.objectId,broken);
  if(x<radius || y<radius || x>scene.canonical.width-radius || y>scene.canonical.height-radius || Math.abs(elevation-previous)>4 || waterAt(scene.terrain,x,y,elevation))return false;
  for(let side=0;side<8;side++){const px=x+Math.cos(side*Math.PI/4)*radius,py=y+Math.sin(side*Math.PI/4)*radius;if(waterAt(scene.terrain,px,py,walkingHeight(scene,px,py,0)))return false;}
  if(queryStaticContacts(scene,x,y,radius).some(c=>(i===0 || c.id!==seat.objectId) && (!c.id || !broken.includes(c.id)) && elevation<c.top-.05 && elevation+height>c.bottom+.05 && contactOverlaps(c,x,y,radius)))return false;
  previous=elevation;
 }
 return true;
}
export function supportedObjectPoint(spec:ObjectDslV2,point:[number,number,number],tolerance:number):boolean{
 const origin=new Vector3(...point).add(new Vector3(0,tolerance,0)),hit=new Vector3(),a=new Vector3(),b=new Vector3(),c=new Vector3();
 for(const part of spec.parts){
  const transform=new Matrix4().compose(new Vector3(...part.position),new Quaternion().setFromEuler(new Euler(...(part.rotation??[0,0,0]))),new Vector3(...part.size));
  const ray=new Ray(origin.clone(),new Vector3(0,-1,0)).applyMatrix4(transform.clone().invert()),g=partGeometry(part),position=g.getAttribute('position'),index=g.index;
  let supported=false;
  for(let i=0;i<(index?.count??position.count);i+=3){a.fromBufferAttribute(position,index ? index.getX(i) : i);b.fromBufferAttribute(position,index ? index.getX(i+1) : i+1);c.fromBufferAttribute(position,index ? index.getX(i+2) : i+2);if(ray.intersectTriangle(a,b,c,false,hit) && Math.abs(hit.applyMatrix4(transform).y-point[1])<tolerance){supported=true;break;}}
  g.dispose();if(supported)return true;
 }
 return false;
}
export function seatingProblems(scene:Scene):string[]{
 if(scene.objects.reduce((n,o)=>n+(o.spec && 'seats' in o.spec ? o.spec.seats?.length??0 : 0),0)>SEATING_LIMITS.world)return ['world seat budget exceeds 512'];
 const seats=worldSeats(scene),problems:string[]=[],support=new Map<string,boolean>();
 for(const o of scene.objects)if(o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.seats && (roleOf(o)!=='prop' || o.route || o.behavior))problems.push(`${o.id}: furniture seats require prop ownership without a route or program`);
 for(let i=0;i<seats.length;i++)if(seats.slice(0,i).some(s=>Math.hypot(seats[i]!.x-s.x,seats[i]!.y-s.y,seats[i]!.elevation-s.elevation)<6 || Math.hypot(seats[i]!.approach.x-s.approach.x,seats[i]!.approach.y-s.approach.y,seats[i]!.elevation-s.elevation)<6))problems.push(`${seats[i]!.objectId}/${seats[i]!.seatId}: seats and approaches need 6-unit separation`);
 for(const o of scene.objects){const spec=o.spec;if(!spec || !('dslVersion' in spec) || spec.dslVersion!==2 || !spec.seats)continue;for(const s of spec.seats){const key=JSON.stringify([spec,s.id,o.scale]);let valid=support.get(key);if(valid===undefined){valid=supportedObjectPoint(spec,s.position,SEATING_LIMITS.supportTolerance/o.scale);support.set(key,valid);}if(!valid)problems.push(`${o.id}/${s.id}: sitting surface needs furniture geometry at the authored point`);}}
 for(const s of seats)if(!seatAccessClear(scene,s))problems.push(`${s.objectId}/${s.seatId}: seat needs a dry clear approach 6..40 units away and a sitting height of 3..9 units`);
 return problems;
}
