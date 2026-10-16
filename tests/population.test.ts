import {describe,it,expect,beforeAll} from 'vitest';
import type {Scene} from '../src/scene/schema';
import {readFileSync} from 'node:fs';
import {compileDreamScene,compileDreamWorld,checkDream,formatDream} from '../src/scene/dream';
import {POPULATION_LIMITS,flockBase} from '../src/scene/population';
import {streetFootprints} from '../src/scene/streets';
import {pointInPolygon} from '../src/sim/mask';
import {buildFlocks} from '../src/game/flocks';
import {InstancedMesh} from 'three';
import {actorPose} from '../src/sim/actors';
import {routePath,routePose} from '../src/scene/routes';
import {createCarAtSpawn} from '../src/sim/car';
import {stepInteractive,toggleRide} from '../src/sim/interaction';

const base=readFileSync('docs/examples/city-cycle-lanes.dream','utf8');
const definitions=`material steel(style=toon,colors=[#46535d,#62727e]);
object lamp(label="Lamp"){measure(kind=custom,axis=y,meters=4);body(interaction=solid,radius=4,height=40);part pole(shape=box,material=steel,at=[0,20,0],size=[1,40,1]);}
object bird(label="Bird"){measure(kind=custom,axis=z,meters=1);body(interaction=decor,radius=4,height=4);part wings(shape=box,material=steel,at=[0,2,0],size=[3,1,10]);}
`;
const source=readFileSync('docs/examples/populated-neighborhood.dream','utf8');
const identity={sceneId:'population-test',revisionId:'r1',sourceHash:'mock'};
describe('bounded contextual population',()=>{
 it('expands only after linking, deterministically, outside roads and clear of the water',()=>{
  const scene=compileDreamScene(source,identity),again=compileDreamScene(formatDream(source),identity);
  expect(scene).toEqual(again);expect(scene.objects.length).toBeGreaterThan(10);
  const roads=streetFootprints(scene).reserved;
  for(const object of scene.objects){expect(object.role).toBe('prop');expect(roads.some(p=>pointInPolygon(object.x,object.y,p))).toBe(false);}
  expect(new Set(scene.objects.map(o=>o.id)).size).toBe(scene.objects.length);
  expect(compileDreamScene(source.replace('seed=7','seed=9'),identity).objects).not.toEqual(scene.objects);
  const linked=base.replace('dream 2;','dream 2;include lighting(module=lighting);');
  const module='dream 2;'+definitions+'furnish linked_lights(objects=[lamp],streets=[avenue],spacing=300,setback=6,seed=7);';
  expect(compileDreamScene(linked,identity,{lighting:module}).objects.length).toBeGreaterThan(5);
 });
 it('rejects dangling targets, unbounded rules and active templates before acceptance',()=>{
  for(const invalid of [source.replace('streets=[avenue,quay]','streets=[missing]'),source.replace('spacing=300','spacing=12'),source.replace('seed=7','seed=-1'),source.replace('count=12','count=33'),source.replace('radius=[350,450]','radius=[3500,450]'),source.replace('setback=6','setback=600')])expect(checkDream(invalid).ok).toBe(false);
  expect(checkDream(source.replace('body(interaction=decor','body(interaction=solid')).ok).toBe(false);
  const many=Array.from({length:17},(_,i)=>`flock birds_${i}(object=bird,at=[2400,1000],radius=[350,450],count=16,altitude=80,speed=30,seed=${i});`).join('');
  expect(checkDream(base.replace('dream 2;','dream 2;'+definitions)+many).ok).toBe(false);
 });
 it('renders every cosmetic member with fixed instance buffers and a conservative movement bound',()=>{
  const scene=compileDreamScene(source,identity),group=buildFlocks(scene),flock=scene.flocks[0]!;
  expect(flockBase(scene,flock)).toBeGreaterThanOrEqual(80);
  const meshes:InstancedMesh[]=[];group.traverse(o=>{if(o instanceof InstancedMesh)meshes.push(o);});
  expect(meshes.length).toBeGreaterThan(0);expect(meshes.length).toBeLessThan(5);
  for(const mesh of meshes){expect(mesh.count).toBe(12);expect(mesh.geometry.getAttribute('flight').count).toBe(12);expect(mesh.boundingSphere!.radius).toBeGreaterThan(Math.max(flock.radius.x,flock.radius.y));expect(mesh.customDepthMaterial).toBeDefined();}
  expect(POPULATION_LIMITS.generated).toBe(1024);
 });
 it('shifts whole transit journeys including intermediate waits, instead of stacking distance offsets at stops',()=>{
  const source=`dream 2;material blue(style=toon,colors=[#445566,#556677]);object bus(label="Bus"){body(interaction=solid,radius=4,height=8);rideable(at=[0,6,0]);part body(shape=box,material=blue,at=[0,4,0],size=[12,8,5]);}route line(kind=street,mode=shuttle,speed=20){point(at=[100,100]);stop platform(at=[300,100],wait_s=4,site=station);point(at=[600,100]);}place first(object=bus,route=line,role=npc);place second(object=bus,route=line,phase_s=15,role=npc);`;
  const world=compileDreamWorld(source),route=world.routes[0]!;
  // This fragment has no full layout; pose checking uses the same accepted fixture boundary below.
  expect(world.objects[1]!.route!.phaseS).toBe(15);
  expect(world.objects[1]!.x).toBe(routePose(route,15).x);expect(world.objects[1]!.x).not.toBe(world.objects[0]!.x);
  expect(compileDreamWorld(formatDream(source))).toEqual(world);
  expect(checkDream(source.replace('route=line,phase_s=15','at=[100,100],phase_s=15')).ok).toBe(false);
  expect(routePath(route).length).toBe(500);
 });
});

