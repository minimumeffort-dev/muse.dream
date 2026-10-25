import {describe,it,expect} from 'vitest';
import {Box3} from 'three';
import {buildDamageObject} from '../src/game/damage';
import {buildObject} from '../src/game/world3d';
import {compileDream,compileDreamWorld,formatDream,checkDream} from '../src/scene/dream';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {parseScene} from '../src/scene/schema';
import {objectFragments} from '../src/scene/fragments';
import {createCarAtSpawn,stepCar,type World,type CarState} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {isBroken} from '../src/sim/impacts';
import {objectContacts} from '../src/scene/contacts';
import {repairTargets} from '../src/scene/commerce';
import {createWorldScene} from '../src/scene/world-fixture';
import {MEASURE_KINDS,measuredScale} from '../src/scene/measure';
import type {ObjectDslV2} from '../src/scene/object-dsl';
import examples from '../src/scene/impact-creations.dream?raw';
import librarySource from '../src/scene/dream-creations.dream?raw';

const rule='rule wooden_tables(kind=table,mode=break(speed=90,scatter=62,lift=100,spin=4,lifetime=6));';
const palette='dream 2;material wood(style=wood,colors=[#92613d,#bd905d]);';
const table=(id:string,width=40,extra='')=>`object ${id}(label="${id}"){measure(kind=table,axis=x,meters=1.6);body(interaction=solid,radius=15,height=22);${extra}fragment top(){part top(shape=box,material=wood,at=[0,20,0],size=[${width},4,26]);}repeat legs(index=i,count=2){fragment leg(){part leg(shape=box,material=wood,at=[i*24-12,9,0],size=[4,18,4]);}}}`;
const source=palette+rule+table('square')+table('long',50,'impact(mode=break(speed=200,scatter=0,lift=0,spin=0,lifetime=2));')+'place a(object=square,at=[400,300]);place b(object=long,at=[600,420]);';
function fixture(text=source):World{
  const compiled=compileDreamWorld(text),scene=parseScene({...createFixtureScene(),objects:compiled.objects,interactionRules:compiled.interactionRules,regions:[],terrain:{hills:[]}});
  return {scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
}
function hit(world:World,state:CarState,index:number,speed=240){
  const object=world.scene.objects[index]!,contact=objectContacts(world.scene,object)[0]!;
  state={...state,x:contact.x-contact.r-world.carRadius-.1,y:contact.y,elevation:contact.bottom,vx:speed,vy:0,headingRad:0};
  for(let i=0;i<4;i++)state=stepCar(state,{throttle:0,steer:0},1/120,world);
  return state;
}

describe('category-wide Dream interaction rules',()=>{
  it('applies one authoritative rule to different table constructions and formats canonically',()=>{
    const world=compileDreamWorld(source),expected=world.interactionRules[0]!.impact;
    expect(world.assemblies).toHaveLength(2);
    expect(world.assemblies[0]!.parts[0]!.size).not.toEqual(world.assemblies[1]!.parts[0]!.size);
    expect(world.assemblies.every(spec=>JSON.stringify(spec.impact)===JSON.stringify(expected))).toBe(true);
    expect(compileDreamWorld(formatDream(source))).toEqual(world);
    expect(formatDream(formatDream(source))).toBe(formatDream(source));
    expect(compileDream(palette+rule+table('square'))[0]!.impact).toEqual(expected);
  });
  it('changes every variant by editing the rule once, preserving its fragment construction',()=>{
    const a=compileDreamWorld(source),b=compileDreamWorld(source.replace('speed=90','speed=150'));
    expect(b.assemblies.every(spec=>spec.impact?.kind==='break' && spec.impact.speed===150)).toBe(true);
    expect(b.assemblies.map(spec=>spec.parts)).toEqual(a.assemblies.map(spec=>spec.parts));
    expect(b.assemblies.map(spec=>objectFragments(spec).length)).toEqual([3,3]);
  });
  it('reaches imported assets and included placements without leaking between compilations',()=>{
    const library=palette+table('square'),district='dream 2;asset table(module=library,object=square);place remote(object=table,at=[600,420]);';
    const entry='dream 2;'+rule+'asset table(module=library,object=square);place local(object=table,at=[400,300]);include district(module=district);';
    const world=compileDreamWorld(entry,{library,district});
    expect(world.objects).toHaveLength(2);expect(world.objects.every(o=>(o.spec as ObjectDslV2).impact?.kind==='break')).toBe(true);
    expect(()=>compileDreamWorld(entry.replace(rule,''),{library,district})).toThrow('fragment groups require');
  });
  it('breaks every table under equivalent impact, with independent damage, low-speed contacts and reset',()=>{
    const world=fixture(),start=createCarAtSpawn(world.scene),snapshot=structuredClone(start);
    const gentle=hit(world,start,0,30);expect(gentle.broken).toEqual([]);
    const first=hit(world,start,0);expect(first.broken).toEqual(['a']);expect(first.debris).toHaveLength(3);
    expect(isBroken(first,objectContacts(world.scene,world.scene.objects[1]!)[0]!)).toBe(false);
    const second=hit(world,first,1);expect(second.broken).toEqual(['a','b']);expect(second.debris).toHaveLength(6);
    expect(start).toEqual(snapshot);expect(createCarAtSpawn(world.scene).broken).toEqual([]);
  });
  it('rejects inconsistent serialized placements and duplicate category owners',()=>{
    const world=fixture();
    for(const impact of [undefined,{kind:'break',speed:200,scatter:62,lift:100,spin:4,lifetime:6}]){
      expect(()=>parseScene({...world.scene,objects:world.scene.objects.map((o,i)=>i ? o : {...o,spec:{...o.spec,impact}})})).toThrow('must follow interaction rule');
    }
    expect(checkDream(source.replace(rule,rule+rule.replace('wooden_tables','other_tables')))).toMatchObject({ok:false,diagnostics:[{code:'E_RULE'}]});
  });
  it('keeps rule scope, constructor fields and numeric work bounded',()=>{
    const entry='dream 2;asset table(module=library,object=square);';
    expect(checkDream(entry,{library:palette+rule+table('square')})).toMatchObject({ok:false,diagnostics:[{code:'E_RULE'}]});
    expect(checkDream(source.replace('speed=90','speed=900')).ok).toBe(false);
    expect(checkDream(source.replace('spin=4','spin=4,script="run"')).ok).toBe(false);
    const many=Array.from({length:17},(_,i)=>rule.replace('wooden_tables',`r${i}`).replace('kind=table',`kind=${MEASURE_KINDS[i%MEASURE_KINDS.length]}`)).join('');
    expect(checkDream(palette+many+table('square'))).toMatchObject({ok:false,diagnostics:[{code:'E_BUDGET'}]});
  });
  it('validates body and fracture compatibility after inheriting a rule',()=>{
    for(const bad of [source.replaceAll('interaction=solid','interaction=decor'),source.replace('count=2','count=9'),source.replace('fragment top(){','foundation(size=[50,30],color=#92613d);fragment top(){')])expect(checkDream(bad).ok).toBe(false);
    const bounce=palette+'rule balls(kind=custom,mode=bounce(restitution=.7,lift=.2));object ball(label="Ball"){measure(kind=custom,axis=x,meters=.5);body(interaction=knockable,radius=10,height=20);part ball(shape=sphere,material=wood,at=[0,10,0],size=[20,20,20]);}';
    expect(compileDream(bounce)[0]!.impact).toEqual({kind:'bounce',restitution:.7,lift:.2});
  });
  it('retains reactive-object and potential-fragment budgets',()=>{
    const assembly=compileDreamWorld(examples).assemblies.find(a=>a.measure?.kind==='table')!,base=fixture();
    const copies=(n:number)=>Array.from({length:n},(_,i)=>({id:`copy_${i}`,kind:'custom',labelText:'Table',x:300+i*10,y:300,scale:1,spec:assembly}));
    expect(()=>parseScene({...base.scene,objects:copies(25)})).toThrow('24 impact objects');
    expect(()=>parseScene({...base.scene,objects:copies(19)})).toThrow('128 destruction fragments');
  });
  it('does not infer a category from a display label',()=>{
    const untyped=palette+rule+table('square').replace('kind=table','kind=custom').replace('fragment top(){','group top(){').replace('fragment leg(){','group leg(){');
    expect(compileDream(untyped)[0]!.impact).toBeUndefined();
  });
  it('uses a bench rule for detachable boards while retaining its foundation and supports',()=>{
    const text=librarySource.replace('dream 2;','dream 2;rule benches(kind=bench,mode=break(speed=150,scatter=65,lift=65,spin=4,lifetime=6,pattern=splinter));');
    const compiled=compileDreamWorld(text),spec=compiled.assemblies.find(s=>s.displayName==='Wayside bench')!;
    expect(spec.impact).toBeUndefined();expect(spec.foundation).toBeDefined();expect(spec.breakZones).toHaveLength(1);
    expect(spec.breakZones![0]!.impact.speed).toBe(150);expect(objectFragments(spec)).toHaveLength(8);
    const object={id:'bench',kind:'custom' as const,labelText:'Bench',x:480,y:360,scale:measuredScale(spec),spec};
    const liveBounds=new Box3().setFromObject(buildDamageObject(object),true),sourceBounds=new Box3().setFromObject(buildObject(object),true);
    for(const axis of ['x','y','z'] as const){
      expect(liveBounds.min[axis]).toBeCloseTo(sourceBounds.min[axis],6);expect(liveBounds.max[axis]).toBeCloseTo(sourceBounds.max[axis],6);
    }
    const scene=parseScene({...createFixtureScene(),objects:[object],interactionRules:compiled.interactionRules,regions:[],terrain:{hills:[]}});
    const world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11},contacts=objectContacts(scene,scene.objects[0]!),zone=contacts.find(c=>c.zoneId)!;
    let state={...createCarAtSpawn(scene),x:zone.x+zone.r+11.1,y:zone.y,headingRad:Math.PI,vx:-240};
    for(let i=0;i<4;i++)state=stepCar(state,{throttle:0,steer:0},1/120,world);
    expect(state.broken).toEqual([]);expect(state.brokenZones).toEqual([{objectId:'bench',zoneId:zone.zoneId}]);expect(state.debris).toHaveLength(8);
    expect(isBroken(state,contacts.find(c=>!c.zoneId)!)).toBe(false);
    expect(()=>parseScene({...scene,objects:[{...object,spec:{...spec,breakZones:spec.breakZones!.map(z=>({...z,impact:{...z.impact,speed:200}}))}}]})).toThrow('must follow interaction rule');
  });
  it('enforces category rules for the original 23 tables and benches and nine station-quarter furnishings',()=>{
    const scene=createWorldScene();expect(scene.interactionRules.map(r=>r.kind)).toEqual(['lamp','tree','table','bench']);
    const furniture=scene.objects.filter(o=>o.spec && 'measure' in o.spec && ['table','bench'].includes(o.spec.measure?.kind??''));
    const stationIds=['station_quarter_bench_nw','station_quarter_bench_ne','station_quarter_bench_sw','station_quarter_bench_se','station_quarter_home_seat','station_quarter_office_seat','station_quarter_gallery_south','station_quarter_gallery_north','station_quarter_gallery_table'];
    const original=furniture.filter(o=>!o.id.startsWith('station_quarter_')),station=furniture.filter(o=>o.id.startsWith('station_quarter_'));
    expect(furniture).toHaveLength(32);expect(original).toHaveLength(23);expect(station).toHaveLength(9);expect(station.map(o=>o.id).sort()).toEqual([...stationIds].sort());
    expect(original.map(o=>o.id).sort()).toEqual(['picnic_table','park_bench','station_bench','garden_bench_nw','garden_bench_ne','garden_bench_sw','garden_bench_se','garden_bench_west','garden_bench_east','hall_workbench','home_upper_settee','home_upper_table','home_settee','home_table','hall_table_west','hall_table_east','hall_bench','school_bench','school_common_bench','school_reading_bench','school_rear_bench','school_table_west','school_table_east'].sort());
    expect(station.filter(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='bench')).toHaveLength(8);expect(station.find(o=>o.id==='station_quarter_gallery_table')!.spec).toMatchObject({measure:{kind:'table'}});
    expect(furniture.map(o=>o.id)).toEqual(expect.arrayContaining(['hall_workbench','home_upper_settee','home_upper_table','home_settee','home_table','hall_table_west','hall_table_east','hall_bench','school_bench','school_common_bench','school_reading_bench','school_rear_bench','school_table_west','school_table_east']));
    expect(scene.objects.find(o=>o.id==='hall_workbench')!.floor).toBe('hall_loft');expect(repairTargets(scene,scene.economy!.repairs.find(r=>r.id==='home_furniture')!).some(t=>t.objectId==='hall_workbench')).toBe(true);
    for(const object of furniture){const spec=object.spec as ObjectDslV2;expect(spec.impact).toEqual(scene.interactionRules.find(r=>r.kind===spec.measure!.kind)!.impact);}
  });
});
