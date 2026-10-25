import {beforeAll,afterEach,it,expect} from 'vitest';
import {Vector3} from 'three';
import {createWorldScene} from '../src/scene/world-fixture';
import {assemblyBounds} from '../src/scene/measure';
import {walkingNetwork,onWalkway} from '../src/scene/sites';
import {ambientNavigation} from '../src/scene/ambient-navigation';
import {sceneInteriors,occupiedInterior,walkingHeight} from '../src/scene/interiors';
import {worldSeats,seatAccessClear} from '../src/scene/seating';
import {objectContacts} from '../src/scene/contacts';
import {impactOf,hasAnimatedJoints} from '../src/scene/object-dsl';
import {createCarAtSpawn,carFootprintClear,type CarState,type World} from '../src/sim/car';
import {stepInteractive,toggleRide,bodyWorld} from '../src/sim/interaction';
import {breakOnContact} from '../src/sim/impacts';
import {ambientObjects,initialAmbient,stepAmbient} from '../src/sim/ambient';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {movementReviewStart} from '../src/game/review-start';

let accepted:ReturnType<typeof createWorldScene>|undefined,snapshot:string|undefined,context:World|undefined;
function world(){
 if(!accepted){accepted=createWorldScene();snapshot=JSON.stringify(accepted);context={scene:accepted,roadMask:buildMaskForScene(accepted),driveMask:buildPaperMask(14000,11000),carRadius:11};}
 return context!;
}
beforeAll(()=>{world();},60000);
afterEach(()=>{if(accepted)expect(JSON.stringify(accepted)).toBe(snapshot);});
const idle={steer:0,throttle:0};
it('starts native lobby reviews outside the actual doorway with a clear foot body',()=>{
 const w=world(),initial=createCarAtSpawn(w.scene);
 for(const id of ['station_quarter_residences','station_quarter_offices']){
  const state=movementReviewStart(initial,w,'lobby:'+id);
  expect(state.control.kind).toBe('foot');expect(occupiedInterior(w.scene,state.x,state.y,state.elevation)).toBeUndefined();
  expect(carFootprintClear(bodyWorld(state,w),state.x,state.y,state.elevation,state.timeS,state)).toBe(true);
 }
 expect(movementReviewStart(initial,w,'lobby:missing')).toBe(initial);
});
function footAt(w:World,p:{x:number;y:number;elevation?:number}):CarState{
 const s=createCarAtSpawn(w.scene);
 return {...s,control:{kind:'foot'},x:p.x,y:p.y,elevation:p.elevation??walkingHeight(w.scene,p.x,p.y),vx:0,vy:0,vz:0,grounded:true,vehicles:[{id:null,x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,distance:0}]};
}
function walkTo(s:CarState,target:{x:number;y:number},w:World):CarState{
 const angle=Math.atan2(180,480);
 for(let n=0;n<2400;n++){
  const dx=target.x-s.x,dy=target.y-s.y,d=Math.hypot(dx,dy);
  if(d<1.5){for(let j=0;j<30;j++)s=stepInteractive(s,idle,1/120,w);return s;}
  s=stepInteractive(s,{steer:(dx*Math.cos(angle)-dy*Math.sin(angle))/d,throttle:(-dx*Math.sin(angle)-dy*Math.cos(angle))/d},1/120,w);
  expect(carFootprintClear(bodyWorld(s,w),s.x,s.y,s.elevation,s.timeS,s)).toBe(true);
 }
 throw Error(`Could not reach ${target.x},${target.y}; stopped at ${s.x},${s.y},${s.elevation}`);
}

it('accepts distinct measured towers with both entrances connected to the existing city sidewalk network',()=>{
 const {scene}=world(),network=walkingNetwork(scene),market=network.sites.get('access_market_hall')!;
 const expected=[['station_quarter_residences','station_quarter_home_access',55],['station_quarter_offices','station_quarter_office_access',75]] as const;
 const models=[];
 for(const [id,access,meters] of expected){
  const object=scene.objects.find(o=>o.id===id)!,site=scene.sites.find(s=>s.id===access)!;
  expect(object.spec).toMatchObject({dslVersion:2,measure:{kind:'building',axis:'y',meters}});
  if(!object.spec || !('dslVersion' in object.spec))throw Error('Expected composed tower');
  expect(assemblyBounds(object.spec).getSize(new Vector3()).y*object.scale).toBeCloseTo(meters*10);
  expect(site.objectId).toBe(id);expect(site.street).toBe('workshop_street');
  expect(network.roots[network.sites.get(access)!]).toBe(network.roots[market]);
  expect(sceneInteriors(scene).some(r=>r.object.id===id)).toBe(true);models.push(object.spec.parts);
 }
 expect(models[0]).not.toEqual(models[1]);
 const promenade=scene.surfaces.find(s=>s.id==='station_quarter_promenade')!;expect(promenade.walkable).toBe(true);
});

