import { describe,it,expect } from "vitest";
import { Box3,Mesh,Quaternion,Vector3 } from "three";
import source from "../src/scene/interactive-world.dream?raw";
import legacySource from "./fixtures/dream-v1/interactive-world.dream?raw";
import { compileDream,compileDreamWorld } from "../src/scene/dream";
import { interactiveWorld } from "../src/scene/interactive-world";
import {createLegacyWorld as createWorldScene} from "./fixtures/legacy-world"; // Frozen engine regression world; the live city is tested separately.
import { createFixtureScene,buildMaskForScene } from "../src/scene/fixture";
import { parseScene,type SceneObject } from "../src/scene/schema";
import { routeSchema,routePath,routePoint,routePose } from "../src/scene/routes";
import { actorPose,actorPoses } from "../src/sim/actors";
import { objectContacts } from "../src/scene/contacts";
import { objectDslSchema,hasAnimatedJoints } from "../src/scene/object-dsl";
import { createCarAtSpawn,stepCar,FixedStepper,carFootprintClear,resetCar,type CarState,type World } from "../src/sim/car";
import { nearbyRide,toggleRide,stepInteractive } from "../src/sim/interaction";
import { buildPaperMask,pointInPolygon } from "../src/sim/mask";
import { drivingHeight,terrainHeight } from "../src/scene/terrain";
import { validateScenePlayability } from "../src/scene/validate";
import { objectPlacement } from "../src/scene/placement";
import { buildObject,animateObject } from "../src/game/world3d";
import { WorldScenery } from "../src/game/scenery";
import { WorldLandscape } from "../src/game/landscape";
import { compileWatercourse,waterSchema,waterDistance } from "../src/scene/landscape-dsl";
import { compactObject } from "../src/game/compact-object";
import { WorldParticles } from "../src/game/particles";
import guide from "../docs/world-interactions.md?raw";

const doc=createWorldScene();
const world:World={scene:doc,carRadius:11,driveMask:buildPaperMask(doc.canonical.width,doc.canonical.height),roadMask:buildMaskForScene(doc)};
const spec=(name:string)=>interactiveWorld.assemblies.find(s=>s.displayName===name)!;
const item=(name:string):SceneObject=>({id:"test",kind:"custom",labelText:name,x:480,y:360,scale:1,spec:spec(name)});
const sceneFor=(objects:SceneObject[])=>parseScene({...createFixtureScene(),objects,regions:[],terrain:{hills:[]}});
const worldFor=(object:SceneObject):World=>{const scene=sceneFor([object]);return {scene,carRadius:11,driveMask:buildPaperMask(960,720),roadMask:buildMaskForScene(scene)};};
const at=(x:number,y:number,headingRad=0):CarState=>({...createCarAtSpawn(doc),x,y,headingRad,elevation:drivingHeight(doc.terrain,x,y),vx:0,vy:0});


