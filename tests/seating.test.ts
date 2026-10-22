import {it,expect} from 'vitest';
import source from '../docs/examples/shared-seating.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {worldSeats,seatAccessClear,seatingProblems} from '../src/scene/seating';
import {nearbySeat,seatClaimed,checkSeatingState} from '../src/sim/seating';
import {createCarAtSpawn,resetCar,carFootprintClear,type CarState,type World} from '../src/sim/car';
import {toggleRide,stepInteractive,bodyWorld} from '../src/sim/interaction';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {walkingHeight} from '../src/scene/interiors';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {encodeSave,decodeSave} from '../src/sim/save';
import {actorPose} from '../src/sim/actors';
const scene=compileDreamScene(source,{sceneId:'seating',revisionId:'r1',sourceHash:'seating'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const seats=worldSeats(scene),seat=seats[0]!,idle={steer:0,throttle:0};
const start=():CarState=>({...createCarAtSpawn(scene),control:{kind:'foot'},x:seat.approach.x,y:seat.approach.y,elevation:walkingHeight(scene,seat.approach.x,seat.approach.y),surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]});
const diner=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!;
const step=(s:CarState)=>stepCommerce({...s,timeS:s.timeS+.25},{},.25,scene);
it('compiles named furniture seats, canonical formatting and useful repair diagnostics',()=>{
 expect(seats).toHaveLength(2);expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(compileDreamScene(formatDream(source),{sceneId:'seating',revisionId:'r1',sourceHash:'seating'})).toEqual(scene);
 for(const [a,b] of [['body(interaction=solid,radius=28,height=31);','body(interaction=solid,radius=28,height=31); contact body(at=[0,0,0],radius=28,height=31);'],['approach=[-13,48]','approach=[-13,20]'],['at=[-13,18,12]','at=[-13,21,12]'],['at=[13,18,12]','at=[-13,18,12]'],['heading_deg=90','heading_deg=900'],['seat right(','seat left('],['approach=[-13,48]','approach=[-13,8]'],['seats=[lunch_bench]','seats=[missing]'],['seats=[lunch_bench]','seats=[lunch_bench,lunch_bench]'],['at=[690,775]','at=[900,775]']] as const)expect(checkDream(source.replace(a,b)).ok,b).toBe(false);
});
it('sits only from a clear grounded approach, holds one body and stands before moving or jumping',()=>{
 const snapshot=JSON.stringify(scene),s=toggleRide(start(),world);expect(s.seated).toEqual({objectId:seat.objectId,seatId:seat.seatId});checkSeatingState(s,scene);expect(carFootprintClear(bodyWorld(s,world),s.x,s.y,s.elevation,s.timeS,s)).toBe(true);
 let still=s;for(let i=0;i<120;i++)still=stepInteractive(still,idle,1/120,world);expect([still.x,still.y,still.elevation]).toEqual([s.x,s.y,s.elevation]);expect(still.timeS).toBeGreaterThan(s.timeS);
 const standing=toggleRide(s,world);expect(standing.seated).toBeUndefined();expect([standing.x,standing.y]).toEqual([seat.approach.x,seat.approach.y]);expect(standing.vehicles).toEqual(s.vehicles);
 expect(stepInteractive(s,{steer:1,throttle:0},1/120,world).seated).toBeUndefined();const jumping=stepInteractive(s,{...idle,jump:true},1/120,world);expect(jumping.seated).toBeUndefined();expect(jumping.grounded).toBe(false);
 expect(toggleRide({...start(),grounded:false},world).seated).toBeUndefined();expect(nearbySeat({...start(),x:seat.x+200},world)).toBeUndefined();expect(resetCar(s,scene).seated).toBeUndefined();expect(JSON.stringify(scene)).toBe(snapshot);
});
it('shares seat claims, rejects broken furniture and safely releases the player after destruction',()=>{
 const s=toggleRide(start(),world);expect(seatClaimed(s,seat)).toBe(true);expect(seatAccessClear(scene,seat,[seat.objectId])).toBe(false);expect(nearbySeat({...start(),broken:[seat.objectId]},world)).toBeUndefined();
 const released=stepInteractive({...s,broken:[seat.objectId]},idle,1/120,world);expect(released.seated).toBeUndefined();expect(released.broken).toContain(seat.objectId);
 expect(nearbySeat({...released,broken:[]},world)).toBeDefined();
});
it('buys a finite meal, walks to a reserved seat, eats there once and returns to the original routine',()=>{
 let s=start();s.x=900;s.y=730;let sat=false,claimed=false;
 const clocks=structuredClone(s.npcs),credits=diner(s).credits;for(let i=0;i<240;i++){
  s=step(s);checkEconomyState(s,scene);
  const m=diner(s).meal;if(m?.seat){claimed=true;expect(seatClaimed(s,m.seat)).toBe(true);expect(encodeSave(s,s.timeS,world)).toBeTypeOf('string');}
  if(m?.phase==='eat' && m.seat){sat=true;const p=actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s);expect(p.seatHeight).toBeGreaterThan(3);expect(diner(s).credits).toBe(credits-5);expect(diner(s).inventory.bread).toBe(1);}
  if(claimed && !m)break;
 }
 expect(claimed && sat).toBe(true);expect(diner(s).meal).toBeUndefined();expect(diner(s).inventory.bread).toBe(0);expect(diner(s).credits).toBe(credits-5);expect(s.npcs).toEqual(clocks);expect(s.economy!.events.filter(e=>e.account==='regular' && e.kind==='eat')).toHaveLength(1);
});
it('respects the player claim, falls back to standing when full and releases a destroyed NPC seat without losing food',()=>{
 let s=toggleRide(start(),world);s.seated={objectId:seat.objectId,seatId:seats[1]!.seatId};s.x=seats[1]!.x;s.y=seats[1]!.y;
 for(let i=0;i<160 && diner(s).meal?.phase!=='seat';i++)s=step(s);expect(diner(s).meal?.seat?.seatId).toBe(seat.seatId);
 const before=diner(s).inventory.bread;s={...s,seated:undefined,broken:[seat.objectId]};s=step(s);expect(diner(s).meal?.seat).toBeUndefined();expect(diner(s).inventory.bread).toBe(before);checkEconomyState(s,scene);
 for(let i=0;i<240 && diner(s).meal;i++)s=step(s);expect(diner(s).inventory.bread).toBe(0);expect(diner(s).credits).toBe(15);
});
it('persists seated ownership and rejects forged, duplicate, damaged and displaced saved claims',()=>{
 const s=toggleRide(start(),world),text=encodeSave(s,10,world);expect(decodeSave(text,world).state.seated).toEqual(s.seated);
 for(const mutate of [(p:any)=>p.state.seated.seatId='missing',(p:any)=>p.state.x+=4,(p:any)=>p.state.vx=10,(p:any)=>p.state.control.kind='car',(p:any)=>p.state.broken=[seat.objectId]]){const packet=JSON.parse(text);mutate(packet);expect(()=>decodeSave(JSON.stringify(packet),world)).toThrow();}
 expect(commerceReason(s,scene,'pocket',{kind:'work',job:'bake'})).toBe('busy');
});

