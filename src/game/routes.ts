import * as THREE from "three";
import type { Scene } from "../scene/schema";
import { routePath,routePoint } from "../scene/routes";
import { drivingHeight } from "../scene/terrain";
import { surfaceGeometry } from "./surface";
import { toonMaterial } from "./shaders";

/** Static route infrastructure uses the same sampled centerline as the moving vehicles. */
export function buildRoutes(scene:Scene):THREE.Group {
  const group=new THREE.Group();group.name="world-routes";
  for(const route of scene.routes){
    if(route.kind==="water")continue;
    const path=routePath(route),count=Math.ceil(path.length/10),frames=Array.from({length:count+1},(_,i)=>{
      const distance=i/count*path.length,p=routePoint(route,distance),a=routePoint(route,distance-8),b=routePoint(route,distance+8),n=Math.hypot(b.x-a.x,b.y-a.y)||1;
      return {...p,nx:-(b.y-a.y)/n,ny:(b.x-a.x)/n};
    });
    const polygons=frames.slice(1).map((b,i)=>{const a=frames[i]!,w=route.kind==="air" ? 30 : route.kind==="rail" ? 20 : 14;
      return [{x:a.x+a.nx*w,y:a.y+a.ny*w},{x:b.x+b.nx*w,y:b.y+b.ny*w},{x:b.x-b.nx*w,y:b.y-b.ny*w},{x:a.x-a.nx*w,y:a.y-a.ny*w}];});
    if(route.kind==="air")polygons.splice(Math.ceil(180/10));
    const ground=new THREE.Mesh(surfaceGeometry(scene,polygons,.7),toonMaterial(route.kind==="rail" ? "#7f8270" : route.kind==="air" ? "#717c75" : "#b19c71"));
    ground.receiveShadow=true;group.add(ground);
    if(route.kind!=="rail")continue;
    const ties:THREE.Matrix4[]=[],rails:THREE.Matrix4[]=[],transform=new THREE.Object3D();
    const point=(x:number,y:number,lift:number)=>new THREE.Vector3(x-scene.canonical.width/2,drivingHeight(scene.terrain,x,y)+lift,y-scene.canonical.height/2);
    for(let i=0;i<frames.length-1;i++){
      const a=frames[i]!,b=frames[i+1]!;
      for(const side of [-1,1]){
        const from=point(a.x+a.nx*12*side,a.y+a.ny*12*side,2),to=point(b.x+b.nx*12*side,b.y+b.ny*12*side,2);
        transform.position.copy(from).add(to).multiplyScalar(.5);transform.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize());
        transform.scale.set(1.5,from.distanceTo(to)+.2,1.5);transform.updateMatrix();rails.push(transform.matrix.clone());
      }
      if(i%2===0){transform.position.copy(point(a.x,a.y,1));transform.rotation.set(0,-Math.atan2(b.y-a.y,b.x-a.x),0);transform.scale.set(4,1.5,34);transform.updateMatrix();ties.push(transform.matrix.clone());}
    }
    for(const [matrices,color] of [[ties,"#755a44"],[rails,"#9eaba5"]] as const){
      const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),toonMaterial(color),matrices.length);
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
    }
  }
  return group;
}
