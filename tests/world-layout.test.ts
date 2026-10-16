import { describe, expect, it } from "vitest";
import { createWorldScene } from "../src/scene/world-fixture";
import { objectRadius } from "../src/sim/archetypes";

const scene = createWorldScene();
const named = (name: string) => scene.objects.filter(object => object.spec?.displayName === name);

describe("coherent mock world layout", () => {
  it("reconstructs the same drawing consistently, using a bounded bank of different assemblies", () => {
    expect(createWorldScene()).toEqual(scene);
    const specs = [...new Map(scene.objects.map(object => [object.spec!.displayName, object.spec!])).values()];
    const forms = new Set(specs.map(spec => "dslVersion" in spec ? JSON.stringify(spec.parts.map(({ material: _, ...part }) => part)) : spec.shape));
    expect(forms.size).toBeGreaterThanOrEqual(20);
    expect(specs.length).toBeLessThanOrEqual(128); // The existing linked-project assembly bound.
  });
  it("keeps landmarks rare and buildings together at two occupied sites", () => {
    for (const name of ["Castle", "Windmill", "Ancient ruins", "Crystal garden"]) expect(named(name),name).toHaveLength(1);
    for (const name of ["Hillside cottage", "Timber barn", "Village well", "Old apple tree"]) expect(named(name),name).toHaveLength(2);
    for (const site of [[840,1160],[2650,2070]]) {
      const nearby = scene.objects.filter(object => Math.hypot(object.x-site[0]!,object.y-site[1]!) < 260);
      for (const name of ["Hillside cottage", "Timber barn", "Village well", "Old apple tree"])
        expect(nearby.some(object => object.spec?.displayName === name)).toBe(true);
    }
  });
  it("mixes neighboring silhouettes without overlapping physical bodies", () => {
    for (let i = 0; i < scene.objects.length; i++) for (let j = i + 1; j < scene.objects.length; j++) {
      const a = scene.objects[i]!, b = scene.objects[j]!, distance = Math.hypot(a.x-b.x,a.y-b.y);
      if(a.route || b.route)continue; // Moving route clearances have their own time/height checks.
      expect(distance, `${a.id} / ${b.id}`).toBeGreaterThanOrEqual(objectRadius(a)+objectRadius(b)+16);
      if (a.x<5600 && a.y<4800 && b.x<5600 && b.y<4800 && a.spec?.displayName === b.spec?.displayName) expect(distance).toBeGreaterThanOrEqual(150);
    }
  });
  it("has dense mixed groves and open meadow, rather than uniform scatter", () => {
    const grove = scene.objects.filter(object => Math.hypot(object.x-1550,object.y-2850) < 450);
    const meadow = scene.objects.filter(object => Math.hypot(object.x-3150,object.y-2650) < 450);
    expect(grove.length).toBeGreaterThan(15);
    const trees=(objects:typeof scene.objects)=>objects.filter(o=>o.spec && 'measure' in o.spec && o.spec.measure?.kind==='tree').length;
    expect(trees(grove)).toBeGreaterThan(trees(meadow) * 3);
    expect(trees(grove)).toBeGreaterThan(10);
    expect(new Set(grove.map(object => object.spec?.displayName)).size).toBeGreaterThanOrEqual(5);
  });
});
