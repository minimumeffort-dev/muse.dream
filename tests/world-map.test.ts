import {it,expect} from 'vitest';
import {mapView,mapToPixel,pixelToMap,panMap,zoomMap,readWaypoint,waypointGuide,waypointDistance} from '../src/game/navigation';

it('round-trips exact world points across aspect ratios, pans, zoom and resize',()=>{
 for(const [w,h] of [[304,244],[548,400],[1280,720],[2000,900]] as const)for(const zoom of [1,2,12]){
  const view=mapView(w,h,14000,11000,zoom,{x:8300,y:4233});
  for(const point of [{x:0,y:0},{x:14000,y:11000},{x:6330,y:4233}]){
   const restored=pixelToMap(view,mapToPixel(view,point));expect(restored.x).toBeCloseTo(point.x,8);expect(restored.y).toBeCloseTo(point.y,8);
  }
 }
});

it('anchors zoom at the pointer and keeps panning within the world',()=>{
 const view=mapView(1280,720,14000,11000,3),pointer={x:700,y:300},before=pixelToMap(view,pointer),zoomed=zoomMap(view,2,pointer),after=pixelToMap(zoomed,pointer);
 expect(after.x).toBeCloseTo(before.x);expect(after.y).toBeCloseTo(before.y);
 expect(zoomMap(view,1e6).zoom).toBe(12);expect(zoomMap(view,0).zoom).toBe(1);
 for(const direction of [-1,1]){
  const moved=panMap(view,direction*1e9,direction*1e9),a=pixelToMap(moved,{x:0,y:0}),b=pixelToMap(moved,{x:moved.width,y:moved.height});
  expect(a.x).toBeGreaterThanOrEqual(-1e-8);expect(a.y).toBeGreaterThanOrEqual(-1e-8);expect(b.x).toBeLessThanOrEqual(14000+1e-8);expect(b.y).toBeLessThanOrEqual(11000+1e-8);
 }
});

it('accepts only bounded versioned navigation preferences without changing a world save',()=>{
 expect(readWaypoint('{"version":1,"point":{"x":14000,"y":0}}',14000,11000)).toEqual({x:14000,y:0});
 for(const text of [null,'null','bad','{}','{"version":2,"point":{"x":1,"y":2}}','{"version":1,"point":null}','{"version":1,"point":{"x":-1,"y":2}}','{"version":1,"point":{"x":14001,"y":2}}','{"version":1,"point":{"x":1,"y":11001}}','{"version":1,"point":{"x":1e999,"y":2}}','{"version":1,"point":{"x":"1","y":2}}',' '.repeat(257)])expect(readWaypoint(text,14000,11000)).toBeUndefined();
});

it('guides in screen directions after camera rotation and reports arrival in metres',()=>{
 const from={x:6330,y:4233},target={x:7330,y:4233},north=waypointGuide(from,target,0),rotated=waypointGuide(from,target,Math.PI/2);
 expect(north.distance).toBe(1000);expect(north.arrived).toBe(false);expect(north.direction).toBeCloseTo(110.556045);
 expect(rotated.direction).toBeCloseTo(-159.443955);expect(waypointGuide(from,from,Math.PI).arrived).toBe(true);
 expect(waypointGuide(from,{x:6355,y:4233},0).arrived).toBe(true);expect(waypointGuide(from,{x:6356,y:4233},0).arrived).toBe(false);
 expect(waypointDistance(1000)).toBe('100 m');expect(waypointDistance(1001)).toBe('101 m');expect(waypointDistance(12345)).toBe('1.2 km');
});
