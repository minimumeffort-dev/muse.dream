import type {Scene,SceneObject} from '../scene/schema';
import type {CarState,ParkedVehicle} from './car';
import {isParkedVehicle} from '../scene/agents';
import {objectRadius} from './archetypes';
import {SpatialGrid} from './spatial';

const definitions=new WeakMap<Scene,ReturnType<typeof prepare>>();
function prepare(scene:Scene){
 const objects=scene.objects.filter(isParkedVehicle),byId=new Map(objects.map(o=>[o.id,o]));
 const reach=(o:SceneObject)=>{const s=o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 ? o.spec : undefined;return Math.max(objectRadius(o),...(s?.contacts??[]).map(c=>(Math.hypot(c.position[0],c.position[2])+(c.radius??Math.hypot(...c.size!)/2))*o.scale));};
 return {byId,grid:new SpatialGrid(objects),reach:Math.max(0,...objects.map(reach)),states:new WeakMap<CarState['vehicles'],{byId:Map<string,ParkedVehicle>;grid:SpatialGrid<ParkedVehicle>}>()};
}
export function parkingDefinitions(scene:Scene){let data=definitions.get(scene);if(!data){data=prepare(scene);definitions.set(scene,data);}return data;}
/** Vehicles arrays change only at ownership/parking transitions, not at each physics tick. */
export function parkingState(scene:Scene,vehicles:CarState['vehicles']){
 const data=parkingDefinitions(scene);let value=data.states.get(vehicles);
 if(!value){const poses=vehicles.filter(v=>v.id!==null && data.byId.has(v.id));value={byId:new Map(poses.map(v=>[v.id!,v])),grid:new SpatialGrid(poses)};data.states.set(vehicles,value);}
 return value;
}
export function nearbyParking(scene:Scene,state:CarState,radius:number):SceneObject[]{
 const d=parkingDefinitions(scene),moved=parkingState(scene,state.vehicles),out=d.grid.query(state.x,state.y,radius+d.reach).filter(o=>!moved.byId.has(o.id));
 return [...out,...moved.grid.query(state.x,state.y,radius+d.reach).map(v=>d.byId.get(v.id!)!)];
}
