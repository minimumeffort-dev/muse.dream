import {it,expect} from 'vitest';
import source from '../docs/examples/upstairs-social.dream?raw';
import {compileDreamScene,checkDream} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {actorPose} from '../src/sim/actors';
import {worldSeats} from '../src/scene/seating';
import {seatClaimed,checkSeatingState} from '../src/sim/seating';
import {encodeSave,decodeSave} from '../src/sim/save';
const scene=compileDreamScene(source,{sceneId:'upstairs-social',revisionId:'test',sourceHash:'upstairs-social'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const account=(s:CarState,id='regular')=>s.economy!.accounts.find(a=>a.id===id)!;
function tick(s:CarState,doc=scene){const next=stepCommerce({...s,npcs:stepNpcs(s,.25,doc),timeS:s.timeS+.25},{},.25,doc);checkEconomyState(next,doc);checkSeatingState(next,doc);return next;}
function until(s:CarState,test:(s:CarState)=>boolean,doc=scene){for(let i=0;i<900 && !test(s);i++)s=tick(s,doc);expect(test(s),JSON.stringify(s.economy!.gathering)).toBe(true);return s;}
it('accepts supported upper-floor pairs and rejects missing building/floor/stair access',()=>{
 expect(scene.economy!.socials[0]!.seats).toEqual(['upper_settee','lunch_bench']);
 for(const [a,b] of [['grounds=[house,upper_room,upper_landing]','grounds=[upper_room,upper_landing]'],['grounds=[house,upper_room,upper_landing]','grounds=[house]'],['stairs flight(material=home_wood,at=[6,.5,0],size=[4,8.5,22],steps=12);','']])expect(checkDream(source.replace(a!,b!)).ok,a).toBe(false);
});
it('walks both residents over supported stairs, owns both upper seats and consumes their real portions once before returning',()=>{
 const snapshot=JSON.stringify(scene),seat=worldSeats(scene).find(s=>s.objectId==='upper_settee')!;let s=createCarAtSpawn(scene),up=false;
 s=until(s,s=>!!s.economy!.gathering);expect(account(s).credits).toBe(10);expect(account(s).inventory.bread).toBe(0);
 while(s.economy!.gathering?.phase==='out'){
  const prior=s;s=tick(s);const t=s.economy!.gathering!;expect(t.hostTrip.seat.objectId).toBe('upper_settee');
  for(const side of ['hostTrip','guestTrip'] as const){expect(Math.hypot(t[side].x-prior.economy!.gathering![side].x,t[side].y-prior.economy!.gathering![side].y)).toBeLessThanOrEqual(3.500001);up ||= (t[side].elevation??0)>20;}
 }
 expect(up).toBe(true);expect(s.economy!.gathering?.phase).toBe('eat');
 for(const actor of ['customer','repairer']){const pose=actorPose(scene,scene.objects.find(o=>o.id===actor)!,s.timeS,s);expect(pose.elevation).toBeCloseTo(seat.elevation);expect(pose.seatHeight).toBeGreaterThan(3);}
 for(const side of ['hostTrip','guestTrip'] as const)expect(seatClaimed(s,s.economy!.gathering![side].seat)).toBe(true);
 s=until(s,s=>s.economy!.gathering?.phase==='home');expect(s.economy!.consumed.bread).toBe(2);expect(s.economy!.peerHistory?.['upstairs_break/regular/fixer']?.meals).toBe(1);expect(s.economy!.socialHistory).toBeUndefined();
 s=until(s,s=>!s.economy!.gathering);for(const actor of ['customer','repairer']){const o=scene.objects.find(o=>o.id===actor)!,p=actorPose(scene,o,s.timeS,s);expect(p.x).toBeCloseTo(o.x);expect(p.y).toBeCloseTo(o.y);expect(p.elevation).toBeLessThan(2);}expect(account(s).credits+account(s).inventory.bread!*5).toBe(10);expect(JSON.stringify(scene)).toBe(snapshot);
});
it('resumes real stair and eating poses identically after reload and R, rejecting forged layers and destinations',()=>{
 for(const stage of ['stairs','eat']){
  let s=until(createCarAtSpawn(scene),s=>stage==='eat' ? s.economy!.gathering?.phase==='eat' : (s.economy!.gathering?.hostTrip.elevation??0)>4),text=encodeSave(s,s.timeS,world),copy=decodeSave(text,world).state;
  expect(resetCar(s,scene).economy).toEqual(s.economy);
  for(const mutate of [(x:any)=>x.state.economy.gathering.hostTrip.elevation+=10,(x:any)=>x.state.economy.gathering.hostTrip.at.elevation+=10,(x:any)=>x.state.economy.gathering.hostTrip.home.elevation+=10]){const bad=JSON.parse(text);mutate(bad);expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow('invalid');}
  for(let i=0;i<600;i++){s=tick(s);copy=tick(copy);expect(copy).toEqual(s);}expect(s.economy!.peerHistory?.['upstairs_break/regular/fixer']?.meals).toBe(1);
 }
});
it('refunds once and descends physically if upper furniture breaks during a meal',()=>{
 let s=until(createCarAtSpawn(scene),s=>s.economy!.gathering?.phase==='eat');const fallback=worldSeats(scene).find(s=>s.objectId==='lunch_bench')!;s=tick({...s,broken:['upper_settee'],control:{kind:'foot'},seated:{objectId:fallback.objectId,seatId:fallback.seatId},x:fallback.x,y:fallback.y,elevation:fallback.elevation,headingRad:fallback.headingRad,pitch:0,bank:0,surface:'paper'});expect(s.economy!.gathering?.phase).toBe('home');expect(account(s).inventory.bread).toBe(2);expect(s.economy!.consumed.bread).toBe(0);expect(seatClaimed(s,{objectId:'upper_settee',seatId:'left'})).toBe(false);
 const high=s.economy!.gathering!.hostTrip.elevation!;s=tick(s);expect(s.economy!.gathering!.hostTrip.elevation).toBeGreaterThan(4);expect(s.economy!.gathering!.hostTrip.elevation).toBeLessThanOrEqual(high);
 s=until(s,s=>!s.economy!.gathering);expect(account(s).inventory.bread!+s.economy!.consumed.bread!).toBe(2);expect(s.economy!.peerHistory).toBeUndefined();expect(s.economy!.events.filter(e=>e.kind==='share_cancelled')).toHaveLength(1);
});
it('respects a player upper-seat claim and falls back to the available downstairs pair',()=>{
 const seat=worldSeats(scene).find(s=>s.objectId==='upper_settee')!;let s:CarState={...createCarAtSpawn(scene),control:{kind:'foot'},seated:{objectId:seat.objectId,seatId:seat.seatId},x:seat.x,y:seat.y,elevation:seat.elevation,headingRad:seat.headingRad,pitch:0,bank:0,surface:'paper'};
 s=until(s,s=>!!s.economy!.gathering);expect(s.economy!.gathering!.hostTrip.seat.objectId).toBe('lunch_bench');expect(seatClaimed(s,s.seated!)).toBe(true);
});

it('chooses furniture in authored preference order, independently of placement order',()=>{
 const doc=compileDreamScene(source.replace('seats=[upper_settee,lunch_bench],on=plaza','seats=[lunch_bench,upper_settee],on=plaza'),{sceneId:'lower-first',revisionId:'test',sourceHash:'lower-first'}),s=until(createCarAtSpawn(doc),s=>!!s.economy!.gathering,doc);expect(s.economy!.gathering!.hostTrip.seat.objectId).toBe('lunch_bench');
});
