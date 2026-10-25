import {afterAll,it,expect} from 'vitest';
import {Box3,Mesh,Raycaster,Vector3} from 'three';
import source from '../src/scene/world/tower_assets.dream?raw';
import example from '../docs/examples/station-towers.dream?raw';
import {compileDream,formatDream} from '../src/scene/dream';
import {assemblyBounds,measuredScale} from '../src/scene/measure';
import {buildObject} from '../src/game/world3d';
import {sceneInteriors,portalPoints,interiorProblems,occupiedInterior,walkingHeight} from '../src/scene/interiors';
import {objectContacts} from '../src/scene/contacts';
import {contactOverlaps} from '../src/scene/contact-geometry';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {parseScene} from '../src/scene/schema';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,carFootprintClear,type CarState} from '../src/sim/car';
import {stepInteractive,bodyWorld,FOOT_HEIGHT} from '../src/sim/interaction';

const specs=compileDream(source),models=specs.map(spec=>{
 const group=buildObject({id:'tower',kind:'custom',labelText:spec.displayName,x:0,y:0,scale:1,spec:{...spec,voxelSize:1}});group.updateMatrixWorld(true);
 return {spec,group,boxes:spec.parts.map(p=>new Box3().setFromObject(group.getObjectByName(p.id)!,true))};
});
afterAll(()=>models.forEach(({group})=>group.traverse(n=>{if(n instanceof Mesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();}})));

it('keeps the complete runnable library identical and its two high-rises at their authored physical sizes',()=>{
 expect(example).toBe(source);expect(compileDream(formatDream(source))).toEqual(specs);expect(specs).toHaveLength(2);
 for(const [index,spec] of specs.entries()){
  const bounds=assemblyBounds(spec),scale=measuredScale(spec),size=bounds.getSize(new Vector3()).multiplyScalar(scale);
  expect(spec.measure).toEqual({kind:'building',axis:'y',meters:index ? 75 : 55});
  expect(size.y).toBeCloseTo(index ? 750 : 550);expect(size.x).toBeGreaterThan(200);expect(size.x).toBeLessThan(280);
  expect(scale).toBeLessThanOrEqual(4);expect(spec.parts.length).toBeLessThanOrEqual(32);expect(spec.joints??[]).toHaveLength(0);
 }
});

it.each(models)('keeps every $spec.displayName roof and façade part attached after voxel construction',({spec,boxes})=>{
 const attached=new Set([0]);let added=true;
 while(added){added=false;for(let i=0;i<boxes.length;i++)if(!attached.has(i)&&[...attached].some(j=>boxes[i]!.clone().expandByScalar(.025).intersectsBox(boxes[j]!))){attached.add(i);added=true;}}
 expect(spec.parts.filter((_,i)=>!attached.has(i)).map(p=>p.id)).toEqual([]);
 expect(spec.parts.some(p=>p.material.nightColor)).toBe(true);
 for(const part of spec.parts)if(part.position[1]-part.size[1]/2>12.5)expect(part.cutaway).toBe('roof');
});

it.each(models)('matches the visible recessed roof and parapet contacts on $spec.displayName',({spec,group})=>{
 const object={id:'tower',kind:'custom' as const,labelText:spec.displayName,x:480,y:360,scale:measuredScale(spec),spec},scene=parseScene({...createFixtureScene(),objects:[object],regions:[],terrain:{hills:[]}}),contacts=objectContacts(scene,object);
 for(const x of [0,spec.measure!.meters===55 ? 24 : 25]){
  const visible=new Raycaster(new Vector3(x,220,0),new Vector3(0,-1,0)).intersectObject(group,true)[0]!.point.y;
  const physical=Math.max(...contacts.filter(c=>contactOverlaps(c,object.x+x*object.scale,object.y,.001)).map(c=>c.top))/object.scale;
  expect(physical).toBeCloseTo(visible,4);
 }
});

it.each(specs)('walks into the $displayName lobby through its actual doorway and preserves the supported floor',spec=>{
 const object={id:'tower',kind:'custom' as const,labelText:spec.displayName,x:480,y:360,scale:measuredScale(spec),spec};
 const scene=parseScene({...createFixtureScene(),objects:[object],regions:[],terrain:{hills:[]}}),world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
 expect(interiorProblems(scene)).toEqual([]);const room=sceneInteriors(scene)[0]!,door=portalPoints(room,room.room.portals[0]!);
 let state:CarState={...createCarAtSpawn(scene),control:{kind:'foot'},x:door.outside.x,y:door.outside.y,elevation:walkingHeight(scene,door.outside.x,door.outside.y),vx:0,vy:0,vehicles:[]};
 const angle=Math.atan2(180,480),input={steer:-Math.sin(angle),throttle:-Math.cos(angle)};
 for(let i=0;i<120;i++)state=stepInteractive(state,input,1/120,world);
 expect(state.y).toBeGreaterThan(door.inside.y);expect(occupiedInterior(scene,state.x,state.y,state.elevation)?.object.id).toBe('tower');expect(state.elevation).toBeCloseTo(room.floor);
 expect(carFootprintClear(bodyWorld(state,world),state.x,state.y,state.elevation,state.timeS,state)).toBe(true);
 expect(carFootprintClear(world,door.center.x,door.center.y,room.floor,0)).toBe(false);
 const wall=room.toWorld(room.room.size[0]/2+.5,0);expect(carFootprintClear(bodyWorld(state,world),wall.x,wall.y,room.floor,state.timeS,state)).toBe(false);
 const contacts=objectContacts(scene,object),ceilings=contacts.filter(c=>c.bottom>=room.ceiling-.01 && c.x===object.x&&c.y===object.y);
 expect(ceilings.some(c=>Math.abs(c.bottom-room.ceiling)<.01)).toBe(true);expect(Math.max(...contacts.map(c=>c.top))).toBeCloseTo(spec.measure!.meters*10);expect(Math.max(...ceilings.map(c=>c.top))).toBeCloseTo((spec.measure!.meters===55 ? 158 : 188)*object.scale);
 let jump={...state,elevation:room.ceiling-FOOT_HEIGHT-.1,vz:100,grounded:false};
 jump=stepInteractive(jump,{steer:0,throttle:0},1/120,world);expect(jump.elevation+FOOT_HEIGHT).toBeLessThanOrEqual(room.ceiling+.05);expect(jump.vz).toBeLessThanOrEqual(0);
 for(let i=0;i<120;i++)state=stepInteractive(state,{steer:-input.steer,throttle:-input.throttle},1/120,world);
 expect(state.y).toBeLessThan(door.center.y);for(let i=0;i<60;i++)state=stepInteractive(state,{steer:0,throttle:0},1/120,world);expect(state.elevation).toBeCloseTo(0);
});
