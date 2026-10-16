import * as THREE from "three";
import {describe,it,expect} from "vitest";
import {compileDreamWorld} from "../src/scene/dream";
import {buildObject,animateObject} from "../src/game/world3d";
import {compactObject} from "../src/game/compact-object";
import {freezeStatic} from "../src/game/batching";
import {partGeometry} from "../src/scene/object-geometry";

const spec=compileDreamWorld(`dream 2;
material red(style=toon,colors=[#ac4532,#ffffff]);
material blue(style=toon,colors=[#3456a8,#000000]);
material wood(style=grain,colors=[#845a34,#ffffff]);
material stone(style=grain,colors=[#778888,#ffffff]);
material light(style=glow,colors=[#ffcc44,#ffffff]);
material flag(style=cloth,colors=[#aa5544,#ffffff]);
material stripe(style=stripes,colors=[#ddeeff,#667788]);
object painted(label="Paint test"){
  body(interaction=solid,radius=20,height=40);
  part a(shape=box,material=red,at=[-12,12,0],size=[10,24,8]);
  part b(shape=sphere,material=blue,at=[12,12,0],size=[10,10,10]);
  part c(shape=box,material=wood,at=[0,28,0],size=[36,4,8]);
  part d(shape=cylinder,material=stone,at=[0,7,0],size=[6,14,6]);
  part e(shape=sphere,material=light,at=[0,36,0],size=[6,6,6]);
  part f(shape=box,material=flag,at=[0,36,8],size=[8,4,1]);
  part g(shape=box,material=stripe,at=[0,32,0],size=[6,4,6]);
}`).assemblies[0]!;
const object={id:"paint",kind:"custom" as const,labelText:"Paint test",x:0,y:0,scale:1.3,spec};

function surface(root:THREE.Group){
  root.updateMatrixWorld(true);const result:number[][]=[];
  root.traverse(node=>{
    if(!(node instanceof THREE.Mesh) || !node.geometry.hasAttribute("color"))return;
    const geometry=node.geometry,position=geometry.getAttribute("position"),normal=geometry.getAttribute("normal"),uv=geometry.getAttribute("uv"),color=geometry.getAttribute("color");
    const normals=new THREE.Matrix3().getNormalMatrix(node.matrixWorld);
    for(let i=0;i<(geometry.index?.count??position.count);i++){
      const j=geometry.index?.getX(i)??i;
      result.push([...new THREE.Vector3().fromBufferAttribute(position,j).applyMatrix4(node.matrixWorld).toArray(),
        ...new THREE.Vector3().fromBufferAttribute(normal,j).applyMatrix3(normals).normalize().toArray(),uv.getX(j),uv.getY(j),color.getX(j),color.getY(j),color.getZ(j)]);
    }
  });
  const key=(v:number[])=>v.map(x=>Math.round(x*1000)).join(",");
  return result.sort((a,b)=>key(a).localeCompare(key(b)));
}

describe("render batching without geometry or material loss",()=>{
  it("stores the original linear paint at every vertex and retains special material behavior",()=>{
    const raw=buildObject(object);
    for(const part of spec.parts){
      const mesh=raw.getObjectByName(part.id) as THREE.Mesh,source=partGeometry(part);
      for(const attribute of ["position","normal","uv"])expect(mesh.geometry.getAttribute(attribute).array).toEqual(source.getAttribute(attribute).array);
      const material=mesh.material as THREE.MeshToonMaterial,color=new THREE.Color(part.material.colorA);
      if(["toon","paper-grain"].includes(part.material.shaderStyle)){
        const paint=mesh.geometry.getAttribute("color"),expected=new Float32Array(color.toArray());
        expect(paint.count).toBe(mesh.geometry.getAttribute("position").count);
        expect(Array.from(paint.array).every((v,i)=>v===expected[i%3])).toBe(true);
        expect(material.color.toArray()).toEqual([1,1,1]);expect(material.vertexColors).toBe(true);
      }else{
        expect(mesh.geometry.hasAttribute("color")).toBe(false);
        expect(material.color.toArray()).toEqual(part.material.shaderStyle==="glow" ? color.multiplyScalar(.35).toArray() : color.toArray());
      }
      source.dispose();
    }
  });
  it("combines colors while preserving every painted vertex, normal and UV through rotation and suspension",()=>{
    const raw=buildObject(object),batched=compactObject(buildObject(object));
    expect(batched.children.length).toBe(raw.children.length-2);
    for(const compression of [0,1.5]){
      for(const group of [raw,batched]){group.rotation.set(.2,.7,-.3);group.position.set(150,46,-300);animateObject(group,1.7,true,21,compression);}
      const a=surface(raw),b=surface(batched);expect(b.length).toBe(a.length);
      let error=0;for(let i=0;i<a.length;i++)for(let j=0;j<a[i]!.length;j++)error=Math.max(error,Math.abs(a[i]![j]!-b[i]![j]!));
      expect(error).toBeLessThan(.0001);
    }
    for(const style of ["cloth","stripes"])expect(batched.children.some(p=>p.userData.materialStyle===style)).toBe(true);
  });
  it("keeps fixed geometry resident and correctly placed while nearby dynamic objects move",()=>{
    const scene=new THREE.Scene(),fixed=buildObject(object),moving=buildObject({...object,id:"moving"});
    fixed.position.set(137,80,-74);fixed.rotation.y=.8;scene.add(fixed,moving);freezeStatic(fixed);
    const matrices:THREE.Matrix4[]=[];fixed.traverse(n=>matrices.push(n.matrixWorld.clone()));
    const bounds=new THREE.Box3().setFromObject(fixed),children=fixed.children.slice();scene.matrixWorldAutoUpdate=false;
    for(let i=0;i<5;i++){
      moving.position.x=i*100;animateObject(moving,i);scene.updateMatrixWorld();
      let j=0;fixed.traverse(n=>expect(n.matrixWorld.toArray()).toEqual(matrices[j++]!.toArray()));
      expect(new THREE.Box3().setFromObject(fixed)).toEqual(bounds);
      expect(fixed.children).toEqual(children);expect(moving.matrixWorld.elements[12]).toBe(i*100);
    }
  });
});
