import type {Scene,SceneObject} from '../scene/schema';
import {behaviorFor,NPC_LIMITS} from '../scene/agents';
import {routePose} from '../scene/routes';
import type {CarState} from './car';
import {actorPose} from './actors';

export interface NpcState {id:string;stateId:string;elapsedS:number;routeTimeS:number;animationTimeS:number;headingRad:number}
const compiled=new WeakMap<Scene,SceneObject[]>();
function programmed(scene:Scene){let objects=compiled.get(scene);if(!objects){objects=scene.objects.filter(o=>!!o.behavior);compiled.set(scene,objects);}return objects;}
export function initialNpcState(scene:Scene,object:SceneObject):NpcState{
  const program=behaviorFor(scene,object)!,route=object.route && scene.routes.find(r=>r.id===object.route!.id)!;
  return {id:object.id,stateId:program.start,elapsedS:0,routeTimeS:0,animationTimeS:0,headingRad:route ? routePose(route,0,object.route!.offset).headingRad : object.headingRad??0};
}
export function initialNpcs(scene:Scene):NpcState[]{return programmed(scene).map(o=>initialNpcState(scene,o));}
/** One declared transition per fixed tick. Route clocks pause, so interruptions never teleport an NPC. */
export function stepNpcs(state:CarState,dt:number,scene:Scene):NpcState[]{
  return programmed(scene).map(object=>{
    const program=behaviorFor(scene,object)!,previous=state.npcs?.find(n=>n.id===object.id)??initialNpcState(scene,object),next={...previous,elapsedS:previous.elapsedS+dt};
    let active=program.states.find(s=>s.id===previous.stateId)!;
    const pose=actorPose(scene,object,state.timeS,state),distance=Math.hypot(state.x-pose.x,state.y-pose.y,state.elevation-pose.elevation);
    const transition=active.transitions.find(t=>t.event==='after' ? next.elapsedS+1e-9>=t.seconds! : t.event==='near_player' ? distance<=t.radius! : distance>=t.radius!);
    if(transition){next.stateId=transition.to;next.elapsedS=0;active=program.states.find(s=>s.id===transition.to)!;}
    if(active.action==='patrol'){
      next.routeTimeS+=dt;
      const route=scene.routes.find(r=>r.id===object.route!.id)!,p=routePose(route,next.routeTimeS,object.route!.offset);
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
