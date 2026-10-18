import {it,expect} from 'vitest';
import legacy from './fixtures/save-v16-r67-city.json?raw';
import business from './fixtures/save-v15-r66-business.json?raw';
import {createWorldScene} from '../src/scene/world-fixture';
import {CITY_COMPATIBILITY,MATCH_COMPATIBILITY,BUSINESS_COMPATIBILITY,preCityScene,preCityCompatibilitySource,saveCompatibilitySource,sha256} from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {roadFootprint} from '../src/scene/road';
import {ambientGraph,ambientNavigation} from '../src/scene/ambient-navigation';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {decodeSave,encodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {stepInteractive} from '../src/sim/interaction';
import {crossingPaint} from '../src/game/crossing-paint';
const scene=createWorldScene(),previous=preCityScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:CITY_COMPATIBILITY,previousCitySaveCompatibility:MATCH_COMPATIBILITY,previousCityNavigation:ambientGraph(previous),previousMatchSaveCompatibility:BUSINESS_COMPATIBILITY};
it('pins the entire r67 projection and retires the live circuit from every shared footprint',async()=>{
 expect(await sha256(saveCompatibilitySource(scene))).toBe(CITY_COMPATIBILITY);expect(await sha256(preCityCompatibilitySource(scene))).toBe(MATCH_COMPATIBILITY);
 expect(world.roadMask.cellSize).toBe(4);expect(world.roadMask.data.length).toBe(9_625_000);expect(scene.objects.length).toBe(1719);expect(previous.objects.length).toBe(1700);expect(scene.checkpoints).toEqual([]);expect(scene.regions).toEqual([]);expect(roadFootprint(scene)).toEqual([]);
 const p=crossingPaint(scene);expect(p.bands).toBe(160);expect(p.groups).toBe(159);
});
it('retains lives, businesses, damaged objects, vehicles, clocks and matches, rebasing only retired road/navigation state',()=>{
 const before=JSON.parse(legacy),restored=decodeSave(legacy,world),{nextCheckpoint,boostReadyAtS,population,...old}=before.state,{nextCheckpoint:next,boostReadyAtS:boost,population:people,...after}=restored.state;
 expect(after).toEqual(old);expect(next).toBe(0);expect(boost).toEqual({});expect(restored.worldTime).toBe(before.worldTime);expect(restored.migrated).toBe(true);
 expect(people!.tick).toBe(population.tick);expect(people!.members.map(({node,previous,...m})=>m)).toEqual(population.members.map(({node,previous,...m}:any)=>m));
 const nav=ambientNavigation(scene);for(const member of people!.members)if(member.mode==='walk')expect(nav.nodes[member.node]).toBeDefined();
 const roundtrip=decodeSave(encodeSave(restored.state,restored.worldTime,world),world);expect(roundtrip.state).toEqual(restored.state);expect(stepInteractive(roundtrip.state,{steer:0,throttle:0},1/120,world)).toEqual(stepInteractive(restored.state,{steer:0,throttle:0},1/120,world));
 expect(()=>decodeSave(legacy,{...world,previousCitySaveCompatibility:'unregistered'})).toThrow(/different world/);
 const invalid=JSON.parse(legacy);invalid.state.population.members.find((m:any)=>m.mode==='walk').node=8191;expect(()=>decodeSave(JSON.stringify(invalid),world)).toThrow(/invalid world/);
});
it('chains the r66 match migration and leaves the previous slot intact',()=>{
 const result=decodeSave(business,world);expect(result.state.sports.every(s=>s.match?.status==='ready')).toBe(true);expect(result.state.economy).toEqual(JSON.parse(business).state.economy);
 const oldKey=`muse-dream.save.v16.${scene.sceneId}.${MATCH_COMPATIBILITY}`,rows=new Map([[oldKey,legacy]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));
 expect(slot.restored?.migrated).toBe(true);expect(rows.size).toBe(1);expect(slot.write(slot.restored!.state,slot.restored!.worldTime)).toBe(true);expect(rows.get(oldKey)).toBe(legacy);expect(rows.size).toBe(2);
 expect(createCarAtSpawn(scene).nextCheckpoint).toBe(0);
});

