import {it,expect} from 'vitest';
import human from '../docs/examples/humanoid.dream?raw';
import city from '../docs/examples/city-cycle-lanes.dream?raw';
import {compileDreamScene} from '../src/scene/dream';
import {ambientNavigation,primeAmbientNavigation} from '../src/scene/ambient-navigation';
import {createCarAtSpawn} from '../src/sim/car';
import {initialAmbient,stepAmbient,ambientPose} from '../src/sim/ambient';
const source=city+human.replace('dream 2;','')+'place alice(object=explorer,at=[1490,1000],role=ambient,motion=walk(speed=14,wait_s=0));place bob(object=explorer,at=[1490,1080],role=ambient,motion=walk(speed=14,wait_s=0));';
function setup(narrow=false,overlap=false){
 const scene=compileDreamScene(source.replaceAll('1490',narrow ? '1482' : '1490').replace('sidewalk=20',narrow ? 'sidewalk=12' : 'sidewalk=20'),{sceneId:'spacing',revisionId:'r1',sourceHash:'fixture'}),x=scene.objects[0]!.x;
 const nodes=[{x,y:900,links:[1]},{x,y:1200,links:[0]}];
 primeAmbientNavigation(scene,{sourceHash:scene.sourceHash,nodes,starts:new Map(scene.objects.map(o=>[o.id,1]))});
 const nav=ambientNavigation(scene),r=nav.radius(scene.objects[0]!);expect(nav.segment(nodes[0]!,nodes[1]!,r,true)).toBe(true);
 const state={...createCarAtSpawn(scene),x:100,y:2200,population:initialAmbient(scene)};
 state.population.members.forEach((m,i)=>{m.node=1-i;m.previous=i;if(overlap)m.y=1000;});
 return {scene,nav,r,state};
}
it('passes an oncoming walker without overlap, corner shortcuts or stopping the shared clock',()=>{
 const {scene,nav,r,state:initial}=setup();let state=initial;
 for(let tick=0;tick<300;tick++){
  state={...state,population:stepAmbient(state,.05,scene)!,timeS:state.timeS+.05};
  const [a,b]=state.population.members;expect(Math.hypot(a!.x-b!.x,a!.y-b!.y)).toBeGreaterThanOrEqual(r*2-.0001);
  for(const m of state.population.members){expect(nav.segment({x:m.fromX,y:m.fromY},m,r,true)).toBe(true);expect(Math.hypot(m.x-m.fromX,m.y-m.fromY)).toBeLessThanOrEqual(.700001);}
  for(const fraction of [.25,.5,.75]){const a=ambientPose(state.population,0,state.timeS+fraction*.05),b=ambientPose(state.population,1,state.timeS+fraction*.05);expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeGreaterThanOrEqual(r*2-.0001);}
 }
 expect(state.population.members[0]!.y).toBeGreaterThan(1100);expect(state.population.members[1]!.y).toBeLessThan(950);expect(state.population.tick).toBe(300);
});
it('yields inside a path that cannot fit two complete people side by side',()=>{
 const {scene,nav,r,state:initial}=setup(true);let state=initial,yielded=false;
 for(let tick=0;tick<400;tick++){
  state={...state,population:stepAmbient(state,.05,scene)!,timeS:state.timeS+.05};const [a,b]=state.population.members;
  expect(Math.hypot(a!.x-b!.x,a!.y-b!.y)).toBeGreaterThanOrEqual(r*2-.0001);
  for(const m of state.population.members){expect(nav.clear(m.x,m.y,r,true)).toBe(true);yielded ||= m.speed<14 || (m.x-m.fromX)*(nav.nodes[m.node]!.x-m.x)+(m.y-m.fromY)*(nav.nodes[m.node]!.y-m.y)<0;}
 }
 expect(yielded).toBe(true);
 expect(state.population.members[0]!.y).toBeLessThan(state.population.members[1]!.y);
});
it('separates old overlapping poses gradually and replays the same choices after restoring state',()=>{
 const {scene,nav,r,state:initial}=setup(false,true);let state=initial,previous=0;
 for(let tick=0;tick<160;tick++){
  const saved=structuredClone(state),next=stepAmbient(state,.05,scene)!;expect(stepAmbient(saved,.05,scene)).toEqual(next);
  state={...state,population:next,timeS:state.timeS+.05};const [a,b]=next.members,d=Math.hypot(a!.x-b!.x,a!.y-b!.y);
  if(previous<r*2-.0001)expect(d).toBeGreaterThanOrEqual(previous-.0001);else expect(d).toBeGreaterThanOrEqual(r*2-.0001);previous=d;
  for(const m of next.members){expect(nav.clear(m.x,m.y,r,true)).toBe(true);expect(Math.hypot(m.x-m.fromX,m.y-m.fromY)).toBeLessThanOrEqual(.700001);}
 }
 expect(previous).toBeGreaterThanOrEqual(r*2-.0001);
});
