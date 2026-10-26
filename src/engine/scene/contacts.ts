import {growthScale,growthContact} from './growth';
import {isResidentActor} from './agents';
import type {CarState} from '../sim/car';
import {parkingDefinitions,parkingState} from '../sim/parking';
import type { Scene, SceneObject } from "./schema";
import { objectHeight,archetypeOf } from "../sim/archetypes";
import { objectPlacement } from "./placement";
import { bridgeRails } from "./terrain";
import {bridgeCoordinates} from './landscape-dsl';
import { SpatialGrid } from "../sim/spatial";

export interface Contact {id?:string;zoneId?:string;x:number;y:number;r:number;bottom:number;top:number;box?:{halfX:number;halfY:number;headingRad:number}}
export interface SceneContactData {sourceHash:string;contacts:Contact[]}
const compiled=new WeakMap<Scene,ReturnType<typeof prepare>>();
function prepare(scene:Scene,contacts:Contact[]){return {objects:new Map(scene.objects.map(o=>[o.id,o])),contacts,solids:new SpatialGrid(contacts),maxRadius:Math.max(0,...contacts.map(c=>c.r))};}
/** Car and prop collision share one immutable broad phase per accepted revision. */
export function sceneContacts(scene:Scene){
  let data=compiled.get(scene);if(data)return data;
  const contacts=scene.objects.filter(o=>!isResidentActor(o) && archetypeOf(o).interaction==="solid").flatMap(o=>objectContacts(scene,o))
    .concat(bridgeRails(scene.terrain));
  data=prepare(scene,contacts);compiled.set(scene,data);return data;
}
/** Host-worker bootstrap data, outside the authored scene and saved state. */
export function sceneContactData(scene:Scene):SceneContactData{return {sourceHash:scene.sourceHash,contacts:sceneContacts(scene).contacts};}
export function primeSceneContacts(scene:Scene,data:SceneContactData):void{
 const solids=scene.objects.filter(o=>!isResidentActor(o) && archetypeOf(o).interaction==='solid'),ids=new Set(solids.map(o=>o.id));
 const expected=solids.reduce((n,o)=>{const s=o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 ? o.spec : undefined;return n+(s?.contacts?.length??1)+(s?.breakZones?.length??0);},0)+(scene.terrain.landscape?.bridges??[]).filter(b=>b.rails).reduce((n,b)=>n+2*(Math.ceil(bridgeCoordinates(b,b.a.x,b.a.y).length/5)+1),0);
 if(!data || data.sourceHash!==scene.sourceHash || !Array.isArray(data.contacts) || data.contacts.length!==expected || data.contacts.some(c=>!c || ![c.x,c.y,c.r,c.top].every(Number.isFinite) || c.r<=0 || c.box!==undefined && (![c.box.halfX,c.box.halfY,c.box.headingRad].every(Number.isFinite) || c.box.halfX<=0 || c.box.halfY<=0 || Math.abs(Math.hypot(c.box.halfX,c.box.halfY)-c.r)>.001) || !(Number.isFinite(c.bottom) || c.bottom===-Infinity) || c.bottom>=c.top || c.id!==undefined && !ids.has(c.id)))throw Error('Invalid prepared scene contacts');
 compiled.set(scene,prepare(scene,data.contacts));
}
export function movedParkingContacts(scene:Scene,x:number,y:number,reach:number,state:CarState):Contact[]{
 const d=parkingDefinitions(scene),moved=parkingState(scene,state.vehicles);
 return moved.grid.query(x,y,reach+d.reach).flatMap(p=>objectContacts(scene,d.byId.get(p.id!)!,p));
}
/** The immutable seed cylinders yield to occupied/moved parking poses. */
export function queryStaticContacts(scene:Scene,x:number,y:number,reach:number,state?:CarState):Contact[]{
 const data=sceneContacts(scene),original=data.solids.query(x,y,reach+data.maxRadius),seed=state?.growing?.length ? original.map(c=>{const scale=c.id ? growthScale(scene,state,c.id) : 1;return scale===1 ? c : growthContact(c,objectPlacement(scene,data.objects.get(c.id!)!).base,scale);}) : original;if(!state || !parkingDefinitions(scene).byId.size)return seed;
 const moved=parkingState(scene,state.vehicles),active=state.control.kind==='vehicle' ? state.control.id : undefined;
 return [...seed.filter(c=>!c.id || c.id!==active && !moved.byId.has(c.id)),...movedParkingContacts(scene,x,y,reach,state)];
}
/** Authored upright contacts, independent of visual mesh geometry. Y offsets leave passages open. */
export function objectContacts(scene:Scene,object:SceneObject,pose?:{x:number;y:number;elevation:number;headingRad:number}):Contact[] {
  const base=pose?.elevation??objectPlacement(scene,object).base,heading=pose?.headingRad??object.headingRad??0,c=Math.cos(heading),s=Math.sin(heading),x=pose?.x??object.x,y=pose?.y??object.y;
  const contacts=object.spec && "dslVersion" in object.spec && object.spec.dslVersion===2 ? object.spec.contacts : undefined;
  const foundation=object.spec && "dslVersion" in object.spec && object.spec.foundation;
  const core:Contact[]=contacts ? contacts.map(p=>({id:object.id,x:x+(p.position[0]*c-p.position[2]*s)*object.scale,y:y+(p.position[0]*s+p.position[2]*c)*object.scale,
    r:(p.radius??Math.hypot(...p.size!)/2)*object.scale,...(p.size ? {box:{halfX:p.size[0]*object.scale/2,halfY:p.size[1]*object.scale/2,headingRad:heading+(p.headingRad??0)}} : {}),bottom:foundation && p.position[1]===0 ? -Infinity : base+p.position[1]*object.scale,top:base+(p.position[1]+p.height)*object.scale}))
    : [{id:object.id,x,y,r:archetypeOf(object).colliderRadius*object.scale,bottom:pose || object.floor ? base : -Infinity,top:base+objectHeight(object)}];
  const zones=object.spec && "dslVersion" in object.spec && object.spec.dslVersion===2 ? object.spec.breakZones??[] : [];
  return [...core,...zones.map(p=>({id:object.id,zoneId:p.id,x:x+(p.position[0]*c-p.position[2]*s)*object.scale,y:y+(p.position[0]*s+p.position[2]*c)*object.scale,
    r:p.radius*object.scale,bottom:base+p.position[1]*object.scale,top:base+(p.position[1]+p.height)*object.scale}))];
}
