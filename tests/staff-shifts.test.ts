import {saveCompatibilitySource} from './fixtures/pre-city-world';
import {preBusinessState} from './pre-business-state';
import {it,expect} from 'vitest';
import source from '../docs/examples/staff-shifts.dream?raw';
import previous from './fixtures/save-v12-r62-hours.json';
import {compileDreamScene,formatDream,checkDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepCommerce,commerceReason,checkEconomyState,type CommerceAction} from '../src/sim/commerce';
import {stepNpcs,nearbyNpc} from '../src/sim/npcs';
import {actorPose} from '../src/sim/actors';
import {repairView} from '../src/game/repair-view';
import {shiftArea} from '../src/sim/shifts';
import {workClear,workPath,workSegment} from '../src/sim/work-navigation';
import {marketIsOpen,marketIsStaffed} from '../src/sim/market-hours';
import {repairNavigation,primeRepairNavigation} from '../src/sim/repair';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {createWorldScene} from './fixtures/pre-city-world';
import {polygonArea,triangulatePolygon,subtractPolygons} from '../src/scene/polygons';
import {MATCH_COMPATIBILITY,BUSINESS_COMPATIBILITY,SCHOOL_REPAIR_COMPATIBILITY,SOCIAL_COMPATIBILITY,SHIFT_COMPATIBILITY,HOURS_COMPATIBILITY,preShiftScene,preShiftCompatibilitySource,sha256} from '../src/scene/save-compatibility';

const compile=(text=source)=>compileDreamScene(text,{sceneId:'shifts',revisionId:'r1',sourceHash:'shifts'});
const scene=compile();
const account=(s:CarState,id='baker')=>s.economy!.accounts.find(a=>a.id===id)!;
const start=(doc=scene):CarState=>({...createCarAtSpawn(doc),control:{kind:'foot'},x:580,y:750,elevation:0,surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]});
const step=(s:CarState,doc=scene,action?:CommerceAction,talk=false)=>stepCommerce({...s,npcs:stepNpcs(s,.25,doc,talk),timeS:s.timeS+.25},{commerce:action},.25,doc);
function until(s:CarState,done:(s:CarState)=>boolean,doc=scene,limit=1000){for(let i=0;i<limit && !done(s);i++)s=step(s,doc);expect(done(s)).toBe(true);return s;}
const worldFor=(doc:Scene):World=>({scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(doc.canonical.width,doc.canonical.height),carRadius:11});

it('compiles and formats daily shifts and rejects invalid ownership, references, grounds and schedules',()=>{
 expect(scene.economy!.shifts[0]).toMatchObject({id:'bakery_day',rest:{x:780,y:740},lead_s:18});
 expect(formatDream(formatDream(source))).toBe(formatDream(source));
 for(const [a,b] of [['shift=bakery_day','shift=missing'],['shift=bakery_day','shift=bakery_day,deliveries=[flour_run]'],['shift=bakery_day','shift=depot_night'],['shift=depot_night','shift=bakery_day'],['market=corner,rest','market=missing,rest'],['rest=[780,740]','rest=[580,710]'],['rest=[780,740]','rest=[900,600]'],['rest=[780,740]','rest=[780]'],['rest=[780,740]','rest=[4001,740]'],['lead_s=18','lead_s=121'],['lead_s=18','lead_s=40'],['on=plaza,lead_s=18','on=missing,lead_s=18'],['on=plaza,lead_s=18','on=plaza,grounds=[plaza],lead_s=18'],['hours=[6,22]','hours=[0,24]'],[',hours=[6,22]','']] as const)expect(()=>compile(source.replace(a,b)),b).toThrow();
 expect(checkDream(source.replace('lead_s=18','lead_s=-1'))).toMatchObject({ok:false,diagnostics:[{code:'E_ECONOMY',path:'dream/economy/shift:bakery_day/lead_s'}]});
 const wrong=structuredClone(scene);wrong.objects.find(o=>o.id==='neighbor')!.role='prop';expect(()=>parseScene(wrong)).toThrow();
});

