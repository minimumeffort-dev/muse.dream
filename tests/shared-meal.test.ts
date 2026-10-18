import {it,expect} from 'vitest';
import source from '../docs/examples/shared-meal.dream?raw';
import {compileDreamScene,formatDream,checkDream} from '../src/scene/dream';
import {worldSeats} from '../src/scene/seating';
import {walkingHeight} from '../src/scene/interiors';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,commerceReason,checkEconomyState,type CommerceAction} from '../src/sim/commerce';
import {stepNpcs,npcSpeech} from '../src/sim/npcs';
import {actorPose} from '../src/sim/actors';
import {toggleRide,stepInteractive} from '../src/sim/interaction';
import {checkSeatingState,seatClaimed} from '../src/sim/seating';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {socialOffer,socialArea,sharedMeals} from '../src/sim/social';
import {repairNavigation,primeRepairNavigation} from '../src/sim/repair';
import {workSegment} from '../src/sim/work-navigation';
const compile=(text=source)=>compileDreamScene(text,{sceneId:'shared-meal',revisionId:'r1',sourceHash:'shared-meal'});
const scene=compile(),worldFor=(doc=scene):World=>({scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(doc.canonical.width,doc.canonical.height),carRadius:11});
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
function tick(s:CarState,doc=scene,commerce?:CommerceAction,talk=false){const next=stepCommerce({...s,npcs:stepNpcs(s,.25,doc,talk),timeS:s.timeS+.25},{commerce},.25,doc);checkEconomyState(next,doc);checkSeatingState(next,doc);return next;}
function until(s:CarState,test:(s:CarState)=>boolean,doc=scene,limit=600){for(let i=0;i<limit && !test(s);i++)s=tick(s,doc);expect(test(s)).toBe(true);return s;}
function start(doc=scene,portions=2){let s:CarState={...createCarAtSpawn(doc),control:{kind:'foot'},x:600,y:730,elevation:0,surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]};for(let i=0;i<portions;i++)s=tick(s,doc,{kind:'buy',market:'corner',good:'bread'});const seat=worldSeats(doc)[0]!;s={...s,x:seat.approach.x,y:seat.approach.y,elevation:walkingHeight(doc,seat.approach.x,seat.approach.y)};s=toggleRide(s,worldFor(doc));return tick(s,doc,undefined,true);}
const invite=(s:CarState,doc=scene)=>tick(s,doc,{kind:'share',partner:'regular'});
it('compiles reusable social plans, canonical formatting and field-specific diagnostics',()=>{
 expect(scene.economy!.socials).toEqual([{id:'bread_break',good:'bread',seats:['lunch_bench'],on:'plaza',eat_s:8,cooldown_s:600,max_fullness:80}]);expect(formatDream(formatDream(source))).toBe(formatDream(source));
 for(const [a,b] of [['social=bread_break','social=missing'],['good=bread,seats','good=flour,seats'],['seats=[lunch_bench]','seats=[missing]'],['seats=[lunch_bench]','seats=[lunch_bench,lunch_bench]'],['on=plaza,','on=missing,'],['on=plaza,','on=plaza,grounds=[plaza],'],['eat_s=8','eat_s=13'],['cooldown_s=600','cooldown_s=29'],['max_fullness=80','max_fullness=101'],['shared_meals=1','shared_meals=0'],['shared_meals=1','shared_meals=1.5'],['event=interact,to=remembered,','event=near_player,to=remembered,'],['role=npc,behavior=companion','role=prop,behavior=companion'],['radius=8,height=57','radius=40,height=57']] as const){const changed=source.replace(a,b);expect(changed,b).not.toBe(source);expect(()=>compile(changed),b).toThrow();}
 expect(checkDream(source.replace('cooldown_s=600','cooldown_s=0'))).toMatchObject({ok:false,diagnostics:[{path:'dream/economy/social:bread_break/cooldown_s'}]});
});
it('reserves two owned portions and a second seat, physically walks over, eats once and remembers the shared time',()=>{
 const before=JSON.stringify(scene);let s=start();expect(s.npcs.find(n=>n.id==='customer')!.known).toBe(true);expect(socialOffer(s,scene,'regular').reason).toBeUndefined();
 const credits=account(s).credits,consumed=s.economy!.consumed.bread!,fullness=account(s,'regular').satiety;s=invite(s);expect(account(s).inventory.bread).toBe(0);expect(s.economy!.shared?.portions).toBe(2);expect(seatClaimed(s,s.economy!.shared!.seat)).toBe(true);expect(sharedMeals(s,scene,'customer')).toBe(0);
 let prior=s.economy!.shared!;while(s.economy!.shared?.phase==='out'){s=tick(s);const t=s.economy!.shared!;expect(Math.hypot(t.x-prior.x,t.y-prior.y)).toBeLessThanOrEqual(3.500001);expect(workSegment(scene,socialArea(scene,'regular'),prior,t,undefined,true)).toBe(true);prior=t;}
 expect(s.economy!.shared?.phase).toBe('eat');expect(actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s).seatHeight).toBeGreaterThan(3);expect(account(s,'regular').satiety).toBeLessThan(fullness);expect(sharedMeals(s,scene,'customer')).toBe(0);
 s=until(s,s=>s.economy!.shared?.phase==='home');expect(s.economy!.consumed.bread).toBe(consumed+2);expect(account(s).credits).toBe(credits);expect(account(s,'regular').satiety).toBeGreaterThan(fullness+40);expect(sharedMeals(s,scene,'customer')).toBe(1);
 s=until(s,s=>!s.economy!.shared);expect(actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s)).toMatchObject({x:735,y:770});expect(s.economy!.events.filter(e=>e.kind==='shared_meal')).toHaveLength(1);expect(JSON.stringify(scene)).toBe(before);
});
it('declines strangers, full people, unavailable food and occupied seats without changing the ledger',()=>{
 let s=start();const unknown={...s,npcs:s.npcs.map(n=>n.id==='customer' ? {...n,known:false} : n)};expect(socialOffer(unknown,scene,'regular').reason).toBe('unfamiliar');
 const full=structuredClone(s);account(full,'regular').satiety=90;expect(socialOffer(full,scene,'regular').reason).toBe('sated');
 const one=start(scene,1);expect(socialOffer(one,scene,'regular').reason).toBe('stock');const after=invite(one);expect(account(after).inventory.bread).toBe(1);expect(after.economy!.shared).toBeUndefined();
 expect(socialOffer({...s,seated:undefined},scene,'regular').reason).toBe('seat');expect(commerceReason(s,scene,'regular',{kind:'share',partner:'regular'})).toBe('busy');
});
it.each(['out','eat'] as const)('cancels in %s, refunds both portions once and walks home without awarding a meal',phase=>{
 let s=invite(start());if(phase==='eat')s=until(s,s=>s.economy!.shared?.phase==='eat');const clock=s.npcs.find(n=>n.id==='customer')!,at={x:s.economy!.shared!.x,y:s.economy!.shared!.y};
 expect(commerceReason(s,scene,'pocket',{kind:'eat',good:'bread'})).toBe('busy');s=tick(s,scene,{kind:'cancel'});expect(account(s).inventory.bread).toBe(2);expect(s.economy!.shared?.phase).toBe('home');expect(Math.hypot(s.economy!.shared!.x-at.x,s.economy!.shared!.y-at.y)).toBeLessThanOrEqual(3.500001);expect(s.economy!.consumed.bread).toBe(0);expect(sharedMeals(s,scene,'customer')).toBe(0);expect(s.npcs.find(n=>n.id==='customer')!.elapsedS).toBe(clock.elapsedS);
 s=tick(s,scene,{kind:'cancel'});expect(account(s).inventory.bread).toBe(2);s=until(s,s=>!s.economy!.shared);expect(s.economy!.socialHistory).toBeUndefined();
});
it('releases the player and invitation on the exact movement or destruction tick, retaining safe save ownership',()=>{
 const world=worldFor();let s=invite(start());s=until(s,s=>s.economy!.shared?.phase==='eat');const original=s;
 s=stepInteractive(s,{steer:1,throttle:0},1/120,world);expect(s.seated).toBeUndefined();expect(s.economy!.shared?.phase).toBe('home');expect(account(s).inventory.bread).toBe(2);expect(encodeSave(s,s.timeS,world)).toBeTypeOf('string');
 s=stepInteractive({...original,broken:['lunch_bench']},{steer:0,throttle:0},1/120,world);expect(s.seated).toBeUndefined();expect(s.economy!.shared?.phase).toBe('home');expect(account(s).inventory.bread).toBe(2);expect(encodeSave(s,s.timeS,world)).toBeTypeOf('string');
});
it.each(['out','eat','home'] as const)('persists and replays the %s phase, with no reset on R or frozen time',phase=>{
 let s=invite(start());s=until(s,s=>s.economy!.shared?.phase===phase);const world=worldFor(),text=encodeSave(s,s.timeS,world);let loaded=decodeSave(text,world).state;expect(loaded).toEqual(JSON.parse(JSON.stringify(s)));const reset=resetCar(s,scene);expect(reset.economy?.socialHistory).toEqual(s.economy?.socialHistory);expect(encodeSave(reset,reset.timeS,world)).toBeTypeOf('string');if(phase!=='home'){expect(reset.economy!.shared?.phase).toBe('home');expect(account(reset).inventory.bread).toBe(2);}
 const before=JSON.stringify(s);expect(JSON.stringify(s)).toBe(before);for(let i=0;i<120;i++){s=tick(s);loaded=tick(loaded);}expect(loaded).toEqual(s);
});
it('remembers completed meals in authored dialogue and enforces time between invitations',()=>{
 let s=invite(start());s=until(s,s=>!s.economy!.shared);s=until(s,s=>s.npcs.find(n=>n.id==='customer')!.stateId==='waiting');s=tick(s,scene,undefined,true);expect(npcSpeech(s,scene)?.text).toContain('meal we shared');
 expect(socialOffer(s,scene,'regular').reason).toBe('cooldown');const copy=decodeSave(encodeSave(s,s.timeS,worldFor()),worldFor()).state;expect(sharedMeals(copy,scene,'customer')).toBe(1);expect(socialOffer(copy,scene,'regular').reason).toBe('cooldown');
});
it('waits for a parked car rather than teleporting and resumes after it clears',()=>{
 let s=invite(start());s={...s,vehicles:s.vehicles.map(v=>v.id===null ? {...v,x:730,y:774} : v)};const before={x:s.economy!.shared!.x,y:s.economy!.shared!.y};
 for(let i=0;i<8;i++)s=tick(s);expect(s.economy!.shared).toMatchObject({...before,phase:'out',speed:0});
 s=decodeSave(encodeSave(s,s.timeS,worldFor()),worldFor()).state;s={...s,vehicles:s.vehicles.map(v=>v.id===null ? {...v,x:525,y:609} : v)};s=until(s,s=>s.economy!.shared?.phase==='eat');expect(sharedMeals(s,scene,'customer')).toBe(0);
});
it('rejects forged partners, duplicate seats, escrow, paths, timers and histories',()=>{
 let s=invite(start());s=until(s,s=>s.economy!.shared?.phase==='eat');const world=worldFor(),save=JSON.parse(encodeSave(s,s.timeS,world));
 for(const mutate of [(p:any)=>p.shared.partner='baker',(p:any)=>p.shared.portions=0,(p:any)=>p.shared.seat=p.shared.playerSeat,(p:any)=>p.shared.home.x+=10,(p:any)=>p.shared.path=[{x:10,y:10}],(p:any)=>p.shared.eatUntilS=s.timeS+100,(p:any)=>p.shared.startedAtS=s.timeS+10,(p:any)=>p.socialHistory={unknown:{meals:1,lastAtS:0}},(p:any)=>p.socialHistory={regular:{meals:1,lastAtS:s.timeS+10}}]){const bad=structuredClone(save);mutate(bad.state.economy);expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow();}
});
it('prepares actual body-sized topology even without a shift, courier or automatic meal policy',()=>{const packet=repairNavigation(scene);expect(packet.services.some(s=>s.id.startsWith('shift/'))).toBe(true);expect(()=>primeRepairNavigation({...scene},packet)).not.toThrow();});

