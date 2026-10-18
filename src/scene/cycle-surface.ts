import type {Point,Scene} from './schema';
import {cyclePolygons,markingPolygons,streetCycleTracks,streetPolygons} from './streets';
import {crossingLanes,streetFrame} from './sites';
import {intersectPolygons,subtractPolygons,unionPolygons} from './polygons';
import {clipPolygon} from './landscape-dsl';
import {roadFootprint} from './road';

const cache=new WeakMap<Scene,Point[][]>();
/** Junction paint connects declared cycle facilities; physical pavement stays unchanged. */
export function streetCycleSurface(scene:Scene):Point[][]{
  const saved=cache.get(scene);if(saved)return saved;
  const junctions=scene.crossings.filter(c=>c.junction).map(c=>{
    const host=scene.streets.find(s=>s.id===c.street)!;
    const center=streetFrame(host,c.at),streets=scene.streets.filter(s=>streetFrame(s,center).distance<=1),arms=crossingLanes(scene,c);
    const window=unionPolygons(streets.flatMap(s=>{
      const f=streetFrame(s,center),r=s.width/2+(s.cycleWidth ? s.cycleWidth+6 : 0);
      const square=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>({x:center.x+r*(f.dx*a!-f.dy*b!),y:center.y+r*(f.dy*a!+f.dx*b!)}));
      return [square,...arms.filter(arm=>arm.street===s).flatMap(arm=>markingPolygons({id:c.id,color:'#000000',width:r*2,closed:false,points:[center,arm.at]}))];
    }));
    return {center,streets,window};
  });
  const roads=streetPolygons(scene.streets),pieces:Point[][]=[];
  for(const s of scene.streets.filter(s=>s.cycleWidth)){
    let bands=cyclePolygons([s]);const openings:Point[][]=[],blocked:Point[][]=[];
    if(Math.hypot(s.points[0]!.x-s.points.at(-1)!.x,s.points[0]!.y-s.points.at(-1)!.y)<1e-7){
      // A returning street joins its ends; two independent inner caps would erase that corner.
      const points=s.points.slice(0,-1),inner=s.width/2+6;
      const strip=(r:number)=>markingPolygons({id:s.id,color:'#000000',width:r*2,closed:true,points});
      bands=intersectPolygons(unionPolygons(strip(inner+s.cycleWidth!),strip(inner)),streetPolygons([s],'riding'));
    }
    const local=junctions.filter(j=>j.streets.includes(s));
    for(const j of local){
      const at=(p:Point)=>Math.hypot(p.x-j.center.x,p.y-j.center.y)<=1,ends=[0,s.points.length-1].filter(i=>at(s.points[i]!));
      const endpoint=ends.length===1 && !s.points.slice(1,-1).some(at) ? ends[0] : undefined;
      if(endpoint!==undefined){
        const p=s.points[endpoint]!,q=s.points[endpoint===0 ? 1 : endpoint-1]!,length=Math.hypot(p.x-q.x,p.y-q.y),dx=(p.x-q.x)/length,dy=(p.y-q.y)/length;
        const side=(v:Point)=>(v.x-p.x)*dx+(v.y-p.y)*dy;
        const caps=bands.map(b=>clipPolygon(b,side)).filter(b=>b.length>=3);
        bands=subtractPolygons(bands,intersectPolygons(caps,j.window));
        const others=j.streets.filter(other=>other!==s && other.cycleWidth);
        const reach=Math.max(...j.window.flat().map(v=>Math.hypot(v.x-p.x,v.y-p.y)))+s.width;
        const points=s.points.map((v,i)=>i===endpoint ? {x:p.x+dx*reach,y:p.y+dy*reach} : v);
        const beyond=cyclePolygons([{...s,points}]).map(b=>clipPolygon(b,side)).filter(b=>b.length>=3);
        bands.push(...intersectPolygons(intersectPolygons(beyond,streetPolygons(others,'riding')),j.window));
        if(!others.length)continue;
      }
      openings.push(...j.window);
      // Nearby roads without a shared centerline do not acquire an invented crossing.
      blocked.push(...intersectPolygons(streetPolygons(scene.streets.filter(other=>!j.streets.includes(other))),j.window));
    }
    // Cut holes in the road exclusions instead of cutting and rebuilding every lane at every window.
    pieces.push(...subtractPolygons(bands,[...subtractPolygons(roads,openings),...blocked]));
  }
  const surface=scene.crossings.some(c=>c.junction) ? unionPolygons(pieces,roadFootprint(scene)) : streetCycleTracks(scene);
  cache.set(scene,surface);return surface;
}
