import * as THREE from "three";
import { describe,expect,it } from "vitest";
import { landscapeSchema,bridgePolygon,bridgeCoordinates,type Water,type Bridge } from "../src/scene/landscape-dsl";
import { terrainHeight,drivingHeight,bridgeHeight,waterAt,sampleTerrain,bridgeRails } from "../src/scene/terrain";
import { createFixtureScene,buildMaskForScene } from "../src/scene/fixture";
import { createWorldScene } from "../src/scene/world-fixture";
import { parseScene } from "../src/scene/schema";
import { validateScenePlayability } from "../src/scene/validate";
import { createCarAtSpawn,stepCar,FixedStepper,type World } from "../src/sim/car";
import { buildPaperMask } from "../src/sim/mask";
import { WaterWaves } from "../src/sim/waves";
import { WorldParticles } from "../src/game/particles";
import { WorldLandscape } from "../src/game/landscape";
import { surfaceHeight,bridgeHeightAt } from "../src/game/surface";
import { ROAD_SURFACE_LIFT } from "../src/scene/road";

const water:Water={id:"river",polygon:[{x:300,y:180},{x:660,y:180},{x:660,y:540},{x:300,y:540}],level:0,depth:6,
  bankWidth:40,color:"#267f8a",flow:{x:0,y:24},dragPerS:2,waves:{speed:70,damping:1.4,strength:1}};
const bridge:Bridge={id:"crossing",a:{x:250,y:360},b:{x:710,y:360},width:120,archHeight:12,style:"timber",rails:true};
const scene=(bridges:Bridge[]=[bridge])=>parseScene({...createFixtureScene(),objects:[],regions:[],
  terrain:{hills:[],landscape:{dslVersion:1,waters:[water],bridges}}});
const world=(doc=scene()):World=>({scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(960,720),carRadius:11});
const at=(doc:ReturnType<typeof scene>,x:number,y:number,vx=0,vy=0)=>({...createCarAtSpawn(doc),x,y,vx,vy,headingRad:Math.atan2(vy,vx),elevation:drivingHeight(doc.terrain,x,y)});

describe("bounded landscape DSL",()=> {
  const data={dslVersion:1,waters:[water],bridges:[bridge]};
  it("keeps old scenes readable and rejects executable, unbounded or ambiguous data",()=> {
    expect(createFixtureScene().terrain.landscape).toBeUndefined();
    expect(landscapeSchema.parse(data).waters[0]!.flow.y).toBe(24);
    for(const invalid of [ {...data,shader:"anything"}, {...data,dslVersion:2}, {...data,waters:Array(9).fill(water)},
      {...data,waters:[{...water,flow:{x:Infinity,y:0}}]}, {...data,waters:[{...water,waves:{...water.waves,speed:1000}}]},
      {...data,waters:[{...water,url:"https://example.com"}]}, {...data,bridges:[{...bridge,b:bridge.a}]},
      {...data,bridges:[{...bridge,width:NaN}]}, {...data,waters:[water,water]},
      {...data,waters:[{...water,polygon:[{x:300,y:180},{x:660,y:540},{x:660,y:180},{x:300,y:540}]}]},
      {...data,waters:[{...water,polygon:[{x:300,y:180},{x:310,y:180},{x:310,y:540},{x:300,y:540}]}]},
    ]) expect(()=>landscapeSchema.parse(invalid)).toThrow();
  });
  it("rejects off-world, overlapping and submerged bridge proposals",()=> {
    const doc=scene(),mask=buildMaskForScene(doc);
    const check=(landscape:unknown)=>validateScenePlayability(parseScene({...doc,terrain:{...doc.terrain,landscape}}),mask,11);
    expect(check({...data,bridges:[{...bridge,a:{x:250,y:10},b:{x:710,y:10}}]})).toContainEqual(expect.objectContaining({code:"landscape-out-of-bounds"}));
    expect(check({...data,waters:[{...water,level:30}]})).toContainEqual(expect.objectContaining({code:"water-not-contained"}));
    expect(check({...data,waters:[water,{...water,id:"copy"}]})).toContainEqual(expect.objectContaining({code:"landscape-overlap"}));
    expect(check({...data,bridges:[{...bridge,a:{x:340,y:360},b:{x:620,y:360}}]})).toContainEqual(expect.objectContaining({code:"bridge-not-clear"}));
    const mock=createWorldScene();expect(validateScenePlayability(mock,buildMaskForScene(mock),11)).toEqual([]);
  });
});

