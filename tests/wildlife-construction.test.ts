import {afterAll,it,expect} from 'vitest';
import {Box3,DoubleSide,Mesh,Raycaster,Vector3} from 'three';
import {compileDream,compileDreamWorld} from '../src/scene/dream';
import {worldSource,worldModules} from '../src/scene/world-fixture';
import {buildObject} from '../src/game/world3d';
import example from '../docs/examples/wildlife-construction.dream?raw';
const names=['City pigeon','River gull','Roe deer','Meadow hare','Copper fox','Red kite','Neighborhood dog','Garden cat','Perched sparrow'],library=compileDreamWorld(worldSource,worldModules).assemblies;
const models=names.map(name=>{const spec=library.find(s=>s.displayName===name)!,group=buildObject({id:'review',kind:'custom',labelText:name,x:0,y:0,scale:1,spec:{...spec,voxelSize:1}});group.updateMatrixWorld(true);group.traverse(m=>{if(m instanceof Mesh)for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.side=DoubleSide;});return {spec,group,parts:spec.parts.map(p=>group.getObjectByName(p.id)!),boxes:spec.parts.map(p=>new Box3().setFromObject(group.getObjectByName(p.id)!,true))};});
afterAll(()=>models.forEach(({group})=>group.traverse(m=>{if(m instanceof Mesh){m.geometry.dispose();for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();}})));
it('keeps the complete nine-animal example identical to every live definition',()=>{
 const actual=compileDream(example);expect(actual).toHaveLength(9);for(const s of actual){const {voxelSize,...live}=models.find(m=>m.spec.displayName===s.displayName)!.spec;expect(s).toEqual(live);}
});
it.each(names)('keeps the voxel %s parts joined at the rest pose',name=>{
 const {spec,boxes}=models.find(m=>m.spec.displayName===name)!,connected=new Set([0]);let changed=true;
 while(changed){changed=false;for(let i=0;i<boxes.length;i++)if(!connected.has(i)&&[...connected].some(j=>boxes[i]!.clone().expandByScalar(.025).intersectsBox(boxes[j]!))){connected.add(i);changed=true;}}
 expect(connected.size).toBe(spec.parts.length);expect(spec.parts.length).toBeLessThanOrEqual(32);expect(spec.joints?.length??0).toBeLessThanOrEqual(12);
});
it.each(names)('keeps both eyes of %s visible from its front quarters',name=>{
 const {spec,group,parts}=models.find(m=>m.spec.displayName===name)!,eyes=spec.parts.flatMap((p,i)=>p.shape==='icosphere'&&['#343e39','#d5aa54','#35464c'].includes(p.material.colorA)&&p.size[0]<=2&&p.size[1]<=2?[i]:[]);expect(eyes).toHaveLength(2);
 for(const i of eyes){const center=parts[i]!.getWorldPosition(new Vector3()),direction=new Vector3(1,.25,Math.sign(center.z)||1).normalize(),origin=center.clone().addScaledVector(direction,30),hits=new Raycaster(origin,direction.negate()).intersectObject(group,true);expect(hits.length).toBeGreaterThan(0);const visible=spec.parts.find(p=>p.id===hits[0]!.object.name)!;expect(['#343e39','#d5aa54','#35464c']).toContain(visible.material.colorA);}
});
