import characters from "../src/scene/world/city_people.dream?raw";
import {describe,it,expect} from 'vitest';
import {Box3,Euler,Matrix4,Mesh,Quaternion,Raycaster,Vector3} from 'three';
import {compileDreamWorld,compileDream} from '../src/scene/dream';
import {assemblyBounds,measuredScale} from '../src/scene/measure';
import {buildObject,animateObject} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import type {ObjectDslV2} from '../src/scene/object-dsl';
import baseline from './fixtures/construction-bodies.json';
import architecture from '../src/scene/world/architecture.dream?raw';
import transit from '../src/scene/world/transit_assets.dream?raw';
import interactive from '../src/scene/interactive-world.dream?raw';
import houseExample from '../docs/examples/terraced-house.dream?raw';
import busExample from '../docs/examples/city-bus.dream?raw';
import launchExample from '../docs/examples/cabin-launch.dream?raw';
const assets=[architecture,transit,interactive].flatMap(s=>compileDreamWorld(s,{city_people:characters}).assemblies);
const asset=(name:string)=>assets.find(s=>s.displayName===name)!;
const item=(spec:ObjectDslV2)=>({id:'model',kind:'custom' as const,labelText:spec.displayName,x:0,y:0,scale:1,spec});
const pointTransform=(part:ObjectDslV2['parts'][number])=>new Matrix4().compose(new Vector3(...part.position),new Quaternion().setFromEuler(new Euler(...(part.rotation??[0,0,0]))),new Vector3(...part.size));

