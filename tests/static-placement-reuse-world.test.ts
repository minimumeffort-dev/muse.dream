import {it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {preLoftScene,preFloorsScene,preHomeInteriorScene,preCityScene,preParkScene} from '../src/scene/save-compatibility';
import {shareStaticPlacements,objectPlacement} from '../src/scene/placement';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
it('retains every static fit, contact, graph node, link and start across changed floors and historical city layouts',()=>{
 const scene=createWorldScene(),snapshot=JSON.stringify(scene);
 for(const old of [preLoftScene(scene),preFloorsScene(scene),preHomeInteriorScene(scene),preCityScene(preParkScene(scene))]){
  const expected=old.objects.map(o=>objectPlacement(old,o)),contacts=sceneContactData(old),graph=ambientGraph(old),target={...old};shareStaticPlacements(target,scene);
  expect(target.objects.map(o=>objectPlacement(target,o))).toEqual(expected);expect(sceneContactData(target)).toEqual(contacts);expect(ambientGraph(target)).toEqual(graph);
 }
 expect(JSON.stringify(scene)).toBe(snapshot);
},60000);
