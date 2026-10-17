import {it,expect} from 'vitest';
import * as THREE from 'three';
import source from '../docs/examples/orchard-replanting.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {surfaceSchema,reservedGround} from '../src/scene/streets';
import {buildStreetSteps} from '../src/game/streets';
import {buildEnvironmentSteps} from '../src/game/environment';
import {finishBuild} from '../src/game/batching';
import {disposeChunk} from '../src/game/chunk-packet';
import {geometryMemory} from '../src/game/geometry-memory';
import {repairNavigation,repairTargets} from '../src/sim/repair';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {sceneContactData} from '../src/scene/contacts';
const identity={sceneId:'natural-test',revisionId:'r1',sourceHash:'natural'},scene=compileDreamScene(source,identity),painted=compileDreamScene(source.replace('finish=terrain','color=#b2aa96'),identity);
it('keeps old painted sources and validates explicit natural areas with useful diagnostics',()=>{
 expect(scene.surfaces[0]!.finish).toBe('terrain');expect(scene.surfaces[0]!.color).toBeUndefined();expect(painted.surfaces[0]!.color).toBe('#b2aa96');expect(formatDream(formatDream(source))).toBe(formatDream(source));
 for(const [text,message] of [[source.replace('finish=terrain','finish=terrain,color=#b2aa96'),'omit color'],[source.replace('finish=terrain','finish=paint'),'requires color'],[source.replace(',finish=terrain',''),'requires color']] as const){const result=checkDream(text);expect(result.ok).toBe(false);if(!result.ok)expect(result.diagnostics[0]!.message).toContain(message);}
 expect(checkDream(source.replace('finish=terrain','finish=grass')).ok).toBe(false);expect(checkDream(source.replace('finish=terrain','color=#b2aa96,finish=paint')).ok).toBe(true);
 const roadOverlap=checkDream(source+'\nsurface obstructed(points=[[530,820],[820,820],[820,880],[530,880]],finish=terrain);');expect(roadOverlap.ok).toBe(false);if(!roadOverlap.ok)expect(roadOverlap.diagnostics.map(d=>d.message).join(' ')).toContain('overlaps a street');
 expect(surfaceSchema.safeParse({...scene.surfaces[0],points:[{x:0,y:0},{x:3000,y:0},{x:0,y:3000}]}).success).toBe(false);
});
it('changes only the surface finish and cosmetic ground reservation, retaining contacts and both navigation graphs',()=>{
 expect(scene.objects).toEqual(painted.objects);expect(sceneContactData(scene)).toEqual(sceneContactData(painted));expect(ambientGraph(scene)).toEqual(ambientGraph(painted));expect(repairNavigation(scene)).toEqual(repairNavigation(painted));
 expect(scene.economy!.repairs.map(r=>repairTargets(scene,r).map(t=>t.objectId))).toEqual(painted.economy!.repairs.map(r=>repairTargets(painted,r).map(t=>t.objectId)));
 expect(reservedGround(scene,700,780)).toBe(false);expect(reservedGround(painted,700,780)).toBe(true);expect(reservedGround(scene,500,850)).toBe(true);
});
it('emits no natural-area mesh in resident or streamed infrastructure while retaining all street geometry',()=>{
 const accent='\nsurface accent(color=#aa9988,points=[[650,690],[680,690],[680,710],[650,710]]);',naturalScene=compileDreamScene(source+accent,identity),paintedScene=compileDreamScene(source.replace('finish=terrain','color=#b2aa96')+accent,identity);
 for(const region of [undefined,{x0:0,y0:0,x1:800,y1:800}]){
  const natural=finishBuild(buildStreetSteps(naturalScene,region)),paint=finishBuild(buildStreetSteps(paintedScene,region));
  expect(natural.getObjectByName('ground-work_yard')).toBeUndefined();expect(paint.getObjectByName('ground-work_yard')).toBeDefined();
  const overlay=(root:THREE.Group)=>{const positions:number[]=[];root.getObjectByName('ground-accent')!.traverse(n=>{if(n instanceof THREE.Mesh)positions.push(...n.geometry.getAttribute('position').array);});return positions;};expect(overlay(natural)).toEqual(overlay(paint));
  const counts=(root:THREE.Group)=>{const result:Record<string,number>={};for(const child of root.children)if(!child.name.startsWith('ground-'))child.traverse(n=>{if(n instanceof THREE.Mesh)result[child.name]=(result[child.name]??0)+n.geometry.getAttribute('position').count;});return result;};expect(counts(natural)).toEqual(counts(paint));expect(geometryMemory(natural).bytes).toBeLessThan(geometryMemory(paint).bytes);disposeChunk(natural);disposeChunk(paint);
 }
});

it('retains actual instanced ground plants within a natural work area while painted grounds stay clear',()=>{
 const region={x0:530,y0:680,x1:820,y1:796},natural=finishBuild(buildEnvironmentSteps(scene,region)),paint=finishBuild(buildEnvironmentSteps(painted,region));
 const count=(root:THREE.Group)=>{let n=0;root.traverse(o=>{if(o instanceof THREE.InstancedMesh)n+=o.count;});return n;};expect(count(natural)).toBeGreaterThan(0);expect(count(paint)).toBe(0);disposeChunk(natural);disposeChunk(paint);
});
