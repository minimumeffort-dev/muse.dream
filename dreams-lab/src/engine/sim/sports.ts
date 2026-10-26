import type {CarInput,CarState,PropState,World} from './car';
import type {Scene} from '../scene/schema';
import {sportTargets} from '../scene/sports';
import {pointInPolygon} from './mask';
import {objectRadius} from './archetypes';
import {objectPlacement} from '../scene/placement';
import {drivingHeight} from '../scene/terrain';
import {distanceToPolygon} from '../scene/polygons';
import {initialTeam,stepTeam,teamScore,type TeamState} from './team-sports';

export interface SportState {
  id:string;score:number;shots:number;made:number;held:boolean;possessed:boolean;
  chargeStartS:number|null;lockUntilS:number;resetAtS:number;
  event:'goal'|'basket'|'out'|null;eventUntilS:number;
  shotFrom?:[number,number];shotAtS:number;
  aim?:[number,number];match?:TeamState;
}
export const SPORT_CHARGE_S=.9,SPORT_SWEET_SPOT=.65,SPORT_SWEET_WIDTH=.07;
export function initialSports(scene:Scene):SportState[]{
  return sportsCourts(scene).map(court=>({id:court.sport.id,...(court.sport.match ? {match:initialTeam(court)} : {}),score:0,shots:0,made:0,held:false,possessed:false,chargeStartS:null,lockUntilS:0,resetAtS:0,event:null,eventUntilS:0,shotAtS:0}));
}
const cache=new WeakMap<Scene,ReturnType<typeof compileCourts>>();
function compileCourts(scene:Scene){
  return scene.sports.map(sport=>{
    const object=scene.objects.find(o=>o.id===sport.ballId)!;
    return {sport,object,radius:objectRadius(object),ground:scene.surfaces.find(s=>s.id===sport.surfaceId)!,targets:sportTargets(scene,sport),targetScales:sport.targets.map(id=>scene.objects.find(o=>o.id===id)!.scale)};
  });
}
export type SportCourt=ReturnType<typeof compileCourts>[number];
export function sportsCourts(scene:Scene){let value=cache.get(scene);if(!value){value=compileCourts(scene);cache.set(scene,value);}return value;}
export function activeSport(state:CarState,scene:Scene){
  if(state.seated || state.control.kind!=='foot' || Math.abs(state.elevation-drivingHeight(scene.terrain,state.x,state.y))>25)return;
  return sportsCourts(scene).find(c=>pointInPolygon(state.x,state.y,c.ground.points));
}
export function sportCharge(state:CarState,game:SportState):number{return game.chargeStartS===null ? 0 : Math.min(1,(state.timeS-game.chargeStartS)/SPORT_CHARGE_S);}
export function cancelSportAction(state:CarState):CarState {
  return {...state,sports:state.sports.map(game=>({...game,held:false,chargeStartS:null,aim:undefined}))};
}
export function closestSportTarget(court:ReturnType<typeof sportsCourts>[number],x:number,y:number){
  return court.targets.reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y) ? a : b);
}

