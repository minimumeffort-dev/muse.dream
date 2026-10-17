import type {Contact} from './contacts';
import type {Point} from './schema';
import {pointInPolygon} from '../sim/mask';
import {distanceToPolygon} from './polygons';

export type ContactFootprint=Pick<Contact,'x'|'y'|'r'|'box'>;
function local(c:ContactFootprint,p:Point):Point{const a=c.box?.headingRad??0,co=Math.cos(a),si=Math.sin(a),x=p.x-c.x,y=p.y-c.y;return {x:x*co+y*si,y:y*co-x*si};}
/** Signed distance and outward normal; the broad-phase radius never fills a box's doorway. */
export function contactSeparation(c:ContactFootprint,x:number,y:number):{distance:number;nx:number;ny:number}{
 if(!c.box){const dx=x-c.x,dy=y-c.y,d=Math.hypot(dx,dy);return {distance:d-c.r,nx:d>1e-9 ? dx/d : -1,ny:d>1e-9 ? dy/d : 0};}
 const p=local(c,{x,y}),{halfX,halfY,headingRad}=c.box,dx=Math.max(Math.abs(p.x)-halfX,0),dy=Math.max(Math.abs(p.y)-halfY,0),outside=Math.hypot(dx,dy);
 let nx:number,ny:number,distance:number;
 if(outside>0){nx=Math.sign(p.x)*dx/outside;ny=Math.sign(p.y)*dy/outside;distance=outside;}
 else if(halfX-Math.abs(p.x)<halfY-Math.abs(p.y)){nx=p.x<0 ? -1 : 1;ny=0;distance=Math.abs(p.x)-halfX;}
 else{nx=0;ny=p.y<0 ? -1 : 1;distance=Math.abs(p.y)-halfY;}
 const co=Math.cos(headingRad),si=Math.sin(headingRad);return {distance,nx:nx*co-ny*si,ny:nx*si+ny*co};
}
export function contactOverlaps(c:ContactFootprint,x:number,y:number,radius:number):boolean{
 if(!c.box)return Math.hypot(x-c.x,y-c.y)<radius+c.r;
 const co=Math.cos(c.box.headingRad),si=Math.sin(c.box.headingRad),dx=x-c.x,dy=y-c.y,ax=Math.abs(dx*co+dy*si)-c.box.halfX,ay=Math.abs(dy*co-dx*si)-c.box.halfY;
 if(ax<0 && ay<0)return true;
 return Math.max(ax,0)**2+Math.max(ay,0)**2<radius*radius;
}
const pointSegment=(p:Point,a:Point,b:Point)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
/** Exact capsule against an upright oriented box, including corners and zero-length paths. */
export function segmentContactDistance(c:ContactFootprint,a:Point,b:Point):number{
 if(!c.box)return pointSegment(c,a,b)-c.r;
 const p=local(c,a),q=local(c,b),{halfX:x,halfY:y}=c.box;
 let lo=0,hi=1;
 for(const [v,d,h] of [[p.x,q.x-p.x,x],[p.y,q.y-p.y,y]]){
  if(Math.abs(d!)<1e-12){if(Math.abs(v!)>h!){lo=1;hi=0;break;}}
  else{const t1=(-h!-v!)/d!,t2=(h!-v!)/d!;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
 }
 if(lo<=hi)return 0;
 const distance=(p:Point)=>Math.hypot(Math.max(Math.abs(p.x)-x,0),Math.max(Math.abs(p.y)-y,0));
 return Math.min(distance(p),distance(q),...[-x,x].flatMap(x=>[-y,y].map(y=>pointSegment({x,y},p,q))));
}
export function contactPolygon(c:ContactFootprint):Point[]{
 if(!c.box)throw Error('A cylinder has no rectangle footprint');
 const {halfX,halfY,headingRad:a}=c.box,co=Math.cos(a),si=Math.sin(a);
 return [[-halfX,-halfY],[halfX,-halfY],[halfX,halfY],[-halfX,halfY]].map(([x,y])=>({x:c.x+x!*co-y!*si,y:c.y+x!*si+y!*co}));
}
export function contactTouchesPolygon(c:ContactFootprint,p:Point[],margin=0):boolean{
 if(!c.box)return pointInPolygon(c.x,c.y,p) || distanceToPolygon(c.x,c.y,p)<c.r+margin;
 return pointInPolygon(c.x,c.y,p) || contactPolygon(c).some(q=>pointInPolygon(q.x,q.y,p)) || p.some((a,i)=>segmentContactDistance(c,a,p[(i+1)%p.length]!)<=margin);
}
