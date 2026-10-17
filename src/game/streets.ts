import * as THREE from 'three';
import type {RenderRegion} from './render-region';
import type {Scene,Point} from '../scene/schema';
import {streetPolygons,streetSidewalks,streetCycleTracks,streetCircuitCrossings,markingPolygons,onPolygon} from '../scene/streets';
import {unionPolygons,subtractPolygons,polygonBounds,polygonArea} from '../scene/polygons';
import {roadFootprint} from '../scene/road';
import {sitePolygons,streetFrame,crossingLanes,crossingPolygons} from '../scene/sites';
import {bridgePolygon,polygonsOverlap,clipPolygon} from '../scene/landscape-dsl';
import {surfaceGeometrySteps} from './surface';
import {finishBuild,tiledMeshSteps} from './batching';
import {toonMaterial} from './shaders';

type StreetRecipe={polygons:Point[][];color:string;lift:number;name:string};
const recipes=new WeakMap<Scene,StreetRecipe[]>();
/** Planar joins and paint are resolved once, before clipping to render chunks. */
export function buildStreets(scene:Scene):THREE.Group{return finishBuild(buildStreetSteps(scene));}
export function* buildStreetSteps(scene:Scene,region?:RenderRegion):Generator<void,THREE.Group>{
  let plan=recipes.get(scene);if(!plan){plan=yield* streetRecipeSteps(scene);recipes.set(scene,plan);}
  const group=new THREE.Group();group.name='streets-and-grounds';
  const timber=(scene.terrain.landscape?.bridges??[]).filter(b=>b.style==='timber').map(bridgePolygon);
  for(const {polygons,color,lift,name} of plan){
    const geometry=yield* surfaceGeometrySteps(scene,polygons,lift,undefined,undefined,timber,region);
    const mesh=yield* tiledMeshSteps(geometry,toonMaterial(color));mesh.name=name;group.add(mesh);
  }
  return group;
}
function* streetRecipeSteps(scene:Scene):Generator<void,StreetRecipe[]>{
  const plan:StreetRecipe[]=[];
  const roads=streetPolygons(scene.streets),roadUnion=unionPolygons(roads);
  const loop=roadFootprint(scene),riding=streetPolygons(scene.streets,'riding'),bands=streetCycleTracks(scene);
  const sidewalks=streetSidewalks(scene);
  function* add(polygons:Point[][],color:string,lift:number,name:string):Generator<void>{
    if(polygons.length)plan.push({polygons,color,lift,name});yield;
  }
  yield* add(roadUnion,'#626e77',1.25,'street-carriageways');
  yield* add(unionPolygons(riding,[...roads,...bands,...loop]),'#c9c3af',1.55,'cycle-separators');
  yield* add(bands,'#a76855',1.4,'street-cycle-tracks');
  yield* add(sidewalks,'#bcb6a4',1.6,'street-sidewalks');
  yield* add(unionPolygons(scene.sites.flatMap(s=>sitePolygons(scene,s)),[...streetPolygons(scene.streets,'reserved'),...loop]),'#bcb6a4',1.6,'entrance-paths');
  // Declaration order is paint order. Small bounded offsets prevent overlapping turf/court z-fighting.
  for(const [i,s] of scene.surfaces.entries())yield* add([s.points],s.color,.65+i*.015,`ground-${s.id}`);
  const dashes:Point[][]=[];
  const segments=scene.streets.flatMap(s=>s.points.slice(1).map((b,i)=>{
    const a=s.points[i]!,polygon=streetPolygons([{...s,sidewalk:0,points:[a,b]}])[0]!;
    return {a,b,polygon,bounds:polygonBounds(polygon)};
  }));
  const near=(other:typeof segments[number],x:number,y:number,margin:number)=>{
    const b=other.bounds;return x>=b.x0-margin && x<=b.x1+margin && y>=b.y0-margin && y<=b.y1+margin && onPolygon(other.polygon,x,y,margin);
  };
  for(const segment of segments){
    const {a,b}=segment,length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
    for(let d=30;d<length-24;d+=60){const x=a.x+dx*d,y=a.y+dy*d;
      if(segments.some(other=>other!==segment && near(other,x,y,28)))continue;
      dashes.push(...markingPolygons({id:'dash',color:'#d8d2b7',width:1.4,closed:false,points:[{x:x-dx*12,y:y-dy*12},{x:x+dx*12,y:y+dy*12}]}));
    }
  }
  const crossingClearance=scene.crossings.flatMap(c=>crossingPolygons(scene,{...c,width:c.width+16}));
  yield* add(subtractPolygons(dashes,[...crossingClearance,...loop]),'#d8d2b7',1.4,'street-centerlines');
  const symbols:Point[][]=[],symbolBounds:Point[][]=[];
  for(const s of scene.streets.filter(s=>s.cycleWidth))for(let i=1;i<s.points.length;i++){
    const a=s.points[i-1]!,b=s.points[i]!,length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
    for(let d=150;d<length-80;d+=300)for(const side of [-1,1]){
      const offset=s.width/2+6+s.cycleWidth!/2,x=a.x+dx*d-dy*offset*side,y=a.y+dy*d+dx*offset*side;
      if(segments.some(other=>!(other.a===a && other.b===b) && near(other,x,y,40)))continue;
      const point=(along:number,across:number)=>({x:x+side*(dx*along-dy*across),y:y+side*(dy*along+dx*across)});
      const bounds=[point(-12,-8),point(25,-8),point(25,7),point(-12,7)];
      if([...crossingClearance,...symbolBounds].some(p=>polygonsOverlap(p,bounds)) || subtractPolygons([bounds],bands).some(p=>polygonArea(p)>.01))continue;
      const glyph:Point[][]=[];
      const line=(points:Point[],closed=false)=>glyph.push(...markingPolygons({id:'cycle-symbol',color:'#eee8d9',width:1,closed,points}));
      for(const wheel of [-7,7])line(Array.from({length:12},(_,n)=>point(wheel+4*Math.cos(n*Math.PI/6),4*Math.sin(n*Math.PI/6))),true);
      line([point(-7,0),point(-3,-5),point(2,0),point(-7,0),point(0,-4),point(7,0),point(4,-6)]);
      line([point(18,-4),point(22,0),point(18,4)]);
      symbols.push(...unionPolygons(glyph));symbolBounds.push(bounds);
    }
  }
  yield* add(symbols,'#eee8d9',1.85,'cycle-symbols');
  const crossings:Point[][]=[],stopLines:Point[][]=[];
  for(const {street,polygons} of streetCircuitCrossings(scene))for(const polygon of polygons){
    const center=polygon.reduce((p,q)=>({x:p.x+q.x/polygon.length,y:p.y+q.y/polygon.length}),{x:0,y:0}),frame=streetFrame(street,center);
    const along=(p:Point)=>p.x*frame.dx+p.y*frame.dy,distances=polygon.map(along);
    for(let d=Math.floor(Math.min(...distances)/7)*7;d<Math.max(...distances);d+=7){
      const stripe=clipPolygon(clipPolygon(polygon,p=>along(p)-d),p=>d+3-along(p));
      if(polygonArea(stripe)>1e-7)crossings.push(stripe);
    }
  }
  for(const crossing of scene.crossings)for(const {street,at} of crossingLanes(scene,crossing)){
    const frame=streetFrame(street,at),half=street.width/2+(street.cycleWidth ? street.cycleWidth+6 : 0);
    for(const sign of [-1,1]){
      const along=sign*(crossing.width/2+9),side=-sign;
      stopLines.push(...markingPolygons({id:crossing.id,color:'#eee8d9',closed:false,width:2,points:[3,street.width/2-4].map(across=>({x:frame.x+frame.dx*along-frame.dy*across*side,y:frame.y+frame.dy*along+frame.dx*across*side}))}));
    }
    for(let offset=-half+2;offset<half;offset+=7){
      const x=frame.x-frame.dy*offset,y=frame.y+frame.dx*offset;
      crossings.push(...markingPolygons({id:crossing.id,color:'#eee8d9',closed:false,width:3,points:[{x:x-frame.dx*crossing.width/2,y:y-frame.dy*crossing.width/2},{x:x+frame.dx*crossing.width/2,y:y+frame.dy*crossing.width/2}]}));
    }
  }
  yield* add(unionPolygons(crossings),'#eee8d9',1.86,'pedestrian-crossings');
  yield* add(unionPolygons(subtractPolygons(stopLines,crossingClearance)),'#eee8d9',1.86,'crossing-stop-lines');
  const markings=new Map<string,Point[][]>();
  for(const s of scene.markings){const polygons=markings.get(s.color)??[];polygons.push(...markingPolygons(s));markings.set(s.color,polygons);}
  for(const [color,polygons] of markings)yield* add(polygons,color,1.9,'authored-markings');
  return plan;
}
