import {afterAll,it,expect} from 'vitest';
import {Euler,Matrix4,Quaternion,Ray,Triangle,Vector3} from 'three';
import {compileDreamWorld,compileDream} from '../src/scene/dream';
import {worldSource,worldModules} from '../src/scene/world-fixture';
import {partGeometry} from '../src/scene/object-geometry';
import type {ObjectPart} from '../src/scene/object-dsl';
import example from '../docs/examples/plant-construction.dream?raw';
const library=compileDreamWorld(worldSource,worldModules).assemblies,spec=(name:string)=>library.find(s=>s.displayName===name)!;
const transform=(p:ObjectPart)=>new Matrix4().compose(new Vector3(...p.position),new Quaternion().setFromEuler(new Euler(...(p.rotation??[0,0,0]))),new Vector3(...p.size));
const point=(p:ObjectPart,x:number,y:number,z:number)=>new Vector3(x,y,z).applyMatrix4(transform(p));
const geometries=new Map<ObjectPart,ReturnType<typeof partGeometry>>(),geometry=(p:ObjectPart)=>{let g=geometries.get(p);if(!g){g=partGeometry(p,1);geometries.set(p,g);}return g;};
afterAll(()=>geometries.forEach(g=>g.dispose()));
function intersections(p:ObjectPart,origin:Vector3,direction:Vector3){
 const inverse=transform(p).invert(),ray=new Ray(origin.clone().applyMatrix4(inverse),direction.clone().transformDirection(inverse)),g=geometry(p),vertices=g.getAttribute('position'),index=g.index,hits:number[]=[],triangle=new Triangle(),hit=new Vector3();
 for(let i=0;i<(index?.count??vertices.count);i+=3){const at=(j:number)=>new Vector3().fromBufferAttribute(vertices,index?index.getX(j):j);triangle.set(at(i),at(i+1),at(i+2));if(ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,hit))hits.push(hit.clone().applyMatrix4(transform(p)).distanceTo(origin));}
 return [...new Set(hits.map(n=>Math.round(n*1e6)))];
}
function contains(p:ObjectPart,world:Vector3){
 const local=world.clone().applyMatrix4(transform(p).invert()),g=geometry(p),vertices=g.getAttribute('position'),index=g.index,triangle=new Triangle(),nearest=new Vector3();
 for(let i=0;i<(index?.count??vertices.count);i+=3){const at=(j:number)=>new Vector3().fromBufferAttribute(vertices,index?index.getX(j):j);triangle.set(at(i),at(i+1),at(i+2));if(triangle.closestPointToPoint(local,nearest).distanceTo(local)<2e-6)return true;}
 return intersections(p,world,new Vector3(.137,.923,.361).normalize()).length%2===1;
}
const leaf=(p:ObjectPart)=>p.shape==='prism'&&p.outline?.length===6&&p.outline[0]?.[1]===.5;
it('roots every pointed leaf in its stem, center or planted soil instead of floating beside it',()=>{
 for(const s of library.filter(s=>s.parts.some(leaf))){const leaves=s.parts.filter(leaf),supports=s.parts.filter(p=>p.shape!=='prism');for(const p of leaves)expect(supports.some(q=>contains(q,point(p,-.5,0,0))),s.displayName+': '+p.id).toBe(true);}
});
it('joins all twenty foxglove panels while leaving each flower throat open',()=>{
 const s=spec('Pink foxglove'),walls=s.parts.filter(p=>p.shape==='prism'&&p.outline?.length===4);expect(walls).toHaveLength(20);
 for(const p of walls)for(const [x,y]of [[-.5,-.5],[.5,-.5],[-.3,.5],[.3,.5]])expect(walls.some(q=>q!==p&&contains(q,point(p,x!,y!,0))),p.id+': edge').toBe(true);
 for(let i=0;i<5;i++){const panels=walls.slice(i*4,i*4+4),center=panels.reduce((v,p)=>v.add(new Vector3(...p.position)),new Vector3()).multiplyScalar(.25),origin=center.clone().add(new Vector3(0,-20,0));expect(panels.every(p=>intersections(p,origin,new Vector3(0,1,0)).length===0)).toBe(true);}
});
it('retains a real pot opening and a continuous rim through voxel reconstruction',()=>{
 const s=spec('Planted street tub'),rim=s.parts.filter(p=>p.shape==='prism'&&p.outline?.length===18);expect(rim).toHaveLength(2);
 expect(rim.every(p=>intersections(p,new Vector3(0,20,0),new Vector3(0,-1,0)).length===0)).toBe(true);
 const soil=s.parts.find(p=>p.material.colorA==='#514b3c')!,tub=s.parts.find(p=>p.shape==='cylinder'&&p.material.colorA==='#ac6b51')!,origin=new Vector3(0,20,0),down=new Vector3(0,-1,0);expect(Math.min(...intersections(soil,origin,down))).toBeLessThan(Math.min(...intersections(tub,origin,down)));
 for(let i=0;i<16;i++){const a=i*Math.PI/8,origin=new Vector3(Math.cos(a)*5,20,Math.sin(a)*5);expect(rim.some(p=>intersections(p,origin,new Vector3(0,-1,0)).length>0),'rim '+i).toBe(true);}
});
it('supports shrub forks, hanging catkins and hydrangea centers on their actual material surfaces',()=>{
 const shrub=spec('Wild shrub'),branches=shrub.parts.filter(p=>p.shape==='cylinder');for(const p of branches.slice(1))expect(branches.some(q=>q!==p&&contains(q,point(p,0,-.5,0))),p.id+': fork root').toBe(true);
 const hazel=spec('Hazel thicket'),twigs=hazel.parts.filter(p=>p.shape==='cylinder'&&p.taper===.3),crowns=hazel.parts.filter(p=>p.shape==='icosphere'),catkins=hazel.parts.filter(p=>p.shape==='cylinder'&&p.material.colorA==='#d9aa45');expect(twigs).toHaveLength(4);for(const p of twigs){expect(crowns.some(q=>contains(q,point(p,0,-.5,0)))).toBe(true);expect(catkins.some(q=>contains(q,point(p,0,.5,0)))).toBe(true);}
 const hydrangea=spec('Blue hydrangea'),blossoms=hydrangea.parts.filter(p=>p.shape==='prism'&&p.outline?.length===16),hubs=hydrangea.parts.filter(p=>p.shape==='cylinder'&&p.material.colorA==='#789451'),centers=hydrangea.parts.filter(p=>p.material.colorA==='#d7dccb');expect(centers).toHaveLength(8);for(const p of centers)expect(blossoms.some(q=>contains(q,point(p,0,-.5,0)))).toBe(true);for(const p of blossoms)expect(hubs.some(q=>contains(q,point(p,0,0,.5))),p.id+': flower root').toBe(true);
});
it('keeps the complete four-plant example identical to the live definitions',()=>{
 for(const actual of compileDream(example)){const {voxelSize,...live}=spec(actual.displayName);expect(actual).toEqual(live);}
});
