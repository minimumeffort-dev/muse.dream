import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {preFloorsScene,preHomeInteriorScene,preParkScene,preCityScene} from '../src/scene/save-compatibility';
import {shareFoundationPlacements} from '../src/scene/placement';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';

it('retains exact contacts, node order, links and starts for upper-floor, home and old-city projections',()=>{
 const scene=createWorldScene(),before=JSON.stringify(scene);
 for(const old of [preFloorsScene(scene),preHomeInteriorScene(scene),preCityScene(preParkScene(scene))]){
  const contacts=sceneContactData(old),graph=ambientGraph(old),projection={...old};shareFoundationPlacements(projection,scene);
  expect(sceneContactData(projection)).toEqual(contacts);expect(ambientGraph(projection)).toEqual(graph);
 }
 expect(JSON.stringify(scene)).toBe(before);
});
