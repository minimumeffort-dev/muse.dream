import {describe,it,expect} from "vitest";
import {Euler,Matrix4,Quaternion} from "three";
import {checkDream,compileDreamWorld,compileDreamScene,formatDream} from "../src/scene/dream";
import {createWorldScene,worldModules,worldSource} from "../src/scene/world-fixture";
import {objectDslSchema,type ObjectDsl} from "../src/scene/object-dsl";
import {objectFragments} from "../src/scene/fragments";
import {objectPlacement} from "../src/scene/placement";
import {buildMaskForScene} from "../src/scene/fixture";
import {buildPaperMask} from "../src/sim/mask";
import {createCarAtSpawn,resetCar,stepCar,type World} from "../src/sim/car";
import {objectRadius} from "../src/sim/archetypes";
import before from "./fixtures/open-world-v12.json";

const library='dream 2; material red(style=toon,colors=[#aa4422,#aa4422]);object toy(label="Toy"){body(interaction=solid,radius=8,height=10);part block(shape=box,material=red,at=[0,5,0],size=[10,10,10]);}';
const alias='dream 2; asset toy(module=library,object=toy);';
const include=(id:string)=>`include ${id}(module=${id});`;

describe("bounded Dream 2 modules",()=>{
  it("imports an object by explicit ID without leaking its library placements",()=>{
    const modules={library:library+'place example(object=toy,at=[400,400]);'};
    const world=compileDreamWorld(alias+'place first(object=toy,at=[200,200]);place second(object=toy,at=[300,300]);',modules);
    expect(world.objects.map(o=>o.id)).toEqual(["first","second"]);
    expect(world.objects[0]!.spec).toEqual(world.objects[1]!.spec);
    expect(world.assemblies).toHaveLength(1);
    expect(formatDream(formatDream(alias))).toBe(formatDream(alias));
  });
  it("isolates material/constant namespaces and reuses a library throughout the include graph",()=>{
    const modules={library,left:alias+'place left(object=toy,at=[200,200]);',right:alias+'place right(object=toy,at=[300,300]);'};
    const world=compileDreamWorld('dream 2;'+include('left')+include('right'),modules);
    expect(world.objects.map(o=>o.id)).toEqual(["left","right"]);expect(world.assemblies).toHaveLength(1);
    const own=library.replaceAll('toy','other').replace('#aa4422','#2266aa');
    const combined=compileDreamWorld(own+include('left'),modules);
    expect(combined.assemblies).toHaveLength(2);expect(combined.assemblies[0]!.parts[0]!.material.colorA).toBe('#2266aa');
  });
  it.each([
    [alias,{},'E_MODULE'],
    [alias.replace('object=toy','object=missing'),{library},'E_REFERENCE'],
    ['dream 2;'+include('loop'),{loop:'dream 2;'+include('loop')},'E_CYCLE'],
    ['dream 2;include a(module=library);include b(module=library);',{library},'E_DUPLICATE_ID'],
    ['dream 2;'+include('left')+include('right'),{library,left:alias+'place same(object=toy,at=[200,200]);',right:alias+'place same(object=toy,at=[300,300]);'},'E_DUPLICATE_ID'],
    [alias,{library:library.replace('size=[10,10,10]','size=[999,10,10]')},'E_SCHEMA'],
  ] as const)("rejects unresolved, cyclic, duplicate or invalid modules atomically (case %#)",(source,modules,code)=>{
    const result=checkDream(source,modules);expect(result.ok).toBe(false);
    if(!result.ok){expect(result.diagnostics[0]!.code).toBe(code);expect(result).not.toHaveProperty('world');}
  });
  it("locates errors inside their source module without losing the statement path",()=>{
    const result=checkDream(alias,{library:library.replace('size=','dimensions=')});
    expect(result.ok).toBe(false);if(!result.ok)expect(result.diagnostics[0]).toMatchObject({module:'library',code:'E_FIELD_UNKNOWN',path:'dream/object:toy/part:block/dimensions'});
    expect(compileDreamWorld(alias.replace('module=library','module=constructor'),{constructor:library}).assemblies).toHaveLength(1);
    expect(compileDreamWorld(alias.replace('module=library','module=entry'),{entry:library}).assemblies).toHaveLength(1);
  });
  it("bounds dependency depth, reachable source size and total assembly definitions",()=>{
    const deep=Object.fromEntries(Array.from({length:10},(_,i)=>['m'+i,'dream 2;'+include('m'+(i+1))]));
    const depth=checkDream('dream 2;'+include('m0'),deep);expect(depth.ok).toBe(false);if(!depth.ok)expect(depth.diagnostics[0]!.code).toBe('E_BUDGET');
    const large=Object.fromEntries(Array.from({length:9},(_,i)=>['m'+i,library+'\n//'+'.'.repeat(60000)]));
    const size=checkDream('dream 2;'+Object.keys(large).map(include).join(''),large);expect(size.ok).toBe(false);if(!size.ok)expect(size.diagnostics[0]!.code).toBe('E_BUDGET');
    const many=Object.fromEntries(Array.from({length:9},(_,i)=>['m'+i,library+Array.from({length:15},(_,j)=>`object toy_${j}(label="Toy"){body(interaction=decor,radius=8,height=10);part block(shape=box,material=red,at=[0,5,0],size=[10,10,10]);}`).join('')]));
    const count=checkDream('dream 2;'+Object.keys(many).map(include).join(''),many);expect(count.ok).toBe(false);if(!count.ok)expect(count.diagnostics[0]!.code).toBe('E_BUDGET');
  });
  it("retains the per-file object cap and bounds the complete dependency graph",()=>{
    const imports=library+Array.from({length:16},(_,i)=>`asset a_${i}(module=library,object=toy);`).join('');
    const local=checkDream(imports,{library});expect(local.ok).toBe(false);if(!local.ok)expect(local.diagnostics[0]!.code).toBe('E_BUDGET');
    const graph:Record<string,string>={};
    for(let i=0;i<30;i++)graph['leaf_'+i]=library;
    graph.left='dream 2;'+Array.from({length:15},(_,i)=>include('leaf_'+i)).join('');
    graph.right='dream 2;'+Array.from({length:15},(_,i)=>include('leaf_'+(i+15))).join('');
    const total=checkDream('dream 2;'+include('left')+include('right'),graph);
    expect(total.ok).toBe(false);if(!total.ok)expect(total.diagnostics[0]).toMatchObject({code:'E_BUDGET',message:'project module budget exceeds 32'});
  });
});

