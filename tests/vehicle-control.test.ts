import {describe,it,expect} from "vitest";
import {compileDream,formatDream} from "../src/scene/dream";
import {objectDslSchema,controlOf} from "../src/scene/object-dsl";
import {createLegacyWorld as createWorldScene} from "./fixtures/legacy-world"; // Frozen engine regression world; the live city is tested separately.
import {createFixtureScene,buildMaskForScene} from "../src/scene/fixture";
import {parseScene,type SceneObject} from "../src/scene/schema";
import {sceneContacts} from "../src/scene/contacts";
import {drivingHeight,waterAt} from "../src/scene/terrain";
import {waterSchema} from "../src/scene/landscape-dsl";
import {actorPose,actorPoses,actorContacts} from "../src/sim/actors";
import {createCarAtSpawn,resetCar,stepCar,FixedStepper,type CarState,type World,type CarInput} from "../src/sim/car";
import {toggleRide,stepInteractive,nearbyRide,exitPosition,bodyWorld} from "../src/sim/interaction";
import {buildPaperMask} from "../src/sim/mask";
import {validateScenePlayability} from "../src/scene/validate";
import {assemblyHorizontalRadius} from "../src/scene/measure";
import type {ObjectDsl} from "../src/scene/object-dsl";
import {vehicleReviewStart} from "../src/game/review-start";
import {WorldScenery} from "../src/game/scenery";

