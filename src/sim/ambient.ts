import type {Scene,SceneObject} from '../scene/schema';
import {ambientNavigation} from '../scene/ambient-navigation';
import {AMBIENT_LIMITS} from '../scene/ambient';
import {drivingHeight} from '../scene/terrain';
import {actorContacts} from './actors';
import {movedParkingContacts} from '../scene/contacts';
import {distanceToRoad} from '../scene/road';
import type {CarState} from './car';

export interface AmbientMember {x:number;y:number;fromX:number;fromY:number;heading:number;fromHeading:number;distance:number;fromDistance:number;node:number;previous:number;random:number;until:number;pauseUntil:number;mode:'walk'|'roam'|'flee'|'alert';speed:number}
export interface AmbientState {tick:number;members:AmbientMember[]}
const cache=new WeakMap<Scene,SceneObject[]>();
export function ambientObjects(scene:Scene){let value=cache.get(scene);if(!value){value=scene.objects.filter(o=>!!o.ambient);cache.set(scene,value);}return value;}
export function initialAmbient(scene:Scene):AmbientState{
 const objects=ambientObjects(scene),nav=objects.length ? ambientNavigation(scene) : undefined;
 return {tick:0,members:objects.map((o,i)=>({x:o.x,y:o.y,fromX:o.x,fromY:o.y,heading:o.headingRad??0,fromHeading:o.headingRad??0,distance:0,fromDistance:0,node:nav?.starts.get(o.id)??-1,previous:-1,random:[...o.id].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),i+1)>>>0,until:0,pauseUntil:0,mode:o.ambient!.motion.kind,speed:0}))};
}
/** Fixed 20 Hz reflexes; all members stay resident, with no general NPC programs or per-member scene rigs. */
export function stepAmbient(state:CarState,dt:number,scene:Scene):AmbientState|undefined{
 if(!ambientObjects(scene).length)return state.population;
 let population=state.population??{...initialAmbient(scene),tick:Math.floor(state.timeS/AMBIENT_LIMITS.tickSeconds)};const target=Math.floor((state.timeS+dt+1e-8)/AMBIENT_LIMITS.tickSeconds);
 const nav=ambientNavigation(scene),objects=ambientObjects(scene);
 for(let tick=population.tick+1;tick<=target;tick++){
  const time=tick*AMBIENT_LIMITS.tickSeconds,hazards=[...actorContacts(scene,state.timeS,state),{x:state.x,y:state.y,vx:state.vx,vy:state.vy,r:state.control.kind==='foot' ? 3.5 : 12,bottom:state.elevation,top:state.elevation+20}];
  const members=population.members.map((old,i)=>{
   const o=objects[i]!,motion=o.ambient!.motion,m={...old,fromX:old.x,fromY:old.y,fromHeading:old.heading,fromDistance:old.distance,speed:0};
   const random=()=>{m.random=(Math.imul(m.random,1664525)+1013904223)>>>0;return m.random/4294967296;};
   let heading=m.heading,speed=motion.speed;
   if(motion.kind==='walk'){
    const node=nav.nodes[m.node];if(!node)return m;
    if(Math.hypot(node.x-m.x,node.y-m.y)<.01){
     const options=node.links.filter(j=>j!==m.previous),choices=options.length ? options : node.links;
     if(!choices.length)return m;
     const next=choices[Math.floor(random()*choices.length)]!;m.previous=m.node;m.node=next;m.pauseUntil=time+random()*motion.waitS;
    }
    if(time<m.pauseUntil)return m;
    const goal=nav.nodes[m.node]!,distance=Math.hypot(goal.x-m.x,goal.y-m.y);heading=Math.atan2(goal.y-m.y,goal.x-m.x);speed=Math.min(speed,distance/AMBIENT_LIMITS.tickSeconds);
    // Waiting sees moving vehicles and the player's active body before entering their swept space.
    const floor=drivingHeight(scene.terrain,m.x,m.y);
    const next={x:m.x+Math.cos(heading)*speed*AMBIENT_LIMITS.tickSeconds,y:m.y+Math.sin(heading)*speed*AMBIENT_LIMITS.tickSeconds};
    if(movedParkingContacts(scene,m.x,m.y,nav.radius(o)+speed*AMBIENT_LIMITS.tickSeconds,state).some(c=>c.top>floor+.1 && c.bottom<floor+22 && distanceToRoad([m,next],c.x,c.y)<c.r+nav.radius(o)))return m;
    if(hazards.some(c=>{
     if(c.bottom>floor+24 || c.top<floor)return false;
     const vx=(c.vx??0)-Math.cos(heading)*speed,vy=(c.vy??0)-Math.sin(heading)*speed,dx=c.x-m.x,dy=c.y-m.y,t=Math.max(0,Math.min(2,-(dx*vx+dy*vy)/(vx*vx+vy*vy||1)));
     return Math.hypot(dx+vx*t,dy+vy*t)<c.r+nav.radius(o)+5;
    }))return m;
   }else{
    const distance=Math.hypot(state.x-m.x,state.y-m.y,state.elevation-drivingHeight(scene.terrain,m.x,m.y));
    if(distance<motion.alert){m.mode='flee';m.until=time+motion.recoverS;}
    else if(time>=m.until)m.mode='roam';
    if(m.mode==='flee'){heading=Math.atan2(m.y-state.y,m.x-state.x);speed=motion.fleeSpeed;}
    else if(time>=m.pauseUntil){heading=m.heading+(random()-.5)*2.2;m.pauseUntil=time+1+random()*3;}
    const step=speed*AMBIENT_LIMITS.tickSeconds,offsets=m.mode==='flee' ? [0,.5,-.5,1,-1,1.6,-1.6] : [0,.5,-.5,1,-1,1.6,-1.6,Math.PI];
    const candidate=offsets.map(a=>({a:heading+a,x:m.x+Math.cos(heading+a)*step,y:m.y+Math.sin(heading+a)*step})).find(p=>Math.hypot(p.x-o.x,p.y-o.y)<=motion.radius && nav.segment(m,p,nav.radius(o),false,state));
    if(!candidate){m.mode='alert';m.until=time+motion.recoverS;return m;}
    heading=candidate.a;
   }
   m.x+=Math.cos(heading)*speed*AMBIENT_LIMITS.tickSeconds;m.y+=Math.sin(heading)*speed*AMBIENT_LIMITS.tickSeconds;
   m.heading=heading;m.distance+=speed*AMBIENT_LIMITS.tickSeconds;m.speed=speed;
   return m;
  });
  population={tick,members};
 }
 return population;
}
export function ambientPose(population:AmbientState,index:number,timeS:number){
 const m=population.members[index]!,t=Math.max(0,Math.min(1,(timeS-population.tick*AMBIENT_LIMITS.tickSeconds)/AMBIENT_LIMITS.tickSeconds));
 const delta=Math.atan2(Math.sin(m.heading-m.fromHeading),Math.cos(m.heading-m.fromHeading));
 return {x:m.fromX+(m.x-m.fromX)*t,y:m.fromY+(m.y-m.fromY)*t,heading:m.fromHeading+delta*t,distance:m.fromDistance+(m.distance-m.fromDistance)*t,speed:m.speed,mode:m.mode};
}
