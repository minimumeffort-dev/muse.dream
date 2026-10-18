import {createWorldScene as createCurrent} from '../../src/scene/world-fixture';
import {preCityScene} from '../../src/scene/save-compatibility';
/** r67 remains the physical input for its historical save-chain regression tests. */
export const createWorldScene=(sourceHash?:string)=>preCityScene(createCurrent(sourceHash));
import {saveCompatibilitySource as currentSource,preCityCompatibilitySource} from '../../src/scene/save-compatibility';
import type {Scene} from '../../src/scene/schema';
export const saveCompatibilitySource=(scene:Scene,encode?:Parameters<typeof currentSource>[1])=>scene.sceneId==='mock-open-world' ? preCityCompatibilitySource(scene,encode) : currentSource(scene,encode);
