import type {CarState,PropState} from '../sim/car';
import type {Scene} from '../scene/schema';
import {teamPose} from '../sim/team-sports';
import {walkingHeight} from '../scene/interiors';

const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const turn=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;

/** Presentation only: fixed-step contacts, ownership and saved state never consume this copy. */
export function presentState(previous:CarState,current:CarState,alpha:number,scene:Scene):CarState{
 const sameControl=previous.control.kind===current.control.kind && (!('id' in current.control) || 'id' in previous.control && previous.control.id===current.control.id);
 const continuous=sameControl && previous.seated?.objectId===current.seated?.objectId && previous.seated?.seatId===current.seated?.seatId && current.timeS>previous.timeS && current.timeS-previous.timeS<.02 && Math.hypot(current.x-previous.x,current.y-previous.y)<Math.max(8,Math.hypot(current.vx,current.vy)*.04);
 const t=continuous ? Math.max(0,Math.min(1,alpha)) : 1;
 const state={...current,x:mix(previous.x,current.x,t),y:mix(previous.y,current.y,t),elevation:mix(previous.elevation,current.elevation,t),headingRad:turn(previous.headingRad,current.headingRad,t),timeS:mix(previous.timeS,current.timeS,t),distance:mix(previous.distance,current.distance,t),pitch:mix(previous.pitch,current.pitch,t),bank:mix(previous.bank,current.bank,t)};
 state.sports=current.sports.map(game=>{
  const match=game.match,old=previous.sports.find(g=>g.id===game.id)?.match;if(!match || !old || match.status!=='playing')return game;
  const amount=match.status===old.status && match.round===old.round && match.joinedAtS===old.joinedAtS ? t : 1;
  if(amount===1)return game;
  return {...game,match:{...match,elapsedS:mix(old.elapsedS,match.elapsedS,amount),members:match.members.map(member=>{
   const from=old.members.find(m=>m.id===member.id),a=from ? teamPose(old,from) : teamPose(match,member),b=teamPose(match,member);
   const x=mix(a.x,b.x,amount),y=mix(a.y,b.y,amount),heading=turn(a.heading,b.heading,amount),distance=mix(a.distance,b.distance,amount),cycle=mix(a.cycle,b.cycle,amount);
   return {...member,x,fromX:x,y,fromY:y,heading,fromHeading:heading,distance,fromDistance:distance,cycle,fromCycle:cycle,speed:mix(a.speed,b.speed,amount)};
  })}};
 });
 const ballPose=(s:CarState,p:PropState)=>{
  const sport=scene.sports.find(c=>c.ballId===p.id),game=sport && s.sports.find(g=>g.id===sport.id),owner=game?.match?.status==='playing' && game.match.owner;
  if(!sport || !owner || game!.resetAtS)return;
  const member=owner==='player' ? undefined : game!.match!.members.find(m=>m.id===owner),pose=member && teamPose(game!.match!,member);
  const x=pose?.x??s.x,y=pose?.y??s.y,heading=pose?.heading??s.headingRad;
  return {...p,x:x+Math.cos(heading)*6,y:y+Math.sin(heading)*6,elevation:walkingHeight(scene,x,y,3)+(sport.kind==='football' ? .1 : game!.chargeStartS!==null ? 11 : Math.abs(Math.sin(game!.match!.elapsedS*9))*10)};
 };
 state.props=current.props.map(prop=>{
  const owned=ballPose(state,prop);if(owned)return owned;
  const old=previous.props.find(p=>p.id===prop.id);if(!old)return prop;
  const from=ballPose(previous,old)??old,amount=Math.hypot(prop.x-from.x,prop.y-from.y)<100 ? t : 1;
  return {...prop,x:mix(from.x,prop.x,amount),y:mix(from.y,prop.y,amount),...(prop.elevation!==undefined && from.elevation!==undefined ? {elevation:mix(from.elevation,prop.elevation,amount)} : {})};
 });
 return state;
}
