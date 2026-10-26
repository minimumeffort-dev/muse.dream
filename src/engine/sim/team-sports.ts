import {z} from 'zod';
import type {Scene} from '../scene/schema';
import type {CarState,CarInput,PropState} from './car';
import type {SportState,SportCourt} from './sports';
import {sportShot,SPORT_CHARGE_S} from './sports';
import {matchRoster,matchStride,matchFrame,matchPoint,matchCoordinates,MATCH_LIMITS,type MatchSide} from '../scene/sports-match';
import {sportTargets} from '../scene/sports';
import {measuredScale} from '../scene/measure';
import {walkingHeight} from '../scene/interiors';
import {queryStaticContacts} from '../scene/contacts';
import {segmentContactDistance} from '../scene/contact-geometry';
import {isBroken} from './impacts';

const clock=z.number().finite().min(0).max(1e9),number=z.number().finite().min(-1e7).max(1e7),count=clock.int(),id=z.string().min(1).max(128);
const athleteState=z.object({id,x:number,y:number,fromX:number,fromY:number,heading:number,fromHeading:number,distance:clock,fromDistance:clock,cycle:clock,fromCycle:clock,speed:z.number().finite().min(0).max(90),action:z.enum(['idle','run','kick','throw','contest']),actionUntilS:clock}).strict();
export const teamStateSchema=z.object({joinedAtS:clock.nullable(),status:z.enum(['ready','playing','resting','finished']),elapsedS:clock,tick:count,round:count.min(1),home:count.max(999),away:count.max(999),owner:id.nullable(),lastSide:z.enum(['home','away']).nullable(),lastTouch:id.nullable(),releaseUntilS:clock,playerAction:z.object({kind:z.enum(['kick','throw','contest']),atS:clock}).strict().optional(),heldSinceS:clock,tackleUntilS:clock,tackleAtS:clock,passes:count,steals:count,shots:count,members:z.array(athleteState).max(11)}).strict();
export type TeamState=z.infer<typeof teamStateSchema>;
export type AthleteState=TeamState['members'][number];
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const turn=(from:number,to:number,t:number)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*t;
type MatchMember=ReturnType<typeof matchRoster>[number]&{radius:number;height:number};
const compiled=new WeakMap<SportCourt,{roster:MatchMember[];byId:Map<string,MatchMember>;frame:ReturnType<typeof matchFrame>}>();
function teamData(court:SportCourt){let data=compiled.get(court);if(!data){const roster=matchRoster(court.sport.id,court.sport.match!).map(m=>{const scale=measuredScale(m.spec);return {...m,radius:m.spec.body.colliderRadius*scale,height:m.spec.body.colliderHeight!*scale};});data={roster,byId:new Map(roster.map(m=>[m.id,m])),frame:matchFrame(court.ground.points,court.targets)};compiled.set(court,data);}return data;}
export function initialTeam(court:SportCourt):TeamState|undefined{
 const definition=court.sport.match;if(!definition)return;
 const frame=matchFrame(court.ground.points,court.targets),members=matchRoster(court.sport.id,definition).map(member=>{
  const direction=member.side==='home' ? 1 : -1,keeper=member.index===(member.team.keeper??0) && court.sport.kind==='football';
  const u=direction*(keeper ? -frame.length*.43 : -.24*frame.length+(member.index%2)*frame.length*.12),v=keeper ? 0 : ((member.index%3)-1)*frame.width*.28;
  const p=matchPoint(frame,u,v),heading=Math.atan2(frame.uy*direction,frame.ux*direction);
  return {id:member.id,...p,fromX:p.x,fromY:p.y,heading,fromHeading:heading,distance:0,fromDistance:0,cycle:0,fromCycle:0,speed:0,action:'idle' as const,actionUntilS:0};
 });
 return {joinedAtS:null,status:'ready',elapsedS:0,tick:0,round:1,home:0,away:0,owner:null,lastSide:null,lastTouch:null,releaseUntilS:0,heldSinceS:0,tackleUntilS:0,tackleAtS:0,passes:0,steals:0,shots:0,members};
}
export function teamPose(match:TeamState,member:AthleteState){
 const t=clamp((match.elapsedS-match.tick*MATCH_LIMITS.tickSeconds)/MATCH_LIMITS.tickSeconds,0,1);
 return {x:member.fromX+(member.x-member.fromX)*t,y:member.fromY+(member.y-member.fromY)*t,heading:turn(member.fromHeading,member.heading,t),distance:member.fromDistance+(member.distance-member.fromDistance)*t,cycle:member.fromCycle+(member.cycle-member.fromCycle)*t,speed:match.status==='playing' ? member.speed : 0};
}
export function teamVenue(scene:Scene,state:CarState,sportId:string){
 const sport=scene.sports.find(s=>s.id===sportId)!;if(!sport.match?.rosterId)return sportId;
 return scene.sports.filter(s=>s.match?.rosterId===sport.match!.rosterId).reduce((a,b)=>((state.sports.find(g=>g.id===b.id)?.match?.joinedAtS??-1)>(state.sports.find(g=>g.id===a.id)?.match?.joinedAtS??-1) ? b : a)).id;
}
export function teamMember(scene:Scene,state:CarState,id:string){
 for(const sport of scene.sports){if(teamVenue(scene,state,sport.id)!==sport.id)continue;const game=state.sports.find(g=>g.id===sport.id),member=game?.match?.members.find(m=>m.id===id);if(member && game?.match)return {...teamPose(game.match,member),elevation:walkingHeight(scene,member.x,member.y,3),id};}
}
export function attackTarget(court:SportCourt,side:MatchSide='home'){return court.targets[side==='home' ? 1 : 0]!;}
export function teamScore(game:SportState,court:SportCourt,targetIndex:number,points:number){
 const match=game.match;if(!match || match.status!=='playing')return;
 match[targetIndex===1 ? 'home' : 'away']+=points;match.owner=null;
 if(Math.max(match.home,match.away)>=court.sport.match!.scoreTo){match.status='finished';game.resetAtS=0;}
}
function canTravel(scene:Scene,state:CarState,a:{x:number;y:number},b:{x:number;y:number},radius:number,height:number){
 const elevation=walkingHeight(scene,b.x,b.y,radius);
 return !queryStaticContacts(scene,(a.x+b.x)/2,(a.y+b.y)/2,distance(a,b)/2+radius,state).some(c=>!isBroken(state,c) && c.bottom<elevation+height && c.top>elevation+1 && segmentContactDistance(c,a,b)<radius);
}
function lineClear(a:{x:number;y:number},b:{x:number;y:number},opponents:{x:number;y:number}[]){
 const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
 return !opponents.some(p=>{const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(d||1),0,1);return t>.05 && t<.95 && Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<8;});
}
/** HUD and input share the same pass, call and tackle eligibility. */
export function teamPassAction(state:CarState,game:SportState,court:SportCourt){
 const match=game.match!,{byId,frame}=teamData(court),owner=match.owner,home=match.members.filter(m=>byId.get(m.id)!.side==='home'),away=match.members.filter(m=>byId.get(m.id)!.side==='away');
 const kind=owner && owner!=='player' ? byId.get(owner)!.side==='home' ? 'call' : 'tackle' : 'pass';
 const blocked=(reason:string)=>({kind,reason,ready:false,from:undefined as string|undefined,to:undefined as {x:number;y:number}|undefined});
 if(match.status!=='playing' || game.resetAtS)return blocked('Join or resume the match first');
 if(!owner)return blocked('Move to the ball');
 if(owner==='player'){
  const candidates=home.filter(p=>distance(p,state)>12 && lineClear(state,p,away));
  const value=(p:AthleteState)=>Math.cos(Math.atan2(p.y-state.y,p.x-state.x)-state.headingRad)*150-distance(p,state)*.15;
  candidates.sort((a,b)=>value(b)-value(a)||a.id.localeCompare(b.id));
  return candidates[0] ? {kind,ready:true,reason:'Pass toward an open teammate',from:'player',to:candidates[0]} : blocked('No open teammate');
 }
 const person=match.members.find(m=>m.id===owner)!;
 if(kind==='call')return distance(person,state)<frame.length*.8 && lineClear(person,state,away) ? {kind,ready:true,reason:'Call for a teammate pass',from:owner,to:{x:state.x,y:state.y}} : blocked('Move into an open passing lane');
 if(!state.grounded)return blocked('Land before tackling');
 if(match.elapsedS<match.tackleUntilS)return blocked('Recovering from the last tackle');
 const angle=Math.atan2(person.y-state.y,person.x-state.x);
 return distance(person,state)<12 && Math.cos(angle-state.headingRad)>.1 ? {kind,ready:true,reason:'Tackle the nearby ball carrier',from:undefined,to:undefined} : blocked('Get close and face the ball carrier');
}
/** One real ball, shared fixed-step physics, and at most eleven decisions at 20 Hz. */
export function stepTeam(state:CarState,input:CarInput,game:SportState,court:SportCourt,scene:Scene,dt:number,active:boolean):void{
 const match=game.match!,definition=court.sport.match!,ball=state.props.find(p=>p.id===court.sport.ballId)!;
 if(input.matchPressed && active){
  if(match.status!=='playing'){for(const g of state.sports)if(g.id!==game.id && g.match && g.match.status==='playing')g.match.status='resting';match.joinedAtS=state.timeS;}
  if(match.status==='playing')match.status='resting';
  else if(match.status==='finished'){game.match=initialTeam(court);game.match!.round=match.round+1;game.match!.joinedAtS=state.timeS;game.match!.status='playing';game.possessed=false;game.chargeStartS=null;game.resetAtS=state.timeS+.01;return;}
  else match.status='playing';
 }
 if(!active || match.status!=='playing'){
  if(match.owner){ball.vx=ball.vy=0;ball.vz=0;match.owner=null;}
  game.possessed=false;game.chargeStartS=null;
  if(game.resetAtS)game.resetAtS+=dt;
  return;
 }
 match.elapsedS=Math.min(definition.durationS,match.elapsedS+dt);
 if(match.elapsedS>=definition.durationS){match.tick=Math.floor((match.elapsedS+1e-8)/MATCH_LIMITS.tickSeconds);match.status='finished';match.owner=null;game.possessed=false;game.chargeStartS=null;return;}
 const {frame,byId}=teamData(court),sideOf=(id:string)=>id==='player' ? 'home' : byId.get(id)!.side;let members=match.members,copied=false;
 const writable=()=>{if(!copied){members=match.members=members.map(m=>({...m}));copied=true;}};
 const body=(id:string)=>id==='player' ? state : members.find(m=>m.id===id)!;
 const all=[...members,state],ids=[...members.map(m=>m.id),'player'];
 const released=(owner:string,to:{x:number;y:number},shot:boolean)=>{
  const p=body(owner),headingRad=Math.atan2(to.y-p.y,to.x-p.x),person=owner==='player' ? state : {...state,x:p.x,y:p.y,headingRad,vx:0,vy:0,elevation:walkingHeight(scene,p.x,p.y,3),grounded:true};
  if(shot){
   const npc=owner!=='player',skill=npc ? byId.get(owner)!.team.skill : 1,error=npc ? Math.sin(match.tick*1.73+ids.indexOf(owner)*3.1)*(1-skill)*.23 : 0;
   const charge=npc ? court.sport.kind==='basketball' ? .65+error : .8 : game.chargeStartS===null ? .5 : clamp((state.timeS-game.chargeStartS)/SPORT_CHARGE_S,0,1);
   const aim=npc ? {x:to.x-frame.vx*error*frame.width*.1,y:to.y-frame.vy*error*frame.width*.1} : game.aim ? {x:game.aim[0],y:game.aim[1]} : court.sport.kind==='basketball' ? to : undefined;
   Object.assign(ball,sportShot(person,{...game,chargeStartS:state.timeS-charge*SPORT_CHARGE_S,aim:aim && [aim.x,aim.y]},court,dt));
   game.shots++;match.shots++;game.shotFrom=[p.x,p.y];game.shotAtS=state.timeS;
  }else{
   const d=distance(p,to),speed=clamp(140+d*.55,160,450),c=Math.cos(headingRad),s=Math.sin(headingRad);
   Object.assign(ball,{x:p.x+c*7,y:p.y+s*7,elevation:person.elevation+(court.sport.kind==='basketball' ? 8 : 1),vx:c*speed,vy:s*speed,vz:court.sport.kind==='basketball' ? 22 : 5});match.passes++;
  }
  if(owner==='player')match.playerAction={kind:court.sport.kind==='football' ? 'kick' : 'throw',atS:match.elapsedS};
  if(owner!=='player')writable();const member=members.find(m=>m.id===owner);if(member){member.action=court.sport.kind==='football' ? 'kick' : 'throw';member.actionUntilS=match.elapsedS+.45;}
  match.lastTouch=owner;match.lastSide=sideOf(owner);match.owner=null;match.releaseUntilS=match.elapsedS+.18;game.possessed=false;game.chargeStartS=null;game.lockUntilS=state.timeS+.18;
 };
 if(game.resetAtS){match.owner=null;game.possessed=false;game.chargeStartS=null;}
 const nearest=(side:MatchSide,p:{x:number;y:number})=>members.filter(m=>sideOf(m.id)===side).sort((a,b)=>distance(a,p)-distance(b,p)||a.id.localeCompare(b.id));
 if(input.passPressed){
  const action=teamPassAction(state,game,court);
  if(action.ready){
   if(action.from && action.to)released(action.from,action.to,false);
   else{match.playerAction={kind:'contest',atS:match.elapsedS};match.tackleAtS=match.elapsedS;match.tackleUntilS=match.elapsedS+.6;match.owner='player';match.heldSinceS=match.elapsedS;match.lastTouch='player';match.lastSide='home';match.steals++;game.possessed=true;}
  }
 }
 const nextTick=Math.floor((match.elapsedS+1e-8)/MATCH_LIMITS.tickSeconds);
 if(nextTick>match.tick){
  writable();match.tick=nextTick;
  const owner=match.owner && body(match.owner),ownerSide=match.owner && sideOf(match.owner),focus=owner||ball;
  const chasers={home:nearest('home',focus).slice(0,ownerSide==='home' ? 0 : 2).map(m=>m.id),away:nearest('away',focus).slice(0,ownerSide==='away' ? 0 : 2).map(m=>m.id)};
  for(const m of members){
   const r=byId.get(m.id)!,direction=r.side==='home' ? 1 : -1,ownGoal=court.targets[r.side==='home' ? 0 : 1]!,goal=attackTarget(court,r.side),f=matchCoordinates(frame,focus),keeper=court.sport.kind==='football' && r.index===(r.team.keeper??0);
   m.fromX=m.x;m.fromY=m.y;m.fromHeading=m.heading;m.fromDistance=m.distance;m.fromCycle=m.cycle;
   let target:{x:number;y:number};
   if(keeper){const predicted=matchCoordinates(frame,{x:ball.x+ball.vx*.25,y:ball.y+ball.vy*.25});target=matchPoint(frame,-direction*(frame.length/2-12),clamp(predicted.v,-ownGoal.width*.44,ownGoal.width*.44));}
   else if(match.owner===m.id)target=goal;
   else if(chasers[r.side].includes(m.id))target={x:focus.x+(focus===ball ? ball.vx*.15 : 0),y:focus.y+(focus===ball ? ball.vy*.15 : 0)};
   else{const attacking=ownerSide===r.side,spread=((r.index%3)-1)*frame.width*.28,u=clamp(f.u+direction*(attacking ? (r.index%2 ? r.team.style==='counter' ? .24 : .16 : -.13) : r.team.style==='counter' ? -.32 : -.23)*frame.length,-frame.length*.4,frame.length*.4);target=matchPoint(frame,u,spread+Math.sin(match.elapsedS*.4+r.index)*frame.width*.035);}
   let dx=target.x-m.x,dy=target.y-m.y,d=Math.hypot(dx,dy);if(d>1){dx/=d;dy/=d;}else dx=dy=0;
   for(const p of all){if(p===m)continue;const gap=distance(p,m),safe=p===state ? 9 : 8;if(gap<safe && gap>.001){dx+=(m.x-p.x)/gap*(safe-gap)*.4;dy+=(m.y-p.y)/gap*(safe-gap)*.4;}}
   const norm=Math.hypot(dx,dy)||1,speed=(court.sport.kind==='football' ? 58 : 42)*(.8+r.team.skill*.25)*(r.team.style==='press' && chasers[r.side].includes(m.id) ? 1.08 : 1),step=Math.min(d,speed*MATCH_LIMITS.tickSeconds),local=matchCoordinates(frame,{x:m.x+dx/norm*step,y:m.y+dy/norm*step});
   const p=matchPoint(frame,clamp(local.u,-frame.length/2+8,frame.length/2-8),clamp(local.v,-frame.width/2+8,frame.width/2-8));
   if(canTravel(scene,state,m,p,r.radius,r.height)){m.x=p.x;m.y=p.y;}
   const moved=distance(m,{x:m.fromX,y:m.fromY});m.speed=moved/MATCH_LIMITS.tickSeconds;m.distance+=moved;m.cycle+=moved/matchStride(r.spec,m.speed);
   const angle=moved>.02 ? Math.atan2(m.y-m.fromY,m.x-m.fromX) : Math.atan2(ball.y-m.y,ball.x-m.x);m.heading=turn(m.heading,angle,.4);
   if(m.actionUntilS<=match.elapsedS)m.action=m.speed>1 ? 'run' : 'idle';
  }
  if(match.owner && match.owner!=='player' && !game.resetAtS){
   const m=body(match.owner) as AthleteState,r=byId.get(m.id)!,goal=attackTarget(court,r.side),pressure=nearest(r.side==='home' ? 'away' : 'home',m).some(p=>distance(p,m)<17) || r.side==='away' && distance(state,m)<17;
   const held=match.elapsedS-match.heldSinceS;
   if((court.sport.kind!=='football' || r.index!==(r.team.keeper??0)) && held>.65 && distance(m,goal)<(court.sport.kind==='football' ? 260 : 110))released(m.id,goal,true);
   else if(held>(pressure ? .9 : 3)){
    const candidates=[...nearest(r.side,m),...(r.side==='home' ? [state] : [])].filter(p=>p!==m && distance(p,m)>14 && distance(p,m)<frame.length*.65 && lineClear(m,p,nearest(r.side==='home' ? 'away' : 'home',m)));
    candidates.sort((a,b)=>distance(a,goal)-distance(b,goal));if(candidates[0])released(m.id,candidates[0],false);
   }
  }
  if(!match.owner && !game.resetAtS && match.elapsedS>=match.releaseUntilS){
   const candidates=[...members,state].map((p,i)=>({p,id:ids[i]!,d:distance(p,ball)})).filter(c=>c.d<10 && Math.abs((ball.elevation??0)-walkingHeight(scene,c.p.x,c.p.y,3))<(court.sport.kind==='basketball' || c.id!=='player' && byId.get(c.id)!.index===(byId.get(c.id)!.team.keeper??0) ? 19 : 13) && (c.id!=='player' || state.grounded)).sort((a,b)=>a.d-b.d||a.id.localeCompare(b.id));
   const picked=candidates[0];if(picked){match.owner=picked.id;match.heldSinceS=match.elapsedS;if(match.lastSide && match.lastSide!==sideOf(picked.id))match.steals++;match.lastTouch=picked.id;match.lastSide=sideOf(picked.id);}
  }
  if(match.owner && match.elapsedS-match.heldSinceS>.65){
   const p=body(match.owner),side=sideOf(match.owner),opponents=nearest(side==='home' ? 'away' : 'home',p).filter(m=>distance(m,p)<9 && m.actionUntilS<=match.elapsedS);
   if(opponents[0]){opponents[0].action='contest';opponents[0].actionUntilS=match.elapsedS+.5;match.owner=opponents[0].id;match.heldSinceS=match.elapsedS;match.lastTouch=match.owner;match.lastSide=sideOf(match.owner);match.steals++;}
  }
 }
 game.possessed=match.owner==='player';
 if(match.owner && !game.resetAtS){
  const p=body(match.owner),angle=match.owner==='player' ? state.headingRad : (p as AthleteState).heading,c=Math.cos(angle),s=Math.sin(angle),base=walkingHeight(scene,p.x,p.y,3);
  Object.assign(ball,{x:p.x+c*6,y:p.y+s*6,elevation:base+(court.sport.kind==='basketball' ? game.chargeStartS!==null ? 11 : Math.abs(Math.sin(match.elapsedS*9))*10 : .1),vx:0,vy:0,vz:0});
  if(game.possessed){const pressed=input.shootPressed || input.shoot && !game.held,releasedKey=input.shootReleased || !input.shoot && game.held;
   if(pressed)game.chargeStartS=state.timeS;
   if(releasedKey && game.chargeStartS!==null)released('player',court.sport.kind==='basketball' ? attackTarget(court) : {x:state.x+Math.cos(state.headingRad)*300,y:state.y+Math.sin(state.headingRad)*300},true);
  }else game.chargeStartS=null;
 }else game.chargeStartS=null;
 game.held=!!input.shoot;
}
export function checkTeams(state:CarState,scene:Scene){
 if(state.sports.filter(g=>g.match?.status==='playing').length>1)throw Error('Multiple saved matches are active');
 for(const sport of scene.sports){const game=state.sports.find(g=>g.id===sport.id)!,match=game.match;
  if(!sport.match){if(match)throw Error('Unexpected saved match');continue;}
  if(!match)throw Error('Missing saved match');const roster=matchRoster(sport.id,sport.match),frame=matchFrame(scene.surfaces.find(s=>s.id===sport.surfaceId)!.points,sportTargets(scene,sport));
  const ids=roster.map(m=>m.id);if(match.members.length!==ids.length || new Set(match.members.map(m=>m.id)).size!==ids.length || match.members.some(m=>!ids.includes(m.id)))throw Error('Invalid saved team members');
  if(match.owner!==null && match.owner!=='player' && !ids.includes(match.owner) || match.lastTouch!==null && match.lastTouch!=='player' && !ids.includes(match.lastTouch))throw Error('Invalid saved ball owner');
  if(match.joinedAtS!==null && match.joinedAtS>state.timeS || match.elapsedS>sport.match.durationS || match.tick!==Math.floor((match.elapsedS+1e-8)/MATCH_LIMITS.tickSeconds) || match.releaseUntilS>match.elapsedS+.61 || match.heldSinceS>match.elapsedS || match.playerAction && match.playerAction.atS>match.elapsedS || match.tackleAtS>match.elapsedS || match.tackleUntilS>match.elapsedS+.61 || match.home>sport.match.scoreTo+2 || match.away>sport.match.scoreTo+2 || match.members.some(m=>{const p=matchCoordinates(frame,m),old=matchCoordinates(frame,{x:m.fromX,y:m.fromY});return Math.abs(p.u)>frame.length/2 || Math.abs(p.v)>frame.width/2 || Math.abs(old.u)>frame.length/2 || Math.abs(old.v)>frame.width/2 || m.fromDistance>m.distance || m.fromCycle>m.cycle || m.actionUntilS>match.elapsedS+.5;}))throw Error('Invalid saved match state');
  if(match.status==='ready' && (match.joinedAtS!==null || match.elapsedS!==0 || match.home!==0 || match.away!==0) || match.status!=='ready' && match.joinedAtS===null)throw Error('Invalid saved match lifecycle');
  if(game.possessed!==(match.owner==='player') || match.status!=='playing' && match.owner!==null)throw Error('Saved match ownership is inconsistent');
 }
}
