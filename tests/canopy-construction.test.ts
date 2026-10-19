import {it,expect} from 'vitest';
import {Matrix4,Quaternion,Euler,Vector3,Triangle} from 'three';
import {compileDreamWorld,compileDream} from '../src/scene/dream';
import {worldSource,worldModules} from '../src/scene/world-fixture';
import {partGeometry} from '../src/scene/object-geometry';
import type {ObjectDslV2,ObjectPart} from '../src/scene/object-dsl';
import example from '../docs/examples/faceted-canopy.dream?raw';
const library=compileDreamWorld(worldSource,worldModules).assemblies,spec=(name:string)=>library.find(s=>s.displayName===name)!;
const transform=(p:ObjectPart)=>new Matrix4().compose(new Vector3(...p.position),new Quaternion().setFromEuler(new Euler(...(p.rotation??[0,0,0]))),new Vector3(...p.size));
const endpoint=(p:ObjectPart,side:number)=>new Vector3(0,side*.5,0).applyMatrix4(transform(p));
function contains(p:ObjectPart,world:Vector3){
 const point=world.clone().applyMatrix4(transform(p).invert()),g=partGeometry(p),vertices=g.getAttribute('position'),indices=g.index,triangle=new Triangle(),normal=new Vector3();
 try{for(let i=0;i<(indices?.count??vertices.count);i+=3){const vertex=(j:number)=>new Vector3().fromBufferAttribute(vertices,indices?indices.getX(j):j);triangle.set(vertex(i),vertex(i+1),vertex(i+2));triangle.getNormal(normal);if(normal.dot(point.clone().sub(triangle.a))>1e-6)return false;}return true;}finally{g.dispose();}
}
it('embeds each new fir and pine support in its trunk and canopy',()=>{
 for(const name of ['Silver fir','Pine']){const s=spec(name),trunk=s.parts[0]!,leaves=s.parts.filter(p=>p.shape==='cone'),branches=s.parts.filter(p=>p.shape==='cylinder'&&p.taper===.35);expect(branches.length).toBeGreaterThan(1);for(const branch of branches){expect(contains(trunk,endpoint(branch,-1)),name+': root').toBe(true);expect(leaves.some(p=>contains(p,endpoint(branch,1))),name+': tip').toBe(true);}}
});
it('joins willow descending branches to supported rising branches and their leaf curtains',()=>{
 const s=spec('Weeping willow'),trunk=s.parts[0]!,rising=s.parts.filter(p=>p.taper===.4),falling=s.parts.filter(p=>p.taper===.3),leaves=s.parts.filter(p=>p.shape==='icosphere'&&p.size[1]===26&&p.size[0]<10),crown=s.parts.find(p=>p.size[0]===54)!;
 expect(s.parts).toHaveLength(32);expect(rising).toHaveLength(6);expect(falling).toHaveLength(12);expect(leaves).toHaveLength(12);
 for(const branch of rising){expect(contains(trunk,endpoint(branch,-1))).toBe(true);expect(contains(crown,endpoint(branch,1))).toBe(true);}
 for(const branch of falling){expect(rising.some(p=>contains(p,endpoint(branch,-1)))).toBe(true);expect(leaves.some(p=>contains(p,endpoint(branch,1)))).toBe(true);}
 for(const leaf of leaves){const root=new Vector3(...leaf.position);root.y+=10;expect(contains(crown,root)).toBe(true);}
});
it('keeps fruit small and puts each stalk between its canopy and fruit',()=>{
 for(const name of ['Young rowan','Old apple tree']){const s=spec(name),fruit=s.parts.filter(p=>p.material.colorA==='#ba5840'),leaves=s.parts.filter(p=>p.shape==='icosphere'&&p.size[0]>5),stems=s.parts.filter(p=>p.shape==='cylinder'&&p.size[0]<=.12);expect(fruit.length).toBeGreaterThan(2);expect(stems.length).toBeGreaterThan(2);
  expect(fruit.every(p=>Math.max(...p.size)<1)).toBe(true);for(const stem of stems){expect(leaves.some(p=>contains(p,endpoint(stem,-1))),name+': stalk root '+endpoint(stem,-1).toArray()).toBe(true);expect(fruit.some(p=>contains(p,endpoint(stem,1))),name+': stalk tip').toBe(true);}}
});
it('keeps the complete fir example identical to the live visual definition',()=>{
 const visual=(s:ObjectDslV2)=>{const {impact,voxelSize,...rest}=s;return {...rest,parts:s.parts.map(({fragment,...p})=>p)};};expect(visual(compileDream(example)[0]!)).toEqual(visual(spec('Silver fir')));
});