it('builds remembered familiarity through three actual meals rather than repeated talk presses',()=>{
 const doc=compile(source.replace('food=45','food=5').replace('price=5','price=1').replace('cooldown_s=600','cooldown_s=30'));let s=start(doc,6);
 for(let i=1;i<=3;i++){
  s=invite(s,doc);s=until(s,s=>!s.economy!.shared,doc);expect(sharedMeals(s,doc,'customer')).toBe(i);
  const last=s.economy!.socialHistory!.regular!.lastAtS;s=until(s,s=>s.timeS>=last+30,doc);
 }
 s=until(s,s=>s.npcs.find(n=>n.id==='customer')!.stateId==='waiting',doc);s=tick(s,doc,undefined,true);expect(npcSpeech(s,doc)?.text).toBe('I look forward to these breaks with you.');expect(account(s).inventory.bread).toBe(0);expect(s.economy!.consumed.bread).toBe(6);
});
it('registers r63 migration without rewriting any saved field, reserves its old slot and refuses unrelated worlds',async()=>{
 const c=await import('../src/scene/save-compatibility'),{createWorldScene}=await import('../src/scene/world-fixture'),old=(await import('./fixtures/save-v13-r63-rest.json')).default,{gameSave}=await import('../src/game/save');
 const doc=createWorldScene(),hash=await c.sha256(c.saveCompatibilitySource(doc));expect(hash).toBe(c.SOCIAL_COMPATIBILITY);expect(await c.sha256(c.preSocialCompatibilitySource(doc))).toBe(c.SHIFT_COMPATIBILITY);
 const world={...worldFor(doc),saveCompatibility:hash,previousSocialSaveCompatibility:c.SHIFT_COMPATIBILITY},text=JSON.stringify(old),copy=decodeSave(text,world);expect(copy.migrated).toBe(true);expect(copy.state).toEqual(old.state);expect(copy.worldTime).toBe(old.worldTime);expect(copy.state.economy!.socialHistory).toBeUndefined();expect(decodeSave(encodeSave(copy.state,copy.worldTime,world),world).migrated).toBe(false);
 const key=`social.v13.${doc.sceneId}.${c.SHIFT_COMPATIBILITY}`,rows=new Map([[key,text]]),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}};const saves=gameSave(world,()=>storage,'social');expect(saves.restored?.state).toEqual(old.state);expect(saves.write(copy.state,copy.worldTime)).toBe(true);expect(rows.get(key)).toBe(text);rows.set(saves.key,'corrupt');expect(gameSave(world,()=>storage,'social').blocked).toBe(true);
 expect(()=>decodeSave(text,{...world,previousSocialSaveCompatibility:undefined})).toThrow();expect(()=>decodeSave(text,{...world,saveCompatibility:'f'.repeat(64)})).toThrow();
 for(const id of ['baker','school_staff']){const plan=doc.economy!.socials.find(p=>p.id===doc.economy!.accounts.find(a=>a.id===id)!.social)!;expect(plan.seats).toHaveLength(1);expect(socialArea(doc,id).radius).toBeGreaterThan(3);}
});

