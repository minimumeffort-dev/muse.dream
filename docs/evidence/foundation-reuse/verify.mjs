import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deserialize} from 'node:v8';
const before=JSON.parse(readFileSync(process.argv[2]??new URL('./node-before.json',import.meta.url),'utf8'));
const after=JSON.parse(readFileSync(process.argv[3]??new URL('./node-after.json',import.meta.url),'utf8'));
for(const key of ['current','sourceHash','objects','packetEncoding','fingerprints'])assert.deepEqual(after[key],before[key],key+' changed');
assert.deepEqual(deserialize(readFileSync(after.packetFile)),deserialize(readFileSync(before.packetFile)),'decoded bootstrap values changed');
assert.deepEqual(after.calls.map(({name,hash})=>({name,hash})),before.calls.map(({name,hash})=>({name,hash})),'ordered preparation results changed');
console.log('Identical decoded bootstrap values, ordered preparation results and '+Object.keys(after.fingerprints).length+' historical fingerprints.');
