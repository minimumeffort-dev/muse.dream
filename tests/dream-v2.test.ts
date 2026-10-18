import { describe,expect,it } from "vitest";
import { compileDream,compileDreamWorld,compileDreamScene,checkDream,formatDream,migrateDream,DreamError } from "../src/scene/dream";
import contractSnapshot from "../docs/dream-v2-contract.json";
import goldenWorld from "./fixtures/dream-v2-world.json";
import { DREAM_V2_CONTRACT } from "../src/scene/dream-contract";
import { objectDslSchema,type ObjectDslV2 } from "../src/scene/object-dsl";
import { createCarAtSpawn,stepCar } from "../src/sim/car";
import { buildMaskForScene } from "../src/scene/fixture";
import { buildPaperMask } from "../src/sim/mask";
import { buildObject } from "../src/game/world3d";
import { Box3,InstancedMesh } from "three";
import { buildEnvironment } from "../src/game/environment";
import oldObjects from "./fixtures/dream-v1/dream-creations.dream?raw";
import oldWorld from "./fixtures/dream-v1/interactive-world.dream?raw";
import oldImpacts from "./fixtures/dream-v1/impact-creations.dream?raw";
import liveImpacts from "../src/scene/impact-creations.dream?raw";
import liveActivities from "../src/scene/interactive-world.dream?raw";
import fullWorld from "../docs/examples/dream-v2-world.dream?raw";

const palette="dream 2; material red(style=toon,colors=[#bb5544,#bb5544]);";
const body="body(interaction=solid,radius=12,height=40);";
const part="part block(shape=box,material=red,at=[0,5,0],size=[10,10,10]);";
const object=(block:string,extra="")=>`${palette}${extra}object toy(label="Toy"){${body}${block}}`;
const compile=(block:string,extra="")=>compileDream(object(block,extra))[0]!;
const identity={sceneId:"v2-world",revisionId:"r1",sourceHash:"handmade-dream-v2"};
function normalized(spec:ObjectDslV2) {
  const joints=new Map((spec.joints??[]).map((j,i)=>[j.id,`j${i}`])),fragments=new Map<string,string>();
  return {...spec,joints:spec.joints?.map(({id,parent,...j},i)=>({...j,id:`j${i}`,...(parent ? {parent:joints.get(parent)} : {})})),parts:spec.parts.map(({id,parent,fragment,animation,...p},i)=>{
    if(fragment && !fragments.has(fragment))fragments.set(fragment,`f${fragments.size}`);
    return {...p,id:`p${i}`,...(parent ? {parent:joints.get(parent)} : {}),...(fragment ? {fragment:fragments.get(fragment)} : {}),...(animation ? {animation:animation.kind==="roll" ? {...animation,axis:animation.axis??"y"} : animation} : {})};
  })};
}
function closeData(a:unknown,b:unknown):void {
  if(typeof a==="number" && typeof b==="number"){expect(a).toBeCloseTo(b,9);return;}
  if(Array.isArray(a) && Array.isArray(b)){expect(a).toHaveLength(b.length);a.forEach((v,i)=>closeData(v,b[i]));return;}
  if(a && b && typeof a==="object" && typeof b==="object"){
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    for(const key of Object.keys(a))closeData((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key]);return;
  }
  expect(a).toEqual(b);
}