describe("Dream world authoring",()=>{
  it("compiles eleven assemblies, routes, placements and a rounded watercourse from the same source",()=>{
    expect(compileDreamWorld(source)).toEqual(interactiveWorld);
    expect(interactiveWorld.assemblies).toHaveLength(11);expect(interactiveWorld.routes).toHaveLength(5);
    expect(interactiveWorld.objects).toHaveLength(9);expect(interactiveWorld.waters).toHaveLength(1);
    for(const object of interactiveWorld.objects)expect(doc.objects.some(o=>o.id===object.id),object.id).toBe(true);
    expect(()=>compileDream(source)).toThrow("compileDreamWorld");
  });
  it("keeps the complete documented world example compilable",()=>{
    const result=compileDreamWorld(guide.match(/```text\n([\s\S]*?)```/)![1]!);
    expect(result.objects).toHaveLength(1);expect(result.routes[0]!.waitS).toBe(4);
  });
  it("preserves the engine boundary and counts proximity assemblies in the animation budget",()=>{
    const station=spec("Meadow station"),passage=spec("Mossy passage");
    expect(hasAnimatedJoints(station)).toBe(true);expect(station.contacts).toHaveLength(8);
    expect(objectDslSchema.parse(passage)).toEqual(passage);
    for(const bad of [
      {...passage,contacts:Array(9).fill(passage.contacts![0])},
      {...passage,grounding:"surface"},
      {...passage,body:{...passage.body,interaction:"knockable"}},
      {...passage,rideable:{seat:[0,0,0]}},
      {...station,joints:[{...station.joints![0],animation:{axis:"y",amplitudeRad:.1,speed:1,phase:0}}]},
      {...station,joints:[{...station.joints![0],proximity:{axis:"q",angleRad:1,radius:100}}]},
      {...station,emitter:{kind:"script",position:[0,20,0],rate:1}},
      {...station,emitter:{kind:"steam",position:[0,20,0],rate:1000}},
    ])expect(objectDslSchema.safeParse(bad).success).toBe(false);
    expect(()=>parseScene({...doc,objects:Array.from({length:24},(_,i)=>({...item("Meadow station"),id:`house${i}`}))})).toThrow("animated assemblies");
    expect(parseScene({...doc,objects:Array.from({length:23},(_,i)=>({...item("Meadow station"),spec:objectDslSchema.parse({...station,emitter:undefined}),id:`house${i}`}))}).objects).toHaveLength(23);
    expect(()=>parseScene({...doc,player:passage})).toThrow("driving cylinder");
    expect(()=>parseScene({...doc,player:spec("Meadow locomotive")})).toThrow("world objects");
  });
  it.each([
    legacySource.replace("place meadow_train", "place lake_boat"),
    legacySource.replace("on orchard_rail scale", "on absent scale"),
    legacySource.replace('"Maple skateboard" on', '"Missing" on'),
    legacySource.replace("speed 72 wait", "speed 900 wait"),
    legacySource.replace("point [1300+cos(a)*260,1960+sin(a)*170]", "part p box red at [0,0,0] size [2,2,2]"),
    legacySource.replace("repeat i 24", "repeat i 32 { repeat j 32 { let n=1; } } repeat i 32 { repeat j 32 { let n=1; } } repeat i 24"),
    legacySource.replace("rideable at [-19,18,0]", "group { rideable; }"),
  ])("rejects invalid world source",bad=>expect(()=>compileDreamWorld(bad)).toThrow());
  it("rejects routes without a safe world footprint or water support",()=>{
    expect(validateScenePlayability(doc,world.roadMask,11)).toEqual([]);
    const boat=doc.objects.find(o=>o.id==="lake_boat")!;
    const legacyObjects=doc.objects.map(o=>o.id===boat.id ? {...o,role:undefined,spec:objectDslSchema.parse({...o.spec,rideable:{seat:[18,12,0]}})} : o);
    const invalid=parseScene({...doc,objects:legacyObjects,routes:doc.routes.map(r=>r.id===boat.route!.id ? {...r,points:[{x:2400,y:2200},{x:2600,y:2200},{x:2600,y:2400}]} : r)});
    expect(validateScenePlayability(invalid,world.roadMask,11)).toContainEqual(expect.objectContaining({code:"route-not-clear"}));
    expect(()=>parseScene({...doc,objects:[{...boat,route:{id:"absent",offset:0}}]})).toThrow("existing route");
    expect(()=>parseScene({...doc,objects:Array.from({length:25},(_,i)=>({...boat,id:`boat${i}`}))})).toThrow("24 route actors");
  });
  it("rejects a boat crossing a bridge deck even when its side rails are disabled",()=>{
    const routes=doc.routes.map(r=>r.id==="lake_trip" ? {...r,points:[{x:3000,y:2370},{x:3100,y:2370},{x:3100,y:2450},{x:3000,y:2450}]} : r);
    const landscape=doc.terrain.landscape!,bridges=landscape.bridges.filter(b=>b.id!=="meadow_footbridge");
    const objects=doc.objects.map(o=>o.id==="lake_boat" ? {...o,role:undefined,spec:objectDslSchema.parse({...o.spec,rideable:{seat:[18,12,0]}})} : o);
    const clear=parseScene({...doc,objects,routes,terrain:{...doc.terrain,landscape:{...landscape,bridges}}});
    expect(validateScenePlayability(clear,world.roadMask,11)).toEqual([]);
    const blocked=parseScene({...clear,terrain:{...clear.terrain,landscape:{...landscape,bridges:landscape.bridges.map(b=>b.id==="meadow_footbridge" ? {...b,rails:false} : b)}}});
    expect(validateScenePlayability(blocked,world.roadMask,11)).toContainEqual(expect.objectContaining({code:"route-not-clear"}));
  });
});

