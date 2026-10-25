import {it,expect} from 'vitest';
import source from '../docs/examples/resting.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {actorPose} from '../src/sim/actors';
import {worldSeats} from '../src/scene/seating';
import {checkSeatingState,seatClaimed} from '../src/sim/seating';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
const compile=(text=source)=>compileDreamScene(text,{sceneId:'rest',revisionId:'r1',sourceHash:'rest'});
const scene=compile(),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const regular=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!;
const player=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='pocket')!;
const start=():CarState=>({...createCarAtSpawn(scene),control:{kind:'foot'},x:900,y:730,elevation:0,surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]});
const step=(s:CarState,commerce?:import('../src/sim/commerce').CommerceAction)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene)},{commerce},.25,scene);
const sit=(state:CarState,index=0):CarState=>{const s=worldSeats(scene)[index]!;return {...state,seated:{objectId:s.objectId,seatId:s.seatId},x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,pitch:0,bank:0,vx:0,vy:0,vz:0,grounded:true};};
it('accepts bounded rest plans and rejects invalid references, ownership and repairable source errors',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));
 for(const [a,b] of [['rest=home_rest','rest=missing'],['recover_s=5','recover_s=0'],['energy=20','energy=101'],['until=85','until=26'],['seats=[lunch_bench]','seats=[]'],['seats=[lunch_bench]','seats=[lunch_bench,lunch_bench]'],['on=plaza','on=missing'],['on=plaza','on=plaza,grounds=[plaza]'],['account regular(rest=home_rest','account regular(shop=true,rest=home_rest']] as const)expect(checkDream(source.replace(a,b)).ok,b).toBe(false);
});
it('recovers the player on a usable seat without creating food, money or stock',()=>{
 const original=sit(start()),old=JSON.stringify(original),s=step(original);
 expect(player(s).energy).toBeCloseTo(21.25);expect(player(s).satiety).toBeLessThan(player(original).satiety);expect(s.economy!.markets).toEqual(original.economy!.markets);expect(s.economy!.consumed).toEqual(original.economy!.consumed);expect(player(s).credits).toBe(player(original).credits);expect(JSON.stringify(original)).toBe(old);checkSeatingState(s,scene);checkEconomyState(s,scene);
 const standing={...s,seated:undefined,x:900,y:730};expect(player(step(standing)).energy).toBeCloseTo(21.2375);
});
it('walks to an ordinary claimed seat, recovers, returns and resumes the paused routine before paid work',()=>{
 let s=step(start());const home={...regular(s).resting!.home},clock=structuredClone(s.npcs.find(n=>n.id==='customer')),seen=new Set<string>();
 for(let i=0;i<320 && regular(s).resting;i++){
  const t=regular(s).resting!;seen.add(t.phase);expect(regular(s).work).toBeUndefined();expect(regular(s).meal).toBeUndefined();expect(s.npcs.find(n=>n.id==='customer')).toEqual(clock);expect(regular(s).credits).toBe(20);
  if(t.phase==='sit'){expect(seatClaimed(s,t.seat!)).toBe(true);expect(actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s).seatHeight).toBeGreaterThan(0);}
  checkEconomyState(s,scene);s=step(s);
 }
 expect([...seen].sort()).toEqual(['home','out','sit']);expect(regular(s).resting).toBeUndefined();expect(regular(s).energy).toBeGreaterThan(80);
 const p=actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s);expect(Math.hypot(p.x-home.x,p.y-home.y)).toBeLessThan(.01);
 for(let i=0;i<320 && !regular(s).completed.work.bake;i++)s=step(s);expect(regular(s).completed.work.bake).toBe(1);expect(regular(s).credits).toBe(23);expect(regular(s).energy).toBeLessThan(80);checkEconomyState(s,scene);
});
it('shares seat capacity with the player and does not recover on broken furniture',()=>{
 let s=step(sit(start()));expect(regular(s).resting?.seat?.seatId).toBe('right');checkSeatingState(s,scene);
 let broken={...start(),broken:['lunch_bench']};for(let i=0;i<20;i++)broken=step(broken);expect(regular(broken).resting).toBeUndefined();expect(regular(broken).energy).toBeLessThan(20);expect(regular(broken).work).toBeUndefined();checkEconomyState(broken,scene);
});
it('releases a destroyed resting seat and returns without mutating the previous trip or granting recovery',()=>{
 let s=step(start());for(let i=0;i<120 && regular(s).resting?.phase!=='sit';i++)s=step(s);expect(regular(s).resting?.phase).toBe('sit');
 const snapshot=JSON.stringify(s),energy=regular(s).energy!,next=step({...s,broken:['lunch_bench']});expect(JSON.stringify(s)).toBe(snapshot);expect(regular(next).resting?.phase).toBe('home');expect(regular(next).resting?.seat).toBeUndefined();expect(regular(next).energy).toBeLessThan(energy);checkSeatingState(next,scene);checkEconomyState(next,scene);
});
it('saves all rest phases and energy, rejects forged claims and paths, and preserves needs on recovery',()=>{
 let s=step(start());const seen=new Set<string>();
 for(let i=0;i<320 && regular(s).resting;i++){
  const phase=regular(s).resting!.phase;if(!seen.has(phase)){
   seen.add(phase);const text=encodeSave(s,s.timeS,world),packet=JSON.parse(text);expect(decodeSave(text,world).state).toEqual(packet.state);expect(resetCar(s,scene).economy).toEqual(s.economy);
   for(const mutate of [(a:any)=>delete a.energy,(a:any)=>a.energy=101,(a:any)=>a.resting.home.x+=1,(a:any)=>a.resting.at.x+=1000,(a:any)=>a.resting.id='missing',(a:any)=>a.resting.routeAtS=s.timeS+5,(a:any)=>a.resting.path=[{x:300,y:300}]]){const bad=structuredClone(packet);mutate(bad.state.economy.accounts.find((a:any)=>a.id==='regular'));expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow();}
  }s=step(s);
 }
 expect(seen.size).toBe(3);
});
it('uses the same finite energy requirement for player work, with no energy cost on cancellation',()=>{
 let s={...start(),x:580,y:760};player(s).energy=5;expect(commerceReason(s,scene,'pocket',{kind:'work',job:'bake'})).toBe('energy');
 player(s).energy=20;s=step(s,{kind:'work',job:'bake'});expect(player(s).work).toBeDefined();const before=player(s).energy!;s=step(s,{kind:'cancel'});expect(player(s).work).toBeUndefined();expect(player(s).energy).toBeCloseTo(before-.0125);expect(s.economy!.markets[0]!.stock.flour).toBe(12);
 s=step(s,{kind:'work',job:'bake'});for(let i=0;i<12 && player(s).work;i++)s=step(s);expect(player(s).completed.work.bake).toBe(1);expect(player(s).energy).toBeLessThan(8);expect(player(s).credits).toBe(23);checkEconomyState(s,scene);
});

it('recovers the player on furniture outside the NPC preference list',()=>{
 const doc=compile(source.replace('place lunch_bench(object=slatted_bench,at=[690,775],role=prop);','place lunch_bench(object=slatted_bench,at=[690,775],role=prop);\nplace other_bench(object=slatted_bench,at=[690,715],role=prop);'));
 const seat=worldSeats(doc).find(s=>s.objectId==='other_bench')!,base=createCarAtSpawn(doc),s:CarState={...base,control:{kind:'foot'},seated:{objectId:seat.objectId,seatId:seat.seatId},x:seat.x,y:seat.y,elevation:seat.elevation,headingRad:seat.headingRad,pitch:0,bank:0,vx:0,vy:0,vz:0,grounded:true,vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]};
 const next=stepCommerce({...s,timeS:.25},{},.25,doc);expect(player(next).energy).toBeCloseTo(21.25);checkSeatingState(next,doc);checkEconomyState(next,doc);
});