it('serves a standing meal when the only slot is occupied, without taking the player seat',()=>{
 const one=compileDreamScene(source.replace(/^  seat right.*\n/m,''),{sceneId:'one-seat',revisionId:'r1',sourceHash:'one-seat'}),seat=worldSeats(one)[0]!,w={...world,scene:one};
 let s=toggleRide({...start(),x:seat.approach.x,y:seat.approach.y},w),ate=false;
 for(let i=0;i<240;i++){
  s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,one);checkEconomyState(s,one);checkSeatingState(s,one);
  if(diner(s).meal?.phase==='eat'){ate=true;expect(diner(s).meal?.seat).toBeUndefined();expect(diner(s).inventory.bread).toBe(1);}
  if(ate && !diner(s).meal)break;
 }
 expect(ate).toBe(true);expect(s.seated).toEqual({objectId:seat.objectId,seatId:seat.seatId});expect(diner(s).credits).toBe(15);expect(diner(s).inventory.bread).toBe(0);
});
it('releases a customer claim on the exact car-impact tick and can save immediately',()=>{
 let s=start();s.x=900;s.y=730;
 for(let i=0;i<200 && diner(s).meal?.phase!=='eat';i++)s=step(s);
 expect(diner(s).meal?.seat).toBeDefined();
 s={...s,control:{kind:'car'},seated:undefined,x:690,y:740,vx:0,vy:130,headingRad:Math.PI/2,elevation:0,vehicles:[]};
 for(let i=0;i<60 && !s.broken.includes(seat.objectId);i++)s=stepInteractive(s,{steer:0,throttle:1},1/120,world);
 expect(s.broken).toContain(seat.objectId);expect(diner(s).meal?.seat).toBeUndefined();expect(diner(s).inventory.bread).toBe(1);expect(encodeSave(s,s.timeS,world)).toBeTypeOf('string');
});

