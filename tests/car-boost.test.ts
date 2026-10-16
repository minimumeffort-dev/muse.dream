import {describe,expect,it} from 'vitest';
import {createFixtureScene,buildMaskForScene,CAR_RADIUS} from '../src/scene/fixture';
import {parseScene} from '../src/scene/schema';
import {compileDream} from '../src/scene/dream';
import {waterSchema} from '../src/scene/landscape-dsl';
import {buildPaperMask} from '../src/sim/mask';
import {CAR_BOOST,TUNING,createCarAtSpawn,stepCar,resetCar,FixedStepper,isCarControl,type CarInput,type CarState,type World} from '../src/sim/car';
import {stepInteractive,toggleRide} from '../src/sim/interaction';
import {objectRadius} from '../src/sim/archetypes';

const DT=1/120,idle={throttle:0,steer:0},press={...idle,boost:true};
const fixture=createFixtureScene();
const scene=parseScene({...fixture,objects:[],regions:[],terrain:{hills:[]}});
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:CAR_RADIUS};
const start=()=>({...createCarAtSpawn(scene),x:100,y:360,headingRad:0});
function run(state:CarState,input:CarInput,seconds:number,w=world):CarState {
  for(let i=0;i<Math.round(seconds/DT);i++)state=stepInteractive(state,input,DT,w);
  return state;
}

