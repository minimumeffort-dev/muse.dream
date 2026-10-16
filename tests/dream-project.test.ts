import {describe,it,expect} from "vitest";
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

const scene=createWorldScene(),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};

describe("complete Dream 2 mock world",()=>{
  it("authors the complete connected city in bounded Dream modules",()=>{
    expect(scene.canonical).toMatchObject({width:14000,height:11000});
    expect(scene.objects.length).toBeGreaterThan(450);expect(scene.objects.length).toBeLessThanOrEqual(4096);
    expect(scene.objects.every(o=>o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2)).toBe(true);
    expect(scene.sites.length).toBeGreaterThan(180);
    expect(scene.routes.some(r=>r.kind==='tram')).toBe(true);
    expect(scene.routes.filter(r=>r.kind==='street' && r.stops?.length)).toHaveLength(4);
  });
  it("accepts the whole world from text and revalidates an invalid included placement",()=>{
    expect(compileDreamScene(worldSource,{sceneId:scene.sceneId,revisionId:scene.revisionId,sourceHash:scene.sourceHash},worldModules)).toEqual(scene);
    const changed=worldModules.breakables!.replace('at=[6270,4370]','at=[6330,4233]');expect(changed).not.toBe(worldModules.breakables);
    const result=checkDream(worldSource,{...worldModules,breakables:changed});expect(result.ok).toBe(false);if(!result.ok)expect(result.diagnostics[0]!.code).toMatch(/^E_SCENE_/);
  });
  it.each(['picnic_table','produce_crate','market_planter'])("breaks the actual world prop %s into its authored fragments",id=>{
    const target=scene.objects.find(o=>o.id===id)!,placement=objectPlacement(scene,target),radius=objectRadius(target);
    const start={...createCarAtSpawn(scene),x:target.x-radius-12,y:target.y,elevation:placement.base,vx:240,headingRad:0};
    let state=start;
    for(let i=0;i<30 && !state.broken.includes(id);i++)state=stepCar(state,{throttle:1,steer:0},1/120,world);
    expect(state.broken).toContain(id);expect(state.debris.filter(p=>p.objectId===id)).toHaveLength(objectFragments(target.spec as Parameters<typeof objectFragments>[0]).length);
    expect(resetCar(state,scene).broken).toContain(id);expect(resetCar(state,scene,true).broken).toEqual([]);
  });
  it("keeps the nearby ball intact while launching it away from an actual car contact",()=>{
    const ball=scene.objects.find(o=>o.id==='festival_ball')!,start={...createCarAtSpawn(scene),x:ball.x-objectRadius(ball)-10,y:ball.y,elevation:objectPlacement(scene,ball).base,vx:240};
    const state=stepCar(start,{throttle:0,steer:0},1/120,world),prop=state.props.find(p=>p.id===ball.id)!;
    expect(prop.vx).toBeGreaterThan(200);expect(prop.vz).toBeGreaterThan(0);expect(state.broken).not.toContain(ball.id);
  });
});
