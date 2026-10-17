import {describe,it,expect,beforeAll} from 'vitest';
import {InstancedMesh,Mesh,Vector3,Box3} from 'three';
import {compileDreamScene,compileDreamWorld,checkDream,formatDream} from '../src/scene/dream';
import {ambientNavigation,ambientProblems} from '../src/scene/ambient-navigation';
import {initialAmbient,stepAmbient,ambientObjects,ambientPose} from '../src/sim/ambient';
import {createCarAtSpawn,resetCar} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {onWalkway,crossingPolygons} from '../src/scene/sites';
import {onPolygon} from '../src/scene/streets';
import {drivingHeight} from '../src/scene/terrain';
import {hasAnimatedJoints} from '../src/scene/object-dsl';
import {AmbientPopulation,ambientPrototype} from '../src/game/ambient-population';
import {buildObject} from '../src/game/world3d';
import {parseScene,type Scene} from '../src/scene/schema';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import human from '../docs/examples/humanoid.dream?raw';
import city from '../docs/examples/city-cycle-lanes.dream?raw';
const identity={sceneId:'ambient',revisionId:'r1',sourceHash:'mock'};
const animal='material fur(style=toon,colors=[#775544,#554433]);object hare(label="Hare"){measure(kind=custom,axis=x,meters=.7);body(interaction=decor,radius=4,height=8);part body(shape=box,material=fur,at=[0,4,0],size=[8,8,4]);}';
const source=city+human.replace('dream 2;','')+animal+'\ncrossing zebra(street=avenue,at=[1400,800],width=24);\nfurnish walkers(objects=[explorer],streets=[avenue],spacing=160,setback=0,seed=31,on=sidewalk,motion=walk(speed=14,wait_s=0));\nplace rabbit(object=hare,at=[2400,2100],role=ambient,motion=roam(radius=90,speed=5,alert=70,flee_speed=30,gait=hop));';
let scene:Scene;
beforeAll(()=>{scene=compileDreamScene(source,identity);});
function advance(initial:ReturnType<typeof createCarAtSpawn>,seconds:number,dt=.05){let state=initial;for(let i=0;i<Math.round(seconds/dt);i++)state={...state,population:stepAmbient(state,dt,scene),timeS:state.timeS+dt};return state;}
describe('bounded moving ambient populations',()=>{
 it('keeps complete geometry, explicit ownership, deterministic source and separate controller budgets',()=>{
  expect(compileDreamScene(formatDream(source),identity)).toEqual(scene);
  expect(scene.objects.every(o=>o.role==='ambient')).toBe(true);expect(scene.objects.every(o=>!hasAnimatedJoints(o.spec))).toBe(true);
  expect(scene.objects.find(o=>o.ambient?.motion.kind==='walk')!.ambient!.joints).toHaveLength(12);expect(ambientProblems(scene)).toEqual([]);
  const instances=new AmbientPopulation(scene);let draws=0;instances.group.traverse(n=>{if(n instanceof InstancedMesh)draws++;});expect(draws).toBeLessThan(scene.objects.length);expect(instances.count).toBe(scene.objects.length);
  const o=scene.objects.find(o=>o.ambient?.motion.kind==='walk')!,raw=buildObject({...o,scale:1}),prototype=ambientPrototype(o);raw.updateMatrixWorld(true);prototype.updateMatrixWorld(true);
  const bounds=new Box3();prototype.traverse(n=>{if(!(n instanceof Mesh))return;const p=n.geometry.getAttribute('position'),indices=n.geometry.getAttribute('popBone');for(let i=0;i<p.count;i++){const point=new Vector3().fromBufferAttribute(p,i),bone=indices.getX(i);if(bone)point.applyMatrix4(raw.getObjectByName(o.ambient!.joints[bone-1]!.id)!.matrixWorld);bounds.expandByPoint(point);}});
  const expected=new Box3().setFromObject(raw,true);expect(bounds.min.distanceTo(expected.min)).toBeLessThan(1e-4);expect(bounds.max.distanceTo(expected.max)).toBeLessThan(1e-4);
 });
 it('walks through accepted sidewalk and zebra geometry without cutting across carriageways',()=>{
  let state={...createCarAtSpawn(scene),x:100,y:2200};const objects=ambientObjects(scene),nav=ambientNavigation(scene);let crossed=false,moved=0;
  for(let tick=0;tick<6000;tick++){
   state={...state,population:stepAmbient(state,.05,scene),timeS:state.timeS+.05};
   if(tick%10)continue;
   for(const [i,o] of objects.entries())if(o.ambient!.motion.kind==='walk'){
    const p=state.population!.members[i]!;expect(onWalkway(scene,p.x,p.y,nav.radius(o))).toBe(true);moved+=Math.hypot(p.x-o.x,p.y-o.y)>20 ? 1 : 0;
    crossed ||= crossingPolygons(scene,scene.crossings[0]!).some(poly=>onPolygon(poly,p.x,p.y));
   }
  }
  expect(crossed).toBe(true);expect(moved).toBeGreaterThan(100);
 });
 it('reacts to a nearby player, stays in a clear habitat, recovers and ignores high aircraft',()=>{
  const index=ambientObjects(scene).findIndex(o=>o.id==='rabbit'),o=scene.objects.find(o=>o.id==='rabbit')!;
  const fresh=createCarAtSpawn(scene),near={...fresh,x:o.x-20,y:o.y,elevation:drivingHeight(scene.terrain,o.x,o.y)};
  const fled=advance(near,1),p=fled.population!.members[index]!;expect(p.mode).toBe('flee');expect(p.x).toBeGreaterThan(o.x+20);
  const far=advance({...fled,x:100,y:100},8);expect(far.population!.members[index]!.mode).toBe('roam');
  const overhead=advance({...near,elevation:500},1);expect(overhead.population!.members[index]!.mode).toBe('roam');
  let state=near;const nav=ambientNavigation(scene);for(let i=0;i<1000;i++){state={...state,population:stepAmbient(state,.05,scene),timeS:state.timeS+.05};const q=state.population!.members[index]!;expect(Math.hypot(q.x-o.x,q.y-o.y)).toBeLessThanOrEqual(90+1e-6);expect(nav.clear(q.x,q.y,nav.radius(o),false)).toBe(true);}
 });
 it('waits for approaching traffic and resumes without teleporting when the path clears',()=>{
  const state=advance({...createCarAtSpawn(scene),x:100,y:2200},1),i=ambientObjects(scene).findIndex(o=>o.ambient!.motion.kind==='walk'),m=state.population!.members[i]!;
  const near={...state,x:m.x+Math.cos(m.heading)*35,y:m.y+Math.sin(m.heading)*35,vx:-Math.cos(m.heading)*40,vy:-Math.sin(m.heading)*40,elevation:drivingHeight(scene.terrain,m.x,m.y)};
  const waiting=stepAmbient(near,.05,scene)!.members[i]!;expect(waiting.speed).toBe(0);expect(waiting.x).toBe(m.x);expect(waiting.y).toBe(m.y);
  const resumed=stepAmbient({...near,x:100,y:2200,population:{tick:state.population!.tick+1,members:state.population!.members.map((p,j)=>j===i ? waiting : p)},timeS:state.timeS+.05},.05,scene)!.members[i]!;
  expect(resumed.speed).toBe(14);expect(Math.hypot(resumed.x-m.x,resumed.y-m.y)).toBeCloseTo(.7);
  const legacy={...near,population:undefined,timeS:1000};expect(stepAmbient(legacy,.05,scene)!.tick).toBe(20001);
 });
 it('is replayable across frame divisions and preserves live state on R while Start over resets it',()=>{
  const a=advance(createCarAtSpawn(scene),3,.05),b=advance(createCarAtSpawn(scene),3,1/120);
  for(let i=0;i<a.population!.members.length;i++){expect(a.population!.members[i]!.x).toBeCloseTo(b.population!.members[i]!.x,8);expect(a.population!.members[i]!.y).toBeCloseTo(b.population!.members[i]!.y,8);}
  expect(resetCar(a,scene).population).toEqual(a.population);expect(resetCar(a,scene,true).population).toEqual(initialAmbient(scene));
  const world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
  for(const control of [{kind:'car' as const},{kind:'foot' as const}]){let state:ReturnType<typeof createCarAtSpawn>={...createCarAtSpawn(scene),control};for(let i=0;i<120;i++)state=stepInteractive(state,{throttle:0,steer:0},1/120,world);expect(state.population!.tick).toBe(20);}
  const before=a.population!.members[0]!,q=ambientPose(a.population!,0,a.timeS+.025);expect(q.x).toBeCloseTo((before.fromX+before.x)/2,5);
 });
 it('rejects unsafe ownership, motion, forged rigs and population expansion before acceptance',()=>{
  for(const invalid of [source.replace('role=ambient','role=prop'),source.replace('role=ambient','role=npc'),source.replace('role=ambient','role=ambient,pose=rest'),source.replace('speed=14','speed=140'),source.replace('radius=90','radius=900'),source.replace('flee_speed=30','flee_speed=1'),source.replace('on=sidewalk','on=verge'),source.replace('motion=walk','pose=rest,motion=walk')])expect(checkDream(invalid).ok).toBe(false);
  const o=scene.objects.find(o=>o.ambient?.motion.kind==='walk')!;expect(()=>parseScene({...scene,objects:[{...o,ambient:{...o.ambient!,joints:[]}}]})).toThrow();
  expect(()=>parseScene({...scene,objects:[{...o,kind:'tree'}]})).toThrow('ambient populations');
  expect(()=>parseScene({...scene,objects:Array.from({length:193},(_,i)=>({...o,id:'member_'+i}))})).toThrow('192 instanced ambient');
  expect(()=>compileDreamScene(source.replace('at=[2400,2100]','at=[1400,1000]'),identity)).toThrow('habitat');
  const movingPart=animal.replace('size=[8,8,4]','size=[8,8,4],motion=sway(deg=5,hz=.3)');
  expect(()=>compileDreamWorld(city+movingPart+'furnish invalid(objects=[hare],streets=[avenue],spacing=800,setback=120,seed=1,motion=roam(radius=90,speed=5,alert=70,flee_speed=30));')).toThrow('ambient populations');
  expect(checkDream(source.replace(animal,movingPart))).toMatchObject({ok:false,diagnostics:[{code:'E_POPULATION'}]});
 });
});
