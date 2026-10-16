import {describe,it,expect} from 'vitest';
import {compileDream} from '../src/scene/dream';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {parseScene,type SceneObject} from '../src/scene/schema';
import {waterSchema} from '../src/scene/landscape-dsl';
import {drivingHeight,terrainHeight,waterCeiling} from '../src/scene/terrain';
import {createCarAtSpawn,carFootprintClear,FixedStepper,type CarInput,type CarState,type World} from '../src/sim/car';
import {stepInteractive,toggleRide,isSwimming,bodyWorld,FOOT_HEIGHT} from '../src/sim/interaction';
import {buildPaperMask} from '../src/sim/mask';
import gardenSteps from '../docs/examples/walkable-steps.dream?raw';

const idle={steer:0,throttle:0},east={steer:1,throttle:0,viewAngle:-Math.atan2(180,480)};
const water=waterSchema.parse({id:'lake',polygon:[{x:220,y:160},{x:740,y:160},{x:740,y:560},{x:220,y:560}],level:0,depth:22,bankWidth:45,color:'#447799',flow:{x:0,y:0},dragPerS:2,waves:{speed:55,damping:1,strength:1}});
const bridge={id:'bridge',a:{x:480,y:100},b:{x:480,y:620},width:100,archHeight:22,style:'stone' as const,rails:true};
function setup(objects:SceneObject[]=[],wet=false,bridges:typeof bridge[]=[]):World{
  const scene=parseScene({...createFixtureScene(),regions:[],objects,routes:[],terrain:{hills:[],...(wet ? {landscape:{dslVersion:1,waters:[water],bridges}} : {})}});
  return {scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
}
function foot(world:World,x=350,y=360):CarState{return {...createCarAtSpawn(world.scene),control:{kind:'foot'},x,y,elevation:drivingHeight(world.scene.terrain,x,y)};}
function vehicle(profile:'bicycle'|'skateboard'|'boat'|'plane',wet=false,bridges:typeof bridge[]=[]):{world:World;state:CarState}{
  const spec=compileDream(`dream 2;material paint(style=toon,colors=[#448899,#336677]);object ride(label="Ride"){body(interaction=solid,radius=7,height=15);rideable(at=[0,8,0],control=${profile});part hull(shape=box,material=paint,at=[0,7,0],size=[20,14,10]);}`)[0]!;
  const world=setup([{id:'ride',kind:'custom',labelText:'Ride',x:350,y:360,scale:1,role:'controllable',spec}],wet,bridges);
  return {world,state:{...createCarAtSpawn(world.scene),control:{kind:'vehicle' as const,id:'ride'},x:350,y:360,headingRad:0,elevation:wet ? -2 : 0}};
}
function run(state:CarState,world:World,input:CarInput,seconds:number){for(let i=0;i<Math.round(seconds*120);i++)state=stepInteractive(state,input,1/120,world);return state;}
function stairs(ceiling=false):SceneObject{
  const source=ceiling ? gardenSteps.replace('  part low_tread','  contact ceiling(at=[0,20,0],radius=60,height=10);\n  part low_tread') : gardenSteps;
  return {id:'steps',kind:'custom',labelText:'Steps',x:430,y:360,scale:1,spec:compileDream(source)[0]!};
}

describe('walking, steps and jumping',()=>{
  it('accelerates, runs faster, brakes to rest and holds on a slope',()=>{
    const world=setup(),start=foot(world),first=stepInteractive(start,east,1/120,world),walk=run(start,world,east,1),sprint=run(start,world,{...east,sprint:true},1);
    expect(first.vx).toBeGreaterThan(0);expect(first.vx).toBeLessThan(10);expect(sprint.x-walk.x).toBeGreaterThan(25);
    const stop=run(walk,world,idle,.3);expect(Math.hypot(stop.vx,stop.vy)).toBe(0);expect(stop.x-walk.x).toBeLessThan(5);
    const scene=parseScene({...world.scene,terrain:{hills:[{id:'hill',x:480,y:360,radiusX:240,radiusY:240,height:60}]}}),slope={...world,scene},pose=foot(slope,400);
    const settled=run(pose,slope,idle,3);expect(settled.x).toBe(pose.x);expect(settled.y).toBe(pose.y);
  });
  it('jumps once per press, preserves horizontal momentum in the air, and lands',()=>{
    const world=setup(),start=run(foot(world),world,east,.4),snapshot=structuredClone(start);
    let state=start,apex=0,takeoffs=0;
    for(let i=0;i<240;i++){const next=stepInteractive(state,{...east,jump:true},1/120,world);if(state.grounded&&!next.grounded)takeoffs++;apex=Math.max(apex,next.elevation);state=next;}
    expect(apex).toBeGreaterThan(17);expect(apex).toBeLessThan(20);expect(takeoffs).toBe(1);expect(state.grounded).toBe(true);expect(state.x-start.x).toBeGreaterThan(90);expect(start).toEqual(snapshot);
    const second=stepInteractive(run(state,world,idle,.05),{...idle,jump:true},1/120,world);expect(second.grounded).toBe(false);
  });
  it('buffers a landing press and accepts a jump just after a ledge',()=>{
    const world=setup(),fall={...foot(world),grounded:false,elevation:.5,vz:-20};
    const buffered=run(fall,world,{...idle,jump:true},.1);expect(buffered.elevation).toBeGreaterThan(4);expect(buffered.vz).toBeGreaterThan(0);
    const grace={...fall,elevation:3,jump:{held:false,bufferUntilS:0,coyoteUntilS:.08}};
    expect(stepInteractive(grace,{...idle,jump:true},1/120,world).vz).toBeGreaterThan(80);
    const late=stepInteractive({...grace,timeS:.2},{...idle,jump:true},1/120,world);expect(late.vz).toBeLessThan(0);
  });
  it('climbs consecutive low steps but respects a wall and low headroom',()=>{
    const world=setup([stairs()]),up=run(foot(world,400),world,east,1.55);
    expect(up.x).toBeGreaterThan(475);expect(up.elevation).toBe(9);expect(up.grounded).toBe(true);
    const covered=setup([stairs(true)]),blocked=run(foot(covered,400),covered,east,2);expect(blocked.x).toBeLessThan(413);
    const wall=setup([{id:'wall',kind:'tire-stack',labelText:'Wall',x:440,y:360,scale:2}]);
    expect(run(foot(wall,400),wall,east,2).x).toBeLessThan(430);
  });
  it('stops jumps at ceilings and keeps the complete footprint in bounds',()=>{
    const world=setup([stairs(true)]);let state=foot(world,400);
    for(let i=0;i<160;i++){state=stepInteractive(state,{...idle,jump:true},1/120,world);expect(state.elevation+FOOT_HEIGHT).toBeLessThanOrEqual(20.001);}
    const open=setup(),edge=run(foot(open,940),open,{...east,sprint:true,jump:true},2);expect(edge.x).toBeLessThanOrEqual(957);
  });
});

describe('swimming and water transitions',()=>{
  it('walks into deep water, floats, swims faster with Shift, and walks onto the far bank',()=>{
    const world=setup([],true);let state=foot(world,180),swam=false,maxDepth=0;
    for(let i=0;i<1800;i++){state=stepInteractive(state,{...east,sprint:true},1/120,world);swam||=isSwimming(state,world);maxDepth=Math.max(maxDepth,-state.elevation);}
    expect(swam).toBe(true);expect(maxDepth).toBeCloseTo(FOOT_HEIGHT*.65);expect(state.x).toBeGreaterThan(750);expect(isSwimming(state,world)).toBe(false);expect(state.elevation).toBe(0);
    const swim={...foot(world,400),elevation:-FOOT_HEIGHT*.65,surface:'water' as const};
    expect(run(swim,world,{...east,sprint:true},2).x).toBeGreaterThan(run(swim,world,east,2).x+20);
  });
  it('allows water disembarking, reboarding and dry shore exits without duplicating a vehicle',()=>{
    const {world,state}=vehicle('boat',true),swimmer=toggleRide(state,world);
    expect(swimmer.control.kind).toBe('foot');expect(isSwimming(swimmer,world)).toBe(true);expect(swimmer.vehicles.filter(v=>v.id==='ride')).toHaveLength(1);
    const again=toggleRide(swimmer,world);expect(again.control).toEqual(state.control);expect(again.vehicles.some(v=>v.id==='ride')).toBe(false);
    const nearBank={...state,x:720};const dry=toggleRide(nearBank,world);expect(dry.control.kind).toBe('foot');expect(dry.elevation).toBeGreaterThan(-.1);expect(isSwimming(dry,world)).toBe(false);
  });
  it('swims under a bridge without climbing through its deck or ceiling',()=>{
    const world=setup([],true,[bridge]);let state:CarState={...foot(world,380),elevation:-FOOT_HEIGHT*.65,surface:'water'};
    for(let i=0;i<600;i++){
      state=stepInteractive(state,{...east,sprint:true,jump:true},1/120,world);
      expect(state.elevation).toBeCloseTo(-FOOT_HEIGHT*.65);expect(state.elevation+FOOT_HEIGHT).toBeLessThan(waterCeiling(world.scene.terrain,state.x,state.y,3));
    }
    expect(state.x).toBeGreaterThan(540);expect(isSwimming(state,world)).toBe(true);
  });
});

describe('bicycle, skateboard, boat and plane handling',()=>{
  it.each(['bicycle','skateboard'] as const)('gives %s a single controlled jump and retains its collision body',profile=>{
    const {world,state}=vehicle(profile),moving=run(state,world,{throttle:1,steer:0},.7),jump=run(moving,world,{throttle:1,steer:.2,jump:true},.2);
    expect(jump.grounded).toBe(false);expect(jump.elevation).toBeGreaterThan(6);expect(carFootprintClear(bodyWorld(jump,world),jump.x,jump.y,jump.elevation,jump.timeS,jump)).toBe(true);
    const landed=run(jump,world,{throttle:0,steer:0,jump:true},1);expect(landed.grounded).toBe(true);expect(landed.elevation).toBe(0);
  });
  it('leans the bicycle into a turn and opens its turning radius at higher speed',()=>{
    const {world,state}=vehicle('bicycle'),slow=stepInteractive({...state,vx:40},{throttle:0,steer:1},1/120,world),fast=stepInteractive({...state,vx:140},{throttle:0,steer:1},1/120,world);
    expect(slow.headingRad).toBeGreaterThan(0);expect(fast.bank).toBeGreaterThan(0);
    expect(140/fast.headingRad).toBeGreaterThan(40/slow.headingRad*2);
  });
  it('keeps boat momentum across a rudder turn, jumps, and splashes down once',()=>{
    const {world,state}=vehicle('boat',true),moving={...state,vx:100},turn=stepInteractive(moving,{throttle:0,steer:1},1/120,world);
    expect(turn.headingRad).toBeGreaterThan(0);expect(Math.atan2(turn.vy,turn.vx)).toBeLessThan(turn.headingRad*.2);
    const jump=run(state,world,{...idle,jump:true},.2);expect(jump.grounded).toBe(false);expect(jump.elevation).toBeGreaterThan(2);
    const landed=run(jump,world,{...idle,jump:true},1);expect(landed.grounded).toBe(true);expect(landed.elevation).toBe(-2);
  });
  it('passes below a bridge, limits a hop to its headroom and stops a tall hull',()=>{
    const {world,state}=vehicle('boat',true,[bridge]);let boat={...state,vx:100};
    for(let i=0;i<360;i++){boat=stepInteractive(boat,{throttle:1,steer:0,jump:i>120},1/120,world);expect(boat.elevation+15).toBeLessThanOrEqual(waterCeiling(world.scene.terrain,boat.x,boat.y,Math.hypot(10,5))+.001);}
    expect(boat.x).toBeGreaterThan(550);expect(boat.elevation).toBe(-2);
    const low={...world,scene:parseScene({...world.scene,terrain:{...world.scene.terrain,landscape:{...world.scene.terrain.landscape!,bridges:[{...bridge,archHeight:8}]}}})};
    expect(run(state,low,{throttle:1,steer:0},4).x).toBeLessThan(420);
  });
  it('smooths aircraft climb, holds altitude at airspeed and sinks when stalled',()=>{
    const {world,state}=vehicle('plane'),flying={...state,vx:200,elevation:100,grounded:false},first=stepInteractive(flying,{...idle,lift:1},1/120,world);
    expect(first.vz).toBeGreaterThan(0);expect(first.vz).toBeLessThan(2);
    const climbed=run(flying,world,{throttle:1,steer:0,lift:1},.5);expect(climbed.vz).toBeGreaterThan(40);
    const level=run({...flying,vz:0},world,{throttle:1,steer:0,lift:0},1);expect(level.elevation).toBeCloseTo(100);
    const stalled=run({...flying,vx:40},world,idle,.5);expect(stalled.elevation).toBeLessThan(90);expect(stalled.vz).toBeLessThan(-40);
    const noseUp=run({...flying,vx:90},world,{...idle,lift:1},.5);expect(noseUp.elevation).toBeLessThan(98);expect(noseUp.vz).toBeLessThan(0);
  });
  it('lets gravity bring an aircraft down after a wall impact instead of freezing it in the air',()=>{
    const {world,state}=vehicle('plane'),blocked={...world,scene:parseScene({...world.scene,objects:[...world.scene.objects,{id:'wall',kind:'tree',labelText:'Wall',x:430,y:360,scale:2}]})};
    const stopped=run({...state,vx:200,elevation:20,grounded:false},blocked,idle,2);
    expect(stopped.x).toBeLessThan(420);expect(stopped.grounded).toBe(true);expect(stopped.elevation).toBe(0);
  });
  it.each([0,Math.PI/2,Math.PI,-Math.PI/2])('keeps airspeed at the world edge and turns back from heading %s',headingRad=>{
    const {world,state}=vehicle('plane'),radius=bodyWorld(state,world).carRadius;
    const start={...state,x:480+Math.cos(headingRad)*(480-radius-2),y:360+Math.sin(headingRad)*(360-radius-2),headingRad,vx:Math.cos(headingRad)*250,vy:Math.sin(headingRad)*250,elevation:100,grounded:false};
    const snapshot=structuredClone(start),edge=run(start,world,{throttle:1,steer:0},.5);
    expect(Math.hypot(edge.vx,edge.vy)).toBeGreaterThan(200);expect(edge.grounded).toBe(false);
    let returned=edge;
    for(let i=0;i<480;i++){
      returned=stepInteractive(returned,{throttle:1,steer:1},1/120,world);
      expect(world.driveMask.footprintClear(returned.x,returned.y,radius)).toBe(true);
    }
    expect(returned.headingRad-headingRad).toBeGreaterThan(3);
    expect((returned.x-edge.x)*Math.cos(headingRad)+(returned.y-edge.y)*Math.sin(headingRad)).toBeLessThan(-50);
    expect(start).toEqual(snapshot);
  });
  it.each([-1,1])('can steer %s out of every world corner without crossing its footprint boundary',steer=>{
    for(const sx of [-1,1])for(const sy of [-1,1]){
      const {world,state}=vehicle('plane'),radius=bodyWorld(state,world).carRadius,headingRad=Math.atan2(sy,sx);
      let flying={...state,x:sx<0 ? radius+2 : 960-radius-2,y:sy<0 ? radius+2 : 720-radius-2,headingRad,vx:Math.cos(headingRad)*250,vy:Math.sin(headingRad)*250,elevation:100,grounded:false};
      for(let i=0;i<480;i++){
        flying=stepInteractive(flying,{throttle:1,steer},1/120,world);
        expect(world.driveMask.footprintClear(flying.x,flying.y,radius)).toBe(true);
      }
      expect(flying.x).toBeGreaterThan(radius+50);expect(flying.x).toBeLessThan(960-radius-50);
      expect(flying.y).toBeGreaterThan(radius+50);expect(flying.y).toBeLessThan(720-radius-50);
      expect(flying.grounded).toBe(false);
    }
  });
  it('keeps edge turns deterministic at 30, 60 and 144 render fps and still stalls when braking',()=>{
    const {world,state}=vehicle('plane'),start={...state,x:950,y:360,vx:250,elevation:100,grounded:false},input={throttle:1,steer:-1};
    const reference=run(start,world,input,4);
    for(const fps of [30,60,144]){
      let flying=start;const clock=new FixedStepper();
      for(let frame=0;frame<fps*4;frame++)for(let i=0,n=clock.push(1/fps);i<n;i++)flying=stepInteractive(flying,input,clock.stepDt,world);
      expect(flying).toEqual(reference);
    }
    const stalled=run({...start,vx:40},world,{throttle:-1,steer:0},1);
    expect(stalled.elevation).toBeLessThan(80);expect(stalled.vz).toBeLessThan(0);
  });
  it.each([30,60,144])('replays jumping and swimming at %i fps without mutating its input',fps=>{
    for(const wet of [false,true]){
      const world=setup([],wet),start=wet ? {...foot(world,350),elevation:-FOOT_HEIGHT*.65} : foot(world),snapshot=structuredClone(start),input={...east,jump:true,sprint:true};
      let state=start;const clock=new FixedStepper();for(let frame=0;frame<fps*2;frame++)for(let i=0,n=clock.push(1/fps);i<n;i++)state=stepInteractive(state,input,clock.stepDt,world);
      expect(state).toEqual(run(start,world,input,2));expect(start).toEqual(snapshot);
    }
  });
});