export function sportShot(state:CarState,game:SportState,court:ReturnType<typeof sportsCourts>[number],dt=1/120):PropState {
  const ball:PropState={id:court.sport.ballId,x:0,y:0,vx:0,vy:0};
  const charge=sportCharge(state,game);
  let angle=game.aim ? Math.atan2(game.aim[1]-state.y,game.aim[0]-state.x) : state.headingRad;
  if(court.sport.kind==='football' && !game.aim){
    const goal=court.targets.find(t=>{const dx=t.x-state.x,dy=t.y-state.y;return (dx*Math.cos(angle)+dy*Math.sin(angle))/Math.hypot(dx,dy)>.92;});
    if(goal)angle=Math.atan2(goal.y-state.y,goal.x-state.x);
  }
  const c=Math.cos(angle),s=Math.sin(angle);
  ball.x=state.x+c*6;ball.y=state.y+s*6;
  if(court.sport.kind==='football'){
    const speed=110+charge*280;ball.vx=c*speed+state.vx*.25;ball.vy=s*speed+state.vy*.25;
    ball.elevation=state.elevation;ball.vz=state.grounded ? 18+charge*20 : 70+charge*40;
  }else{
    ball.x=state.x+c*3-s*4;ball.y=state.y+s*3+c*4;
    const target=game.match?.status==='playing' && !game.aim ? court.targets[1]! : closestSportTarget(court,game.aim?.[0]??state.x,game.aim?.[1]??state.y),distance=Math.hypot(target.x-ball.x,target.y-ball.y);
    ball.elevation=state.elevation+12;
    const duration=Math.ceil(Math.min(1.2,.7+distance*.003)/dt)*dt,n=duration/dt;
    const friction=court.object.spec && 'dslVersion' in court.object.spec ? court.object.spec.body.frictionPerS??.7 : .7;
    const retention=Math.exp(-friction*dt),travel=dt*retention*(1-retention**n)/(1-retention);
    const error=charge-SPORT_SWEET_SPOT,power=1+Math.sign(error)*Math.max(0,Math.abs(error)-SPORT_SWEET_WIDTH)*.5;
    const range=Math.min(1,140/Math.max(1,distance));
    ball.vx=(target.x-ball.x)/travel*power*range+state.vx*.12;
    ball.vy=(target.y-ball.y)/travel*power*range+state.vy*.12;
    ball.vz=(target.elevation-court.radius-ball.elevation+150*duration**2)/duration;
  }
  return ball;
}
function launch(state:CarState,ball:PropState,game:SportState,court:ReturnType<typeof sportsCourts>[number],dt:number){
  Object.assign(ball,sportShot(state,game,court,dt));
  if(court.sport.kind==='basketball'){const target=closestSportTarget(court,game.aim?.[0]??state.x,game.aim?.[1]??state.y);state.headingRad=Math.atan2(target.y-state.y,target.x-state.x);}
  game.shotFrom=[state.x,state.y];game.shotAtS=state.timeS;game.shots++;
  game.possessed=false;game.lockUntilS=state.timeS+.6;game.chargeStartS=null;
}

