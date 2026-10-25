import {beforeAll,afterEach,it,expect} from 'vitest';
import native from './fixtures/crowd-flow-r113-save-v19.json';
import oldEngine from './fixtures/crowd-flow-old54-generated.json';
import sample from '../docs/evidence/station-review/crowd-before.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientNavigation,ambientGraph,primeAmbientNavigation} from '../src/scene/ambient-navigation';
import {sceneContactData,primeSceneContacts} from '../src/scene/contacts';
import {ambientObjects,stepAmbient} from '../src/sim/ambient';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave,SAVE_VERSION} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {stepInteractive} from '../src/sim/interaction';
import {checkEconomyState} from '../src/sim/commerce';
import {AMBIENT_LIMITS} from '../src/scene/ambient';
let scene:ReturnType<typeof createWorldScene>,world:World,prior:World,snapshot:string;
beforeAll(()=>{
 scene=createWorldScene();snapshot=JSON.stringify(scene);
 world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.CROWD_FLOW_COMPATIBILITY,previousCrowdFlowSaveCompatibility:c.WALKING_LINKS_COMPATIBILITY,previousWalkingLinksSaveCompatibility:c.CROSSING_ACCESS_COMPATIBILITY};
 prior={...world,saveCompatibility:c.WALKING_LINKS_COMPATIBILITY,previousCrowdFlowSaveCompatibility:undefined};
},60000);
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));
const seeded=(base:CarState):CarState=>{
 const objects=ambientObjects(scene),members=new Map(sample.sample.map(m=>[m.id,m]));
 return {...base,control:{kind:'foot' as const},x:12183,y:4846,elevation:0,vx:0,vy:0,vz:0,grounded:true,vehicles:[{id:null,x:base.x,y:base.y,elevation:base.elevation,headingRad:base.headingRad,distance:base.distance}],population:{...base.population!,members:base.population!.members.map((m,i)=>{const found=members.get(objects[i]!.id);if(!found)return m;const {id,...pose}=found;return {...pose,mode:'walk' as const,pauseUntil:0,until:0};})}};
};
const focus=()=>{const ids=new Set(sample.sample.map(m=>m.id));return ambientObjects(scene).map((o,i)=>ids.has(o.id)?i:-1).filter(i=>i>=0);};

it('registers only simulation 55 over exact r113 and retains the simulation-54 projection',async()=>{
 expect(SAVE_VERSION).toBe(19);expect(c.SAVE_SIMULATION_VERSION).toBe(55);expect(scene.revisionId).toBe('r113');
 const current=c.saveCompatibilitySource(scene),old=c.preCrowdFlowCompatibilitySource(scene);expect(await c.sha256(current)).toBe(c.CROWD_FLOW_COMPATIBILITY);expect(await c.sha256(old)).toBe(c.WALKING_LINKS_COMPATIBILITY);expect(JSON.parse(current)).toEqual({...JSON.parse(old),simulationVersion:55});
 expect(await c.sha256(c.preWalkingLinksCompatibilitySource(scene))).toBe(c.CROSSING_ACCESS_COMPATIBILITY);expect(ambientObjects(scene)).toHaveLength(189);expect(AMBIENT_LIMITS.members).toBe(192);expect(AMBIENT_LIMITS.tickSeconds).toBe(.05);
});
it('clears the six observed stuck poses without overlap, unsupported movement or teleporting',()=>{
 let state=seeded(createCarAtSpawn(scene));state={...state,timeS:sample.time,population:{...state.population!,tick:Math.floor(sample.time/.05)}};
 const indices=focus(),objects=ambientObjects(scene),nav=ambientNavigation(scene),start=structuredClone(state.population!);expect(indices).toHaveLength(6);
 for(let tick=0;tick<600;tick++){
  state={...state,population:stepAmbient(state,.05,scene),timeS:state.timeS+.05};
  for(const i of indices){const m=state.population!.members[i]!,radius=nav.radius(objects[i]!);expect(nav.clear(m.x,m.y,radius,true),objects[i]!.id).toBe(true);expect(Math.hypot(m.x-m.fromX,m.y-m.fromY)).toBeLessThanOrEqual(objects[i]!.ambient!.motion.speed*.05+1e-7);
   for(let j=0;j<objects.length;j++)if(j!==i&&objects[j]!.ambient!.motion.kind==='walk'){const n=state.population!.members[j]!;expect(Math.hypot(m.x-n.x,m.y-n.y)+1e-4).toBeGreaterThanOrEqual(radius+nav.radius(objects[j]!));}
  }
 }
 for(const i of indices){const m=state.population!.members[i]!,old=start.members[i]!;expect(Math.hypot(m.x-old.x,m.y-old.y),objects[i]!.id).toBeGreaterThan(150);expect(m.node,objects[i]!.id).not.toBe(old.node);}
});
it('keeps every native saved field, clock, wage and original slot before advancing any new crowd rule',()=>{
 const text=JSON.stringify(native),loaded=decodeSave(text,world);expect(loaded.state).toEqual(native.state);expect(loaded.worldTime).toBe(native.worldTime);expect(loaded.migrated).toBe(true);
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.WALKING_LINKS_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 expect(()=>decodeSave(text,{...world,previousCrowdFlowSaveCompatibility:undefined})).toThrow('different world');expect(()=>decodeSave(text,{...world,saveCompatibility:'f'.repeat(64)})).toThrow('different world');const forged=structuredClone(native);forged.state.economy!.accounts[0]!.credits++;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow('invalid world state');
});
it('restores a seeded old-format jam exactly and replays a complete fixed-tick world identically through another reload',()=>{
 const jam=seeded(decodeSave(JSON.stringify(native),prior).state),text=encodeSave(jam,native.worldTime,prior);let state=decodeSave(text,world).state,replay=structuredClone(state);expect(state).toEqual(jam);const start=structuredClone(state.population!),indices=focus();
 for(let tick=0;tick<3600;tick++){
  state=stepInteractive(state,{steer:0,throttle:0},1/120,world);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,world);
  if(tick===1200)replay=decodeSave(encodeSave(replay,replay.timeS,world),world).state;
 }
 expect(replay).toEqual(state);checkEconomyState(state,scene);expect(resetCar(state,scene).population).toEqual(state.population);
 for(const i of indices)expect(Math.hypot(state.population!.members[i]!.x-start.members[i]!.x,state.population!.members[i]!.y-start.members[i]!.y)).toBeGreaterThan(80);
});
it('keeps worker-transferred graph indices and deterministic crowd decisions unchanged by transport',()=>{
 const copy=structuredClone(scene);primeSceneContacts(copy,structuredClone(sceneContactData(scene)));primeAmbientNavigation(copy,structuredClone(ambientGraph(scene)));
 let a=seeded(createCarAtSpawn(scene)),b=structuredClone(a);
 for(let tick=0;tick<400;tick++){a={...a,population:stepAmbient(a,.05,scene),timeS:a.timeS+.05};b={...b,population:stepAmbient(b,.05,copy),timeS:b.timeS+.05};}
 expect(b.population).toEqual(a.population);expect(copy).toEqual(scene);
});

