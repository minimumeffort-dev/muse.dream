import type {Scene,SceneObject,Point} from './schema';
import type {ObjectDslV2} from './object-dsl';
import {objectPlacement} from './placement';
import {drivingHeight} from './terrain';
import {queryStaticContacts} from './contacts';
import {contactOverlaps} from './contact-geometry';
export const INTERIOR_LIMITS=Object.freeze({spaces:32,portals:4});
type Interior=NonNullable<ObjectDslV2['interior']>;
export interface InteriorFrame {object:SceneObject;room:Interior;floor:number;ceiling:number;toWorld:(x:number,z:number)=>Point;toLocal:(x:number,y:number)=>Point;contains:(x:number,y:number,margin?:number)=>boolean;polygon:Point[]}
const cache=new WeakMap<Scene,InteriorFrame[]>();
/** Only static authored ground floors; rendering residency never owns their support. */
export function sceneInteriors(scene:Scene):InteriorFrame[]{
 let frames=cache.get(scene);if(frames)return frames;
 frames=scene.objects.flatMap(object=>{
  const spec=object.spec;if(!spec || !('dslVersion' in spec) || spec.dslVersion!==2 || !spec.interior)return [];
  const room=spec.interior,a=object.headingRad??0,c=Math.cos(a),s=Math.sin(a),scale=object.scale,[x,h,z]=room.position,[w,clear,d]=room.size;
  const toWorld=(x:number,z:number)=>({x:object.x+(x*c-z*s)*scale,y:object.y+(x*s+z*c)*scale});
  const toLocal=(x:number,y:number)=>({x:((x-object.x)*c+(y-object.y)*s)/scale,y:((y-object.y)*c-(x-object.x)*s)/scale});
  const floor=objectPlacement(scene,object).base+h*scale;
  return [{object,room,floor,ceiling:floor+clear*scale,toWorld,toLocal,contains:(px:number,py:number,margin=0)=>{const p=toLocal(px,py);return Math.abs(p.x-x)<=w/2-margin/scale && Math.abs(p.y-z)<=d/2-margin/scale;},polygon:[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]].map(([x,z])=>toWorld(x!,z!))}];
 });cache.set(scene,frames);return frames;
}
export function walkingHeight(scene:Scene,x:number,y:number,radius=4):number{
 let h=drivingHeight(scene.terrain,x,y);
 for(const f of sceneInteriors(scene)){
  const p=f.toLocal(x,y),[cx,,cz]=f.room.position,[w,,d]=f.room.size;
  if(Math.hypot(Math.max(0,Math.abs(p.x-cx)-w/2),Math.max(0,Math.abs(p.y-cz)-d/2))*f.object.scale<=radius)h=Math.max(h,f.floor);
 }return h;
}
export function occupiedInterior(scene:Scene,x:number,y:number,elevation:number):InteriorFrame|undefined{return sceneInteriors(scene).find(f=>f.contains(x,y) && elevation>=f.floor-1 && elevation<f.ceiling-1);}
export function portalPoints(f:InteriorFrame,p:Interior['portals'][number],reach=16):{outside:Point;inside:Point;center:Point}{
 const [x,,z]=f.room.position,[w,,d]=f.room.size,front=p.side==='front',back=p.side==='back',left=p.side==='left',along=front || back,side=front || left ? -1 : 1;
 const px=x+(along ? p.offset : side*w/2),pz=z+(along ? side*d/2 : p.offset),nx=along ? 0 : side,nz=along ? side : 0,r=reach/f.object.scale;
 return {center:f.toWorld(px,pz),outside:f.toWorld(px+nx*r,pz+nz*r),inside:f.toWorld(px-nx*r,pz-nz*r)};
}
/** Prove a standing cylinder can cross every declared opening, including floor steps/headroom. */
export function interiorProblems(scene:Scene):string[]{
 const spaces=sceneInteriors(scene),issues:string[]=[];
 if(spaces.length>INTERIOR_LIMITS.spaces)issues.push('interior space budget exceeds 32');
 for(const f of spaces){
  if(f.room.size[1]*f.object.scale<20)issues.push(`${f.object.id}: interior needs 20 units of standing headroom`);
  for(const portal of f.room.portals){
   const {inside,outside}=portalPoints(f,portal),n=16;let invalid=portal.width*f.object.scale<9 || portal.height*f.object.scale<20,last=drivingHeight(scene.terrain,outside.x,outside.y);
   for(let i=0;i<=n;i++){
    const p={x:outside.x+(inside.x-outside.x)*i/n,y:outside.y+(inside.y-outside.y)*i/n},floor=walkingHeight(scene,p.x,p.y);
    if(Math.abs(floor-last)>4.05 || queryStaticContacts(scene,p.x,p.y,4).some(c=>contactOverlaps(c,p.x,p.y,4) && c.top>floor+.05 && c.bottom<floor+18-.05))invalid=true;
    last=floor;
   }
   if(invalid)issues.push(`${f.object.id}/${portal.id}: portal needs a clear 9-unit doorway, 20-unit headroom and walkable floor steps`);
  }
 }
 return issues;
}

/** Work grounds may name a painted surface or a placed building's validated interior. */
export function workGround(scene:Scene,id:string|undefined):{points:Point[]}|undefined{return scene.surfaces.find(s=>s.id===id)??(sceneInteriors(scene).find(f=>f.object.id===id) ? {points:sceneInteriors(scene).find(f=>f.object.id===id)!.polygon} : undefined);}