/** Called once after the existing movement/prop tick; never advances the clock twice. */
export function stepSports(state:CarState,previous:CarState,input:CarInput,dt:number,world:World):CarState {
  if(!world.scene.sports.length)return state;
  const active=activeSport(state,world.scene);
  state.sports=state.sports.map(game=>({...game,...(game.match ? {match:{...game.match}} : {})}));
  for(const court of sportsCourts(world.scene)){
    const {sport,radius,object}=court,game=state.sports.find(g=>g.id===sport.id)!;
    const ball=state.props.find(p=>p.id===sport.ballId)!,old=previous.props.find(p=>p.id===sport.ballId)!;
    containGoalNet(ball,old,court,dt);
    game.aim=input.aim && Number.isFinite(input.aim.x) && Number.isFinite(input.aim.y) ? [Math.max(0,Math.min(world.scene.canonical.width,input.aim.x)),Math.max(0,Math.min(world.scene.canonical.height,input.aim.y))] : undefined;
    const aim=game.aim ? {x:game.aim[0],y:game.aim[1]} : sport.kind==='basketball' && game.chargeStartS!==null ? game.match?.status==='playing' ? court.targets[1]! : closestSportTarget(court,state.x,state.y) : undefined;
    if(aim && Math.hypot(aim.x-state.x,aim.y-state.y)>1){const turn=Math.atan2(Math.sin(Math.atan2(aim.y-state.y,aim.x-state.x)-state.headingRad),Math.cos(Math.atan2(aim.y-state.y,aim.x-state.x)-state.headingRad));state.headingRad+=Math.max(-12*dt,Math.min(12*dt,turn));}
    const pressed=input.shootPressed || input.shoot && !game.held,released=input.shootReleased || !input.shoot && game.held;
    if(game.match && (active?.sport.id!==sport.id || game.match.status!=='playing' && !input.matchPressed)){stepTeam(state,input,game,court,world.scene,dt,active?.sport.id===sport.id);continue;}
    if(!game.match)game.held=!!input.shoot;
    if(game.eventUntilS<state.timeS)game.event=null;
    if(game.resetAtS){
      game.possessed=false;game.chargeStartS=null;
      if(state.timeS>=game.resetAtS){
        Object.assign(ball,{x:object.x,y:object.y,elevation:objectPlacement(world.scene,object).base,vx:0,vy:0,vz:0});
        game.resetAtS=0;game.shotFrom=undefined;game.lockUntilS=state.timeS+.2;
      }
      if(game.match)stepTeam(state,input,game,court,world.scene,dt,active?.sport.id===sport.id);
      continue;
    }
    // A ball must cross the complete goal line, or pass downward through the ring.
    const oldZ=(old.elevation??objectPlacement(world.scene,object,old.x,old.y).base)+radius,newZ=(ball.elevation??objectPlacement(world.scene,object,ball.x,ball.y).base)+radius;
    for(const [targetIndex,target] of court.targets.entries()){
      let scored=false;
      if(sport.kind==='football'){
        const a=(old.x-target.x)*target.nx+(old.y-target.y)*target.ny,b=(ball.x-target.x)*target.nx+(ball.y-target.y)*target.ny;
        if(a<=radius && b>radius){
          const t=(radius-a)/(b-a),x=old.x+(ball.x-old.x)*t,y=old.y+(ball.y-old.y)*t,z=oldZ+(newZ-oldZ)*t;
          // Goal feet are surveyed above tiny support offsets; a rolling ball still enters at ground level.
          scored=Math.abs((x-target.x)*target.tx+(y-target.y)*target.ty)<=target.width/2-radius && z>=drivingHeight(world.scene.terrain,x,y)+radius-.05 && z<=target.elevation+target.height/2-radius;
        }
        if(a*b<=0 && a!==b){
          const t=-a/(b-a),along=(old.x+(ball.x-old.x)*t-target.x)*target.tx+(old.y+(ball.y-old.y)*t-target.y)*target.ty,z=oldZ+(newZ-oldZ)*t-target.elevation;
          const post=Math.abs(Math.abs(along)-target.width/2)<radius+.6 && Math.abs(z)<target.height/2+radius;
          const bar=Math.abs(z-target.height/2)<radius+.6 && Math.abs(along)<target.width/2+radius;
          if(post || bar){const dot=ball.vx*target.nx+ball.vy*target.ny;ball.vx-=target.nx*dot*1.65;ball.vy-=target.ny*dot*1.65;ball.x=old.x;ball.y=old.y;scored=false;}
        }
      }else if(!game.possessed && !game.match?.owner && oldZ>target.elevation && newZ<=target.elevation && (ball.vz??0)<0){
        const t=(oldZ-target.elevation)/(oldZ-newZ),dx=old.x+(ball.x-old.x)*t-target.x,dy=old.y+(ball.y-old.y)*t-target.y;
        const along=dx*target.tx+dy*target.ty,normal=dx*target.nx+dy*target.ny;
        scored=(along/(target.width/2-radius))**2+(normal/(target.height/2-radius))**2<=1;
        if(!scored && (along/(target.width/2+radius))**2+(normal/(target.height/2+radius))**2<=1){ball.vz=Math.abs(ball.vz??0)*.55;ball.elevation=target.elevation+radius;}
      }
      if(scored){
        const points=sport.kind==='football' ? 1 : game.shotFrom && state.timeS-game.shotAtS<4 && Math.hypot(game.shotFrom[0]-target.x,game.shotFrom[1]-target.y)>=67.5 ? 3 : 2;game.score+=points;
        game.made++;game.event=sport.kind==='football' ? 'goal' : 'basket';game.eventUntilS=state.timeS+1.5;game.resetAtS=state.timeS+1.5;
        game.possessed=false;game.chargeStartS=null;ball.vx*=.15;ball.vy*=.15;teamScore(game,court,targetIndex,points);break;
      }
    }
    if(game.resetAtS){if(game.match)stepTeam(state,input,game,court,world.scene,dt,active?.sport.id===sport.id);continue;}
    if(!pointInPolygon(ball.x,ball.y,court.ground.points) && distanceToPolygon(ball.x,ball.y,court.ground.points)>24){
      game.resetAtS=state.timeS+2;game.event='out';game.eventUntilS=game.resetAtS;game.possessed=false;game.chargeStartS=null;if(game.match)stepTeam(state,input,game,court,world.scene,dt,active?.sport.id===sport.id);continue;
    }
    if(game.match){stepTeam(state,input,game,court,world.scene,dt,active?.sport.id===sport.id);continue;}
    if(active?.sport.id!==sport.id){game.possessed=false;game.chargeStartS=null;continue;}
    const near=Math.hypot(ball.x-state.x,ball.y-state.y)<10 && Math.abs(newZ-state.elevation)<16 && state.timeS>=game.lockUntilS;
    if(sport.kind==='football')game.possessed=near;
    else if(!game.possessed && near)game.possessed=true;
    if(game.possessed){
      const c=Math.cos(state.headingRad),s=Math.sin(state.headingRad);
      if(sport.kind==='basketball'){
        ball.x=state.x+c*3-s*4;ball.y=state.y+s*3+c*4;
        ball.elevation=state.elevation+(game.chargeStartS!==null ? 11 : Math.abs(Math.sin(state.timeS*9))*10);ball.vz=0;ball.vx=state.vx;ball.vy=state.vy;
      }else{
        const blend=1-Math.exp(-18*dt),x=state.x+c*(radius+4.5),y=state.y+s*(radius+4.5);
        ball.vx+=(state.vx+(x-ball.x)*12-ball.vx)*blend;ball.vy+=(state.vy+(y-ball.y)*12-ball.vy)*blend;
      }
      if(pressed)game.chargeStartS=state.timeS;
      if(released && game.chargeStartS!==null)launch(state,ball,game,court,dt);
    }else game.chargeStartS=null;
  }
  return state;
}

