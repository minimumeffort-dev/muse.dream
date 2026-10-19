import {afterAll,it,expect} from 'vitest';
import {Box3,DoubleSide,Mesh,Object3D,Raycaster,Vector3} from 'three';
import {compileDream,compileDreamWorld} from '../src/scene/dream';
import {worldSource,worldModules} from '../src/scene/world-fixture';
import {buildObject} from '../src/game/world3d';
import example from '../docs/examples/furniture-construction.dream?raw';
const names=['Slatted park bench','Breakaway table','Produce crate','Terracotta planter','Produce stall'],library=compileDreamWorld(worldSource,worldModules).assemblies;
const models=names.map(name=>{const spec=library.find(s=>s.displayName===name)!,group=buildObject({id:'review',kind:'custom',labelText:name,x:0,y:0,scale:1,spec:{...spec,voxelSize:1}});group.updateMatrixWorld(true);group.traverse(m=>{if(m instanceof Mesh)for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.side=DoubleSide;});return {spec,group,parts:spec.parts.map(p=>group.getObjectByName(p.id)!),boxes:spec.parts.map(p=>new Box3().setFromObject(group.getObjectByName(p.id)!,true))};});
afterAll(()=>models.forEach(({group})=>group.traverse(m=>{if(m instanceof Mesh){m.geometry.dispose();for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();}})));
const model=(name:string)=>models.find(m=>m.spec.displayName===name)!;
const hits=(part:Object3D,at:Vector3,direction:Vector3)=>new Raycaster(at,direction).intersectObject(part,true);
it('keeps the complete five-object Dream example identical to the live library',()=>{
 const examples=compileDream(example);expect(examples).toHaveLength(5);for(const actual of examples){const {voxelSize,...live}=model(actual.displayName).spec;expect(actual).toEqual(live);}
});
it.each(names)('keeps every constructed %s part attached after voxel reconstruction',name=>{
 const {spec,boxes}=model(name),connected=new Set([0]);let changed=true;
 while(changed){changed=false;for(let i=0;i<boxes.length;i++)if(!connected.has(i)&&[...connected].some(j=>boxes[i]!.clone().expandByScalar(.025).intersectsBox(boxes[j]!))){connected.add(i);changed=true;}}
 expect(connected.size).toBe(spec.parts.length);expect(spec.parts.length).toBeLessThanOrEqual(32);
});
it('supports every apple on the floor or two contacting fruit surfaces, including the visible top row',()=>{
 const {spec,parts,boxes}=model('Produce crate'),indices=spec.parts.flatMap((p,i)=>p.shape==='icosphere'?[i]:[]);expect(indices).toHaveLength(12);
 for(let i=0;i<12;i+=4){for(const k of [0,1])expect(boxes[indices[i+k]!]!.min.y).toBeCloseTo(boxes[0]!.max.y,4);
  for(const [a,b]of [[i,i+2],[i+1,i+2],[i+2,i+3]]){const ia=indices[a!]!,ib=indices[b!]!,ca=new Vector3(...spec.parts[ia]!.position),cb=new Vector3(...spec.parts[ib]!.position),dir=cb.clone().sub(ca).normalize();const ra=hits(parts[ia]!,ca,dir)[0]!.distance,rb=hits(parts[ib]!,cb,dir.clone().negate())[0]!.distance;expect(ca.distanceTo(cb)-ra-rb).toBeLessThan(.025);}
 }
});
it('keeps the clay shell and bottom closed around a real opening with exposed soil',()=>{
 const {spec,parts}=model('Terracotta planter'),rim=parts.filter((_,i)=>spec.parts[i]!.outline?.length===18),shell=parts.filter((_,i)=>spec.parts[i]!.material.colorA==='#b86747'),down=new Vector3(0,-1,0);
 expect(rim).toHaveLength(2);expect(rim.every(p=>hits(p,new Vector3(0,50,0),down).length===0)).toBe(true);
 for(let i=0;i<32;i++){const a=i*Math.PI/16,radial=new Vector3(Math.cos(a),0,Math.sin(a));for(const y of [2.5,13,24])expect(shell.some(p=>hits(p,radial.clone().multiplyScalar(30).setY(y),radial.clone().negate()).length>0),'shell '+i+'/'+y).toBe(true);expect(rim.some(p=>hits(p,radial.clone().multiplyScalar(16.5).setY(50),down).length>0),'lip '+i).toBe(true);}
 const soil=parts[spec.parts.findIndex(p=>p.material.colorA==='#584832')]!;expect(hits(soil,new Vector3(4,50,0),down)[0]!.point.y).toBeCloseTo(25,4);
});
it('supports the middle tabletop plank and keeps the authored sitting surface on the bench slats',()=>{
 const table=model('Breakaway table'),down=new Vector3(0,-1,0);for(const x of [-21,21])expect(table.parts.slice(3).some(p=>hits(p,new Vector3(x,15.21,0),down).some(h=>Math.abs(h.point.y-15.2)<.02))).toBe(true);
 const bench=model('Slatted park bench');for(const seat of bench.spec.seats!)expect(bench.parts.some(p=>hits(p,new Vector3(...seat.position).add(new Vector3(0,.1,0)),down).some(h=>Math.abs(h.point.y-seat.position[1])<.02))).toBe(true);
});
