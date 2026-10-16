import {describe,it,expect} from 'vitest';
import {Mesh,Box3,Vector3,Euler,Quaternion,Matrix4} from 'three';
import {buildStreets} from '../src/game/streets';
import {createWorldScene,worldModules} from '../src/scene/world-fixture';
import {compileDream,checkDream,compileDreamWorld,formatDream} from '../src/scene/dream';
import {walkingNetwork,siteEntry,sitePath} from '../src/scene/sites';
import {assemblyBounds} from '../src/scene/measure';
import {partGeometry} from '../src/scene/object-geometry';
import {bridgeFitsStreet,streetPolygons} from '../src/scene/streets';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,stepCar,type World} from '../src/sim/car';
import {roadPoints,roadFrames,distanceToRoad} from '../src/scene/road';
import {drivingHeight} from '../src/scene/terrain';
import {validateScenePlayability} from '../src/scene/validate';
import {polygonArea,partition} from '../src/scene/polygons';
import {stepInteractive,toggleRide} from '../src/sim/interaction';
import {actorPose} from '../src/sim/actors';
import {waterAt} from '../src/scene/terrain';
import {roleOf} from '../src/scene/agents';
import {routePose,routePath} from '../src/scene/routes';

const scene=createWorldScene();
describe('connected river city',()=>{
 it('rebuilds the full world deterministically with distinct districts and civic destinations',()=>{
  expect(createWorldScene()).toEqual(scene);
  expect(scene.canonical).toMatchObject({width:14000,height:11000});
  const buildings=scene.objects.filter(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='building');
  expect(buildings.length).toBeGreaterThan(180);expect(buildings.length).toBeLessThan(256);
  for(const kind of ['home','market','school','hospital','work','civic','park','station','stop'])expect(scene.sites.some(s=>s.kind===kind)).toBe(true);
  for(const area of ['oldtown','garden','south','east'])expect(buildings.filter(o=>o.id.startsWith(area+'_')).length).toBeGreaterThan(20);
  expect(new Set(buildings.map(o=>o.spec!.displayName)).size).toBeGreaterThan(15);
  expect(scene.objects.filter(o=>roleOf(o)==='npc').length).toBeLessThanOrEqual(32);
 });
 it('connects every declared entrance and transit platform through the same pedestrian network',()=>{
  const network=walkingNetwork(scene),roots=new Set(scene.sites.map(s=>network.roots[network.sites.get(s.id)!]));
  expect(roots.size).toBe(1);
  expect(scene.sites.every(s=>sitePath(scene,s).length>=2)).toBe(true);
  for(const object of scene.objects.filter(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='building'))expect(scene.sites.some(s=>s.objectId===object.id),object.id).toBe(true);
  for(const route of scene.routes.filter(r=>r.stops?.length))for(const stop of route.stops!){
   const site=scene.sites.find(s=>s.id===stop.site)!;expect(site).toBeDefined();
   expect(Math.hypot(siteEntry(scene,site).x-route.points[stop.anchor]!.x,siteEntry(scene,site).y-route.points[stop.anchor]!.y)).toBeLessThanOrEqual(120);
  }
 });
 it('keeps architectural parts attached, including roofs, façade details and breakable porch supports',()=>{
  const specs=['architecture','civic_assets'].flatMap(id=>compileDream(worldModules[id]!).filter(s=>s.measure?.kind==='building'));
  for(const spec of specs){
   const boxes=spec.parts.map(part=>{const g=partGeometry(part);g.applyMatrix4(new Matrix4().compose(new Vector3(...part.position),new Quaternion().setFromEuler(new Euler(...(part.rotation??[0,0,0]))),new Vector3(...part.size)));g.computeBoundingBox();const box=g.boundingBox!.clone();g.dispose();return box;});
   const connected=new Set([0]);let changed=true;
   while(changed){changed=false;for(let i=0;i<boxes.length;i++)if(!connected.has(i) && [...connected].some(j=>boxes[i]!.clone().expandByScalar(.01).intersectsBox(boxes[j]!))){connected.add(i);changed=true;}}
   expect(connected.size,`${spec.displayName}: detached architectural part`).toBe(spec.parts.length);
   const wall=spec.parts[0]!,roof=spec.parts[1]!;
   expect(roof.position[1]-roof.size[1]/2).toBeCloseTo(wall.position[1]+wall.size[1]/2,3);
   expect(roof.size[0]).toBeGreaterThanOrEqual(wall.size[0]);expect(roof.size[2]).toBeGreaterThanOrEqual(wall.size[2]);
   for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){
    const x=(i/8-.5)*wall.size[0],z=(j/8-.5)*wall.size[2];
    expect(spec.contacts!.some(c=>Math.hypot(c.position[0]-x,c.position[2]-z)<=c.radius+1e-5),`${spec.displayName}: walk-through wall corner`).toBe(true);
   }
   expect(assemblyBounds(spec).min.y).toBeGreaterThanOrEqual(-.01);
  }
 });
 it('shares exact junction coordinates and rejects a short overlapping branch',()=>{
  const text='dream 2;junction corner(at=[480,300]);junction west(at=[200,300]);junction north(at=[480,100]);street main(width=60,sidewalk=20,via=[north,corner]);street side(width=60,sidewalk=20,via=[west,corner]);';
  const compiled=compileDreamWorld(text);expect(compiled.streets[0]!.points.at(-1)).toEqual(compiled.streets[1]!.points.at(-1));
  expect(compileDreamWorld(formatDream(text))).toEqual(compiled);
  for(const bad of [text.replace('via=[west,corner]','via=[west,missing]'),text.replace('via=[west,corner]','via=[west,corner],points=[[200,300],[480,300]]')])expect(checkDream(bad).ok).toBe(false);
  for(const bridge of scene.terrain.landscape!.bridges)expect(bridgeFitsStreet(scene,bridge)).toBe(true);
  expect(validateScenePlayability(scene,buildMaskForScene(scene),11)).toEqual([]);
 });
 it('builds finite city meshes without duplicating the cached sidewalk network',()=>{
  const before=walkingNetwork(scene).polygons.length,group=buildStreets(scene);let vertices=0;
  group.traverse(node=>{if(!(node instanceof Mesh))return;const positions=node.geometry.getAttribute('position');vertices+=positions.count;expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);});
  expect(vertices).toBeGreaterThan(1000);
  expect(walkingNetwork(scene).polygons.length).toBe(before);
  group.traverse(node=>{if(node instanceof Mesh)node.geometry.dispose();});
 });
 it('keeps bus, tram and train stops on their routes while commuters visit actual destinations',()=>{
  const tram=scene.routes.find(r=>r.kind==='tram')!;expect(tram.stops).toHaveLength(3);
  const stop=tram.stops![0]!,distance=routePath(tram).distances[stop.anchor]!;
  expect(routePose(tram,distance/tram.speed+1)).toMatchObject({...tram.points[stop.anchor],speed:0});
  const commuter=scene.routes.find(r=>r.kind==='walk')!;
  expect(commuter.stops!.map(s=>scene.sites.find(site=>site.id===s.site)!.kind)).toEqual(['home','market']);
  expect(scene.routes.filter(r=>r.kind==='street' && r.stops?.length)).toHaveLength(2);
 });
 it('sails under the real market bridge and leaves the moored boat on dry shore',()=>{
  const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
  const boat=scene.objects.find(o=>o.id==='canal_launch')!,pose=actorPose(scene,boat,0);
  const moored={...createCarAtSpawn(scene),...pose,control:{kind:'vehicle' as const,id:boat.id},vx:0,vy:0,headingRad:Math.PI/2};
  const foot=toggleRide(moored,world);expect(foot.control.kind).toBe('foot');expect(waterAt(scene.terrain,foot.x,foot.y,foot.elevation)).toBeUndefined();
  let state={...moored,x:9000,y:3980,elevation:-2};
  for(let i=0;i<600;i++)state=stepInteractive(state,{throttle:1,steer:0},1/120,world) as typeof state;
  expect(state.y).toBeGreaterThan(4350);expect(state.elevation).toBeCloseTo(-2);expect(state.grounded).toBe(true);
 });
 it('drives the entire new ring through all eight ordered checkpoints with clear ice and boost footprints',()=>{
  const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
  const frames=roadFrames(scene),path=roadPoints(scene),n=path.length-1,first=frames[0]!,next=frames[1]!;
  let car={...createCarAtSpawn(scene),x:first.x,y:first.y,elevation:drivingHeight(scene.terrain,first.x,first.y),headingRad:Math.atan2(next.y-first.y,next.x-first.x)},cursor=0;const seen=new Set<number>();
  for(let i=0;i<28000 && !car.lap;i++){
   let best=Infinity,old=cursor;
   for(let j=-5;j<25;j++){const index=(old+j+n)%n,p=path[index]!,distance=Math.hypot(car.x-p.x,car.y-p.y);if(distance<best){best=distance;cursor=index;}}
   let aim=cursor,look=0;while(look<100){const a=path[aim]!,b=path[(aim+1)%n]!;look+=Math.hypot(b.x-a.x,b.y-a.y);aim=(aim+1)%n;}
   const p=path[aim]!,angle=Math.atan2(p.y-car.y,p.x-car.x)-car.headingRad,error=Math.atan2(Math.sin(angle),Math.cos(angle));
   car=stepCar(car,{throttle:Math.hypot(car.vx,car.vy)>215 ? -1:1,steer:Math.max(-1,Math.min(1,error*2))},1/120,world);seen.add(car.nextCheckpoint);
  }
  expect(car.lap).toBe(1);expect(seen.size).toBe(8);expect(distanceToRoad(path,car.x,car.y)).toBeLessThan(65);
  expect(scene.regions.map(r=>r.rule.effect).sort()).toEqual(['BOOST','ICE']);
  for(const region of scene.regions)for(let i=0;i<region.polygon.length;i++){const a=region.polygon[i]!,b=region.polygon[(i+1)%region.polygon.length]!;for(let j=0;j<=10;j++)expect(world.roadMask.footprintClear(a.x+(b.x-a.x)*j/10,a.y+(b.y-a.y)*j/10,20)).toBe(true);}
 });
});
