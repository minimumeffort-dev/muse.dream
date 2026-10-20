import characters from "../src/scene/world/city_people.dream?raw";
import {describe,it,expect} from 'vitest';
import source from '../src/scene/world/sports_assets.dream?raw';
import {compileDream,compileDreamWorld,formatDream,checkDream} from '../src/scene/dream';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {parseScene,type SceneObject} from '../src/scene/schema';
import {createWorldScene} from '../src/scene/world-fixture';
import {measuredScale} from '../src/scene/measure';
import {sportTargets} from '../src/scene/sports';
import {createCarAtSpawn,resetCar,FixedStepper,type CarState,type CarInput,type World} from '../src/sim/car';
import {stepInteractive,toggleRide} from '../src/sim/interaction';
import {activeSport,stepSports,cancelSportAction,sportCharge} from '../src/sim/sports';
import {buildPaperMask} from '../src/sim/mask';
import {sportCameraFrame} from '../src/game/camera';
import {mapDestinations} from '../src/game/navigation';
import {poseSportBall,rollSportBall} from '../src/game/sports';
import {buildObject} from '../src/game/world3d';
import {Quaternion,Vector3} from 'three';

const assemblies=compileDreamWorld(source,{city_people:characters}).assemblies,idle={steer:0,throttle:0},DT=1/120;
const place=(id:string,label:string,x:number,y:number,headingRad=0):SceneObject=>{
  const spec=assemblies.find(a=>a.displayName===label)!;
  return {id,labelText:label,kind:'custom',role:'prop',spec,scale:measuredScale(spec),x,y,headingRad};
};
const scene=parseScene({...createFixtureScene(),regions:[],terrain:{hills:[]},
  objects:[place('football','Football',480,560),place('goal_a','Football goal',200,560,Math.PI/2),place('goal_b','Football goal',760,560,-Math.PI/2),place('basketball','Basketball',340,275),place('hoop_a','Basketball hoop',192,275,-Math.PI/2),place('hoop_b','Basketball hoop',488,275,Math.PI/2)],
  surfaces:[{id:'pitch',color:'#59834f',points:[{x:200,y:460},{x:760,y:460},{x:760,y:660},{x:200,y:660}]},{id:'court',color:'#647f8b',points:[{x:200,y:200},{x:480,y:200},{x:480,y:350},{x:200,y:350}]}],
  sports:[{id:'soccer',kind:'football',surfaceId:'pitch',ballId:'football',targets:['goal_a','goal_b'],targetAt:[0,12,0],targetSize:[72,24]},{id:'hoops',kind:'basketball',surfaceId:'court',ballId:'basketball',targets:['hoop_a','hoop_b'],targetAt:[0,30,12],targetSize:[4.3,4.3]}]});
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
function foot(kind:'football'|'basketball'):CarState {
  const object=scene.objects.find(o=>o.id===kind)!;
  return {...createCarAtSpawn(scene),control:{kind:'foot'},x:object.x-6,y:object.y,headingRad:0,elevation:0};
}
function run(state:CarState,input:CarInput,steps:number,w=world){for(let i=0;i<steps;i++)state=stepInteractive(state,input,DT,w);return state;}
const game=(state:CarState,kind='soccer')=>state.sports.find(g=>g.id===kind)!;
const ball=(state:CarState,kind='football')=>state.props.find(p=>p.id===kind)!;

describe('Dream sports contracts',()=>{
  it('connects both actual mock grounds, physical balls and local target anchors',()=>{
    const live=createWorldScene();expect(live.sports.map(s=>s.kind).sort()).toEqual(['basketball','football']);
    for(const sport of live.sports){expect(live.objects.some(o=>o.id===sport.ballId)).toBe(true);expect(sportTargets(live,sport)).toHaveLength(2);}
    expect(mapDestinations(live).filter(d=>d.kind==='football' || d.kind==='basketball').map(d=>d.symbol).sort()).toEqual(['B','F']);
    const rim=assemblies.find(a=>a.displayName==='Basketball hoop')!;
    expect(rim.parts.filter(p=>p.position[1]===30 && p.shape==='cylinder')).toHaveLength(16);
  });
  it('formats and links the new command without changing the authoring version',()=>{
    const text='dream 2;sport practice(kind=football,surface=turf,ball=ball,targets=[west,east],target_at=[0,12,0],target_size=[72,24]);';
    expect(compileDreamWorld(formatDream(text)).sports).toEqual(compileDreamWorld(text).sports);
    expect(checkDream(text.replace('kind=football','kind=code')).ok).toBe(false);
    const modules=Object.fromEntries(Array.from({length:9},(_,i)=>['m'+i,text.replace('practice','p'+i)]));
    expect(()=>compileDreamWorld('dream 2;'+Object.keys(modules).map((module,i)=>`include i${i}(module=${module});`).join(''),modules)).toThrow(/8 sports/);
  });
  it.each(['ball','surface','target','round','shared','heading','anchor'])("rejects invalid %s connections",kind=>{
    const data=structuredClone(scene);
    if(kind==='ball')data.sports[0]!.ballId='missing';
    if(kind==='surface')data.sports[0]!.surfaceId='missing';
    if(kind==='target')data.sports[0]!.targets[0]='missing';
    if(kind==='round'){const spec=data.objects[0]!.spec!;if('body' in spec)spec.body.colliderHeight=4;}
    if(kind==='shared')data.sports.push({...data.sports[0]!,id:'second'});
    if(kind==='heading')data.objects[1]!.headingRad=-Math.PI/2;
    if(kind==='anchor')data.sports[0]!.targetAt=[0,100,0];
    expect(()=>parseScene(data)).toThrow();
  });
});