describe("fixed-clock vehicles and passenger rides",()=>{
  it("keeps carriage spacing on the shared rail even while the train dwells",()=>{
    const route=doc.routes.find(r=>r.kind==="rail")!,length=routePath(route).length;
    for(const time of [0,1,length/route.speed+.5,length/route.speed+3.8,50,200]){
      const head=routePose(route,time),tail=routePose(route,time,94);
      expect(((head.distance-tail.distance)%length+length)%length).toBeCloseTo(94,7);
      expect(tail.speed).toBe(head.speed);
    }
    const a=routePose(route,route.waitS+(length-.01)/route.speed),b=routePose(route,length/route.speed+route.waitS+.01);
    expect(b.travelled-a.travelled).toBeLessThan(2);
  });
  it("reverses a shuttle after a bounded wait without falling off the end",()=>{
    const route=routeSchema.parse({id:"shuttle",kind:"path",mode:"shuttle",speed:20,waitS:2,points:[{x:100,y:100},{x:200,y:100}]});
    expect(routePose(route,8).x).toBe(200);expect(routePose(route,8).speed).toBe(0);
    expect(routePose(route,10).x).toBe(180);expect(Math.cos(routePose(route,10).headingRad)).toBeCloseTo(-1);
  });
  it("leaves controllable vehicles parked until the player takes over",()=>{
    for(const id of ["meadow_plane","lake_boat","village_bike","village_skateboard"]){
      const vehicle=doc.objects.find(o=>o.id===id)!;
      expect(actorPose(doc,vehicle,100)).toEqual(actorPose(doc,vehicle,0));
    }
  });
  it("keeps legacy unconfigured train seats as passenger rides with frozen race progress",()=>{
    const train=doc.objects.find(o=>o.id==="meadow_train")!,pose=actorPose(doc,train,0);
    const original={...at(pose.x,pose.y-50),control:{kind:"foot" as const}},target=nearbyRide(original,world);
    expect(target?.id).toBe(train.id);let rider=toggleRide(original,world);
    expect(rider.control).toEqual({kind:"passenger",id:train.id});
    for(let i=0;i<2400;i++)rider=stepInteractive(rider,{throttle:1,steer:1},1/120,world);
    const moved=actorPose(doc,train,20);expect(rider.x).toBeCloseTo(moved.x);expect(rider.y).toBeCloseTo(moved.y);
    expect(rider.nextCheckpoint).toBe(original.nextCheckpoint);expect(rider.lap).toBe(original.lap);
    expect(resetCar(rider,doc).control).toEqual({kind:"car"});
  });
  it("pushes a stationary car out of a moving vehicle and allows overflight",()=>{
    const train=doc.objects.find(o=>o.id==="meadow_train")!,p=actorPose(doc,train,7);
    expect(p.speed).toBeGreaterThan(0);
    const hit=stepCar({...at(p.x,p.y),timeS:7}, {throttle:0,steer:0},1/120,world);
    const moved=actorPose(doc,train,7+1/120);
    expect(Math.hypot(hit.x-moved.x,hit.y-moved.y)).toBeGreaterThan(39.5);
    const high=stepCar({...at(p.x,p.y),timeS:7,elevation:p.elevation+100,grounded:false},{throttle:0,steer:0},1/120,world);
    expect(high.x).toBe(p.x);expect(high.y).toBe(p.y);
  });
  it("keeps route actors out of the static instancing path",()=>{
    const onlyActors=parseScene({...doc,objects:doc.objects.filter(o=>o.route)});
    expect(new WorldScenery(onlyActors).objectCount).toBe(0);
  });
  it("batches vehicle bodies and matching wheel parts without changing poses or rolling bounds",()=>{
    let before=0,after=0;
    for(const actor of doc.objects.filter(o=>o.route)){
      const raw=buildObject(actor),compact=compactObject(buildObject(actor));before+=raw.children.length;after+=compact.children.length;
      for(const distance of [0,17,50,149]){
        animateObject(raw,1.7,true,distance);animateObject(compact,1.7,true,distance);
        raw.rotation.set(.1,.7,-.1);compact.rotation.copy(raw.rotation);
        const a=new Box3().setFromObject(raw,true),b=new Box3().setFromObject(compact,true);
        expect(a.min.distanceTo(b.min),actor.id).toBeLessThan(.0001);expect(a.max.distanceTo(b.max),actor.id).toBeLessThan(.0001);
      }
    }
    expect(after).toBeLessThan(before*.6);
  });
  it("batches detail inside moving joint frames without changing the character's animated silhouette",()=>{
    const baker=doc.objects.find(o=>o.spec?.displayName==="Waving baker")!;
    const raw=buildObject(baker),batched=compactObject(buildObject(baker));
    const meshCount=(g:typeof raw)=>{let n=0;g.traverse(o=>{if(o instanceof Mesh)n++;});return n;};
    expect(meshCount(batched)).toBeLessThan(meshCount(raw)*.75);
    for(const time of [0,.7,1.5,3,4.5]){
      animateObject(raw,time);animateObject(batched,time);
      const a=new Box3().setFromObject(raw,true),b=new Box3().setFromObject(batched,true);
      expect(a.min.distanceTo(b.min)).toBeLessThan(.0001);
      expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
    }
  });
});