it('finishes committed production after closing, then walks away without restarting work or changing the accepted scene',()=>{
 const before=JSON.stringify(scene);let s=until(start(),s=>s.timeS>=2.5);
 expect(account(s).work).toBeDefined();expect(account(s).shift).toBeUndefined();
 const paid=account(s).credits;s=until(s,s=>!!account(s).shift);expect(account(s).credits).toBe(paid+3);expect(account(s).work).toBeUndefined();
 let last=account(s).shift!;
 while(account(s).shift?.phase==='out'){const next=step(s),t=account(next).shift!;expect(Math.hypot(t.x-last.x,t.y-last.y)).toBeLessThanOrEqual(3.500001);expect(workSegment(scene,shiftArea(scene,scene.economy!.shifts[0]!),last,t,undefined,true)).toBe(true);last=t;s=next;checkEconomyState(s,scene);}
 expect(account(s).shift?.phase).toBe('rest');expect(account(s).completed.work.pack_lunch).toBe(2);expect(resetCar(s,scene).economy).toEqual(s.economy);expect(JSON.stringify(scene)).toBe(before);
});

it('keeps the rendered worker continuous when failed player purchases advance the real commerce clock',()=>{
 let s=until(start(),s=>account(s).shift?.phase==='out');
 const view=repairView(),worker=scene.objects.find(o=>o.id==='neighbor')!,begin=s.timeS,inputs=new Set([37,41,57,64,79]);
 let last=actorPose(scene,worker,s.timeS,s),largest=0,irregular=0;view.sample(last,true,s.economy!.atS,s.timeS);
 for(let tick=1;tick<=240;tick++){
  const dt=1/120,action:CommerceAction|undefined=inputs.has(tick) ? {kind:'buy',market:'corner',good:'bread'} : undefined,at=s.economy!.atS;
  s=stepCommerce({...s,npcs:stepNpcs(s,dt,scene),timeS:s.timeS+dt},{commerce:action},dt,scene);
  if(action && s.economy!.atS-at<.24)irregular++;
  if(tick%2)continue;
  const before=JSON.stringify(s),p=actorPose(scene,worker,s.timeS,s),visible=view.sample(p,true,s.economy!.atS,s.timeS);
  largest=Math.max(largest,Math.hypot(visible.x-last.x,visible.y-last.y));last=visible;expect(JSON.stringify(s)).toBe(before);
 }
 expect(s.timeS-begin).toBeCloseTo(2);expect(irregular).toBe(inputs.size);expect(largest).toBeGreaterThan(.2);expect(largest).toBeLessThanOrEqual(14/60+1e-6);checkEconomyState(s,scene);
});

it('uses the overnight counter schedule, physically returns early, and keeps journeys deterministic through saves',()=>{
 const world=worldFor(scene);let s=until(start(),s=>account(s).shift?.phase==='out');
 const original=structuredClone(s);let loaded=decodeSave(encodeSave(s,s.timeS,world),world).state;expect(loaded).toEqual(JSON.parse(JSON.stringify(s)));
 for(let i=0;i<100;i++){s=step(s);loaded=step(loaded);}expect(loaded).toEqual(s);expect(account(original).shift?.phase).toBe('out');
 s=until(s,s=>account(s).shift?.phase==='in');expect(marketIsOpen(scene,scene.economy!.markets[0]!,s.timeS)).toBe(false);
 s=until(s,s=>!account(s).shift);expect(s.timeS).toBeLessThan(42.5);expect(actorPose(scene,scene.objects.find(o=>o.id==='neighbor')!,s.timeS,s)).toMatchObject({x:580,y:710});
 s=until(s,s=>account(s,'depot_staff').shift?.phase==='rest');expect(marketIsOpen(scene,scene.economy!.markets[1]!,s.timeS)).toBe(false);checkEconomyState(s,scene);
});

it('waits for returning staff after opening and uses the same presence check for trade, work and cargo',()=>{
 const doc=compile(source.replace('lead_s=18','lead_s=0'));let s=until(start(doc),s=>s.timeS>=42.5,doc),m=doc.economy!.markets[0]!;
 expect(marketIsOpen(doc,m,s.timeS)).toBe(true);expect(marketIsStaffed(doc,m,s.economy)).toBe(false);expect(account(s).shift?.phase).toBe('in');
 const stock=structuredClone(s.economy!.markets),credits=account(s,'pocket').credits;
 for(const a of [{kind:'buy',market:'corner',good:'bread'},{kind:'work',job:'bake'}] as CommerceAction[]){expect(commerceReason(s,doc,'pocket',a)).toBe('unstaffed');s=step(s,doc,a);}
 expect(s.economy!.markets).toEqual(stock);expect(account(s,'pocket').credits).toBe(credits);
 s=until(s,s=>!account(s).shift,doc);expect(marketIsStaffed(doc,m,s.economy)).toBe(true);expect(commerceReason(s,doc,'pocket',{kind:'buy',market:'corner',good:'bread'})).toBeUndefined();checkEconomyState(s,doc);
});

