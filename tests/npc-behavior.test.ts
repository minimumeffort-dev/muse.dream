import {describe,it,expect} from 'vitest';
import {compileDreamWorld,checkDream,formatDream} from '../src/scene/dream';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {parseScene} from '../src/scene/schema';
import {roleOf,controlFor,isActor,NPC_LIMITS} from '../src/scene/agents';
import {sceneContacts} from '../src/scene/contacts';
import {actorPose} from '../src/sim/actors';
import {createCarAtSpawn,resetCar,stepCar,type CarState,type World} from '../src/sim/car';
import {stepNpcs} from '../src/sim/npcs';
import {stepInteractive,toggleRide,nearbyRide} from '../src/sim/interaction';
import {buildPaperMask} from '../src/sim/mask';
import {validateScenePlayability} from '../src/scene/validate';
import {createWorldScene} from '../src/scene/world-fixture';
import {npcReviewStart} from '../src/game/review-start';
import {waterSchema} from '../src/scene/landscape-dsl';
import source from '../docs/examples/npc-behavior.dream?raw';

const idle={throttle:0,steer:0};
function setup(text=source):World{
  const data=compileDreamWorld(text),scene=parseScene({...createFixtureScene(),objects:data.objects,routes:data.routes,behaviors:data.behaviors,terrain:{hills:[]},regions:[]});
  return {scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
}
function tick(state:CarState,world:World,seconds:number){for(let i=0;i<Math.round(seconds*120);i++)state=stepInteractive(state,idle,1/120,world);return state;}
const world=setup(),object=world.scene.objects[0]!;
const timer=source.slice(0,source.indexOf('behavior attentive_walk'))+`behavior cycle(start=playing){
 state playing(action=perform){on pause(event=after,to=resting,seconds=.1);}
 state resting(action=idle){on resume(event=after,to=playing,seconds=.2);}
}place neighbor(object=pedestrian,at=[400,400],role=npc,behavior=cycle);`;
const vehicle=source.slice(0,source.indexOf('object pedestrian'))+`object bike(label="Bike"){
 body(interaction=solid,radius=8,height=18);rideable(at=[0,10,0],control=bicycle);
 part frame(shape=box,material=blue,at=[0,9,0],size=[20,18,6]);
}route circuit(kind=path,mode=loop,speed=20){point(at=[400,400]);point(at=[650,400]);point(at=[650,600]);}
place bike_one(object=bike,route=circuit,role=ROLE);`;

describe('Dream NPC and control ownership',()=>{
 it('compiles, formats and links bounded programs through the same module contract',()=>{
  expect(compileDreamWorld(formatDream(source))).toEqual(compileDreamWorld(source));
  const linked=compileDreamWorld('dream 2;include people(module=people);',{people:source});
  expect(linked.behaviors).toEqual(world.scene.behaviors);expect(linked.objects).toEqual(world.scene.objects);
  expect(roleOf(object)).toBe('npc');expect(controlFor(object)).toBeUndefined();
 });
 it.each([
  ['behavior=attentive_walk','behavior=missing'],['start=walking','start=missing'],['to=watching','to=missing'],
  ['event=near_player','event=javascript'],['radius=65','seconds=2'],['radius=65','radius=241'],
  ['action=patrol','action=run_script'],['action=patrol','action=patrol,face=player'],
  ['role=npc','role=prop'],['role=npc','role=controllable'],['route=promenade,role=npc','at=[400,400],role=npc'],
  ['state watching(action=idle,face=player)','state walking(action=idle,face=player)'],
 ])('rejects invalid role/program data atomically: %s -> %s',(a,b)=>{
  const result=checkDream(source.replace(a,b));expect(result.ok).toBe(false);if(!result.ok){expect(result.diagnostics[0]!.line).toBeGreaterThan(0);expect(result).not.toHaveProperty('world');}
 });
 it('rejects unreachable states, excess transitions, ambiguous conditions and scripts',()=>{
  for(const text of [source.replace('  state watching','  state unused(action=idle){}\n  state watching'),source.replace('radius=65','radius=65,seconds=1'),source.replace('    on notice',Array.from({length:5},(_,i)=>`on n${i}(event=after,to=watching,seconds=1);`).join('')+'\n    on notice'),source+'eval(script="alert(1)");'])expect(checkDream(text).ok).toBe(false);
 });
 it('retains legacy inference and separates vehicle capability from instance ownership',()=>{
  const controlled=setup(vehicle.replace('ROLE','controllable')),npc=setup(vehicle.replace('ROLE','npc'));
  const prop=setup(vehicle.replace('route=circuit,role=ROLE','at=[400,400],role=prop'));
  expect(()=>setup(vehicle.replace('ROLE','npc').replace('control=bicycle','control=boat'))).toThrow(/domain/);
  expect(controlFor(controlled.scene.objects[0])).toBe('bicycle');expect(controlFor(npc.scene.objects[0])).toBeUndefined();
  expect(isActor(prop.scene.objects[0]!)).toBe(false);expect(sceneContacts(prop.scene).solids.query(400,400,30).map(c=>c.id)).toContain('bike_one');
  for(const w of [controlled,npc,prop]){
   const foot={...createCarAtSpawn(w.scene),control:{kind:'foot' as const},x:400,y:370,elevation:0};
   expect(nearbyRide(foot,w)?.id).toBe(w===controlled ? 'bike_one' : undefined);
   expect(toggleRide(foot,w).control.kind).toBe(w===controlled ? 'vehicle' : 'foot');
  }
  const legacy=setup(vehicle.replace(',role=ROLE',''));expect(roleOf(legacy.scene.objects[0]!)).toBe('controllable');
 });
 it('bounds scene NPC count without raising route or animation budgets',()=>{
  const stationary=setup(timer),base=stationary.scene.objects[0]!;
  expect(()=>parseScene({...stationary.scene,objects:Array.from({length:33},(_,i)=>({...base,id:'n'+i}))})).toThrow(/32 NPCs/);
  expect(()=>compileDreamWorld(source+Array.from({length:16},(_,i)=>`behavior b${i}(start=idle){state idle(action=idle){}}`).join(''))).toThrow(/budget/);
  expect(NPC_LIMITS).toMatchObject({programs:16,states:8,transitions:4,actors:32});
  expect(checkDream(timer.replace('seconds=.1','seconds=301')).ok).toBe(false);
  expect(checkDream(timer.replace('seconds=.1','seconds=.09')).ok).toBe(false);
  const states=Array.from({length:9},(_,i)=>`state s${i}(action=idle){on next(event=after,to=s${(i+1)%9},seconds=1);}`).join('');
  expect(checkDream(source.slice(0,source.indexOf('behavior attentive_walk'))+`behavior too_many(start=s0){${states}}place n(object=pedestrian,at=[400,400],role=npc,behavior=too_many);`).ok).toBe(false);
 });
});

describe('fixed-step NPC programs',()=>{
 it('pauses and resumes the route at its current location with proximity hysteresis',()=>{
  let state=tick(createCarAtSpawn(world.scene),world,2);const before=actorPose(world.scene,object,state.timeS,state),routeTime=state.npcs[0]!.routeTimeS;
  state={...state,x:before.x,y:before.y+40,elevation:0};state=tick(state,world,1);
  expect(state.npcs[0]!.stateId).toBe('watching');expect(state.npcs[0]!.routeTimeS).toBe(routeTime);
  const paused=actorPose(world.scene,object,state.timeS,state);expect([paused.x,paused.y]).toEqual([before.x,before.y]);expect(paused.speed).toBe(0);
  state=tick({...state,y:before.y+80},world,1);expect(state.npcs[0]!.stateId).toBe('watching');
  state=tick({...state,y:before.y+110},world,1/120);const resumed=actorPose(world.scene,object,state.timeS,state);
  expect(state.npcs[0]!.stateId).toBe('walking');expect(Math.hypot(resumed.x-paused.x,resumed.y-paused.y)).toBeLessThan(.1);expect(resumed.speed).toBe(9);
 });
 it('uses 3D proximity and bounded heading changes without changing accepted data or input state',()=>{
  const state={...createCarAtSpawn(world.scene),x:400,y:440,elevation:100},snapshot=structuredClone(state),scene=JSON.stringify(world.scene);
  expect(stepNpcs(state,1/120,world.scene)[0]!.stateId).toBe('walking');
  const grounded={...state,elevation:0},next=stepNpcs(grounded,1/120,world.scene)[0]!;
  expect(next.stateId).toBe('watching');expect(next.headingRad-state.npcs[0]!.headingRad).toBeCloseTo(2.5/120);expect(state).toEqual(snapshot);expect(JSON.stringify(world.scene)).toBe(scene);
 });
 it('uses elapsed state time and separate animation time; rest holds the animation clock',()=>{
  const w=setup(timer);let state=tick(createCarAtSpawn(w.scene),w,.1);expect(state.npcs[0]!.stateId).toBe('resting');const animation=state.npcs[0]!.animationTimeS;
  state=tick(state,w,.1);expect(state.npcs[0]!.animationTimeS).toBe(animation);
  state=tick(state,w,.1);expect(state.npcs[0]!.stateId).toBe('playing');expect(state.npcs[0]!.animationTimeS).toBeGreaterThan(animation);
 });
 it('takes one transition per tick in declaration order',()=>{
  const w=setup(timer.replace('on pause(event=after,to=resting,seconds=.1);','on notice(event=near_player,to=resting,radius=65);on pause(event=after,to=playing,seconds=.1);').replace('seconds=.2','seconds=.1'));
  const state={...createCarAtSpawn(w.scene),x:400,y:440,elevation:0};const next=stepNpcs(state,.5,w.scene)[0]!;
  expect(next.stateId).toBe('resting');expect(next.elapsedS).toBe(0);
 });
 it('advances once while walking, driving, flying, sailing or riding as passenger; car reset preserves clocks',()=>{
  const w=setup(timer),base=createCarAtSpawn(w.scene);
  const live=createWorldScene();
  for(const id of ['village_bike','lake_boat','meadow_plane','meadow_train']){
   const template=live.objects.find(o=>o.id===id)!,obj={...template,id:'ride',role:undefined,route:template.route ? {...template.route,id:'vehicle_route'} : undefined};
   const route=live.routes.find(r=>r.id===template.route?.id)!;
   const scene=parseScene({...w.scene,objects:[...w.scene.objects,obj],routes:[...w.scene.routes,...(route ? [{...route,id:'vehicle_route'}] : [])]}),testWorld={...w,scene};
   const p=actorPose(scene,obj,0),state={...createCarAtSpawn(scene),x:p.x,y:p.y,elevation:p.elevation,control:{kind:id==='meadow_train' ? 'passenger' as const : 'vehicle' as const,id:'ride'}};
   expect(stepInteractive(state,idle,1/120,testWorld).npcs[0]!.elapsedS).toBeCloseTo(1/120);
  }
  for(const control of [{kind:'car' as const},{kind:'foot' as const}])expect(stepInteractive({...base,control},idle,1/120,w).npcs[0]!.elapsedS).toBeCloseTo(1/120);
  const state=tick(base,w,.15);expect(resetCar(state,w.scene).npcs).toEqual(state.npcs);expect(resetCar(state,w.scene,true).npcs[0]!.stateId).toBe('playing');
 });
 it('uses a live cylinder for solid stationary NPC contacts and validates their dry footprint',()=>{
  const w=setup(timer.replace('interaction=decor','interaction=solid'));
  let state={...createCarAtSpawn(w.scene),x:380,y:400,elevation:0,vx:100};state=stepCar(state,idle,.1,w);expect(state.x).toBeLessThan(386);
  const blocked=parseScene({...w.scene,objects:[...w.scene.objects,{...w.scene.objects[0]!,id:'wall',behavior:undefined,role:'prop'}]});
  expect(validateScenePlayability(blocked,buildMaskForScene(blocked),11).some(e=>e.message.includes('NPC'))).toBe(true);
  const outside=parseScene({...w.scene,objects:[{...w.scene.objects[0]!,x:0}]});
  expect(validateScenePlayability(outside,buildMaskForScene(outside),11).some(e=>e.message.includes('NPC'))).toBe(true);
  const pond=waterSchema.parse({id:'pond',polygon:[{x:350,y:350},{x:500,y:350},{x:500,y:500},{x:350,y:500}],level:0,depth:6,bankWidth:24,color:'#227788',flow:{x:0,y:0},dragPerS:2,waves:{speed:55,damping:1,strength:1}});
  const wet=parseScene({...w.scene,terrain:{hills:[],landscape:{dslVersion:1,waters:[pond],bridges:[]}}});
  expect(validateScenePlayability(wet,buildMaskForScene(wet),11).some(e=>e.message.includes('NPC'))).toBe(true);
 });
});

it('authors every live person as an NPC and every driveable instance explicitly; real review starts nearby on foot',()=>{
 const scene=createWorldScene(),w:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
 const people=scene.objects.filter(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='person');expect(people.length).toBeGreaterThan(10);expect(people.every(o=>o.role==='npc' && o.behavior)).toBe(true);
 expect(scene.behaviors.length).toBeLessThanOrEqual(16);expect(scene.objects.filter(o=>roleOf(o)==='npc').length).toBeLessThanOrEqual(32);
 const state=npcReviewStart(createCarAtSpawn(scene),w,'town_resident_0');expect(state.control.kind).toBe('foot');expect(tick(state,w,.1).npcs.find(n=>n.id==='town_resident_0')!.stateId).toBe('watching');
});
