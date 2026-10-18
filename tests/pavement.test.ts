import {it,expect} from 'vitest';
import {pavementSurface,pavementPortal} from '../src/scene/pavement';
const rect=(x:number,y:number,w:number,h:number)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
it('carries a body across a shared edge and rejects point-only portals',()=>{
 const a=rect(0,0,20,20),b=rect(20,0,20,20),p=pavementPortal(a,b,4)!;
 expect(p).toEqual({x:20,y:10});expect(pavementSurface([a,b]).segment({x:10,y:10},{x:30,y:10},4)).toBe(true);
 expect(pavementPortal(a,rect(20,20,20,20),4)).toBeUndefined();
});
it('rejects a thin unsupported gap even when it falls between movement samples',()=>{
 const a=rect(-300,0,18.75,20),b=rect(-281,0,21,20),s=pavementSurface([a,b]);
 expect(s.segment({x:-295,y:10},{x:-265,y:10},4)).toBe(false);expect(pavementPortal(a,b,4)).toBeUndefined();
});
it('supports overlaps and rejects body envelopes outside a narrow pavement',()=>{
 const a=rect(0,0,20,20),b=rect(15,0,20,20),s=pavementSurface([a,b]);
 expect(pavementPortal(a,b,4)).toEqual({x:17.5,y:10});expect(s.segment({x:5,y:2},{x:30,y:2},4)).toBe(false);
});
it('keeps full footprints inside rotated convex paving and retains concave boundary checks',()=>{
 const diamond=[{x:0,y:20},{x:20,y:0},{x:40,y:20},{x:20,y:40}],s=pavementSurface([diamond]);
 for(const points of [diamond,[...diamond].reverse()]){
  const surface=pavementSurface([points]);
  expect(surface.segment({x:15,y:20},{x:25,y:20},4)).toBe(true);
  expect(surface.segment({x:5,y:20},{x:20,y:5},4)).toBe(false);
 }
 const concave=[{x:0,y:0},{x:40,y:0},{x:40,y:40},{x:30,y:40},{x:30,y:10},{x:10,y:10},{x:10,y:40},{x:0,y:40}];
 expect(pavementSurface([concave]).segment({x:5,y:30},{x:35,y:30},2)).toBe(false);
 expect(s.segment({x:20,y:10},{x:20,y:30},4)).toBe(true);
});
