import type {Scene,Point} from '../scene/schema';
import {railPolygons} from '../scene/routes';
import {unionPolygons} from '../scene/polygons';

const footprints=new WeakMap<Scene,{grooves:Point[][];heads:Point[][]}>();
/** Track projection and every road-paint builder share the same rail clearance. */
export function tramTrackPolygons(scene:Scene){
 let result=footprints.get(scene);
 if(!result){
  const routes=scene.routes.filter(r=>r.kind==='tram');
  result={grooves:unionPolygons(routes.flatMap(r=>railPolygons(r,1.2))),heads:unionPolygons(routes.flatMap(r=>railPolygons(r,.6)))};
  footprints.set(scene,result);
 }
 return result;
}
