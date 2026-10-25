import {afterEach,it,expect} from 'vitest';
import backup from './fixtures/upstairs-social-r109-save-v19.json';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientGraph,ambientNavigation} from '../src/scene/ambient-navigation';
import {ambientObjects} from '../src/sim/ambient';
import {sceneContactData} from '../src/scene/contacts';
import {isParkedVehicle,controlFor} from '../src/scene/agents';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,carFootprintClear,type CarState,type World} from '../src/sim/car';
import {toggleRide,stepInteractive,bodyWorld} from '../src/sim/interaction';
import {vehicleReviewStart} from '../src/game/review-start';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {actorPose} from '../src/sim/actors';
import {sceneInteriors} from '../src/scene/interiors';
import {objectPlacement} from '../src/scene/placement';
import {onPolygon} from '../src/scene/streets';
import {distanceToRoad} from '../src/scene/road';
import {assemblyHorizontalRadius} from '../src/scene/measure';
import {COMMERCE_LIMITS} from '../src/scene/commerce';
import type {ObjectDslV2} from '../src/scene/object-dsl';
import {aircraftFloor} from '../src/scene/aircraft-support';

const scene=createWorldScene(),previous=c.preDistrictScene(scene),snapshot=JSON.stringify(scene);
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.DISTRICT_COMPATIBILITY,previousDistrictSaveCompatibility:c.UPSTAIRS_SOCIAL_COMPATIBILITY,previousDistrictContacts:sceneContactData(previous),previousDistrictNavigation:ambientGraph(previous),previousUpstairsSocialSaveCompatibility:c.SEATED_REST_COMPATIBILITY,previousSeatedRestSaveCompatibility:c.COMPANY_COMPATIBILITY};
const oldWorld:World={...world,scene:previous,saveCompatibility:c.UPSTAIRS_SOCIAL_COMPATIBILITY,previousDistrictSaveCompatibility:undefined,previousDistrictContacts:undefined,previousDistrictNavigation:undefined};
const added=(id:string)=>id.startsWith('station_quarter_'),fleet=scene.objects.filter(o=>added(o.id)&&isParkedVehicle(o));
afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));

it('projects the exact released r110 city and retains old objects, resources, contacts and legacy fingerprints',async()=>{
 expect(c.SAVE_SIMULATION_VERSION).toBe(53);expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.DISTRICT_COMPATIBILITY);
 expect(await c.sha256(c.preDistrictCompatibilitySource(scene))).toBe(c.UPSTAIRS_SOCIAL_COMPATIBILITY);expect(await c.sha256(c.preUpstairsSocialCompatibilitySource(scene))).toBe(c.SEATED_REST_COMPATIBILITY);
 expect(previous.objects).toHaveLength(1785);expect(previous.sites).toHaveLength(219);expect(previous.surfaces).toHaveLength(54);
 expect(previous.objects).toEqual(scene.objects.filter(o=>!added(o.id)));expect(previous.floors).toEqual(scene.floors!.filter(f=>!added(f.id)));expect(previous.economy).toEqual(scene.economy);
 expect(sceneContactData(scene).contacts.filter(contact=>!contact.id||!added(contact.id))).toEqual(sceneContactData(previous).contacts);
 expect(fleet).toHaveLength(4);expect(fleet.map(controlFor)).toEqual(['car','car','car','car']);
});