describe('constructed architecture and transport',()=>{
 it('preserves the accepted physical bodies, contacts, measured scales and floor levels for all fifteen rebuilt assets',()=>{
  expect(Object.keys(baseline.assets)).toHaveLength(15);
  for(const [name,old] of Object.entries(baseline.assets)){
   const spec=asset(name);expect(spec.body,name).toEqual(old.body);expect(spec.contacts??[],name).toEqual(old.contacts);expect(spec.measure,name).toEqual(old.measure);
   expect(measuredScale(spec),name).toBeCloseTo(old.scale,7);expect(assemblyBounds(spec).min.y,name).toBeCloseTo(old.floor,5);expect(spec.parts.length).toBeLessThanOrEqual(32);
  }
 });
 it('exposes glass through the carved joinery instead of burying it in the walls or covering it with a frame',()=>{
  let windows=0;
  for(const spec of compileDreamWorld(architecture).assemblies){
   const group=buildObject(item(spec));group.updateMatrixWorld(true);
   for(const part of spec.parts.filter(p=>p.voxels?.grid[0]===16 && p.material.colorA==='#e5decd')){
    const volume=part.voxels!,matrix=pointTransform(part),normal=new Vector3(0,0,1).transformDirection(matrix);
    for(const aperture of volume.operations.filter(op=>op.mode==='cut')){
     const point=new Vector3((aperture.from[0]+.25*(aperture.to[0]-aperture.from[0]))/volume.grid[0]-.5,(aperture.from[1]+.25*(aperture.to[1]-aperture.from[1]))/volume.grid[1]-.5,.5).applyMatrix4(matrix);
     const ray=new Raycaster(point.clone().addScaledVector(normal,.3),normal.clone().negate(),0,1),hits=ray.intersectObject(group,true);
     expect(hits.length,spec.displayName).toBeGreaterThan(0);
     expect(spec.parts.find(p=>p.id===hits[0]!.object.name)!.material.colorA,spec.displayName).toBe('#6c929d');windows++;
    }
   }
  }
  expect(windows).toBeGreaterThan(100);
 });
 it('keeps residential window heights human-sized and gives the office six usable floor bands',()=>{
  for(const spec of compileDreamWorld(architecture).assemblies){
   const glazing=spec.parts.filter(p=>p.material.colorA==='#6c929d');
   for(const window of glazing){const height=(window.voxels ? window.size[1]*4/window.voxels.grid[1] : window.size[1])*measuredScale(spec)/10;expect(height,spec.displayName).toBeGreaterThan(1.2);expect(height,spec.displayName).toBeLessThan(2.5);}
  }
  const office=asset('Office studios'),levels=[...new Set(office.parts.filter(p=>p.material.colorA==='#6c929d').map(p=>p.position[1]))].sort((a,b)=>a-b);
  expect(levels).toHaveLength(6);for(let i=1;i<levels.length;i++)expect((levels[i]!-levels[i-1]!)*measuredScale(office)/10).toBeCloseTo(3.93333,4);
 });
 it('keeps chimney tops visibly above the roof at their actual position',()=>{
  let chimneys=0;
  for(const spec of compileDreamWorld(architecture).assemblies){
   const wall=spec.parts[0]!,wallTop=wall.position[1]+wall.size[1]/2;
   const chimney=spec.parts.find(p=>p.material.shaderStyle==='brick' && p.size[0]<=3 && p.size[2]<=3 && p.position[1]>wallTop);if(!chimney)continue;chimneys++;
   const group=buildObject(item(spec));group.updateMatrixWorld(true);
   const roof=group.getObjectByName(spec.parts[1]!.id)!,top=new Box3().setFromObject(group.getObjectByName(chimney.id)!,true).max.y;
   const hit=new Raycaster(new Vector3(chimney.position[0],128,chimney.position[2]),new Vector3(0,-1,0)).intersectObject(roof)[0]!;
   expect(hit,spec.displayName).toBeDefined();expect(top-hit.point.y,spec.displayName).toBeGreaterThan(.5);
  }
  expect(chimneys).toBe(6);
 });
 it.each(['City tram','Regional electric train'])('%s places its axles in two supported bogies',name=>{
  const spec=asset(name),wheels=spec.parts.filter(p=>p.animation?.kind==='roll'),xs=[...new Set(wheels.map(p=>p.position[0]))].sort((a,b)=>a-b);
  expect(xs).toHaveLength(4);expect(xs[1]!-xs[0]!).toBe(10);expect(xs[3]!-xs[2]!).toBe(10);expect(xs[2]!-xs[1]!).toBeGreaterThan(30);
  expect(wheels).toHaveLength(16);
  const group=buildObject(item(spec));group.updateMatrixWorld(true);const shell=group.getObjectByName(spec.parts[0]!.id)!;
  for(const x of [(xs[0]!+xs[1]!)/2,(xs[2]!+xs[3]!)/2]){
   const support=spec.parts.find(p=>p.shape==='box' && p.size[0]===14 && p.position[0]===x)!;
   const contact=new Raycaster(new Vector3(x,0,0),new Vector3(0,1,0)).intersectObject(shell)[0]!;
   expect(contact).toBeDefined();expect(support.position[1]+support.size[1]/2).toBeGreaterThanOrEqual(contact.point.y);
  }
 });
 it('separates opaque hub end faces from the tire faces through wheel rotation',()=>{
  for(const name of ['City bus','City tram','Regional electric train']){
   const spec=asset(name),hubs=spec.parts.filter(p=>p.animation?.kind==='roll' && p.material.colorA==='#e5decd');
   expect(hubs.length,name).toBeGreaterThanOrEqual(4);
   for(const hub of hubs){
    const tire=spec.parts.find(p=>p.animation?.kind==='roll' && p.material.colorA==='#35464c' && p.position.every((n,i)=>n===hub.position[i]))!;
    expect(tire,name).toBeDefined();expect(hub.rotation,name).toEqual(tire.rotation);
    expect((hub.size[1]-tire.size[1])/2,name).toBeGreaterThan(.1);
   }
  }
 });
 it('keeps independently sized transit passengers below their cabin roofs',()=>{
  const traveler=asset('Traveler'),person=assemblyBounds(traveler);
  for(const name of ['City bus','City tram','Regional electric train']){
   const spec=asset(name),ratio=measuredScale(traveler)/measuredScale(spec),roof=spec.parts[1]!;
   expect(spec.rideable!.seat[1]+person.max.y*ratio,name).toBeLessThan(roof.position[1]-roof.size[1]/2-.5);
  }
 });
 it('fits the seated driver above the launch deck and below the wheelhouse roof',()=>{
  const boat=asset('Willow launch'),traveler=asset('Traveler'),seat=boat.rideable!.seat,ratio=measuredScale(traveler)/measuredScale(boat),person=assemblyBounds(traveler);
  const deck=boat.parts.find(p=>p.shape==='prism' && p.material.shaderStyle==='wood')!,deckBox=new Box3().setFromObject(buildObject(item({...boat,parts:[deck]})),true);
  const roof=boat.parts.find(p=>p.position[1]===34)!,roofBox=new Box3().setFromObject(buildObject(item({...boat,parts:[roof]})),true);
  expect(seat[1]+person.min.y*ratio).toBeGreaterThanOrEqual(deckBox.max.y-.1);
  expect(seat[1]+person.min.y*ratio).toBeLessThan(deckBox.max.y+.25);
  expect(seat[1]+person.max.y*ratio).toBeLessThan(roofBox.min.y-.5);
  expect(boat.parts.some(p=>p.shape==='sphere')).toBe(false);
  expect(boat.parts.filter(p=>p.voxels)).toHaveLength(2);
 });
 it('retains the same rendered bounds when rigid parts are compacted and wheels animate',()=>{
  for(const name of ['City bus','City tram','Regional electric train','Willow launch']){
   const spec=asset(name),raw=buildObject(item(spec)),batch=compactObject(buildObject(item(spec)));
   for(const distance of [0,12,38]){
    for(const group of [raw,batch]){animateObject(group,1,true,distance);group.rotation.set(.1,.5,-.1);}
    const a=new Box3().setFromObject(raw,true),b=new Box3().setFromObject(batch,true);expect(a.min.distanceTo(b.min),name).toBeLessThan(.0001);expect(a.max.distanceTo(b.max),name).toBeLessThan(.0001);
   }
   let meshes=0;batch.traverse(node=>{if(node instanceof Mesh)meshes++;});expect(meshes,name).toBeLessThanOrEqual(9);
  }
 });
 it('publishes examples identical to the live assemblies',()=>{
  for(const [source,name] of [[houseExample,'Brick terrace'],[busExample,'City bus'],[launchExample,'Willow launch']])expect(compileDream(source!)).toEqual([asset(name!)]);
 });
});
