import {expect,it} from 'vitest';
import source from '../docs/examples/on-foot-strike.dream?raw';
import sports from '../docs/examples/sports-practice.dream?raw';
import {compileDreamScene,formatDream,checkDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {toggleRide,stepInteractive} from '../src/sim/interaction';
import {strikeTarget,stepStrike} from '../src/sim/strike';
import {activeSport} from '../src/sim/sports';
import {commerceReason,checkEconomyState} from '../src/sim/commerce';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave,SAVE_VERSION} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {handReviewSteps,npcReviewStart} from '../src/game/review-start';
import {createWorldScene} from '../src/scene/world-fixture';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {waterAt} from '../src/scene/terrain';
import {dreamAgentContext} from '../src/scene/dream-agent';
import * as c from '../src/scene/save-compatibility';
const identity={sceneId:'strike',revisionId:'test',sourceHash:'strike'};
const scene=compileDreamScene(source,identity);
let live:Scene|undefined;const liveScene=()=>live??=c.preKitProductionScene(createWorldScene());
const world=(doc=scene):World=>({scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(doc.canonical.width,doc.canonical.height),carRadius:11});
const foot=(doc=scene,x=570,y=755):CarState=>({...toggleRide(createCarAtSpawn(doc),world(doc)),x,y,elevation:0,headingRad:0});
const hit={steer:0,throttle:0,strikePressed:true};
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;

it('compiles bounded world-owned strike data and exposes it through the interaction packet',()=>{
 expect(scene.strike).toEqual({reach:10,speed:100,cooldownS:.6});expect(formatDream(formatDream(source))).toBe(formatDream(source));
 expect(dreamAgentContext(['interactions']).contract.commands).toHaveProperty('strike');expect(dreamAgentContext(['interactions']).contract).toHaveProperty('striking');
 for(const declaration of ['strike(reach=0,speed=100,cooldown_s=.6);','strike(reach=17,speed=100,cooldown_s=.6);','strike(reach=10,speed=121,cooldown_s=.6);','strike(reach=10,speed=100,cooldown_s=.1);','strike(reach=10,speed=100,cooldown_s=3);'])expect(checkDream(source.replace('strike(reach=10,speed=100,cooldown_s=.6);',declaration)).ok).toBe(false);
 expect(checkDream(source+'\nstrike(reach=10,speed=100,cooldown_s=.6);').ok).toBe(false);
});

it('hits the nearest boundary in front, breaks only that prop and keeps player momentum and source intact',()=>{
 const s=foot(),before=JSON.stringify(s),target=strikeTarget(s,world());expect(target?.id).toBe('food_table');
 const next=stepStrike(s,hit,world());expect(next.broken).toEqual(['food_table']);expect(next.impacts).toMatchObject([{id:'food_table',kind:'break'}]);
 expect([next.x,next.y,next.vx,next.vy,next.elevation]).toEqual([s.x,s.y,s.vx,s.vy,s.elevation]);expect(next.strikeReadyAtS).toBe(.6);expect(JSON.stringify(s)).toBe(before);
 expect(strikeTarget({...s,headingRad:Math.PI},world())).toBeUndefined();expect(strikeTarget({...s,x:560},world())).toBeUndefined();expect(strikeTarget({...s,elevation:30},world())).toBeUndefined();
});

it('reuses bounce restitution without teleporting a ball across the reach or mutating the old state',()=>{
 const s=foot(scene,555,780),before=JSON.stringify(s),target=strikeTarget(s,world());expect(target?.id).toBe('loose_ball');
 const next=stepStrike(s,hit,world()),ball=next.props.find(p=>p.id==='loose_ball')!;
 expect(ball.vx).toBeCloseTo(174);expect(ball.vy).toBe(0);expect(ball.vz).toBeCloseTo(24);expect(ball.x).toBeCloseTo(565.35);expect(next.broken).toEqual([]);expect(JSON.stringify(s)).toBe(before);
 const normal=stepInteractive(next,{steer:0,throttle:0},1/120,world()),repeated=stepInteractive(next,hit,1/120,world());expect(repeated).toEqual(normal);
});

