import * as THREE from "three";
import savedExamples from "../docs/examples/object-dsl-v2.json";
import {describe,it,expect} from "vitest";
import {objectDslSchema,MAX_ANIMATED_ASSEMBLIES,hasAnimatedJoints} from "../src/scene/object-dsl";
import {mockPerson,mockBread,mockFood,mockSculptedRock,mockPicnic,inventionExamples} from "../src/scene/mock-creations";
import {mockCar} from "../src/scene/mock-objects";
import {buildObject,animateObject} from "../src/game/world3d";
import {WorldScenery} from "../src/game/scenery";
import {createFixtureScene} from "../src/scene/fixture";
import {createLegacyWorld as createWorldScene} from "./fixtures/legacy-world"; // Frozen engine regression world; the live city is tested separately.
import {parseScene,type SceneObject} from "../src/scene/schema";
import {createCarAtSpawn,stepCar} from "../src/sim/car";
import {buildPaperMask} from "../src/sim/mask";
import {buildMaskForScene} from "../src/scene/fixture";
import {objectPlacement} from "../src/scene/placement";
import {archetypeOf} from "../src/sim/archetypes";

const object=(spec:unknown,scale=1):SceneObject=>parseScene({...createFixtureScene(),objects:[{id:"example",kind:"custom",labelText:"sketch",x:480,y:360,scale,spec}]}).objects[0]!;

describe("object DSL v2 boundary",()=> {
  it("reads both versions and round trips all new examples as data",()=> {
    expect(objectDslSchema.parse(mockCar).dslVersion).toBe(1);
    const saved=savedExamples;
    expect(saved).toEqual(inventionExamples);
    for(const spec of saved) expect(objectDslSchema.parse(spec)).toEqual(spec);
    const doc=createWorldScene();
    for(const id of ["orchard_baker","orchard_picnic","meadow_granite"]) expect(doc.objects.some(o=>o.id===id)).toBe(true);
  });
  it("accepts fine v2 visual parts while retaining the v1 minimum and finite bounds",()=> {
    const fine={...mockBread,parts:[{...mockBread.parts[0],shape:"box",deform:undefined,size:[.1,2,.12]}]};
    expect(objectDslSchema.parse(fine).parts[0]!.size).toEqual([.1,2,.12]);
    expect(objectDslSchema.safeParse({...mockCar,parts:[{...mockCar.parts[0],size:[.1,2,.12]}]}).success).toBe(false);
    for(const size of [[.099,2,1],[0,2,1],[NaN,2,1],[Infinity,2,1],[129,2,1]])
      expect(objectDslSchema.safeParse({...fine,parts:[{...fine.parts[0],size}]}).success).toBe(false);
  });
  it.each([
    ["missing parent",{...mockPerson,joints:[{id:"a",parent:"absent",position:[0,0,0]}]}],
    ["self parent",{...mockPerson,joints:[{id:"a",parent:"a",position:[0,0,0]}]}],
    ["cycle",{...mockPerson,joints:[{id:"a",parent:"b",position:[0,0,0]},{id:"b",parent:"a",position:[0,0,0]}]}],
    ["depth",{...mockPerson,joints:Array.from({length:5},(_,i)=>({id:`j${i}`,parent:i ? `j${i-1}`:undefined,position:[0,0,0]}))}],
    ["duplicate joint",{...mockPerson,joints:[mockPerson.joints![0],mockPerson.joints![0]]}],
    ["joint/part collision",{...mockPerson,joints:[{id:"torso",position:[0,0,0]}]}],
    ["missing attachment",{...mockBread,parts:[{...mockBread.parts[0],parent:"absent"}]}],
    ["joint scaling",{...mockPerson,joints:[{id:"a",position:[0,0,0],scale:[2,1,1]}]}],
    ["motion code",{...mockPerson,joints:[{id:"a",position:[0,0,0],animation:{code:"eval('x')"}}]}],
    ["unbounded angle",{...mockPerson,joints:[{id:"a",position:[0,0,0],animation:{axis:"x",amplitudeRad:4,speed:1,phase:0}}]}],
    ["oversized noise",{...mockSculptedRock,parts:[{...mockSculptedRock.parts[0],deform:{seed:1,amount:.8}}]}],
    ["invalid seed",{...mockSculptedRock,parts:[{...mockSculptedRock.parts[0],deform:{seed:NaN,amount:.1}}]}],
    ["reach",{...mockBread,joints:[{id:"a",position:[64,64,64]},{id:"b",parent:"a",position:[64,64,64]}],parts:[{...mockBread.parts[0],parent:"b",position:[64,128,64]}]}],
    ["v2 fields on v1",{...mockBread,dslVersion:1}],
    ["arbitrary geometry",{...mockBread,parts:[{...mockBread.parts[0],vertices:[0,0,0]}]}],
    ["external textures",{...mockFood,parts:[{...mockFood.parts[0],material:{...mockFood.parts[0]!.material,url:"https://example.com"}}]}],
  ])("rejects %s",(_,spec)=>expect(()=>object(spec)).toThrow());
  it("caps live jointed assemblies while allowing static compositions to instance",()=> {
    const doc=createFixtureScene(),actor=object(mockPerson);
    const crowd=Array.from({length:MAX_ANIMATED_ASSEMBLIES-1},(_,i)=>({...actor,id:`actor-${i}`}));
    expect(parseScene({...doc,objects:crowd}).objects).toHaveLength(23);
    expect(()=>parseScene({...doc,objects:[...crowd,{...actor,id:"extra"}]})).toThrow(/animated assemblies/);
    const staticSpec={...mockPerson,joints:mockPerson.joints!.map(({animation:_,...joint})=>joint)};
    expect(hasAnimatedJoints(staticSpec)).toBe(false);
    expect(parseScene({...doc,objects:[...crowd,{...actor,id:"static-extra"}].map(o=>({...o,spec:staticSpec})),player:{...mockPerson,body:{...mockPerson.body,interaction:"solid"}}}).objects).toHaveLength(24);
  });
});

