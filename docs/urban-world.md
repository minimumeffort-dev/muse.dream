# A world with places to go

[Dream docs](README.md) / Planned world

The mock world now covers 800 × 780 metres, a little over twice its previous area. The countryside and original circuit stay where they were. A connected town sits to the east, homes have their own suburban streets to the south, and the lake and sports park sit between them.

![Connected town blocks and planted courtyards](media/town-center.jpg)

The town has 44 buildings across eleven occupied blocks and a planted public square. Apartments and offices sit alongside lower shops and a library. Streets connect at open intersections, with sidewalks around the blocks. The eastern gateway joins the racing circuit, so the town is somewhere you can drive to.

![Houses facing suburban streets with driveways and gardens](media/suburbs.jpg)

The suburbs have 36 homes with three different silhouettes. Each driveway faces a street; trees sit inside the blocks. A second access road connects the original circuit to the residential grid. The southern boulevard links it to the park and town.

![A football pitch and basketball court in the sports park](media/sports-park.jpg)

The football pitch is 100 × 64 metres. The basketball playing surface is 28 × 15 metres, with space around it. Four people practise kicks and dribbles, and visitors stand nearby. The golf park has three fairways, putting greens, sand traps and flags. These are places to explore; match rules, ball scoring and golf controls are still to come.

![Three fairways with putting greens and sand traps](media/golf-park.jpg)

The southern lake has shaped banks and the existing water ripples. A walking loop surrounds it and a second controllable launch starts on the water. The older pond, river, bridges and original vehicles remain.

![The southern lake and its wooded banks](media/south-lake.jpg)

## Everything is Dream data

[The entry file](../src/scene/world/open-world.dream) includes an [expansion module](../src/scene/world/urban_expansion.dream), which links the town, suburbs, sports park and gardens. Assets stay separate from their placements. The complete world uses 83 reusable assemblies and 715 placements. There are no model calls.

Three language primitives describe the urban ground:

- `street` joins orthogonal carriageways and sidewalks. It has ordinary road grip and doesn't consume an actor route.
- `surface` paints terrain-following polygons for turf, courts, driveways and sand. Later surfaces in the linked scene overlay earlier ones.
- `marking` adds open or closed paint ribbons. Point blocks support bounded repetition and trigonometry, including center circles and arcs.

[Compile a complete neighborhood module](examples/planned-neighborhood.dream), or read the [world guide](dream/worlds.md#streets-grounds-and-paint) and [bounds](dream/reference.md#urban-ground-bounds). The scene acceptance boundary rejects disconnected street components, obstructed carriageways and water crossings. The engine supplies intersections, terrain projection, graphics and driving; the model supplies bounded descriptions.

## Bigger without streaming

Roads, sidewalks and paint use spatial tiles with local culling bounds. Intersections use a shared union, so there aren't stacked road tiles or sidewalks running across a crossing. Buildings and static visitors use the existing compacted, instanced scenery path. Grass retains its sampling density as the world grows, while ground finishes reserve clear space.

The entire world remains resident. Mesh detail, shadows, particles, pixel ratio policy and post-processing stay the same. There is no distance-based replacement or district loading. [Rendering measurements](rendering.md) record the comparable original-start drive and a separate town drive. These local measurements do not establish a minimum laptop specification.

The current animation budget is full: 24 live jointed assemblies including the standing player. The four sports players and two pedestrians share that budget with existing wildlife and moving doors. More people can use static poses; more independent live motion will need a measured engine change. Streets currently support right angles, and the world still has one driving height per XY. There is no traffic simulation or generated terrain excavation.
