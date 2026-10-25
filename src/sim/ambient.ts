import {SpatialGrid} from './spatial';
import {walkingHeight} from '../scene/interiors';
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
const passingAngles=[0,.25,-.25,.5,-.5,.8,-.8,1.1,-1.1,Math.PI/2,-Math.PI/2];
const yieldingAngles=[...passingAngles,Math.PI,Math.PI*.75,-Math.PI*.75];
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
 const hazards=target>population.tick ? [...actorContacts(scene,state.timeS,state),{x:state.x,y:state.y,vx:state.vx,vy:state.vy,r:state.control.kind==='foot' ? 3.5 : 12,bottom:state.elevation,top:state.elevation+20}] : [];
 for(let tick=population.tick+1;tick<=target;tick++){
  const time=tick*AMBIENT_LIMITS.tickSeconds;
  const bodies=population.members.flatMap((m,i)=>objects[i]!.ambient!.motion.kind==='walk' ? [{i,id:objects[i]!.id,x:m.x,y:m.y,oldX:m.x,oldY:m.y,r:nav.radius(objects[i]!),vx:Math.cos(m.heading)*m.speed,vy:Math.sin(m.heading)*m.speed}] : []),byIndex=new Map(bodies.map(b=>[b.i,b])),grid=new SpatialGrid(bodies,32),maxRadius=Math.max(0,...bodies.map(b=>b.r));
  const members=population.members.map((old,i)=>{
   const o=objects[i]!,motion=o.ambient!.motion,m={...old,fromX:old.x,fromY:old.y,fromHeading:old.heading,fromDistance:old.distance,speed:0};
   const own=byIndex.get(i),finish=()=>{if(own){own.x=m.x;own.y=m.y;own.vx=Math.cos(m.heading)*m.speed;own.vy=Math.sin(m.heading)*m.speed;}return m;};
   const random=()=>{m.random=(Math.imul(m.random,1664525)+1013904223)>>>0;return m.random/4294967296;};
   let heading=m.heading,speed=motion.speed;
   if(motion.kind==='walk'){
    const node=nav.nodes[m.node];if(!node || time<m.pauseUntil)return finish();
    const arrivalFrom=nav.nodes[m.previous]??o,arrival=Math.min(nav.radius(o),Math.hypot(node.x-arrivalFrom.x,node.y-arrivalFrom.y)*.45);
    // Body-sized portals need disjoint arrival space on very short links.
    if(Math.hypot(node.x-m.x,node.y-m.y)<=arrival){
     const options=node.links.filter(j=>j!==m.previous),choices=options.length ? options : node.links;
     if(!choices.length)return finish();
     const next=choices[Math.floor(random()*choices.length)]!;m.previous=m.node;m.node=next;m.pauseUntil=time+random()*motion.waitS;
    }
    if(time<m.pauseUntil)return finish();
    const goal=nav.nodes[m.node]!,distance=Math.hypot(goal.x-m.x,goal.y-m.y);heading=Math.atan2(goal.y-m.y,goal.x-m.x);speed=Math.min(speed,distance/AMBIENT_LIMITS.tickSeconds);
    // The grid retains start-of-tick bins; the query includes one full step of movement.
    const near=grid.query(m.x,m.y,own!.r+maxRadius+37).filter(b=>b.i!==i && Math.hypot(b.x-m.x,b.y-m.y)<own!.r+b.r+35);
    const previous=nav.nodes[m.previous]??o,online=distanceToRoad([previous,goal],m.x,m.y)<.001;
    if(near.length || !online){
     // Stable IDs decide who may back away when passing space is tight.
     const yielding=near.some(b=>o.id>b.id),offsets=yielding ? yieldingAngles : passingAngles;
     let best:{heading:number;speed:number;cost:number}|undefined;
     search: for(const scale of [1,.5,0])for(const offset of scale ? offsets : [0]){
      // A safe yielding step must win over waiting in the other walker's way.
      if(!scale && yielding && best)continue;
      const h=heading+offset,v=speed*scale,vx=Math.cos(h)*v,vy=Math.sin(h)*v,x=m.x+vx*AMBIENT_LIMITS.tickSeconds,y=m.y+vy*AMBIENT_LIMITS.tickSeconds;
      let cost=Math.hypot(goal.x-x,goal.y-y)-distance+Math.abs(offset)*.04+(v ? 0 : .15),safe=true;
      if(best && cost>=best.cost)continue;
      for(const b of near){
       // Check the whole relative step, including already accepted neighbours.
       const dx=m.x-b.oldX,dy=m.y-b.oldY,rx=(x-m.x)-(b.x-b.oldX),ry=(y-m.y)-(b.y-b.oldY),t=Math.max(0,Math.min(1,-(dx*rx+dy*ry)/(rx*rx+ry*ry||1))),start=Math.hypot(dx,dy),end=Math.hypot(x-b.x,y-b.y),radius=own!.r+b.r;
       // Older saves may overlap: recover by separation, never teleporting.
       if(start>=radius-.0001 ? Math.hypot(dx+rx*t,dy+ry*t)<radius-.0001 : end<start+.00001 || Math.hypot(dx+rx*t,dy+ry*t)<start-.0001){safe=false;break;}
       const px=b.x-m.x,py=b.y-m.y,rvx=b.vx-vx,rvy=b.vy-vy,future=Math.max(0,Math.min(.7,-(px*rvx+py*rvy)/(rvx*rvx+rvy*rvy||1))),gap=Math.hypot(px+rvx*future,py+rvy*future);
       cost+=Math.max(0,radius+.5-gap)**2*.4;
       // Remaining neighbour penalties are nonnegative, so this candidate cannot win.
       if(best && cost>=best.cost){safe=false;break;}
      }
      if(safe && (!best || cost<best.cost) && (!v || nav.segment(m,{x,y},own!.r,true,state))){
       best={heading:h,speed:v,cost};
       // Unobstructed full-speed progress is the best possible score.
       if(cost<=-speed*AMBIENT_LIMITS.tickSeconds+1e-8)break search;
      }
     }
     if(!best)return finish();heading=best.heading;speed=best.speed;
    }
    // Waiting sees moving vehicles and the player's active body before entering their swept space.
    const floor=walkingHeight(scene,m.x,m.y);
    const vx=Math.cos(heading)*speed,vy=Math.sin(heading)*speed,next={x:m.x+vx*AMBIENT_LIMITS.tickSeconds,y:m.y+vy*AMBIENT_LIMITS.tickSeconds};
    if(movedParkingContacts(scene,m.x,m.y,nav.radius(o)+speed*AMBIENT_LIMITS.tickSeconds,state).some(c=>c.top>floor+.1 && c.bottom<floor+22 && distanceToRoad([m,next],c.x,c.y)<c.r+nav.radius(o)))return finish();
    if(hazards.some(c=>{
     if(c.bottom>floor+24 || c.top<floor)return false;
     const rx=(c.vx??0)-vx,ry=(c.vy??0)-vy,dx=c.x-m.x,dy=c.y-m.y,reach=c.r+own!.r+5;
     // Conservative two-second envelope; keep a margin for boundary rounding.
     if(Math.abs(dx)-Math.abs(rx)*2>reach+1e-7 || Math.abs(dy)-Math.abs(ry)*2>reach+1e-7)return false;
     const t=Math.max(0,Math.min(2,-(dx*rx+dy*ry)/(rx*rx+ry*ry||1)));
     return Math.hypot(dx+rx*t,dy+ry*t)<reach;
    }))return finish();
   }else{
    const distance=Math.hypot(state.x-m.x,state.y-m.y,state.elevation-drivingHeight(scene.terrain,m.x,m.y));
    if(distance<motion.alert){m.mode='flee';m.until=time+motion.recoverS;}
    else if(time>=m.until)m.mode='roam';
    if(m.mode==='flee'){heading=Math.atan2(m.y-state.y,m.x-state.x);speed=motion.fleeSpeed;}
    else if(time>=m.pauseUntil){heading=m.heading+(random()-.5)*2.2;m.pauseUntil=time+1+random()*3;}
    const step=speed*AMBIENT_LIMITS.tickSeconds,offsets=m.mode==='flee' ? [0,.5,-.5,1,-1,1.6,-1.6] : [0,.5,-.5,1,-1,1.6,-1.6,Math.PI];
    const candidate=offsets.map(a=>({a:heading+a,x:m.x+Math.cos(heading+a)*step,y:m.y+Math.sin(heading+a)*step})).find(p=>Math.hypot(p.x-o.x,p.y-o.y)<=motion.radius && nav.segment(m,p,nav.radius(o),false,state));
    if(!candidate){m.mode='alert';m.until=time+motion.recoverS;return finish();}
    heading=candidate.a;
   }
   m.x+=Math.cos(heading)*speed*AMBIENT_LIMITS.tickSeconds;m.y+=Math.sin(heading)*speed*AMBIENT_LIMITS.tickSeconds;
   m.heading=heading;m.distance+=speed*AMBIENT_LIMITS.tickSeconds;m.speed=speed;
   return finish();
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