it('uses shared strength thresholds rather than granting every target immunity or automatic destruction',()=>{
 const stronger=parseScene({...scene,objects:scene.objects.map(o=>o.id==='food_table' ? {...o,spec:{...o.spec!,impact:{kind:'break',speed:110,scatter:30,lift:40,spin:2,lifetime:6}}} : o)}),s=foot(stronger),next=stepStrike(s,hit,world(stronger));
 expect(next.broken).toEqual([]);expect(next.strikeReadyAtS).toBe(.6);expect(next.impacts).toEqual([]);
});

it('respects exact walls and does not ignore an entire building when aiming at one break zone',()=>{
 const shield=`
object shield(label="Shield"){
 measure(kind=custom,axis=x,meters=2);
 body(interaction=solid,radius=16,height=20);
 contact core(at=[0,0,0],radius=4,height=20);
 part core_wall(shape=box,material=blue,at=[0,10,0],size=[8,20,8]);
 zone panel(at=[12,0,0],radius=4,height=10,mode=break(speed=60,scatter=20,lift=20,spin=2,lifetime=4)){
  part facing(shape=box,material=blue,at=[12,5,0],size=[8,10,8]);
 }
}
place shield_one(object=shield,at=[800,900],role=prop);`;
 const doc=compileDreamScene(source.replace('reach=10','reach=16')+shield,identity),s=foot(doc,792,900);
 expect(strikeTarget(s,world(doc))).toBeUndefined();expect(stepStrike(s,hit,world(doc)).brokenZones).toEqual([]);
 const low=compileDreamScene((source.replace('reach=10','reach=16')+shield).replace('radius=4,height=20','radius=4,height=1').replace('at=[0,10,0],size=[8,20,8]','at=[0,.5,0],size=[8,1,8]'),identity);
 expect(strikeTarget(foot(low,792,900),world(low))?.contact.zoneId).toBeDefined();
 expect(stepStrike(foot(low,792,900),hit,world(low)).brokenZones).toHaveLength(1);
});

it.each(['airborne','seated','car','passenger','disabled'] as const)('cannot strike while %s',mode=>{
 const doc=mode==='disabled' ? parseScene({...scene,strike:undefined}) : scene,s=foot(doc);
 if(mode==='airborne')s.grounded=false;if(mode==='seated')s.seated={objectId:'food_table',seatId:'test'};if(mode==='car')s.control={kind:'car'};if(mode==='passenger')s.control={kind:'passenger',id:'neighbor'};
 expect(stepStrike(s,hit,world(doc))).toBe(s);
});

it('keeps sports ownership of K and its ball, including on the sidelines',()=>{
 const base=compileDreamScene(sports+'\nstrike(reach=10,speed=100,cooldown_s=.6);',identity),ground=base.surfaces.find(s=>s.id===base.sports[0]!.surfaceId)!;
 const center=ground.points.reduce((p,v)=>({x:p.x+v.x/ground.points.length,y:p.y+v.y/ground.points.length}),{x:0,y:0});
 const loose=scene.objects.find(o=>o.id==='loose_ball')!,doc=parseScene({...base,objects:[...base.objects,{...loose,id:'unbound_ball',x:center.x+7,y:center.y}]}),s=foot(doc,center.x,center.y);
 expect(activeSport(s,doc)).toBeDefined();expect(strikeTarget(s,world(doc))).toBeUndefined();expect(stepStrike(s,hit,world(doc))).toBe(s);
 const unowned=parseScene({...doc,sports:[]});expect(strikeTarget(foot(unowned,center.x,center.y),world(unowned))).toBeDefined();
 const edge=foot(base,200,1800),ballId=base.sports[0]!.ballId;edge.props=edge.props.map(p=>p.id===ballId ? {...p,x:207,y:1800} : p);
 expect(activeSport(edge,base)).toBeUndefined();expect(strikeTarget(edge,world(base))).toBeUndefined();
});