/** The sloping back and side net planes enclose the goal; the mouth stays open. */
export function containGoalNet(ball:PropState,old:PropState,court:SportCourt,dt:number){
 if(court.sport.kind!=='football' || court.sport.netDepth===undefined)return;
 const radius=court.radius;
 for(const [i,target] of court.targets.entries()){
  const depth=court.sport.netDepth*court.targetScales[i]!,floor=target.elevation-target.height/2;
  const local=(p:PropState)=>({n:(p.x-target.x)*target.nx+(p.y-target.y)*target.ny,t:(p.x-target.x)*target.tx+(p.y-target.y)*target.ty,z:(p.elevation??floor)+radius-floor});
  const before=local(old),p=local(ball),half=target.width/2-radius;
  const a=1/depth,b=1/target.height,length=Math.hypot(a,b);
  const wasInside=before.n>=0 && before.n<=depth && Math.abs(before.t)<=half+.01 && before.z>=radius-.75 && before.n*a+before.z*b<=1+radius*length;
  const fraction=-before.n/(p.n-before.n),entryT=before.t+(p.t-before.t)*fraction,entryZ=before.z+(p.z-before.z)*fraction;
  const entered=before.n<0 && p.n>=0 && fraction>=0 && fraction<=1 && Math.abs(entryT)<=half && entryZ>=radius-.75 && entryZ<=target.height-radius;
  if((!wasInside && !entered) || p.n<0)continue;
  let n=p.n,t=p.t,z=p.z;
  if(Math.abs(t)>half){const sign=Math.sign(t),speed=ball.vx*target.tx+ball.vy*target.ty;if(speed*sign>0){ball.vx-=target.tx*speed*1.12;ball.vy-=target.ty*speed*1.12;}t=sign*half;}
  const penetration=(n*a+z*b-1)/length+radius;
  if(penetration>0){
   n-=a/length*penetration;z-=b/length*penetration;const velocity=(ball.vx*target.nx+ball.vy*target.ny)*a/length+(ball.vz??0)*b/length;
   if(velocity>0){ball.vx-=target.nx*a/length*velocity*1.12;ball.vy-=target.ny*a/length*velocity*1.12;ball.vz=(ball.vz??0)-b/length*velocity*1.12;}
  }
  // At the floor/back seam the sphere must satisfy both planes, not just its centre.
  if(z<radius){z=radius;n=Math.min(n,(1-radius*length-radius*b)/a);}
  ball.x=target.x+target.nx*n+target.tx*t;ball.y=target.y+target.ny*n+target.ty*t;ball.elevation=Math.max(floor,z+floor-radius);
  if(n>radius && Math.abs(t)<half){const drag=Math.exp(-8*dt);ball.vx*=drag;ball.vy*=drag;}
 }
}
