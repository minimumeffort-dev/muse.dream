import { objectRadius } from "../src/sim/archetypes";
import { describe,it,expect } from "vitest";
import { Box3,Quaternion } from "three";
import source from "../src/scene/impact-creations.dream?raw";
import legacySource from "./fixtures/dream-v1/impact-creations.dream?raw";
import { compileDreamWorld,compileDream } from "../src/scene/dream";
import guide from "../docs/impact-dsl.md?raw";
import { impactWorld } from "../src/scene/impact-creations";
import { objectDslSchema } from "../src/scene/object-dsl";
import { objectFragments } from "../src/scene/fragments";
import { objectContacts } from "../src/scene/contacts";
import { objectPlacement } from "../src/scene/placement";
import { parseScene,type SceneObject } from "../src/scene/schema";
import { createFixtureScene,buildMaskForScene } from "../src/scene/fixture";
import { createWorldScene } from "../src/scene/world-fixture";
import { validateScenePlayability } from "../src/scene/validate";
import { drivingHeight } from "../src/scene/terrain";
import { buildPaperMask } from "../src/sim/mask";
import { createCarAtSpawn,stepCar,FixedStepper,resetCar,carFootprintClear,type World,type CarState } from "../src/sim/car";
import { breakOnContact,advanceImpactMotion } from "../src/sim/impacts";
import { stepInteractive,toggleRide } from "../src/sim/interaction";
import { WorldDebris } from "../src/game/debris";
import { WorldScenery } from "../src/game/scenery";
import { buildObject } from "../src/game/world3d";
import { WorldParticles } from "../src/game/particles";

