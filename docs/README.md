# Dream 2

Dream describes a world the engine can build and run. An object is an assembly of parts with a separate physical body. A world places those objects, shapes the terrain and declares its roads, water and routes.

The source is text. It compiles into validated data for the engine. Dream 2 is designed around a small, regular vocabulary that a model can generate and repair.

![The source of a tree beside its rendered result](media/code-to-tree.jpg)

| Start here | What you'll build or learn |
| --- | --- |
| [Quickstart](dream/quickstart.md) | Compile a complete object, then a playable world |
| [Compose objects](dream/objects.md) | Parts, materials, components, joints and physical size |
| [Asset library](asset-library.md) | The 53 mock-world assemblies and their construction details |
| [Build a world](dream/worlds.md) | Terrain, roads, bridges, water, dedicated paths and moving vehicles |
| [Give things behavior](dream/behavior.md) | Walking, vehicle controls, contacts, doors and destruction |
| [Generate with a model](dream/model-authoring.md) | Context, validation, repair and atomic acceptance |
| [Language reference](dream/reference.md) | Every command, field, budget and compiler API |

## Try it locally

From the repository root, after `npm ci`:

```sh
node scripts/dream.mjs check docs/examples/toppling-tree.dream
node scripts/dream.mjs compile docs/examples/breakable-bench.dream
npm run dev
```

The development server includes a [complete asset gallery](http://127.0.0.1:5173/tests/visual/dream.html?all), a [shared-scale lineup](http://127.0.0.1:5173/tests/visual/proportions.html) a [vehicle control review](http://127.0.0.1:5173/tests/visual/vehicles.html) and a [destruction replay](http://127.0.0.1:5173/tests/visual/destruction.html). The gallery has four viewing angles and fixed animation phases for checking connections. These inspection pages aren't part of the production build.

## What's implemented

The entire playable mock is Dream 2 source, including its player, terrain, circuit and placed objects. Supported behaviors run in the engine's tested simulation. The next input boundary is the paper sketch: Muse will interpret it and produce a proposed Dream revision. Photo capture, interpretation and the rescan workflow aren't connected yet.

## Contract and compatibility

The [model prompt](dream-v2-model.txt), [command export](dream-v2-contract.json) and [grammar](dream-v2.ebnf) accompany these guides. The export comes from the compiler's command table and is authoritative for required fields and contexts.

Dream 1 remains readable. [Its syntax](dream-v1.md), [Object DSL v2](object-dsl-v2.md) and [landscape data](landscape-dsl.md) document compatibility and compiled engine formats. Dream 2, Object DSL v2 and Scene v1 are separate versions, not interchangeable names.
