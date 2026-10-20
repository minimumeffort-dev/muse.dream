import {expect,it} from 'vitest';
import source from '../docs/examples/shared-meal.dream?raw';
import text from '../docs/examples/hosted-meal.dream?raw';
import {compileDreamScene,formatDream} from '../src/scene/dream';
import {worldSeats} from '../src/scene/seating';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,commerceReason,checkEconomyState,type CommerceAction} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {toggleRide,stepInteractive} from '../src/sim/interaction';
import {encodeSave,decodeSave} from '../src/sim/save';
import {checkSeatingState,seatClaimed} from '../src/sim/seating';
import {walkingHeight} from '../src/scene/interiors';
import {sharedMeals} from '../src/sim/social';

const compile=(source=text)=>compileDreamScene(source,{sceneId:'hosted',revisionId:'r1',sourceHash:'a'.repeat(64)}),scene=compile();
const world=(doc=scene):World=>({scene:doc,saveCompatibility:'b'.repeat(64),carRadius:11,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(doc.canonical.width,doc.canonical.height)});
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
function tick(s:CarState,action?:CommerceAction,doc=scene,talk=false){
 const next=stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc,talk)},{commerce:action},.25,doc);
 checkEconomyState(next,doc);checkSeatingState(next,doc);return next;
}
function ready(doc=scene,known=true){
 const seat=worldSeats(doc)[0]!;
 let s:CarState={...createCarAtSpawn(doc),control:{kind:'foot'},x:seat.approach.x,y:seat.approach.y,elevation:walkingHeight(doc,seat.approach.x,seat.approach.y),surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]};
 s=toggleRide(s,world(doc));return tick(s,undefined,doc,known);
}
function until(s:CarState,done:(s:CarState)=>boolean,doc=scene){for(let i=0;i<600 && !done(s);i++)s=tick(s,undefined,doc);expect(done(s)).toBe(true);return s;}
it('pays for two real portions from the NPC account, offers one free seat and waits for consent',()=>{
 const s=ready();expect(s.economy!.invitation?.partner).toBe('regular');expect(s.economy!.shared).toBeUndefined();
 expect(account(s).credits).toBe(20);expect(account(s).inventory.bread).toBe(0);expect(account(s,'regular').credits).toBe(10);expect(account(s,'regular').inventory.bread).toBe(2);
 expect(s.economy!.markets[0]).toMatchObject({credits:110,stock:{bread:6}});expect(s.economy!.consumed.bread).toBe(0);expect(seatClaimed(s,s.economy!.invitation!.seat)).toBe(true);
 expect(sharedMeals(s,scene,'customer')).toBe(0);
});
it('eats after acceptance, remembers once, and never charges or refunds the player',()=>{
 let s=ready();s=tick(s,{kind:'accept_share',partner:'regular'});expect(s.economy!.shared).toMatchObject({host:'regular',portions:2});expect(s.economy!.invitation).toBeUndefined();
 expect(account(s,'regular').inventory.bread).toBe(0);s=until(s,s=>!s.economy!.shared);expect(s.economy!.consumed.bread).toBe(2);expect(sharedMeals(s,scene,'customer')).toBe(1);expect(account(s).credits).toBe(20);expect(account(s).inventory.bread).toBe(0);
});
it('declines or expires without reversing purchases, awarding history or repeating the offer',()=>{
 for(const decline of [true,false]){let s=ready();const at=s.economy!.invitation!.expiresAtS,claim=s.economy!.invitation!.seat;
  s=decline ? tick(s,{kind:'decline_share',partner:'regular'}) : until(s,s=>s.timeS>=at);
  expect(s.economy!.invitation).toBeUndefined();expect(seatClaimed(s,claim)).toBe(false);expect(account(s,'regular').inventory.bread).toBe(2);expect(account(s,'regular').credits).toBe(10);expect(sharedMeals(s,scene,'customer')).toBe(0);
  for(let i=0;i<12;i++)s=tick(s);expect(s.economy!.invitation).toBeUndefined();
 }
});
it('refunds the host exactly once on cancellation and R without mutating the prior state',()=>{
 let s=tick(ready(),{kind:'accept_share',partner:'regular'});const before=JSON.stringify(s),reset=resetCar(s,scene);
 expect(JSON.stringify(s)).toBe(before);expect(account(reset,'regular').inventory.bread).toBe(2);expect(account(reset).inventory.bread).toBe(0);expect(reset.economy!.shared?.phase).toBe('home');
 s=tick(s,{kind:'cancel'});s=tick(s,{kind:'cancel'});expect(account(s,'regular').inventory.bread).toBe(2);expect(s.economy!.consumed.bread).toBe(0);
});
it('does not buy half a meal, overdraw funds, invite strangers or accept a forged invitation',()=>{
 for(const [a,b] of [['actor=customer,credits=20','actor=customer,credits=9'],['quantity=8,limit=16','quantity=1,limit=16']] as const){const doc=compile(text.replace(a,b)),s=ready(doc);expect(s.economy!.invitation).toBeUndefined();expect(account(s,'regular').inventory.bread).toBe(0);expect(s.economy!.events.filter(e=>e.kind==='buy')).toHaveLength(0);}
 const unknown=ready(scene,false);expect(unknown.economy!.invitation).toBeUndefined();expect(account(unknown,'regular').credits).toBe(20);
 const refused=tick(unknown,{kind:'accept_share',partner:'regular'});expect(refused.economy!.shared).toBeUndefined();
 const pending=ready(),copy=structuredClone(pending);copy.economy!.invitation!.expiresAtS++;expect(()=>checkEconomyState(copy,scene)).toThrow();
});
it('keeps the omitted field compatible and rejects malformed supply lists with canonical formatting',()=>{
 expect(formatDream(formatDream(text))).toBe(formatDream(text));
 for(const fields of ['markets=[]','markets=[corner,corner]','markets=[missing]'])expect(()=>compile(text.replace('markets=[corner]',fields))).toThrow();
 expect(()=>compile(text.replace('good=bread,seats','good=flour,seats'))).toThrow();
 const legacy=compile(source);expect(ready(legacy).economy!.invitation).toBeUndefined();
});