describe('walk-up sports',()=>{
  it('switches context only after leaving a car and entering a sports surface on foot',()=>{
    const car={...createCarAtSpawn(scene),x:470,y:560};expect(activeSport(car,scene)).toBeUndefined();
    expect(activeSport(toggleRide(car,world),scene)?.sport.kind).toBe('football');
    expect(activeSport({...foot('football'),x:100},scene)).toBeUndefined();
  });
  it('dribbles a football with walking, kicks on release, and preserves the original state',()=>{
    const initial=foot('football'),snapshot=structuredClone(initial),angle=Math.atan2(180,480);
    const moved=run(initial,{steer:Math.cos(angle),throttle:-Math.sin(angle),shoot:true},120);
    expect(initial).toEqual(snapshot);expect(moved.x).toBeGreaterThan(initial.x+40);
    expect(Math.hypot(ball(moved).x-moved.x,ball(moved).y-moved.y)).toBeLessThan(10);
    expect(game(moved).shots).toBe(0);
    const shot=stepInteractive(moved,idle,DT,world);expect(game(shot).shots).toBe(1);expect(ball(shot).vx).toBeGreaterThan(200);
    expect(shot.control.kind).toBe('foot');expect(shot.carBoost.readyAtS).toBe(0);
  });
  it('scores once across the complete football goal line and resets the ball after the celebration',()=>{
    let state=run(foot('football'),{...idle,shoot:true},108);state=stepInteractive(state,idle,DT,world);
    state=run(state,idle,150);expect(game(state).score,JSON.stringify({game:game(state),ball:ball(state),targets:sportTargets(scene,scene.sports[0]!)})).toBe(1);expect(game(state).made).toBe(1);
    state=run(state,idle,240);expect(game(state).score).toBe(1);expect(ball(state).x).toBeCloseTo(480,0);
  });
  it('uses an explicit aim point instead of goal assistance, and rebounds off a post',()=>{
    const held=run(foot('football'),{...idle,shoot:true,aim:{x:474,y:650}},100);
    const shot=stepInteractive(held,{...idle,aim:{x:474,y:650}},DT,world);
    expect(Math.abs(ball(shot).vx)).toBeLessThan(1);expect(ball(shot).vy).toBeGreaterThan(300);
    const target=sportTargets(scene,scene.sports[0]!)[1]!,old=foot('football');
    Object.assign(ball(old),{x:759,y:560+target.width/2,elevation:0,vx:300,vy:0});
    const next=structuredClone(old);next.timeS+=DT;ball(next).x=762;
    const bounced=stepSports(next,old,idle,DT,world);expect(ball(bounced).vx).toBeLessThan(0);expect(game(bounced).score).toBe(0);
  });
  it('dribbles a basketball, shoots a real arc at the gold mark and makes a three',()=>{
    const held=run(foot('basketball'),{...idle,shoot:true},70);expect(game(held,'hoops').possessed).toBe(true);
    expect(sportCharge(held,game(held,'hoops'))).toBeCloseTo(.64,1);
    let shot=stepInteractive(held,idle,DT,world);expect(ball(shot,'basketball').vz).toBeGreaterThan(100);
    shot=run(shot,idle,145);expect(game(shot,'hoops').score).toBe(3);expect(game(shot,'hoops').made).toBe(1);
  });
  it('makes a two from close range and does not reward an underpowered shot',()=>{
    let near=foot('basketball');near={...near,x:242,props:near.props.map(p=>p.id==='basketball' ? {...p,x:248} : p)};
    const held=run(near,{...idle,shoot:true},70),shot=run(stepInteractive(held,idle,DT,world),idle,145);
    expect(game(shot,'hoops').score).toBe(2);
    const weak=run(stepInteractive(foot('basketball'),{...idle,shootPressed:true,shootReleased:true},DT,world),idle,145);
    expect(game(weak,'hoops').score).toBe(0);
  });
  it('accepts only downward ring crossings and bounces an edge hit',()=>{
    const target=sportTargets(scene,scene.sports[1]!)[0]!;
    for(const [from,to,x,expected] of [[31,29,target.x,2],[29,31,target.x,0],[31,29,target.x+10,0]] as const){
      const old=foot('basketball'),radius=scene.objects[3]!.scale*4;
      Object.assign(ball(old,'basketball'),{x,y:target.y,elevation:from-radius,vz:to<from ? -100 : 100});
      const next=structuredClone(old);next.timeS+=DT;Object.assign(ball(next,'basketball'),{elevation:to-radius});
      expect(game(stepSports(next,old,idle,DT,world),'hoops').score).toBe(expected);
    }
  });
  it('returns out-of-bounds balls and preserves scores on R but clears them on Start over',()=>{
    let state=foot('football');ball(state).y=700;state=stepInteractive(state,idle,DT,world);
    expect(game(state).event).toBe('out');state=run(state,idle,250);expect(ball(state).y).toBe(560);
    game(state).score=4;expect(game(resetCar(state,scene)).score).toBe(4);expect(game(resetCar(state,scene,true)).score).toBe(0);
  });
  it('cancels charging on leaving the field, boarding and losing focus without an accidental shot',()=>{
    const held=run(foot('basketball'),{...idle,shoot:true},30);
    expect(game(run({...held,x:100},idle,1),'hoops').shots).toBe(0);
    expect(game(run({...held,control:{kind:'car'}},idle,1),'hoops').shots).toBe(0);
    const cancelled=cancelSportAction(held);expect(game(held,'hoops').chargeStartS).not.toBeNull();
    expect(game(run(cancelled,idle,1),'hoops').shots).toBe(0);
  });
  it('keeps shots and physics identical at 30, 60 and 144 render fps',()=>{
    const replay=(fps:number)=>{let state=foot('basketball'),tick=0;const stepper=new FixedStepper();
      for(let frame=0;frame<fps*3;frame++)for(let i=0,n=stepper.push(1/fps);i<n;i++)state=stepInteractive(state,{...idle,shoot:tick++<70},DT,world);
      expect(tick).toBe(360);return state;};
    expect(replay(30)).toEqual(replay(60));expect(replay(144)).toEqual(replay(60));
  });
  it('frames possession closely and widens for a free ball without changing heading',()=>{
    const close=sportCameraFrame({x:0,y:0},{x:6,y:0},'basketball',{x:100,y:0});
    const wide=sportCameraFrame({x:0,y:0},{x:400,y:0},'basketball');
    expect(close.zoom).toBe(4);expect(wide.zoom).toBeLessThan(close.zoom);expect(wide.x).toBe(200);
    expect(close.y).toBe(0);
  });
  it('rolls the visible assembly around its body centre without sinking or orbiting',()=>{
    const object=scene.objects[0]!,group=buildObject(object);group.position.set(100,3,200);group.rotation.y=.7;group.updateMatrixWorld(true);
    const before=group.localToWorld(new Vector3(0,4,0));
    poseSportBall(group,new Quaternion().setFromAxisAngle(new Vector3(1,0,1).normalize(),2.4),object.scale*4);group.updateMatrixWorld(true);
    expect(group.localToWorld(new Vector3(0,4,0)).distanceTo(before)).toBeLessThan(1e-7);
  });
  it('rolls carried balls by visible travel, freezing during pause and skipping reset teleports',()=>{
    const group=buildObject(scene.objects[0]!),radius=scene.objects[0]!.scale*4;
    rollSportBall(group,{x:0,y:0},radius,true);rollSportBall(group,{x:radius,y:0},radius,true);
    const spin=group.userData.ballRotation as Quaternion;expect(spin.angleTo(new Quaternion())).toBeCloseTo(1);
    const before=spin.clone();rollSportBall(group,{x:radius*2,y:0},radius,false);expect(spin.angleTo(before)).toBeLessThan(1e-7);
    rollSportBall(group,{x:1000,y:0},radius,true);expect(spin.angleTo(before)).toBeLessThan(1e-7);
  });
});
