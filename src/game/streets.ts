import * as THREE from 'three';
import type {Scene,Point} from '../scene/schema';
import {streetRects,unionRects,rectPolygon,markingPolygons,inRect} from '../scene/streets';
import {surfaceGeometry} from './surface';
import {tiledMesh} from './batching';
import {toonMaterial} from './shaders';

/** Full resident, terrain-conforming city infrastructure with local culling bounds. */
export function buildStreets(scene:Scene):THREE.Group{
  const group=new THREE.Group();group.name='streets-and-grounds';
  const roads=streetRects(scene.streets),roadUnion=unionRects(roads);
  const sidewalks=unionRects(streetRects(scene.streets,true),roads);
  const add=(polygons:Point[][],color:string,lift:number,name:string)=>{
    if(!polygons.length)return;
    const mesh=tiledMesh(surfaceGeometry(scene,polygons,lift),toonMaterial(color));mesh.name=name;group.add(mesh);
  };
  add(roadUnion.map(rectPolygon),'#626e77',.9,'street-carriageways');
  add(sidewalks.map(rectPolygon),'#bcb6a4',1.6,'street-sidewalks');
  // Declaration order is paint order. Small bounded offsets prevent overlapping turf/court z-fighting.
  scene.surfaces.forEach((s,i)=>add([s.points],s.color,.65+i*.015,`ground-${s.id}`));
  const dashes:Point[][]=[];
  const segments=scene.streets.flatMap(s=>s.points.slice(1).map((b,i)=>({a:s.points[i]!,b,width:s.width})));
  for(const segment of segments){
    const {a,b}=segment,horizontal=a.y===b.y,length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
    for(let d=30;d<length-24;d+=60){const x=a.x+dx*d,y=a.y+dy*d;
      if(segments.some(other=>other!==segment && (other.a.y===other.b.y)!==horizontal && inRect({x0:Math.min(other.a.x,other.b.x)-other.width/2,y0:Math.min(other.a.y,other.b.y)-other.width/2,x1:Math.max(other.a.x,other.b.x)+other.width/2,y1:Math.max(other.a.y,other.b.y)+other.width/2},x,y,28)))continue;
      dashes.push(rectPolygon(horizontal ? {x0:x-12,y0:y-.7,x1:x+12,y1:y+.7} : {x0:x-.7,y0:y-12,x1:x+.7,y1:y+12}));
    }
  }
  add(dashes,'#d8d2b7',1.4,'street-centerlines');
  const markings=new Map<string,Point[][]>();
  for(const s of scene.markings){const polygons=markings.get(s.color)??[];polygons.push(...markingPolygons(s));markings.set(s.color,polygons);}
  for(const [color,polygons] of markings)add(polygons,color,1.9,'authored-markings');
  return group;
}
