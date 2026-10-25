import {it,expect} from 'vitest';
import source from '../docs/examples/company-needs.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,type CommerceAction} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {worldSeats} from '../src/scene/seating';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
const identity={sceneId:'company',revisionId:'test',sourceHash:'company'},scene=compileDreamScene(source,identity);
const account=(s:CarState,id='regular')=>s.economy!.accounts.find(a=>a.id===id)!;
const world=(doc:typeof scene):World=>({scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(4000,2400),carRadius:11});
function tick(s:CarState,doc=scene,commerce?:CommerceAction){const next=stepCommerce({...s,npcs:stepNpcs(s,.25,doc),timeS:s.timeS+.25},{commerce},.25,doc);checkEconomyState(next,doc);return next;}
function until(s:CarState,test:(s:CarState)=>boolean,doc=scene){for(let i=0;i<2400 && !test(s);i++)s=tick(s,doc);expect(test(s)).toBe(true);return s;}
it('compiles numeric need expressions, canonical source and field-specific bounded diagnostics',()=>{
 const expressions=compileDreamScene(source.replace('dream 2;','dream 2;let social_initial(value=10);').replace('initial=20','initial=social_initial*2'),identity);expect(expressions.economy!.accounts.find(a=>a.id==='regular')!.company?.initial).toBe(20);
 expect(scene.economy!.accounts.find(a=>a.id==='regular')!.company).toEqual({initial:20,drainPerS:.05,below:35,gain:30});expect(compileDreamScene(formatDream(source),identity)).toEqual(scene);
 for(const [a,b] of [['initial=20','initial=101'],['drain_s=.05,below','drain_s=.3,below'],['below=35','below=100'],['gain=30','gain=0'],['gain=30','gain=101'],['gain=30','gain=evil'],['gain=30','gain=30,extra=1'],['need(initial','unknown(initial']])expect(checkDream(source.replace(a!,b!)).ok,b).toBe(false);
 const bad=checkDream(source.replace('gain=30','gain=0'));expect(bad.ok).toBe(false);if(!bad.ok)expect(bad.diagnostics[0]!.path).toContain('company/need/gain');
 expect(checkDream(source.replace('account baker(actor=','account baker(company=need(initial=30,drain_s=.05,below=35,gain=30),actor=')).ok).toBe(false);
});
it('uses the social need before buying a pair, while leaving ordinary hunger and finite trade intact',()=>{
 const high=compileDreamScene(source.replace('initial=20','initial=80'),identity);let s=createCarAtSpawn(high);for(let i=0;i<160;i++)s=tick(s,high);expect(account(s).company).toBeCloseTo(78);expect(s.economy!.gathering).toBeUndefined();expect(s.economy!.markets[0]!.stock.bread).toBe(8);expect(account(s).credits).toBe(20);
 const low=tick(createCarAtSpawn(scene));expect(low.economy!.gathering).toBeDefined();expect(account(low).credits).toBe(10);expect(low.economy!.markets[0]!.stock.bread).toBe(6);expect(account(low).company).toBeCloseTo(19.9875);
});
it('stocks a paid pair before a counter closes when company will be due before its next opening',()=>{
 const text=source.replace('dream 2;','dream 2;daylight(cycle_s=600,start_hour=10);').replace('initial=20','initial=50').replace('market corner(label=','market corner(hours=[6,22],label='),doc=compileDreamScene(text,identity);let s=tick(createCarAtSpawn(doc),doc);expect(s.economy!.gathering).toBeUndefined();expect(account(s).company).toBeGreaterThan(35);expect(account(s).credits).toBe(10);expect(account(s).inventory.bread).toBe(2);expect(s.economy!.markets[0]!.stock.bread).toBe(6);
 s=until(s,s=>!!s.economy!.gathering,doc);expect(s.timeS).toBeGreaterThanOrEqual(300);expect(account(s).credits).toBe(10);expect(s.economy!.markets[0]!.stock.bread).toBe(6);
});
it.each(['all-day','no-drain'])('does not prefetch solely for a closure with %s supply/need',kind=>{
 const text=source.replace('dream 2;','dream 2;daylight(cycle_s=600,start_hour=10);').replace('initial=20,drain_s=.05',`initial=80,drain_s=${kind==='no-drain' ? 0 : .05}`).replace('market corner(label=',`market corner(hours=${kind==='all-day' ? '[0,24]' : '[6,22]'},label=`),doc=compileDreamScene(text,identity),s=tick(createCarAtSpawn(doc),doc);expect(s.economy!.gathering).toBeUndefined();expect(s.economy!.markets[0]!.stock.bread).toBe(8);expect(account(s).credits).toBe(20);
});
it('keeps empty company bounded and does not restore it for solitary purchased food',()=>{
 const doc=compileDreamScene(source.replace('initial=65','initial=0'),identity);let s=createCarAtSpawn(doc);s={...s,control:{kind:'foot'},vehicles:[{id:null,x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,distance:0}],x:750,y:730,elevation:0};s=tick(s,doc,{kind:'buy',market:'corner',good:'bread'});expect(account(s,'pocket').inventory.bread).toBe(1);s=tick(s,doc,{kind:'eat',good:'bread'});expect(account(s,'pocket').company).toBe(0);expect(account(s,'pocket').satiety).toBeGreaterThan(60);expect(s.economy!.consumed.bread).toBe(1);
});
it('restores only the two actual residents after completion, without player credit or a second purchase after cooldown',()=>{
 const doc=compileDreamScene(source.replace('cooldown_s=600','cooldown_s=30'),identity);let s=until(createCarAtSpawn(doc),s=>s.economy?.gathering?.phase==='eat',doc),host=account(s).company!,guest=account(s,'friend_account').company!,pocket=account(s,'pocket').company!;
 s=until(s,s=>s.economy?.gathering?.phase==='home',doc);expect(account(s).company).toBeGreaterThan(host+29);expect(account(s,'friend_account').company).toBeGreaterThan(guest+29);expect(account(s,'pocket').company).toBeLessThan(pocket);expect(s.economy!.consumed.bread).toBe(2);const money=account(s).credits,stock=s.economy!.markets[0]!.stock.bread;
 for(let i=0;i<240;i++)s=tick(s,doc);expect(s.economy!.gathering).toBeUndefined();expect(account(s).credits).toBe(money);expect(s.economy!.markets[0]!.stock.bread).toBe(stock);expect(s.economy!.peerHistory?.['bread_break/regular/friend_account']?.meals).toBe(1);
});
it('does not restore company for a broken-seat cancellation and refunds its actual donor once',()=>{
 let s=until(createCarAtSpawn(scene),s=>s.economy?.gathering?.phase==='eat'),need=account(s).company!;s=tick({...s,broken:['lunch_bench']});expect(account(s).company).toBeCloseTo(need-.0125);expect(account(s).inventory.bread).toBe(2);expect(s.economy!.peerHistory).toBeUndefined();expect(s.economy!.consumed.bread).toBe(0);
 s=until(s,s=>!s.economy!.gathering);expect(account(s).inventory.bread).toBe(2);expect(s.economy!.events.filter(e=>e.kind==='share_cancelled')).toHaveLength(1);
});
it('allows a deliberate player invitation at high company and clamps both completed gains',()=>{
 const doc=compileDreamScene(source.replace('initial=65','initial=95').replace('initial=20','initial=95').replace('peers=[friend_account],',''),identity);let s=createCarAtSpawn(doc);s={...s,control:{kind:'foot'},vehicles:[{id:null,x:s.x,y:s.y,elevation:s.elevation,headingRad:s.headingRad,distance:0}],x:750,y:730,elevation:0};
 s=tick(s,doc,{kind:'buy',market:'corner',good:'bread'});s=tick(s,doc,{kind:'buy',market:'corner',good:'bread'});expect(account(s,'pocket').inventory.bread).toBe(2);const seat=worldSeats(doc)[0]!;s={...s,x:seat.x,y:seat.y,elevation:seat.elevation,headingRad:seat.headingRad,seated:{objectId:seat.objectId,seatId:seat.seatId},npcs:s.npcs.map(n=>n.id==='customer' ? {...n,known:true} : n)};
 s=tick(s,doc,{kind:'share',partner:'regular'});expect(s.economy!.shared).toBeDefined();s=until(s,s=>s.economy?.shared?.phase==='home',doc);expect(account(s,'pocket').company).toBe(100);expect(account(s).company).toBe(100);expect(s.economy!.consumed.bread).toBe(2);expect(account(s,'friend_account').company).toBeLessThan(60);
});
it('preserves decay, journeys and pending gains through reload and R, then replays completion exactly',()=>{
 let s=until(createCarAtSpawn(scene),s=>s.economy?.gathering?.phase==='eat');const w=world(scene),text=encodeSave(s,s.timeS,w),restored=decodeSave(text,w).state;expect(restored).toEqual(JSON.parse(text).state);expect(resetCar(s,scene).economy).toEqual(s.economy);let copy=restored;
 for(let i=0;i<100;i++){s=tick(s);copy=tick(copy);}expect(copy).toEqual(s);expect(s.economy!.peerHistory?.['bread_break/regular/friend_account']?.meals).toBe(1);expect(account(createCarAtSpawn(scene)).company).toBe(20);
 for(const change of [(p:any)=>delete p.state.economy.accounts.find((a:any)=>a.id==='regular').company,(p:any)=>p.state.economy.accounts.find((a:any)=>a.id==='baker').company=50,(p:any)=>p.state.economy.accounts[0].company=101]){const p=JSON.parse(text);change(p);expect(()=>decodeSave(JSON.stringify(p),w)).toThrow();}
});
