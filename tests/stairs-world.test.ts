import example from '../docs/examples/stairs-home.dream?raw';
import {compileDream} from '../src/scene/dream';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {stepAmbient} from '../src/sim/ambient';
import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,carFootprintClear,type World} from '../src/sim/car';
import {bodyWorld,stepInteractive} from '../src/sim/interaction';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {stairsReviewSteps} from '../src/game/stairs-review';
import {restReviewSteps} from '../src/game/rest-review';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {sceneInteriors} from '../src/scene/interiors';
const scene=c.preFloorsScene(createWorldScene()),prior=c.preStairsScene(scene),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000),carRadius:11,saveCompatibility:c.STAIRS_COMPATIBILITY,previousStairsSaveCompatibility:c.REST_COMPATIBILITY,previousStairsContacts:sceneContactData(prior),previousStairsNavigation:ambientGraph(prior)},old:World={...world,scene:prior,saveCompatibility:c.REST_COMPATIBILITY,previousStairsSaveCompatibility:undefined};
const run=<T>(steps:Generator<void,T>)=>{let r=steps.next();while(!r.done)r=steps.next();return r.value;};
it('registers the exact old home and every previous world projection while retaining resources and actor bounds',async()=>{
 expect(JSON.parse(c.preFloorsCompatibilitySource(scene)).simulationVersion).toBe(42);expect(await c.sha256(c.preFloorsCompatibilitySource(scene))).toBe(c.STAIRS_COMPATIBILITY);expect(await c.sha256(c.preStairsCompatibilitySource(scene))).toBe(c.REST_COMPATIBILITY);expect(await c.sha256(c.preRestCompatibilitySource(scene))).toBe(c.WORK_COMMUTE_COMPATIBILITY);
 const {voxelSize,...live}=scene.objects.find(o=>o.id==='oldtown_044')!.spec as import('../src/scene/object-dsl').ObjectDslV2;const {stairways,...compiled}=compileDream(example)[0] as import('../src/scene/object-dsl').ObjectDslV2;expect(live).toEqual(JSON.parse(JSON.stringify(compiled)));
 expect(scene.economy).toEqual(prior.economy);expect(scene.routes).toEqual(prior.routes);expect(scene.objects.length).toBe(prior.objects.length);
});
it('walks from the actual door to the upper room and preserves the same upstairs pose on reload and subsequent ticks',()=>{
 let s=run(stairsReviewSteps(createCarAtSpawn(scene),world));const room=sceneInteriors(scene).find(r=>r.object.id==='oldtown_044')!;expect(s.elevation).toBeCloseTo(room.floor+8.5*room.object.scale);expect(carFootprintClear(bodyWorld(s,world),s.x,s.y,s.elevation,s.timeS,s)).toBe(true);
 const text=encodeSave(s,s.timeS,world),loaded=decodeSave(text,world).state;expect(loaded).toEqual(JSON.parse(text).state);for(let i=0;i<120;i++)s=stepInteractive(s,{throttle:0,steer:0},1/120,world);expect(s.elevation).toBeCloseTo(loaded.elevation);
});
it('keeps a paid home meal, both need values, resident rest and the old slot through the registered upgrade',()=>{
 const s=run(restReviewSteps(createCarAtSpawn(prior),old)),text=encodeSave(s,s.timeS,old),next=decodeSave(text,world).state;expect(next).toEqual(JSON.parse(text).state);expect(()=>decodeSave(text,{...world,previousStairsSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${scene.sceneId}.${c.REST_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(world,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(next);expect(slot.write(next,s.timeS)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
 let resumed=next;const resident=(state:typeof resumed)=>state.economy!.accounts.find(a=>a.id==='regular')!;for(let i=0;i<120*100 && resident(resumed).resting;i++)resumed=stepInteractive(resumed,{steer:0,throttle:0},1/120,world);expect(resident(resumed).resting).toBeUndefined();expect(resident(resumed).energy).toBeGreaterThan(80);expect(resident(resumed).credits).toBe(22);expect(resumed.economy!.consumed.lunch).toBe(1);checkEconomyState(resumed,scene);
});

it('keeps finite home-table repair escrow and progress while rerouting its changed approach',()=>{
 let s={...createCarAtSpawn(prior),broken:['home_table']};
 const caretaker=(state:typeof s)=>state.economy!.accounts.find(a=>a.id==='caretaker')!;
 const tick=(state:typeof s,doc=prior)=>stepCommerce({...state,timeS:state.timeS+.25,npcs:stepNpcs(state,.25,doc),population:stepAmbient(state,.25,doc)},{},.25,doc);
 for(let i=0;i<1600 && caretaker(s).repair?.phase!=='work';i++)s=tick(s);
 expect(caretaker(s).repair?.objectId).toBe('home_table');expect(caretaker(s).repair?.phase).toBe('work');
 const text=encodeSave(s,s.timeS,old),next=decodeSave(text,world).state;expect(next.economy!.markets).toEqual(s.economy!.markets);expect(caretaker(next).repair?.progressS).toBe(caretaker(s).repair?.progressS);expect(caretaker(next).credits).toBe(caretaker(s).credits);checkEconomyState(next,scene);
 let finished=next;for(let i=0;i<1600 && finished.broken.includes('home_table');i++)finished=tick(finished,scene);expect(finished.broken).not.toContain('home_table');expect(finished.economy!.repaired.home_furniture).toBe(1);checkEconomyState(finished,scene);
});
