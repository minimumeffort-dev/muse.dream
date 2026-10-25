import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {preFleetScene,TREE_COMPATIBILITY,preTreeCompatibilitySource,preInvitationCompatibilitySource,COVERAGE_COMPATIBILITY,preCoverageCompatibilitySource,INVITATION_COMPATIBILITY,prePeopleCompatibilitySource,PEOPLE_COMPATIBILITY,preJunctionCompatibilitySource,JUNCTION_COMPATIBILITY,preSpacingCompatibilitySource,preParkScene,preParkCompatibilitySource,preEquipmentCompatibilitySource,sha256,SPACING_COMPATIBILITY,PARK_COMPATIBILITY,CITY_COMPATIBILITY} from '../src/scene/save-compatibility';
import {worldSeats} from '../src/scene/seating';
import {walkingNetwork,onWalkway} from '../src/scene/sites';
import {ambientNavigation} from '../src/scene/ambient-navigation';
import {ambientObjects,initialAmbient,stepAmbient} from '../src/sim/ambient';
import {repairTargets,repairApproach,repairNetwork} from '../src/sim/repair';
import {createCarAtSpawn,carFootprintClear,type CarState,type World} from '../src/sim/car';
import {toggleRide,stepInteractive,nearbyRide,bodyWorld} from '../src/sim/interaction';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {walkingHeight} from '../src/scene/interiors';
import {vehicleReviewStart} from '../src/game/review-start';
import {impactOf} from '../src/scene/object-dsl';
import {stepCommerce} from '../src/sim/commerce';
const scene=preFleetScene(createWorldScene()),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11},idle={steer:0,throttle:0};
it('adds a connected park without replacing any released object or raising live budgets',async()=>{
 expect(await sha256(preEquipmentCompatibilitySource(scene))).toBe(TREE_COMPATIBILITY);expect(await sha256(preTreeCompatibilitySource(scene))).toBe(COVERAGE_COMPATIBILITY);expect(await sha256(preCoverageCompatibilitySource(scene))).toBe(INVITATION_COMPATIBILITY);expect(await sha256(preInvitationCompatibilitySource(scene))).toBe(PEOPLE_COMPATIBILITY);expect(await sha256(prePeopleCompatibilitySource(scene))).toBe(JUNCTION_COMPATIBILITY);expect(await sha256(preJunctionCompatibilitySource(scene))).toBe(SPACING_COMPATIBILITY);expect(await sha256(preSpacingCompatibilitySource(scene))).toBe(PARK_COMPATIBILITY);expect(await sha256(preParkCompatibilitySource(scene))).toBe(CITY_COMPATIBILITY);
 expect(scene.objects).toHaveLength(1769);expect(preParkScene(scene).objects).toHaveLength(1719);expect(scene.surfaces).toHaveLength(47);expect(scene.sites).toHaveLength(219);
 expect(scene.objects.filter(o=>o.ambient)).toHaveLength(181);expect(scene.objects.filter(o=>o.parked)).toHaveLength(87);
 const n=walkingNetwork(scene),park=scene.sites.find(s=>s.id==='access_garden_park')!,market=scene.sites.find(s=>s.id==='access_market_hall')!;
 expect(n.roots[n.sites.get(park.id)!]).toBe(n.roots[n.sites.get(market.id)!]);expect(park.label).toBe('Garden park');
 const nav=ambientNavigation(scene);for(const [a,b] of [[{x:2708,y:3610},{x:2840,y:3610}],[{x:2480,y:3852},{x:2460,y:4220}]] as const)expect(nav.segment(a,b,4,true)).toBe(true);
});
it('uses the same sitting, damage and ride controls on every new bench, bicycle and scooter',()=>{
 const seats=worldSeats(scene).filter(s=>s.objectId.startsWith('garden_bench'));expect(seats).toHaveLength(12);
 for(const seat of seats){const s={...createCarAtSpawn(scene),control:{kind:'foot' as const},x:seat.approach.x,y:seat.approach.y,elevation:walkingHeight(scene,seat.approach.x,seat.approach.y),vehicles:[{id:null,x:6330,y:4233,elevation:0,headingRad:0,distance:0}]},sitting=toggleRide(s,world);
  expect(sitting.seated,seat.objectId).toEqual({objectId:seat.objectId,seatId:seat.seatId});expect(toggleRide(sitting,world).seated).toBeUndefined();expect(toggleRide({...s,broken:[seat.objectId]},world).seated).toBeUndefined();
  expect(impactOf(scene.objects.find(o=>o.id===seat.objectId)!.spec)).toEqual(impactOf(scene.objects.find(o=>o.id==='park_bench')!.spec));
 }
 for(const o of scene.objects.filter(o=>o.parked && /^garden_(bike|scooter)_/.test(o.id))){const base=vehicleReviewStart(createCarAtSpawn(scene),world,o.id),near=Array.from({length:64},(_,i)=>{const a=i%16*Math.PI/8,r=8+Math.floor(i/16)*8,x=o.x+Math.cos(a)*r,y=o.y+Math.sin(a)*r;return {...base,x,y,elevation:walkingHeight(scene,x,y)};}).find(s=>nearbyRide(s,world)?.id===o.id && carFootprintClear(bodyWorld(s,world),s.x,s.y,s.elevation,s.timeS,s));expect(near,o.id).toBeDefined();const riding=toggleRide(near!,world);expect(riding.control,o.id).toEqual({kind:'vehicle',id:o.id});let next=riding;for(let i=0;i<240;i++)next=stepInteractive(next,{...idle,throttle:1},1/120,world);expect(Math.hypot(next.x-riding.x,next.y-riding.y),o.id).toBeGreaterThan(10);}
});
it('moves every new visitor over accepted pavement without a CPU actor or new population clock',()=>{
 let state=createCarAtSpawn(scene);const objects=ambientObjects(scene),indices=objects.flatMap((o,i)=>o.id.startsWith('garden_visitor') ? [i] : []),before=initialAmbient(scene);
 expect(indices).toHaveLength(8);for(let i=0;i<120;i++){state={...state,population:stepAmbient(state,.05,scene),timeS:state.timeS+.05};for(const j of indices){const p=state.population!.members[j]!;expect(onWalkway(scene,p.x,p.y,3)).toBe(true);}}
 for(const j of indices)expect(state.population!.members[j]!.distance).toBeGreaterThan(before.members[j]!.distance+10);
});
it('connects all ten breakable park furnishings to the existing finite repair service',()=>{
 const service=scene.economy!.repairs.find(r=>r.id==='market_tables')!,home=scene.objects.find(o=>o.id==='market_neighbor')!,targets=repairTargets(scene,service).filter(t=>/^garden_(bench|lamp_)/.test(t.objectId));
 expect(targets).toHaveLength(10);for(const target of targets)expect(repairApproach(scene,service,target,home),target.objectId).toBeDefined();const n=repairNetwork(scene,service);expect(n.length).toBeLessThanOrEqual(8192);expect(n.reduce((n,p)=>n+p.links.length,0)).toBeLessThanOrEqual(32768);
 let s={...createCarAtSpawn(scene),broken:['garden_bench_nw']},claimed=false,repaired=false;
 for(let i=0;i<4800;i++){s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);claimed ||= !!s.economy!.accounts.find(a=>a.id==='caretaker')!.repair;if(!s.broken.includes('garden_bench_nw')){repaired=true;break;}}
 expect(claimed).toBe(true);expect(repaired).toBe(true);expect(s.economy!.repaired.market_tables).toBe(1);
},60000);
