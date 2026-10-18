import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {buildMaskForScene} from '../src/scene/fixture';
import {crossingLanes} from '../src/scene/sites';
import {streetPolygons,onPolygon} from '../src/scene/streets';
import {crossingPaint} from '../src/game/crossing-paint';
import {unionPolygons,polygonArea} from '../src/scene/polygons';
const scene=createWorldScene();
it('keeps a clear block between airport and hospital approaches instead of a thirteen-degree merge',()=>{
 const road=scene.streets.find(s=>s.id==='airport_connector')!;
 expect(road.points).toEqual([{x:3000,y:7800},{x:3000,y:6500}]);
 const mask=buildMaskForScene(scene);
 for(let y=6700;y<=7400;y+=100){expect(mask.isDrivable(3000,y)).toBe(true);expect(mask.isDrivable(3300,y)).toBe(true);expect(mask.isDrivable(3150,y)).toBe(false);}
 const crossing=scene.crossings.find(c=>c.id==='cross_airport_north')!;
 expect(crossingLanes(scene,crossing)).toHaveLength(2); // The short link to the hospital junction shares its crossing.
 expect(crossingLanes(scene,crossing).some(c=>c.street.id==='airport_connector')).toBe(true);
});
it('carries the revised bus route on the same accepted carriageway and paints each zebra once',()=>{
 const route=scene.routes.find(r=>r.id==='airport_bus')!,roads=streetPolygons(scene.streets);
 for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1]!,b=route.points[i]!,n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8);
  for(let j=0;j<=n;j++)expect(roads.some(p=>onPolygon(p,a.x+(b.x-a.x)*j/n,a.y+(b.y-a.y)*j/n))).toBe(true);
 }
 const paint=crossingPaint(scene).polygons;
 expect(paint.reduce((a,p)=>a+polygonArea(p),0)).toBeCloseTo(unionPolygons(paint).reduce((a,p)=>a+polygonArea(p),0),5);
});