describe("organic shapes and character joints",()=> {
  it.each(["capsule","torus","icosphere","box"] as const)("normalizes an organic %s to its declared dimensions",shape=> {
    const spec={...mockSculptedRock,parts:[{...mockSculptedRock.parts[0],shape,position:[0,8,0],size:[28,16,22],deform:{seed:33,amount:.2}}]};
    const bounds=new THREE.Box3().setFromObject(buildObject(object(spec)));
    expect(bounds.min.y).toBeCloseTo(0,4);expect(bounds.max.y).toBeCloseTo(16,4);
    expect(bounds.max.x-bounds.min.x).toBeCloseTo(28,4);expect(bounds.max.z-bounds.min.z).toBeCloseTo(22,4);
  });
  it("makes deterministic seed variants without changing body, dimensions or seam continuity",()=> {
    const make=(seed:number)=>buildObject(object({...mockSculptedRock,parts:[{...mockSculptedRock.parts[0],deform:{seed,amount:.2}}]}));
    const a=make(4),b=make(4),c=make(91),positions=(g:THREE.Group)=>(g.children[0] as THREE.Mesh).geometry.getAttribute("position").array;
    expect(positions(a)).toEqual(positions(b));expect(positions(a)).not.toEqual(positions(c));
    expect(archetypeOf(object(mockSculptedRock))).toEqual(archetypeOf(object({...mockSculptedRock,parts:mockBread.parts})));
    const sphere=buildObject(object({...mockSculptedRock,parts:[{...mockSculptedRock.parts[0],shape:"sphere"}]}));
    const p=(sphere.children[0] as THREE.Mesh).geometry.getAttribute("position");
    for(let row=1;row<12;row++) expect(new THREE.Vector3().fromBufferAttribute(p,row*17).distanceTo(new THREE.Vector3().fromBufferAttribute(p,row*17+16))).toBeLessThan(.00001);
  });
  it("keeps limb lengths and attachment points rigid through joint motion, independent of input order",()=> {
    const group=buildObject(object({...mockPerson,joints:[...mockPerson.joints!].reverse()},1.5));
    const shoulder=group.getObjectByName("right-shoulder")!,elbow=group.getObjectByName("right-elbow")!,hand=group.getObjectByName("right-hand")!;
    const positions:THREE.Vector3[]=[];
    for(const time of [0,.7,1.5,3,4.5]) {
      animateObject(group,time);group.updateMatrixWorld(true);
      const a=shoulder.getWorldPosition(new THREE.Vector3()),b=elbow.getWorldPosition(new THREE.Vector3()),c=hand.getWorldPosition(new THREE.Vector3());
      expect(a.distanceTo(b)).toBeCloseTo(17*1.5,5);expect(b.distanceTo(c)).toBeCloseTo(14*1.5,5);
      const forearm=group.getObjectByName("right-forearm")!;
      expect(forearm.localToWorld(new THREE.Vector3(0,-.5,0)).distanceTo(forearm.localToWorld(new THREE.Vector3(0,.5,0)))).toBeCloseTo(14*1.5,5);
      positions.push(c);
    }
    expect(positions[0]!.distanceTo(positions[1]!)).toBeGreaterThan(2);
    animateObject(group,1);group.updateMatrixWorld(true);const once=hand.getWorldPosition(new THREE.Vector3());
    animateObject(group,1);group.updateMatrixWorld(true);expect(hand.getWorldPosition(new THREE.Vector3())).toEqual(once);
    animateObject(group,4,false);group.updateMatrixWorld(true);const resting=hand.getWorldPosition(new THREE.Vector3());
    animateObject(group,9,false);group.updateMatrixWorld(true);expect(hand.getWorldPosition(new THREE.Vector3())).toEqual(resting);
  });
  it("lands on the picnic tabletop while decorative food adds no hidden collider",()=> {
    const item=object(mockPicnic),doc=parseScene({...createFixtureScene(),terrain:{hills:[]},regions:[],objects:[item]});
    const tabletop=buildObject(item).getObjectByName("tabletop")!,top=new THREE.Box3().setFromObject(tabletop,true).max.y;
    const w={scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(960,720),carRadius:11};
    let car={...createCarAtSpawn(doc),x:480,y:360,elevation:100,grounded:false};
    for(let i=0;i<300;i++) car=stepCar(car,{steer:0,throttle:0},1/120,w);
    expect(car.grounded).toBe(true);expect(car.elevation).toBeCloseTo(top,5);
  });
  it("instances static food/rock and jointed poses without losing parent transforms",()=> {
    const staticPerson={...mockPerson,joints:mockPerson.joints!.map(({animation:_,...joint})=>joint)};
    for(const spec of [mockBread,mockFood,mockPicnic,mockSculptedRock,staticPerson]) {
      const item={...object({...spec,foundation:undefined,body:{...spec.body,interaction:"decor"}},1.5),x:480,y:360},doc=parseScene({...createFixtureScene(),terrain:{hills:[]},objects:[item]});
      const source=buildObject(item);source.position.y=1.5;source.updateMatrixWorld(true);
      const batched=new WorldScenery(doc).group;batched.updateMatrixWorld(true);
      const a=new THREE.Box3().setFromObject(source,true),b=new THREE.Box3().setFromObject(batched,true);
      expect(a.min.distanceTo(b.min)).toBeLessThan(.0001);expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
      expect(batched.children.every(c=>c instanceof THREE.InstancedMesh)).toBe(true);
    }
    expect(new WorldScenery(parseScene({...createFixtureScene(),objects:[object(mockPerson)]})).objectCount).toBe(0);
    const anchored=object({...mockPerson,foundation:{footprint:[40,30],color:"#667755"},body:{...mockPerson.body,interaction:"solid"}});
    const slope=parseScene({...createFixtureScene(),objects:[anchored],terrain:{hills:[{id:"hill",x:420,y:360,radiusX:300,radiusY:300,height:100}]}});
    const placement=objectPlacement(slope,anchored),foundation=new WorldScenery(slope).group;
    foundation.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(foundation);
    expect(placement.base-placement.low).toBeGreaterThan(1);
    expect(bounds.max.y).toBeCloseTo(placement.base+2,4);expect(bounds.min.y).toBeCloseTo(placement.low-2,4);
    expect(bounds.max.x-bounds.min.x).toBeCloseTo(40,4);
  });
});