it('migrates the real native backup without changing money, inventory, physical history, clocks or old storage',()=>{
 const text=JSON.stringify(backup),before=decodeSave(text,oldWorld),loaded=decodeSave(text,world);
 const {population:oldPopulation,...oldState}=before.state,{population:newPopulation,...newState}=loaded.state;expect(newState).toEqual(oldState);expect(loaded.worldTime).toBe(before.worldTime);expect(loaded.migrated).toBe(true);
 const oldMembers=new Map(ambientObjects(previous).map((o,i)=>[o.id,oldPopulation!.members[i]!]));
 ambientObjects(scene).forEach((object,i)=>{const old=oldMembers.get(object.id),member=newPopulation!.members[i]!;if(!old){expect(member.until).toBe(before.state.timeS);return;}const {node,previous:previousNode,...oldMotion}=old,{node:newNode,previous:newPrevious,...newMotion}=member;expect(newMotion,object.id).toEqual(oldMotion);if(object.ambient!.motion.kind==='walk'){const nav=ambientNavigation(scene);expect(nav.nodes[newNode]!.links.length,object.id).toBeGreaterThan(0);expect(nav.segment(member,nav.nodes[newNode]!,nav.radius(object),true),object.id).toBe(true);}if(previousNode>=0 && newPrevious>=0)expect(ambientGraph(scene).nodes[newPrevious]).toMatchObject({x:ambientGraph(previous).nodes[previousNode]!.x,y:ambientGraph(previous).nodes[previousNode]!.y});});
 expect(newPopulation!.tick).toBe(oldPopulation!.tick);expect(newPopulation!.members).toHaveLength(ambientObjects(scene).length);
 const oldText=encodeSave(before.state,before.worldTime,oldWorld),key=`muse-dream.save.v19.${scene.sceneId}.${c.UPSTAIRS_SOCIAL_COMPATIBILITY}`,rows=new Map([[key,oldText]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));
 expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,loaded.worldTime)).toBe(true);expect(rows.get(key)).toBe(oldText);expect(rows.size).toBe(2);
 expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);expect(()=>decodeSave(oldText,{...world,previousDistrictSaveCompatibility:undefined})).toThrow('different world');
});

it('lets only a new parked seed yield to an old moved bicycle, preserving that pose and all other progress',()=>{
 const vehicle=fleet[0]!,bike=previous.objects.find(o=>isParkedVehicle(o)&&controlFor(o)==='bicycle')!;
 const before={...createCarAtSpawn(previous),vehicles:[{id:bike.id,x:vehicle.x,y:vehicle.y,elevation:0,headingRad:0,distance:23}]},text=encodeSave(before,18,oldWorld),after=decodeSave(text,world).state;
 expect(after.vehicles.find(v=>v.id===bike.id)).toEqual(before.vehicles[0]);expect(after.economy).toEqual(before.economy);expect(after.timeS).toBe(before.timeS);
 const shifted=after.vehicles.find(v=>v.id===vehicle.id)!;expect(shifted).toBeDefined();expect(Math.hypot(shifted.x-vehicle.x,shifted.y-vehicle.y)).toBeLessThanOrEqual(320);
 const occupied:CarState={...after,...after.vehicles[0]!,control:{kind:'vehicle',id:bike.id},vehicles:after.vehicles.filter(v=>v.id!==bike.id)};
 expect(carFootprintClear(bodyWorld(occupied,world),occupied.x,occupied.y,occupied.elevation,occupied.timeS,occupied)).toBe(true);
 expect(decodeSave(encodeSave(after,18,world),world).state.vehicles).toEqual(after.vehicles);
});

it('boards, drives, exits and restores all four new vehicles using ordinary controls and retains local changes on reload',()=>{
 const start=createCarAtSpawn(scene);
 for(const object of fleet){let state=toggleRide(vehicleReviewStart(start,world,object.id),world);expect(state.control,object.id).toEqual({kind:'vehicle',id:object.id});
  for(let i=0;i<120;i++)state=stepInteractive(state,{steer:0,throttle:1},1/120,world);
  expect(Math.hypot(state.x-object.x,state.y-object.y),object.id).toBeGreaterThan(20);const foot=toggleRide(state,world);expect(foot.control.kind,object.id).toBe('foot');expect(foot.vehicles.find(v=>v.id===object.id)).toMatchObject({x:state.x,y:state.y,distance:state.distance});
  expect(carFootprintClear(bodyWorld(foot,world),foot.x,foot.y,foot.elevation,foot.timeS,foot)).toBe(true);expect(decodeSave(encodeSave(foot,foot.timeS,world),world).state).toEqual(foot);
 }
});