const live=createWorldScene(),idle={throttle:0,steer:0};
const pond=waterSchema.parse({id:"pond",polygon:[{x:250,y:180},{x:710,y:180},{x:710,y:540},{x:250,y:540}],level:0,depth:6,bankWidth:32,color:"#227788",flow:{x:0,y:0},dragPerS:2,waves:{speed:55,damping:1,strength:1}});
function setup(id:string,extra:SceneObject[]=[]):World {
  const original=live.objects.find(o=>o.id===id)!,object={...original,x:480,y:360,headingRad:0,route:undefined};
  const scene=parseScene({...createFixtureScene(),terrain:{hills:[],...(id==="lake_boat" ? {landscape:{dslVersion:1,waters:[pond],bridges:[]}} : {})},regions:[],routes:[],objects:[object,...extra]});
  return {scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
}
function board(world:World):CarState {
  const object=world.scene.objects[0]!,p=actorPose(world.scene,object,0);
  return toggleRide({...createCarAtSpawn(world.scene),control:{kind:"foot"},x:p.x,y:p.y-50,elevation:p.elevation},world);
}
function run(state:CarState,world:World,input:CarInput,seconds:number) {
  for(let i=0;i<Math.round(seconds*120);i++)state=stepInteractive(state,input,1/120,world);return state;
}

describe("Dream control profiles",()=>{
  const source='dream 2;material paint(style=toon,colors=[#226655,#226655]);object bike(label="Bike"){body(interaction=solid,radius=8,height=20);rideable(at=[0,12,0],control=bicycle);part frame(shape=box,material=paint,at=[0,10,0],size=[20,20,8]);}';
  it("compiles and formats explicit control data while retaining legacy passenger seats",()=>{
    expect(controlOf(compileDream(source)[0])).toBe("bicycle");expect(compileDream(formatDream(source))).toEqual(compileDream(source));
    expect(controlOf(compileDream(source.replace(',control=bicycle',''))[0])).toBeUndefined();
    expect(()=>compileDream(source.replace('control=bicycle','control=script'))).toThrow();
    const spec=compileDream(source)[0]!;
    expect(objectDslSchema.safeParse({...spec,body:{...spec.body,interaction:"decor"}}).success).toBe(false);
  });
  it.each(["village_bike","village_skateboard","lake_boat","meadow_plane"])("does not run %s on its former route while unoccupied",id=>{
    const object=live.objects.find(o=>o.id===id)!;expect(actorPose(live,object,1000)).toEqual(actorPose(live,object,0));
  });
  it.each(["village_bike","village_skateboard","lake_boat","meadow_plane"])("can reboard %s from its real dry exit point",id=>{
    const world={scene:live,roadMask:buildMaskForScene(live),driveMask:buildPaperMask(live.canonical.width,live.canonical.height),carRadius:11};
    const foot=vehicleReviewStart(createCarAtSpawn(live),world,id);expect(foot.control.kind).toBe("foot");
    if(id==="meadow_plane"){
      const plane=live.objects.find(o=>o.id===id)!;
      expect(Math.hypot(foot.x-plane.x,foot.y-plane.y)).toBeGreaterThan(assemblyHorizontalRadius(plane.spec as ObjectDsl,plane.scale));
    }
    expect(nearbyRide(foot,world)?.id).toBe(id);expect(toggleRide(foot,world).control).toEqual({kind:"vehicle",id});
  });
  it("rejects a boat whose body fits but whose visible hull would extend onto land",()=>{
    const world=setup("lake_boat"),bad=parseScene({...world.scene,objects:world.scene.objects.map(o=>({...o,x:275}))});
    expect(validateScenePlayability(world.scene,world.roadMask,11)).toEqual([]);
    expect(validateScenePlayability(bad,world.roadMask,11)).toContainEqual(expect.objectContaining({code:"route-not-clear"}));
  });
  it("rejects parked vehicles overlapping each other or the initial racing car",()=>{
    const world=setup("village_bike"),object=world.scene.objects[0]!;
    for(const objects of [[object,{...object,id:"second"}],[{...object,x:world.scene.spawn.x,y:world.scene.spawn.y}]]){
      expect(validateScenePlayability(parseScene({...world.scene,objects}),world.roadMask,11)).toContainEqual(expect.objectContaining({code:"route-not-clear"}));
    }
  });
  it("keeps controllable fixed placements out of the static collider and instancing paths",()=>{
    const world=setup("village_bike");expect(sceneContacts(world.scene).solids.query(480,360,100)).toHaveLength(0);
    expect(new WorldScenery(world.scene).objectCount).toBe(0);expect(actorContacts(world.scene,100)).toHaveLength(1);
  });
});

describe("walk, enter, drive and leave",()=>{
  const world=setup("village_bike");
  it("leaves a collidable car, walks with screen-relative controls and reenters where it was parked",()=>{
    const start=createCarAtSpawn(world.scene),foot=toggleRide(start,world);
    expect(foot.control.kind).toBe("foot");expect(foot.vehicles[0]).toMatchObject({id:null,x:start.x,y:start.y});
    expect(actorContacts(world.scene,foot.timeS,foot)).toContainEqual(expect.objectContaining({id:"@player",x:start.x,y:start.y}));
    const moved=run(foot,world,{throttle:-1,steer:0},.4);expect(moved.y).toBeGreaterThan(foot.y);expect(moved.x).toBeGreaterThan(foot.x);
    const again=toggleRide(foot,world);expect(again.control.kind).toBe("car");expect(again.x).toBe(start.x);expect(again.y).toBe(start.y);
    expect(again.vehicles.some(v=>v.id===null)).toBe(false);
  });
  it("keeps the parked car solid while walking and does not apply racing boosts to a person",()=>{
    let foot=toggleRide(createCarAtSpawn(world.scene),world);const parked=foot.vehicles.find(v=>v.id===null)!;
    for(let i=0;i<120;i++){
      foot=stepInteractive(foot,{throttle:1,steer:0},1/120,world);
      expect(Math.hypot(foot.x-parked.x,foot.y-parked.y)).toBeGreaterThanOrEqual(13.99);
    }
    const scene=parseScene({...world.scene,regions:createFixtureScene().regions}),effects={...world,scene};
    const onBoost={...foot,x:812,y:360,vx:0,vy:0,elevation:0};
    const walked=stepInteractive(onBoost,idle,1/120,effects);expect(walked.boostedThisStep).toBe(false);expect(walked.boostReadyAtS).toEqual({});
    const bike=stepInteractive({...board(effects),x:812,y:360},idle,1/120,effects);expect(bike.boostedThisStep).toBe(true);
  });
  it("treats paved paths as hard surfaces without changing the racing mask",()=>{
    const lane={id:"lane",kind:"path",mode:"loop",speed:35,width:40,surface:"cycle",points:[{x:480,y:360},{x:600,y:360},{x:600,y:470},{x:480,y:470}]};
    const scene=parseScene({...world.scene,routes:[lane]}),paved={...world,scene};
    expect(paved.roadMask.isDrivable(480,360)).toBe(false);
    expect(stepInteractive(board(paved),idle,1/120,paved).surface).toBe("road");
    const trail={...paved,scene:parseScene({...scene,routes:[{...lane,surface:"trail"}]})};
    expect(stepInteractive(board(trail),idle,1/120,trail).surface).toBe("paper");
  });
  it("keeps walking speed independent of diagonals and rotates walking with the view",()=>{
    const foot={...createCarAtSpawn(world.scene),control:{kind:"foot" as const},x:350,y:350};
    const straight=run(foot,world,{throttle:1,steer:0},.3),diagonal=run(foot,world,{throttle:1,steer:1},.3),turned=run(foot,world,{throttle:1,steer:0,viewAngle:Math.PI/2},.3);
    expect(Math.hypot(straight.x-foot.x,straight.y-foot.y)).toBeCloseTo(Math.hypot(diagonal.x-foot.x,diagonal.y-foot.y));
    expect(turned.x).toBeLessThan(foot.x);expect(turned.y).toBeGreaterThan(foot.y);
  });
  it("drives off the authored centreline, parks locally, and keeps that pose after reset",()=>{
    const start=board(world);expect(start.control).toEqual({kind:"vehicle",id:"village_bike"});
    const driven=run(start,world,{throttle:1,steer:.25},2);expect(Math.hypot(driven.x-start.x,driven.y-start.y)).toBeGreaterThan(60);
    expect(driven.headingRad).toBeGreaterThan(.4);expect(world.scene.objects[0]!.x).toBe(start.x);
    expect(actorPoses(world.scene,driven.timeS,driven).find(p=>p.id==="village_bike")!.x).toBe(driven.x);expect(driven.nextCheckpoint).toBe(start.nextCheckpoint);expect(driven.lap).toBe(start.lap);
    const foot=toggleRide(driven,world);expect(foot.control.kind).toBe("foot");
    expect(actorPose(world.scene,world.scene.objects[0]!,200,foot)).toMatchObject({x:driven.x,y:driven.y,speed:0});
    const reset=resetCar(foot,world.scene);expect(reset.control.kind).toBe("car");expect(reset.vehicles.find(v=>v.id==="village_bike")!.x).toBe(driven.x);
    const reentered=toggleRide(foot,world);expect(reentered.control).toEqual(start.control);expect(reentered.x).toBe(driven.x);
    expect(reentered.vehicles.some(v=>v.id==="village_bike")).toBe(false);
  });
  it.each(["village_bike","village_skateboard"])("respects body collisions and world bounds when controlling %s",id=>{
    const w=setup(id,[{id:"wall",kind:"tire-stack",labelText:"Wall",x:580,y:360,scale:2}]);
    const driven=run(board(w),w,{throttle:1,steer:0},10);
    expect(driven.x).toBeLessThan(565);expect(driven.x).toBeGreaterThan(500);
    const open=setup(id),edge=run(board(open),open,{throttle:1,steer:0},30);
    expect(edge.x).toBeLessThanOrEqual(960-bodyWorld(edge,open).carRadius);
  });
  it.each([30,60,144])("replays direct steering deterministically at %i fps",fps=>{
    for(const id of ["village_bike","lake_boat","meadow_plane"]){
      const replay=setup(id),initial=board(replay),snapshot=structuredClone(initial),input={throttle:1,steer:.2,lift:1};
      let state=initial;const stepper=new FixedStepper();
      for(let frame=0;frame<fps*3;frame++)for(let i=0,n=stepper.push(1/fps);i<n;i++)state=stepInteractive(state,input,stepper.stepDt,replay);
      const reference=run(initial,replay,input,3);
      expect(state.x).toBeCloseTo(reference.x,9);expect(state.y).toBeCloseTo(reference.y,9);expect(state.elevation).toBeCloseTo(reference.elevation,9);expect(state.headingRad).toBeCloseTo(reference.headingRad,9);
      expect(initial).toEqual(snapshot);
    }
  });
});

describe("boat and aircraft controls",()=>{
  it("steers a boat freely, stops its full hull at the bank, and prefers dry shore when exiting",()=>{
    const world=setup("lake_boat"),start=board(world);expect(start.control.kind).toBe("vehicle");expect(exitPosition(start,world)).toBeDefined();
    const turned=run(start,world,{throttle:1,steer:.3},2);expect(turned.y).toBeGreaterThan(start.y+20);expect(turned.headingRad).toBeGreaterThan(.4);
    const bank=run(start,world,{throttle:1,steer:0},10),r=bodyWorld(bank,world).carRadius;
    expect(bank.x).toBeLessThan(710-r);expect(bank.x).toBeGreaterThan(650);
    expect(waterAt(world.scene.terrain,bank.x+r,bank.y,drivingHeight(world.scene.terrain,bank.x+r,bank.y))).toBeDefined();
    const foot=toggleRide(bank,world);expect(foot.control.kind).toBe("foot");expect(waterAt(world.scene.terrain,foot.x,foot.y,foot.elevation)).toBeUndefined();
    expect(actorPose(world.scene,world.scene.objects[0]!,100,foot)).toMatchObject({x:bank.x,y:bank.y,speed:0});
  });
  it("keeps water-current drift bounded when the occupied boat is idle",()=>{
    const base=setup("lake_boat"),scene=parseScene({...base.scene,terrain:{hills:[],landscape:{dslVersion:1,waters:[{...pond,flow:{x:5,y:0}}],bridges:[]}}}),world={...base,scene};
    const state=run(board(world),world,idle,15);expect(Math.hypot(state.vx,state.vy)).toBeLessThanOrEqual(5.1);
    expect(state.x).toBeLessThan(550);
  });
  it("starts the mock plane aligned with the runway's outgoing tangent",()=>{
    const plane=live.objects.find(o=>o.id==="meadow_plane")!;expect(actorPose(live,plane,0).headingRad).toBeCloseTo(0);
  });
  it("takes off under input, steers in the air, descends to land and rejects an airborne exit",()=>{
    const world=setup("meadow_plane");let state={...board(world),x:240,y:360};
    state=run(state,world,{throttle:1,steer:0,lift:1},2);
    expect(state.grounded).toBe(false);expect(state.elevation).toBeGreaterThan(40);expect(state.pitch).toBeGreaterThan(0);
    expect(toggleRide(state,world)).toBe(state);
    const turned=run(state,world,{throttle:1,steer:1,lift:0},.4);expect(turned.headingRad).toBeGreaterThan(state.headingRad+.3);expect(turned.bank).toBeGreaterThan(0);
    const landed=run({...turned,x:480,y:360,vx:130,vy:0,headingRad:0},world,{throttle:-1,steer:0,lift:-1},2);
    expect(landed.grounded).toBe(true);expect(landed.elevation).toBeCloseTo(drivingHeight(world.scene.terrain,landed.x,landed.y));
    expect(toggleRide(landed,world).control.kind).toBe("foot");
    const reset=resetCar(state,world.scene);expect(reset.vehicles.some(v=>v.id==="meadow_plane")).toBe(false);
  });
  it("stops a water landing at the surface and lets R recover the aircraft",()=>{
    const base=setup("meadow_plane"),scene=parseScene({...base.scene,objects:base.scene.objects.map(o=>({...o,x:150})),terrain:{hills:[],landscape:{dslVersion:1,waters:[pond],bridges:[]}}}),world={...base,scene};
    const landed=run({...board(world),x:480,y:360,elevation:20,grounded:false},world,{throttle:0,steer:0,lift:-1},1);
    expect(landed.elevation).toBe(0);expect(landed.surface).toBe("water");expect(landed.grounded).toBe(true);
    const powered=run(landed,world,{throttle:1,steer:0,lift:1},1);expect(powered.x).toBe(landed.x);expect(powered.elevation).toBe(0);
    expect(toggleRide(powered,world).control.kind).toBe('foot');
    const reset=resetCar(powered,scene);expect(actorPose(scene,scene.objects[0]!,reset.timeS,reset).x).toBe(150);
  });
  it("collides below an obstacle's top and clears it with sufficient altitude",()=>{
    const world=setup("meadow_plane",[{id:"tree",kind:"tree",labelText:"Tree",x:600,y:360,scale:1}]);
    const start={...board(world),x:480,y:360,vx:220,vy:0,elevation:20,grounded:false};
    const low=run(start,world,idle,1);expect(low.x).toBeLessThan(600);
    const high=run({...start,elevation:150},world,idle,1);expect(high.x).toBeGreaterThan(650);
  });
});