it('waits for physical clearance without losing a shift or teleporting, then resumes after reload',()=>{
 let s=until(start(),s=>account(s).shift?.phase==='out'),t=account(s).shift!;s={...s,x:t.x+6,y:t.y};
 const before={x:t.x,y:t.y};for(let i=0;i<8;i++)s=step(s);expect(account(s).shift).toMatchObject({...before,speed:0});
 s=decodeSave(encodeSave(s,s.timeS,worldFor(scene)),worldFor(scene)).state;s={...s,x:580,y:750};s=until(s,s=>account(s).shift?.phase==='rest');checkEconomyState(s,scene);
});

it('holds a real courier shipment for absent staff and pays the completed handoff only once',()=>{
 const doc=compile(source.replace('lead_s=18','lead_s=0').replace('rest=[780,740]','rest=[920,740]').replace('[820,680],[820,816]','[940,680],[940,816]'));let s=start(doc);
 s=until(s,s=>{const a=account(s,'supply_helper'),t=a.courier;return t?.phase==='dropoff' && Math.hypot(t.x-t.at.x,t.y-t.at.y)<=.1 && !!account(s).shift && marketIsOpen(doc,doc.economy!.markets[0]!,s.timeS);},doc,1400);
 const a=account(s,'supply_helper');expect(a.delivery?.id).toBe('flour_run');expect(a.credits).toBe(0);expect(s.economy!.delivered.flour_run).toBe(0);
 const reserved=structuredClone(s.economy!.markets);s=decodeSave(encodeSave(s,s.timeS,worldFor(doc)),worldFor(doc)).state;s=step(s,doc);expect(s.economy!.markets).toEqual(reserved);expect(account(s,'supply_helper').delivery).toBeDefined();
 s=until(s,s=>s.economy!.delivered.flour_run===1,doc);expect(account(s,'supply_helper').credits).toBe(4);expect(account(s,'supply_helper').delivery).toBeUndefined();checkEconomyState(s,doc);
 for(let i=0;i<8;i++)s=step(s,doc);expect(account(s,'supply_helper').credits).toBe(4);expect(s.economy!.delivered.flour_run).toBe(1);
});

it('keeps off-duty conversations and remembered meetings at the actual rest position',()=>{
 let s=until(start(),s=>account(s).shift?.phase==='rest');const t=account(s).shift!;s={...s,x:t.x+12,y:t.y};expect(nearbyNpc(s,scene)?.id).toBe('neighbor');
 s=step(s,scene,undefined,true);expect(s.npcs.find(n=>n.id==='neighbor')).toMatchObject({known:true,stateId:'hello'});
 s={...s,x:580,y:750};s=until(s,s=>!account(s).shift);expect(s.npcs.find(n=>n.id==='neighbor')!.known).toBe(true);checkEconomyState(s,scene);
});

it('retains stationary program actions and animation clocks while resting',()=>{
 const doc=compile(source.replace('state hello(action=idle','state hello(action=perform'));let s=until(start(doc),s=>account(s).shift?.phase==='rest',doc),t=account(s).shift!;s={...s,x:t.x+12,y:t.y};s=step(s,doc,undefined,true);s=step(s,doc);
 const clock=s.npcs.find(n=>n.id==='neighbor')!;expect(clock.animationTimeS).toBeGreaterThan(0);expect(actorPose(doc,doc.objects.find(o=>o.id==='neighbor')!,s.timeS,s)).toMatchObject({activity:'perform',animationTimeS:clock.animationTimeS});
});

