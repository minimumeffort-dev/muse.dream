import {it,expect} from 'vitest';
import {Vector3,Mesh,MeshBasicMaterial,Raycaster} from 'three';
import {compileDream,checkDream,formatDream} from '../src/scene/dream';
import {objectDslSchema,type ObjectPart} from '../src/scene/object-dsl';
import {partGeometry} from '../src/scene/object-geometry';

const source=(shape='icosphere',extra='')=>`dream 2;
material leaf(style=toon,colors=[#648553,#4d714c]);
component crown(materials=[coat]) { part foliage(shape=${shape},material=coat,at=[0,8,0],size=[8,12,6],faceted=true${extra}); }
object tree(label="Faceted study") {body(interaction=decor,radius=4,height=14);group stem(rot_deg=[0,30,0]){use top(component=crown,materials=[leaf]);}}
`;
it('preserves explicit facets through components, formatting and strict object data',()=>{
 for(const shape of ['icosphere','cone','cylinder']){
  const spec=compileDream(source(shape))[0]!;expect(spec.parts[0]).toHaveProperty('faceted',true);
  expect(compileDream(formatDream(source(shape)))).toEqual([spec]);expect(objectDslSchema.parse(spec)).toEqual(spec);
 }
 const beam=source('cylinder').replace('part foliage(shape=cylinder','beam foliage(shape=cylinder').replace('at=[0,8,0],size=[8,12,6]','from=[0,0,0],to=[0,12,0],width=2,depth=2');
 expect(compileDream(beam)[0]!.parts[0]).toHaveProperty('faceted',true);
});
it('retains exact polygonal faces, envelopes, apertures and owned channels in voxel stamps',()=>{
 for(const shape of ['icosphere','cone','cylinder']){
  const part=compileDream(source(shape))[0]!.parts[0]!,raw=partGeometry(part),a=partGeometry(part,1),b=partGeometry(part,1);
  raw.computeBoundingBox();a.computeBoundingBox();expect(a.boundingBox!.min.toArray()).toEqual(raw.boundingBox!.min.toArray());expect(a.boundingBox!.max.toArray()).toEqual(raw.boundingBox!.max.toArray());
  expect(a.getAttribute('position').count).toBeLessThanOrEqual(raw.getAttribute('position').count+(raw.index?.count??0));
  const normals=a.getAttribute('normal');for(let i=0;i<normals.count;i+=3){const normal=new Vector3().fromBufferAttribute(normals,i);expect(normal.length()).toBeCloseTo(1,6);for(let j=1;j<3;j++)expect(new Vector3().fromBufferAttribute(normals,i+j).distanceTo(normal)).toBeLessThan(1e-6);}
  expect(a.getAttribute('position').array).not.toBe(b.getAttribute('position').array);expect(a.getAttribute('uv').array).not.toBe(b.getAttribute('uv').array);
  expect(a.userData.voxel.surface).toBe('planar');raw.dispose();a.dispose();b.dispose();
 }
 const part=compileDream(source())[0]!.parts[0]!,geometry=partGeometry({...part,size:[.2,.2,.2]},1),mesh=new Mesh(geometry,new MeshBasicMaterial());mesh.updateMatrixWorld();
 expect(new Raycaster(new Vector3(0,0,2),new Vector3(0,0,-1)).intersectObject(mesh)).not.toHaveLength(0);
 expect(new Raycaster(new Vector3(.49,.49,2),new Vector3(0,0,-1)).intersectObject(mesh)).toHaveLength(0);geometry.dispose();
});
it('keeps ordinary curved stamps byte-identical when the option is false or omitted',()=>{
 const part=compileDream(source())[0]!.parts[0]!,{faceted,...plain}=part as typeof part&{faceted?:boolean};
 for(const cell of [undefined,1]){const a=partGeometry(plain as ObjectPart,cell),b=partGeometry({...plain,faceted:false} as ObjectPart,cell);for(const key of ['position','normal','uv'])expect(a.getAttribute(key).array).toEqual(b.getAttribute(key).array);a.dispose();b.dispose();}
});
it('rejects unsupported shapes, deformed facets, malformed flags and legacy data with useful paths',()=>{
 for(const shape of ['box','sphere','capsule','torus','pyramid']){const result=checkDream(source(shape));expect(result.ok).toBe(false);if(!result.ok){expect(result.diagnostics[0]!.path).toContain('part:foliage');expect(result.diagnostics[0]!.message).toContain('parts.0.faceted');}}
 expect(checkDream(source('icosphere',',deform=deform(seed=1,amount=.1)')).ok).toBe(false);
 expect(checkDream(source('icosphere',',deform=deform(seed=1,amount=0)')).ok).toBe(true);
 for(const value of ['1','"true"'])expect(checkDream(source().replace('faceted=true','faceted='+value)).ok).toBe(false);
 const spec=compileDream(source())[0]!,legacy={...spec,dslVersion:1};expect(objectDslSchema.safeParse(legacy).success).toBe(false);
 expect(objectDslSchema.safeParse({...legacy,parts:spec.parts.map(({faceted,...p})=>p)}).success).toBe(true);
});