describe("usable openings and terrain-independent body volumes",()=>{
  it("drives through a tunnel, stops at a side wall and collides with the underside of its roof",()=>{
    const passage=item("Mossy passage"),world=worldFor(passage),base=objectPlacement(world.scene,passage).base;
    let car={...createCarAtSpawn(world.scene),x:400,y:360,headingRad:0,elevation:base,vx:100,vy:0};
    for(let i=0;i<120;i++)car=stepCar(car,{throttle:1,steer:0},1/120,world);
    expect(car.x).toBeGreaterThan(550);expect(car.elevation).toBeCloseTo(base);
    const wall=stepCar({...car,x:480,y:320,headingRad:-Math.PI/2,vx:0,vy:-150,elevation:base},{throttle:0,steer:0},.05,world);
    expect(wall.y).toBeGreaterThan(310);
    const jumped=stepCar({...car,x:480,y:360,elevation:base+49,grounded:false,vz:180,vx:0,vy:0},{throttle:0,steer:0},.05,world);
    expect(jumped.elevation+14).toBeLessThanOrEqual(base+64+.001);expect(jumped.vz).toBeLessThan(0);
    const top=objectContacts(world.scene,passage).at(-1)!.top;
    const landed=stepCar({...car,x:480,y:360,elevation:top+.1,grounded:false,vz:-30,vx:0,vy:0},{throttle:0,steer:0},.05,world);
    expect(landed.elevation).toBeCloseTo(top);expect(landed.grounded).toBe(true);
  });
  it("lets a car enter a building's front bay while keeping the rear wall solid",()=>{
    const building=item("Meadow station"),w=worldFor(building),base=objectPlacement(w.scene,building).base;
    expect(carFootprintClear(w,500,360,base,0)).toBe(true);
    expect(carFootprintClear(w,448,360,base,0)).toBe(false);
    const turned={...building,headingRad:Math.PI/2},turnedWorld=worldFor(turned);
    expect(carFootprintClear(turnedWorld,480,380,objectPlacement(turnedWorld.scene,turned).base,0)).toBe(true);
  });
  it("opens a rigid door as the observer approaches, restores it on exit, and supports reduced motion",()=>{
    const group=buildObject(item("Meadow station")),joint=group.getObjectByName(spec("Meadow station").joints![0]!.id)!;
    animateObject(group,0,true,0,0,200);const rest=joint.quaternion.clone();
    animateObject(group,0,false,0,0,0);expect(joint.quaternion.angleTo(rest)).toBeCloseTo(105*Math.PI/180);
    const size=joint.getWorldScale(new Vector3());expect(size.distanceTo(new Vector3(1,1,1))).toBeLessThan(1e-8);
    animateObject(group,0,true,0,0,200);expect(joint.quaternion.angleTo(rest)).toBeCloseTo(0);
  });
  it("rolls bicycle spokes around Z while preserving the wheel's dimensions",()=>{
    const group=buildObject(item("Meadow bicycle")),wheel=spec("Meadow bicycle").parts.find(p=>p.shape==="box" && p.animation?.kind==="roll" && p.animation.axis==="z")!,mesh=group.getObjectByName(wheel.id)!;
    const rest=mesh.quaternion.clone();animateObject(group,0,true,Math.PI*5);
    const delta=new Quaternion().copy(rest).invert().multiply(mesh.quaternion),axis=new Vector3(0,0,1).applyQuaternion(delta);
    expect(axis.distanceTo(new Vector3(0,0,1))).toBeLessThan(1e-8);expect(mesh.quaternion.angleTo(rest)).toBeCloseTo(Math.PI/2);
  });
});

