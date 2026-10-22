# Dream 2

Dream describes a world the engine can build and run. An object is an assembly of parts with a separate physical body. A world places those objects, shapes the terrain and declares its roads, water and routes.

The source is text. It compiles into validated data for the engine. Dream 2 is designed around a small, regular vocabulary that a model can generate and repair.

![The source of a tree beside its rendered result](media/code-to-tree.jpg)

| Start here | What you'll build or learn |
| --- | --- |
| [Runnable examples](dream/examples.md) | Bouncing ball, breakable bench, hinged sign and toppling tree |
| [Quickstart](dream/quickstart.md) | Compile a complete object, then a playable world |
| [Compose objects](dream/objects.md) | Parts, materials, components, joints and physical size |
| [People and clothing](dream/people.md) | Shared anatomy, attached accessories, distinct outfits and stable physical size |
| [Build with voxels](dream/voxels.md) | Fill, carve, merge faces and break volumes into bounded chunks |
| [A whole voxel world](whole-world-voxels.md) | Construct the terrain, city, vehicles, plants and water from cells |
| [City design](city-design.md) | Research, connected destinations and the source-derived map |
| [Asset library](asset-library.md) | The mock-world assemblies and their construction details |
| [Enterable buildings](dream/interiors.md) | Supported rooms, real doorways, cutaway views and connected work |
| [Named floors](dream/floors.md) | Floor-bound furnishing, shared upstairs rest and paid repairs |
| [Stairs and upper floors](dream/stairs.md) | Matching treads and contacts, usable landings and floor-aware cutaways |
| [Connected paths](dream/paths.md) | Walkable park loops, named destinations and usable shared furniture |
| [Build a world](dream/worlds.md) | Terrain, roads, bridges, water, dedicated paths and moving vehicles |
| [Populate streets and habitats](dream/populations.md) | Connected lighting, planting, destination parking, birds and transit |
| [Day and night](dream/day-night.md) | A shared clock, changing sunlight, window glow and street lighting |
| [Shared meals](dream/social.md) | Invite an off-duty person or accept their meal, share paid food and build remembered history |
| [Shared seating](dream/seating.md) | Sit on furniture, share seats with customers and preserve occupancy |
| [Sitting and standing](dream/seating-motion.md) | Smooth body transitions, staggered steps and shared ground support |
| [Shared recipes](dream/relationships.md) | A real shared meal can unlock work, alongside personal practice |
| [Resident companions](dream/companions.md) | Finite food, shared seats, remembered meals and resumed routines |
| [Work motions](dream/work-gestures.md) | Bounded hand keyframes for jobs and repairs, shared by people |
| [Physical workstations](dream/workstations.md) | Standing points, supported hand targets, shared capacity and real worker travel |
| [Daily work attendance](dream/attendance.md) | Arrive, wait unpaid, perform real jobs and come home |
| [Rain shelter](dream/shelter.md) | Covered seats, shared claims and weather-aware home trips |
| [Rest and energy](dream/resting.md) | Recover through shared seating, resident home trips and finite work effort |
| [Staff shifts](dream/shifts.md) | Physical attendance, connected rest destinations and persistent journeys |
| [Opening hours](dream/hours.md) | Daily counter service, overnight suppliers and saved courier waits |
| [Business ownership](dream/businesses.md#own-the-station-depot) | Buy the depot, transfer capital and retain its real stock and contracts |
| [Contextual actions](context-actions.md) | Icons for nearby activities; focused Shop, Work, Bag and Business views |
| [A working market and deliveries](dream/commerce.md) | Buy food, eat, sell, work for wages and share stock with NPCs |
| [Planting and growth](dream/growth.md) | Replant fallen trees with finite saplings, paid work and persistent physical growth |
| [NPCs and control](dream/npcs.md) | Explicit ownership, reusable state machines, proximity and timed routines |
| [Prompt and run scenarios](dream/scenarios.md) | Shared resources, agents, budgets, service capacity, tasks and replayable episodes |
| [World systems roadmap](world-systems.md) | Economics, ecology, education, healthcare operations and agent evaluation |
| [Give things behavior](dream/behavior.md) | Walking, vehicle controls, contacts, doors and destruction |
| [Share interaction rules](dream/rules.md) | One table or bench rule across every matching model |
| [Generate with a model](dream/model-authoring.md) | Context, validation, repair and atomic acceptance |
| [Language reference](dream/reference.md) | Every command, field, budget and compiler API |

[Read the highlighted documentation](https://minimumeffort-dev.github.io/muse.dream/) · [Media and syntax highlighting](media/README.md)

[Rendering and performance](rendering.md) explains how static districts load and unload, and how changes are measured without lowering visual quality. [Saving and returning](persistence.md) covers local progress, downloadable backups and compatible world updates.

[Six-a-side football and basketball](dream/sports.md) covers dribbling, charged
shots, passes, tackles, keepers, home/away scores, camera framing and the Dream
connections behind each ground.

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
| Aircraft on a hillside | `/?test-movement=plane-hill` | Native controls on the eastern heath; [contact checks](evidence/aircraft-terrain/verification.md) |
| Covered market interior | `/?test-movement=interior` | [Walkthrough](media/interior.mp4), [night view](media/interiornight.mp4), [Dream source](examples/enterable-market.dream) |
| Regional airport | `/?test-driving=airport` | [Terminal, hangar and approach](media/airport.jpg); board buses with F |
| Eastbank medical center | `/?test-driving=medical` | [Medical center and bus stop](media/east-medical-center.jpg) |
| Available scooters | `/?test-vehicle=airport_scooter` or `/?test-vehicle=medical_scooter` | Walk up, press F, then drive and jump |
| Destruction replay | `/tests/visual/destruction.html` | [Destruction video](media/destruction.mp4) |

The local gallery has four viewing angles and fixed animation phases for checking connections. These inspection pages aren't part of the production build.

## What's implemented

The entire playable mock is Dream 2 source, including its player, terrain, street network and placed objects. Supported behaviors run in the engine's tested simulation. The separate [Dream Lab](https://musedream.vercel.app/lab/) now exercises prompt → proposed Dream → validated logical scenario → mock agents → local episode records. Its interpreter is a bounded town template, and its agent travel is a logical graph. It does not yet change or control the playable city. Real prompt/sketch interpretation, photo capture and the rescan workflow remain unconnected.

## Contract and compatibility

The [model prompt](dream-v2-model.txt), [command export](dream-v2-contract.json) and [grammar](dream-v2.ebnf) accompany these guides. The export comes from the compiler's command table and is authoritative for required fields and contexts.

Dream 1 remains readable. [Its syntax](dream-v1.md), [Object DSL v2](object-dsl-v2.md) and [landscape data](landscape-dsl.md) document compatibility and compiled engine formats. Dream 2, Object DSL v2 and Scene v1 are separate versions, not interchangeable names.

[Explore the planned town, suburbs, lake and sports park](urban-world.md). The whole mock world is authored in Dream 2, including streets, ground surfaces, markings and people.

[Asset construction](asset-construction.md) explains the live house, bus and launch sources and the checks that keep their parts connected.

[Work commuting](dream/commuting.md) connects resident homes, ordinary paid jobs and a saved return journey.
