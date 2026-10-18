import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async name=>JSON.parse(await readFile(new URL(name,import.meta.url),'utf8'));
const [old,next,reloaded]=await Promise.all(['native-r70-backup.json','native-r71-backup.json','native-r71-reload.json'].map(read));
assert.equal(old.compatibilityHash,'dc6d2c4b9ab4648a7ff99d47a20e60792c1d940e299e90bbe6fa047fb4e4b66f');
assert.equal(next.compatibilityHash,'5297667c16ec9218ef46e6cbf82cfdffe826220f92572f16d85f88ef5c8c2c53');
assert.equal(old.version,16);assert.equal(next.version,16);assert.equal(next.worldTime,old.worldTime);
const {population:oldPopulation,...oldState}=old.state,{population,...state}=next.state;
assert.deepEqual(state,oldState);assert.equal(population.tick,oldPopulation.tick);
assert.equal(population.members.length,oldPopulation.members.length);
let retargeted=0;
for(const [i,member] of population.members.entries()){
 const {node,previous,...rest}=member,{node:oldNode,previous:oldPrevious,...oldRest}=oldPopulation.members[i];
 assert.deepEqual(rest,oldRest);if(node!==oldNode || previous!==oldPrevious)retargeted++;
}
assert.deepEqual(reloaded,next);
console.log(JSON.stringify({format:next.version,simulationTime:state.timeS,visualTime:next.worldTime,members:population.members.length,retargeted,otherStateExact:true,reloadExact:true},null,2));
