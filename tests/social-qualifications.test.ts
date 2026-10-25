import {it,expect} from 'vitest';
import source from '../docs/examples/shared-recipe.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {worldSeats} from '../src/scene/seating';
import {walkingHeight} from '../src/scene/interiors';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,commerceReason,checkEconomyState,hasMilestone,workQualified,type CommerceAction} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {toggleRide} from '../src/sim/interaction';
import {checkSeatingState} from '../src/sim/seating';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
const compile=(text=source)=>compileDreamScene(text,{sceneId:'shared-recipe',revisionId:'test',sourceHash:'shared-recipe'}),accepted=compile();
const manual=(scene=accepted)=>parseScene({...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>({...a,works:undefined}))}});
const scene=manual(),account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!,job=(d=scene)=>d.economy!.jobs.find(j=>j.id==='large_bake')!;
const world=(d=scene):World=>({scene:d,roadMask:buildMaskForScene(d),driveMask:buildPaperMask(4000,2400),carRadius:11});
const start=(d=scene):CarState=>({...createCarAtSpawn(d),control:{kind:'foot'},x:600,y:730,elevation:0,surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]});
function tick(s:CarState,d=scene,action?:CommerceAction,talk=false){const next=stepCommerce({...s,npcs:stepNpcs(s,.25,d,talk),timeS:s.timeS+.25},{commerce:action},.25,d);checkEconomyState(next,d);checkSeatingState(next,d);return next;}
function until(s:CarState,test:(s:CarState)=>boolean,d=scene,limit=1200){for(let i=0;i<limit && !test(s);i++)s=tick(s,d);expect(test(s)).toBe(true);return s;}
function invitation(d=scene){let s=start(d);for(let i=0;i<2;i++)s=tick(s,d,{kind:'buy',market:'corner',good:'bread'});s=tick(s,d,undefined,true);expect(s.npcs.find(n=>n.id==='neighbor')!.known).toBe(true);s=until(s,s=>s.timeS>=6,d);const seat=worldSeats(d)[0]!;s={...s,x:seat.approach.x,y:seat.approach.y,elevation:walkingHeight(d,seat.approach.x,seat.approach.y)};s=toggleRide(s,world(d));expect(s.seated).toBeDefined();s=tick(s,d,{kind:'share',partner:'baker'});expect(s.economy!.shared?.phase).toBe('out');return s;}
function completed(d=scene){return until(invitation(d),s=>!s.economy!.shared,d);}
it('accepts the runnable source and rejects unknown, duplicate, oversized and conflicting alternatives and wrong relationship owners',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(job().requires_any).toEqual(['practiced_baker','table_friend']);
 for(const text of [source.replace('task=baker,count=1','task=pocket,count=1'),source.replace('task=baker,count=1','task=absent,count=1'),source.replace('task=baker,count=1','task=corner,count=1'),source.replace('requires_any=[practiced_baker,table_friend]','requires_any=[]'),source.replace('requires_any=[practiced_baker,table_friend]','requires_any=[table_friend,table_friend]'),source.replace('requires_any=[practiced_baker,table_friend]','requires_any=[unknown]'),source.replace('requires_any=[practiced_baker,table_friend]','requires=practiced_baker,requires_any=[table_friend]'),source.replace('requires_any=[practiced_baker,table_friend]','requires_any=[a,b,c,d,e]')])expect(checkDream(text).ok).toBe(false);
});
it('rejects a prerequisite cycle through any branch, even beside a valid social alternative',()=>{
 const text=source.replace('target=4);','target=4,requires_any=[larger_done,table_friend]);').replace('milestone practiced_baker','milestone larger_done(label="Larger batch",kind=work,task=large_bake,count=1);\n milestone practiced_baker');const result=checkDream(text);expect(result.ok).toBe(false);if(!result.ok)expect(result.diagnostics[0]!.message).toContain('cycle');
});
it('unlocks both actual meal participants, leaving strangers and global activity unqualified without awarding resources',()=>{
 const before=JSON.stringify(scene);let s=start();expect(commerceReason(s,scene,'pocket',{kind:'work',job:'large_bake'})).toBe('qualification');s=completed();expect(hasMilestone(s,scene,'pocket','table_friend')).toBe(true);expect(hasMilestone(s,scene,'baker','table_friend')).toBe(true);expect(hasMilestone(s,scene,'regular','table_friend')).toBe(false);expect(workQualified(s,scene,'pocket',job())).toBe(true);expect(workQualified(s,scene,'regular',job())).toBe(false);
 expect(account(s).credits).toBe(10);expect(account(s,'baker').credits).toBe(0);expect(s.economy!.consumed.bread).toBe(2);expect(account(s).completed.work).toEqual({bake:0,large_bake:0});expect(JSON.stringify(scene)).toBe(before);
});
it('keeps partial or cancelled meals locked and refunds the real donor once',()=>{
 let s=invitation();expect(hasMilestone(s,scene,'pocket','table_friend')).toBe(false);s=until(s,s=>s.economy!.shared?.phase==='eat');expect(hasMilestone(s,scene,'baker','table_friend')).toBe(false);s=tick(s,scene,{kind:'cancel'});s=until(s,s=>!s.economy!.shared);expect(account(s).inventory.bread).toBe(2);expect(s.economy!.consumed.bread).toBe(0);expect(workQualified(s,scene,'pocket',job())).toBe(false);expect(account(s).credits).toBe(10);
});
it('uses the ordinary open-counter transaction and pays a relationship-qualified player exactly once',()=>{
 let s=completed();s=toggleRide(s,world());s={...s,x:600,y:730,elevation:0};expect(commerceReason(s,scene,'pocket',{kind:'work',job:'large_bake'})).toBe('closed');s=until(s,s=>s.timeS>=86);const stock={...s.economy!.markets[0]!.stock},cash=account(s).credits;s=tick(s,scene,{kind:'work',job:'large_bake'});expect(account(s).work?.id).toBe('large_bake');const text=encodeSave(s,s.timeS,world()),copy=decodeSave(text,world()).state;expect(copy).toEqual(JSON.parse(text).state);s=until(copy,s=>!account(s).work);expect(account(s).credits).toBe(cash+5);expect(s.economy!.markets[0]!.stock).toEqual({...stock,flour:stock.flour!-2,bread:stock.bread!+5});expect(account(s).completed.work.large_bake).toBe(1);expect(account(s).completed.work.bake).toBe(0);s=until(s,s=>s.timeS>=100);expect(account(s).credits).toBe(cash+5);
});
it('lets the NPC participant use the same relationship gate for real finite work without crediting the player',()=>{
 let s=completed(accepted);expect(account(s,'baker').completed.work.large_bake).toBe(0);s=until(s,s=>account(s,'baker').completed.work.large_bake!>0,accepted);expect(account(s,'baker').credits).toBe(5);expect(account(s,'baker').completed.work.bake).toBe(0);expect(account(s).completed.work.large_bake).toBe(0);expect(account(s).credits).toBe(10);
});
it('retains the original practice route when no meals were shared',()=>{
 const d=manual(compile(source.replace('satiety=40','satiety=90').replace('quantity=8,limit=16','quantity=1,limit=16').replace('hours=[6,22]','hours=[0,24]')));let s=start(d);for(let i=0;i<3;i++){s=tick(s,d,{kind:'work',job:'bake'});expect(account(s).work?.id).toBe('bake');s=until(s,s=>!account(s).work,d);}
 expect(hasMilestone(s,d,'pocket','table_friend')).toBe(false);expect(workQualified(s,d,'pocket',job(d))).toBe(true);s=tick(s,d,{kind:'work',job:'large_bake'});expect(account(s).work?.id).toBe('large_bake');s=until(s,s=>!account(s).work,d);expect(account(s).credits).toBe(34);
});
it('keeps earned eligibility through exact save replay and R, and clears it only on Start over',()=>{
 const s=completed(),w=world(),text=encodeSave(s,s.timeS,w),restored=decodeSave(text,w).state;expect(restored).toEqual(JSON.parse(text).state);expect(workQualified(restored,scene,'pocket',job())).toBe(true);expect(tick(restored).economy).toEqual(tick(s).economy);expect(workQualified(resetCar(s,scene),scene,'pocket',job())).toBe(true);expect(workQualified(resetCar(s,scene,true),scene,'pocket',job())).toBe(false);
 const bad=JSON.parse(text);bad.state.economy.socialHistory.baker.meals=100;expect(()=>decodeSave(JSON.stringify(bad),w)).toThrow();
});
