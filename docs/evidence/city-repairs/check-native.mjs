import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const read=async file=>JSON.parse(await readFile(file,'utf8')),dir='docs/evidence/city-repairs/';
const work=await read(dir+'native-work.json'),home=await read(dir+'native-home.json'),old=await read('docs/evidence/hosted-meals/native-pending.json'),upgraded=await read(dir+'native-r72-upgraded.json');
const identity=await read(dir+'identity.json');for(const backup of [work,home,upgraded]){assert.equal(backup.sourceHash,identity.source);assert.equal(backup.compatibilityHash,identity.hash);assert.equal(backup.version,17);}
assert.deepEqual(await read(dir+'native-work-economy.json'),work.state.economy);
assert.deepEqual(await read(dir+'native-work-restored-economy.json'),work.state.economy);
assert.deepEqual(await read(dir+'native-home-economy.json'),home.state.economy);
assert.deepEqual(await read(dir+'native-r72-restored-economy.json'),old.state.economy);
assert.deepEqual(upgraded.state,old.state);assert.equal(upgraded.worldTime,old.worldTime);
const worker=s=>s.economy.accounts.find(a=>a.id==='caretaker'),target='airport_lamps_1_5_r';
assert(work.state.broken.includes(target));assert.equal(worker(work.state).repair.phase,'work');assert(worker(work.state).repair.distance>9500);
assert(!home.state.broken.includes(target));assert.equal(worker(home.state).repair.phase,'home');assert.equal(worker(home.state).credits,4);assert.equal(worker(home.state).completed.repair.market_tables,1);assert.equal(home.state.economy.repaired.market_tables,1);
const before=await read(dir+'native-review-before.json'),after=await read(dir+'native-review-after.json');
assert(before.phases.some(p=>p.label==='Preparing the airport maintenance review'));assert(!after.phases.some(p=>p.label==='Preparing the airport maintenance review'));
await writeFile(dir+'native-check.json',JSON.stringify({kind:'Assertions over actual native-browser backup downloads and public serialized DOM state',target,workAtS:work.state.timeS,homeAtS:home.state.timeS,walkedWorldUnits:worker(work.state).repair.distance,onePaidRepair:true,restoredWorkEconomyExact:true,priorSavedStateAndVisualClockExact:true,savedReview:{beforeMs:before.totalMs,afterMs:after.totalMs,scope:'Single saved dev-review reload on Apple M3 Ultra / 96 GiB, not production startup or browser FPS'}},null,2)+'\n');
console.log('Native repair, return, checkpoint restore and entire r72 save upgrade are exact.');