it('rejects forged shift membership, positions, paths, clocks and commitments',()=>{
 let s=until(start(),s=>account(s).shift?.phase==='rest');const world=worldFor(scene),saved=JSON.parse(encodeSave(s,s.timeS,world));
 for(const mutate of [(a:any)=>{a.shift.id='missing';},(a:any)=>{a.shift.at.x+=1;},(a:any)=>{a.shift.x+=1;},(a:any)=>{a.shift.path=[{x:10,y:10}];},(a:any)=>{a.shift.routeAtS=s.timeS+100;},(a:any)=>{a.shift.speed=1;},(a:any)=>{a.delivery={id:'flour_run',collectedAtS:1};}]){const bad=structuredClone(saved);mutate(bad.state.economy.accounts.find((a:any)=>a.id==='baker'));expect(()=>decodeSave(JSON.stringify(bad),world)).toThrow();}
});

it('prepares bounded body-sized paths even when no repair or meal policy asks for a pedestrian graph',()=>{
 const doc=compile(source.replace(',meal=bakery_break','').replace(',deliveries=[flour_run]','').replace(/^\s*meal bakery_break.*$/m,'').replace(/^\s*delivery flour_run.*$/m,'')),packet=repairNavigation(doc);
 expect(packet.services.some(s=>s.id.startsWith('shift/4/18/'))).toBe(true);expect(()=>primeRepairNavigation({...doc},packet)).not.toThrow();
 const area=shiftArea(doc,doc.economy!.shifts[0]!);expect(workClear(doc,area,{x:780,y:740})).toBe(true);expect(workPath(doc,area,{x:580,y:710},{x:780,y:740})).toBeDefined();
});

it('registers the live shift world and migrates r62 without rewriting clocks, cargo, money or history',async()=>{
 const doc=createWorldScene(),hash=await sha256(saveCompatibilitySource(doc));expect(hash).toBe(MATCH_COMPATIBILITY);expect(await sha256(preShiftCompatibilitySource(doc))).toBe(HOURS_COMPATIBILITY);
 const old=preShiftScene(doc).surfaces.find(s=>s.id==='school_yard_access')!.points,parts=doc.surfaces.filter(s=>['school_yard_access','school_yard_return'].includes(s.id)).map(s=>s.points),area=(polygons:typeof parts)=>polygons.reduce((n,p)=>n+polygonArea(p),0);
 expect(area(subtractPolygons(triangulatePolygon(old),parts))).toBe(0);expect(area(subtractPolygons(parts,triangulatePolygon(old)))).toBe(0);
 const world={...worldFor(doc),saveCompatibility:hash,previousMatchSaveCompatibility:BUSINESS_COMPATIBILITY,previousBusinessSaveCompatibility:SCHOOL_REPAIR_COMPATIBILITY,previousSchoolRepairSaveCompatibility:SOCIAL_COMPATIBILITY,previousSocialSaveCompatibility:SHIFT_COMPATIBILITY,previousShiftSaveCompatibility:HOURS_COMPATIBILITY},text=JSON.stringify(previous),restored=decodeSave(text,world);
 expect(restored.migrated).toBe(true);expect(preBusinessState(restored.state)).toEqual(previous.state);expect(restored.worldTime).toBe(previous.worldTime);expect(decodeSave(encodeSave(restored.state,restored.worldTime,world),world).migrated).toBe(false);
 const oldKey=`shifts.v12.${doc.sceneId}.${HOURS_COMPATIBILITY}`,rows=new Map([[oldKey,text]]),storage={getItem:(key:string)=>rows.get(key)??null,setItem:(key:string,value:string)=>{rows.set(key,value);}};
 const saves=gameSave(world,()=>storage,'shifts');expect(preBusinessState(saves.restored?.state)).toEqual(previous.state);expect(saves.write(restored.state,restored.worldTime)).toBe(true);expect(rows.get(oldKey)).toBe(text);rows.set(saves.key,'corrupt');expect(gameSave(world,()=>storage,'shifts').blocked).toBe(true);
 for(const a of doc.economy!.accounts.filter(a=>a.shift)){const plan=doc.economy!.shifts.find(s=>s.id===a.shift)!,area=shiftArea(doc,plan),o=doc.objects.find(o=>o.id===a.actor)!;expect(workPath(doc,area,o,plan.rest)).toBeDefined();expect(workPath(doc,area,plan.rest,o)).toBeDefined();}
});
