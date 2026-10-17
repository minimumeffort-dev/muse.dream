import {interactionSight} from './sight';
import type {Scene,SceneObject} from '../scene/schema';
import {behaviorFor,NPC_LIMITS,type Behavior} from '../scene/agents';
import {routePose} from '../scene/routes';
import type {CarState} from './car';
import {actorPose,workJourneyForActor} from './actors';

export interface NpcState {id:string;stateId:string;elapsedS:number;routeTimeS:number;animationTimeS:number;headingRad:number;known:boolean;replyAtS?:number}
const compiled=new WeakMap<Scene,SceneObject[]>();
function programmed(scene:Scene){let objects=compiled.get(scene);if(!objects){objects=scene.objects.filter(o=>!!o.behavior);compiled.set(scene,objects);}return objects;}
export function initialNpcState(scene:Scene,object:SceneObject):NpcState{
  const program=behaviorFor(scene,object)!,route=object.route && scene.routes.find(r=>r.id===object.route!.id)!;
  return {id:object.id,stateId:program.start,known:false,elapsedS:0,routeTimeS:0,animationTimeS:0,headingRad:route ? routePose(route,object.route!.phaseS??0,object.route!.offset).headingRad : object.headingRad??0};
}
export function initialNpcs(scene:Scene):NpcState[]{return programmed(scene).map(o=>initialNpcState(scene,o));}
const interacts=(t:Behavior['states'][number]['transitions'][number],known:boolean,distance:number)=>t.event==='interact' && distance<=t.radius! && (t.familiar===undefined || t.familiar===known);
/** Nearest eligible program, with stable ties; ambient/decor populations have no conversation owner. */
export function nearbyNpc(state:CarState,scene:Scene){
  if(state.control.kind!=='foot' || !state.grounded)return;
  let nearest:{object:SceneObject;distance:number}|undefined;
  for(const object of programmed(scene)){
    if(workJourneyForActor(state,scene,object.id))continue;
    const program=behaviorFor(scene,object)!,snapshot=state.npcs?.find(n=>n.id===object.id)??initialNpcState(scene,object),active=program.states.find(s=>s.id===snapshot.stateId)!;
    if(!active.transitions.some(t=>t.event==='interact'))continue;
    const pose=actorPose(scene,object,state.timeS,state),distance=Math.hypot(state.x-pose.x,state.y-pose.y,state.elevation-pose.elevation);
    if(active.transitions.some(t=>interacts(t,snapshot.known,distance)) && interactionSight(scene,state,pose,state,object.id) && (!nearest || distance<nearest.distance || distance===nearest.distance && object.id<nearest.object.id))nearest={object,distance};
  }
  return nearest?.object;
}
/** Replies are simulation-time, proximity-limited plain text, never HTML or model output. */
export function npcSpeech(state:CarState,scene:Scene){
  if(state.control.kind!=='foot')return;
  let latest:{npcId:string;label:string;text:string;at:number}|undefined;
  for(const object of programmed(scene)){
    const snapshot=state.npcs?.find(n=>n.id===object.id);if(snapshot?.replyAtS===undefined || state.timeS-snapshot.replyAtS>NPC_LIMITS.speechSeconds)continue;
    const active=behaviorFor(scene,object)!.states.find(s=>s.id===snapshot.stateId)!;if(!active.say)continue;
    const pose=actorPose(scene,object,state.timeS,state);if(Math.hypot(state.x-pose.x,state.y-pose.y,state.elevation-pose.elevation)>NPC_LIMITS.interactRadius || !interactionSight(scene,state,pose,state,object.id))continue;
    if(!latest || snapshot.replyAtS>latest.at || snapshot.replyAtS===latest.at && object.id<latest.npcId)latest={npcId:object.id,label:object.labelText??object.id,text:active.say,at:snapshot.replyAtS};
  }
  return latest;
}
/** One declared transition per fixed tick. Route clocks pause, so interruptions never teleport an NPC. */
export function stepNpcs(state:CarState,dt:number,scene:Scene,talkPressed=false):NpcState[]{
  const target=talkPressed ? nearbyNpc(state,scene) : undefined;
  return programmed(scene).map(object=>{
    const program=behaviorFor(scene,object)!,previous=state.npcs?.find(n=>n.id===object.id)??initialNpcState(scene,object),next={...previous,elapsedS:previous.elapsedS+dt};
    if(workJourneyForActor(state,scene,object.id))return previous;
    let active=program.states.find(s=>s.id===previous.stateId)!;
    const pose=actorPose(scene,object,state.timeS,state),distance=Math.hypot(state.x-pose.x,state.y-pose.y,state.elevation-pose.elevation);
    const transition=active.transitions.find(t=>t.event==='after' ? next.elapsedS+1e-9>=t.seconds! : t.event==='interact' ? target===object && interacts(t,previous.known,distance) : t.event==='near_player' ? distance<=t.radius! : distance>=t.radius!);
    if(transition){if(transition.event==='interact'){next.replyAtS=state.timeS+dt;next.known=true;}next.stateId=transition.to;next.elapsedS=0;active=program.states.find(s=>s.id===transition.to)!;}
    if(active.action==='patrol'){
      next.routeTimeS+=dt;
      const route=scene.routes.find(r=>r.id===object.route!.id)!,p=routePose(route,next.routeTimeS+(object.route!.phaseS??0),object.route!.offset);
      next.headingRad=p.headingRad;if(p.speed>0)next.animationTimeS+=dt;
    }else{
      if(active.action==='perform')next.animationTimeS+=dt;
      if(active.face==='player'){
        const angle=Math.atan2(state.y-pose.y,state.x-pose.x),delta=Math.atan2(Math.sin(angle-next.headingRad),Math.cos(angle-next.headingRad));
        if(Math.hypot(state.x-pose.x,state.y-pose.y)>.1)next.headingRad+=Math.max(-NPC_LIMITS.turnRadS*dt,Math.min(NPC_LIMITS.turnRadS*dt,delta));
      }
    }
    return next;
  });
}