it.each(['dormant bicycle','dormant car','original car','resident car'])('recovers an old parked %s obstructed by new construction without losing its ownership or travel history',profile=>{
 const vehicle=profile==='original car' ? undefined : previous.objects.find(o=>controlFor(o)===(profile==='dormant bicycle' ? 'bicycle' : 'car') && isParkedVehicle(o)===profile.startsWith('dormant'))!;
 const pose={id:vehicle?.id??null,x:11700,y:4700,elevation:0,headingRad:.37,distance:123.5},untouchedObject=previous.objects.find(o=>isParkedVehicle(o)&&o.id!==vehicle?.id)!,seed=actorPose(previous,untouchedObject,0);
 const untouched={id:untouchedObject.id,x:seed.x,y:seed.y,elevation:seed.elevation,headingRad:seed.headingRad,distance:77};
 const footStart=toggleRide(createCarAtSpawn(previous),oldWorld),before={...footStart,vehicles:[...footStart.vehicles.filter(v=>v.id!==pose.id),untouched,pose]},control:CarState['control']=pose.id===null ? {kind:'car'} : {kind:'vehicle',id:pose.id};
 const oldOccupied:CarState={...before,...pose,control,vehicles:before.vehicles.filter(v=>v.id!==pose.id)};
 expect(carFootprintClear(bodyWorld(oldOccupied,oldWorld),pose.x,pose.y,pose.elevation,0,oldOccupied)).toBe(true);
 const text=encodeSave(before,17,oldWorld),after=decodeSave(text,world).state,recovered=after.vehicles.find(v=>v.id===pose.id)!;
 expect(recovered).toMatchObject({id:pose.id,headingRad:pose.headingRad,distance:pose.distance});expect(Math.hypot(recovered.x-pose.x,recovered.y-pose.y)).toBeLessThanOrEqual(320);
 expect(after.vehicles.map(v=>v.id)).toEqual(before.vehicles.map(v=>v.id));expect(after.vehicles.filter(v=>v.id!==pose.id)).toEqual(before.vehicles.filter(v=>v.id!==pose.id));
 expect(after.economy).toEqual(before.economy);expect(after.timeS).toBe(before.timeS);expect(after.npcs).toEqual(before.npcs);expect(after.broken).toEqual(before.broken);
 const occupied:CarState={...after,...recovered,control,vehicles:after.vehicles.filter(v=>v.id!==pose.id)};
 expect(carFootprintClear(bodyWorld(occupied,world),occupied.x,occupied.y,occupied.elevation,occupied.timeS,occupied)).toBe(true);
 expect(sceneInteriors(scene).filter(f=>added(f.object.id)).every(f=>!onPolygon(f.polygon,recovered.x,recovered.y,bodyWorld(occupied,world).carRadius))).toBe(true);
 const foot=toggleRide(occupied,world);expect(foot.control.kind).toBe('foot');let driven=toggleRide(foot,world);expect(driven.control).toEqual(control);
 for(let i=0;i<120;i++)driven=stepInteractive(driven,{steer:0,throttle:1},1/120,world);
 expect(Math.hypot(driven.x-recovered.x,driven.y-recovered.y)).toBeGreaterThan(10);expect(decodeSave(encodeSave(after,17,world),world).state.vehicles).toEqual(after.vehicles);
});

it('retains an otherwise clear old parked body beside a real saved courier corridor',()=>{
 const state=decodeSave(JSON.stringify(backup),oldWorld).state,workerAccount=state.economy!.accounts.find(a=>a.id==='caretaker')!,path=workerAccount.courier!.path;
 const worker=previous.objects.find(o=>o.id===previous.economy!.accounts.find(a=>a.id===workerAccount.id)!.actor)!,vehicle=previous.objects.find(o=>isParkedVehicle(o)&&controlFor(o)==='bicycle')!;
 const control:CarState['control']={kind:'vehicle',id:vehicle.id},empty={...state,control,vehicles:state.vehicles.filter(v=>v.id!==vehicle.id)},radius=bodyWorld(empty,oldWorld).carRadius,offset=radius+COMMERCE_LIMITS.repairRadius+.25;
 const segments=path.slice(1).map((b,i)=>({a:path[i]!,b,d:Math.hypot(b.x-path[i]!.x,b.y-path[i]!.y)})).filter(p=>p.d>40).sort((a,b)=>b.d-a.d);
 const candidate=segments.flatMap(({a,b,d})=>[-1,1].map(side=>{const x=(a.x+b.x)/2-(b.y-a.y)/d*offset*side,y=(a.y+b.y)/2+(b.x-a.x)/d*offset*side;return {id:vehicle.id,x,y,elevation:objectPlacement(previous,vehicle,x,y).base,headingRad:.45,distance:91};})).find(p=>carFootprintClear(bodyWorld(empty,oldWorld),p.x,p.y,p.elevation,state.timeS,{...empty,...p})&&carFootprintClear(bodyWorld(empty,world),p.x,p.y,p.elevation,state.timeS,{...empty,...p}));
 expect(candidate).toBeDefined();const pose=candidate!,before={...state,vehicles:[...state.vehicles.filter(v=>v.id!==vehicle.id),pose]};
 expect(distanceToRoad(path,pose.x,pose.y)).toBeLessThan(radius+assemblyHorizontalRadius(worker.spec as ObjectDslV2,worker.scale)+2);
 const restored=decodeSave(encodeSave(before,state.timeS,oldWorld),world).state;expect(restored.vehicles).toEqual(before.vehicles);expect(restored.economy).toEqual(before.economy);expect(restored.timeS).toBe(before.timeS);
});

