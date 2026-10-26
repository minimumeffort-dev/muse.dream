import type {EpisodeAgent,EpisodeState,Scenario} from './framework';
import {ASSETS,DELIVERY_BUILDINGS,type AssetId} from './assets';
import {assemblyBounds,measuredScale} from './engine/scene/measure';
import {Vector3} from 'three';

export const STEP_MS=1000;
export type Point={x:number;z:number};
export function scenarioPoints(scenario:Scenario){
  const xs=scenario.locations.map(l=>l.at[0]),zs=scenario.locations.map(l=>l.at[1]);
  const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
  return new Map(scenario.locations.map(l=>[l.id,{x:(l.at[0]-x)*.6,z:(l.at[1]-z)*.6}]));
}
export function episodePoint(agent:EpisodeAgent,points:Map<string,Point>):Point{
  if(agent.work?.kind!=='move')return points.get(agent.at)!;
  const a=points.get(agent.work.from)!,b=points.get(agent.work.to)!,t=1-agent.work.remaining/agent.work.total;
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
}
export function agentPose(scenario:Scenario,state:EpisodeState,index:number,points:Map<string,Point>){
  const agent=state.agents[index]!,p=episodePoint(agent,points),columns=Math.min(3,state.agents.length),lane=(index%columns-(columns-1)/2)*8,row=(Math.floor(index/columns)-(Math.ceil(state.agents.length/columns)-1)/2)*8;
  const move=agent.work?.kind==='move'?agent.work:undefined;
  const a=move?points.get(move.from)!:p,b=move?points.get(move.to)!:p,length=Math.hypot(b.x-a.x,b.z-a.z);
  return {x:p.x+(length?(-(b.z-a.z)*lane+(b.x-a.x)*row)/length:lane),z:p.z+(length?((b.x-a.x)*lane+(b.z-a.z)*row)/length:row),heading:length?Math.atan2(b.z-a.z,b.x-a.x):0,
    cargo:Object.entries(agent.inventory).filter(([id,n])=>n>0&&!(scenario.id==='morning_delivery'&&id==='visit')).map(([id])=>id),
    working:agent.work?.kind==='service'};
}
export function scenePlan(scenario:Scenario){
  const points=scenarioPoints(scenario);
  const locations=scenario.locations.map(location=>{
    const point=points.get(location.id)!,neighbors=scenario.links.flatMap(link=>link.from===location.id?[points.get(link.to)!]:link.to===location.id?[points.get(link.from)!]:[]);
    let dx=0,dz=0;for(const n of neighbors){const d=Math.hypot(n.x-point.x,n.z-point.z)||1;dx+=(n.x-point.x)/d;dz+=(n.z-point.z)/d;}
    const d=Math.hypot(dx,dz)||1;if(!dx&&!dz)dz=1;const front={x:dx/d,z:dz/d};
    const asset:AssetId|undefined=scenario.id==='morning_delivery'&&location.id==='square'?undefined:scenario.id==='morning_delivery'?DELIVERY_BUILDINGS[location.id]??'pavilion':neighbors.length>2?undefined:'pavilion';
    const scale=asset?measuredScale(ASSETS[asset]):1,bounds=asset?assemblyBounds(ASSETS[asset]):undefined;
    const entry=asset==='clinic'?{x:-18*scale,z:-28.7*scale}:{x:0,z:(bounds?.min.z??0)*scale};
    const yaw=Math.atan2(-front.x,-front.z),c=Math.cos(yaw),s=Math.sin(yaw),door={x:point.x-front.x*24,z:point.z-front.z*24};
    const position={x:door.x-entry.x*c-entry.z*s,z:door.z+entry.x*s-entry.z*c};
    return {id:location.id,label:location.label,point,asset,scale,yaw,position,door,height:bounds?bounds.getSize(new Vector3()).y*scale:0};
  });
  return {points,locations,links:scenario.links.map(link=>({id:link.id,a:points.get(link.from)!,b:points.get(link.to)!}))};
}
