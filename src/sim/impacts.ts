import {growthScale} from '../scene/growth';
import {DAMAGE_POOL_LIMITS} from '../scene/damage-pool';
import { playerHeight } from "../scene/measure";
import { Euler,Quaternion,Vector3 } from "three";
import type { CarState,World } from "./car";
import { impactOf,zonesOf,type ObjectDslV2 } from "../scene/object-dsl";
import { objectFragments } from "../scene/fragments";
import { objectPlacement } from "../scene/placement";
import { drivingHeight } from "../scene/terrain";
import { sceneContacts,queryStaticContacts,type Contact } from "../scene/contacts";
import { archetypeOf,objectHeight,objectRadius } from "./archetypes";
import { objectSupport } from "../scene/object-support";
import { actorContacts } from "./actors";

export interface DebrisState {
  objectId:string;fragmentId:string;x:number;y:number;elevation:number;vx:number;vy:number;vz:number;
  sizeScale?:number;
  pattern?:"scatter"|"splinter"|"crumble";
  topple?:{pivot:[number,number,number];offset:[number,number,number];axis:[number,number,number];rest:[number,number,number,number];duration:number;angle:number};
  rotation:[number,number,number,number];spin:[number,number,number];age:number;lifetime:number;settled:boolean;
}
export interface ImpactEvent {id:string;kind:"bounce"|"break"|"topple";pattern?:"scatter"|"splinter"|"crumble";zoneId?:string;x:number;y:number;elevation:number;speed:number}
export function isBroken(state:CarState,contact:Contact){return !!contact.id && (contact.zoneId ? state.brokenZones.some(z=>z.objectId===contact.id && z.zoneId===contact.zoneId) : state.broken.includes(contact.id));}

/** Closing speed, not tangential speed, decides whether an impact breaks an assembly. */
export function breakOnContact(state:CarState,world:World,x:number,y:number,contacts:Contact[]):void {
  for(const contact of contacts){
    if(!contact.id || isBroken(state,contact))continue;
    const object=sceneContacts(world.scene).objects.get(contact.id);if(!object)continue;
    const impact=contact.zoneId ? zonesOf(object.spec).find(z=>z.id===contact.zoneId)!.impact : impactOf(object.spec);if(!impact || impact.kind==="bounce")continue;
    const dx=contact.x-state.x,dy=contact.y-state.y,d=Math.hypot(dx,dy)||1;
    const speed=(state.vx*dx+state.vy*dy)/d,height=world.bodyHeight??playerHeight(world.scene);
    if(speed<impact.speed || state.elevation>=contact.top-.05 || state.elevation+height<=contact.bottom+.05 || Math.hypot(x-contact.x,y-contact.y)>=world.carRadius+contact.r)continue;
    const sizeScale=growthScale(world.scene,state,object.id),scale=object.scale*sizeScale;
    if(sizeScale<1)state.growing=state.growing!.filter(p=>p.objectId!==object.id);
    if(contact.zoneId)state.brokenZones=[...state.brokenZones,{objectId:object.id,zoneId:contact.zoneId}];else state.broken=[...state.broken,object.id];
    const spec=object.spec as ObjectDslV2,placement=objectPlacement(world.scene,object);
    for(const [i,fragment] of objectFragments(spec).filter(f=>f.zone===contact.zoneId).entries()){
      const p=fragment.center.clone().multiplyScalar(scale).applyQuaternion(placement.rotation);
      if(impact.kind==="topple"){
        const nx=dx/d,ny=dy/d,r=archetypeOf(object).colliderRadius*scale;
        state.debris.push({objectId:object.id,fragmentId:fragment.id,...(sizeScale<1 ? {sizeScale} : {}),x:object.x+p.x,y:object.y+p.z,elevation:placement.base+p.y,vx:0,vy:0,vz:0,
          rotation:placement.rotation.toArray(),spin:[0,0,0],age:0,lifetime:impact.lifetime,settled:false,
          topple:{pivot:[object.x+nx*r,placement.base,object.y+ny*r],offset:[p.x-nx*r,p.y,p.z-ny*r],axis:[ny,0,-nx],rest:placement.rotation.toArray(),duration:impact.duration,angle:0}});
        continue;
      }
      const angle=i*2.399963+object.id.length,pattern=impact.pattern??"scatter",spread=impact.scatter*(.65+(i%3)*.15),nx=dx/d,ny=dy/d;
      const vx=pattern==="crumble" ? state.vx*.08+Math.cos(angle)*spread*.35 : pattern==="splinter" ? state.vx*.55+nx*spread-ny*Math.sin(angle)*spread*.35 : state.vx*.45+Math.cos(angle)*spread;
      const vy=pattern==="crumble" ? state.vy*.08+Math.sin(angle)*spread*.35 : pattern==="splinter" ? state.vy*.55+ny*spread+nx*Math.sin(angle)*spread*.35 : state.vy*.45+Math.sin(angle)*spread;
      state.debris.push({objectId:object.id,fragmentId:fragment.id,...(sizeScale<1 ? {sizeScale} : {}),x:object.x+p.x,y:object.y+p.z,elevation:placement.base+p.y,
        vx,vy,vz:impact.lift*(.75+(i%3)*.125)*(pattern==="crumble" ? .2 : 1),...(impact.pattern ? {pattern:impact.pattern} : {}),
        rotation:placement.rotation.toArray(),spin:[Math.sin(angle)*impact.spin,Math.cos(angle)*impact.spin,Math.sin(angle+1)*impact.spin].map(v=>v*(pattern==="crumble" ? .45 : 1)) as [number,number,number],age:0,lifetime:impact.lifetime,settled:false});
    }
    // Oldest cosmetic pieces yield capacity; persistent damage never depends on pool space.
    if(world.scene.damagePool)while(state.debris.length>DAMAGE_POOL_LIMITS.fragments || new Set(state.debris.map(p=>p.objectId)).size>DAMAGE_POOL_LIMITS.assemblies){const oldest=state.debris[0]!.objectId;state.debris=state.debris.filter(p=>p.objectId!==oldest);}
    state.impacts.push({id:object.id,kind:impact.kind,...(impact.kind==="break" && impact.pattern ? {pattern:impact.pattern} : {}),...(contact.zoneId ? {zoneId:contact.zoneId} : {}),x:contact.x,y:contact.y,elevation:contact.zoneId ? contact.bottom : placement.base,speed});
    state.vx*=.82;state.vy*=.82;
  }
}