function close(a:unknown,b:unknown):void {
  if(typeof a==='number' && typeof b==='number'){expect(a).toBeCloseTo(b,8);return;}
  if(Array.isArray(a) && Array.isArray(b)){expect(a).toHaveLength(b.length);a.forEach((v,i)=>close(v,b[i]));return;}
  if(a && b && typeof a==='object' && typeof b==='object'){
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());for(const k of Object.keys(a))close((a as Record<string,unknown>)[k],(b as Record<string,unknown>)[k]);return;
  }
  expect(a).toEqual(b);
}
function geometry(spec:ObjectDsl) {
  const joints=spec.dslVersion===2 ? spec.joints??[] : [],byId=new Map(joints.map(j=>[j.id,j]));
  const rotation=(r:number[]=[0,0,0])=>new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromEuler(new Euler(...r))).elements;
  const frame=(id:string):unknown=>{const j=byId.get(id)!;return {position:j.position,rotation:rotation(j.rotation),animation:j.animation,proximity:j.proximity,parent:j.parent ? frame(j.parent) : undefined};};
  const key=(value:unknown)=>JSON.stringify(value,(_key,v)=>typeof v==='number' ? Math.round(v*1e7)/1e7 : v);
  const sorted=<T,>(values:T[])=>values.sort((a,b)=>key(a).localeCompare(key(b)));
  return {parts:sorted(spec.parts.map(p=>({shape:p.shape,position:p.position,size:p.size,rotation:rotation(p.rotation),material:p.material,
    ...('parent' in p && p.parent ? {parent:frame(p.parent)} : {}),...('deform' in p && p.deform ? {deform:p.deform} : {}),
    ...(p.animation ? {animation:p.animation.kind==='roll' ? {...p.animation,axis:p.animation.axis??'y'} : p.animation} : {})}))),
    joints:sorted(joints.map(j=>frame(j.id)))};
}
const scene=createWorldScene(),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(6000,4800),carRadius:11};