describe("Dream 2 model contract",()=>{
  it("uses named fields, fixed canonical ordering and idempotent formatting",()=>{
    const source='dream 2; // formatting is not semantic\nmaterial red(colors=[#BB5544,#BB5544],style=toon); object toy(label="A \\"quoted\\" toy"){body(height=40,radius=12,interaction=solid);part block(size=[10,10,10],at=[0,5,0],material=red,shape=box,); }'.replaceAll('\\\\"','\\"');
    const canonical=formatDream(source);
    expect(formatDream(canonical)).toBe(canonical);
    expect(compileDream(canonical)).toEqual(compileDream(source));
    expect(canonical).toContain('part block(shape=box,material=red,at=[0,5,0],size=[10,10,10]);');
    expect(canonical).not.toContain('//');expect(canonical).toContain('#bb5544');
  });
  it("uses stable symbol references even when display labels match",()=>{
    const world=compileDreamWorld(`${object(part)}object other(label="Toy"){body(interaction=decor,radius=8,height=10);${part}}place first(object=toy,at=[200,200]);place second(object=other,at=[300,300]);`);
    expect(world.objects.map(o=>(o.spec as ObjectDslV2).body.interaction)).toEqual(["solid","decor"]);
  });
  it("keeps part, joint and fragment identities stable across unrelated edits",()=>{
    const block=`joint arm(at=[0,10,0],motion=swing(axis=z,deg=20,hz=.25,phase_deg=0)){${part}}${part.replace('block(','base(')}`;
    const before=compile(block),after=compile(part.replace('block(','new_part(')+block);
    expect(after.joints![0]!.id).toBe(before.joints![0]!.id);
    expect(after.parts.slice(1).map(p=>[p.id,p.parent])).toEqual(before.parts.map(p=>[p.id,p.parent]));
    const a=compileDream(object(`impact(mode=break(speed=90,scatter=50,lift=60,spin=3,lifetime=4));fragment legs(){${part}}`))[0]!;
    const b=compileDream(object(`impact(mode=break(speed=90,scatter=50,lift=60,spin=3,lifetime=4));${part.replace('block(','extra(')}fragment legs(){${part}}`))[0]!;
    expect(b.parts[1]!.fragment).toBe(a.parts[0]!.fragment);
  });
  it("composes repeated components, lexical constants and explicit axes",()=>{
    const spec=compile(`repeat legs(index=i,count=2){use leg(component=post,args=[i+5],at=[i*12,0,0]);}`,`let h(value=10);component post(params=[height]){part p(shape=box,material=red,at=[0,height/2,0],size=[2,height,h]);}`);
    expect(spec.parts.map(p=>p.size)).toEqual([[2,5,10],[2,6,10]]);
    expect(new Set(spec.parts.map(p=>p.id)).size).toBe(2);
    expect(spec).toEqual(compile(`repeat legs(index=i,count=2){use leg(component=post,args=[i+5],at=[i*12,0,0]);}`,`let h(value=10);component post(params=[height]){part p(shape=box,material=red,at=[0,height/2,0],size=[2,height,h]);}`));
  });
  it.each(["1-(2-3)","20/(5/2)","-(-3)","(8+4)*2/3","cos(180)+1",".2e2","sin(cos(0)*90)"])("preserves expression grouping through canonicalization: %s",expression=>{
    const source=object(part.replace("at=[0,5,0]",`at=[${expression},5,0]`));
    expect(compileDream(formatDream(source))).toEqual(compileDream(source));
  });
  it("converts explicit sway frequency and rejects incompatible motion constructors",()=>{
    const spec=compile(part.replace("size=[10,10,10]","size=[10,10,10],motion=sway(deg=5,hz=.25)"));
    expect(spec.parts[0]!.animation).toEqual({kind:"sway",amplitudeRad:5*Math.PI/180,speed:Math.PI/2});
    expect(checkDream(object(part.replace("size=[10,10,10]","size=[10,10,10],motion=swing(axis=z,deg=20,hz=.25,phase_deg=0)"))).ok).toBe(false);
  });
  it("resolves forward constants and converts degrees/hertz exactly once",()=>{
    const spec=compile(`part rotor(shape=box,material=red,at=[x,20,0],size=[10,2,2],motion=spin(axis=z,deg_s=90));joint arm(motion=swing(axis=z,deg=20,hz=.25,phase_deg=-30)){${part}}`,`let x(value=y+2);let y(value=3);`);
    expect(spec.parts[0]!.position[0]).toBe(5);
    expect(spec.parts[0]!.animation!.kind).toBe("spin");
    expect(spec.joints![0]!.animation).toEqual({axis:"z",amplitudeRad:20*Math.PI/180,speed:.5*Math.PI,phase:-Math.PI/6});
  });
  it.each([oldObjects,oldWorld,oldImpacts])("migrates the complete legacy corpus without changing geometry or behavior",source=>{
    const canonical=migrateDream(source),before=compileDreamWorld(source),after=compileDreamWorld(canonical);
    expect(canonical.startsWith("dream 2;\n")).toBe(true);expect(migrateDream(canonical)).toBe(canonical);
    closeData(after.assemblies.map(normalized),before.assemblies.map(normalized));
    closeData(after.routes,before.routes);closeData(after.waters,before.waters);
    closeData(after.objects.map(({spec,...o})=>o),before.objects.map(({spec,...o})=>o));
    for(const spec of after.assemblies){expect(objectDslSchema.parse(spec)).toEqual(spec);expect(new Box3().setFromObject(buildObject({id:"test",kind:"custom",labelText:spec.displayName,x:0,y:0,scale:1,spec})).isEmpty()).toBe(false);}
  });
  it("exports a serializable command contract from the parser's vocabulary",()=>{
    const data=JSON.parse(JSON.stringify(DREAM_V2_CONTRACT));expect(data).toEqual(contractSnapshot);expect(data.version).toBe(2);expect(data.commands.part.fields.material).toBe("ref");
    expect(data.commands.spin.fields.deg_s).toBe("n");expect(data.limits.steps).toBe(2048);
    expect(Reflect.set(DREAM_V2_CONTRACT.commands.part!.fields,"unknown","n")).toBe(false);
  });
});