describe('manual car boost',()=>{
  it('adds one second of forward thrust from a press, with immutable input state',()=>{
    const initial=start(),snapshot=structuredClone(initial),first=stepCar(initial,press,DT,world);
    expect(initial).toEqual(snapshot);
    expect(first.boostedThisStep).toBe(true);
    expect(first.carBoost.activeUntilS-first.timeS).toBe(CAR_BOOST.durationS);
    expect(first.carBoost.readyAtS-first.carBoost.activeUntilS).toBe(CAR_BOOST.rechargeS);
    const burst=run(first,idle,.8),normal=run(initial,idle,.8);
    expect(burst.vx).toBeGreaterThan(400);
    expect(burst.x-normal.x).toBeGreaterThan(100);
    const ended=run(burst,idle,.3);
    expect(ended.carBoost.activeUntilS).toBeLessThan(ended.timeS);
  });

  it('requires release and a fresh press after recharging, even when held for seven seconds',()=>{
    let state=start(),fired=0;
    for(let i=0;i<840;i++){
      state=stepCar(state,press,DT,world);
      fired+=Number(state.boostedThisStep);
    }
    expect(fired).toBe(1);
    state=stepCar(state,idle,DT,world);
    expect(stepCar(state,press,DT,world).boostedThisStep).toBe(true);
  });

  it('does not queue an early press or share its recharge with boost pads',()=>{
    const first=stepCar(start(),press,DT,world);
    const release=stepCar(first,idle,DT,world),early=stepCar(release,press,DT,world);
    expect(early.boostedThisStep).toBe(false);
    const held=run(early,press,6);
    expect(held.boostedThisStep).toBe(false);
    expect(held.carBoost.readyAtS).toBe(first.carBoost.readyAtS);

    const pads={...world,scene:fixture};
    const hit=stepCar({...first,x:811,y:360,headingRad:-Math.PI/2,vx:0,vy:-500},press,DT,pads);
    expect(hit.boostedThisStep).toBe(true);
    expect(Object.keys(hit.boostReadyAtS)).toHaveLength(1);
    expect(hit.carBoost.readyAtS).toBe(first.carBoost.readyAtS);
    expect(Math.hypot(hit.vx,hit.vy)).toBeLessThanOrEqual(TUNING.boostSpeedCap);
    const both=stepCar({...start(),x:811,y:360,headingRad:-Math.PI/2,vx:0,vy:-500},press,DT,pads);
    expect(both.carBoost.readyAtS).toBeGreaterThan(0);
    expect(Object.keys(both.boostReadyAtS)).toHaveLength(1);
    expect(Math.hypot(both.vx,both.vy)).toBeLessThanOrEqual(TUNING.boostSpeedCap);
  });

  it('accepts a fresh button press while Shift is held, and a tap between fixed ticks',()=>{
    const held=run(start(),press,7);
    expect(stepCar(held,{...press,boostPressed:true},DT,world).boostedThisStep).toBe(true);
    expect(stepCar(start(),{...idle,boostPressed:true},DT,world).boostedThisStep).toBe(true);
  });

  it('brakes immediately out of a burst while retaining the recharge',()=>{
    const first=run(start(),press,.25),braked=stepCar(first,{...press,throttle:-1},DT,world);
    expect(braked.carBoost.activeUntilS).toBe(0);
    expect(braked.vx).toBeLessThan(first.vx);
    expect(braked.carBoost.readyAtS).toBe(first.carBoost.readyAtS);
  });

  it.each(['airborne','reverse','water'] as const)('rejects a press while %s without storing a future burst',kind=>{
    let state=start(),w=world;
    if(kind==='airborne')state={...state,grounded:false,elevation:100};
    if(kind==='reverse')state={...state,vx:-50};
    if(kind==='water'){
      const pond=waterSchema.parse({id:'pond',polygon:[{x:40,y:200},{x:800,y:200},{x:800,y:600},{x:40,y:600}],level:0,depth:6,bankWidth:32,color:'#227788',flow:{x:0,y:0},dragPerS:2,waves:{speed:55,damping:1,strength:1}});
      w={...world,scene:parseScene({...scene,terrain:{hills:[],landscape:{dslVersion:1,waters:[pond],bridges:[]}}})};
    }
    const rejected=stepCar(state,press,DT,w);
    expect(rejected.carBoost.readyAtS).toBe(0);
    expect(rejected.boostedThisStep).toBe(false);
    expect(stepCar({...rejected,grounded:true,elevation:0,vx:0,vy:0},press,DT,world).boostedThisStep).toBe(false);
  });

  it('keeps cooldown on R, cancels the burst on exit, and refills on Start over',()=>{
    const active=stepCar(start(),press,DT,world),reset=resetCar(active,scene);
    expect(reset.carBoost.activeUntilS).toBe(0);
    expect(reset.carBoost.readyAtS).toBe(active.carBoost.readyAtS);
    expect(resetCar(active,scene,true).carBoost).toEqual({held:false,activeUntilS:0,readyAtS:0});
    const foot=toggleRide(active,world);
    expect(foot.control.kind).toBe('foot');
    expect(foot.carBoost.activeUntilS).toBe(0);
    expect(foot.carBoost.readyAtS).toBe(active.carBoost.readyAtS);
  });

  it.each(['car','bicycle','skateboard','scooter','boat','plane','passenger','foot'])(
    'respects the %s control profile, including Shift held while boarding',profile=>{
      const control=profile==='passenger' ? '' : `,control=${profile==='foot' ? 'car' : profile}`;
      const spec=compileDream(`dream 2;material paint(style=toon,colors=[#226655,#226655]);object ride(label="Ride"){body(interaction=solid,radius=8,height=20);rideable(at=[0,12,0]${control});part frame(shape=box,material=paint,at=[0,10,0],size=[20,20,8]);}`)[0]!;
      const passenger=profile==='passenger';
      const s=parseScene({...scene,routes:passenger ? [{id:'tour',kind:'path',points:[{x:480,y:360},{x:700,y:360}],mode:'shuttle',speed:30,waitS:0}] : [],objects:[{id:'ride',labelText:'Ride',kind:'custom',x:480,y:360,scale:1,role:passenger ? 'npc' : 'controllable',...(passenger ? {route:{id:'tour',offset:0}} : {}),spec}]});
      const w={...world,scene:s};
      const state={...start(),x:480,control:profile==='foot' ? {kind:'foot' as const} : profile==='passenger' ? {kind:'passenger' as const,id:'ride'} : {kind:'vehicle' as const,id:'ride'}};
      const result=stepInteractive(state,press,DT,w);
      expect(isCarControl(result,w)).toBe(profile==='car');
      expect(result.carBoost.readyAtS>0).toBe(profile==='car');
      if(profile==='foot'){
        const boarded=toggleRide(result,w);
        expect(boarded.control).toEqual({kind:'vehicle',id:'ride'});
        expect(stepInteractive(boarded,press,DT,w).boostedThisStep).toBe(false);
      }
    });

  it('uses the existing conservative collisions on and off road at boosted speed',()=>{
    const w={...world,scene:fixture},castle=fixture.objects.find(o=>o.id==='obj-invented-castle')!;
    let state={...createCarAtSpawn(fixture),x:castle.x,y:591,headingRad:-Math.PI/2,vx:0,vy:-490};
    for(let i=0;i<180;i++){
      state=stepCar(state,{...press,throttle:1},DT,w);
      expect(Math.hypot(state.x-castle.x,state.y-castle.y)).toBeGreaterThanOrEqual(CAR_RADIUS+objectRadius(castle));
      expect(w.driveMask.footprintClear(state.x,state.y,CAR_RADIUS)).toBe(true);
    }
    const roadOnly={...world,driveMask:world.roadMask};
    const stopped=run({...start(),x:480,y:615,headingRad:Math.PI/2},press,1,roadOnly);
    expect(roadOnly.driveMask.footprintClear(stopped.x,stopped.y,CAR_RADIUS)).toBe(true);
    expect(stopped.y).toBeLessThan(650-CAR_RADIUS+1);
  });

  it('retains directional racing checkpoints through a boost',()=>{
    const result=run({...start(),x:455,y:591,vx:220,nextCheckpoint:0},press,.2);
    expect(result.x).toBeGreaterThan(480);
    expect(result.lap).toBe(1);
    expect(result.nextCheckpoint).toBe(1);
  });

  it('replays the same burst and recharge at 30, 60 and 144 render fps',()=>{
    const replay=(fps:number)=>{
      let state=start(),tick=0;const stepper=new FixedStepper();
      for(let frame=0;frame<fps*7;frame++)for(let i=0,n=stepper.push(1/fps);i<n;i++){
        state=stepInteractive(state,{throttle:1,steer:.2,boost:tick<130 || tick>=760},DT,world);tick++;
      }
      expect(tick).toBe(840);return state;
    };
    expect(replay(30)).toEqual(replay(60));
    expect(replay(144)).toEqual(replay(60));
  });
});
