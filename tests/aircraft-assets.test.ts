import {describe,it,expect} from 'vitest';
import {Box3,Group,Mesh,Raycaster,Vector3} from 'three';
import {interactiveWorld} from '../src/scene/interactive-world';
import {compileDream} from '../src/scene/dream';
import example from '../docs/examples/light-aircraft.dream?raw';
import {buildObject,animateObject} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import {measuredScale} from '../src/scene/measure';
import {createWorldScene} from '../src/scene/world-fixture';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,resetCar,type World} from '../src/sim/car';
import {stepInteractive,toggleRide,bodyWorld} from '../src/sim/interaction';
import {vehicleReviewStart} from '../src/game/review-start';

const spec=interactiveWorld.assemblies.find(s=>s.displayName==='Cloudhopper plane')!;
const object={id:'plane',kind:'custom' as const,labelText:spec.displayName,x:0,y:0,scale:1,spec};
function ray(group:Group,x:number,z:number,above=true){
  group.updateMatrixWorld(true);
  return new Raycaster(new Vector3(x,above ? 100 : -100,z),new Vector3(0,above ? -1 : 1,0)).intersectObject(group,true);
}

describe('aircraft geometry and visible surface ownership',()=>{
  it('has one colored surface at every sampled wing tip, above and below',()=>{
    const group=buildObject(object);
    // Previously the colored cap occupied the teal wing's exact top/bottom faces.
    for(const side of [-1,1])for(const x of [0,8])for(const z of [41,43,45])for(const above of [true,false]){
      const hits=ray(group,x,side*z,above),first=hits[0]!;
      expect(first,`${x},${side*z},${above}`).toBeDefined();
      expect(spec.parts.find(p=>p.id===first.object.name)!.material.colorA).toBe('#af5040');
      for(const hit of hits.filter(h=>h.object!==first.object))expect(Math.abs(hit.distance-first.distance)).toBeGreaterThan(.01);
    }
  });
  it('joins both wing sections without a surface step or detached bracing',()=>{
    const group=buildObject(object);group.updateMatrixWorld(true);
    for(const sign of [-1,1]){
      for(const x of [0,4,8])for(const above of [true,false]){
        const a=ray(group,x,sign*38.999,above)[0]!,b=ray(group,x,sign*39.001,above)[0]!;
        expect(a.point.distanceTo(b.point)).toBeLessThan(.003);
      }
      const brace=spec.parts.find(p=>p.shape==='cylinder' && p.size[0]===1.3 && p.size[1]>20 && Math.sign(p.position[2])===sign)!;
      const mesh=group.getObjectByName(brace.id)!;
      // Endpoints must sit inside actual supporting geometry, not just touch its AABB.
      for(const end of [-.49,.49]){
        const point=new Vector3(0,end,0).applyMatrix4(mesh.matrixWorld);
        const above=ray(group,point.x,point.z),below=ray(group,point.x,point.z,false);
        expect(above.some(h=>h.object!==mesh && h.point.y>=point.y && below.some(b=>b.object===h.object && b.point.y<=point.y))).toBe(true);
      }
    }
  });
  it('keeps the cowling outside the fuselage throughout their overlap',()=>{
    const group=buildObject(object);
    const cowlId=spec.parts.find(p=>p.position[0]===31)!.id,bodyId=spec.parts.find(p=>p.taper===.22)!.id;
    for(const x of [27,29,31])for(const z of [-4,0,4]){
      const hits=ray(group,x,z),cowl=hits.find(h=>h.object.name===cowlId)!,body=hits.find(h=>h.object.name===bodyId)!;
      expect(cowl.distance).toBeLessThan(body.distance-.1);
    }
  });
  it('preserves measured scale, bounded geometry and independent animated pivots after batching',()=>{
    expect(spec.parts.length).toBeLessThanOrEqual(32);
    const raw=buildObject({...object,scale:measuredScale(spec)}),batched=compactObject(buildObject({...object,scale:measuredScale(spec)}));
    const bounds=new Box3().setFromObject(raw,true),size=bounds.getSize(new Vector3());
    expect(size.z).toBeCloseTo(108);expect(size.x).toBeGreaterThan(80);expect(size.x).toBeLessThan(size.z);
    expect(bounds.min.y).toBeCloseTo(0);expect(size.y).toBeLessThan(35);
    let meshes=0;batched.traverse(o=>{if(o instanceof Mesh)meshes++;});expect(meshes).toBeLessThanOrEqual(6);
    for(const t of [0,.25,1.5,3,4.5]){
      animateObject(raw,t,true,t*90);animateObject(batched,t,true,t*90);
      raw.rotation.set(.3,.8,-.2);batched.rotation.copy(raw.rotation);
      const a=new Box3().setFromObject(raw,true),b=new Box3().setFromObject(batched,true);
      expect(a.min.distanceTo(b.min)).toBeLessThan(.0001);expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
    }
    const propeller=raw.getObjectByName(spec.parts.find(p=>p.animation?.kind==='spin')!.id)!;
    const axis=new Vector3(1,0,0).applyQuaternion(propeller.quaternion);
    expect(axis.distanceTo(new Vector3(1,0,0))).toBeLessThan(1e-8);
  });
  it('publishes the same checked Dream assembly as the playable aircraft',()=>{
    expect(compileDream(example)).toEqual([spec]);
  });
});

it('boards the live aircraft, takes off, banks, rejects a midair exit and recovers without changing race progress',()=>{
  const scene=createWorldScene(),world:World={scene,carRadius:11,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height)};
  const initial=createCarAtSpawn(scene),foot=vehicleReviewStart(initial,world,'cloudhopper');
  expect(foot.control.kind).toBe('foot');
  let state=toggleRide(foot,world);expect(state.control).toEqual({kind:'vehicle',id:'cloudhopper'});
  const body=bodyWorld(state,world);
  expect(body.carRadius).toBeCloseTo(29*108/92);expect(body.bodyHeight).toBeCloseTo(29*108/92);
  for(let i=0;i<360;i++)state=stepInteractive(state,{throttle:1,steer:0,lift:1},1/120,world);
  expect(state.grounded).toBe(false);expect(state.elevation).toBeGreaterThan(80);expect(state.y).toBeLessThan(foot.y-300);
  expect(toggleRide(state,world)).toBe(state);
  const heading=state.headingRad;
  for(let i=0;i<48;i++)state=stepInteractive(state,{throttle:1,steer:1,lift:0},1/120,world);
  expect(state.headingRad).toBeGreaterThan(heading+.3);expect(state.bank).toBeGreaterThan(.3);
  expect(state.nextCheckpoint).toBe(initial.nextCheckpoint);expect(state.lap).toBe(initial.lap);
  const reset=resetCar(state,scene);expect(reset.control.kind).toBe('car');expect(reset.vehicles.some(v=>v.id==='cloudhopper')).toBe(false);
});
