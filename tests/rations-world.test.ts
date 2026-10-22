import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {nurseryReviewSteps} from '../src/game/review-start';
const scene=createWorldScene(),prior=c.preRationsScene(scene);
const world=(s=scene):World=>({scene:s,roadMask:buildMaskForScene(s),driveMask:buildPaperMask(14000,11000),carRadius:11});
const current={...world(),saveCompatibility:c.RATIONS_COMPATIBILITY,previousRationsSaveCompatibility:c.SCHOOL_INTERIOR_COMPATIBILITY},old={...world(prior),saveCompatibility:c.SCHOOL_INTERIOR_COMPATIBILITY};
it('pins r91 exactly and adds only bounded worker policies, preserving physical data and finite resources',async()=>{
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.RATIONS_COMPATIBILITY);expect(await c.sha256(c.preRationsCompatibilitySource(scene))).toBe(c.SCHOOL_INTERIOR_COMPATIBILITY);expect(await c.sha256(c.preSchoolInteriorCompatibilitySource(scene))).toBe(c.NURSERY_COMPATIBILITY);
 for(const key of ['objects','surfaces','terrain','routes','behaviors'] as const)expect(scene[key]).toBe(prior[key]);expect(scene.economy!.markets).toBe(prior.economy!.markets);expect(sceneContactData(scene)).toEqual(sceneContactData(prior));expect(ambientGraph(scene)).toEqual(ambientGraph(prior));expect(c.SAVE_SIMULATION_VERSION).toBe(37);
 expect(scene.economy!.accounts.filter(a=>a.ration).map(a=>a.id)).toEqual(['caretaker','porter']);
});
it('restores a real in-progress r91 paid batch and every saved field without buying or eating during migration',()=>{
 const steps=nurseryReviewSteps(createCarAtSpawn(prior),old);let r=steps.next();while(!r.done)r=steps.next();
 const text=encodeSave(r.value,234,old),loaded=decodeSave(text,current);expect(loaded.state).toEqual(JSON.parse(text).state);expect(loaded.state.economy!.accounts.find(a=>a.id==='pocket')!.work?.id).toBe('propagate_saplings');
 expect(encodeSave(loaded.state,234,current)).toBeTypeOf('string');expect(()=>decodeSave(text,{...current,previousRationsSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${prior.sceneId}.${c.SCHOOL_INTERIOR_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(current,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,234)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