/** Bounded ballistic pieces are cosmetic contacts with terrain; they never block the racing line. */
export function advanceImpactMotion(state:CarState,world:World,dt:number,hitCar=true):void {
  const {scene}=world,data=sceneContacts(scene),actors=actorContacts(scene,state.timeS,state);
  for(const prop of state.props){
    const object=data.objects.get(prop.id)!,impact=impactOf(object.spec);if(impact?.kind!=="bounce")continue;
    const radius=objectRadius(object),height=objectHeight(object),placement=objectPlacement(scene,object,prop.x,prop.y);
    let elevation=prop.elevation??placement.base,vz=prop.vz??0;
    const dx=prop.x-state.x,dy=prop.y-state.y,distance=Math.hypot(dx,dy),nx=distance>1e-6 ? dx/distance : Math.cos(state.headingRad),ny=distance>1e-6 ? dy/distance : Math.sin(state.headingRad);
    const closing=(state.vx-prop.vx)*nx+(state.vy-prop.vy)*ny;
    if(hitCar && distance<world.carRadius+radius && state.elevation<elevation+height && state.elevation+(world.bodyHeight??playerHeight(scene))>elevation && closing>8){
      prop.vx+=nx*closing*(1+impact.restitution);prop.vy+=ny*closing*(1+impact.restitution);vz=Math.max(vz,Math.min(220,closing*impact.lift));
      prop.x=state.x+nx*(world.carRadius+radius+.1);prop.y=state.y+ny*(world.carRadius+radius+.1);
      state.impacts.push({id:prop.id,kind:"bounce",x:prop.x,y:prop.y,elevation,speed:closing});
    }
    const damping=Math.exp(-(object.spec && "dslVersion" in object.spec ? object.spec.body.frictionPerS??.7 : .7)*dt);
    prop.vx*=damping;prop.vy*=damping;
    const speed=Math.hypot(prop.vx,prop.vy);if(speed>560){prop.vx*=560/speed;prop.vy*=560/speed;}
    prop.x+=prop.vx*dt;prop.y+=prop.vy*dt;
    const contacts=[...queryStaticContacts(scene,prop.x,prop.y,radius,state),...actors];
    for(const c of contacts){
      const x=prop.x-c.x,y=prop.y-c.y,d=Math.hypot(x,y),r=radius+c.r;
      if(isBroken(state,c) || d>=r || elevation>=c.top || elevation+height<=c.bottom)continue;
      const ax=d>1e-6 ? x/d : -1,ay=d>1e-6 ? y/d : 0,dot=prop.vx*ax+prop.vy*ay;
      prop.x=c.x+ax*(r+.1);prop.y=c.y+ay*(r+.1);
      if(dot<0){prop.vx-=ax*dot*(1+impact.restitution);prop.vy-=ay*dot*(1+impact.restitution);}
    }
    if(prop.x<radius || prop.x>scene.canonical.width-radius){prop.x=Math.max(radius,Math.min(scene.canonical.width-radius,prop.x));prop.vx*=-impact.restitution;}
    if(prop.y<radius || prop.y>scene.canonical.height-radius){prop.y=Math.max(radius,Math.min(scene.canonical.height-radius,prop.y));prop.vy*=-impact.restitution;}
    const floor=objectPlacement(scene,object,prop.x,prop.y).base;
    elevation+=vz*dt-150*dt*dt;vz-=300*dt;
    if(elevation<=floor){elevation=floor;vz=Math.abs(vz)>18 ? Math.abs(vz)*impact.restitution : 0;}
    prop.elevation=elevation;prop.vz=vz;
  }
  // shortcut: debris uses terrain contacts only; add pairwise contacts if debris affects gameplay.
  state.debris=state.debris.flatMap(previous=>{
    const piece={...previous,age:previous.age+dt};if(piece.age>=piece.lifetime)return [];
    if(piece.settled)return [piece];
    const object=data.objects.get(piece.objectId)!,scale=object.scale*(piece.sizeScale??1),shape=objectFragments(object.spec as ObjectDslV2).find(f=>f.id===piece.fragmentId)!;
    if(piece.topple){
      const hinge={...piece.topple},axis=new Vector3(...hinge.axis),pivot=new Vector3(...hinge.pivot),rest=new Quaternion(...hinge.rest);
      const target=Math.PI/2*Math.min(1,(piece.age/hinge.duration)**2),profile=objectSupport(scene,object);
      const origin=new Vector3(object.x,objectPlacement(scene,object).base,object.y).sub(pivot),sample=new Vector3();
      const clear=(angle:number)=>{
        const turn=new Quaternion().setFromAxisAngle(axis,angle);
        return profile.every(local=>{const p=sample.copy(local).multiplyScalar(scale).applyQuaternion(rest).add(origin).applyQuaternion(turn).add(pivot);return p.y>=drivingHeight(scene.terrain,p.x,p.z)-.001;});
      };
      let angle=target;
      if(!clear(target)){let lo=hinge.angle,hi=target;for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(clear(mid))lo=mid;else hi=mid;}angle=lo;piece.settled=true;}
      if(target>=Math.PI/2)piece.settled=true;
      hinge.angle=angle;piece.topple=hinge;
      const turn=new Quaternion().setFromAxisAngle(axis,angle),position=new Vector3(...hinge.offset).applyQuaternion(turn).add(pivot);
      piece.x=position.x;piece.y=position.z;piece.elevation=position.y;piece.rotation=turn.multiply(rest).toArray();return [piece];
    }
    const rotation=new Quaternion(...piece.rotation).multiply(new Quaternion().setFromEuler(new Euler(...piece.spin.map(v=>v*dt) as [number,number,number])));
    piece.rotation=rotation.toArray();piece.x+=piece.vx*dt;piece.y+=piece.vy*dt;piece.elevation+=piece.vz*dt-150*dt*dt;piece.vz-=300*dt;
    let floor=-Infinity;
    for(const corner of shape.corners){const p=corner.clone().multiplyScalar(scale).applyQuaternion(rotation);floor=Math.max(floor,drivingHeight(scene.terrain,piece.x+p.x,piece.y+p.z)-p.y);}
    if(piece.elevation<=floor){
      piece.elevation=floor;piece.vz=Math.abs(piece.vz)>25 ? Math.abs(piece.vz)*(piece.pattern==="crumble" ? .06 : .23) : 0;piece.vx*=.72;piece.vy*=.72;piece.spin=piece.spin.map(v=>v*.7) as [number,number,number];
      if(Math.hypot(piece.vx,piece.vy,piece.vz,...piece.spin)<3)piece.settled=true;
    }
    piece.vx*=Math.exp(-.35*dt);piece.vy*=Math.exp(-.35*dt);
    piece.x=Math.max(1,Math.min(scene.canonical.width-1,piece.x));piece.y=Math.max(1,Math.min(scene.canonical.height-1,piece.y));
    return [piece];
  });
}
