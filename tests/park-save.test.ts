import {it,expect} from 'vitest';
import released from '../docs/evidence/city-streets/native-backup.json?raw';
import native from '../docs/evidence/garden-park/native-backup.json?raw';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientGraph,ambientNavigation} from '../src/scene/ambient-navigation';
import {ambientObjects} from '../src/sim/ambient';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {decodeSave,encodeSave} from '../src/sim/save';
import {stepInteractive} from '../src/sim/interaction';
import {gameSave} from '../src/game/save';
import type {World} from '../src/sim/car';
const scene=c.preJunctionScene(createWorldScene()),previous=c.preParkScene(scene),pairs=[['City','MATCH'],['Match','BUSINESS'],['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]])),world:World={...lineage,scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.PARK_COMPATIBILITY,previousParkSaveCompatibility:c.CITY_COMPATIBILITY,previousParkNavigation:ambientGraph(previous),previousCityNavigation:ambientGraph(c.preCityScene(previous))},oldWorld:World={...world,scene:previous,saveCompatibility:c.CITY_COMPATIBILITY,previousParkSaveCompatibility:undefined,previousParkNavigation:undefined};
it('adds only new visitors at saved time and preserves old lives, resources, ownership, damage, matches and vehicle poses',()=>{
 const old=decodeSave(released,oldWorld),next=decodeSave(released,world),{population,...before}=old.state,{population:people,...after}=next.state;
 expect(after).toEqual(before);expect(next.worldTime).toBe(old.worldTime);expect(next.migrated).toBe(true);expect(people!.tick).toBe(population!.tick);
 const oldIds=ambientObjects(previous).map(o=>o.id),newIds=ambientObjects(scene).map(o=>o.id),omit=({node,previous,...m}:NonNullable<typeof people>["members"][number])=>m;
 oldIds.forEach((id,i)=>expect(omit(people!.members[newIds.indexOf(id)]!),id).toEqual(omit(population!.members[i]!)));
 newIds.forEach((id,i)=>{if(!oldIds.includes(id)){const m=people!.members[i]!;expect(m.distance).toBe(0);expect(m.pauseUntil).toBe(old.state.timeS);expect(ambientNavigation(scene).nodes[m.node]).toBeDefined();}});
 const roundtrip=decodeSave(encodeSave(next.state,next.worldTime,world),world);expect(roundtrip.state).toEqual(next.state);expect(stepInteractive(roundtrip.state,{steer:0,throttle:0},1/120,world)).toEqual(stepInteractive(next.state,{steer:0,throttle:0},1/120,world));
 expect(()=>decodeSave(released,{...world,previousParkSaveCompatibility:'unregistered'})).toThrow(/different world/);
});
it('retains the released slot until the successfully validated park save is written',()=>{
 const key=`muse-dream.save.v16.${scene.sceneId}.${c.CITY_COMPATIBILITY}`,rows=new Map([[key,released]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.migrated).toBe(true);expect(rows.size).toBe(1);expect(slot.write(slot.restored!.state,slot.restored!.worldTime)).toBe(true);expect(rows.get(key)).toBe(released);expect(rows.size).toBe(2);
});
it('carries the complete historical save matrix through the city and park migrations',async()=>{
 const parking=c.preParkingScene(c.preCityScene(previous)),hash=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:hash,previousSaveSource:c.registeredLegacySource(hash),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))},target={...world,...legacy},prior={...oldWorld,...legacy};
 const fixtures=import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;expect(Object.keys(fixtures)).toHaveLength(28);
 for(const [id,text] of Object.entries(fixtures)){const old=decodeSave(text,prior),next=decodeSave(text,target),{population,...before}=old.state,{population:people,...after}=next.state;expect(after,id).toEqual(before);expect(next.worldTime,id).toBe(old.worldTime);expect(people!.members).toHaveLength(population!.members.length+8);}
},60000);

it('replays the actual native seated return without clearing ownership, money, population or the saved bench claim',()=>{
 const raw=JSON.parse(native),saved=decodeSave(native,world);expect(saved.state).toEqual(raw.state);expect(saved.state.seated).toEqual({objectId:'garden_bench_nw',seatId:'left'});expect(saved.state.economy!.accounts.find(a=>a.id==='pocket')!.credits).toBe(2);expect(saved.state.economy!.markets.find(m=>m.id==='station_supplies')!.owner).toBe('pocket');expect(saved.state.population!.members).toHaveLength(179);expect(decodeSave(encodeSave(saved.state,saved.worldTime,world),world).state).toEqual(saved.state);
});