it.each([.5,.001,0])('preserves waits and progress through portals separated by %s units',(gap)=>{
 const original=scene.objects.find(o=>o.id==='station_quarter_walker_3')!,person={...original,ambient:{...original.ambient!,motion:{kind:'walk' as const,speed:14,waitS:2}}},single={...scene,objects:scene.objects.filter(o=>!o.ambient).concat(person)},nodes=[{x:12200,y:4924,links:[1]},{x:12200,y:4924+gap,links:[0,2]},{x:12200,y:4944,links:[1]}];
 primeAmbientNavigation(single,{sourceHash:single.sourceHash,nodes,starts:new Map([[person.id,0]])});
 let state=createCarAtSpawn(single);state={...state,population:{tick:0,members:state.population!.members.map(m=>({...m,x:12200,y:4924+gap/2,fromX:12200,fromY:4924+gap/2,node:0,previous:1,pauseUntil:0,random:17}))}};
 state={...state,population:stepAmbient(state,.05,single),timeS:.05};expect(state.population!.members[0]!.y).toBe(4924);expect(state.population!.members[0]!.distance).toBeCloseTo(gap/2);
 state={...state,population:stepAmbient(state,.05,single),timeS:.1};const waiting=state.population!.members[0]!;expect(waiting.node).toBe(1);expect(waiting.pauseUntil).toBeGreaterThan(.1);
 for(let tick=0;tick<200&&state.timeS+.05<waiting.pauseUntil;tick++){state={...state,population:stepAmbient(state,.05,single),timeS:state.timeS+.05};expect(state.population!.members[0]!.pauseUntil).toBe(waiting.pauseUntil);expect(state.population!.members[0]!.node).toBe(1);}
 for(let tick=0;tick<200;tick++)state={...state,population:stepAmbient(state,.05,single),timeS:state.timeS+.05};expect(state.population!.members[0]!.distance).toBeGreaterThan(5);
});

it('restores the complete previous-engine jam without resetting anyone and frees all four actual stalled walkers',()=>{
 const old=decodeSave(JSON.stringify(oldEngine),prior),loaded=decodeSave(JSON.stringify(oldEngine),world);expect(loaded.state).toEqual(old.state);expect(loaded.worldTime).toBe(old.worldTime);
 const objects=ambientObjects(scene),indices=objects.map((o,i)=>{const m=loaded.state.population!.members[i]!;return o.ambient!.motion.kind==='walk'&&Math.hypot(m.x-12200,m.y-4924)<40&&m.speed===0&&m.pauseUntil<loaded.state.timeS ? i : -1;}).filter(i=>i>=0);expect(indices).toHaveLength(4);const start=structuredClone(loaded.state.population!);let state=loaded.state;
 for(let tick=0;tick<2400;tick++)state=stepInteractive(state,{steer:0,throttle:0},1/120,world);
 for(const i of indices){const m=state.population!.members[i]!,before=start.members[i]!;expect(m.distance-before.distance).toBeGreaterThan(60);expect(Math.hypot(m.x-before.x,m.y-before.y)).toBeGreaterThan(60);expect(m.node).not.toBe(before.node);}
 checkEconomyState(state,scene);expect(decodeSave(encodeSave(state,state.timeS,world),world).state).toEqual(state);
});
