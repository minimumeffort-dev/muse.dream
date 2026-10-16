import {describe,it,expect} from 'vitest';
import {Box3,InstancedMesh} from 'three';
import {compileDream,compileDreamWorld,formatDream,checkDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {createWorldScene} from '../src/scene/world-fixture';
import {routeSchema,routePath} from '../src/scene/routes';
import {objectDslSchema,hasAnimatedJoints,MAX_ANIMATED_ASSEMBLIES} from '../src/scene/object-dsl';
import {measuredScale,assemblyBounds,assemblyHorizontalRadius} from '../src/scene/measure';
import {drivingHeight,waterAt} from '../src/scene/terrain';
import {bridgeAt} from '../src/scene/landscape-dsl';
import {roadPoints,distanceToRoad} from '../src/scene/road';
import {pointInPolygon,buildPaperMask} from '../src/sim/mask';
import {actorPose,actorContacts,routeElevation} from '../src/sim/actors';
import {createCarAtSpawn,stepCar} from '../src/sim/car';
import {validateScenePlayability} from '../src/scene/validate';
import {buildRoutes} from '../src/game/routes';
import {buildEnvironment} from '../src/game/environment';
import {buildObject,animateObject} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import floraSource from '../src/scene/world/flora.dream?raw';
import faunaSource from '../src/scene/world/fauna.dream?raw';
import example from '../docs/examples/ambient-wildlife.dream?raw';

const fauna=compileDream(faunaSource),flora=compileDream(floraSource),world=createWorldScene();
const exampleWorld=compileDreamWorld(example);
const fixture=parseScene({...createFixtureScene(),objects:exampleWorld.objects,routes:exampleWorld.routes,regions:[],terrain:{hills:[]}});
const ground=()=>parseScene({...fixture,routes:fixture.routes.map(r=>({...r,altitude:undefined,speed:5}))});

describe('bounded ambient routes',()=>{
  it('compiles a complete two-bird example and preserves canonical source',()=>{
    expect(checkDream(example).ok).toBe(true);
    expect(compileDreamWorld(formatDream(example))).toEqual(exampleWorld);
    expect(exampleWorld.assemblies).toHaveLength(1);expect(exampleWorld.objects).toHaveLength(2);
    expect(exampleWorld.objects.every(o=>objectDslSchema.parse(o.spec).body.interaction==='decor')).toBe(true);
  });
  it('allows slow ambient motion while preserving vehicle route speed, altitude and surface bounds',()=>{
    const ambient=exampleWorld.routes[0]!;
    for(const speed of [.5,2.7,5,160])expect(routeSchema.safeParse({...ambient,speed}).success).toBe(true);
    for(const patch of [{speed:.49},{speed:161},{altitude:59},{altitude:301},{width:40},{surface:'trail'},{kind:'water'},{kind:'path'}])
      expect(routeSchema.safeParse({...ambient,...patch}).success,JSON.stringify(patch)).toBe(false);
    expect(routeSchema.safeParse({...ambient,altitude:undefined}).success).toBe(true);
    expect(routeSchema.safeParse({...ambient,kind:'air',speed:11}).success).toBe(false);
    expect(routeSchema.safeParse({...ambient,kind:'air',speed:12}).success).toBe(true);
  });
  it('requires non-colliding decor and retains the existing actor and animation caps',()=>{
    const object=fixture.objects[0]!,spec=exampleWorld.assemblies[0]!;
    expect(()=>parseScene({...fixture,objects:[{...object,spec:objectDslSchema.parse({...spec,body:{...spec.body,interaction:'solid'}})}]})).toThrow('ambient actors require decor');
    expect(()=>parseScene({...fixture,objects:Array.from({length:25},(_,i)=>({...object,id:`bird_${i}`}))})).toThrow();
    const plain=objectDslSchema.parse({...spec,parts:spec.parts.filter(p=>!('parent' in p && p.parent)),joints:undefined});
    expect(()=>parseScene({...fixture,objects:Array.from({length:25},(_,i)=>({...object,spec:plain,id:`bird_${i}`}))})).toThrow('24 route actors');
  });
  it('keeps birds aloft at the loop seam and ground animals on terrain',()=>{
    const route=fixture.routes[0]!,duration=routePath(route).length/route.speed;
    for(const t of [0,.01,duration-.001,duration,duration+.001]){
      const pose=actorPose(fixture,fixture.objects[0]!,t);
      expect(pose.kind).toBe('air');expect(pose.elevation-drivingHeight(fixture.terrain,pose.x,pose.y)).toBe(120);
    }
    const scene=ground(),pose=actorPose(scene,scene.objects[0]!,4);
    expect(pose.kind).toBe('path');expect(pose.elevation).toBe(drivingHeight(scene.terrain,pose.x,pose.y));
  });
  it('creates no road, runway or cleared strip beneath a wildlife route',()=>{
    expect(buildRoutes(fixture).children).toHaveLength(0);
    const arrays=(scene:Scene)=>{const matrices:unknown[]=[];buildEnvironment(scene).traverse(o=>{if(o instanceof InstancedMesh)matrices.push(o.count,Array.from(o.instanceMatrix.array));});return matrices;};
    expect(arrays(fixture)).toEqual(arrays(parseScene({...fixture,objects:[],routes:[]})));
  });
  it('lets the car pass through ambient wildlife without adding a physics contact',()=>{
    const scene=ground(),target=actorPose(scene,scene.objects[0]!,0),car={...createCarAtSpawn(scene),x:target.x,y:target.y,elevation:target.elevation,vx:120,vy:0};
    expect(actorContacts(scene,0)).toEqual([]);
    const next=stepCar(car,{throttle:0,steer:0},1/120,{scene,carRadius:11,driveMask:buildPaperMask(960,720),roadMask:buildMaskForScene(scene)});
    expect(next.x).toBeGreaterThan(car.x);expect(next.vx).toBeGreaterThan(100);
  });
  it('rejects a ground habitat in water or through solids but allows clear overhead flight',()=>{
    const scene=ground(),obstacle={id:'tree',kind:'tree' as const,labelText:'TREE',x:300,y:300,scale:1};
    const blocked=parseScene({...scene,objects:[...scene.objects,obstacle]});
    expect(validateScenePlayability(blocked,buildMaskForScene(scene),11)).toContainEqual(expect.objectContaining({code:'route-not-clear'}));
    const overhead=parseScene({...blocked,routes:fixture.routes});
    expect(validateScenePlayability(overhead,buildMaskForScene(scene),11).filter(p=>p.code==='route-not-clear')).toEqual([]);
    const pond={id:'pond',polygon:[{x:260,y:260},{x:360,y:260},{x:360,y:360},{x:260,y:360}],level:0,depth:6,bankWidth:20,color:'#337788',flow:{x:0,y:0},dragPerS:2,waves:{speed:55,damping:1,strength:1}};
    const wet=parseScene({...scene,terrain:{hills:[],landscape:{dslVersion:1,waters:[pond],bridges:[]}}});
    expect(validateScenePlayability(wet,buildMaskForScene(scene),11)).toContainEqual(expect.objectContaining({code:'route-not-clear'}));
  });
});

describe('Dream-authored ecology',()=>{
  it('adds thirteen distinct measured forms inside all existing budgets',()=>{
    expect(flora).toHaveLength(8);expect(fauna).toHaveLength(5);
    expect(new Set([...flora,...fauna].map(s=>JSON.stringify(s.parts.map(({material,...p})=>p)))) .size).toBe(13);
    for(const spec of [...flora,...fauna]){
      expect(objectDslSchema.parse(spec)).toEqual(spec);expect(spec.measure).toBeDefined();
      expect(spec.parts.length).toBeLessThanOrEqual(32);expect(assemblyBounds(spec).isEmpty()).toBe(false);
    }
    expect(world.objects.length).toBeGreaterThan(450);expect(world.routes).toHaveLength(9);
    expect(world.objects.filter(o=>hasAnimatedJoints(o.spec)).length+Number(hasAnimatedJoints(world.player))+1).toBeLessThanOrEqual(MAX_ANIMATED_ASSEMBLIES);
  });
  it('keeps all new plant roots on dry ground clear of bridges and the circuit',()=>{
    const plants=world.objects.filter(o=>o.id.startsWith('ecology_') && flora.some(s=>s.displayName===o.spec?.displayName));
    expect(plants.length).toBeGreaterThan(40);expect(new Set(plants.map(o=>o.spec!.displayName)).size).toBeGreaterThanOrEqual(5);
    for(const plant of plants){
      expect(waterAt(world.terrain,plant.x,plant.y),plant.id).toBeUndefined();
      expect(bridgeAt(world.terrain.landscape,plant.x,plant.y),plant.id).toBeUndefined();
      expect(world.terrain.landscape!.waters.some(w=>pointInPolygon(plant.x,plant.y,w.polygon)),plant.id).toBe(false);
      expect(distanceToRoad(roadPoints(world),plant.x,plant.y),plant.id).toBeGreaterThan(world.roadMaskRef.params.roadWidth/2+assemblyHorizontalRadius(plant.spec as typeof flora[number],plant.scale));
    }
  });
  it.each(fauna)('preserves $displayName articulation after geometry batching',spec=>{
    const object={id:'animal',kind:'custom' as const,labelText:spec.displayName,x:0,y:0,scale:measuredScale(spec),spec};
    const raw=buildObject(object),batched=compactObject(buildObject(object));
    for(const time of [0,.5,1.5]){
      animateObject(raw,time);animateObject(batched,time);
      const a=new Box3().setFromObject(raw,true),b=new Box3().setFromObject(batched,true);
      expect(a.min.distanceTo(b.min)).toBeLessThan(1e-4);expect(a.max.distanceTo(b.max)).toBeLessThan(1e-4);
    }
    animateObject(batched,2,false);const rest=new Box3().setFromObject(batched,true);
    animateObject(batched,20,false);expect(new Box3().setFromObject(batched,true)).toEqual(rest);
  });
  it('keeps walking habitats dry and all birds above their authored terrain clearance',()=>{
    for(const object of world.objects.filter(o=>o.route && world.routes.find(r=>r.id===o.route!.id)!.kind==='ambient')){
      const route=world.routes.find(r=>r.id===object.route!.id)!;
      for(const time of [0,2,8,20]){
        const pose=actorPose(world,object,time),floor=drivingHeight(world.terrain,pose.x,pose.y);
        expect(pose.elevation-floor).toBeCloseTo(route.altitude??0,8);
        expect(Number.isFinite(routeElevation(world,route,pose,pose.distance))).toBe(true);
        if(!route.altitude)expect(waterAt(world.terrain,pose.x,pose.y)).toBeUndefined();
      }
    }
  });
});
