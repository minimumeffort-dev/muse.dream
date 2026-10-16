import {describe,it,expect} from 'vitest';
import {Box3,DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {checkDream,compileDream,compileDreamWorld,formatDream} from '../src/scene/dream';
import {objectDslSchema} from '../src/scene/object-dsl';
import {partGeometry} from '../src/scene/object-geometry';
import {buildObject,animateObject} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import {measuredScale} from '../src/scene/measure';

const shape=JSON.stringify([[0,0],[.3,0],[.3,.4],[.6,.4],[.6,0],[1,0],[.8,1],[.15,1]]);
const program=(outline=shape,extra='')=>`dream 2;material blue(style=toon,colors=[#426b82,#203747]);object panel(label="Panel"){measure(kind=custom,axis=x,meters=2);body(interaction=decor,radius=8,height=20);part body(shape=prism,material=blue,at=[0,10,0],size=[20,12,8],outline=${outline}${extra});}`;
const item=(spec:ReturnType<typeof compileDream>[number],scale=1)=>({id:'test',kind:'custom' as const,labelText:'Test',x:0,y:0,scale,spec});

describe('bounded extruded profiles',()=>{
  it('retains expressions, winding, formatting and complete dimensions',()=>{
    const source=program().replace('[0.3,0]','[3/10,0]'),canonical=formatDream(source);
    expect(formatDream(canonical)).toBe(canonical);expect(compileDream(canonical)).toEqual(compileDream(source));
    for(const outline of [shape,JSON.stringify(JSON.parse(shape).reverse())]){
      const spec=compileDream(program(outline))[0]!,mesh=buildObject(item(spec));
      const size=new Box3().setFromObject(mesh,true).getSize(new Vector3());
      expect(size.x).toBeCloseTo(20);expect(size.y).toBeCloseTo(12);expect(size.z).toBeCloseTo(8);
      expect(measuredScale(spec)).toBeCloseTo(1);
      const geometry=partGeometry(spec.parts[0]!);
      expect([...geometry.getAttribute('normal').array].every(Number.isFinite)).toBe(true);
      const solid=new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));solid.scale.set(20,12,8);solid.updateMatrixWorld(true);
      // The concave opening really passes through both faces of the extrusion.
      expect(new Raycaster(new Vector3(-1,-4,20),new Vector3(0,0,-1)).intersectObject(solid)).toHaveLength(0);
      expect(new Raycaster(new Vector3(-7,-4,20),new Vector3(0,0,-1)).intersectObject(solid).length).toBeGreaterThan(0);
      geometry.dispose();
    }
  });
  it('keeps transformed profile geometry and night paint intact through batching',()=>{
    const source=program().replace('part body(','group g(at=[2,3,4],rot_deg=[0,30,0],scale=1.5){part body(').replace(');}',');}part brace(shape=box,material=blue,at=[0,4,0],size=[20,2,8]);}').replace('colors=[#426b82,#203747]','colors=[#426b82,#203747],night=#f6ce86');
    const spec=compileDream(source)[0]!,raw=buildObject(item(spec)),batched=compactObject(buildObject(item(spec)));
    expect(batched.children.length).toBe(raw.children.length-1);
    expect(new Box3().setFromObject(raw,true).getSize(new Vector3()).distanceTo(new Box3().setFromObject(batched,true).getSize(new Vector3()))).toBeLessThan(.0001);
    raw.traverse(o=>{if(o instanceof Mesh)expect(o.geometry.getAttribute('nightEmission').count).toBe(o.geometry.getAttribute('position').count);});
  });
  it.each([
    '[]','[[0,0],[1,1]]','[[0,0],[1,1],[0,1],[1,0]]',
    '[[0,0],[1,0],[1,1],[0,1],[0,0]]','[[0,0],[1,0],[1,1],[1,1],[0,1]]',
    '[[0,0],[.5,0],[.3,0],[1,1],[0,1]]','[[0,0],[1.1,0],[1,1],[0,1]]',
    '[[-.1,0],[1,0],[1,1],[0,1]]','[[0,0],[.9,0],[.9,1],[0,1]]',
    '[[0,0],[1,0],[1,1/0],[0,1]]',JSON.stringify(Array.from({length:25},(_,i)=>[i/24,i%2])),
  ])('rejects malformed outline %s before geometry acceptance',outline=>{
    const result=checkDream(program(outline));expect(result.ok).toBe(false);
    if(!result.ok){expect(result.diagnostics[0]!.line).toBeGreaterThan(0);expect(result.diagnostics[0]!.code).toMatch(/^E_/);}
  });
  it('requires the outline only on prism parts, with no legacy or executable escape',()=>{
    expect(checkDream(program().replace(',outline='+shape,'' )).ok).toBe(false);
    expect(checkDream(program().replace('shape=prism','shape=box')).ok).toBe(false);
    expect(checkDream(program(shape,',script="bad"')).ok).toBe(false);
    const spec=compileDream(program())[0]!;
    expect(objectDslSchema.safeParse({...spec,dslVersion:1,measure:undefined}).success).toBe(false);
    expect(objectDslSchema.safeParse({...spec,parts:[{...spec.parts[0],outline:[[0,0],[1,1],[0,1],[1,0]]}]}).success).toBe(false);
  });
});

