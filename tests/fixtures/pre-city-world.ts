import {createWorldScene as createCurrent} from '../../src/scene/world-fixture';
import {preCityScene} from '../../src/scene/save-compatibility';
import {inheritPriorRepairCoverage} from '../../src/scene/commerce';
/** r67 remains the physical input for its historical save-chain regression tests. */
export const createWorldScene=(sourceHash?:string)=>{const scene=preCityScene(createCurrent(sourceHash));inheritPriorRepairCoverage(scene);return scene;};
import {saveCompatibilitySource as currentSource,preCityCompatibilitySource} from '../../src/scene/save-compatibility';
import type {Scene} from '../../src/scene/schema';
export const saveCompatibilitySource=(scene:Scene,encode?:Parameters<typeof currentSource>[1])=>scene.sceneId==='mock-open-world' ? preCityCompatibilitySource(scene,encode) : currentSource(scene,encode);
