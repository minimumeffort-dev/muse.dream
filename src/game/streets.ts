import * as THREE from 'three';
import {bicycleSymbol} from './bicycle-symbol';
import {streetCycleSurface} from '../scene/cycle-surface';
import {crossingPaint} from './crossing-paint';
import {overlaps,type RenderRegion} from './render-region';
import type {Scene,Point} from '../scene/schema';
import {streetPolygons,streetSidewalks,streetCycleTracks,streetCircuitCrossings,markingPolygons,onPolygon} from '../scene/streets';
import {unionPolygons,subtractPolygons,polygonBounds,polygonArea} from '../scene/polygons';
import {roadFootprint} from '../scene/road';
import {tramTrackPolygons} from './tram-tracks';
import {sitePolygons,streetFrame,crossingLanes,crossingPolygons} from '../scene/sites';
import {bridgePolygon,polygonsOverlap,clipPolygon} from '../scene/landscape-dsl';
import {surfaceGeometrySteps} from './surface';
import {finishBuild,tiledMeshSteps} from './batching';
import {toonMaterial} from './shaders';
import {roadGeometry,bridgeDeckGeometry} from './road-surfaces';
import {projectSurfaceSteps} from './surface-projection';

type StreetRecipe={polygons:Point[][];color:string;lift:number;name:string;support:boolean;footing:boolean};
const recipes=new WeakMap<Scene,{layers:StreetRecipe[];grooves:Point[][];heads:Point[][]}>();
export function* streetPlanSteps(scene:Scene):Generator<void,NonNullable<ReturnType<typeof recipes.get>>>{
 let plan=recipes.get(scene);if(!plan){plan=yield* streetRecipeSteps(scene);recipes.set(scene,plan);}return plan;
}
/** Planar joins and paint are resolved once, before clipping to render chunks. */
export function buildStreets(scene:Scene):THREE.Group{return finishBuild(buildStreetSteps(scene));}
export function* buildStreetSteps(scene:Scene,region?:RenderRegion):Generator<void,THREE.Group>{
  const plan=yield* streetPlanSteps(scene);
  const group=new THREE.Group();group.name='streets-and-grounds';
  const timber=(scene.terrain.landscape?.bridges??[]).filter(b=>b.style==='timber').map(bridgePolygon);
  const support:THREE.BufferGeometry[]=[],collect=(root:THREE.Object3D)=>root.traverse(n=>{if(n instanceof THREE.Mesh)support.push(n.geometry);});
  for(const {polygons,color,lift,name,support:host} of plan.layers){
    const geometry=yield* surfaceGeometrySteps(scene,polygons,lift,undefined,undefined,timber,region);
    const mesh=yield* tiledMeshSteps(geometry,toonMaterial(color));mesh.name=name;group.add(mesh);
    if(host)collect(mesh);
  }
  const grooves=plan.grooves.filter(p=>!region || overlaps(region,p)),heads=plan.heads.filter(p=>!region || overlaps(region,p));
  if(grooves.length){
    const temporary:THREE.BufferGeometry[]=[];let material:THREE.MeshBasicMaterial|undefined;
    try{
      const remaining=subtractPolygons(grooves,subtractPolygons(streetPolygons(scene.streets),timber));
      if(remaining.length){
        material=new THREE.MeshBasicMaterial();
        const root=yield* tiledMeshSteps(roadGeometry(scene,region),material);collect(root);root.traverse(n=>{if(n instanceof THREE.Mesh)temporary.push(n.geometry);});
        for(const bridge of scene.terrain.landscape?.bridges??[])if(bridge.style==='timber' && remaining.some(p=>polygonsOverlap(p,bridgePolygon(bridge)))){
          const root=yield* tiledMeshSteps(bridgeDeckGeometry(scene,bridge,region),material);collect(root);root.traverse(n=>{if(n instanceof THREE.Mesh)temporary.push(n.geometry);});
        }
      }
      for(const [polygons,color,lift,bias,name] of [[grooves,'#303a3e',.02,1,'tram-rail-grooves'],[heads,'#87938f',.03,2,'tram-rail-heads']] as const){
        const geometry=yield* projectSurfaceSteps(support,polygons,{x:scene.canonical.width/2,y:scene.canonical.height/2},lift);
        const material=toonMaterial(color);material.polygonOffset=true;material.polygonOffsetFactor=-bias;material.polygonOffsetUnits=-bias;
        const mesh=yield* tiledMeshSteps(geometry,material);mesh.name=name;group.add(mesh);
      }
    }finally{temporary.forEach(g=>g.dispose());material?.dispose();}
  }
  return group;
}
function* streetRecipeSteps(scene:Scene):Generator<void,{layers:StreetRecipe[];grooves:Point[][];heads:Point[][]}>{
  const plan:StreetRecipe[]=[];
  const roads=streetPolygons(scene.streets),roadUnion=unionPolygons(roads);
  const loop=roadFootprint(scene),riding=streetPolygons(scene.streets,'riding'),bands=streetCycleSurface(scene),dedicated=streetCycleTracks(scene);
  const sidewalks=streetSidewalks(scene);
  function* add(polygons:Point[][],color:string,lift:number,name:string,support=false,footing=true):Generator<void>{
    if(polygons.length)plan.push({polygons,color,lift,name,support,footing});yield;
  }
  yield* add(roadUnion,'#626e77',1.25,'street-carriageways',true);
  const {grooves,heads}=tramTrackPolygons(scene);
  const paint=(polygons:Point[][])=>subtractPolygons(polygons,grooves);
  yield* add(unionPolygons(riding,[...roads,...bands,...loop]),'#c9c3af',1.55,'cycle-separators');
  yield* add(bands,'#a76855',1.4,'street-cycle-tracks');
  yield* add(sidewalks,'#bcb6a4',1.6,'street-sidewalks');
  const sharedPaving=scene.surfaces.filter(s=>s.walkable && s.finish!=='terrain' && s.color==='#bcb6a4');
  yield* add(unionPolygons([...scene.sites.flatMap(s=>sitePolygons(scene,s)),...sharedPaving.map(s=>s.points)],[...streetPolygons(scene.streets,'reserved'),...loop]),'#bcb6a4',1.6,'entrance-paths');
  // Declaration order is paint order. Small bounded offsets prevent overlapping turf/court z-fighting.
  for(const [i,s] of scene.surfaces.entries())if(s.finish!=='terrain' && !sharedPaving.includes(s))yield* add([s.points],s.color!,.65+i*.015,`ground-${s.id}`);
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
  yield* add(paint(subtractPolygons(dashes,[...crossingClearance,...bands,...loop])),'#d8d2b7',1.4,'street-centerlines');
  const symbols:Point[][]=[],symbolBounds:Point[][]=[];
  for(const s of scene.streets.filter(s=>s.cycleWidth))for(let i=1;i<s.points.length;i++){
    const a=s.points[i-1]!,b=s.points[i]!,length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
    for(let d=150;d<length-80;d+=300)for(const side of [-1,1]){
      const offset=s.width/2+6+s.cycleWidth!/2,x=a.x+dx*d-dy*offset*side,y=a.y+dy*d+dx*offset*side;
      if(segments.some(other=>!(other.a===a && other.b===b) && near(other,x,y,40)))continue;
      const point=(along:number,across:number)=>({x:x+side*(dx*along-dy*across),y:y+side*(dy*along+dx*across)});
      const bounds=[point(-12,-8),point(25,-8),point(25,8),point(-12,8)];
      if([...crossingClearance,...symbolBounds].some(p=>polygonsOverlap(p,bounds)) || subtractPolygons([bounds],dedicated).some(p=>polygonArea(p)>.01))continue;
      const glyph:Point[][]=[];
      const line=(points:Point[],closed=false)=>glyph.push(...markingPolygons({id:'cycle-symbol',color:'#eee8d9',width:1,closed,points}));
      const bikePoint=(u:number,v:number)=>point(u-12,(v-12)*.8);
      for(const {x:cx,y:cy,r} of bicycleSymbol.wheels)line(Array.from({length:24},(_,n)=>bikePoint(cx+r*Math.cos(n*Math.PI/12),cy+r*Math.sin(n*Math.PI/12))),true);
      for(const stroke of bicycleSymbol.lines)line(stroke.map(([u,v])=>bikePoint(u,v)));
      line([point(18,-4),point(22,0),point(18,4)]);
      symbols.push(...unionPolygons(glyph));symbolBounds.push(bounds);
    }
  }
  // The fine bicycle stencil is cosmetic; it cannot raise or tilt a planted foot.
  yield* add(paint(symbols),'#eee8d9',1.85,'cycle-symbols',false,false);
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
    const frame=streetFrame(street,at);
    for(const sign of [-1,1]){
      const along=sign*(crossing.width/2+9),side=-sign;
      stopLines.push(...markingPolygons({id:crossing.id,color:'#eee8d9',closed:false,width:2,points:[3,street.width/2-4].map(across=>({x:frame.x+frame.dx*along-frame.dy*across*side,y:frame.y+frame.dy*along+frame.dx*across*side}))}));
    }
  }
  crossings.push(...crossingPaint(scene).polygons);
  yield* add(paint(unionPolygons(crossings)),'#eee8d9',1.86,'pedestrian-crossings');
  yield* add(paint(unionPolygons(subtractPolygons(stopLines,[...crossingClearance,...bands]))),'#eee8d9',1.86,'crossing-stop-lines');
  const markings=new Map<string,Point[][]>();
  for(const s of scene.markings){const polygons=markings.get(s.color)??[];polygons.push(...markingPolygons(s));markings.set(s.color,polygons);}
  for(const [color,polygons] of markings)yield* add(paint(polygons),color,1.9,'authored-markings');
  return {layers:plan,grooves,heads};
}
