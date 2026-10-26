import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../assets/library/manifest.json';
import {compileDreamWorld} from '../src/engine/scene/dream';

const read=(path:string)=>readFileSync(new URL('../assets/library/'+path,import.meta.url),'utf8');
const catalogs=manifest.catalogs;
const modules=Object.fromEntries(catalogs.map(c=>[c.moduleId,read(c.path)]));

it('preserves hashed source assets and valid deduplication references without parent files',()=>{
  expect(new Set(catalogs.map(c=>c.moduleId)).size).toBe(catalogs.length);
  const paths=new Map(catalogs.map(c=>[c.path,c]));
  for(const catalog of catalogs){
    expect(createHash('sha256').update(read(catalog.path)).digest('hex')).toBe(catalog.sourceHash);
    expect(catalog.originalHash).toMatch(/^[a-f0-9]{64}$/);
    expect(catalog.objectCount).toBe(catalog.objects.length);
    expect(catalog.dependencies.every(id=>id in modules)).toBe(true);
  }
  for(const omitted of manifest.omittedExamples){
    if(typeof omitted.catalog==='string')expect(paths.has(omitted.catalog)).toBe(true);
    if(omitted.duplicates)for(const duplicate of omitted.duplicates){
      expect(paths.get(duplicate.catalog)?.objects).toContain(duplicate.catalogObject);
    }
  }
});

it.each(catalogs.filter(c=>c.compatibility==='compatible'))('compiles $path as asset data without an old world',catalog=>{
  const world=compileDreamWorld(read(catalog.path),modules);
  expect(world.layout).toBeUndefined();expect(world.economy).toBeUndefined();
  for(const field of ['objects','routes','waters','streets','surfaces','markings','behaviors','sites','crossings','sports','furnishings','flocks','scenarios','interactionRules'] as const)expect(world[field]).toEqual([]);
  expect(world.assemblies.length).toBeGreaterThanOrEqual(catalog.objectCount);
});

it.each(catalogs.filter(c=>c.compatibility==='experimental'))('keeps unsupported $path explicit',catalog=>{
  expect(()=>compileDreamWorld(read(catalog.path),modules)).toThrow();
  expect(catalog.reason).toBeTruthy();
});
