import {describe,expect,it} from "vitest";
import {Matrix4,Mesh,MeshBasicMaterial,Raycaster,Vector3} from "three";
import {compileDream,formatDream,checkDream} from "../src/scene/dream";
import {objectDslSchema,type ObjectPart} from "../src/scene/object-dsl";
import {partGeometry} from "../src/scene/object-geometry";
import {createWorldScene} from "../src/scene/world-fixture";
import example from "../docs/examples/tapered-wood.dream?raw";
import nature from "../src/scene/world/nature.dream?raw";
import landmarks from "../src/scene/world/landmarks.dream?raw";

const scene=createWorldScene();
const assemblies=[...compileDream(nature),...compileDream(landmarks)];
const spec=(name:string)=>assemblies.find(o=>o.displayName===name)!;
const mesh=(part:ObjectPart)=>{
  const result=new Mesh(partGeometry(part),new MeshBasicMaterial());
  result.position.fromArray(part.position);result.scale.fromArray(part.size);result.rotation.set(...(part.rotation??[0,0,0]));result.updateMatrixWorld();return result;
};
const end=(part:ObjectPart,side:number)=>new Vector3(0,side*.5,0).applyMatrix4(mesh(part).matrixWorld);
const inside=(part:ObjectPart,point:Vector3)=>{
  const local=point.clone().applyMatrix4(new Matrix4().copy(mesh(part).matrixWorld).invert());
  const ray=new Raycaster(local,new Vector3(1,0,0));
  return ray.intersectObject(new Mesh(partGeometry(part),new MeshBasicMaterial({side:2}))).length>0 && Math.abs(local.x)<.5 && Math.abs(local.y)<.5 && Math.abs(local.z)<.5;
};

describe("bounded cylinder taper",()=>{
  it("preserves taper through formatting, group transforms and data validation",()=>{
    const canonical=formatDream(example);expect(formatDream(canonical)).toBe(canonical);
    const object=compileDream(example)[0]!;expect(compileDream(canonical)[0]).toEqual(object);
    expect(object.parts[0]!.taper).toBe(.38);expect(objectDslSchema.parse(object)).toEqual(object);
    const grouped=compileDream(example.replace('  beam trunk','  group scaled(scale=2,rot_deg=[0,0,30]){beam trunk').replace('  beam branch','  }\n  beam branch'))[0]!;
    expect(grouped.parts[0]!.taper).toBe(.38);
    expect(grouped.parts[0]!.size[0]).toBe(14);
    const beam=object.parts[0]!;
    expect(end(beam,-1).distanceTo(new Vector3(0,0,0))).toBeLessThan(1e-10);
    expect(end(beam,1).distanceTo(new Vector3(1,41,0))).toBeLessThan(1e-10);
  });
  it("narrows only the +Y end while preserving full XYZ dimensions and finite normals",()=>{
    const base=compileDream(example)[0]!.parts[0]!;
    for(const taper of [.1,.38,1]){
      const geometry=partGeometry({...base,taper}),positions=geometry.getAttribute('position');
      const radius=(y:number)=>Math.max(...Array.from({length:positions.count},(_,i)=>Math.abs(positions.getY(i)-y)<1e-6 ? Math.hypot(positions.getX(i),positions.getZ(i)) : 0));
      expect(radius(.5)/radius(-.5)).toBeCloseTo(taper,6);
      geometry.computeBoundingBox();expect(geometry.boundingBox!.getSize(new Vector3()).toArray()).toEqual([1,1,1]);
      expect(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
      geometry.dispose();
    }
    const defaultGeometry=partGeometry({...base,taper:undefined}),explicit=partGeometry({...base,taper:1});
    expect(defaultGeometry.getAttribute('position').array).toEqual(explicit.getAttribute('position').array);
    defaultGeometry.dispose();explicit.dispose();
  });
  it.each(['0','-.1','1.01','1/0'])("rejects invalid taper %s atomically",value=>{
    expect(checkDream(example.replace('taper=.38',`taper=${value}`)).ok).toBe(false);
  });
  it("rejects taper on other shapes and from legacy data",()=>{
    const object=compileDream(example)[0]!;
    for(const shape of ['box','capsule','cone','icosphere','sphere','pyramid','torus']){
      expect(objectDslSchema.safeParse({...object,parts:[{...object.parts[0],shape}]}).success).toBe(false);
    }
    expect(checkDream(example.replace('trunk(shape=cylinder','trunk(shape=box')).ok).toBe(false);
    for(const taper of [0,1.1,NaN,Infinity])expect(objectDslSchema.safeParse({...object,parts:[{...object.parts[0],taper}]}).success).toBe(false);
    const {measure,...legacy}=object,{taper,...legacyPart}=object.parts[0]!;
    expect(objectDslSchema.safeParse({...legacy,dslVersion:1,parts:[{...legacyPart,taper}]}).success).toBe(false);
    expect(objectDslSchema.safeParse({...legacy,dslVersion:1,parts:[legacyPart]}).success).toBe(true);
    const partSource=example.replace('beam trunk(shape=cylinder,material=bark,from=[0,0,0],to=[1,41,0],width=7,depth=6,taper=.38);','part trunk(shape=cylinder,material=bark,at=[0,20,0],size=[7,40,6],taper=.38);');
    expect(compileDream(partSource)[0]!.parts[0]!.taper).toBe(.38);
  });
});

describe("connected woodland assets",()=>{
  it.each(['Standing deadwood','Birch','Oak','Amber tree'])("roots %s's rising forks inside the trunk",name=>{
    const object=spec(name),trunk=object.parts[0]!;
    const forks=name==='Standing deadwood' ? object.parts.filter(p=>p.taper===.4) : object.parts.filter(p=>p.shape==='cylinder' && p!==trunk && end(p,-1).y>10);
    expect(forks.length).toBeGreaterThan(0);
    for(const fork of forks){
      const root=end(fork,-1),tip=end(fork,1);
      expect(tip.y-root.y).toBeGreaterThan(4);
      expect(inside(trunk,root),`${name}: floating fork`).toBe(true);
    }
    expect(object.parts.length).toBeLessThanOrEqual(32);
  });
  it("embeds the fallen log's stub in its bark and gives every placement a varied heading",()=>{
    const log=spec('Fallen log'),trunk=log.parts[0]!,stub=log.parts.find(p=>p.shape==='capsule')!;
    expect(inside(trunk,end(stub,-1))).toBe(true);
    expect(end(stub,1).y-end(stub,-1).y).toBeGreaterThan(4);
    const placements=scene.objects.filter(o=>o.spec?.displayName==='Fallen log');
    expect(placements).toHaveLength(15);
    expect(new Set(placements.map(o=>o.headingRad)).size).toBe(15);
    expect(log.measure).toEqual({kind:'custom',axis:'x',meters:3});
    expect(log.body).toEqual({interaction:'solid',colliderRadius:23,colliderHeight:16});
  });
});
