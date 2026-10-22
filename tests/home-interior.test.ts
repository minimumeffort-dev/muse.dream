import {it,expect} from 'vitest';
import source from '../docs/examples/enterable-home.dream?raw';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {compileDreamWorld,checkDream,formatDream} from '../src/scene/dream';
import {sceneInteriors,portalPoints,occupiedInterior,walkingHeight} from '../src/scene/interiors';
import {worldSeats,seatAccessClear} from '../src/scene/seating';
import {objectPlacement} from '../src/scene/placement';
import {objectContacts,sceneContactData} from '../src/scene/contacts';
import {objectFragments} from '../src/scene/fragments';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {createCarAtSpawn,carFootprintClear,type CarState,type World} from '../src/sim/car';
import {stepInteractive,toggleRide,bodyWorld} from '../src/sim/interaction';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {breakOnContact} from '../src/sim/impacts';
import {repairTargets} from '../src/sim/repair';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {homeReviewStart,homeReviewInput} from '../src/game/home-review';
import {nurseryReviewSteps} from '../src/game/review-start';
const scene=createWorldScene(),prior=c.preHomeInteriorScene(scene);
const world=(s=scene):World=>({scene:s,roadMask:buildMaskForScene(s),driveMask:buildPaperMask(14000,11000),carRadius:11});
const current={...world(),saveCompatibility:c.HOME_INTERIOR_COMPATIBILITY,previousHomeInteriorSaveCompatibility:c.WEATHER_COMPATIBILITY,previousHomeInteriorNavigation:ambientGraph(prior),previousHomeInteriorContacts:sceneContactData(prior)},old={...world(prior),saveCompatibility:c.WEATHER_COMPATIBILITY};
const room=sceneInteriors(scene).find(r=>r.object.id==='oldtown_044')!,ids=['home_settee','home_table','home_planter'];
const a=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
it('retains the exact r93 projection, other placements and commute while opening the existing home',async()=>{
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.HOME_INTERIOR_COMPATIBILITY);expect(await c.sha256(c.preHomeInteriorCompatibilitySource(scene))).toBe(c.WEATHER_COMPATIBILITY);expect(await c.sha256(c.preWeatherCompatibilitySource(scene))).toBe(c.RATIONS_COMPATIBILITY);
 expect(scene.objects.filter(o=>!ids.includes(o.id) && o.id!=='oldtown_044')).toEqual(prior.objects.filter(o=>o.id!=='oldtown_044'));
 expect(scene.routes).toEqual(prior.routes);expect(scene.behaviors).toEqual(prior.behaviors);expect(scene.economy!.accounts).toHaveLength(prior.economy!.accounts.length);
 const stop=scene.routes.find(r=>r.id==='market_commute')!.points[0]!;expect(occupiedInterior(scene,stop.x,stop.y,room.floor)?.object.id).toBe('oldtown_044');
 expect(room.floor).toBeCloseTo(1.95652);expect(room.ceiling-room.floor).toBeCloseTo(31.30435);expect(sceneInteriors(scene)).toHaveLength(3);
 for(const id of ids)expect(objectPlacement(scene,scene.objects.find(o=>o.id===id)!).base).toBeCloseTo(room.floor);
});
it('walks through the door, sits on either cushion and keeps the car and people out of walls',()=>{
 let s=homeReviewStart(createCarAtSpawn(scene),current);
 for(let frame=0;frame<225;frame++)for(let i=0;i<4;i++)s=stepInteractive(s,homeReviewInput(s,current,frame),1/120,current);
 expect(occupiedInterior(scene,s.x,s.y,s.elevation)?.object.id).toBe('oldtown_044');expect(toggleRide(s,current).seated?.objectId).toBe('home_settee');
 for(const seat of worldSeats(scene).filter(s=>s.objectId==='home_settee')){expect(seatAccessClear(scene,seat)).toBe(true);const seated=toggleRide({...s,...seat.approach,elevation:walkingHeight(scene,seat.approach.x,seat.approach.y)},current);expect(seated.seated).toEqual({objectId:'home_settee',seatId:seat.seatId});expect(toggleRide(seated,current).seated).toBeUndefined();}
 const door=portalPoints(room,room.room.portals[0]!);expect(carFootprintClear(current,door.center.x,door.center.y,room.floor,0)).toBe(false);
 const wall=room.toWorld(9.25,0);expect(carFootprintClear(bodyWorld(s,current),wall.x,wall.y,room.floor,s.timeS,s)).toBe(false);
});
it('keeps voxel shell tags through the text contract and rejects unsafe cutaways',()=>{
 const compiled=compileDreamWorld(source);expect(compiled.assemblies).toHaveLength(2);expect(compileDreamWorld(formatDream(source))).toEqual(compiled);
 const home=compiled.assemblies[0]!;expect(home.parts.filter(p=>p.shape==='voxel').every(p=>p.cutaway)).toBe(true);expect(home.parts.filter(p=>p.shape==='voxel').length).toBeGreaterThan(5);
 for(const bad of [source.replace('cutaway=front','cutaway=ceiling'),source.replace('interior(at=[0,.5,0],size=[18,8,32]){portal front(side=front,offset=0,width=3,height=6);}','')])expect(checkDream(bad).ok).toBe(false);
 const settee=compiled.assemblies[1]!;expect(settee.measure?.kind).toBe('bench');expect(objectFragments(settee)).toHaveLength(5);expect(scene.objects.find(o=>o.id==='home_settee')!.spec).toMatchObject({impact:{kind:'break',pattern:'splinter',speed:95}});
});
it('lets the existing caretaker repair the home using finite supplies, wages and recovered hardware',()=>{
 let s=homeReviewStart(createCarAtSpawn(scene),current);s={...s,x:6493,y:4030,elevation:room.floor};
 for(const id of ids){const object=scene.objects.find(o=>o.id===id)!,contact=objectContacts(scene,object)[0]!;s={...s,x:contact.x-20,y:contact.y,vx:120,vy:0,elevation:room.floor};breakOnContact(s,current,contact.x,contact.y,[contact]);}
 s={...s,x:6520,y:4048,vx:0,vy:0};expect(s.broken.sort()).toEqual([...ids].sort());const service=scene.economy!.repairs.find(r=>r.id==='home_furniture')!;
 expect(repairTargets(scene,service).filter(t=>ids.includes(t.objectId))).toHaveLength(3);let seen=false,wages=0;
 for(let i=0;i<1600 && (s.broken.some(id=>ids.includes(id)) || a(s,'caretaker').repair);i++){const before=a(s,'caretaker').credits;s=stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene),population:stepAmbient(s,.25,scene)},{},.25,scene);wages+=Math.max(0,a(s,'caretaker').credits-before);seen ||= a(s,'caretaker').repair?.id==='home_furniture';}
 expect(seen).toBe(true);expect(s.broken,JSON.stringify({time:s.timeS,caretaker:a(s,'caretaker'),repairs:s.economy!.repaired,recovered:s.economy!.recovered,markets:s.economy!.markets})).toEqual([]);expect(s.economy!.repaired.home_furniture).toBe(3);expect(s.economy!.recovered!.home_furniture).toBe(2);expect(wages).toBe(12);checkEconomyState(s,scene);const saved=encodeSave(s,s.timeS,current);expect(decodeSave(saved,current).state).toEqual(JSON.parse(saved).state);
});
it('migrates a real paid batch with resources, clocks and old slot intact, initializing only the new repair ledger',()=>{
 const steps=nurseryReviewSteps(createCarAtSpawn(prior),old);let r=steps.next();while(!r.done)r=steps.next();const before=r.value,text=encodeSave(before,234,old),loaded=decodeSave(text,current),next=loaded.state;
 expect(next.timeS).toBe(before.timeS);expect(next.npcs).toEqual(before.npcs);expect(next.vehicles).toEqual(before.vehicles);expect(next.population?.members.map(m=>[m.distance,m.random])).toEqual(before.population?.members.map(m=>[m.distance,m.random]));expect(next.population?.tick).toEqual(before.population?.tick);expect(next.economy!.markets).toEqual(before.economy!.markets);expect(a(next).work).toEqual(a(before).work);expect(a(next).credits).toBe(a(before).credits);expect(a(next).inventory).toEqual(a(before).inventory);expect(next.economy!.repaired).toEqual({...before.economy!.repaired,home_furniture:0});
 expect(decodeSave(encodeSave(next,234,current),current).state).toEqual(next);expect(()=>decodeSave(text,{...current,previousHomeInteriorSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${prior.sceneId}.${c.WEATHER_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(current,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(next);expect(slot.write(next,234)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});

it('recovers an old safe doorstep pose blocked by the new wall without resetting world progress',()=>{
 const original=createCarAtSpawn(prior),s:CarState={...original,control:{kind:'foot'},x:6515,y:4073,elevation:walkingHeight(prior,6515,4073),vehicles:[{id:null,x:original.x,y:original.y,elevation:original.elevation,headingRad:original.headingRad,distance:0}]};
 expect(carFootprintClear(bodyWorld(s,old),s.x,s.y,s.elevation,s.timeS,s)).toBe(true);expect(carFootprintClear(bodyWorld(s,current),s.x,s.y,s.elevation,s.timeS,s)).toBe(false);
 const next=decodeSave(encodeSave(s,12,old),current).state;expect(carFootprintClear(bodyWorld(next,current),next.x,next.y,next.elevation,next.timeS,next)).toBe(true);expect(Math.hypot(next.x-s.x,next.y-s.y)).toBeLessThan(128);expect(next.timeS).toBe(s.timeS);expect(next.economy!.markets).toEqual(s.economy!.markets);expect(next.npcs).toEqual(s.npcs);
});

it.each(['car','foot'] as const)('recovers a saved %s with a car inside the new home, retaining ownership and travel history',kind=>{
 let original=createCarAtSpawn(prior);for(let i=0;i<1200;i++)original=stepInteractive(original,{steer:0,throttle:0},1/120,old);const car={x:6493.348,y:4061,elevation:0,headingRad:1.2,distance:37};
 const s:CarState=kind==='car' ? {...original,...car} : {...original,control:{kind:'foot'},x:6493,y:4110,elevation:walkingHeight(prior,6493,4110),vehicles:[{id:null,...car}]};
 expect(carFootprintClear(old,car.x,car.y,car.elevation,s.timeS,{...s,...car,control:{kind:'car'},vehicles:s.vehicles.filter(v=>v.id!==null)})).toBe(true);
 const next=decodeSave(encodeSave(s,12,old),current).state,pose=kind==='car' ? next : next.vehicles.find(v=>v.id===null)!;
 expect(room.contains(pose.x,pose.y,-12)).toBe(false);expect(Math.hypot(pose.x-car.x,pose.y-car.y)).toBeLessThanOrEqual(64);expect(pose.distance).toBe(37);expect(pose.headingRad).toBe(1.2);expect(next.control).toEqual(s.control);expect(next.timeS).toBe(s.timeS);expect(next.economy!.markets).toEqual(s.economy!.markets);expect(decodeSave(encodeSave(next,12,current),current).state).toEqual(next);
});
