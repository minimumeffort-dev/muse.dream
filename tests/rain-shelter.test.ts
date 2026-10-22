import {it,expect} from 'vitest';
import source from '../docs/examples/rain-shelter.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {worldSeats} from '../src/scene/seating';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {actorPose} from '../src/sim/actors';
import {checkSeatingState} from '../src/sim/seating';
import {encodeSave,decodeSave} from '../src/sim/save';
import {sheltered} from '../src/sim/shelter';
const compile=(text=source)=>compileDreamScene(text,{sceneId:'shelter',revisionId:'test',sourceHash:'shelter'}),scene=compile();
const worker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='regular')!;
const world=(doc=scene):World=>({scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(4000,2400),carRadius:11});
const start=(doc=scene):CarState=>({...createCarAtSpawn(doc),control:{kind:'foot'},x:900,y:730,elevation:0,vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]});
const tick=(s:CarState,doc=scene)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,doc)},{},.25,doc);
function seated(doc=scene){let s=start(doc);for(let i=0;i<360 && worker(s).resting?.phase!=='sit';i++)s=tick(s,doc);expect(worker(s).resting?.phase).toBe('sit');return s;}
it('checks covered furniture, weather and strict flag syntax in the complete runnable world',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(scene.economy!.rests![0]!.shelter).toBe(true);
 for(const text of [source.replace(/weather\([^;]+;/,''),source.replace('seats=[upper_settee]','seats=[upper_settee,lunch_bench]'),source.replace(/^\s*contact c_ceiling[^\n]*\n/m,''),source.replace('shelter=true','shelter=rain')])expect(checkDream(text).ok).toBe(false);
 const upper=worldSeats(scene).find(s=>s.objectId==='upper_settee')!,outdoor=worldSeats(scene).find(s=>s.objectId==='lunch_bench')!;expect(sheltered(scene,upper,4,18)).toBe(true);expect(sheltered(scene,outdoor,4,18)).toBe(false);
});
it('walks a healthy resident upstairs, shares real seating, waits through rain and physically returns',()=>{
 let s=start();for(let i=0;i<124;i++)s=tick(s);expect(worker(s).resting?.phase).toBe('out');expect(worker(s).energy).toBeGreaterThan(95);const home={...worker(s).resting!.home},clock=structuredClone(s.npcs.find(n=>n.id==='customer')),before=JSON.stringify(scene),phases=new Set<string>();
 for(let i=0;i<600 && worker(s).resting;i++){
  const t=worker(s).resting!;phases.add(t.phase);expect(s.npcs.find(n=>n.id==='customer')).toEqual(clock);expect(worker(s).credits).toBe(20);checkEconomyState(s,scene);checkSeatingState(s,scene);
  if(t.phase==='sit' && s.timeS<90){expect(worker(s).energy).toBeGreaterThan(85);expect(sheltered(scene,actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s),4,18,s)).toBe(true);}
  s=tick(s);
 }
 expect([...phases].sort()).toEqual(['home','out','sit']);expect(worker(s).resting).toBeUndefined();expect(actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s)).toMatchObject(home);expect(JSON.stringify(scene)).toBe(before);expect(s.economy!.consumed).toEqual({bread:0,flour:0,kit:0});
});
it('keeps an already covered healthy person at their routine and leaves unconfigured dry behavior alone',()=>{
 const indoor=compile(source.replace('at=[610,740]','at=[750,750]'));let s=start(indoor);for(let i=0;i<240;i++)s=tick(s,indoor);expect(worker(s).resting).toBeUndefined();expect(worker(s).credits).toBe(20);
 const dry=compile(source.replace('shelter=true','shelter=false'));s=start(dry);for(let i=0;i<240;i++)s=tick(s,dry);expect(worker(s).resting).toBeUndefined();
});
it('shares covered seat claims with the player rather than taking an occupied cushion',()=>{
 const seat=worldSeats(scene).find(s=>s.objectId==='upper_settee')!;let s:CarState={...start(),seated:{objectId:seat.objectId,seatId:seat.seatId},x:seat.x,y:seat.y,elevation:seat.elevation,headingRad:seat.headingRad};
 for(let i=0;i<360 && worker(s).resting?.phase!=='sit';i++)s=tick(s);expect(worker(s).resting?.phase).toBe('sit');expect(worker(s).resting?.seat?.seatId).not.toBe(seat.seatId);checkSeatingState(s,scene);checkEconomyState(s,scene);
});
it('releases broken shelter furniture without recovery, duplicate work or a prior-frame mutation',()=>{
 const s=seated(),snapshot=JSON.stringify(s),energy=worker(s).energy!,next=tick({...s,broken:['upper_settee']});expect(JSON.stringify(s)).toBe(snapshot);expect(worker(next).resting?.phase).toBe('home');expect(worker(next).resting?.seat).toBeUndefined();expect(worker(next).energy).toBeLessThan(energy);expect(worker(next).credits).toBe(20);checkEconomyState(next,scene);
});
it('cancels a healthy outward trip after a short shower while keeping its supported return continuous',()=>{
 const doc=compile(source.replace('rain_end_s=90','rain_end_s=40'));let s=start(doc),returned=false,sat=false;
 for(let i=0;i<320;i++){s=tick(s,doc);returned ||= worker(s).resting?.phase==='home';sat ||= worker(s).resting?.phase==='sit';checkEconomyState(s,doc);}
 expect(returned).toBe(true);expect(sat).toBe(false);expect(worker(s).resting).toBeUndefined();expect(worker(s).credits).toBe(20);
});
it('preserves each shelter phase and paused routine on reload and R, without an offline award',()=>{
 let s=start();const seen=new Set<string>();for(let i=0;i<600;i++){
  s=tick(s);const t=worker(s).resting;if(!t){if(seen.has('home'))break;continue;}if(seen.has(t.phase))continue;seen.add(t.phase);
  const text=encodeSave(s,s.timeS,world()),restored=decodeSave(text,world()).state;expect(restored).toEqual(JSON.parse(text).state);expect(resetCar(s,scene).economy).toEqual(s.economy);
  expect(tick(restored).economy).toEqual(tick(s).economy);
 }expect([...seen].sort()).toEqual(['home','out','sit']);
});
it('finishes an already committed paid batch before considering a weather break',()=>{
 const doc=compile(source.replace('good=bread,quantity=4,limit=16','good=bread,quantity=2,limit=16').replace('make=2,seconds=2,pay=3','make=2,seconds=60,pay=3'));let s=start(doc);
 for(let i=0;i<160 && !worker(s).work;i++)s=tick(s,doc);expect(worker(s).work).toBeDefined();while(s.timeS<40)s=tick(s,doc);expect(worker(s).work).toBeDefined();expect(worker(s).resting).toBeUndefined();
 for(let i=0;i<500 && !worker(s).completed.work.bake;i++)s=tick(s,doc);expect(worker(s).completed.work.bake).toBe(1);expect(worker(s).credits).toBe(23);checkEconomyState(s,doc);
});
