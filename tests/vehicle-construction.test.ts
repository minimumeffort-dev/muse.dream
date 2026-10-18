import {describe,it,expect} from 'vitest';
import {Box3,Mesh,Quaternion,Raycaster,Vector3} from 'three';
import {compileDream} from '../src/scene/dream';
import {createWorldScene} from '../src/scene/world-fixture';
import {interactiveWorld} from '../src/scene/interactive-world';
import {hasAnimatedJoints,MAX_ANIMATED_ASSEMBLIES,type ObjectDslV2} from '../src/scene/object-dsl';
import {buildObject,animateObject,MAX_SUSPENSION_COMPRESSION} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import {measuredScale} from '../src/scene/measure';
import landmarks from '../src/scene/world/landmarks.dream?raw';
import street from '../src/scene/world/street_assets.dream?raw';
import carExample from '../docs/examples/city-car.dream?raw';
import bicycleExample from '../docs/examples/city-bicycle.dream?raw';

const assemblies=[...compileDream(landmarks),...compileDream(street),...interactiveWorld.assemblies];
const spec=(name:string)=>assemblies.find(s=>s.displayName===name)!;
const item=(asset:ObjectDslV2)=>({id:'vehicle',kind:'custom' as const,labelText:asset.displayName,x:0,y:0,scale:1,spec:asset});
const cars=['Little rally car','Town car','City hatchback','Neighborhood delivery van'];
const bearing=(asset:ObjectDslV2)=>asset.joints!.filter(j=>j.animation && 'kind' in j.animation);