it.each(['pending','out','eat','home'] as const)('saves and replays the %s phase with the same owner, clocks and food',phase=>{
 let s=ready();if(phase!=='pending'){s=tick(s,{kind:'accept_share',partner:'regular'});s=until(s,s=>s.economy!.shared?.phase===phase);}
 const w=world(),text=encodeSave(s,77,w),loaded=decodeSave(text,w);expect(JSON.parse(text).version).toBe(18);expect(loaded.worldTime).toBe(77);expect(loaded.state).toEqual(JSON.parse(JSON.stringify(s)));
 let replay=loaded.state;for(let i=0;i<120;i++){s=tick(s);replay=tick(replay);}expect(replay).toEqual(s);expect(account(s).credits).toBe(20);expect(account(s).inventory.bread).toBe(0);
});
it.each(['pending','out','eat'] as const)('releases the %s claim on movement, jump, F, R or a broken bench without charging the guest',phase=>{
 let original=ready();if(phase!=='pending'){original=tick(original,{kind:'accept_share',partner:'regular'});original=until(original,s=>s.economy!.shared?.phase===phase);}
 const w=world(),before=JSON.stringify(original),cases=[
  ()=>stepInteractive(original,{steer:1,throttle:0},1/120,w),
  ()=>stepInteractive(original,{steer:0,throttle:0,jump:true},1/120,w),
  ()=>toggleRide(original,w),()=>resetCar(original,scene),
  ()=>stepInteractive({...original,broken:['lunch_bench']},{steer:0,throttle:0},1/120,w)
 ];
 for(const run of cases){const s=run();expect(s.economy!.invitation).toBeUndefined();expect(s.economy!.shared?.phase==='home' || !s.economy!.shared).toBe(true);expect(account(s,'regular').inventory.bread).toBe(2);expect(account(s).inventory.bread).toBe(0);expect(account(s).credits).toBe(20);expect(s.economy!.consumed.bread).toBe(0);expect(()=>encodeSave(s,s.timeS,w)).not.toThrow();}
 expect(JSON.stringify(original)).toBe(before);
});
it('reserves pending food counter room, blocks spending the host food and refuses stale acceptance',()=>{
 let s=ready();expect(commerceReason(s,scene,'regular',{kind:'eat',good:'bread'})).toBe('busy');expect(commerceReason(s,scene,'regular',{kind:'accept_share',partner:'regular'})).toBe('busy');
 const before=s.economy!.invitation!.offeredAtS;s=until(s,s=>!s.economy!.invitation);s=tick(s,{kind:'accept_share',partner:'regular'});expect(s.economy!.shared).toBeUndefined();expect(account(s,'regular').invitedAtS).toBe(before);expect(account(s,'regular').inventory.bread).toBe(2);expect(s.economy!.events.at(-1)).toMatchObject({kind:'blocked',reason:'range'});
 const fullCounter=structuredClone(ready());fullCounter.economy!.consumed.bread=1e9-1;expect(()=>checkEconomyState(fullCounter,scene)).toThrow();
});
it('does not partly purchase when the counter has room for only one payment',()=>{
 const doc=compile(text.replace('actor=neighbor,credits=100,radius=80','actor=neighbor,credits=999995,radius=80')),s=ready(doc);expect(s.economy!.invitation).toBeUndefined();expect(account(s,'regular').credits).toBe(20);expect(account(s,'regular').inventory.bread).toBe(0);expect(s.economy!.events.filter(e=>e.kind==='buy')).toHaveLength(0);
});
it('cancels an offer in the same transaction when the guest eats their own food and becomes full',()=>{
 const w=world();let s=ready(scene,false);s=toggleRide(s,w);
 const vendor=scene.objects.find(o=>o.id==='neighbor')!;s={...s,x:vendor.x+20,y:vendor.y,elevation:walkingHeight(scene,vendor.x+20,vendor.y),vx:0,vy:0};
 s=tick(s,{kind:'buy',market:'corner',good:'bread'});s=tick(s,{kind:'buy',market:'corner',good:'bread'});s=tick(s,{kind:'eat',good:'bread'});expect(account(s).satiety).toBe(85);
 const own=worldSeats(scene)[0]!;s={...s,x:own.approach.x,y:own.approach.y,elevation:walkingHeight(scene,own.approach.x,own.approach.y)};s=toggleRide(s,w);s=tick(s,undefined,scene,true);
 s=until(s,s=>!!s.economy!.invitation);s=tick(s,{kind:'eat',good:'bread'});expect(s.economy!.invitation).toBeUndefined();expect(account(s).satiety).toBe(100);expect(account(s,'regular').inventory.bread).toBe(2);
});
it('rejects forged invitation context and host identity before save restore',()=>{
 const w=world(),saved=JSON.parse(encodeSave(ready(),0,w));
 const changes=[(s:CarState)=>{s.economy!.invitation!.partner='pocket';},(s:CarState)=>{s.economy!.invitation!.seat={...s.economy!.invitation!.playerSeat};},(s:CarState)=>{s.economy!.invitation!.expiresAtS++;},(s:CarState)=>{account(s,'regular').invitedAtS=s.timeS+1;},(s:CarState)=>{s.control={kind:'car'};},(s:CarState)=>{account(s).satiety=100;}];
 for(const change of changes){const copy=structuredClone(saved);change(copy.state);expect(()=>decodeSave(JSON.stringify(copy),w)).toThrow();}
 const active=tick(ready(),{kind:'accept_share',partner:'regular'}),packet=JSON.parse(encodeSave(active,0,w));packet.state.economy.shared.host='pocket';expect(()=>decodeSave(JSON.stringify(packet),w)).toThrow();
 const old=structuredClone(saved);old.version=16;expect(()=>decodeSave(JSON.stringify(old),w)).toThrow(/supported/);
});

it('does not buy from a closed counter and rejects unreachable authored supply',()=>{
 const closed=compile(text.replace('world(size=', 'daylight(cycle_s=120,start_hour=23);\nworld(size=').replace('credits=100,radius=80)', 'credits=100,radius=80,hours=[8,17])'));
 const s=ready(closed);expect(s.economy!.invitation).toBeUndefined();expect(account(s,'regular').credits).toBe(20);expect(account(s,'regular').inventory.bread).toBe(0);
 expect(()=>compile(text.replace('at=[710,700]','at=[2500,1700]'))).toThrow(/counter|reach/);
 expect(()=>compile(text.replace('credits=20,capacity=4,satiety=65','credits=20,capacity=1,satiety=65'))).toThrow(/capacity|two/);
});
