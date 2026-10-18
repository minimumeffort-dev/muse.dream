import {it,expect} from 'vitest';
import {compatibilityBatchEncoder,saveCompatibilitySource,preCommerceCompatibilitySource} from '../src/scene/save-compatibility';
import {createFixtureScene} from '../src/scene/fixture';
const reference=(data:unknown,rounded:boolean)=>JSON.stringify(data,(_key,value)=>typeof value==='number' && rounded ? Math.round(value*1e8)/1e8 : value && typeof value==='object' && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])) : value);

it('keeps canonical JSON ordering, escaping, arrays and the independent raw/rounded contracts',()=>{
 const row={...JSON.parse('{"__proto__":{"own":true},"constructor":7,"2":2,"10":10,"01":1,"4294967295":3}'),value:1.234567895,negativeZero:-0,tiny:1e-30,large:1e25,missing:undefined,text:'"\\\n</script>\u2028\ud800',array:[undefined,null,true,false,-3.1415926535]};
 const data={simulationVersion:17,world:{objects:[row,row]}},encode=compatibilityBatchEncoder();
 for(const rounded of [true,false,true,false])expect(encode(data,rounded)).toBe(reference(data,rounded));
 const reordered={simulationVersion:17,world:{objects:[{...row,value:7},row]}};
 expect(encode(reordered,true)).toBe(reference(reordered,true));expect(Object.hasOwn(Object.getPrototypeOf(row),'own')).toBe(false);
});

it('retains mutable one-off source checks and scopes cached sources to an accepted batch',()=>{
 const scene=createFixtureScene(),first=saveCompatibilitySource(scene),encode=compatibilityBatchEncoder();
 expect(saveCompatibilitySource(scene,encode)).toBe(first);
 for(const version of [1,2])expect(preCommerceCompatibilitySource(scene,version,encode)).toBe(preCommerceCompatibilitySource(scene,version));
 scene.objects[0]!.x+=1;expect(saveCompatibilitySource(scene)).not.toBe(first);
 expect(saveCompatibilitySource(scene,compatibilityBatchEncoder())).toBe(saveCompatibilitySource(scene));
});

it('keeps complete canonical output when the temporary text-reuse budget fills',()=>{
 const text='x'.repeat(1024*1024),data={simulationVersion:17,world:{objects:Array.from({length:20},(_,id)=>({id,text,position:[id+.1234567895,0,0]}))}},encode=compatibilityBatchEncoder();
 for(const rounded of [true,false,true])expect(encode(data,rounded)===reference(data,rounded)).toBe(true);
});
