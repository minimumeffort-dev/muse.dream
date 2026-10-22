import {stepNpcs} from '../src/sim/npcs';
import {it,expect} from 'vitest';
import source from '../docs/examples/companion-meals.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {actorPose,workJourneyForActor} from '../src/sim/actors';
import {companionBusy,socialOffer} from '../src/sim/social';
import {checkSeatingState,seatClaimed} from '../src/sim/seating';
import {encodeSave,decodeSave} from '../src/sim/save';
import {worldSeats} from '../src/scene/seating';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {resetCar} from '../src/sim/car';
const scene=compileDreamScene(source,{sceneId:'companions',revisionId:'test',sourceHash:'companions'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const account=(s:CarState,id='regular')=>s.economy!.accounts.find(a=>a.id===id)!;
function tick(s:CarState,doc=scene){const n=stepCommerce({...s,npcs:stepNpcs(s,.25,doc),timeS:s.timeS+.25},{},.25,doc);checkEconomyState(n,doc);checkSeatingState(n,doc);return n;}
function until(s:CarState,test:(s:CarState)=>boolean,doc=scene){for(let i=0;i<600 && !test(s);i++)s=tick(s,doc);expect(test(s)).toBe(true);return s;}
it('compiles explicit companions, round trips and rejects missing/duplicate/player/self peers or missing supplies',()=>{
 expect(scene.economy!.socials[0]!.peers).toEqual(['friend_account']);expect(formatDream(formatDream(source))).toBe(formatDream(source));
 for(const [a,b] of [['peers=[friend_account]','peers=[missing]'],['peers=[friend_account]','peers=[friend_account,friend_account]'],['peers=[friend_account]','peers=[pocket]'],['peers=[friend_account]','peers=[regular]'],['markets=[corner],','']])expect(checkDream(source.replace(a!,b!)).ok,b).toBe(false);
});
it('buys real food, walks both people to exclusive seats, consumes once and records their mutual meal without player credit',()=>{
 const snapshot=JSON.stringify(scene);let s=until(createCarAtSpawn(scene),s=>!!s.economy?.gathering);expect(account(s).credits).toBe(10);expect(account(s).inventory.bread).toBe(0);expect(s.economy!.markets[0]!.stock.bread).toBe(6);expect(s.economy!.gathering!.portions).toBe(2);
 for(const id of ['regular','friend_account'])expect(companionBusy(s,id)).toBe(true);expect(socialOffer(s,scene,'regular').reason).toBe('range');
 let old=s.economy!.gathering!;while(s.economy!.gathering?.phase==='out'){s=tick(s);const t=s.economy!.gathering!;for(const side of ['hostTrip','guestTrip'] as const)expect(Math.hypot(t[side].x-old[side].x,t[side].y-old[side].y)).toBeLessThanOrEqual(3.500001);old=t;}
 const t=s.economy!.gathering!;expect(t.phase).toBe('eat');expect(seatClaimed(s,t.hostTrip.seat)).toBe(true);expect(seatClaimed(s,t.guestTrip.seat)).toBe(true);for(const actor of ['customer','friend'])expect(actorPose(scene,scene.objects.find(o=>o.id===actor)!,s.timeS,s).seatHeight).toBeGreaterThan(3);
 s=until(s,s=>s.economy!.gathering?.phase==='home');expect(s.economy!.consumed.bread).toBe(2);expect(s.economy!.peerHistory?.['bread_break/regular/friend_account']?.meals).toBe(1);expect(s.economy!.socialHistory).toBeUndefined();expect(account(s,'pocket').credits).toBe(20);expect(account(s,'friend_account').credits).toBe(7);
 s=until(s,s=>!s.economy!.gathering);expect(actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s)).toMatchObject({x:735,y:770});expect(actorPose(scene,scene.objects.find(o=>o.id==='friend')!,s.timeS,s)).toMatchObject({x:760,y:790});expect(workJourneyForActor(s,scene,'friend')).toBeUndefined();expect(JSON.stringify(scene)).toBe(snapshot);
});
it('refunds the donor once if furniture breaks and releases both seats before their real return walks',()=>{
 let s=until(createCarAtSpawn(scene),s=>s.economy?.gathering?.phase==='eat');const before=JSON.stringify(s);s=tick({...s,broken:['lunch_bench']});expect(s.economy!.gathering?.phase).toBe('home');expect(account(s).inventory.bread).toBe(2);expect(s.economy!.consumed.bread).toBe(0);expect(seatClaimed(s,{objectId:'lunch_bench',seatId:'left'})).toBe(false);
 s=until(s,s=>!s.economy!.gathering);expect(account(s).inventory.bread!+s.economy!.consumed.bread!).toBe(2);expect(account(s).credits).toBe(10);expect(s.economy!.peerHistory).toBeUndefined();expect(JSON.parse(before).economy.gathering.phase).toBe('eat');
});
it('preserves both paths, held food and timing through reload and R and rejects forged overlapping ownership/history',()=>{
 let s=until(createCarAtSpawn(scene),s=>!!s.economy?.gathering);const text=encodeSave(s,s.timeS,world);let replay=decodeSave(text,world).state;expect(resetCar(s,scene).economy).toEqual(s.economy);
 for(let i=0;i<180;i++){s=tick(s);replay=tick(replay);expect(replay).toEqual(s);}expect(s.economy!.peerHistory?.['bread_break/regular/friend_account']?.meals).toBe(1);
 for(const mutate of [(x:any)=>x.state.economy.gathering.guest='regular',(x:any)=>x.state.economy.gathering.portions=0,(x:any)=>x.state.economy.gathering.hostTrip.seat=x.state.economy.gathering.guestTrip.seat,(x:any)=>x.state.economy.peerHistory={'bread_break/regular/friend_account':{meals:5,lastAtS:0}}]){const bad=JSON.parse(text);mutate(bad);expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow('invalid');}
});

it.each(['funds','stock'])('does not partially buy social food when %s is insufficient',kind=>{
 const text=kind==='funds' ? source.replace('actor=customer,credits=20','actor=customer,credits=5') : source.replace('quantity=8,limit=16','quantity=1,limit=16'),doc=compileDreamScene(text,{sceneId:'poor-companion',revisionId:'test',sourceHash:'poor-companion'});let s=createCarAtSpawn(doc);
 for(let i=0;i<8;i++)s=tick(s,doc);expect(s.economy!.gathering).toBeUndefined();expect(account(s).credits).toBe(kind==='funds' ? 5 : 20);expect(account(s).inventory.bread).toBe(0);expect(s.economy!.markets[0]!.stock.bread).toBe(kind==='stock' ? 1 : 8);
});
it('leaves a player-occupied pair unavailable and preserves the ordinary seat claim',()=>{
 const seat=worldSeats(scene)[0]!,s={...createCarAtSpawn(scene),control:{kind:'foot'} as const,seated:{objectId:seat.objectId,seatId:seat.seatId},x:seat.x,y:seat.y,elevation:seat.elevation,headingRad:seat.headingRad,pitch:0,bank:0,surface:'paper' as const};
 let next:CarState=s;for(let i=0;i<12;i++)next=tick(next);expect(next.economy!.gathering).toBeUndefined();expect(seatClaimed(next,s.seated)).toBe(true);expect(next.economy!.peerHistory).toBeUndefined();
});
it("cannot interrupt the invited resident's already committed batch",()=>{
 const text=source.replace('at=[760,790]','at=[760,730]').replace('actor=friend,credits=7','work=bake,actor=friend,credits=7').replace('capacity=1,target=4','capacity=1,target=16'),doc=compileDreamScene(text,{sceneId:'busy-companion',revisionId:'test',sourceHash:'busy-companion'}),s=tick(createCarAtSpawn(doc),doc);
 expect(account(s,'friend_account').work?.id).toBe('bake');expect(s.economy!.gathering).toBeUndefined();expect(account(s,'friend_account').credits).toBe(7);
});
it('times out a blocked approach with one refund and no shared completion',()=>{
 let s=until(createCarAtSpawn(scene),s=>!!s.economy?.gathering);const at=s.economy!.gathering!.hostTrip.at;s={...s,control:{kind:'foot'},x:at.x,y:at.y,elevation:0};
 s=until(s,s=>s.economy!.gathering?.phase==='home');expect(s.timeS).toBeGreaterThan(120);expect(account(s).inventory.bread).toBe(2);expect(s.economy!.peerHistory).toBeUndefined();expect(s.economy!.events.filter(e=>e.kind==='share_cancelled')).toHaveLength(1);
});

it("holds a walking companion's route clock and returns to its exact interrupted position before resuming",()=>{
 const extra=`route friend_walk(kind=walk,mode=shuttle,speed=10){point(at=[780,790]);point(at=[800,790]);}
behavior friend_route(start=walking){state walking(action=patrol,face=none){on near(event=near_player,radius=20,to=waiting);}state waiting(action=idle,face=player){on away(event=far_player,radius=40,to=walking);}}
`;
 const text=source.replace('behavior companion(start=waiting){',extra+'street companion_link(width=60,sidewalk=12,points=[[500,638],[850,638]]);\nsurface friend_path(finish=terrain,walkable=true,points=[[768,680],[814,680],[814,808],[768,808]]);\nbehavior companion(start=waiting){').replace('place friend(object=pedestrian,at=[760,790],role=npc,behavior=welcome);','place friend(object=pedestrian,route=friend_walk,role=npc,behavior=friend_route);'),doc=compileDreamScene(text,{sceneId:'walking-peer',revisionId:'test',sourceHash:'walking-peer'});
 let s=until(createCarAtSpawn(doc),s=>!!s.economy?.gathering,doc);const home=s.economy!.gathering!.guestTrip.home,clock=s.npcs.find(n=>n.id==='friend')!.routeTimeS;expect(clock).toBeGreaterThan(0);expect(home.x).toBeGreaterThan(760);
 s=until(s,s=>!s.economy!.gathering,doc);expect(s.npcs.find(n=>n.id==='friend')!.routeTimeS).toBe(clock);expect(actorPose(doc,doc.objects.find(o=>o.id==='friend')!,s.timeS,s)).toMatchObject(home);s=tick(s,doc);expect(s.npcs.find(n=>n.id==='friend')!.routeTimeS).toBeGreaterThan(clock);
});
