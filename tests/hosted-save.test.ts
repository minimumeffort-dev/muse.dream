import pending from '../docs/evidence/hosted-meals/native-pending.json?raw';
import outward from '../docs/evidence/hosted-meals/native-out.json?raw';
import eating from '../docs/evidence/hosted-meals/native-eating.json?raw';
import completed from '../docs/evidence/hosted-meals/native-completed.json?raw';
import {it,expect} from 'vitest';
import r71 from './fixtures/hosted-meal-r71-save-v16.json?raw';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {sharedMealReviewSteps} from '../src/game/review-start';
import {decodeSave,encodeSave} from '../src/sim/save';
import {checkEconomyState} from '../src/sim/commerce';
import {gameSave} from '../src/game/save';
const scene=c.preCoverageScene(createWorldScene()),previous=c.preInvitationScene(scene);
const pairs=[['People','JUNCTION'],['Junction','SPACING'],['Spacing','PARK'],['Park','CITY'],['City','MATCH'],['Match','BUSINESS'],['Business','SCHOOL_REPAIR'],['SchoolRepair','SOCIAL'],['Social','SHIFT'],['Shift','HOURS'],['Hours','SEATING'],['Seating','KITCHEN'],['Kitchen','MEAL'],['Meal','PROGRESS'],['Progress','RECIPE'],['Recipe','EGRESS'],['Egress','INTERIOR'],['Interior','COURIER'],['Courier','NATURAL'],['Finish','PLANT'],['Plant','VERGE'],['Verge','POOL'],['Pool','NETWORK'],['Network','SUPPLY'],['Supply','REPAIR'],['Repair','PARKING'],['Parking','DELIVERY']];
const lineage=Object.fromEntries(pairs.map(([field,key])=>['previous'+field+'SaveCompatibility',c[(key+'_COMPATIBILITY') as keyof typeof c]]));
const world:World={...lineage,scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.INVITATION_COMPATIBILITY,previousInvitationSaveCompatibility:c.PEOPLE_COMPATIBILITY,previousPeopleNavigation:ambientGraph(c.prePeopleScene(scene)),previousJunctionNavigation:ambientGraph(c.preJunctionScene(scene)),previousParkNavigation:ambientGraph(c.preParkScene(scene)),previousCityNavigation:ambientGraph(c.preCityScene(scene))},oldWorld={...world,scene:previous,saveCompatibility:c.PEOPLE_COMPATIBILITY,previousInvitationSaveCompatibility:undefined};
it('registers the exact previous world and keeps all 29 historical states and original slots',async()=>{
 expect(await c.sha256(c.preCoverageCompatibilitySource(scene))).toBe(c.INVITATION_COMPATIBILITY);expect(await c.sha256(c.preInvitationCompatibilitySource(scene))).toBe(c.PEOPLE_COMPATIBILITY);
 const parking=c.preParkingScene(c.preCityScene(scene)),hash=await c.sha256(c.preCommerceCompatibilitySource(parking,2)),legacy={previousSaveCompatibility:await c.sha256(c.preCommerceCompatibilitySource(parking)),emptyEconomySaveCompatibility:hash,previousSaveSource:c.registeredLegacySource(hash),previousMarketSaveCompatibility:await c.sha256(c.preDeliveryCompatibilitySource(parking))};
 const fixtures=import.meta.glob('./fixtures/save-v*.json',{query:'?raw',import:'default',eager:true}) as Record<string,string>;expect(Object.keys(fixtures)).toHaveLength(28);
 for(const [id,text] of Object.entries({...fixtures,r71})){const old=decodeSave(text,{...oldWorld,...legacy}),next=decodeSave(text,{...world,...legacy});expect(next.state,id).toEqual(old.state);expect(next.worldTime,id).toBe(old.worldTime);expect(next.migrated,id).toBe(true);}
 const before=decodeSave(r71,oldWorld),after=decodeSave(r71,world);expect(after.state).toEqual(before.state);expect(after.state.economy!.shared?.host).toBeUndefined();
 const key=`muse-dream.save.v16.${scene.sceneId}.${c.PEOPLE_COMPATIBILITY}`,rows=new Map([[key,r71]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(after.state);expect(rows.size).toBe(1);expect(slot.write(after.state,after.worldTime)).toBe(true);expect(rows.size).toBe(2);expect(rows.get(key)).toBe(r71);expect(JSON.parse(rows.get(slot.key)!).version).toBe(18);
 expect(()=>decodeSave(r71,{...world,previousInvitationSaveCompatibility:undefined})).toThrow();expect(()=>decodeSave(r71,{...world,saveCompatibility:'f'.repeat(64)})).toThrow();
 const forged=JSON.parse(r71);forged.state.economy.accounts.find((a:{id:string})=>a.id==='baker').invitedAtS=0;expect(()=>decodeSave(JSON.stringify(forged),world)).toThrow();
},60000);
it('funds the live invitation through real production, purchases and walking, then consumes once after acceptance',async()=>{
 const steps=sharedMealReviewSteps(createCarAtSpawn(scene),world,true);let result=steps.next(),n=0;
 while(!result.done){if(++n%30===0)await new Promise<void>(r=>setImmediate(r));result=steps.next();}
 let s=result.value;checkEconomyState(s,scene);const host=s.economy!.accounts.find(a=>a.id==='baker')!,guest=s.economy!.accounts.find(a=>a.id==='pocket')!;
 expect(s.seated?.objectId).toBe('hall_bench');expect(s.economy!.invitation?.partner).toBe('baker');expect(host).toMatchObject({credits:3,inventory:{bread:2},completed:{work:{pack_lunch:4,bake:2}}});expect(guest).toMatchObject({credits:20,inventory:{bread:0}});expect(s.economy!.consumed.bread).toBe(1);
 s=decodeSave(encodeSave(s,s.timeS,world),world).state;s=stepInteractive(s,{steer:0,throttle:0,commerce:{kind:'accept_share',partner:'baker'}},1/120,world);expect(s.economy!.shared?.host).toBe('baker');
 for(let i=0;i<120*30 && s.economy!.shared;i++)s=stepInteractive(s,{steer:0,throttle:0},1/120,world);
 checkEconomyState(s,scene);expect(s.economy!.shared).toBeUndefined();expect(s.economy!.consumed.bread).toBe(3);expect(s.economy!.socialHistory!.baker!.meals).toBe(1);expect(s.economy!.accounts.find(a=>a.id==='pocket')!.credits).toBe(20);expect(decodeSave(encodeSave(s,s.timeS,world),world).state).toEqual(JSON.parse(JSON.stringify(s)));
},60000);

it.each([['pending',pending],['out',outward],['eat',eating],['home',completed]])('restores the actual native %s backup without changing portions or charging the guest',(phase,text)=>{
 const loaded=decodeSave(text,world),e=loaded.state.economy!,host=e.accounts.find(a=>a.id==='baker')!,guest=e.accounts.find(a=>a.id==='pocket')!;
 expect(JSON.parse(text).version).toBe(17);expect(loaded.state).toEqual(JSON.parse(text).state);expect(host.credits).toBe(3);expect(guest.credits).toBe(20);expect(guest.inventory.bread).toBe(0);
 if(phase==='pending'){expect(e.invitation?.partner).toBe('baker');expect(e.shared).toBeUndefined();expect(host.inventory.bread).toBe(2);}else{expect(e.shared).toMatchObject({phase,host:'baker',portions:phase==='home' ? 0 : 2});expect(e.invitation).toBeUndefined();expect(host.inventory.bread).toBe(0);}
 expect(e.consumed.bread).toBe(phase==='home' ? 3 : 1);expect(e.socialHistory?.baker?.meals??0).toBe(phase==='home' ? 1 : 0);expect(decodeSave(encodeSave(loaded.state,loaded.worldTime,world),world).state).toEqual(loaded.state);
});