describe('connected vehicle assemblies',()=>{
  it.each(cars)('%s has open wheel arches, coaxial wheels and a supported axle',name=>{
    const asset=spec(name),group=buildObject(item(asset));group.updateMatrixWorld(true);
    const shell=group.getObjectByName(asset.parts.find(p=>p.shape==='prism' && p.size[0]>28)!.id)!;
    const shafts=asset.parts.filter(p=>p.parent && p.shape==='cylinder' && p.size[0]===1.1);
    const yokes=asset.parts.filter(p=>!p.parent && p.shape==='box' && p.size[0]===1.4 && p.size[1]>3);
    expect(shafts).toHaveLength(2);expect(yokes).toHaveLength(2);expect(bearing(asset)).toHaveLength(2);
    const compressions=name==='Little rally car' ? [0,MAX_SUSPENSION_COMPRESSION] : [0];
    for(const compression of compressions){
      animateObject(group,0,true,0,compression);group.updateMatrixWorld(true);
      for(const joint of bearing(asset)){
        const radius='radius' in joint.animation! ? joint.animation.radius : 0,center=group.getObjectByName(joint.id)!.getWorldPosition(new Vector3());
        // Sample the actual tire circumference against the body triangles, both faces.
        for(let angle=0;angle<Math.PI*2;angle+=Math.PI/36){
          const ray=new Raycaster(new Vector3(center.x+Math.cos(angle)*radius,center.y+Math.sin(angle)*radius,30),new Vector3(0,0,-1));
          expect(ray.intersectObject(shell),`${name}: tire clips body at ${angle}, compression ${compression}`).toHaveLength(0);
        }
        const shaft=group.getObjectByName(shafts.find(p=>p.parent===joint.id)!.id)!;
        expect(yokes.some(p=>new Box3().setFromObject(group.getObjectByName(p.id)!,true).intersectsBox(new Box3().setFromObject(shaft,true)))).toBe(true);
        expect(yokes.some(p=>new Box3().setFromObject(group.getObjectByName(p.id)!,true).intersectsBox(new Box3().setFromObject(shell,true)))).toBe(true);
        for(const tire of asset.parts.filter(p=>p.parent===joint.id && p.size[0]===radius*2)){
          const wheel=group.getObjectByName(tire.id)!,axis=new Vector3(0,1,0).applyQuaternion(wheel.getWorldQuaternion(new Quaternion()));
          expect(Math.abs(axis.z)).toBeCloseTo(1);
          const offset=wheel.getWorldPosition(new Vector3()).sub(center);
          expect(offset.clone().cross(axis).length()).toBeLessThan(1e-6);
          expect(new Box3().setFromObject(wheel,true).intersectsBox(new Box3().setFromObject(shaft,true))).toBe(true);
        }
      }
    }
  });
  it.each(cars)('%s retains its size and collider while batching its rigid axle frames',name=>{
    const asset=spec(name),scale=measuredScale(asset),raw=buildObject({...item(asset),scale}),batch=compactObject(buildObject({...item(asset),scale}));
    expect(asset.parts.length).toBeLessThanOrEqual(32);
    expect(asset.body).toEqual({interaction:'solid',colliderRadius:name==='Neighborhood delivery van' ? 13 : 11,colliderHeight:name==='Neighborhood delivery van' ? 23 : name==='City hatchback' ? 15 : 14});
    const bounds=new Box3().setFromObject(raw,true);expect(bounds.getSize(new Vector3()).x).toBeCloseTo(asset.measure!.meters*10);expect(bounds.min.y).toBeCloseTo(0);
    let meshes=0;batch.traverse(o=>{if(o instanceof Mesh)meshes++;});expect(meshes).toBeLessThanOrEqual(4);
    for(const distance of [0,3,25,90]){
      for(const group of [raw,batch]){animateObject(group,1,true,distance,MAX_SUSPENSION_COMPRESSION);group.rotation.set(.1,.6,-.1);}
      const a=new Box3().setFromObject(raw,true),b=new Box3().setFromObject(batch,true);
      expect(a.min.distanceTo(b.min)).toBeLessThan(.0001);expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
    }
  });
  it('rolls the car and bicycle forward, and keeps the complete crank rigid around its axle',()=>{
    for(const asset of [spec('Little rally car'),spec('Meadow bicycle')]){
      const group=buildObject(item(asset)),joint=bearing(asset)[0]!,node=group.getObjectByName(joint.id)!;
      group.updateMatrixWorld(true);const axis=new Vector3(0,0,1).applyQuaternion(node.getWorldQuaternion(new Quaternion()));
      expect(axis.z).toBeCloseTo(-1); // Positive travel turns these bearings clockwise in XY.
      const center=node.getWorldPosition(new Vector3()),children=node.children.map(o=>({o,r:o.getWorldPosition(new Vector3()).distanceTo(center)}));
      const radius='radius' in joint.animation! ? joint.animation.radius : 0;
      animateObject(group,0,true,radius*Math.PI/2);group.updateMatrixWorld(true);
      expect(node.getWorldPosition(new Vector3()).distanceTo(center)).toBeLessThan(1e-7);
      for(const {o,r} of children)expect(o.getWorldPosition(new Vector3()).distanceTo(center)).toBeCloseTo(r);
      const pose=node.quaternion.clone();animateObject(group,100,true,radius*Math.PI/2);expect(node.quaternion.angleTo(pose)).toBeCloseTo(0);
    }
  });
  it('keeps the complete car and bicycle authoring examples identical to the live assemblies',()=>{
    expect(compileDream(carExample)).toEqual([spec('Town car')]);expect(compileDream(bicycleExample)).toEqual([spec('Meadow bicycle')]);
  });
});

it('retains parked bicycle cranks for bounded activation inside the existing live-animation cap',()=>{
  const scene=createWorldScene(),parked=scene.objects.filter(o=>o.id.startsWith('school_bicycles_') || o.id.startsWith('transit_bicycles_'));
  expect(parked.length).toBe(39);
  for(const bike of parked){expect(bike.role).toBe('controllable');expect(bike.parked).toBe(true);expect(hasAnimatedJoints(bike.spec)).toBe(true);expect(bike.spec).toMatchObject({dslVersion:2});}
  expect(hasAnimatedJoints(spec('Meadow bicycle'))).toBe(true);
  const count=scene.objects.filter(o=>!o.parked && hasAnimatedJoints(o.spec)).length+Number(scene.objects.some(o=>o.parked && hasAnimatedJoints(o.spec)))+Number(hasAnimatedJoints(scene.player))+1;
  expect(count).toBeLessThanOrEqual(MAX_ANIMATED_ASSEMBLIES);
  expect(scene.objects.length).toBe(1719);expect(scene.checkpoints).toHaveLength(0);
});
