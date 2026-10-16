# Dream 2

Dream describes a world the engine can build and run. An object is an assembly of parts with a separate physical body. A world places those objects, shapes the terrain and declares its roads, water and routes.

The source is text. It compiles into validated data for the engine. Dream 2 is designed around a small, regular vocabulary that a model can generate and repair.

![The source of a tree beside its rendered result](media/code-to-tree.jpg)

| Start here | What you'll build or learn |
| --- | --- |
| [Runnable examples](dream/examples.md) | Bouncing ball, breakable bench, hinged sign and toppling tree |
| [Quickstart](dream/quickstart.md) | Compile a complete object, then a playable world |
| [Compose objects](dream/objects.md) | Parts, materials, components, joints and physical size |
| [City design](city-design.md) | Research, connected destinations and the source-derived map |
| [Asset library](asset-library.md) | The mock-world assemblies and their construction details |
| [Build a world](dream/worlds.md) | Terrain, roads, bridges, water, dedicated paths and moving vehicles |
| [Populate streets and habitats](dream/populations.md) | Connected lighting, planting, destination parking, birds and transit |
| [Day and night](dream/day-night.md) | A shared clock, changing sunlight, window glow and street lighting |
| [NPCs and control](dream/npcs.md) | Explicit ownership, reusable state machines, proximity and timed routines |
| [Give things behavior](dream/behavior.md) | Walking, vehicle controls, contacts, doors and destruction |
| [Generate with a model](dream/model-authoring.md) | Context, validation, repair and atomic acceptance |
| [Language reference](dream/reference.md) | Every command, field, budget and compiler API |

[Read the highlighted documentation](https://minimumeffort-dev.github.io/muse.dream/) · [Media and syntax highlighting](media/README.md)

[Rendering and performance](rendering.md) explains how the engine keeps the full world resident and measures changes without lowering visual quality.

## Try it locally

From the repository root, after `npm ci`:

```sh
node scripts/dream.mjs check docs/examples/toppling-tree.dream
node scripts/dream.mjs compile docs/examples/breakable-bench.dream
npm run dev
```

The game runs locally at `http://127.0.0.1:5173/`. The inspection tools below require that development server; their paths are copyable instructions. The public previews work without installing anything.

| Tool | Local path | Public preview |
| --- | --- | --- |
| Complete asset gallery | `/tests/visual/dream.html?all` | [Full asset atlas](media/assets-all.jpg) |
| Shared-scale lineup | `/tests/visual/proportions.html` | [Proportion lineup](media/proportions.jpg) |
| Vehicle control review | `/tests/visual/vehicles.html` | [Vehicle switching video](media/switching.mp4) |
| Aircraft and flight | `/?test-vehicle=cloudhopper` | [Flight video](media/flight.mp4), [Dream source](examples/light-aircraft.dream) |
| Destruction replay | `/tests/visual/destruction.html` | [Destruction video](media/destruction.mp4) |

The local gallery has four viewing angles and fixed animation phases for checking connections. These inspection pages aren't part of the production build.

## What's implemented

The entire playable mock is Dream 2 source, including its player, terrain, circuit and placed objects. Supported behaviors run in the engine's tested simulation. The next input boundary is the paper sketch: Muse will interpret it and produce a proposed Dream revision. Photo capture, interpretation and the rescan workflow aren't connected yet.

## Contract and compatibility

The [model prompt](dream-v2-model.txt), [command export](dream-v2-contract.json) and [grammar](dream-v2.ebnf) accompany these guides. The export comes from the compiler's command table and is authoritative for required fields and contexts.

Dream 1 remains readable. [Its syntax](dream-v1.md), [Object DSL v2](object-dsl-v2.md) and [landscape data](landscape-dsl.md) document compatibility and compiled engine formats. Dream 2, Object DSL v2 and Scene v1 are separate versions, not interchangeable names.

[Explore the planned town, suburbs, lake and sports park](urban-world.md). The whole mock world is authored in Dream 2, including streets, ground surfaces, markings and people.
