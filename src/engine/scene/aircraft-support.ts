import {Euler,Quaternion,Vector3} from 'three';
import type {Scene,SceneObject} from './schema';
import {objectSupport} from './object-support';
import {drivingHeight,terrainSurfaceHeight,waterAt} from './terrain';

const profiles=new WeakMap<SceneObject,readonly Vector3[]>();
/** Conservative underside tiles keep the terrain survey bounded, independent of mesh tessellation. */
function support(scene:Scene,object:SceneObject):readonly Vector3[]{
  let points=profiles.get(object);if(points)return points;
  const raw=objectSupport(scene,object).map(p=>p.clone().multiplyScalar(object.scale));
  const span=raw.reduce((span,p)=>Math.max(span,Math.abs(p.x)*2,Math.abs(p.z)*2),0),cell=Math.max(4,span/12);
  const tiles=new Map<string,{x0:number;x1:number;z0:number;z1:number;y:number}>();
  for(const p of raw){
    const key=`${Math.floor(p.x/cell)},${Math.floor(p.z/cell)}`,tile=tiles.get(key);
    if(tile){tile.x0=Math.min(tile.x0,p.x);tile.x1=Math.max(tile.x1,p.x);tile.z0=Math.min(tile.z0,p.z);tile.z1=Math.max(tile.z1,p.z);tile.y=Math.min(tile.y,p.y);}
    else tiles.set(key,{x0:p.x,x1:p.x,z0:p.z,z1:p.z,y:p.y});
  }
  points=[...tiles.values()].flatMap(t=>[new Vector3(t.x0,t.y,t.z0),new Vector3(t.x1,t.y,t.z0),new Vector3(t.x0,t.y,t.z1),new Vector3(t.x1,t.y,t.z1),new Vector3((t.x0+t.x1)/2,t.y,(t.z0+t.z1)/2)]);
  profiles.set(object,points);return points;
}

/** Use the same yaw, pitch and bank as the rendered aircraft, including its wheels, nose and wings. */
export function aircraftFloor(scene:Scene,object:SceneObject,pose:{x:number;y:number;headingRad:number;pitch:number;bank:number}):number{
  const rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),-pose.headingRad).multiply(new Quaternion().setFromEuler(new Euler(pose.bank,0,pose.pitch))),point=new Vector3();
  const height=(x:number,y:number)=>{
    const ground=Math.max(drivingHeight(scene.terrain,x,y),terrainSurfaceHeight(scene.terrain,x,y));
    return Math.max(ground,waterAt(scene.terrain,x,y,ground)?.level??-Infinity);
  };
  const ground=height(pose.x,pose.y);
  let floor=ground;
  for(const local of support(scene,object)){
    point.copy(local).applyQuaternion(rotation);
    floor=Math.max(floor,height(pose.x+point.x,pose.y+point.z)-point.y);
  }
  return floor-ground<1e-7 ? ground : floor;
}
