import {it,expect} from 'vitest';
import source from '../docs/examples/companion-recipes.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,checkEconomyState,commerceReason,milestoneProgress,hasMilestone,workQualified} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {encodeSave,decodeSave} from '../src/sim/save';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
const identity={sceneId:'peer-recipes',revisionId:'test',sourceHash:'peer-recipes'},scene=compileDreamScene(source,identity),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const account=(s:CarState,id='regular')=>s.economy!.accounts.find(a=>a.id===id)!,job=scene.economy!.jobs.find(j=>j.id==='large_bake')!;
const start=()=>({...createCarAtSpawn(scene),x:900,y:730});
function tick(s:CarState){const next=stepCommerce({...s,npcs:stepNpcs(s,.25,scene,false),timeS:s.timeS+.25},{},.25,scene);checkEconomyState(next,scene);return next;}
function until(s:CarState,p:(s:CarState)=>boolean){for(let i=0;i<1600 && !p(s);i++)s=tick(s);expect(p(s)).toBe(true);return s;}
const returning=()=>until(start(),s=>s.economy?.gathering?.phase==='home');

it('compiles, links and formats explicit peer milestones and diagnoses invalid pairs at the peer field',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));expect(compileDreamScene(formatDream(source),identity)).toEqual(scene);
 expect(compileDreamScene('dream 2; include district(module=paired);',identity,{paired:source}).economy).toEqual(scene.economy);
 for(const text of [source.replace('peer=friend_account','peer=pocket'),source.replace('peer=friend_account','peer=regular'),source.replace('peer=friend_account','peer=baker'),source.replace('peer=friend_account','peer=missing'),source.replace('kind=shared_meal,task=regular,peer=friend_account','kind=work,task=bake,peer=friend_account')]){
  const r=checkDream(text);expect(r.ok).toBe(false);if(!r.ok){expect(r.diagnostics[0]!.code).toBe('E_ECONOMY');expect(r.diagnostics[0]!.path).toContain('/peer');}
 }
 const guarded=checkDream(source.replace('on talk(event=interact,to=hello,radius=55);','on talk(event=interact,to=hello,radius=55,requires=pair_recipe);'));expect(guarded.ok).toBe(false);if(!guarded.ok)expect(guarded.diagnostics[0]!.message).toContain('player conversation');
});
it('accepts five distinct production choices and rejects a sixth without changing concurrent work capacity',()=>{
 const extra=['second','third','fourth','fifth'].map(id=>'work '+id+'(label="Bread",market=corner,input=flour,output=bread,take=1,make=3,seconds=4,pay=2,effort=4,capacity=1,target=12);').join('\n');
 const five=source.replace('works=[large_bake,bake]','works=[large_bake,bake,second,third,fourth]').replace('work bake(',extra+'\nwork bake(');expect(checkDream(five).ok).toBe(true);
 const six=checkDream(five.replace('works=[large_bake,bake,second,third,fourth]','works=[large_bake,bake,second,third,fourth,fifth]'));expect(six.ok).toBe(false);if(!six.ok)expect(six.diagnostics[0]!.path).toContain('/works');
});
it('qualifies exactly the two participants after consumption, without paying them or crediting a stranger',()=>{
 const snapshot=JSON.stringify(scene),s=returning();expect(s.economy!.peerHistory?.['bread_break/regular/friend_account']?.meals).toBe(1);
 for(const id of ['regular','friend_account']){expect(milestoneProgress(s,scene,id,'pair_recipe')).toMatchObject({done:1,applicable:true});expect(workQualified(s,scene,id,job)).toBe(true);}
 for(const id of ['pocket','baker']){expect(milestoneProgress(s,scene,id,'pair_recipe')).toMatchObject({done:0,applicable:false});expect(hasMilestone(s,scene,id,'pair_recipe')).toBe(false);}
 expect(account(s).credits).toBe(10);expect(account(s,'pocket').credits).toBe(20);expect(account(s).completed.work.large_bake).toBe(0);expect(s.economy!.consumed.bread).toBe(2);expect(commerceReason(s,scene,'regular',{kind:'work',job:'large_bake'})).toBe('busy');expect(JSON.stringify(scene)).toBe(snapshot);
});
it('returns before taking real work, consumes finite flour and pays one completed batch through the existing transaction',()=>{
 let s=returning();const flour=s.economy!.markets[0]!.stock.flour!;s=until(s,s=>account(s).work?.id==='large_bake');expect(s.economy!.gathering).toBeUndefined();const cash=account(s).credits,stock={...s.economy!.markets[0]!.stock};expect(cash).toBe(0);expect(account(s).inventory.bread).toBe(2);expect(stock.flour).toBe(flour-2);
 s=until(s,s=>account(s).completed.work.large_bake===1);expect(account(s).credits).toBe(cash+5);expect(s.economy!.markets[0]!.stock.bread).toBe(stock.bread!+5);expect(account(s,'pocket').completed.work.large_bake).toBe(0);checkEconomyState(s,scene);
});
it('keeps partial and damaged meals locked and refunds the actual donor without rewarding a cancellation',()=>{
 let s=until(start(),s=>s.economy?.gathering?.phase==='eat');expect(hasMilestone(s,scene,'regular','pair_recipe')).toBe(false);const before=account(s).inventory.bread;s=tick({...s,broken:['lunch_bench']});expect(s.economy!.gathering?.phase).toBe('home');expect(account(s).inventory.bread).toBe(before!+2);expect(s.economy!.consumed.bread).toBe(0);expect(hasMilestone(s,scene,'friend_account','pair_recipe')).toBe(false);expect(account(s).completed.work.large_bake).toBe(0);
});
it('uses the exact host and peer history rather than global meals, reversed keys or the legacy player relationship',()=>{
 const s=returning(),other=compileDreamScene(source.replace('peer=friend_account,',''),identity);expect(hasMilestone(s,other,'regular','pair_recipe')).toBe(false);
 const threshold=compileDreamScene(source.replace('peer=friend_account,count=1','peer=friend_account,count=2'),identity);expect(milestoneProgress(s,threshold,'regular','pair_recipe')!.done).toBe(1);expect(hasMilestone(s,threshold,'regular','pair_recipe')).toBe(false);
 const reversed=structuredClone(s);reversed.economy!.peerHistory={'bread_break/friend_account/regular':{meals:1,lastAtS:s.timeS}};expect(hasMilestone(reversed,scene,'regular','pair_recipe')).toBe(false);expect(()=>encodeSave(reversed,s.timeS,world)).toThrow();
});
it('replays qualified work exactly, retains memory on R, resets it on Start over and rejects forged active eligibility',()=>{
 let s=until(returning(),s=>account(s).work?.id==='large_bake');const text=encodeSave(s,s.timeS,world);let copy=decodeSave(text,world).state;
 for(let i=0;i<12;i++){s=tick(s);copy=tick(copy);}expect(copy).toEqual(s);expect(hasMilestone(resetCar(s,scene),scene,'regular','pair_recipe')).toBe(true);expect(hasMilestone(resetCar(s,scene,true),scene,'regular','pair_recipe')).toBe(false);
 for(const mutate of [(p:any)=>delete p.state.economy.peerHistory,(p:any)=>p.state.economy.peerHistory['bread_break/regular/friend_account'].meals=100]){const p=JSON.parse(text);mutate(p);expect(()=>decodeSave(JSON.stringify(p),world)).toThrow();}
});
