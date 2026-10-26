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

/** The picture is derived from accepted locations, links and real episode poses. */
export class ExperimentMap {
  private scenario:Scenario|undefined;
  private points=new Map<string,MapPoint>();
  private markers:SVGGElement[]=[];
  constructor(private readonly svg:SVGSVGElement){}
  private shape<K extends keyof SVGElementTagNameMap>(tag:K,attributes:Record<string,string|number>,parent:SVGElement=this.svg,text?:string){
    const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [name,value] of Object.entries(attributes))el.setAttribute(name,String(value));
    if(text!==undefined)el.textContent=text;
    parent.append(el);return el;
  }
  draw(scenario:Scenario,state:EpisodeState,animate=false,previous?:EpisodeState,fraction=1){
    if(this.scenario!==scenario)this.build(scenario);
    this.svg.dataset.animate=String(animate);
    state.agents.forEach((agent,i)=>{
      const target=agentPoint(agent,this.points),from=previous?agentPoint(previous.agents[i]!,this.points):target;
      const p={x:from.x+(target.x-from.x)*fraction,y:from.y+(target.y-from.y)*fraction},offset=(i-(state.agents.length-1)/2)*24;
      this.markers[i]!.style.transform=`translate(${p.x+offset}px,${p.y+36}px)`;
      this.markers[i]!.querySelector('title')!.textContent=`${agent.id}: ${agent.work?.kind==='move'?`travelling to ${agent.work.to}`:agent.at}`;
    });
  }
  private build(scenario:Scenario){
    this.scenario=scenario;this.points=projectLocations(scenario);this.svg.replaceChildren();
    this.svg.setAttribute('viewBox','0 0 880 460');
    this.svg.setAttribute('aria-label',`Environment with ${scenario.locations.length} locations, ${scenario.links.length} paths and ${scenario.agents.length} agents`);
    this.shape('rect',{width:880,height:460,fill:'#e9eade'});
    const links=this.shape('g',{'stroke-linecap':'round','stroke-linejoin':'round'});
    for(const link of scenario.links){
      const a=this.points.get(link.from)!,b=this.points.get(link.to)!,d=`M${a.x} ${a.y}L${b.x} ${b.y}`;
      this.shape('path',{d,stroke:'#fafaf2','stroke-width':28},links);
      this.shape('path',{d,stroke:'#8b9486','stroke-width':16},links);
      this.shape('path',{d,stroke:'#d8dcce','stroke-width':1,'stroke-dasharray':'6 10'},links);
      this.shape('text',{x:(a.x+b.x)/2+8,y:(a.y+b.y)/2-12,class:'link-duration'},links,`${link.steps} steps`);
    }
    for(const location of scenario.locations){
      const p=this.points.get(location.id)!,color=scenario.services.some(s=>s.at===location.id)?'#b9cbd0':scenario.stocks.some(s=>s.at===location.id&&s.mode==='source')?'#cdbb9e':'#c5cdb8';
      const group=this.shape('g',{});
      this.shape('rect',{x:p.x-43,y:p.y-26,width:86,height:52,rx:4,fill:color,stroke:'#9ca58f'},group);
      this.shape('path',{d:`M${p.x-33} ${p.y-15}h66`,stroke:'#ffffff75','stroke-width':3},group);
      this.shape('text',{x:p.x,y:p.y-40,'text-anchor':'middle',class:'place-label'},group,location.label);
    }
    this.markers=scenario.agents.map((agent,i)=>{
      const group=this.shape('g',{class:'agent-marker'});
      this.shape('title',{},group,agent.id);
      this.shape('circle',{r:15,fill:'#fafaf7'},group);
      this.shape('circle',{r:11,fill:AGENT_COLORS[i]!,stroke:'#171717','stroke-width':.7},group);
      this.shape('text',{y:4,'text-anchor':'middle',class:'agent-label',style:`fill:${i===0?'#171717':'#fafaf7'}`},group,String.fromCharCode(65+i));
      return group;
    });
  }
}
