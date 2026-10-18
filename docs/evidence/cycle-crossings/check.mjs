import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import * as THREE from 'three';

const baseline='552dc941c227514f5ee73cae5485ebad810f4b2f';
const source=execFileSync('git',['show',`${baseline}:src/game/streets.ts`],{encoding:'utf8'});
const output={baseline,scope:'Complete Node street meshes and exact accepted source. Buffer bytes count street geometry arrays only, not browser memory or VRAM.'};
for(const old of [true,false]){
  const v=await createServer({configFile:false,logLevel:'silent',cacheDir:'.npm-cache/cycle-crossings/audit-'+old,
    plugins:old ? [{name:'pinned-streets',enforce:'pre',load(id){if(id.endsWith('/src/game/streets.ts'))return source;}}] : [],
    server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
  try{
    const {createWorldScene,worldSource,worldModules}=await v.ssrLoadModule('/src/scene/world-fixture.ts');
    const {sha256,saveCompatibilitySource}=await v.ssrLoadModule('/src/scene/save-compatibility.ts');
    const {buildStreets}=await v.ssrLoadModule('/src/game/streets.ts');
    const {compileDreamScene}=await v.ssrLoadModule('/src/scene/dream.ts');
    const hash=await sha256(JSON.stringify([worldSource,Object.entries(worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)]));
    const scene=createWorldScene(hash),fingerprint=await sha256(saveCompatibilitySource(scene)),root=buildStreets(scene);
    const layers={},buffers=new Set();let bytes=0,triangles=0,meshes=0;
    for(const layer of root.children){const count={meshes:0,triangles:0};layer.traverse(n=>{
      if(!n.isMesh)return;count.meshes++;count.triangles+=(n.geometry.index?.count??n.geometry.getAttribute('position').count)/3;
      for(const a of [...Object.values(n.geometry.attributes),n.geometry.index])if(a && !buffers.has(a.array.buffer)){buffers.add(a.array.buffer);bytes+=a.array.buffer.byteLength;}
    });layers[layer.name]=count;meshes+=count.meshes;triangles+=count.triangles;}
    const fixture=compileDreamScene(await readFile('docs/examples/cycle-junctions.dream','utf8'),{sceneId:'check',revisionId:'r1',sourceHash:'checked-example'}),sample=buildStreets(fixture);sample.updateMatrixWorld(true);
    const cycleHits=[[1100,434],[1100,566],[1034,500],[1166,500]].map(([x,y])=>new THREE.Raycaster(new THREE.Vector3(x-800,1000,y-600),new THREE.Vector3(0,-1,0)).intersectObject(sample,true).some(h=>h.object.name==='street-cycle-tracks' || h.object.parent?.name==='street-cycle-tracks'));
    assert.deepEqual(cycleHits,Array(4).fill(!old));
    output[old ? 'before' : 'after']={source:hash,fingerprint,objects:scene.objects.length,ambient:scene.objects.filter(o=>o.ambient).length,cycleHits,layers,meshes,triangles,buffers:buffers.size,bytes};
    sample.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const m of Array.isArray(n.material) ? n.material : [n.material])m.dispose();}});
    root.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const m of Array.isArray(n.material) ? n.material : [n.material])m.dispose();}});
  }finally{await v.close();}
}
for(const field of ['source','fingerprint','objects','ambient'])assert.equal(output.before[field],output.after[field],field);
assert.equal(output.after.fingerprint,'5297667c16ec9218ef46e6cbf82cfdffe826220f92572f16d85f88ef5c8c2c53');
await writeFile('docs/evidence/cycle-crossings/geometry.json',JSON.stringify(output,null,2)+'\n');
console.log({before:output.before,after:output.after});
