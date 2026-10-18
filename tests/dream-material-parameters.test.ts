import {describe,it,expect} from 'vitest';
import {compileDream,checkDream,formatDream} from '../src/scene/dream';
import {lex} from '../src/scene/dream-syntax';
import type {ObjectDslV2} from '../src/scene/object-dsl';
import example from '../docs/examples/material-components.dream?raw';
import people from './fixtures/city-people-materials.dream?raw';
import beforePeople from './fixtures/city-people-v38.dream?raw';

const palette='dream 2; material red(style=toon,colors=[#bb5544,#bb5544]);material blue(style=toon,colors=[#335588,#335588]);';
const block='part p(shape=box,material=finish,at=[0,5,0],size=[10,10,10]);';
const source=(components:string,body='use item(component=painted,materials=[blue]);',impact='')=>`${palette}${components}object toy(label="Toy"){body(interaction=solid,radius=10,height=20);${impact}${body}}`;
const painted=`component painted(materials=[finish]){${block}}`;

function anatomy(spec:ObjectDslV2){
  const joints=new Map(spec.joints?.map((j,i)=>[j.id,`j${i}`]));
  return {...spec,joints:spec.joints?.map(({id,parent,...joint},i)=>({...joint,id:`j${i}`,...(parent ? {parent:joints.get(parent)} : {})})),parts:spec.parts.map(({id,parent,...part},i)=>({...part,id:`p${i}`,...(parent ? {parent:joints.get(parent)} : {})}))};
}
describe('typed material parameters',()=>{
  it('reuses numeric geometry and materials through nested components and repeats',()=>{
    const [oak,blue]=compileDream(example);
    expect(oak!.parts).toHaveLength(5);expect(blue!.parts).toHaveLength(5);
    expect(oak!.parts.every(p=>p.material.shaderStyle==='wood')).toBe(true);
    expect(blue!.parts.every(p=>p.material.colorA==='#537eaa')).toBe(true);
    expect(blue!.parts.map(({material,...p})=>p)).toEqual(oak!.parts.map(({material,...p})=>p));
    expect(compileDream(formatDream(example))).toEqual(compileDream(example));
    expect(formatDream(formatDream(example))).toBe(formatDream(example));
  });
  it('resolves part, beam and voxel bindings through joint/group/fragment scopes',()=>{
    const components=`component painted(materials=[finish]){group frame(){joint hinge(){${block}beam rail(shape=box,material=finish,from=[0,1,0],to=[0,10,0],width=2,depth=2);voxels tile(material=finish,at=[0,2,0],size=[4,4,4],grid=[2,2,2]){fill full(from=[0,0,0],to=[2,2,2]);}}}}`;
    const spec=compileDream(source(components))[0]!;
    expect(spec.parts).toHaveLength(3);expect(spec.parts.every(p=>p.material.colorA==='#335588')).toBe(true);
    const broken=compileDream(source(painted,'fragment shard(){use item(component=painted,materials=[blue]);}','impact(mode=break(speed=90,scatter=50,lift=60,spin=3,lifetime=4));'))[0]!;
    expect(broken.parts[0]!.fragment).toBeTruthy();expect(broken.parts[0]!.material.colorA).toBe('#335588');
    const zoned=compileDream(source(painted,'zone panel(at=[0,0,0],radius=10,height=10,mode=break(speed=90,scatter=50,lift=60,spin=3,lifetime=4)){use item(component=painted,materials=[blue]);}use core(component=painted,materials=[red]);'))[0]!;
    expect(zoned.parts[0]!.zone).toBe(zoned.breakZones![0]!.id);expect(zoned.parts[0]!.material.colorA).toBe('#335588');
  });
  it('uses lexical bindings and resolves explicit actuals in the caller before binding the callee',()=>{
    const components=`component inner(){${block.replace('finish','red')}}component painted(materials=[red]){${block.replace('finish','red')}use other(component=inner);}`;
    expect(compileDream(source(components))[0]!.parts.map(p=>p.material.colorA)).toEqual(['#335588','#bb5544']);
    const swapped=`component inner(materials=[a,b]){${block.replace('finish','a')}${block.replace('p(','q(').replace('finish','b')}}component painted(materials=[a,b]){use nested(component=inner,materials=[b,a]);}`;
    expect(compileDream(source(swapped,'use item(component=painted,materials=[red,blue]);'))[0]!.parts.map(p=>p.material.colorA)).toEqual(['#335588','#bb5544']);
    expect(checkDream(source(`component inner(){${block}}${painted}`)).ok).toBe(false);
  });
  it('includes formal parameter names and field paths in repair diagnostics',()=>{
    const result=checkDream(source('component painted(params=[height],materials=[finish]){'+block+'}','use item(component=painted);'));
    if(result.ok)throw new Error('unexpected acceptance');
    expect(result.diagnostics[0]).toMatchObject({code:'E_ARITY',path:'dream/object:toy/use:item/args',expected:['height']});
    const material=checkDream(source(painted,'use item(component=painted);'));
    if(material.ok)throw new Error('unexpected acceptance');
    expect(material.diagnostics[0]).toMatchObject({code:'E_ARITY',path:'dream/object:toy/use:item/materials',expected:['finish']});
    const unknown=checkDream(source(painted,'use item(component=painted,materials=[missing]);'));
    if(unknown.ok)throw new Error('unexpected acceptance');
    expect(unknown.diagnostics[0]).toMatchObject({code:'E_REFERENCE',path:'dream/object:toy/use:item/materials[0]',expected:['blue','red']});
  });
  it.each([
    [painted,'use item(component=painted,materials=[red,blue]);','E_ARITY'],
    [painted,'use item(component=painted,materials=[1]);','E_TYPE'],
    [painted,'use item(component=painted,materials=[red+blue]);','E_TYPE'],
    [painted,'use item(component=painted,args=[blue],materials=[blue]);','E_REFERENCE'],
    [`component painted(materials=[finish,finish]){${block}}`,undefined,'E_PARAMETERS'],
    [`component painted(params=[finish],materials=[finish]){${block}}`,undefined,'E_PARAMETERS'],
    [`let finish(value=1);${painted}`,undefined,'E_PARAMETERS'],
    [`component painted(params=[a,b,c,d,e,f,g,h],materials=[finish]){${block}}`,undefined,'E_PARAMETERS'],
    [`component painted(materials=[finish]){use self(component=painted,materials=[finish]);}`,undefined,'E_CYCLE'],
    [painted,'repeat many(index=i,count=32){use item(component=painted,materials=[blue]);}use extra(component=painted,materials=[red]);','E_BUDGET'],
  ])('rejects bad bindings or expanded budgets (case %#)',(components,body,code)=>{
    const result=checkDream(source(components!,body));
    if(result.ok)throw new Error('unexpected acceptance');expect(result.diagnostics[0]!.code).toBe(code);expect(result).not.toHaveProperty('world');
  });
  it('preserves existing numeric shadowing and permits eight combined formals',()=>{
    const numeric=`let h(value=99);component painted(params=[h],materials=[a,b,c,d,e,f,g]){${block.replace('finish','a').replace('size=[10,10,10]','size=[h,10,10]')}}`;
    expect(compileDream(source(numeric,'use item(component=painted,args=[6],materials=[blue,red,red,red,red,red,red]);'))[0]!.parts[0]!.size).toEqual([6,10,10]);
  });
  it('keeps the historical civic material refactor equivalent to its unparameterized source',()=>{
    const before=compileDream(beforePeople),after=compileDream(people).filter(s=>before.some(original=>original.displayName===s.displayName));
    expect(after.map(anatomy)).toEqual(before.map(anatomy));
    expect(after.map(a=>[a.parts.length,a.joints!.length])).toEqual([[25,12],[25,12],[25,12],[25,12]]);
    expect(after[0]!.parts[0]!.id).not.toBe(before[0]!.parts[0]!.id);
    const originalFour=people;
    expect(compileDream(originalFour).map(anatomy)).toEqual(before.map(anatomy));
    expect(originalFour.length).toBeLessThan(beforePeople.length*.5);
    expect(lex(originalFour).length).toBeLessThan(lex(beforePeople).length*.5);
  });
});