it('moves only a walker standing on a retired internal zebra to nearby accepted pavement',()=>{
 const packet=JSON.parse(legacy),index=packet.state.population.members.findIndex((m:any)=>m.mode==='walk'),object=previous.objects.filter(o=>o.ambient)[index]!,oldNav=ambientNavigation(previous),nav=ambientNavigation(scene),radius=oldNav.radius(object),point={x:6800,y:3250};
 expect(oldNav.clear(point.x,point.y,radius,true)).toBe(true);expect(nav.clear(point.x,point.y,radius,true)).toBe(false);
 const node=oldNav.nodes.findIndex(p=>p.links.length && oldNav.segment(point,p,radius,true));expect(node).toBeGreaterThanOrEqual(0);
 const m=packet.state.population.members[index];Object.assign(m,{...point,fromX:point.x,fromY:point.y,node,previous:-1,speed:0});
 const restored=decodeSave(JSON.stringify(packet),world).state,after=restored.population!.members[index]!;
 expect(nav.clear(after.x,after.y,radius,true)).toBe(true);expect(Math.hypot(after.x-point.x,after.y-point.y)).toBeLessThanOrEqual(256);expect(after.distance).toBe(m.distance);expect(after.random).toBe(m.random);expect(restored.timeS).toBe(packet.state.timeS);
});

it('reroutes an in-progress staff journey off the removed zebra without changing its job or ledger',async()=>{
 const {shiftArea}=await import('../src/sim/shifts'),{workPath,workSegment}=await import('../src/sim/work-navigation');
 const before=createCarAtSpawn(previous),plan=previous.economy!.shifts.find(s=>s.id==='bakery_day')!,area=shiftArea(previous,plan),worker=previous.objects.find(o=>o.id===previous.economy!.accounts.find(a=>a.id==='baker')!.actor)!,point={x:6800,y:3250},path=workPath(previous,area,point,worker);
 expect(path).toBeDefined();expect(workSegment(scene,shiftArea(scene,plan),point,point,undefined,true)).toBe(false);
 const account=before.economy!.accounts.find(a=>a.id==='baker')!;account.shift={id:plan.id,phase:'in',at:{x:worker.x,y:worker.y},...point,headingRad:0,path:path!,routeAtS:0,speed:0,distance:23};
 const oldWorld={...world,scene:previous,saveCompatibility:MATCH_COMPATIBILITY,previousCitySaveCompatibility:undefined,previousCityNavigation:undefined},text=encodeSave(before,0,oldWorld),after=decodeSave(text,world).state,next=after.economy!.accounts.find(a=>a.id==='baker')!.shift!;
 expect(next.id).toBe(plan.id);expect(next.phase).toBe('in');expect(next.at).toEqual(account.shift.at);expect(next.distance).toBe(23);expect(next.routeAtS).toBe(0);expect(next.path.at(-1)).toEqual({x:worker.x,y:worker.y});expect(workSegment(scene,shiftArea(scene,plan),next,next,undefined,true)).toBe(true);
 const omit=(e:typeof before.economy)=>({...e,accounts:e!.accounts.map(({shift,...a})=>a)});expect(omit(after.economy)).toEqual(omit(before.economy));
});

it('carries every pinned historical browser backup through the full chain into the street-only world',async()=>{
 const c=await import('../src/scene/save-compatibility'),pairs=[['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
 const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]])),parking=c.preParkingScene(previous),hash=await c.sha256(c.preCommerceCompatibilitySource(parking,2));
 const target:World={...world,...lineage,previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:hash,previousSaveSource:c.registeredLegacySource(hash),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const prior:World={...target,scene:previous,saveCompatibility:MATCH_COMPATIBILITY,previousCitySaveCompatibility:undefined,previousCityNavigation:undefined},fixtures=import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
 expect(Object.keys(fixtures).length).toBe(28);
 for(const [id,text] of Object.entries(fixtures)){const old=decodeSave(text,prior),next=decodeSave(text,target),{population,nextCheckpoint,boostReadyAtS,...before}=old.state,{population:people,nextCheckpoint:checkpoint,boostReadyAtS:boost,...after}=next.state;const ledger=(state:typeof old.state)=>({...state,economy:state.economy && {...state.economy,accounts:state.economy.accounts.map(a=>{const row={...a};for(const field of ['repair','courier','meal','shift'] as const)if(a[field]){const {x,y,path,speed,...commitment}=a[field]!;(row as any)[field]=commitment;}return row;}),...(state.economy.shared ? {shared:(({x,y,path,speed,...commitment})=>commitment)(state.economy.shared)} : {})}});expect(ledger(after as typeof old.state),id).toEqual(ledger(before as typeof old.state));expect(next.worldTime,id).toBe(old.worldTime);expect(checkpoint).toBe(0);expect(boost).toEqual({});expect(people?.members.length).toBe(population?.members.length);}
});