it('resumes the actual native shared meal once without repurchasing or losing the staffed-world state',async()=>{
 const {createWorldScene}=await import('../src/scene/world-fixture'),c=await import('../src/scene/save-compatibility'),old=(await import('./fixtures/save-v14-r64-shared-meal.json')).default,doc=createWorldScene(),world={...worldFor(doc),saveCompatibility:await c.sha256(c.saveCompatibilitySource(doc))};
 let state=decodeSave(JSON.stringify(old),world).state;expect(state).toEqual(old.state);expect(state.economy!.shared?.phase).toBe('eat');const consumed=state.economy!.consumed.bread!,credits=account(state).credits;
 for(let i=0;i<922;i++)state=stepInteractive(state,{steer:0,throttle:0},1/120,world);
 expect(state.economy!.shared).toBeUndefined();expect(state.economy!.socialHistory!.baker!.meals).toBe(1);expect(state.economy!.consumed.bread).toBe(consumed+2);expect(account(state).credits).toBe(credits);expect(account(state,'baker').shift?.phase).toBe('rest');expect(decodeSave(encodeSave(state,state.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(state)));
});
it('respects actual counter duty, declines a late invitation and refunds a blocked meal when the shift calls',()=>{
 const doc=compile(source.replace('world(size=','daylight(cycle_s=120,start_hour=21.5);\nworld(size=').replace('social=bread_break','social=bread_break,shift=companion_day').replace(' market corner(',` shift companion_day(market=companion_counter,rest=[735,730],on=plaza,lead_s=10);
 market companion_counter(label="Companion counter",actor=customer,credits=0,radius=70,hours=[6,22]){lot shelf(good=bread,quantity=0,limit=1,price=5);}
 market corner(`));
 let s=start(doc);expect(socialOffer(s,doc,'regular').reason).toBe('busy');s=until(s,s=>account(s,'regular').shift?.phase==='rest',doc);const ready=s;
 s=until(s,s=>s.timeS>=30,doc);expect(socialOffer(s,doc,'regular').reason).toBe('busy');s=invite(ready,doc);expect(s.economy!.shared?.phase).toBe('out');
 s={...s,vehicles:s.vehicles.map(v=>v.id===null ? {...v,x:730,y:738} : v)};s=until(s,s=>s.timeS>=32.75,doc);expect(s.economy!.shared?.phase).not.toBe('eat');expect(account(s).inventory.bread).toBe(2);expect(sharedMeals(s,doc,'customer')).toBe(0);expect(s.economy!.events.filter(e=>e.kind==='share_cancelled')).toHaveLength(1);
 const old=s;s=tick(s,doc);expect(account(s).inventory.bread).toBe(2);expect(old.economy!.accounts[0]!.inventory.bread).toBe(2);expect(encodeSave(s,s.timeS,worldFor(doc))).toBeTypeOf('string');
});

it('also protects upcoming counter attendance when an owner has hours without an explicit shift plan',()=>{
 const doc=compile(source.replace('world(size=','daylight(cycle_s=120,start_hour=21.5);\nworld(size=').replace(' market corner(',` market companion_counter(label="Companion counter",actor=customer,credits=0,radius=70,hours=[6,22]){lot shelf(good=bread,quantity=0,limit=1,price=5);}
 market corner(`));
 let s=start(doc);expect(socialOffer(s,doc,'regular').reason).toBe('busy');s=until(s,s=>s.timeS>=3,doc);expect(socialOffer(s,doc,'regular').reason).toBeUndefined();s=until(s,s=>s.timeS>=40,doc);expect(socialOffer(s,doc,'regular').reason).toBe('busy');s=invite(s,doc);expect(account(s).inventory.bread).toBe(2);expect(s.economy!.shared).toBeUndefined();
});