it('interrupts paid work in the same fixed tick and lets ordinary finite repair restore production',()=>{
 const w=world();let s=foot();s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'work',job:'assemble_kit'}},1/120,w);
 // The player works at the other bench; the cook's lunch uses the table in reach.
 expect(account(s,'cook').work).toBeDefined();s=stepInteractive(s,hit,1/120,w);expect(s.broken).toContain('food_table');expect(account(s,'cook').work).toBeUndefined();
 expect(s.economy!.events.some(e=>e.reason==='equipment' && e.kind==='cancel')).toBe(true);expect(commerceReason(s,scene,'cook',{kind:'work',job:'pack_lunch'})).toBe('equipment');
 for(let i=0;i<120*20 && (s.broken.includes('food_table') || !account(s,'cook').completed.work.pack_lunch);i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,w);
 expect(s.broken).not.toContain('food_table');expect(account(s,'caretaker').completed.repair.workshop_repairs).toBe(1);expect(account(s,'cook').completed.work.pack_lunch).toBeGreaterThan(0);checkEconomyState(s,scene);
});

it('preserves cooldown, damage and momentum through reset and reload, with strict saved bounds',()=>{
 const w=world(),s=stepStrike(foot(),hit,w),saved=encodeSave(s,55,w),restored=decodeSave(saved,w).state;
 expect(SAVE_VERSION).toBe(19);expect(restored).toEqual(JSON.parse(saved).state);expect(resetCar(s,scene).strikeReadyAtS).toBe(s.strikeReadyAtS);expect(resetCar(s,scene,true).strikeReadyAtS).toBe(0);
 expect(stepStrike(s,hit,w)).toBe(s);expect(()=>encodeSave({...s,strikeReadyAtS:3},55,w)).toThrow('cooldown');
});

