import {isActor} from './agents';
import type { Scene, SceneObject } from "./schema";
import { objectHeight,archetypeOf } from "../sim/archetypes";
import { objectPlacement } from "./placement";
import { bridgeRails } from "./terrain";
import { SpatialGrid } from "../sim/spatial";

export interface Contact {id?:string;zoneId?:string;x:number;y:number;r:number;bottom:number;top:number}
const compiled=new WeakMap<Scene,{objects:Map<string,SceneObject>;solids:SpatialGrid<Contact>;maxRadius:number}>();
/** Car and prop collision share one immutable broad phase per accepted revision. */
export function sceneContacts(scene:Scene){
  let data=compiled.get(scene);if(data)return data;
  const contacts=scene.objects.filter(o=>!isActor(o) && archetypeOf(o).interaction==="solid").flatMap(o=>objectContacts(scene,o))
    .concat(bridgeRails(scene.terrain));
  data={objects:new Map(scene.objects.map(o=>[o.id,o])),solids:new SpatialGrid(contacts),maxRadius:Math.max(0,...contacts.map(c=>c.r))};compiled.set(scene,data);return data;
}
/** Authored cylinders, independent of visual mesh geometry. Y offsets leave passages open. */
export function objectContacts(scene:Scene,object:SceneObject,pose?:{x:number;y:number;elevation:number;headingRad:number}):Contact[] {
  const base=pose?.elevation??objectPlacement(scene,object).base,heading=pose?.headingRad??object.headingRad??0,c=Math.cos(heading),s=Math.sin(heading),x=pose?.x??object.x,y=pose?.y??object.y;
  const contacts=object.spec && "dslVersion" in object.spec && object.spec.dslVersion===2 ? object.spec.contacts : undefined;
  const foundation=object.spec && "dslVersion" in object.spec && object.spec.foundation;
  const core:Contact[]=contacts ? contacts.map(p=>({id:object.id,x:x+(p.position[0]*c-p.position[2]*s)*object.scale,y:y+(p.position[0]*s+p.position[2]*c)*object.scale,
    r:p.radius*object.scale,bottom:foundation && p.position[1]===0 ? -Infinity : base+p.position[1]*object.scale,top:base+(p.position[1]+p.height)*object.scale}))
    : [{id:object.id,x,y,r:archetypeOf(object).colliderRadius*object.scale,bottom:pose ? base : -Infinity,top:base+objectHeight(object)}];
  const zones=object.spec && "dslVersion" in object.spec && object.spec.dslVersion===2 ? object.spec.breakZones??[] : [];
  return [...core,...zones.map(p=>({id:object.id,zoneId:p.id,x:x+(p.position[0]*c-p.position[2]*s)*object.scale,y:y+(p.position[0]*s+p.position[2]*c)*object.scale,
    r:p.radius*object.scale,bottom:base+p.position[1]*object.scale,top:base+(p.position[1]+p.height)*object.scale}))];
}