it('eats owned food while seated and retains the ordinary conservation rules',()=>{
 let s={...start(),x:580,y:730,timeS:.25};s=stepCommerce(s,{commerce:{kind:'buy',market:'corner',good:'bread'}},.25,scene);
 expect(s.economy!.accounts[0]!.inventory.bread).toBe(1);s=toggleRide({...s,x:seat.approach.x,y:seat.approach.y},world);expect(s.seated).toBeDefined();
 s=stepCommerce({...s,timeS:.5},{commerce:{kind:'eat',good:'bread'}},.25,scene);
 expect(s.economy!.accounts[0]!.inventory.bread).toBe(0);expect(s.economy!.accounts[0]!.credits).toBe(15);expect(s.economy!.consumed.bread).toBe(1);checkEconomyState(s,scene);expect(encodeSave(s,.5,world)).toBeTypeOf('string');
});


it('rejects excessive seat data before preparing approaches and geometry',()=>{
 const bench=scene.objects.find(o=>o.id==='lunch_bench')!,tooMany={...scene,objects:Array.from({length:257},(_,i)=>({...bench,id:`bench_${i}`}))};
 expect(seatingProblems(tooMany)).toEqual(['world seat budget exceeds 512']);
 const extra=Array.from({length:3},(_,i)=>`seat extra_${i}(at=[0,18,12],approach=[0,48],heading_deg=90);`).join('');
 expect(()=>compileDreamScene(source.replace('seat right(',extra+'seat right('),{sceneId:'budget',revisionId:'r1',sourceHash:'budget'})).toThrow('seat budget exceeds 4');
});

it('rejects outbound detours and seat reservations without their purchased food on restore',()=>{
 let s={...start(),x:900,y:730};s=step(s);expect(diner(s).meal?.phase).toBe('out');
 const packet=JSON.parse(encodeSave(s,s.timeS,world)),trip=packet.state.economy.accounts.find((a:any)=>a.id==='regular').meal;trip.at={...seat.approach};trip.path=[];
 expect(()=>decodeSave(JSON.stringify(packet),world)).toThrow('invalid');
 for(let i=0;i<160 && diner(s).meal?.phase!=='seat';i++)s=step(s);expect(diner(s).meal?.phase).toBe('seat');
 diner(s).inventory.bread!--;s.economy!.markets[0]!.stock.bread!++;
 expect(()=>checkEconomyState(s,scene)).toThrow('Invalid saved meal food');expect(()=>encodeSave(s,s.timeS,world)).toThrow();
});

it.each(['free','preferred-broken','all-broken'] as const)('uses authored furniture preference before placement order: %s',async condition=>{
 const {default:orderedSource}=await import('../docs/examples/seat-preferences.dream?raw');
 const ordered=compileDreamScene(orderedSource,{sceneId:'preferred',revisionId:'r1',sourceHash:'preferred'});
 expect(worldSeats(ordered)[0]!.objectId).toBe('lunch_bench');
 let s:CarState={...createCarAtSpawn(ordered),control:{kind:'foot' as const},x:900,y:730,elevation:0,broken:condition==='free' ? [] : condition==='preferred-broken' ? ['home_bench'] : ['home_bench','lunch_bench']};
 for(let i=0;i<160 && diner(s).meal?.phase!=='seat' && diner(s).meal?.phase!=='eat';i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,ordered);
 expect(diner(s).credits).toBe(15);expect(diner(s).inventory.bread).toBe(1);expect(diner(s).meal?.seat?.objectId).toBe(condition==='free' ? 'home_bench' : condition==='preferred-broken' ? 'lunch_bench' : undefined);
 for(let i=0;i<240 && diner(s).meal;i++)s=stepCommerce({...s,timeS:s.timeS+.25},{},.25,ordered);
 expect(diner(s).meal).toBeUndefined();expect(diner(s).inventory.bread).toBe(0);expect(diner(s).credits).toBe(15);expect(s.economy!.consumed.bread).toBe(1);checkEconomyState(s,ordered);
});