describe('distance-driven joint mechanisms',()=>{
  const source=`dream 2;material steel(style=toon,colors=[#aabbbb,#778888]);object axle(label="Axle"){
    body(interaction=decor,radius=8,height=20);
    group mount(at=[3,0,0],rot_deg=[0,30,0],scale=2){
      joint bearing(at=[0,5,0],rot_deg=[0,180,0],motion=roll(axis=z,radius=8)){
        part arm(shape=box,material=steel,at=[3,0,0],size=[6,1,1]);
        part pedal(shape=box,material=steel,at=[6,0,2],size=[3,1,3]);
      }
    }
  }`;
  it('rotates the entire rigid mechanism by distance, with scale-aware bearings and fixed centers under body compression',()=>{
    const spec=compileDream(source)[0]!,joint=spec.joints![0]!,raw=buildObject(item(spec,1.3)),batched=compactObject(buildObject(item(spec,1.3)));
    expect(formatDream(formatDream(source))).toBe(formatDream(source));
    expect(compileDream(formatDream(source))).toEqual([spec]);
    expect(joint.animation).toMatchObject({kind:'roll',radius:16});
    const root=raw.getObjectByName(joint.id)!,arm=raw.getObjectByName(spec.parts[0]!.id)!;
    raw.updateMatrixWorld(true);const center=root.getWorldPosition(new Vector3()),first=arm.getWorldPosition(new Vector3()),radius=first.distanceTo(center);
    for(const distance of [0,16*1.3*Math.PI/2,100]){
      animateObject(raw,1,true,distance,.5);animateObject(batched,90,true,distance,.5);
      expect(root.getWorldPosition(new Vector3()).distanceTo(center)).toBeLessThan(1e-7);
      expect(arm.getWorldPosition(new Vector3()).distanceTo(center)).toBeCloseTo(radius);
      const a=new Box3().setFromObject(raw,true),b=new Box3().setFromObject(batched,true);
      expect(a.min.distanceTo(b.min)).toBeLessThan(.0001);expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
    }
    animateObject(raw,99,false,100);expect(root.quaternion.angleTo(root.userData.jointRest.rotation)).toBeCloseTo(0);
  });
  it.each(['0','-2','33','1/0'])('rejects invalid joint bearing radius %s',radius=>{
    expect(checkDream(source.replace('radius=8)',`radius=${radius})`)).ok).toBe(false);
  });
  it('rejects time/proximity joints in furnishings and preserves specific repair diagnostics',()=>{
    const population=source+'furnish parked(objects=[axle],streets=[avenue],spacing=100,setback=4,seed=3);';
    for(const motion of ['swing(axis=z,deg=10,hz=.5,phase_deg=0)','open(axis=y,deg=90,radius=50)'])
      expect(()=>compileDreamWorld(population.replace('roll(axis=z,radius=8)',motion))).toThrow('passive static');
    const bad=checkDream(source.replace('radius=8)','radius=33)'));
    if(bad.ok)throw new Error('invalid radius accepted');
    expect(bad.diagnostics[0]!.message).toContain('animation.radius');
  });
});
