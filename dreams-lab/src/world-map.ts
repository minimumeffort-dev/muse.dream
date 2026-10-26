import type {Scenario,EpisodeAgent,EpisodeState} from './framework';

export interface MapPoint{x:number;y:number}
export function projectLocations(scenario:Scenario){
  const xs=scenario.locations.map(l=>l.at[0]),ys=scenario.locations.map(l=>l.at[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(680/Math.max(1,maxX-minX),280/Math.max(1,maxY-minY));
  return new Map(scenario.locations.map(l=>[l.id,{x:440+(l.at[0]-(minX+maxX)/2)*scale,y:210+(l.at[1]-(minY+maxY)/2)*scale}]));
}
export function agentPoint(agent:EpisodeAgent,points:Map<string,MapPoint>){
  const at=points.get(agent.at)!;
  if(agent.work?.kind!=='move')return at;
  const from=points.get(agent.work.from)!,to=points.get(agent.work.to)!,fraction=1-agent.work.remaining/agent.work.total;
  return {x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction};
}
export const AGENT_COLORS=['#f7c843','#386d85','#9b4e30','#74628c','#597548','#826023','#9d5868','#586d74'];
