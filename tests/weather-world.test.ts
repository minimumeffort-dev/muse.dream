import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import * as c from '../src/scene/save-compatibility';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {createCarAtSpawn,resetCar,type World} from '../src/sim/car';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {nurseryReviewSteps} from '../src/game/review-start';
import {sampleWeather} from '../src/scene/weather';
const scene=createWorldScene(),prior=c.preWeatherScene(scene);
const world=(s=scene):World=>({scene:s,roadMask:buildMaskForScene(s),driveMask:buildPaperMask(14000,11000),carRadius:11});
const current={...world(),saveCompatibility:c.WEATHER_COMPATIBILITY,previousWeatherSaveCompatibility:c.RATIONS_COMPATIBILITY},old={...world(prior),saveCompatibility:c.RATIONS_COMPATIBILITY};
it('pins r92 exactly, retains all geometry/resources/navigation and declares outdoor versus indoor work',async()=>{
 expect(await c.sha256(c.saveCompatibilitySource(scene))).toBe(c.WEATHER_COMPATIBILITY);expect(await c.sha256(c.preWeatherCompatibilitySource(scene))).toBe(c.RATIONS_COMPATIBILITY);expect(await c.sha256(c.preRationsCompatibilitySource(scene))).toBe(c.SCHOOL_INTERIOR_COMPATIBILITY);
 for(const key of ['objects','surfaces','terrain','routes','behaviors'] as const)expect(scene[key]).toBe(prior[key]);expect(scene.economy!.markets).toBe(prior.economy!.markets);expect(sceneContactData(scene)).toEqual(sceneContactData(prior));expect(ambientGraph(scene)).toEqual(ambientGraph(prior));expect(c.SAVE_SIMULATION_VERSION).toBe(38);
 expect(scene.economy!.repairs.filter(r=>r.dry).map(r=>r.id)).toEqual(['market_tables','orchard_trees']);expect(scene.economy!.repairs.find(r=>r.id==='classroom_furniture')!.dry).toBeUndefined();
});
it('preserves a genuine r92 paid batch field-for-field, derives weather from saved time and retains the original slot',()=>{
 const steps=nurseryReviewSteps(createCarAtSpawn(prior),old);let r=steps.next();while(!r.done)r=steps.next();
 const text=encodeSave(r.value,234,old),loaded=decodeSave(text,current);expect(loaded.state).toEqual(JSON.parse(text).state);expect(loaded.state.economy!.accounts.find(a=>a.id==='pocket')!.work?.id).toBe('propagate_saplings');
 expect(sampleWeather(scene.weather,loaded.state.timeS)).toEqual(sampleWeather(scene.weather,r.value.timeS));expect(sampleWeather(scene.weather,resetCar(loaded.state,scene).timeS)).toEqual(sampleWeather(scene.weather,loaded.state.timeS));
 expect(decodeSave(encodeSave(loaded.state,234,current),current).state).toEqual(loaded.state);expect(()=>decodeSave(text,{...current,previousWeatherSaveCompatibility:undefined})).toThrow('different world');
 const key=`muse-dream.save.v19.${prior.sceneId}.${c.RATIONS_COMPATIBILITY}`,rows=new Map([[key,text]]),slot=gameSave(current,()=>({getItem:k=>rows.get(k)??null,setItem:(k,v)=>{rows.set(k,v);}}));expect(slot.restored!.state).toEqual(loaded.state);expect(slot.write(loaded.state,234)).toBe(true);expect(rows.get(key)).toBe(text);expect(rows.size).toBe(2);
});