describe("complete Dream 2 mock world",()=>{
  it("retains the prior world structure while applying physical proportions and local clearance corrections",()=>{
    const canonicalId=(id:string)=>id.replaceAll('-','_');
    expect(scene.canonical).toEqual(before.scene.canonical);expect(scene.spawn).toEqual(before.scene.spawn);
    close(scene.roadMaskRef,before.scene.roadMaskRef);
    close(scene.terrain,{...before.scene.terrain,hills:before.scene.terrain.hills.map(h=>({...h,id:canonicalId(h.id)})),landscape:{...before.scene.terrain.landscape,waters:before.scene.terrain.landscape.waters.map(w=>({...w,id:canonicalId(w.id)})),bridges:before.scene.terrain.landscape.bridges.map(b=>({...b,id:canonicalId(b.id)}))}});
    close(scene.checkpoints,before.scene.checkpoints.map(c=>({...c,id:canonicalId(c.id)})));close(scene.regions,before.scene.regions);
    const assets=new Map(scene.objects.map(o=>[o.spec!.displayName,o.spec as ObjectDsl]));assets.set(scene.player!.displayName,scene.player!);
    for(const [name,spec] of Object.entries(before.specs)){const old=objectDslSchema.parse(spec),current=assets.get(name)!;expect(current,name).toBeDefined();if(["Cloudhopper plane","Wayside bench"].includes(name))continue;close(geometry(current),geometry(old));expect(current.body).toEqual(name==="Meadow locomotive" ? {...old.body,colliderRadius:22} : old.body);}
    for(const {assembly,id,...placement} of before.scene.objects){const current=scene.objects.find(o=>o.id===canonicalId(id))!;expect(current,id).toBeDefined();expect(current.spec!.displayName).toBe(assembly);const relocated=new Set(['sketch_668','sketch_1171','sketch_2850','sketch_4124','sketch_548','sketch_2152','sketch_1002','sketch_2753','sketch_1591','sketch_2339','sketch_3539','sketch_2021','sketch_2994','sketch_3295','sketch_3811','sketch_2941']);
      if(relocated.has(current.id))expect(Math.hypot(current.x-placement.x,current.y-placement.y)).toBeLessThan(20.01);
      close({...current,spec:undefined,scale:undefined,...(relocated.has(current.id)?{x:placement.x,y:placement.y}:{})},{...placement,scale:undefined,labelText:current.spec!.displayName,id:canonicalId(id),spec:undefined});}
    expect(scene.objects).toHaveLength(448);expect(scene.objects.every(o=>o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2)).toBe(true);
  });
  it("accepts the whole world from text and revalidates an invalid included placement",()=>{
    expect(compileDreamScene(worldSource,{sceneId:scene.sceneId,revisionId:scene.revisionId,sourceHash:scene.sourceHash},worldModules)).toEqual(scene);
    const changed=worldModules.roadside_props!.replace('at=[1460,1510]','at=[1045,1360]');expect(changed).not.toBe(worldModules.roadside_props);
    const result=checkDream(worldSource,{...worldModules,roadside_props:changed});expect(result.ok).toBe(false);if(!result.ok)expect(result.diagnostics[0]!.code).toMatch(/^E_SCENE_/);
  });
  it.each(['orchard_picnic','roadside_table','station_crate','orchard_supply_crate','station_planter','roadside_planter'])("breaks the actual world prop %s into its authored fragments",id=>{
    const target=scene.objects.find(o=>o.id===id)!,placement=objectPlacement(scene,target),radius=objectRadius(target);
    const start={...createCarAtSpawn(scene),x:target.x-radius-12,y:target.y,elevation:placement.base,vx:240,headingRad:0};
    let state=start;
    for(let i=0;i<30 && !state.broken.includes(id);i++)state=stepCar(state,{throttle:1,steer:0},1/120,world);
    expect(state.broken).toContain(id);expect(state.debris.filter(p=>p.objectId===id)).toHaveLength(objectFragments(target.spec as Parameters<typeof objectFragments>[0]).length);
    expect(resetCar(state,scene).broken).toContain(id);expect(resetCar(state,scene,true).broken).toEqual([]);
  });
  it("keeps the nearby ball intact while launching it away from an actual car contact",()=>{
    const ball=scene.objects.find(o=>o.id==='roadside_ball')!,start={...createCarAtSpawn(scene),x:ball.x-objectRadius(ball)-10,y:ball.y,elevation:objectPlacement(scene,ball).base,vx:240};
    const state=stepCar(start,{throttle:0,steer:0},1/120,world),prop=state.props.find(p=>p.id===ball.id)!;
    expect(prop.vx).toBeGreaterThan(200);expect(prop.vz).toBeGreaterThan(0);expect(state.broken).not.toContain(ball.id);
  });
});
