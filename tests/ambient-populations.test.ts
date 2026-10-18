import {describe,it,expect,beforeAll} from 'vitest';
import {InstancedMesh,Mesh,Vector3,Box3,Matrix4,OrthographicCamera,DirectionalLight} from 'three';
import {compileDreamScene,compileDreamWorld,checkDream,formatDream} from '../src/scene/dream';
import {ambientNavigation,ambientProblems,ambientGraph,primeAmbientNavigation} from '../src/scene/ambient-navigation';
import {initialAmbient,stepAmbient,ambientObjects,ambientPose} from '../src/sim/ambient';
import {createCarAtSpawn,resetCar} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {onWalkway,crossingPolygons} from '../src/scene/sites';
import {onPolygon} from '../src/scene/streets';
import {walkingHeight} from '../src/scene/interiors';
import {assemblyHorizontalRadius} from '../src/scene/measure';
import {drivingHeight} from '../src/scene/terrain';
import {hasAnimatedJoints} from '../src/scene/object-dsl';
import {AmbientPopulation,ambientPrototype} from '../src/game/ambient-population';
import {buildObject,objectGroundLift} from '../src/game/world3d';
import {gaitStride,gaitStance} from '../src/game/humanoid-gait';
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
 it('reuses a worker graph with identical node indices, initial state and crowd decisions',()=>{
  const copy=structuredClone(scene),source=JSON.stringify(copy),graph=structuredClone(ambientGraph(scene));
  primeAmbientNavigation(copy,graph);
  expect(ambientNavigation(copy).nodes).toEqual(ambientNavigation(scene).nodes);
  expect(ambientNavigation(copy).starts).toEqual(ambientNavigation(scene).starts);
  let a={...createCarAtSpawn(scene),x:100,y:2200},b={...createCarAtSpawn(copy),x:100,y:2200};
  expect(b).toEqual(a);
  for(let i=0;i<500;i++){
   a={...a,population:stepAmbient(a,.05,scene),timeS:a.timeS+.05};
   b={...b,population:stepAmbient(b,.05,copy),timeS:b.timeS+.05};
  }
  expect(b.population).toEqual(a.population);expect(JSON.stringify(copy)).toBe(source);
  const o=copy.objects.find(o=>o.ambient?.motion.kind==='walk')!,nav=ambientNavigation(copy);
  expect(nav.clear(o.x,o.y,nav.radius(o),true)).toBe(true);
  expect(nav.segment(o,nav.nodes[nav.starts.get(o.id)!]!,nav.radius(o),true)).toBe(true);
 });
 it('builds the same instanced population in cooperative steps',()=>{
  const sync=new AmbientPopulation(scene),steps=AmbientPopulation.buildSteps(scene);let result=steps.next(),yields=0;while(!result.done){yields++;result=steps.next();}
  const staged=result.value;expect(yields).toBeGreaterThanOrEqual(2);expect(staged.count).toBe(sync.count);expect(staged.group.children.length).toBe(sync.group.children.length);
  for(const [i,child] of sync.group.children.entries()){const a=child as InstancedMesh,b=staged.group.children[i] as InstancedMesh;expect(b.count).toBe(a.count);expect(b.castShadow).toBe(a.castShadow);expect(b.customDepthMaterial!.customProgramCacheKey()).toBe(a.customDepthMaterial!.customProgramCacheKey());for(const [name,attribute] of Object.entries(a.geometry.attributes))expect(b.geometry.getAttribute(name).array).toEqual(attribute.array);expect(b.geometry.index!.array).toEqual(a.geometry.index!.array);}
 });
 it('places instanced people at the shared foot plane without lowering animals',()=>{
  const people={...scene,objects:scene.objects.filter(o=>o.ambient!.motion.kind==='walk')},population=new AmbientPopulation(people),camera=new OrthographicCamera(-5000,5000,5000,-5000,.1,10000),sun=new DirectionalLight();
  camera.position.set(0,3000,3000);camera.lookAt(0,0,0);camera.updateMatrixWorld();sun.shadow.camera.updateMatrixWorld();population.update(createCarAtSpawn(people),camera,sun,1/60,true);
  const matrix=new Matrix4();for(const mesh of population.group.children as InstancedMesh[]){expect(mesh.count).toBe(people.objects.length);for(const [i,o] of people.objects.entries()){
   mesh.getMatrixAt(i,matrix);expect(matrix.elements[13]).toBeCloseTo(walkingHeight(people,o.x,o.y,assemblyHorizontalRadius(o.spec as import('../src/scene/object-dsl').ObjectDslV2,o.scale))+1.6+.2,5);
  }}
  expect(objectGroundLift(scene.objects.find(o=>o.id==='rabbit')!)).toBe(1.5);
 });
 it.each(['curve','reverse'])('holds instanced foot targets and facing through a %s and stop without new draws or rigs',path=>{
  const people={...scene,objects:scene.objects.filter(o=>o.ambient!.motion.kind==='walk')},population=new AmbientPopulation(people),state=createCarAtSpawn(people),camera=new OrthographicCamera(-5000,5000,5000,-5000,.1,10000),sun=new DirectionalLight();
  camera.position.set(0,3000,3000);camera.lookAt(0,0,0);camera.updateMatrixWorld();sun.shadow.camera.updateMatrixWorld();
  const mesh=population.group.children[0] as InstancedMesh,draws=population.group.children.length,matrix=new Matrix4(),previous=[undefined,undefined] as ({x:number;z:number;heading:number}|undefined)[];
  const o=people.objects[0]!,joints=o.ambient!.joints,hips=['left','right'].map(side=>joints.find(j=>j.bone===`${side}_hip`)!.position[2]),stride=gaitStride(0)*o.scale;let distance=0,x=o.x,y=o.y,contacts=0,maxDrift=0,maxStep=0;
  const previousAir:Vector3[]=[];
  state.population=initialAmbient(people);population.update(state,camera,sun,0);
  for(let f=0;f<720;f++){
   const t=f/120,speed=t<4 ? 14 : 0,heading=path==='reverse' ? Number(t>=1)*Math.PI : Math.min(1.2,t*.3);distance+=speed/120;x+=Math.cos(heading)*speed/120;y+=Math.sin(heading)*speed/120;
   const m=state.population.members[0]!;Object.assign(m,{x,y,fromX:x,fromY:y,heading,fromHeading:heading,distance,fromDistance:distance,speed});
   population.update(state,camera,sun,1/120);mesh.getMatrixAt(0,matrix);
   const feet=mesh.geometry.getAttribute('popPlant'),facing=mesh.geometry.getAttribute('popFacing'),lift=mesh.geometry.getAttribute('popLift'),amount=mesh.geometry.getAttribute('popCycle').getZ(0);
   for(let i=0;i<2;i++){
    const phase=((gaitStance(0)/2+distance/stride+i*.5)%1+1)%1,down=(phase<.62 || amount<.001) && (i ? lift.getY(0) : lift.getX(0))===0;
    const fx=i ? feet.getZ(0) : feet.getX(0),fz=(i ? feet.getW(0) : feet.getY(0))+hips[i]!,p=new Vector3(fx,0,fz).applyMatrix4(matrix),rotation=heading-(i ? facing.getY(0) : facing.getX(0)),old=previous[i];
    if(previousAir[i])maxStep=Math.max(maxStep,p.distanceTo(previousAir[i]!));previousAir[i]=p;
    if(down && old){maxDrift=Math.max(maxDrift,Math.hypot(p.x-old.x,p.z-old.z));expect(Math.abs(rotation-old.heading)).toBeLessThan(.0001);contacts++;}
    previous[i]=down ? {x:p.x,z:p.z,heading:rotation} : undefined;
   }
  }
  expect(contacts).toBeGreaterThan(200);expect(maxDrift).toBeLessThan(.002);expect(maxStep*120).toBeLessThan(57);expect(population.group.children.length).toBe(draws);expect(mesh.geometry.getAttribute('popPlant')).toMatchObject({meshPerAttribute:1});expect(mesh.geometry.getAttribute('popLift')).toMatchObject({meshPerAttribute:1,itemSize:4});
 });
 it('starts a restored crowd over its support foot, then measures visible travel without a saved-phase lurch',()=>{
  const people={...scene,objects:scene.objects.filter(o=>o.ambient!.motion.kind==='walk')},population=new AmbientPopulation(people),state=createCarAtSpawn(people),camera=new OrthographicCamera(-5000,5000,5000,-5000,.1,10000),sun=new DirectionalLight();
  camera.position.set(0,3000,3000);camera.lookAt(0,0,0);camera.updateMatrixWorld();sun.shadow.camera.updateMatrixWorld();state.population=initialAmbient(people);
  const m=state.population.members[0]!;m.distance=m.fromDistance=1234;population.update(state,camera,sun,0);
  const mesh=population.group.children[0] as InstancedMesh,cycles=mesh.geometry.getAttribute('popCycle');expect(cycles.getY(0)).toBeCloseTo(gaitStance(0)/2,6);
  m.distance=m.fromDistance=1234.5;population.update(state,camera,sun,1/30);expect(cycles.getY(0)).toBeCloseTo(gaitStance(0)/2+.5/(gaitStride(0)*people.objects[0]!.scale),6);
  state.population=initialAmbient(people);state.population.tick=-1;population.update(state,camera,sun,0);expect(cycles.getY(0)).toBeCloseTo(gaitStance(0)/2,6);
 });
 it('rejects mismatched, oversized or broken prepared graphs without changing the fallback',()=>{
  const valid=ambientGraph(scene),node=valid.nodes.findIndex(n=>n.links.length>0);
  const corrupt=[
   (g:typeof valid)=>{g.sourceHash='different';},
   (g:typeof valid)=>{g.nodes=Array.from({length:8193},()=>({x:0,y:0,links:[]}));},
   (g:typeof valid)=>{g.nodes[node]!.x=NaN;},
   (g:typeof valid)=>{g.nodes[node]!.links=[g.nodes.length];},
   (g:typeof valid)=>{g.nodes[node]!.links=[node];},
   (g:typeof valid)=>{g.nodes[node]!.links.push(g.nodes[node]!.links[0]!);},
   (g:typeof valid)=>{g.nodes[g.nodes[node]!.links[0]!]!.links=[];},
   (g:typeof valid)=>{g.starts.clear();},
  ];
  for(const change of corrupt){const graph=structuredClone(valid),copy=structuredClone(scene);change(graph);expect(()=>primeAmbientNavigation(copy,graph)).toThrow('prepared pedestrian graph');expect(ambientNavigation(copy).nodes).toEqual(valid.nodes);}
 });
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
 it('keeps exact vehicle forecasts for fast, oblique and grazing approaches',()=>{
  const o=scene.objects.find(o=>o.ambient!.motion.kind==='walk')!,solo={...scene,objects:[o]},nav=ambientNavigation(solo);
  let state={...createCarAtSpawn(solo),x:100,y:2200};for(let i=0;i<10;i++)state={...state,population:stepAmbient(state,.05,solo),timeS:state.timeS+.05};
  const m=state.population!.members[0]!,goal=nav.nodes[m.node]!,h=Math.atan2(goal.y-m.y,goal.x-m.x),v=Math.min(o.ambient!.motion.speed,Math.hypot(goal.x-m.x,goal.y-m.y)/.05),radius=nav.radius(o),reach=12+radius+5;
  for(const angle of [0,.3,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5])for(const speed of [0,50,300])for(const margin of [-1e-8,0,1e-8,100]){
   const vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed,rx=vx-Math.cos(h)*v,ry=vy-Math.sin(h)*v,dx=-rx*2+Math.cos(angle+Math.PI/2)*(reach+margin),dy=-ry*2+Math.sin(angle+Math.PI/2)*(reach+margin);
   const near={...state,x:m.x+dx,y:m.y+dy,vx,vy,elevation:walkingHeight(solo,m.x,m.y)};
   const actualX=near.x-m.x,actualY=near.y-m.y,t=Math.max(0,Math.min(2,-(actualX*rx+actualY*ry)/(rx*rx+ry*ry||1))),blocked=Math.hypot(actualX+rx*t,actualY+ry*t)<reach;
   expect(stepAmbient(near,.05,solo)!.members[0]!.speed,JSON.stringify({angle,speed,margin})).toBe(blocked ? 0 : v);
  }
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