describe("continuous watercourse and boat wakes",()=>{
  it("emits bounded, rising steam through the shared particle pool and clears it for reduced motion",()=>{
    const train=doc.objects.find(o=>o.id==="meadow_train")!,p=actorPose(doc,train,0),particles=new WorldParticles(doc),car=at(p.x,p.y);
    for(let i=0;i<100;i++)particles.update(car,.1,true,false,0,0,actorPoses(doc,i*.1));
    const geometry=particles.mesh.geometry,kinds=geometry.getAttribute("kind"),opacity=geometry.getAttribute("opacity"),position=geometry.getAttribute("position");
    const steam=Array.from({length:256},(_,i)=>i).filter(i=>kinds.getX(i)===5 && opacity.getX(i)>0);
    expect(steam.length).toBeGreaterThan(0);expect(particles.activeCount).toBeLessThanOrEqual(256);
    for(const i of steam)expect(position.getY(i)).toBeGreaterThan(50);
    particles.update(car,.1,false);expect(particles.activeCount).toBe(0);
  });
  it("expands a widened river into one simple basin with rounded source and outlet pools",()=>{
    const river=interactiveWorld.waters[0]!;expect(waterSchema.parse(river)).toEqual(river);expect(river.polygon).toHaveLength(24);
    for(const [x,y] of [[1930,930],[1930,1050],[1970,1260],[1980,1480],[1920,1740],[1830,2010],[1830,2160]]){
      expect(pointInPolygon(x!,y!,river.polygon)).toBe(true);expect(waterDistance(river,x!,y!)).toBeGreaterThan(10);
      expect(terrainHeight(doc.terrain,x!,y!)).toBeLessThan(-1);
    }
    expect(()=>compileWatercourse({id:"bad",stations:[{x:100,y:100,width:80},{x:100,y:100,width:80}],level:0,depth:8,bankWidth:32,color:"#123456",flow:{x:0,y:20}})).toThrow();
  });
  it("keeps the boat afloat around its full route and emits a wake independently of the car",()=>{
    const boat=doc.objects.find(o=>o.id==="lake_boat")!,landscape=new WorldLandscape(doc),route=doc.routes.find(r=>r.id===boat.route!.id)!;
    for(let t=0;t<routePath(route).length/route.speed;t+=.3){
      const p=actorPose(doc,boat,t);expect(p.elevation).toBe(-2);
      expect(doc.terrain.landscape!.waters.some(w=>pointInPolygon(p.x,p.y,w.polygon))).toBe(true);
    }
    const entry=landscape.waters.find(e=>e.water.id==="meadow_pond")!,before=entry.waves.version;
    landscape.stepActors(actorPoses(doc,0),1/120,true);expect(entry.waves.version).toBeGreaterThan(before);
    expect(entry.waves.heights.some(h=>h!==0)).toBe(true);
    const paused=entry.waves.version;landscape.stepActors(actorPoses(doc,0),1/120,false);expect(entry.waves.version).toBe(paused);
    landscape.clear();expect(entry.waves.heights.every(h=>h===0)).toBe(true);
  });
});
