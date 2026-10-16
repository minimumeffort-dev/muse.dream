import {describe,it,expect} from 'vitest';
import {Box3,Mesh} from 'three';
import {compileDreamWorld,compileDreamScene,formatDream,checkDream} from '../src/scene/dream';
import {hasAnimatedJoints,type ObjectDslV2} from '../src/scene/object-dsl';
import {buildObject} from '../src/game/world3d';
import humanoid from '../docs/examples/humanoid.dream?raw';
import city from '../docs/examples/city-cycle-lanes.dream?raw';
import {onWalkway} from '../src/scene/sites';
import {assemblyHorizontalRadius} from '../src/scene/measure';
import {WorldScenery} from '../src/game/scenery';
import {InstancedMesh} from 'three';

describe('explicit resting populations',()=>{
  const source=humanoid+'\nbehavior hello(start=rest){state rest(action=idle,face=none){}}\nroute walk(kind=walk,mode=shuttle,speed=10){point(at=[500,500]);point(at=[700,500]);}\nplace neighbor(object=explorer,at=[500,500],role=prop,pose=rest);';
  it('reuses the complete measured model as static scenery without modifying its live template',()=>{
    const world=compileDreamWorld(source),template=world.assemblies[0]!,rest=world.objects.at(-1)!.spec! as ObjectDslV2;
    expect(hasAnimatedJoints(template)).toBe(true);expect(hasAnimatedJoints(rest)).toBe(false);
    expect(rest.parts).toHaveLength(template.parts.length);expect(rest.measure).toEqual(template.measure);expect(rest.body).toEqual(template.body);
    const make=(spec:typeof rest)=>buildObject({id:'pose',kind:'custom',labelText:'Pose',x:0,y:0,scale:1,spec});
    const a=make(template),b=make(rest);a.updateMatrixWorld(true);b.updateMatrixWorld(true);
    for(const part of rest.parts){
      const p=a.getObjectByName(part.id) as Mesh,q=b.getObjectByName(part.id) as Mesh;
      expect(new Box3().setFromObject(q,true)).toEqual(new Box3().setFromObject(p,true));
    }
    expect(compileDreamWorld(formatDream(source))).toEqual(world);
  });
  it('furnishes resting people deterministically without spending live rig slots',()=>{
    const source=city+humanoid.replace('dream 2;','')+'\nfurnish neighbors(objects=[explorer],streets=[avenue],spacing=200,setback=8,seed=31,pose=rest);';
    const a=compileDreamWorld(source),b=compileDreamWorld(formatDream(source));
    expect(a).toEqual(b);expect(a.objects.length).toBeGreaterThan(5);
    for(const object of a.objects){expect(object.role).toBe('prop');expect(hasAnimatedJoints(object.spec)).toBe(false);}
    expect(checkDream(source.replace(',pose=rest','')).ok).toBe(false);
  });
  it('keeps sidewalk residents on full-width paving, clear of crossings, with shared instance geometry',()=>{
    const source=city+humanoid.replace('dream 2;','')+'\nfurnish neighbors(objects=[explorer],streets=[avenue],spacing=160,setback=0,seed=31,pose=rest,on=sidewalk,facing=varied,jitter=.3);';
    const scene=compileDreamScene(source,{sceneId:'people',revisionId:'r1',sourceHash:'mock'});
    expect(scene.objects.length).toBeGreaterThan(5);
    for(const o of scene.objects){const r=assemblyHorizontalRadius(o.spec as ObjectDslV2,o.scale);expect(onWalkway(scene,o.x,o.y,r)).toBe(true);expect(Math.abs(o.x-1400)-(50+26)-r).toBeGreaterThanOrEqual(8);}
    expect(new Set(scene.objects.map(o=>o.headingRad)).size).toBeGreaterThan(3);
    const group=new WorldScenery(scene).group,meshes:InstancedMesh[]=[];
    group.traverse(o=>{if(o instanceof InstancedMesh)meshes.push(o);});
    expect(meshes.length).toBeLessThan(scene.objects.length);expect(meshes.reduce((n,m)=>n+m.count,0)).toBeGreaterThanOrEqual(scene.objects.length);
    expect(checkDream(source.replace('setback=0','setback=4')).ok).toBe(false);
    const solid=city+'\nmaterial paint(style=toon,colors=[#556677,#778899]);object bollard(label="Bollard"){body(interaction=solid,radius=4,height=8);part pole(shape=box,material=paint,at=[0,4,0],size=[2,8,2]);}\nfurnish blocked(objects=[bollard],streets=[avenue],spacing=160,setback=0,seed=1,on=sidewalk);';
    expect(checkDream(solid)).toMatchObject({ok:false,diagnostics:[{code:'E_POPULATION'}]});
  });
  it('cannot freeze away an interaction or silently infer passive ownership',()=>{
    const damaged='dream 2;material paint(style=toon,colors=[#556677,#778899]);object ball(label="Ball"){body(interaction=knockable,radius=4,height=8);impact(mode=bounce(restitution=.5,lift=.2));part body(shape=sphere,material=paint,at=[0,4,0],size=[8,8,8]);}place rest(object=ball,at=[100,100],role=prop,pose=rest);';
    expect(checkDream(damaged)).toMatchObject({ok:false,diagnostics:[{code:'E_POPULATION'}]});
    expect(checkDream(source.replace('role=prop,',''))).toMatchObject({ok:false,diagnostics:[{code:'E_PLACEMENT'}]});
  });
  it.each(['role=npc,pose=rest','role=controllable,pose=rest','role=prop,pose=rest,behavior=hello','route=walk,role=prop,pose=rest'])('rejects ambiguous ownership: %s',fields=>{
    const invalid=source.replace('at=[500,500],role=prop,pose=rest',fields.includes('route=') ? fields : 'at=[500,500],'+fields);
    expect(checkDream(invalid).ok).toBe(false);
  });
});
