import {it,expect} from 'vitest';
import source from '../docs/examples/populated-neighborhood.dream?raw';
import omitted from '../docs/examples/omitted-furnishing.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
const identity={sceneId:'omissions',revisionId:'r1',sourceHash:'omissions'};

it('omits a stable candidate slot without renumbering or moving the other along-facing placements',()=>{
 const before=compileDreamScene(source,identity),after=compileDreamScene(omitted,identity);
 expect(before.objects.some(o=>o.id==='avenue_lights_0_0_l')).toBe(true);expect(after.objects).toEqual(before.objects.filter(o=>o.id!=='avenue_lights_0_0_l'));expect(after.surfaces).toEqual(before.surfaces);expect(formatDream(formatDream(omitted))).toBe(formatDream(omitted));
});

it('accepts the complete generated slot name when its rule prefix makes it longer than an asset ID',()=>{
 const rename=(text:string)=>text.replaceAll('avenue_lights','neighborhood_street_lighting');
 const before=compileDreamScene(rename(source),identity),after=compileDreamScene(rename(omitted),identity),id='neighborhood_street_lighting_0_0_l';
 expect(id.length).toBeGreaterThan(32);expect(after.objects).toEqual(before.objects.filter(o=>o.id!==id));
});

it.each(['[]','[other_0_0_l]','[avenue_lights_99_99_l]','[avenue_lights_0_0_l,avenue_lights_0_0_l]'])('rejects invalid omission slots %s',list=>{
 expect(checkDream(source.replace('furnish avenue_lights(','furnish avenue_lights(omit='+list+',')).ok).toBe(false);
});
