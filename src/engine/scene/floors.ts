import {z} from 'zod';
import type {Scene,SceneObject,Point} from './schema';
import {objectPlacement} from './placement';
import {contactOverlaps} from './contact-geometry';
import {queryStaticContacts} from './contacts';
import {walkingHeight,occupiedInterior} from './interiors';
import {drivingHeight} from './terrain';
import {assemblyHorizontalRadius} from './measure';
export const FLOOR_LIMITS=Object.freeze({floors:32,nodes:1024,step:4});
export const floorSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),objectId:z.string().min(1).max(128),position:z.tuple([z.number().finite().min(-64).max(64),z.number().finite().min(.1).max(128),z.number().finite().min(-64).max(64)]),size:z.tuple([z.number().finite().min(2).max(128),z.number().finite().min(2).max(128)])}).strict();
export type WalkingPoint=Point & {elevation?:number};
export interface FloorFrame {id:string;object:SceneObject;elevation:number;points:Point[];contains:(x:number,y:number,radius?:number)=>boolean}
const cache=new WeakMap<Scene,FloorFrame[]>();
/** A named floor binds to an already authored static slab, without creating another body. */
export function sceneFloors(scene:Scene):FloorFrame[]{
 const found=cache.get(scene);if(found)return found;
 const result=(scene.floors??[]).flatMap(f=>{
  const o=scene.objects.find(o=>o.id===f.objectId);if(!o || o.floor)return [];
  const [x,h,z]=f.position,[w,d]=f.size,a=o.headingRad??0,c=Math.cos(a),s=Math.sin(a),scale=o.scale;
  const point=(px:number,pz:number)=>({x:o.x+(px*c-pz*s)*scale,y:o.y+(px*s+pz*c)*scale});
  return [{id:f.id,object:o,elevation:objectPlacement(scene,o).base+h*scale,points:[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]].map(([x,z])=>point(x!,z!)),contains:(px:number,py:number,radius=0)=>{const dx=((px-o.x)*c+(py-o.y)*s)/scale,dz=((py-o.y)*c-(px-o.x)*s)/scale;return Math.abs(dx-x)+radius/scale<=w/2+.001 && Math.abs(dz-z)+radius/scale<=d/2+.001;}}];
 });cache.set(scene,result);return result;
}
export const objectFloor=(scene:Scene,o:SceneObject)=>o.floor ? sceneFloors(scene).find(f=>f.id===o.floor) : undefined;
export function floorProblems(scene:Scene):string[]{
 const issues:string[]=[],ids=new Set<string>(),reserved=new Set([...scene.objects,...scene.surfaces,...scene.streets,...scene.routes,...scene.sites,...scene.crossings,...scene.sports].map(v=>v.id));
 for(const f of scene.floors??[]){
  if(ids.has(f.id) || reserved.has(f.id))issues.push(`${f.id}: duplicate floor ID`);ids.add(f.id);
  const o=scene.objects.find(o=>o.id===f.objectId),spec=o?.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 ? o.spec : undefined,[x,y,z]=f.position,[w,d]=f.size;
  if(!o || o.floor || !spec?.interior || !spec.foundation){issues.push(`${f.id}: floor needs a static enclosing building`);continue;}
  const room=spec.interior;
  if(Math.abs(x-room.position[0])+w/2>room.size[0]/2+.001 || Math.abs(z-room.position[2])+d/2>room.size[2]/2+.001 || y<room.position[1]-.001 || (room.position[1]+room.size[1]-y)*o.scale<20)issues.push(`${f.id}: floor must fit its enclosure with 20-unit headroom above it`);
  if(!spec.contacts?.some(c=>c.size && !c.headingRad && Math.abs(c.position[0]-x)+w/2<=c.size[0]/2+.001 && Math.abs(c.position[2]-z)+d/2<=c.size[1]/2+.001 && Math.abs(c.position[1]+c.height-y)<.001))issues.push(`${f.id}: floor needs a matching full rectangle slab contact`);
 }
 for(const o of scene.objects.filter(o=>o.floor)){
  const floor=objectFloor(scene,o),spec=o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 ? o.spec : undefined;
  if(!floor || o.role!=='prop' || o.route || o.ambient || o.parked || o.behavior || !spec || spec.foundation || spec.interior || spec.grounding==='surface' || spec.rideable || spec.joints?.length || spec.body.interaction==='knockable'){issues.push(`${o.id}: floor placements need a known floor and an upright static prop without its own foundation, interior, route or controls`);continue;}
  if(!floor.contains(o.x,o.y,assemblyHorizontalRadius(spec,o.scale)))issues.push(`${o.id}: complete furnishing footprint must fit its floor`);
 }
 return issues;
}
/** Static support below a known level; the ground-height default remains unchanged. */
export function walkingSupport(scene:Scene,x:number,y:number,from:number,radius=3,step=4,ignoreId?:string,broken:readonly string[]=[]):number{
 let floor=walkingHeight(scene,x,y,radius);
 for(const c of queryStaticContacts(scene,x,y,radius))if(c.id!==ignoreId && (!c.id || !broken.includes(c.id)) && c.top<=from+step+.05 && contactOverlaps(c,x,y,radius))floor=Math.max(floor,c.top);
 return floor;
}

export const walkingDistance=(scene:Scene,a:WalkingPoint,b:WalkingPoint)=>Math.hypot(a.x-b.x,a.y-b.y,(a.elevation??walkingHeight(scene,a.x,a.y))-(b.elevation??walkingHeight(scene,b.x,b.y)));

/** View-only storey cutaway; physical support, claims and saved state never depend on it. */
export function interiorVisibility(scene:Scene,viewer:WalkingPoint){
 const h=viewer.elevation??walkingHeight(scene,viewer.x,viewer.y),room=occupiedInterior(scene,viewer.x,viewer.y,h),above=room ? sceneFloors(scene).filter(f=>f.object.id===room.object.id && f.elevation>h+.1) : [];
 return {object:(o:SceneObject)=>!!o.floor && above.some(f=>f.id===o.floor),point:(p:WalkingPoint)=>above.some(f=>(p.elevation??0)>=f.elevation-.1 && f.contains(p.x,p.y))};
}
/** Falling upper-storey fragments use the same retained building caps, with no new bodies. */
export function furnishingSupport(scene:Scene,object:SceneObject,x:number,y:number,from:number):number{
 let floor=drivingHeight(scene.terrain,x,y);const f=objectFloor(scene,object);if(!f)return floor;
 for(const c of queryStaticContacts(scene,x,y,.05))if(c.id===f.object.id && c.top<=from+.05 && contactOverlaps(c,x,y,.05))floor=Math.max(floor,c.top);
 return floor;
}

const bindings=new WeakMap<Scene,Map<string,FloorFrame>>();
export function floorBindings(scene:Scene):Map<string,FloorFrame>{let found=bindings.get(scene);if(!found){found=new Map(scene.objects.filter(o=>o.floor).flatMap(o=>{const f=objectFloor(scene,o);return f ? [[o.id,f] as const] : [];}));bindings.set(scene,found);}return found;}