describe("one shared bridge driving surface",()=> {
  it("eases both ramp shoulders without a curvature kick",()=> {
    const length=bridgeCoordinates(bridge,bridge.a.x,bridge.a.y).length;
    const height=(distance:number)=>bridgeHeight({hills:[]},bridge,distance/length);
    const curvature=(distance:number)=>(height(distance+.02)-2*height(distance)+height(distance-.02))/.02**2;
    for(const distance of [24,60,length-60,length-24])
      expect(Math.abs(curvature(distance+.1)-curvature(distance-.1))).toBeLessThan(.002);
  });
  it("carves a basin, keeps dry banks and supports the deck above water",()=> {
    const {terrain}=scene();
    expect(terrainHeight(terrain,480,360)).toBe(-6);
    expect(bridgeHeight({hills:[]},{...bridge,b:{x:330,y:360}},.5)).toBeCloseTo(bridge.archHeight);
    expect(terrainHeight(terrain,299,360)).toBe(0);
    expect(drivingHeight(terrain,480,360)).toBeCloseTo(12);
    expect(waterAt(terrain,480,360)).toBeUndefined();
    expect(waterAt(terrain,480,250)?.id).toBe("river");
    expect(bridgeHeight(terrain,bridge,0)).toBe(terrainHeight(terrain,250,360));
    const s=sampleTerrain(terrain,480,360,200,0);expect(s.dx).toBeCloseTo(0);expect(s.bend).toBeLessThan(0);
  });
  it("crosses the bridge without entering water, and exits back onto land",()=> {
    const doc=scene(),w=world(doc);let car=at(doc,220,360,140);let crossed=false;
    for(let i=0;i<550;i++) {
      car=stepCar(car,{steer:0,throttle:Math.hypot(car.vx,car.vy)>140 ? -1:1},1/120,w);
      expect(car.surface).not.toBe("water");
      if(car.x>450 && car.x<510) {crossed=true;expect(car.elevation).toBeGreaterThan(11);}
    }
    expect(crossed).toBe(true);expect(car.x).toBeGreaterThan(bridge.b.x+30);expect(car.grounded).toBe(true);
  });
  it("stops side impacts at the rails but lets an airborne car clear them",()=> {
    const doc=scene(),w=world(doc);let car=at(doc,480,360,0,220);
    for(let i=0;i<100;i++) car=stepCar(car,{steer:0,throttle:1},1/120,w);
    expect(car.y).toBeLessThanOrEqual(407);expect(car.y).toBeGreaterThan(400);
    let flying={...at(doc,480,360,0,220),grounded:false,elevation:90,vz:20};
    for(let i=0;i<48;i++) flying=stepCar(flying,{steer:0,throttle:0},1/120,w);
    expect(flying.y).toBeGreaterThan(430);
    expect(bridgeRails(doc.terrain).length).toBeLessThan(260);
  });
  it("keeps the mock deck edges and interiors on the same triangulated surface as its rails",()=> {
    const doc=createWorldScene(),landscape=new WorldLandscape(doc),b=doc.terrain.landscape!.bridges[0]!;
    const deck=landscape.group.getObjectByName(`bridge-${b.id}`) as THREE.Mesh;
    const p=deck.geometry.getAttribute("position"),heightAt=bridgeHeightAt(doc,b);
    for(let i=0;i<p.count;i++) expect(p.getY(i)).toBeCloseTo(surfaceHeight(doc,p.getX(i)+3000,p.getZ(i)+2400,heightAt)+ROAD_SURFACE_LIFT,3);
    const ray=new THREE.Raycaster();deck.updateMatrixWorld(true);
    const {ux,uy}=bridgeCoordinates(b,b.a.x,b.a.y);
    for(let i=1;i<20;i++) for(const side of [-1,1]) {
      const t=i/20,x=b.a.x+(b.b.x-b.a.x)*t-uy*(b.width/2-.2)*side,y=b.a.y+(b.b.y-b.a.y)*t+ux*(b.width/2-.2)*side;
      ray.set(new THREE.Vector3(x-3000,600,y-2400),new THREE.Vector3(0,-1,0));
      expect(ray.intersectObject(deck)[0]!.point.y).toBeCloseTo(surfaceHeight(doc,x,y,heightAt)+ROAD_SURFACE_LIFT,3);
    }
    expect(landscape.group.children.filter(m=>m instanceof THREE.InstancedMesh)).toHaveLength(doc.terrain.landscape!.bridges.length);
    expect(landscape.group.children.length).toBe(6);
    expect(bridgePolygon(b)).toHaveLength(4);
  });
});

