import snapshot from './legacy-world.json';
import {parseScene} from '../../src/scene/schema';
import {objectDslSchema} from '../../src/scene/object-dsl';

/** Frozen pre-redesign world retains terrain, timber bridge and interaction regressions. */
export function createLegacyWorld(){
 const specs=new Map(Object.entries(snapshot.specs).map(([id,spec])=>[id,objectDslSchema.parse(spec)]));
 return parseScene({...snapshot.scene,player:specs.get(snapshot.scene.player),objects:snapshot.scene.objects.map(({assembly,...o})=>({...o,spec:specs.get(assembly)}))});
}
