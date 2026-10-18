import {it,expect} from 'vitest';
import native from '../docs/evidence/garden-park/native-backup.json?raw';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {decodeSave,encodeSave} from '../src/sim/save';
import {stepInteractive} from '../src/sim/interaction';
import {gameSave} from '../src/game/save';
import type {World} from '../src/sim/car';
const scene=createWorldScene(),pairs=[['Park','CITY'],['City','MATCH'],['Match','BUSINESS'],['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]])),world:World={...lineage,scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.SPACING_COMPATIBILITY,previousSpacingSaveCompatibility:c.PARK_COMPATIBILITY,previousParkNavigation:ambientGraph(c.preParkScene(scene)),previousCityNavigation:ambientGraph(c.preCityScene(scene))},oldWorld:World={...world,saveCompatibility:c.PARK_COMPATIBILITY,previousSpacingSaveCompatibility:undefined};
it('registers only the released unchanged world for the new walking rules',async()=>{
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.SPACING_COMPATIBILITY);expect(await c.sha256(c.preSpacingCompatibilitySource(scene))).toBe(c.PARK_COMPATIBILITY);
 expect(await c.sha256(c.preSpacingCompatibilitySource({...scene,objects:scene.objects.slice(1)}))).not.toBe(c.PARK_COMPATIBILITY);
 expect(()=>decodeSave(native,{...world,previousSpacingSaveCompatibility:'unregistered'})).toThrow(/different world/);
});
it('preserves every native saved field, exact clock and bench claim without population rebasing',()=>{
 const raw=JSON.parse(native),saved=decodeSave(native,world);expect(saved.state).toEqual(raw.state);expect(saved.worldTime).toBe(raw.worldTime);expect(saved.migrated).toBe(true);
 const roundtrip=decodeSave(encodeSave(saved.state,saved.worldTime,world),world);expect(roundtrip.state).toEqual(saved.state);expect(roundtrip.migrated).toBe(false);
 expect(stepInteractive(saved.state,{steer:0,throttle:0},1/120,world)).toEqual(stepInteractive(roundtrip.state,{steer:0,throttle:0},1/120,world));
 const key=`muse-dream.save.v16.${scene.sceneId}.${c.PARK_COMPATIBILITY}`,rows=new Map([[key,native]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored?.state).toEqual(raw.state);expect(rows.size).toBe(1);expect(slot.write(slot.restored!.state,slot.restored!.worldTime)).toBe(true);expect(rows.size).toBe(2);expect(rows.get(key)).toBe(native);
});
it('retains the complete historical migration chain without replaying park or commerce initialization',async()=>{
 const parking=c.preParkingScene(c.preCityScene(scene)),hash=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:hash,previousSaveSource:c.registeredLegacySource(hash),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))},target={...world,...legacy},prior={...oldWorld,...legacy};
 const fixtures=import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;expect(Object.keys(fixtures)).toHaveLength(28);
 for(const [id,text] of Object.entries(fixtures)){const old=decodeSave(text,prior),next=decodeSave(text,target);expect(next.state,id).toEqual(old.state);expect(next.worldTime,id).toBe(old.worldTime);}
},60000);