describe("located repair diagnostics and atomic rejection",()=>{
  it.each([
    [palette,"E_EMPTY"],
    [object(part).replace("dream 2;","dream 3;"),"E_VERSION"],
    [object(part.replace('size=', 'dimensions=')),"E_FIELD_UNKNOWN"],
    [object(part.replace('shape=box','shape=box,shape=sphere')),"E_FIELD_DUPLICATE"],
    [object(part.replace(',size=[10,10,10]','')),"E_FIELD_REQUIRED"],
    [object(part.replace('size=[10,10,10]','size=[10,10]')),"E_TYPE"],
    [object(part.replace('shape=box','shape=mesh')),"E_TYPE"],
    [object(part.replace('material=red','material=missing')),"E_REFERENCE"],
    [object(part.replace('at=[0,5,0]','at=[missing,5,0]')),"E_REFERENCE"],
    [object(part+part),"E_DUPLICATE_ID"],
    [object(part.replace('block(', 'Block(')),"E_ID"],
    [object(`group nest(){${body}}${part}`),"E_CONTEXT"],
    [object(`use leg(component=post,args=[]);`,`component post(params=[h]){${part}}`),"E_ARITY"],
    [object(part,`component unused(){use self(component=unused);}`),"E_CYCLE"],
    [object(part,`component unused(){${part.replace('material=red','material=missing')}}`),"E_REFERENCE"],
    [object(part,`let x(value=y);let y(value=x);`),"E_CYCLE"],
    [`${object(part)}place item(object=toy,at=[100,100],route=road);route road(kind=path,mode=loop,speed=35){point(at=[100,100]);point(at=[200,100]);point(at=[200,200]);}`,"E_PLACEMENT"],
    [`${object(part)}place item(object=toy,route=road,heading_deg=90);route road(kind=path,mode=loop,speed=35){point(at=[100,100]);point(at=[200,100]);point(at=[200,200]);}`,"E_PLACEMENT"],
    [object(part.replace('size=[10,10,10]','size=[200,10,10]')),"E_SCHEMA"],
    [object(part.replace('shape=box','shape=box,__proto__=1')),"E_FIELD_UNKNOWN"],
    [object('constructor();'+part),"E_CONTEXT"],
    [object('part bad(shape=box,material=red,at=[0,2,0],size=[2,2,2],motion=constructor());'),"E_CONSTRUCTOR"],
  ])("returns a structured diagnostic without partial state (case %#)",(source,code)=>{
    const result=checkDream(source);expect(result.ok).toBe(false);
    if(result.ok)return;
    expect(result.diagnostics[0]!.code).toBe(code);expect(result.diagnostics[0]!.line).toBeGreaterThan(0);expect(result.diagnostics[0]!.path).toBeTruthy();
    expect("world" in result).toBe(false);expect(()=>compileDreamWorld(source)).toThrow(DreamError);
  });
  it.each([
    [liveImpacts,"speed=90","speed=900"],
    [liveImpacts,"restitution=0.74","restitution=1.5"],
    [liveImpacts,"lifetime=6","lifetime=60"],
    [liveImpacts,"mode=break(","mode=execute("],
    [liveImpacts,"interaction=solid,radius=29","interaction=knockable,radius=29"],
    [liveImpacts,"fragment plank(){","fragment plank(){fragment nested(){}"],
    [liveImpacts,"repeat repeat_plank(index=plank,count=3)","repeat repeat_plank(index=plank,count=9)"],
    [liveImpacts,"size=[54,4,9]","size=[54,4,9],motion=spin(axis=y,deg_s=20)"],
    [liveActivities,"place meadow_train(","place lake_boat("],
    [liveActivities,"route=orchard_rail,scale","route=absent,scale"],
    [liveActivities,"object=maple_skateboard","object=missing"],
    [liveActivities,"speed=72,wait_s","speed=900,wait_s"],
    [liveActivities,"point(at=[1300+cos(a)*260,1960+sin(a)*170]);","part p(shape=box,material=red,at=[0,0,0],size=[2,2,2]);"],
    [liveActivities,"repeat repeat_i(index=i,count=24)","repeat repeat_i(index=i,count=33)"],
    [liveActivities,"rideable(at=[-19,18,0]);","group forbidden(){rideable(at=[0,16,0]);}"],
  ])("rejects a mutated live v2 library (case %#)",(source,from,to)=>{
    const changed=source.replace(from,to);expect(changed).not.toBe(source);
    expect(checkDream(changed).ok).toBe(false);
  });
  it("locates the exact field and includes allowed replacements",()=>{
    const result=checkDream(`${palette}\nobject toy(label="Toy"){\n${body}\npart block(shape=box,material=red,at=[0,5,0],dimensions=[10,10,10]);\n}`);
    if(result.ok)throw new Error("unexpected acceptance");
    expect(result.diagnostics[0]).toMatchObject({code:"E_FIELD_UNKNOWN",line:4,path:"dream/object:toy/part:block/dimensions"});
    expect(result.diagnostics[0]!.expected).toContain("size");
  });
  it("locates body metadata and contact failures at their source records",()=>{
    for(const [block,path] of [["body(interaction=solid,radius=50,height=40);","/body"],[`${body}contact wall(at=[0,0,0],radius=100,height=20);`,"/contact:wall"]]) {
      const result=checkDream(`${palette}object toy(label="Toy"){${block}${part}}`);
      if(result.ok)throw new Error("unexpected acceptance");
      expect(result.diagnostics[0]!.code).toBe("E_SCHEMA");expect(result.diagnostics[0]!.path).toBe(`dream/object:toy${path}`);
    }
  });
  it("bounds expansion, source nesting and numeric dependency chains",()=>{
    for(const source of [object(`repeat many(index=i,count=33){${part}}`),object(`repeat many(index=i,count=32){${part}}${part.replace('block(','extra(')}`),object(part,Array.from({length:70},(_,i)=>`let a${i}(value=${i===69 ? "1" : `a${i+1}`});`).join(""))])expect(()=>compileDreamWorld(source)).toThrow(DreamError);
    expect(checkDream(object(part.replace('at=[0,5,0]','at=[1/0,5,0]'))).ok).toBe(false);
    const deeplyNested=object('group a(){'.repeat(17)+part+'}'.repeat(17));expect(checkDream(deeplyNested).ok).toBe(false);
  });
  it("does not accept JS, imports, unknown constructors, arbitrary callbacks or markdown fences",()=>{
    for(const source of ['```dream\n'+object(part)+'\n```',object('import("x");'),object(part.replace('size=[10,10,10]','size=[fetch(1),10,10]')),object(part.replace('material=red','material=window.location')),object('impact(mode=explode(speed=3));'+part)])expect(checkDream(source).ok).toBe(false);
  });
});

