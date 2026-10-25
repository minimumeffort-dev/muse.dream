import {it,expect} from 'vitest';
import family from '../docs/examples/city-person.dream?raw';
import live from '../src/scene/world/city_people.dream?raw';
import {compileDreamWorld,formatDream} from '../src/scene/dream';
import {createWorldScene} from '../src/scene/world-fixture';
import {prePeopleScene,preTreeScene} from '../src/scene/save-compatibility';
import {interactiveWorld} from '../src/scene/interactive-world';
import {assemblyBounds,measuredScale} from '../src/scene/measure';
import {hasAnimatedJoints} from '../src/scene/object-dsl';
import {HUMANOID_BONES} from '../src/scene/humanoid';

it('ships the exact live wardrobe as a complete bounded runnable example',()=>{
 expect(family).toBe(live);const a=compileDreamWorld(family),b=compileDreamWorld(formatDream(family));expect(b).toEqual(a);expect(a.assemblies).toHaveLength(16);
 const shapes=new Set<string>();
 for(const spec of a.assemblies){
  expect(spec.parts.length).toBeGreaterThanOrEqual(27);expect(spec.parts.length).toBeLessThanOrEqual(32);
  if(spec.displayName==='Traveler')expect(spec.joints??[]).toHaveLength(0);else expect(spec.joints!.map(j=>j.bone).sort()).toEqual([...HUMANOID_BONES].sort());
  shapes.add(JSON.stringify(spec.parts.map(({id,material,parent,...geometry})=>({...geometry,parent:spec.joints?.find(j=>j.id===parent)?.bone}))));
 }
 expect(shapes.size).toBeGreaterThanOrEqual(10);
});
it('changes only the 133 existing person visuals while retaining all other world data and live rig owners',()=>{
 // Compare wardrobe construction before the later, independent tree impact policy.
 const scene=preTreeScene(createWorldScene()),old=prePeopleScene(scene),changed=scene.objects.filter((o,i)=>JSON.stringify(o)!==JSON.stringify(old.objects[i]));
 expect(changed).toHaveLength(133);expect(changed.every(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='person')).toBe(true);
 const rigs=(s:typeof scene)=>s.objects.filter(o=>hasAnimatedJoints(o.spec)).map(o=>o.id);expect(rigs(scene)).toEqual(rigs(old));
 for(const [i,o] of scene.objects.entries())if(!changed.includes(o))expect(o).toEqual(old.objects[i]);

});
it('keeps the independently measured passenger inside the existing seat envelope with a matching physical head',()=>{
 const seated=interactiveWorld.assemblies.find(a=>a.displayName==='Traveler')!,standing=interactiveWorld.assemblies.find(a=>a.displayName==='Explorer')!,bounds=assemblyBounds(seated);
 expect(seated.joints??[]).toHaveLength(0);expect(seated.parts).toHaveLength(31);expect(bounds.min.y).toBeCloseTo(-16,5);expect(bounds.max.y).toBeCloseTo(34.5,5);expect(bounds.min.x).toBeGreaterThanOrEqual(-10-1e-5);expect(bounds.max.x).toBeLessThanOrEqual(19+1e-5);expect(Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))).toBeLessThanOrEqual(7.55+1e-5);
 expect(measuredScale(seated)).toBeCloseTo(12.5/50.5,7);expect(seated.body.colliderRadius*measuredScale(seated)).toBeCloseTo(8*12.5/50.5,7);expect(seated.body.colliderHeight!*measuredScale(seated)).toBeCloseTo(42*12.5/50.5,7);
 const volume=(p:typeof seated.parts[number])=>p.size.reduce((a,b)=>a*b,1);
 const head=(spec:typeof seated)=>spec.parts.filter(p=>p.position[1]>20).sort((a,b)=>volume(b)-volume(a))[0]!;
 expect(head(seated)).toBeDefined();expect(head(standing)).toBeDefined();
 for(const axis of [0,1,2])expect(head(seated).size[axis]!*measuredScale(seated)).toBeCloseTo(head(standing).size[axis]!*measuredScale(standing),6);
});