describe('live district populations and transport',()=>{
 let liveScene:Scene;
 beforeAll(async()=>{liveScene=(await import('../src/scene/world-fixture')).createWorldScene();},30000);
 it('provides district coverage, destination parking and different traffic silhouettes inside existing budgets',async()=>{
  const {roleOf,controlFor}=await import('../src/scene/agents');
  const scene=liveScene;
  for(const district of ['center','north','garden','south','east'])expect(scene.objects.filter(o=>o.id.startsWith(district+'_lamps_')).length).toBeGreaterThan(30);
  expect(scene.objects.filter(o=>o.id.startsWith('transit_bicycles_')).length).toBeGreaterThan(5);
  expect(scene.objects.filter(o=>o.id.startsWith('school_bicycles_')).length).toBeGreaterThan(15);
  expect(scene.objects.filter(o=>o.id.startsWith('destination_scooters_')).length).toBeGreaterThan(10);
  expect(scene.surfaces.filter(s=>s.id.startsWith('parking_')).length).toBeGreaterThan(10);
  expect(scene.flocks).toHaveLength(16);expect(scene.flocks.reduce((n,f)=>n+f.count,0)).toBe(256);
  const spawnContacts=(await import('../src/sim/actors')).actorContacts;
  for(let t=0;t<=240;t+=2)expect(spawnContacts(scene,t).some(c=>Math.hypot(c.x-scene.spawn.x,c.y-scene.spawn.y)<c.r+11),'spawn must stay clear of scheduled traffic').toBe(false);
  const cars=scene.objects.filter(o=>o.route && scene.routes.find(r=>r.id===o.route!.id)?.kind==='street' && o.spec && 'measure' in o.spec && o.spec.measure?.kind==='car');
  expect(cars.length).toBe(4);expect(new Set(cars.map(o=>o.spec!.displayName)).size).toBe(3);
  expect(scene.objects.filter(o=>o.route||controlFor(o)).length).toBeLessThanOrEqual(24);
  expect(scene.objects.filter(o=>roleOf(o)==='npc').length).toBeLessThanOrEqual(32);
 });
 it('boards a real bus as a passenger and follows the same clock without taking over its controls',async()=>{
  const {buildMaskForScene}=await import('../src/scene/fixture');const {buildPaperMask}=await import('../src/sim/mask');
  const scene=liveScene,world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11};
  const bus=scene.objects.find(o=>o.id==='west_bus_vehicle')!,pose=actorPose(scene,bus,0);
  const foot={...createCarAtSpawn(scene),control:{kind:'foot' as const},x:pose.x+50,y:pose.y,elevation:pose.elevation};
  const boarded=toggleRide(foot,world);expect(boarded.control).toEqual({kind:'passenger',id:bus.id});
  const moved=stepInteractive(boarded,{throttle:1,steer:1},1/120,world),expected=actorPose(scene,bus,moved.timeS,moved);
  expect(moved.x).toBeCloseTo(expected.x);expect(moved.y).toBeCloseTo(expected.y);expect(moved.nextCheckpoint).toBe(boarded.nextCheckpoint);
 });
 it('gives the scooter direct driving and one jump per press',async()=>{
  const {buildMaskForScene}=await import('../src/scene/fixture');const {buildPaperMask}=await import('../src/sim/mask');
  const scene=liveScene,world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11};
  const scooter=scene.objects.find(o=>o.id==='market_scooter')!;
  let rider={...createCarAtSpawn(scene),control:{kind:'vehicle' as const,id:scooter.id},x:scooter.x,y:scooter.y,headingRad:0};
  const start=rider;for(let i=0;i<60;i++)rider=stepInteractive(rider,{throttle:1,steer:0},1/120,world) as typeof rider;
  expect(rider.x).toBeGreaterThan(start.x+5);
  const airborne=stepInteractive(rider,{throttle:0,steer:0,jump:true},1/120,world);expect(airborne.grounded).toBe(false);expect(airborne.vz).toBeGreaterThan(0);
 });
});
