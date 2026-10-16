import * as THREE from "three";
import type { Scene } from "../scene/schema";
import { routeInfrastructure } from "../scene/routes";
import { drivingHeight } from "../scene/terrain";
import { surfaceGeometry } from "./surface";
import { toonMaterial } from "./shaders";

/** Static route infrastructure uses the same sampled centerline as the moving vehicles. */
export function buildRoutes(scene:Scene):THREE.Group {
  const group=new THREE.Group();group.name="world-routes";
  for(const route of scene.routes){
    if(["water","ambient","walk","street"].includes(route.kind))continue;
    const {frames,halfWidth:w}=routeInfrastructure(route);
    const strip=(inner:number,outer:number)=>frames.slice(1).map((b,i)=>{const a=frames[i]!;
      return [{x:a.x+a.nx*inner,y:a.y+a.ny*inner},{x:b.x+b.nx*inner,y:b.y+b.ny*inner},{x:b.x+b.nx*outer,y:b.y+b.ny*outer},{x:a.x+a.nx*outer,y:a.y+a.ny*outer}];});
    const polygons=strip(-w,w);
    if(route.kind!=="tram"){
    const ground=new THREE.Mesh(surfaceGeometry(scene,polygons,.7),toonMaterial(route.kind==="rail" ? "#7f8270" : route.kind==="air" ? "#717c75" : route.surface==="cycle" ? "#4c8079" : route.surface==="paved" ? "#707f83" : "#b19c71"));
    ground.name=`route-${route.id}`;
    ground.receiveShadow=true;group.add(ground);
    if(route.surface && route.surface!=="trail"){
      const paint=[...strip(-w+1.5,-w+2.5),...strip(w-2.5,w-1.5)];
      if(route.surface==="cycle")paint.push(...strip(-.65,.65).filter((_,i)=>frames[i]!.distance%48<24));
      const markings=new THREE.Mesh(surfaceGeometry(scene,paint,.85),toonMaterial("#ded6af"));
      markings.name=`markings-${route.id}`;markings.receiveShadow=true;group.add(markings);
    }
    }
    if(route.kind!=="rail" && route.kind!=="tram")continue;
    const ties:THREE.Matrix4[]=[],rails:THREE.Matrix4[]=[],transform=new THREE.Object3D();
    const point=(x:number,y:number,lift:number)=>new THREE.Vector3(x-scene.canonical.width/2,drivingHeight(scene.terrain,x,y)+lift,y-scene.canonical.height/2);
    for(let i=0;i<frames.length-1;i++){
      const a=frames[i]!,b=frames[i+1]!;
      for(const side of [-1,1]){
        const from=point(a.x+a.nx*(route.gauge??(route.kind==="tram" ? 14.35 : 24))/2*side,a.y+a.ny*(route.gauge??(route.kind==="tram" ? 14.35 : 24))/2*side,2),to=point(b.x+b.nx*(route.gauge??(route.kind==="tram" ? 14.35 : 24))/2*side,b.y+b.ny*(route.gauge??(route.kind==="tram" ? 14.35 : 24))/2*side,2);
        transform.position.copy(from).add(to).multiplyScalar(.5);transform.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize());
        transform.scale.set(1.5,from.distanceTo(to)+.2,1.5);transform.updateMatrix();rails.push(transform.matrix.clone());
      }
      if(route.kind==="rail" && i%2===0){transform.position.copy(point(a.x,a.y,1));transform.rotation.set(0,-Math.atan2(b.y-a.y,b.x-a.x),0);transform.scale.set(4,1.5,34);transform.updateMatrix();ties.push(transform.matrix.clone());}
    }
    for(const [matrices,color] of [[ties,"#755a44"],[rails,"#9eaba5"]] as const){
      const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),toonMaterial(color),matrices.length);
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
    }
  }
  return group;
}