it.each(['original','dormant','resident'])('recovers an occupied %s ground car outside new construction instead of lifting it into a lobby',profile=>{
 const vehicle=profile==='original' ? undefined : previous.objects.find(o=>controlFor(o)==='car' && isParkedVehicle(o)===(profile==='dormant'))!,start=createCarAtSpawn(previous);
 const control:CarState['control']=vehicle ? {kind:'vehicle',id:vehicle.id} : {kind:'car'},before={...start,x:11700,y:4700,elevation:0,headingRad:.37,distance:123.5,control,vehicles:vehicle ? [{id:null,x:start.x,y:start.y,elevation:start.elevation,headingRad:start.headingRad,distance:start.distance}] : []};
 expect(carFootprintClear(bodyWorld(before,oldWorld),before.x,before.y,before.elevation,before.timeS,before)).toBe(true);
 const after=decodeSave(encodeSave(before,17,oldWorld),world).state;
 expect(after.control).toEqual(before.control);expect(after.headingRad).toBe(before.headingRad);expect(after.distance).toBe(before.distance);expect(after.vehicles).toEqual(before.vehicles);expect(after.economy).toEqual(before.economy);expect(after.timeS).toBe(before.timeS);
 expect(Math.hypot(after.x-before.x,after.y-before.y)).toBeLessThanOrEqual(320);expect(sceneInteriors(scene).filter(f=>added(f.object.id)).every(f=>!onPolygon(f.polygon,after.x,after.y,bodyWorld(after,world).carRadius))).toBe(true);
 expect(carFootprintClear(bodyWorld(after,world),after.x,after.y,after.elevation,after.timeS,after)).toBe(true);
 let driven=after;for(let i=0;i<120;i++)driven=stepInteractive(driven,{steer:0,throttle:1},1/120,world);expect(Math.hypot(driven.x-after.x,driven.y-after.y)).toBeGreaterThan(10);
 expect(decodeSave(encodeSave(after,17,world),world).state).toEqual(after);
});

it.each(['original','dormant','resident'])('preserves every field of a clear occupied %s ground car apart from the new population graph',profile=>{
 const vehicle=profile==='original' ? undefined : previous.objects.find(o=>controlFor(o)==='car' && isParkedVehicle(o)===(profile==='dormant'))!,start=createCarAtSpawn(previous),seed=vehicle ? actorPose(previous,vehicle,0) : start;
 const control:CarState['control']=vehicle ? {kind:'vehicle',id:vehicle.id} : {kind:'car'},before={...start,x:seed.x,y:seed.y,elevation:seed.elevation,headingRad:.2,distance:42,vx:12,vy:3,control,vehicles:vehicle ? [{id:null,x:start.x,y:start.y,elevation:start.elevation,headingRad:start.headingRad,distance:start.distance}] : []};
 expect(carFootprintClear(bodyWorld(before,world),before.x,before.y,before.elevation,before.timeS,before)).toBe(true);
 const after=decodeSave(encodeSave(before,17,oldWorld),world).state,{population:oldPopulation,...oldState}=before,{population:newPopulation,...newState}=after;expect(newState).toEqual(oldState);expect(newPopulation!.tick).toBe(oldPopulation!.tick);
});

