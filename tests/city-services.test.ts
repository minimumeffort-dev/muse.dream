import type {ObjectDslV2} from '../src/scene/object-dsl';
import {beforeAll,describe,expect,it} from 'vitest';
import {Box3,Euler,Matrix4,Quaternion,Vector3} from 'three';
import {createWorldScene} from '../src/scene/world-fixture';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,carFootprintClear,type World} from '../src/sim/car';
import {stepInteractive,toggleRide,bodyWorld} from '../src/sim/interaction';
import {vehicleReviewStart} from '../src/game/review-start';
import {siteEntry,walkingNetwork} from '../src/scene/sites';
import {mapDestinations} from '../src/game/navigation';
import {partGeometry} from '../src/scene/object-geometry';
import {hasAnimatedJoints} from '../src/scene/object-dsl';
import {roleOf,controlFor} from '../src/scene/agents';
import {objectContacts} from '../src/scene/contacts';
import {actorPose} from '../src/sim/actors';
import {routePath,routePose} from '../src/scene/routes';
import type {Scene} from '../src/scene/schema';
import {compileDream} from '../src/scene/dream';
import terminalSource from '../docs/examples/airport-terminal.dream?raw';

describe('connected civic services and regional airport',()=>{
 let scene:Scene,world:World;
 beforeAll(()=>{scene=createWorldScene();world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11};},60000);
 it('gives three education destinations, two medical destinations and a connected airport meaningful map symbols',()=>{
  const markers=mapDestinations(scene);
  expect(markers.filter(m=>m.kind==='school')).toHaveLength(3);
  expect(markers.filter(m=>m.kind==='hospital')).toHaveLength(2);
  expect(markers.filter(m=>m.kind==='airport')).toEqual([expect.objectContaining({id:'access_airport',symbol:'A'})]);
  expect(markers.filter(m=>m.kind==='station')).toHaveLength(2);
  const network=walkingNetwork(scene);
  expect(new Set(scene.sites.map(s=>network.roots[network.sites.get(s.id)!])).size).toBe(1);
 });
 it('connects each new entrance to its street with a clear walking body',()=>{
  for(const id of ['access_airport','access_airport_hangar','access_airport_tower','access_east_medical_center']){
   const p=siteEntry(scene,scene.sites.find(s=>s.id===id)!),foot={...createCarAtSpawn(scene),control:{kind:'foot' as const},...p};
   expect(carFootprintClear(bodyWorld(foot,world),p.x,p.y,0,0,foot),id).toBe(true);
  }
 });
 it('runs five buses on four useful services alongside the passenger tram and regional railcar',()=>{
  const buses=scene.objects.filter(o=>o.route && o.spec && 'measure' in o.spec && o.spec.measure?.kind==='bus');
  expect(buses).toHaveLength(5);
  for(const id of ['airport_bus','east_bus','west_bus','south_bus','market_tram','regional_rail']){
   const route=scene.routes.find(r=>r.id===id)!,path=routePath(route);let waits=0;
   for(const stop of route.stops!){
    const p=routePose(route,path.distances[stop.anchor]!/route.speed+waits+.5);
    expect(p.speed).toBe(0);expect(p.x).toBeCloseTo(route.points[stop.anchor]!.x,8);expect(p.y).toBeCloseTo(route.points[stop.anchor]!.y,8);waits+=stop.waitS;
   }
  }
  const bus=scene.objects.find(o=>o.id==='airport_bus_vehicle')!,route=scene.routes.find(r=>r.id==='airport_bus')!;
  const timeS=routePath(route).distances[route.stops![0]!.anchor]!/route.speed+.5,entry=siteEntry(scene,scene.sites.find(s=>s.id==='access_airport_bus')!);
  const start=createCarAtSpawn(scene),foot={...start,control:{kind:'foot' as const},...entry,timeS,vehicles:[{id:null,x:start.x,y:start.y,elevation:start.elevation,headingRad:start.headingRad,distance:0}]};
  const contacts=objectContacts(scene,bus,actorPose(scene,bus,timeS)),approaches=contacts.flatMap(c=>Array.from({length:8},(_,i)=>({...foot,x:c.x+Math.cos(i*Math.PI/4)*(c.r+9),y:c.y+Math.sin(i*Math.PI/4)*(c.r+9)})));
  const approach=approaches.find(s=>Math.hypot(s.x-entry.x,s.y-entry.y)<120 && carFootprintClear(bodyWorld(s,world),s.x,s.y,s.elevation,timeS,s) && toggleRide(s,world).control.kind==='passenger');
  expect(approach,'the platform must have a clear approach to its passenger bus').toBeDefined();const rider=toggleRide(approach!,world);
  expect(rider.control).toEqual({kind:'passenger',id:bus.id});
  const next=stepInteractive(rider,{throttle:1,steer:1},1/120,world);
  expect(next.x).toBeCloseTo(routePose(route,next.timeS).x);expect(next.y).toBeCloseTo(routePose(route,next.timeS).y);
 });
 it('makes airport and medical scooters directly controllable with safe exits and jumps',()=>{
  for(const id of ['airport_scooter','medical_scooter']){
   const foot=vehicleReviewStart(createCarAtSpawn(scene),world,id);expect(foot.control.kind).toBe('foot');
   const rider=toggleRide(foot,world);expect(rider.control).toEqual({kind:'vehicle',id});
   const jumping=stepInteractive(rider,{throttle:1,steer:0,jump:true},1/120,world);
   expect(jumping.grounded).toBe(false);expect(jumping.vz).toBeGreaterThan(0);
  }
 });
 it('keeps the terminal, hangar, tower and medical center assembled without dangling parts',()=>{
  for(const id of ['airport_terminal','airport_hangar','airport_tower','east_medical_center']){
   const spec=scene.objects.find(o=>o.id===id)!.spec!;if(!('dslVersion' in spec))throw Error('Dream assembly required');
   const boxes=spec.parts.map(part=>{const geometry=partGeometry(part);geometry.applyMatrix4(new Matrix4().compose(new Vector3(...part.position),new Quaternion().setFromEuler(new Euler(...(part.rotation??[0,0,0]))),new Vector3(...part.size)));geometry.computeBoundingBox();const bounds=geometry.boundingBox!.clone();geometry.dispose();return bounds;});
   const connected=new Set([0]);let changed=true;
   while(changed){changed=false;for(let i=0;i<boxes.length;i++)if(!connected.has(i) && [...connected].some(j=>boxes[i]!.clone().expandByScalar(.01).intersectsBox(boxes[j]!))){connected.add(i);changed=true;}}
   expect(connected.size,spec.displayName).toBe(spec.parts.length);
   const bounds=boxes.reduce((box,next)=>box.union(next),new Box3());expect(bounds.min.y).toBeGreaterThanOrEqual(-.001);
  }
 });
 it('preserves the existing actor, animation, route and population budgets',()=>{
  expect(scene.routes).toHaveLength(12);
  expect(scene.objects.filter(o=>!o.parked && (o.route || controlFor(o))).length).toBeLessThanOrEqual(24);
  expect(scene.objects.filter(o=>roleOf(o)==='npc').length).toBeLessThanOrEqual(32);
  expect(scene.objects.filter(o=>!o.parked && hasAnimatedJoints(o.spec)).length+Number(scene.objects.some(o=>o.parked && hasAnimatedJoints(o.spec)))+Number(hasAnimatedJoints(scene.player))+1).toBeLessThanOrEqual(24);
  expect(scene.flocks.reduce((n,f)=>n+f.count,0)).toBe(256);
  expect(scene.objects.filter(o=>o.id.startsWith('airport_lamps_')).length).toBeGreaterThan(20);
  expect(scene.objects.filter(o=>o.id.startsWith('service_bicycles_')).length).toBeGreaterThanOrEqual(4);
 });
 it('publishes the same complete terminal Dream assembly as the live airport',()=>{
  const {voxelSize,...authored}=scene.objects.find(o=>o.id==='airport_terminal')!.spec as ObjectDslV2;
  expect(voxelSize).toBe(scene.voxelWorld?.objectCell);expect(compileDream(terminalSource)).toEqual([authored]);
 });
});