describe("water motion and contact",()=> {
  it("slows the car, carries it with the current and restores dry-ground behavior on exit",()=> {
    const doc=scene([]),w=world(doc);let wet=at(doc,450,360,160),dry={...at(doc,180,120,160)};
    for(let i=0;i<60;i++) {wet=stepCar(wet,{steer:0,throttle:0},1/120,w);dry=stepCar(dry,{steer:0,throttle:0},1/120,w);}
    expect(wet.surface).toBe("water");expect(wet.vx).toBeLessThan(dry.vx*.6);expect(wet.vy).toBeGreaterThan(3);
    const exited=stepCar({...wet,x:200,y:120,elevation:0,grounded:true},{steer:0,throttle:1},1/120,w);
    expect(exited.surface).not.toBe("water");expect(exited.vx).toBeGreaterThan(wet.vx);
    const high=stepCar({...at(doc,450,360,160),grounded:false,elevation:60},{steer:0,throttle:0},1/120,w);
    expect(high.surface).not.toBe("water");expect(high.vx).toBeGreaterThan(159);
  });
  it("replays water physics identically at 30, 60 and 144 render fps",()=> {
    const replay=(fps:number)=>{const doc=scene([]),w=world(doc),clock=new FixedStepper();let car=at(doc,440,360,100);
      for(let frame=0;frame<fps*2;frame++) for(let i=clock.push(1/fps);i>0;i--) car=stepCar(car,{steer:0,throttle:1},clock.stepDt,w);
      return car;};
    expect(replay(30)).toEqual(replay(60));expect(replay(144)).toEqual(replay(60));
  });
  it("spreads, advects and damps a bounded wave, then clears it on reset",()=> {
    const doc=scene([]),waves=new WaterWaves(water,doc.terrain);
    expect(waves.heights.length).toBeLessThan(5000);
    waves.disturb(480,360);const initial=waves.heights.slice();
    for(let i=0;i<120;i++) waves.step(1/120);
    expect(waves.heights.some((h,i)=>Math.abs(h)>Math.abs(initial[i]!)+.005)).toBe(true);
    expect([...waves.heights].every(Number.isFinite)).toBe(true);
    for(let i=0;i<2400;i++) waves.step(1/120);
    expect(Math.max(...waves.heights.map(Math.abs))).toBeLessThan(.01);
    waves.disturb(480,360,1e9);expect(Math.max(...waves.heights)).toBeLessThanOrEqual(2);
    waves.clear();expect(waves.heights.every(h=>h===0)).toBe(true);
  });
  it("advects disturbances in the declared current direction",()=> {
    const centroid=(flow:number)=> {
      const doc=scene([]),waves=new WaterWaves({...water,flow:{x:flow,y:0}},doc.terrain);
      waves.disturb(480,360);for(let i=0;i<120;i++) waves.step(1/120);
      let weight=0,x=0;waves.heights.forEach((height,i)=>{const w=Math.abs(height);weight+=w;x+=(i%waves.columns)*w;});
      return x/weight*waves.width/(waves.columns-1);
    };
    expect(centroid(30)-centroid(-30)).toBeGreaterThan(35);
  });
  it("emits bounded droplets at the water surface rather than dust on the basin floor",()=> {
    const doc=scene([]),particles=new WorldParticles(doc),car={...at(doc,480,360,100),surface:"water" as const};
    particles.update(car,.1,true);
    const kind=particles.mesh.geometry.getAttribute("kind"),position=particles.mesh.geometry.getAttribute("position"),alpha=particles.mesh.geometry.getAttribute("opacity");
    const active=Array.from({length:256},(_,i)=>i).filter(i=>alpha.getX(i)>0);
    expect(active.length).toBeGreaterThan(0);for(const i of active) {expect(kind.getX(i)).toBe(4);expect(position.getY(i)).toBeGreaterThan(water.level);}
    for(let i=0;i<600;i++) particles.update(car,1/60,true);expect(particles.activeCount).toBeLessThanOrEqual(256);
    particles.update(car,.1,false);expect(particles.activeCount).toBe(0);
  });
  it("pauses ripple state for reduced motion and avoids GPU uploads for sleeping water",()=> {
    const doc=scene([]),landscape=new WorldLandscape(doc),entry=landscape.waters[0]!;
    const car=at(doc,480,360,100);landscape.step(car,1/120);landscape.upload();
    expect(entry.waves.heights.some(h=>h!==0)).toBe(true);
    const values=entry.waves.heights.slice(),version=entry.texture.version;
    landscape.step(car,.1,false);landscape.upload();expect(entry.waves.heights).toEqual(values);expect(entry.texture.version).toBe(version);
    landscape.clear();expect(entry.waves.heights.every(h=>h===0)).toBe(true);
    const cleared=entry.texture.version;landscape.step(at(doc,100,100),.1);landscape.upload();expect(entry.texture.version).toBe(cleared);
  });
});
