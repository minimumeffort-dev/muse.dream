import {it,expect} from 'vitest';
import native from '../docs/evidence/pedestrian-spacing/native-backup.json?raw';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientGraph,ambientNavigation} from '../src/scene/ambient-navigation';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {decodeSave,encodeSave} from '../src/sim/save';
import {actorPose} from '../src/sim/actors';
import {ambientObjects} from '../src/sim/ambient';
import {stepInteractive} from '../src/sim/interaction';
import {gameSave} from '../src/game/save';
import {type World} from '../src/sim/car';
const scene=c.prePeopleScene(createWorldScene()),previous=c.preJunctionScene(scene),pairs=[['Spacing','PARK'],['Park','CITY'],['City','MATCH'],['Match','BUSINESS'],['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));
const world:World={...lineage,scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.JUNCTION_COMPATIBILITY,previousJunctionSaveCompatibility:c.SPACING_COMPATIBILITY,previousJunctionNavigation:ambientGraph(previous),previousParkNavigation:ambientGraph(c.preParkScene(scene)),previousCityNavigation:ambientGraph(c.preCityScene(scene))},oldWorld={...world,scene:previous,saveCompatibility:c.SPACING_COMPATIBILITY,previousJunctionSaveCompatibility:undefined};
it('pins the complete previous world and gates the layout migration to its registered target',async()=>{
 expect(await c.sha256(c.prePeopleCompatibilitySource(scene))).toBe(c.JUNCTION_COMPATIBILITY);
 expect(await c.sha256(c.preJunctionCompatibilitySource(scene))).toBe(c.SPACING_COMPATIBILITY);
 expect(previous.objects).toHaveLength(1760);expect(scene.objects).toHaveLength(1769);
 expect(await c.sha256(c.preJunctionCompatibilitySource({...scene,objects:scene.objects.slice(1)}))).not.toBe(c.SPACING_COMPATIBILITY);
 expect(()=>decodeSave(native,{...world,previousJunctionSaveCompatibility:'unregistered'})).toThrow(/different world/);
});
it('preserves native progress and old slots, rebasing derived portals and adding only the two new residents',()=>{
 const old=decodeSave(native,oldWorld),next=decodeSave(native,world),{population,...state}=next.state,{population:oldPopulation,...oldState}=old.state;
 expect(state).toEqual(oldState);expect(next.worldTime).toBe(old.worldTime);expect(next.migrated).toBe(true);expect(population!.tick).toBe(oldPopulation!.tick);
 const oldPeople=new Map(ambientObjects(previous).map((o,i)=>[o.id,oldPopulation!.members[i]!]));
 for(const [i,o] of ambientObjects(scene).entries())if(oldPeople.has(o.id)){
  const {node,previous:prior,...m}=population!.members[i]!,{node:oldNode,previous:oldPrior,...before}=oldPeople.get(o.id)!;expect(m,o.id).toEqual(before);
  if(m.mode==='walk')expect(ambientNavigation(scene).nodes[node]).toBeDefined();
 }
 expect(population!.members).toHaveLength(oldPopulation!.members.length+2);
 const copy=decodeSave(encodeSave(next.state,next.worldTime,world),world);expect(copy.state).toEqual(next.state);expect(copy.migrated).toBe(false);
 expect(stepInteractive(copy.state,{steer:0,throttle:0},1/120,world)).toEqual(stepInteractive(next.state,{steer:0,throttle:0},1/120,world));
 const key=`muse-dream.save.v16.${scene.sceneId}.${c.SPACING_COMPATIBILITY}`,rows=new Map([[key,native]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));
 expect(slot.restored?.migrated).toBe(true);expect(rows.size).toBe(1);expect(slot.write(slot.restored!.state,slot.restored!.worldTime)).toBe(true);expect(rows.size).toBe(2);expect(rows.get(key)).toBe(native);
});
it('keeps an airport-bus passenger aboard the revised route at the saved simulation time',()=>{
 const base=decodeSave(native,oldWorld).state,timeS=base.timeS,bus=previous.objects.find(o=>o.id==='airport_bus_vehicle')!,pose=actorPose(previous,bus,timeS,base);
 const state={...base,seated:undefined,control:{kind:'passenger' as const,id:bus.id},x:pose.x,y:pose.y,elevation:pose.elevation};
 const saved=encodeSave(state,42,oldWorld),next=decodeSave(saved,world),target=actorPose(scene,scene.objects.find(o=>o.id===bus.id)!,timeS,next.state);
 expect(next.state.control).toEqual(state.control);expect(next.state.timeS).toBe(timeS);expect(next.worldTime).toBe(42);expect(next.state.x).toBe(target.x);expect(next.state.y).toBe(target.y);expect(next.state.economy).toEqual(base.economy);expect(next.state.vehicles).toEqual(state.vehicles);
 expect(()=>decodeSave(encodeSave(next.state,next.worldTime,world),world)).not.toThrow();
});
it('retains every historical migration without replaying completed jobs or changing ledgers',async()=>{
 const parking=c.preParkingScene(c.preCityScene(scene)),hash=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:hash,previousSaveSource:c.registeredLegacySource(hash),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures=import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;expect(Object.keys(fixtures)).toHaveLength(28);
 for(const [id,text] of Object.entries(fixtures)){const old=decodeSave(text,{...oldWorld,...legacy}),next=decodeSave(text,{...world,...legacy});expect(next.state.economy,id).toEqual(old.state.economy);expect(next.state.broken,id).toEqual(old.state.broken);expect(next.state.vehicles,id).toEqual(old.state.vehicles);expect(next.state.timeS,id).toBe(old.state.timeS);expect(next.worldTime,id).toBe(old.worldTime);}
},60000);
it('moves a saved walker off the retired diagonal sidewalk while keeping damage and travel history',()=>{
 const old=decodeSave(native,oldWorld),people=ambientObjects(previous),index=people.findIndex(o=>o.ambient!.motion.kind==='walk'),object=people[index]!,nav=ambientNavigation(previous),nextNav=ambientNavigation(scene),radius=nav.radius(object);
 const length=Math.hypot(300,1300),at={x:3150-1300/length*52,y:7150-300/length*52};
 expect(nav.clear(at.x,at.y,radius,true)).toBe(true);expect(nextNav.clear(at.x,at.y,radius,true)).toBe(false);
 const node=nav.nodes.findIndex(p=>p.links.length && Math.hypot(p.x-at.x,p.y-at.y)<300 && nav.segment(at,p,radius,true));expect(node).toBeGreaterThanOrEqual(0);
 const population=structuredClone(old.state.population!);Object.assign(population.members[index]!,at,{fromX:at.x,fromY:at.y,node,previous:-1});
 const state={...old.state,population,broken:['airport_lamps_0_1_l']},text=encodeSave(state,old.worldTime,oldWorld),next=decodeSave(text,world).state,m=next.population!.members[ambientObjects(scene).findIndex(o=>o.id===object.id)]!;
 expect(nextNav.clear(m.x,m.y,nextNav.radius(scene.objects.find(o=>o.id===object.id)!),true)).toBe(true);expect(Math.hypot(m.x-at.x,m.y-at.y)).toBeLessThanOrEqual(256);expect(m.distance).toBe(population.members[index]!.distance);expect(m.random).toBe(population.members[index]!.random);expect(m.pauseUntil).toBe(population.members[index]!.pauseUntil);expect(next.timeS).toBe(state.timeS);expect(next.economy).toEqual(state.economy);expect(next.broken).toEqual(state.broken);
});
