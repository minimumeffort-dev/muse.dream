import {it,expect} from 'vitest';
import nativeR70 from '../docs/evidence/character-wardrobe/native-r70-backup.json?raw';
import native from '../docs/evidence/pedestrian-spacing/native-backup.json?raw';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientGraph,ambientNavigation} from '../src/scene/ambient-navigation';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {decodeSave,encodeSave} from '../src/sim/save';
import {walkingHeight} from '../src/scene/interiors';
import {actorPose} from '../src/sim/actors';
import {ambientObjects} from '../src/sim/ambient';
import {stepInteractive} from '../src/sim/interaction';
import {gameSave} from '../src/game/save';
import {type World} from '../src/sim/car';
const scene=createWorldScene(),previous=c.prePeopleScene(scene),pairs=[['Junction','SPACING'],['Spacing','PARK'],['Park','CITY'],['City','MATCH'],['Match','BUSINESS'],['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));
const world:World={...lineage,scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.PEOPLE_COMPATIBILITY,previousPeopleSaveCompatibility:c.JUNCTION_COMPATIBILITY,previousPeopleNavigation:ambientGraph(previous),previousJunctionNavigation:ambientGraph(c.preJunctionScene(scene)),previousParkNavigation:ambientGraph(c.preParkScene(scene)),previousCityNavigation:ambientGraph(c.preCityScene(scene))},oldWorld={...world,scene:previous,saveCompatibility:c.JUNCTION_COMPATIBILITY,previousPeopleSaveCompatibility:undefined};
it('restores exactly the released person templates and gates upgrades to the registered world',async()=>{
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.PEOPLE_COMPATIBILITY);
 expect(await c.sha256(c.prePeopleCompatibilitySource(scene))).toBe(c.JUNCTION_COMPATIBILITY);
 expect(scene.objects).toHaveLength(previous.objects.length);expect(scene.objects.map(o=>o.id)).toEqual(previous.objects.map(o=>o.id));
 for(const [i,o] of scene.objects.entries()){
  const old=previous.objects[i]!;expect([o.x,o.y,o.headingRad,o.labelText,o.role]).toEqual([old.x,old.y,old.headingRad,old.labelText,old.role]);
  if(o.spec && old.spec && 'body' in o.spec && 'body' in old.spec){expect(o.spec.body.colliderRadius*o.scale).toBeCloseTo(old.spec.body.colliderRadius*old.scale,12);expect((o.spec.body.colliderHeight??0)*o.scale).toBeCloseTo((old.spec.body.colliderHeight??0)*old.scale,12);}
 }
 expect(await c.sha256(c.prePeopleCompatibilitySource({...scene,streets:scene.streets.slice(1)}))).not.toBe(c.JUNCTION_COMPATIBILITY);
 expect(()=>decodeSave(native,{...world,previousPeopleSaveCompatibility:'unregistered'})).toThrow(/different world/);
});
it('keeps every lived state and population coordinate while rebasing only derived walking portals',()=>{
 const old=decodeSave(native,oldWorld),next=decodeSave(native,world),{population,...state}=next.state,{population:oldPopulation,...oldState}=old.state;
 expect(state).toEqual(oldState);expect(next.worldTime).toBe(old.worldTime);expect(next.migrated).toBe(true);expect(population!.tick).toBe(oldPopulation!.tick);expect(population!.members).toHaveLength(oldPopulation!.members.length);
 for(const [i,m] of population!.members.entries()){
  const {node,previous:prior,...member}=m,{node:oldNode,previous:oldPrior,...before}=oldPopulation!.members[i]!;expect(member).toEqual(before);
  if(member.mode==='walk')expect(ambientNavigation(scene).nodes[node]).toBeDefined();
 }
 const copy=decodeSave(encodeSave(next.state,next.worldTime,world),world);expect(copy.state).toEqual(next.state);expect(copy.migrated).toBe(false);
 expect(stepInteractive(copy.state,{steer:0,throttle:0},1/120,world)).toEqual(stepInteractive(next.state,{steer:0,throttle:0},1/120,world));
 const r70=encodeSave(old.state,old.worldTime,oldWorld),key=`muse-dream.save.v16.${scene.sceneId}.${c.JUNCTION_COMPATIBILITY}`,rows=new Map([[key,r70]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));
 expect(slot.restored?.migrated).toBe(true);expect(rows.size).toBe(1);expect(slot.write(slot.restored!.state,slot.restored!.worldTime)).toBe(true);expect(rows.size).toBe(2);expect(rows.get(key)).toBe(r70);
});
it('preserves the airport passenger pose and every route, economy and sports clock',()=>{
 const base=decodeSave(native,oldWorld).state,timeS=base.timeS,bus=previous.objects.find(o=>o.id==='airport_bus_vehicle')!,pose=actorPose(previous,bus,timeS,base);
 const state={...base,seated:undefined,control:{kind:'passenger' as const,id:bus.id},x:pose.x,y:pose.y,elevation:pose.elevation};
 const saved=encodeSave(state,42,oldWorld),next=decodeSave(saved,world);
 expect(next.state).toMatchObject({control:state.control,x:pose.x,y:pose.y,elevation:pose.elevation,timeS});expect(next.worldTime).toBe(42);expect(next.state.sports).toEqual(state.sports);expect(next.state.economy).toEqual(state.economy);expect(next.state.vehicles).toEqual(state.vehicles);
 expect(()=>decodeSave(encodeSave(next.state,next.worldTime,world),world)).not.toThrow();
});
it('continues a playing six-a-side match without changing its ball, member poses or next sports tick',()=>{
 const base=decodeSave(native,oldWorld).state,ball=previous.objects.find(o=>o.id==='pitch_ball')!;
 let state={...base,seated:undefined,control:{kind:'foot' as const},x:ball.x-6,y:ball.y,elevation:walkingHeight(previous,ball.x-6,ball.y,3),vx:0,vy:0,vz:0,grounded:true,headingRad:0};
 for(let f=0;f<240;f++)state=stepInteractive(state,{steer:0,throttle:0,matchPressed:f===0},1/120,oldWorld) as typeof state;
 const match=state.sports.find(g=>g.id==='football_practice')!.match!;expect(match.status).toBe('playing');expect(match.elapsedS).toBeGreaterThan(1);expect(match.members.some(m=>m.distance>1)).toBe(true);
 const restored=decodeSave(encodeSave(state,42,oldWorld),world);expect(restored.state.sports).toEqual(state.sports);expect(restored.state.props).toEqual(state.props);
 const a=stepInteractive(state,{steer:0,throttle:0},1/120,oldWorld),b=stepInteractive(restored.state,{steer:0,throttle:0},1/120,world);expect(b.sports).toEqual(a.sports);expect(b.props).toEqual(a.props);
});
it('upgrades the actual r70 browser export without changing money, ownership, seating or simulation time',()=>{
 const before=decodeSave(nativeR70,oldWorld),after=decodeSave(nativeR70,world),{population,...state}=after.state,{population:oldPopulation,...oldState}=before.state;
 expect(after.migrated).toBe(true);expect(after.compatible).toBe(true);expect(state).toEqual(oldState);expect(after.worldTime).toBe(before.worldTime);expect(population!.tick).toBe(oldPopulation!.tick);expect(after.state.economy!.accounts.find(a=>a.id==='pocket')!.credits).toBe(2);expect(after.state.seated).toEqual({objectId:'garden_bench_nw',seatId:'left'});
 for(const [i,m] of population!.members.entries()){const {node,previous,...rest}=m,{node:a,previous:b,...old}=oldPopulation!.members[i]!;expect(rest).toEqual(old);}
});
it('retains all 28 historical backups without replaying completed work or changing ledgers',async()=>{
 const parking=c.preParkingScene(c.preCityScene(scene)),hash=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:hash,previousSaveSource:c.registeredLegacySource(hash),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures=import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;expect(Object.keys(fixtures)).toHaveLength(28);
 for(const [id,text] of Object.entries(fixtures)){const old=decodeSave(text,{...oldWorld,...legacy}),next=decodeSave(text,{...world,...legacy});expect(next.state.economy,id).toEqual(old.state.economy);expect(next.state.broken,id).toEqual(old.state.broken);expect(next.state.vehicles,id).toEqual(old.state.vehicles);expect(next.state.timeS,id).toBe(old.state.timeS);expect(next.worldTime,id).toBe(old.worldTime);}
},60000);