const spec=(name:string)=>impactWorld.assemblies.find(s=>s.displayName===name)!;
// Local-unit mechanics replays remain independent of whole-world physical sizing.
const item=(name:string):SceneObject=>({id:"target",kind:"custom",labelText:name,x:480,y:360,scale:1,spec:{...spec(name),measure:undefined}});
function makeWorld(object=item("Breakaway table")):World {
  const scene=parseScene({...createFixtureScene(),objects:[object],terrain:{hills:[]},regions:[]});
  return {scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
}
const initial=(world:World,speed=240):CarState=>({...createCarAtSpawn(world.scene),x:440,y:360,elevation:0,vx:speed,headingRad:0});
const idle={throttle:0,steer:0};

describe("impact DSL",()=>{
  it("keeps both complete authoring examples compilable",()=>{
    const examples=[...guide.matchAll(/```text\n([\s\S]*?)```/g)].map(match=>compileDream(match[1]!)[0]!);
    expect(examples).toHaveLength(2);expect(examples[0]!.impact?.kind).toBe("bounce");expect(objectFragments(examples[1]!)).toHaveLength(3);
  });
  it("authors distinct bounce, table, crate and planter behaviors without object-name recipes",()=>{
    expect(compileDreamWorld(source)).toEqual(impactWorld);
    expect(impactWorld.assemblies).toHaveLength(4);
    expect(objectFragments(spec("Breakaway table"))).toHaveLength(7);
    expect(objectFragments(spec("Produce crate"))).toHaveLength(8);
    expect(objectFragments(spec("Terracotta planter"))).toHaveLength(6);
    const scene=createWorldScene();
    for(const object of impactWorld.objects)expect(scene.objects.some(o=>o.id===object.id),object.id).toBe(true);
    expect(validateScenePlayability(scene,buildMaskForScene(scene),11)).toEqual([]);
  });
  it.each([
    legacySource.replace("speed 90","speed 900"),legacySource.replace("restitution 0.74","restitution 1.5"),
    legacySource.replace("lifetime 6","lifetime 60"),legacySource.replace("impact break","impact execute"),
    legacySource.replace("body solid radius 29","body knockable radius 29"),
    legacySource.replace("fragment plank {","fragment plank {fragment nested {}"),
    legacySource.replace("repeat plank 3","repeat plank 9"),
    legacySource.replace("size [54,4,9];","size [54,4,9] spin y 20;"),
  ])("rejects unsupported or unbounded impact source",bad=>expect(()=>compileDreamWorld(bad)).toThrow());
  it("rejects ambiguous body features, orphan fragment labels and excessive scene debris",()=>{
    const table=spec("Breakaway table");
    for(const bad of [{...table,impact:undefined},{...table,foundation:{footprint:[50,30],color:"#aabbcc"}},{...table,impact:{...table.impact,script:"run()"}}])
      expect(objectDslSchema.safeParse(bad).success).toBe(false);
    const scene=makeWorld().scene;
    expect(()=>parseScene({...scene,player:table})).toThrow("world objects");
    expect(()=>parseScene({...scene,objects:Array.from({length:19},(_,i)=>({...item("Breakaway table"),id:`table${i}`}))})).toThrow("128 destruction fragments");
    expect(()=>parseScene({...scene,objects:Array.from({length:25},(_,i)=>({...item("Festival ball"),id:`ball${i}`}))})).toThrow("24 impact objects");
  });
});

describe("destruction simulation",()=>{
  it("breaks once on a hard impact, releases authored pieces and removes the intact collider",()=>{
    const world=makeWorld(),before=initial(world),copy=structuredClone(before);
    let car=stepCar(before,idle,1/120,world);
    expect(before).toEqual(copy);expect(car.broken).toEqual(["target"]);expect(car.debris).toHaveLength(7);
    expect(car.impacts).toHaveLength(1);expect(car.impacts[0]!.kind).toBe("break");
    expect(carFootprintClear(world,480,360,0,car.timeS,car)).toBe(true);
    expect(carFootprintClear(world,480,360,0,car.timeS)).toBe(false);
    for(let i=0;i<60;i++)car=stepCar(car,idle,1/120,world);
    expect(car.x).toBeGreaterThan(500);expect(car.broken).toHaveLength(1);expect(car.impacts).toEqual([]);expect(car.debris).toHaveLength(7);
  });
  it("keeps the table solid on a gentle touch or glancing pass and allows a high jump over it",()=>{
    const world=makeWorld();
    const gentle=stepCar(initial(world,30),idle,1/120,world);expect(gentle.broken).toEqual([]);expect(gentle.x).toBeLessThanOrEqual(440.01);
    const glancing=stepCar({...initial(world,0),vy:300,headingRad:Math.PI/2},idle,1/120,world);expect(glancing.broken).toEqual([]);
    const flying=stepCar({...initial(world),elevation:100,grounded:false},idle,1/120,world);expect(flying.broken).toEqual([]);
  });
  it("keeps fragment transforms aligned with a scaled, rotated assembly at the fracture boundary",()=>{
    const object={...item("Breakaway table"),scale:1.4,headingRad:.7},world=makeWorld(object),car=initial(world,300);
    breakOnContact(car,world,450,360,objectContacts(world.scene,object));
    expect(car.debris).toHaveLength(7);
    const visual=new WorldDebris(world.scene);visual.update(car);
    const original=buildObject(object),placement=objectPlacement(world.scene,object);
    original.position.set(object.x-480,placement.base+1.5,object.y-360);original.quaternion.copy(placement.rotation);
    const a=new Box3().setFromObject(original,true),b=new Box3().setFromObject(visual.group,true);
    expect(a.min.distanceTo(b.min)).toBeLessThan(.0001);expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
    visual.update(car,true);expect(visual.group.children.every(g=>!g.visible)).toBe(true);
    visual.update(car);expect(visual.group.children.filter(g=>g.visible)).toHaveLength(7);
    visual.update({...car,debris:[]});expect(visual.group.children.every(g=>!g.visible)).toBe(true);
  });
  it("settles fragments on terrain and expires them while preserving destruction until a race restart",()=>{
    const world=makeWorld();let car=stepCar(initial(world),idle,1/120,world);
    const shapes=objectFragments(spec("Breakaway table"));
    for(let i=0;i<900;i++){
      car=stepCar(car,idle,1/120,world);
      for(const piece of car.debris){
        const q=new Quaternion(...piece.rotation),shape=shapes.find(f=>f.id===piece.fragmentId)!;
        for(const corner of shape.corners){const p=corner.clone().applyQuaternion(q);expect(piece.elevation+p.y).toBeGreaterThanOrEqual(drivingHeight(world.scene.terrain,piece.x+p.x,piece.y+p.z)-.001);}
      }
    }
    expect(car.debris).toEqual([]);expect(car.broken).toEqual(["target"]);
    expect(resetCar(car,world.scene).broken).toEqual(["target"]);
    expect(resetCar(car,world.scene,true).broken).toEqual([]);
  });
  it.each([30,60,144])("replays the same fracture and debris motion at %i render fps",fps=>{
    const world=makeWorld(),run=(rate:number)=>{let car=initial(world);const clock=new FixedStepper();
      for(let f=0;f<rate*2;f++)for(let i=0,n=clock.push(1/rate);i<n;i++)car=stepCar(car,idle,clock.stepDt,world);return car;};
    expect(run(fps)).toEqual(run(60));
  });
  it("excludes breakable objects from immutable scenery instances",()=>{
    expect(new WorldScenery(makeWorld().scene).objectCount).toBe(0);
  });
  it("supports falling fragment bounds on hills and preserves their release frames through static joints",()=>{
    const table=spec("Breakaway table"),framed={...table,measure:undefined,joints:[{id:"frame",position:[3,4,2] as [number,number,number],rotation:[.1,.2,-.1] as [number,number,number]}],parts:table.parts.map(p=>({...p,parent:"frame"}))};
    const object={...item("Breakaway table"),spec:objectDslSchema.parse(framed)},base=makeWorld(object);
    const scene=parseScene({...base.scene,terrain:{hills:[{id:"hill",x:500,y:350,radiusX:180,radiusY:200,height:80}]}}),world={...base,scene},car={...initial(world),elevation:objectPlacement(scene,object).base};
    breakOnContact(car,world,450,360,objectContacts(scene,object));expect(car.debris).toHaveLength(7);
    for(let i=0;i<240;i++)advanceImpactMotion(car,world,1/120,false);
    for(const piece of car.debris){
      const q=new Quaternion(...piece.rotation),shape=objectFragments(framed).find(f=>f.id===piece.fragmentId)!;
      for(const corner of shape.corners){const p=corner.clone().applyQuaternion(q);expect(piece.elevation+p.y).toBeGreaterThanOrEqual(drivingHeight(scene.terrain,piece.x+p.x,piece.y+p.z)-.001);}
    }
  });
  it("keeps destruction moving while a controlled bicycle is stationary",()=>{
    const scene=createWorldScene(),world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
    const table=scene.objects.find(o=>o.id==="meadow_table")!,car={...createCarAtSpawn(scene),x:table.x-objectRadius(table)-11,y:table.y,elevation:0,vx:240};
    breakOnContact(car,world,table.x-objectRadius(table)-10,table.y,objectContacts(scene,table));expect(car.debris).toHaveLength(7);
    const bike=scene.objects.find(o=>o.id==="village_bike")!;
    const boarded=toggleRide({...car,control:{kind:"foot"},x:bike.x,y:bike.y-45,vx:0,vy:0,elevation:drivingHeight(scene.terrain,bike.x,bike.y-45)},world),after=stepInteractive(boarded,idle,1/120,world);
    expect(after.control).toEqual({kind:"vehicle",id:"village_bike"});expect(after.debris[0]!.age).toBeGreaterThan(boarded.debris[0]!.age);expect(after.impacts).toEqual([]);
  });
});

describe("bouncing objects",()=>{
  it("launches an intact ball away from the car, rebounds off the floor and slows down",()=>{
    const world=makeWorld(item("Festival ball"));let car={...initial(world),x:458};
    car=stepCar(car,idle,1/120,world);let prop=car.props[0]!;
    expect(prop.vx).toBeGreaterThan(300);expect(prop.vz).toBeGreaterThan(0);expect(prop.elevation).toBeGreaterThan(0);expect(car.broken).toEqual([]);
    let bounced=false,previous=prop.vz!,maxElevation=0;
    for(let i=0;i<720;i++){
      car=stepCar({...car,x:100,y:100,vx:0,vy:0},idle,1/120,world);prop=car.props[0]!;
      if(previous<0 && prop.vz!>0)bounced=true;previous=prop.vz!;maxElevation=Math.max(maxElevation,prop.elevation!);
    }
    expect(bounced).toBe(true);expect(maxElevation).toBeGreaterThan(5);expect(Math.abs(prop.vx)).toBeLessThan(30);
    expect(prop.x).toBeGreaterThanOrEqual(13);expect(prop.x).toBeLessThanOrEqual(947);
    expect(resetCar(car,world.scene,true).props[0]!.x).toBe(480);
  });
  it("reflects off a solid wall without breaking it",()=>{
    const base=makeWorld(item("Festival ball")),wall={id:"wall",kind:"tree" as const,labelText:"Tree",x:530,y:360,scale:1};
    const world={...base,scene:parseScene({...base.scene,objects:[...base.scene.objects,wall]})};
    let car:CarState={...createCarAtSpawn(world.scene),x:100,y:100,props:[{id:"target",x:500,y:360,vx:220,vy:0,elevation:0,vz:0}]};
    for(let i=0;i<10;i++)car=stepCar(car,idle,1/120,world);
    expect(car.props[0]!.vx).toBeLessThan(0);expect(car.props[0]!.x).toBeLessThan(503.1);
  });
  it("uses the existing bounded particle pool for impact puffs",()=>{
    const world=makeWorld(),car=stepCar(initial(world),idle,1/120,world),particles=new WorldParticles(world.scene);
    particles.objectImpacts(car,car.impacts,true);expect(particles.activeCount).toBe(22);
    for(let i=0;i<30;i++)particles.objectImpacts(car,car.impacts,true);expect(particles.activeCount).toBeLessThanOrEqual(256);
    particles.clear();particles.objectImpacts(car,car.impacts,false);expect(particles.activeCount).toBe(0);
  });
});