it('registers exact r83 state and the old slot, adding only an immediately ready hand cooldown',async()=>{
 const current=liveScene(),prior=c.preStrikeScene(current);expect(await c.sha256(c.preRecoveryCompatibilitySource(current))).toBe(c.STRIKE_COMPATIBILITY);expect(await c.sha256(c.preStrikeCompatibilitySource(current))).toBe(c.EQUIPMENT_COMPATIBILITY);expect(c.SAVE_SIMULATION_VERSION).toBe(35);
 expect(current.objects).toBe(prior.objects);expect(current.surfaces).toBe(prior.surfaces);const old={...world(prior),saveCompatibility:c.EQUIPMENT_COMPATIBILITY};let s=npcReviewStart(createCarAtSpawn(prior),old,'vendor');s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'work',job:'bake'}},1/120,old);
 const packet=JSON.parse(encodeSave(s,88,old));packet.version=17;const text=JSON.stringify(packet),w={...world(current),saveCompatibility:c.STRIKE_COMPATIBILITY,previousStrikeSaveCompatibility:c.EQUIPMENT_COMPATIBILITY},after=decodeSave(text,w);
 expect(after.migrated).toBe(true);expect(after.worldTime).toBe(88);expect(after.state).toEqual({...JSON.parse(JSON.stringify(s)),strikeReadyAtS:s.timeS});expect(decodeSave(encodeSave(after.state,88,w),w).state).toEqual(after.state);
 const oldKey=`muse-dream.save.v17.${current.sceneId}.${c.EQUIPMENT_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),slot=gameSave(w,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(slot.write(after.state,88)).toBe(true);expect(rows.get(oldKey)).toBe(text);expect(rows.size).toBe(2);
 expect(()=>decodeSave(text,{...w,previousStrikeSaveCompatibility:undefined})).toThrow('different world');
 const native={...w,previousEquipmentSaveCompatibility:c.SERVICE_COMPATIBILITY,previousServiceSaveCompatibility:c.CHARACTERS_COMPATIBILITY,previousServiceNavigation:ambientGraph(c.preServiceScene(prior))};let count=0;
 const fixtures=import.meta.glob('../docs/evidence/character-construction/native-*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
 for(const text of Object.values(fixtures)){if(JSON.parse(text).kind!=='dream-save')continue;const loaded=decodeSave(text,native);expect(loaded.migrated).toBe(true);expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,native),native).state).toEqual(JSON.parse(JSON.stringify(loaded.state)));count++;}expect(count).toBeGreaterThanOrEqual(4);
});

it('cannot hit from water even with an otherwise reachable prop',()=>{
 const wet=parseScene({...scene,terrain:{...scene.terrain,landscape:{dslVersion:1,bridges:[],waters:[{id:'puddle',polygon:[{x:530,y:730},{x:610,y:730},{x:610,y:810},{x:530,y:810}],level:5,depth:10,bankWidth:20,color:'#527a8c',flow:{x:0,y:0},dragPerS:1,waves:{speed:30,damping:1,strength:0}}]}}}),s=foot(wet,555,780);
 expect(waterAt(wet.terrain,s.x,s.y,s.elevation)).toBeDefined();expect(stepStrike(s,hit,world(wet))).toBe(s);
});
it('walks through the real doorway to a reachable table and starts one ordinary paid batch',()=>{
 const doc=liveScene(),w=world(doc),steps=handReviewSteps(createCarAtSpawn(doc),w,true);let result=steps.next();while(!result.done)result=steps.next();
 expect(strikeTarget(result.value,w)?.id).toBe('hall_table_east');expect(account(result.value).work?.id).toBe('bake');expect(result.value.broken).toEqual([]);
 const struck=stepInteractive(result.value,hit,1/120,w);expect(struck.broken).toContain('hall_table_east');expect(account(struck).work).toBeUndefined();checkEconomyState(struck,doc);
});

it('contains an instant ball impulse at the world edge before saving, retaining its upward lift',()=>{
 const w=world(),s=foot(scene,3990,1000);s.props=s.props.map(p=>p.id==='loose_ball' ? {...p,x:3997,y:1000} : p);
 const next=stepStrike(s,hit,w),ball=next.props.find(p=>p.id==='loose_ball')!;expect(ball.x).toBe(3997);expect(ball.vx).toBeLessThan(0);expect(ball.vz).toBeCloseTo(24);expect(()=>encodeSave(next,40,w)).not.toThrow();
});

it('retains the ordinary 560 speed cap when a fast ball approaches the hand',()=>{
 const s=foot(scene,555,780);s.props=s.props.map(p=>p.id==='loose_ball' ? {...p,vx:-560} : p);
 const next=stepStrike(s,hit,world()),ball=next.props.find(p=>p.id==='loose_ball')!;expect(ball.vx).toBeCloseTo(560);expect(Math.hypot(ball.vx,ball.vy)).toBeLessThanOrEqual(560);expect(()=>encodeSave(next,50,world())).not.toThrow();
});

it('connects the on-foot hit, one full refund, manual repair and a new paid batch in ordinary fixed ticks',()=>{
 const doc=liveScene(),w=world(doc),steps=handReviewSteps(createCarAtSpawn(doc),w,true);let result=steps.next();while(!result.done)result=steps.next();let s=result.value;
 for(let tick=0;tick<600*4;tick++)s=stepInteractive(s,{steer:0,throttle:0,...(tick===30*4 ? {strikePressed:true} : {}),...(tick===60*4 ? {commerce:{kind:'repair',repair:'market_tables'} as const} : tick===330*4 ? {commerce:{kind:'work',job:'bake'} as const} : {})},1/120,w);
 expect(s.broken).not.toContain('hall_table_east');expect(account(s).credits).toBe(27);expect(account(s).completed.work.bake).toBe(1);expect(account(s).completed.repair.market_tables).toBe(1);expect(s.economy!.events.some(e=>e.account==='pocket' && e.kind==='cancel' && e.reason==='equipment')).toBe(true);checkEconomyState(s,doc);
});