it.each(['occupied','parked'])('recovers a grounded %s plane with its existing aircraft support and history',mode=>{
 const plane=previous.objects.find(o=>controlFor(o)==='plane')!,start=createCarAtSpawn(previous),pose={id:plane.id,x:11700,y:4700,elevation:aircraftFloor(previous,plane,{x:11700,y:4700,headingRad:.37,pitch:0,bank:0}),headingRad:.37,distance:123.5};
 const original={id:null,x:start.x,y:start.y,elevation:start.elevation,headingRad:start.headingRad,distance:start.distance},control:CarState['control']={kind:'vehicle',id:plane.id};
 const before:CarState=mode==='occupied' ? {...start,x:pose.x,y:pose.y,elevation:pose.elevation,headingRad:pose.headingRad,distance:pose.distance,control,vehicles:[original]} : {...toggleRide(start,oldWorld),vehicles:[original,pose]};
 const oldOccupied:CarState={...before,x:pose.x,y:pose.y,elevation:pose.elevation,headingRad:pose.headingRad,distance:pose.distance,control,vehicles:[original]};expect(carFootprintClear(bodyWorld(oldOccupied,oldWorld),pose.x,pose.y,pose.elevation,0,oldOccupied)).toBe(true);
 const after=decodeSave(encodeSave(before,17,oldWorld),world).state,recovered=mode==='occupied' ? after : after.vehicles.find(v=>v.id===plane.id)!;
 expect(recovered.headingRad).toBe(pose.headingRad);expect(recovered.distance).toBe(pose.distance);expect(after.economy).toEqual(before.economy);expect(after.timeS).toBe(before.timeS);
 expect(Math.hypot(recovered.x-pose.x,recovered.y-pose.y)).toBeLessThanOrEqual(320);expect(recovered.elevation).toBeCloseTo(aircraftFloor(scene,plane,{...recovered,pitch:0,bank:0}));
 const occupied:CarState={...after,x:recovered.x,y:recovered.y,elevation:recovered.elevation,headingRad:recovered.headingRad,distance:recovered.distance,control,vehicles:after.vehicles.filter(v=>v.id!==plane.id)};
 expect(sceneInteriors(scene).filter(f=>added(f.object.id)).every(f=>!onPolygon(f.polygon,recovered.x,recovered.y,bodyWorld(occupied,world).carRadius))).toBe(true);expect(carFootprintClear(bodyWorld(occupied,world),occupied.x,occupied.y,occupied.elevation,occupied.timeS,occupied)).toBe(true);
 const foot=toggleRide(occupied,world);expect(foot.control.kind).toBe('foot');expect(toggleRide(foot,world).control).toEqual(control);expect(decodeSave(encodeSave(after,17,world),world).state).toEqual(after);
});

it.each(['blocked','clear'])('keeps airborne plane recovery out of new interiors when the saved body is %s',mode=>{
 const plane=previous.objects.find(o=>controlFor(o)==='plane')!,start=createCarAtSpawn(previous),control:CarState['control']={kind:'vehicle',id:plane.id};
 const before={...start,x:mode==='blocked' ? 11700 : plane.x,y:mode==='blocked' ? 4700 : plane.y,elevation:mode==='blocked' ? 1 : 100,headingRad:.37,distance:123.5,pitch:.1,bank:.2,grounded:false,vz:8,control,vehicles:[{id:null,x:start.x,y:start.y,elevation:start.elevation,headingRad:start.headingRad,distance:start.distance}]};
 expect(carFootprintClear(bodyWorld(before,oldWorld),before.x,before.y,before.elevation,before.timeS,before)).toBe(true);const after=decodeSave(encodeSave(before,17,oldWorld),world).state;
 expect(after.economy).toEqual(before.economy);expect(after.timeS).toBe(before.timeS);
 if(mode==='blocked'){expect(after.control.kind).toBe('car');expect(carFootprintClear(bodyWorld(after,world),after.x,after.y,after.elevation,after.timeS,after)).toBe(true);expect(sceneInteriors(scene).some(f=>added(f.object.id)&&f.contains(after.x,after.y))).toBe(false);}
 else{const {population:oldPopulation,...oldState}=before,{population:newPopulation,...newState}=after;expect(newState).toEqual(oldState);expect(newPopulation!.tick).toBe(oldPopulation!.tick);}
});