it('walks from each existing sidewalk through the real tower doorway, across its lobby and back outside',()=>{
 const w=world(),{scene}=w;
 for(const id of ['station_quarter_residences','station_quarter_offices']){
  const room=sceneInteriors(scene).find(r=>r.object.id===id)!,site=scene.sites.find(s=>s.objectId===id)!,start=site.points.at(-1)!;
  let s=footAt(w,start);expect(occupiedInterior(scene,s.x,s.y,s.elevation)?.object.id).not.toBe(id);
  s=walkTo(s,room.toWorld(0,-12),w);expect(occupiedInterior(scene,s.x,s.y,s.elevation)?.object.id).toBe(id);expect(s.elevation).toBeCloseTo(room.floor);
  s=walkTo(s,room.toWorld(8,8),w);expect(occupiedInterior(scene,s.x,s.y,s.elevation)?.object.id).toBe(id);expect(s.elevation).toBeCloseTo(room.floor);
  s=walkTo(s,room.toWorld(0,-12),w);s=walkTo(s,start,w);
  expect(occupiedInterior(scene,s.x,s.y,s.elevation)?.object.id).not.toBe(id);expect(s.grounded).toBe(true);
 }
});

it('uses the same F seating and break rule for all eight benches, including the named lobby and mezzanine floors',()=>{
 const w=world(),{scene}=w,seats=worldSeats(scene).filter(s=>s.objectId.startsWith('station_quarter_'));
 expect(new Set(seats.map(s=>s.objectId)).size).toBe(8);expect(seats).toHaveLength(16);
 const reference=impactOf(scene.objects.find(o=>o.id==='park_bench')!.spec);expect(reference).toMatchObject({kind:'break',pattern:'splinter',speed:95});
 for(const seat of seats){
  expect(seatAccessClear(scene,seat),seat.objectId).toBe(true);
  const s=footAt(w,seat.approach),seated=toggleRide(s,w);
  expect(seated.seated,seat.objectId).toEqual({objectId:seat.objectId,seatId:seat.seatId});expect(seated.elevation).toBeCloseTo(seat.elevation);
  const standing=toggleRide(seated,w);expect(standing.seated).toBeUndefined();expect(standing.elevation).toBeCloseTo(seat.elevation);
  expect(carFootprintClear(bodyWorld(standing,w),standing.x,standing.y,standing.elevation,standing.timeS,standing)).toBe(true);
  expect(toggleRide({...s,broken:[seat.objectId]},w).seated).toBeUndefined();
  expect(impactOf(scene.objects.find(o=>o.id===seat.objectId)!.spec)).toEqual(reference);
 }
 for(const id of ['station_quarter_home_seat','station_quarter_office_seat']){
  const object=scene.objects.find(o=>o.id===id)!;expect(object.floor).toBeDefined();
  expect(seats.find(s=>s.objectId===id)!.approach.elevation).toBeGreaterThan(0);
 }
 for(const object of scene.objects.filter(o=>o.id.startsWith('station_quarter_bench_'))){
  const contact=objectContacts(scene,object)[0]!,s={...createCarAtSpawn(scene),x:contact.x-20,y:contact.y,elevation:walkingHeight(scene,contact.x,contact.y),vx:110,vy:0};
  breakOnContact(s,w,contact.x,contact.y,[contact]);expect(s.broken,object.id).toContain(object.id);expect(s.impacts).toContainEqual(expect.objectContaining({id:object.id,kind:'break',pattern:'splinter'}));
 }
});

it('moves all eight visitors on accepted paths and waits for approaching vehicles without adding live rigs',()=>{
 const {scene}=world(),objects=ambientObjects(scene),indices=objects.flatMap((o,i)=>o.id.startsWith('station_quarter_walker_') ? [i] : []),nav=ambientNavigation(scene);
 expect(indices).toHaveLength(8);expect(indices.every(i=>objects[i]!.role==='ambient' && !hasAnimatedJoints(objects[i]!.spec))).toBe(true);
 const initial=initialAmbient(scene),moving=new Map<number,CarState>();let s=createCarAtSpawn(scene);
 for(let tick=0;tick<160;tick++){
  s={...s,population:stepAmbient(s,.05,scene),timeS:s.timeS+.05};
  for(const i of indices){const m=s.population!.members[i]!,o=objects[i]!,goal=nav.nodes[m.node]!;
   expect(onWalkway(scene,m.x,m.y,nav.radius(o)),o.id).toBe(true);
   if(m.speed>0 && Math.hypot(goal.x-m.x,goal.y-m.y)>3 && !moving.has(i))moving.set(i,s);
  }
 }
 for(const i of indices)expect(s.population!.members[i]!.distance,objects[i]!.id).toBeGreaterThan(initial.members[i]!.distance+10);
 expect(moving.size).toBe(8);
 for(const i of indices){
  const before=moving.get(i)!,m=before.population!.members[i]!,near={...before,x:m.x+Math.cos(m.heading)*35,y:m.y+Math.sin(m.heading)*35,vx:-Math.cos(m.heading)*40,vy:-Math.sin(m.heading)*40,elevation:walkingHeight(scene,m.x,m.y)};
  const waiting=stepAmbient(near,.05,scene)!,wait=waiting.members[i]!;
  expect(wait.speed,objects[i]!.id).toBe(0);expect([wait.x,wait.y]).toEqual([m.x,m.y]);
  const resumed=stepAmbient({...near,population:waiting,timeS:before.timeS+.05,x:scene.spawn.x,y:scene.spawn.y,vx:0,vy:0},.05,scene)!.members[i]!;
  expect(resumed.speed,objects[i]!.id).toBeGreaterThan(0);expect(Math.hypot(resumed.x-m.x,resumed.y-m.y)).toBeLessThanOrEqual(objects[i]!.ambient!.motion.speed*.05+1e-7);
 }
});
