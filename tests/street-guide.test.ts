import {it,expect} from 'vitest';
import {streetGuide} from '../src/game/street-guide';
import {navigationGuide,navigationTarget,waypointGuide} from '../src/game/navigation';
import {createFixtureScene} from '../src/scene/fixture';
import {createCarAtSpawn} from '../src/sim/car';
import {controlOf} from '../src/scene/object-dsl';
import {distanceToRoad} from '../src/scene/road';
const street=(id:string,points:number[][])=>({id,width:80,sidewalk:20,points:points.map(([x,y])=>({x:x!,y:y!}))});
const ring=()=>({...createFixtureScene(),streets:[street('u',[[100,100],[100,500],[500,500],[500,100]])]});
it('follows connected streets around a block instead of cutting through it',()=>{
 const scene=ring(),route=streetGuide(scene,{x:100,y:100},{x:500,y:100})!;
 expect(route.distance).toBe(1200);expect(route.aim).toEqual({x:100,y:180});expect(route.points).toContainEqual({x:100,y:500});expect(route.points).toContainEqual({x:500,y:500});
 expect(streetGuide(scene,{x:120,y:100},{x:510,y:100})!.distance).toBe(1230);
});
it('splits T junctions, crosses and diagonals at their actual shared coordinates',()=>{
 for(const y of [100,200]){
  const scene={...createFixtureScene(),streets:[street('main',[[100,200],[700,200]]),street('branch',[[400,y],[400,600]])]},route=streetGuide(scene,{x:100,y:200},{x:400,y:600})!;
  expect(route.distance).toBe(700);expect(route.points).toContainEqual({x:400,y:200});
 }
 const scene={...createFixtureScene(),streets:[street('a',[[100,100],[700,700]]),street('b',[[100,700],[700,100]])]},route=streetGuide(scene,{x:100,y:100},{x:700,y:100})!;
 expect(route.points).toContainEqual({x:400,y:400});expect(route.distance).toBeCloseTo(Math.sqrt(2)*600);
});
it('merges collinear overlap connectivity and selects direct travel on the same edge',()=>{
 const scene={...createFixtureScene(),streets:[street('a',[[100,200],[500,200]]),street('b',[[300,200],[700,200]])]};
 expect(streetGuide(scene,{x:120,y:200},{x:680,y:200})!.distance).toBe(560);expect(streetGuide(scene,{x:310,y:200},{x:320,y:200})!.distance).toBeCloseTo(10);
 expect(streetGuide(scene,{x:680,y:200},{x:120,y:200})!.distance).toBe(560);
});
it('never invents a link between disconnected roads or across an endpoint gap',()=>{
 for(const points of [[[100,500],[700,500]],[[720,200],[900,200]]]){
  const scene={...createFixtureScene(),streets:[street('a',[[100,200],[700,200]]),street('b',points)]};expect(streetGuide(scene,{x:100,y:200},scene.streets[1]!.points.at(-1)!)).toBeUndefined();
 }
 expect(streetGuide(createFixtureScene(),{x:100,y:100},{x:500,y:100})).toBeUndefined();
 expect(streetGuide(ring(),{x:800,y:800},{x:500,y:100})).toBeUndefined();expect(streetGuide(ring(),{x:100,y:100},{x:900,y:900})).toBeUndefined();
});
it('uses the next street segment for driving while arrival stays tied to the actual waypoint',()=>{
 const scene=ring(),state={...createCarAtSpawn(scene),x:100,y:100},target={x:500,y:100},routed=navigationGuide(scene,state,target,0);
 expect(routed.distance).toBe(1200);expect(routed.direction).toBeCloseTo(waypointGuide(state,{x:100,y:180},0).direction);expect(routed.arrived).toBe(false);
 expect(navigationGuide(scene,{...state,control:{kind:'foot'}},target,0).route).toBeUndefined();expect(navigationGuide(scene,{...state,control:{kind:'passenger',id:'bus'}},target,0).route).toBeUndefined();
 expect(navigationGuide(scene,{...state,x:500,y:120},target,0).arrived).toBe(true);
 const chosen=navigationTarget(state,scene,target)!;expect(chosen).toMatchObject({kind:'waypoint',...target});
});
it('reuses destination topology without mutating the accepted world or leaking another target',()=>{
 const scene=ring(),before=JSON.stringify(scene),first=streetGuide(scene,{x:100,y:100},{x:500,y:100});
 for(let i=0;i<20;i++)expect(streetGuide(scene,{x:100,y:100},{x:500,y:100})).toEqual(first);
 expect(streetGuide(scene,{x:100,y:100},{x:100,y:500})!.distance).toBe(400);expect(streetGuide(scene,{x:100,y:100},{x:500,y:100})).toEqual(first);expect(JSON.stringify(scene)).toBe(before);
});
it('routes through the actual Dream city while keeping every street leg on its authored centerline',async()=>{
 const {createWorldScene}=await import('../src/scene/world-fixture'),scene=createWorldScene(),from=scene.streets[0]!.points[0]!,to=scene.streets.at(-1)!.points.at(-1)!;const cold=performance.now(),route=streetGuide(scene,from,to)!;console.log(`City graph + first route (${scene.streets.length} streets): ${(performance.now()-cold).toFixed(2)} ms`);
 for(const street of scene.streets)for(const endpoint of [street.points[0]!,street.points.at(-1)!])expect(streetGuide(scene,from,endpoint),street.id).toBeDefined();
 expect(route).toBeDefined();expect(route.distance).toBeGreaterThan(Math.hypot(to.x-from.x,to.y-from.y));
 for(let i=2;i<route.points.length-1;i++)for(let n=0;n<=4;n++){const a=route.points[i-1]!,b=route.points[i]!,point={x:a.x+(b.x-a.x)*n/4,y:a.y+(b.y-a.y)*n/4};expect(Math.min(...scene.streets.map(s=>distanceToRoad(s.points,point.x,point.y)))).toBeLessThan(.001);}
 const vehicle=scene.objects.find(o=>controlOf(o.spec)==='plane')!,pilot={...createCarAtSpawn(scene),...from,control:{kind:'vehicle' as const,id:vehicle.id}};expect(navigationGuide(scene,pilot,to,0).route).toBeUndefined();
 const start=performance.now();for(let i=0;i<100;i++)streetGuide(scene,{x:from.x,y:from.y+i*.01},to);console.log(`100 warm city guidance queries: ${(performance.now()-start).toFixed(2)} ms`);
});

it('bounds dense graph construction and falls back without changing accepted street data',()=>{
 const scene={...createFixtureScene(),canonical:{...createFixtureScene().canonical,width:14000,height:11000},streets:Array.from({length:32},(_,i)=>street('s'+i,Array.from({length:16},(_,k)=>[300+k*800,3000+(i*7919+k*104729)%1000])))};
 const before=JSON.stringify(scene);expect(streetGuide(scene,scene.streets[0]!.points[0]!,scene.streets.at(-1)!.points.at(-1)!)).toBeUndefined();expect(JSON.stringify(scene)).toBe(before);expect(streetGuide(scene,{x:0,y:0},{x:9000,y:9000})).toBeUndefined();
});

it('returns owned geometry without exposing the player, target or cached graph to mutation',()=>{
 const scene=ring(),state={...createCarAtSpawn(scene),x:100,y:100},target={x:500,y:100},before=JSON.stringify(state),result=streetGuide(scene,state,target)!,expected=structuredClone(result);
 for(const point of result.points)point.x+=9000;result.aim.x+=9000;
 expect(JSON.stringify(state)).toBe(before);expect(target).toEqual({x:500,y:100});expect(streetGuide(scene,state,target)).toEqual(expected);
});
