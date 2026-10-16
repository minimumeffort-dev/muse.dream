import * as THREE from 'three';
import type {Scene,Point} from '../scene/schema';
import {streetPolygons,streetSidewalks,cyclePolygons,markingPolygons,onPolygon} from '../scene/streets';
import {unionPolygons,subtractPolygons} from '../scene/polygons';
import {sitePolygons,streetFrame,crossingLanes,crossingPolygons} from '../scene/sites';
import {bridgePolygon} from '../scene/landscape-dsl';
import {surfaceGeometry} from './surface';
import {tiledMesh} from './batching';
import {toonMaterial} from './shaders';

/** Full resident, terrain-conforming city infrastructure with local culling bounds. */
export function buildStreets(scene:Scene):THREE.Group{
  const group=new THREE.Group();group.name='streets-and-grounds';
  const roads=streetPolygons(scene.streets),roadUnion=unionPolygons(roads);
  const riding=streetPolygons(scene.streets,'riding'),bands=unionPolygons(cyclePolygons(scene.streets),roads);
  const sidewalks=streetSidewalks(scene);
  const timber=(scene.terrain.landscape?.bridges??[]).filter(b=>b.style==='timber').map(bridgePolygon);
  const add=(polygons:Point[][],color:string,lift:number,name:string)=>{
    if(!polygons.length)return;
    const geometry=surfaceGeometry(scene,polygons,lift,undefined,undefined,timber);
    if(scene.voxelWorld && /lines|symbols|crossings|markings/.test(name))geometry.userData.voxelOptions.cell=.5;
    const mesh=tiledMesh(geometry,toonMaterial(color));mesh.name=name;group.add(mesh);
  };
  add(roadUnion,'#626e77',1.25,'street-carriageways');
  add(unionPolygons(riding,[...roads,...bands]),'#c9c3af',1.55,'cycle-separators');
  add(bands,'#a76855',1.4,'street-cycle-tracks');
  add(sidewalks,'#bcb6a4',1.6,'street-sidewalks');
  add(unionPolygons(scene.sites.flatMap(s=>sitePolygons(scene,s)),streetPolygons(scene.streets,'reserved')),'#bcb6a4',1.6,'entrance-paths');
  // Declaration order is paint order. Small bounded offsets prevent overlapping turf/court z-fighting.
  scene.surfaces.forEach((s,i)=>add([s.points],s.color,.65+i*.015,`ground-${s.id}`));
  const dashes:Point[][]=[];
  const segments=scene.streets.flatMap(s=>s.points.slice(1).map((b,i)=>({a:s.points[i]!,b,width:s.width})));
  for(const segment of segments){
    const {a,b}=segment,length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
    for(let d=30;d<length-24;d+=60){const x=a.x+dx*d,y=a.y+dy*d;
      if(segments.some(other=>other!==segment && onPolygon(streetPolygons([{id:'crossing',sidewalk:0,width:other.width,points:[other.a,other.b]}])[0]!,x,y,28)))continue;
      dashes.push(...markingPolygons({id:'dash',color:'#d8d2b7',width:1.4,closed:false,points:[{x:x-dx*12,y:y-dy*12},{x:x+dx*12,y:y+dy*12}]}));
    }
  }
  const crossingClearance=scene.crossings.flatMap(c=>crossingPolygons(scene,{...c,width:c.width+16}));
  add(subtractPolygons(dashes,crossingClearance),'#d8d2b7',1.4,'street-centerlines');
  const symbols:Point[][]=[];
  for(const s of scene.streets.filter(s=>s.cycleWidth))for(let i=1;i<s.points.length;i++){
    const a=s.points[i-1]!,b=s.points[i]!,length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
    for(let d=150;d<length-80;d+=300)for(const side of [-1,1]){
      const offset=s.width/2+6+s.cycleWidth!/2,x=a.x+dx*d-dy*offset*side,y=a.y+dy*d+dx*offset*side;
      if(segments.some(other=>!(other.a===a && other.b===b) && onPolygon(streetPolygons([{id:'crossing',sidewalk:0,width:other.width,points:[other.a,other.b]}])[0]!,x,y,40)))continue;
      const point=(along:number,across:number)=>({x:x+side*(dx*along-dy*across),y:y+side*(dy*along+dx*across)});
      const line=(points:Point[],closed=false)=>symbols.push(...markingPolygons({id:'cycle-symbol',color:'#eee8d9',width:1,closed,points}));
      for(const wheel of [-7,7])line(Array.from({length:12},(_,n)=>point(wheel+4*Math.cos(n*Math.PI/6),4*Math.sin(n*Math.PI/6))),true);
      line([point(-7,0),point(-3,-5),point(2,0),point(-7,0),point(0,-4),point(7,0),point(4,-6)]);
      line([point(18,-4),point(22,0),point(18,4)]);
    }
  }
  add(subtractPolygons(symbols,crossingClearance),'#eee8d9',1.85,'cycle-symbols');
  const crossings:Point[][]=[],stopLines:Point[][]=[];
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
  add(crossings,'#eee8d9',1.86,'pedestrian-crossings');
  add(stopLines,'#eee8d9',1.86,'crossing-stop-lines');
  const markings=new Map<string,Point[][]>();
  for(const s of scene.markings){const polygons=markings.get(s.color)??[];polygons.push(...markingPolygons(s));markings.set(s.color,polygons);}
  for(const [color,polygons] of markings)add(polygons,color,1.9,'authored-markings');
  return group;
}