describe("whole-world authoring boundary",()=>{
  it("compiles layout, terrain, timber bridge, effects, actors, player and unresolved intent",()=>{
    const scene=compileDreamScene(fullWorld,identity);
    expect(scene).toEqual({...goldenWorld,sports:[],interactionRules:[]});
    expect(scene.sceneId).toBe(identity.sceneId);expect(scene.terrain.hills).toHaveLength(1);expect(scene.terrain.landscape!.bridges[0]!.style).toBe("timber");
    expect(scene.regions.map(r=>r.rule.effect)).toEqual(["BOOST","ICE"]);expect(scene.player!.displayName).toBe("Sketch car");expect(scene.objects).toHaveLength(2);expect(scene.terrain.landscape!.waters).toHaveLength(2);expect(scene.unresolvedLabels[0]!.labelText).toContain("not supported");
    expect(checkDream(fullWorld).ok).toBe(true);
    const world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};let car=createCarAtSpawn(scene);
    for(let i=0;i<120;i++)car=stepCar(car,{throttle:1,steer:0},1/120,world);
    expect(car.x).toBeGreaterThan(600);expect(Number.isFinite(car.elevation)).toBe(true);
  });
  it("keeps decoration density bounded when a model describes a small world",()=>{
    const scene=compileDreamScene(fullWorld,identity),environment=buildEnvironment(scene);let count=0;
    environment.traverse(object=>{if(object instanceof InstancedMesh)count+=object.count;});
    expect(count).toBeGreaterThan(100);expect(count).toBeLessThan(1000);
  });
  it("checks playability before a model world can replace accepted state",()=>{
    const accepted=compileDreamScene(fullWorld,identity);
    const result=checkDream(fullWorld.replace('spawn=[525,609]','spawn=[10,10]'));
    expect(result.ok).toBe(false);if(!result.ok)expect(result.diagnostics[0]!.code).toBe("E_SCENE_SPAWN_NOT_CLEAR");
    expect(accepted.spawn).toEqual({x:525,y:609,headingRad:0});
    expect(()=>compileDream(fullWorld)).toThrow("compileDreamWorld");
    expect(()=>compileDreamScene(object(part),identity)).toThrow("world declaration");
  });
  it.each([
    fullWorld.replace('size=[960,900]','size=[9000,720]'),
    fullWorld.replace('width=240,arch=12','width=64,arch=12'),
    fullWorld.replace('points=[[430,76],[530,76],[530,142],[430,142]]','points=[[430,76],[530,142],[530,76],[430,142]]'),
    fullWorld.replace('dir=[1,0]','dir=[0,0]'),
    fullWorld.replace('player=sketch_car','player=missing'),
  ])("rejects invalid world geometry or references",source=>{expect(source).not.toBe(fullWorld);expect(checkDream(source).ok).toBe(false);});

});
