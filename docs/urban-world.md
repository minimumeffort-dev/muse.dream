# A world with places to go

[Dream docs](README.md) / River city

The world has been rebuilt from scratch. It covers 1.4 × 1.1 kilometres, with an older center, garden streets, a southern neighborhood and a station district across the river. The previous racing layout is no longer a constraint.

![The actual streets, building footprints, entrances and public transport](media/city-plan.svg)

This map comes from the accepted Dream source. Roads are drawn as shared surfaces, so pavement borders cannot close an intersection. The game uses the same geometry for the road mesh, driving mask and connection checks. Run `node scripts/render-city-map.mjs` to regenerate it.

## Homes, services and work

There are 187 homes and shops across four areas, with different frontages and setbacks. The center mixes terraces, corner shops and apartments. Garden streets have more space around the houses; the eastbank has larger apartment buildings. Buildings face a street and have a visible entrance path.

![Homes and shops facing the main avenue](media/town-center.jpg)

The market hall has a square, produce stalls, a vendor and a commuter who walks there from home. Two neighborhood schools and a technical college sit among the housing and workplaces. The hospital has an entrance apron and a health worker outside. Offices, a library and harbor workshops give the city other destinations.

These are mock places and visible routines. There are no working interiors, hospital services or simulated job market.

## Buses, tram and regional train

Two bus loops serve the neighborhoods, school, hospital and market. The tram runs along the main avenue to the central station. A regional electric train stops at two connected platforms. Street routes use the actual carriageways; tram rails share the road surface. They do not draw extra paving over streets.

Stops have named anchors, waits and platform sites in Dream. Platform paths join the pedestrian network, and served destinations must be reachable from them. The regional train is a single rigid railcar, so a shuttle turnaround cannot stack separate carriages. These vehicles follow authored schedules; they do not implement traffic signals or avoidance.

![A connected canal bridge carrying the street and cycle tracks](media/city-cycle-lanes.jpg)

Bicycle tracks follow the avenues and continue across the three bridges. Painted symbols and road center lines leave clear gaps at zebra crossings. Junction declarations create the crossings on the street arms, with stop lines before them. Walkers, drivers and cyclists share one world; you still choose your own route when controlling a vehicle.

## River, lake and parks

The river enters at the north edge, passes under three bridges and widens into a lake that continues beyond the southern boundary. The watercourse has open ends at the world edges, rather than round pools pretending to be a river. Its banks, flow, ripples, boat clearance and swimming support remain engine-owned.

![The continuous river and lake](media/connected-waterway.jpg)

The eastbank has a 100 × 64-metre football pitch. A basketball court, sports pavilion and golf fairway occupy the southern park area. Players practise kicks and dribbles and notice a nearby visitor. Scores, matches and golf controls are still to come.

![The football ground between eastbank streets](media/sports-park.jpg)

Woodland and meadow surround the city. Oaks, birches, firs, rowan, apple trees and willows mix with understory plants. Deer have a clear habitat, and gulls fly over the river. Destructible trees and benches remain, alongside breakable market props and shop porches.

## Dream owns the connections

The [entry source](../src/scene/world/open-world.dream) owns the shared junctions, road, streets, terrain and bridges. [Civic buildings](../src/scene/world/civic.dream), [stations](../src/scene/world/stations.dream), [transport](../src/scene/world/transport.dream), [people](../src/scene/world/life.dream) and frontage modules add the places and activity.

- `junction` gives connecting streets one coordinate to share.
- `site` attaches a local entrance to an object and a clear world-space path to a named sidewalk.
- `crossing` connects pavements; `junction=true` supplies the street-arm crossings.
- `stop` connects a route's named wait to a platform or walking destination.
- `street`, `tram` and `walk` routes use the accepted network.

All declared entrances and platforms belong to one pedestrian network. The compiler rejects detached entrances, blocked paths, short overlapping street endpoints, missing destinations, unsupported water crossings and vehicles that leave their accepted domain. The new architecture has checks for connected roofs, façade details and supported canopies.

[Compile a complete city example](examples/connected-city.dream), read the [connection reference](dream/reference.md#connected-city-declarations), or inspect the [research and design notes](city-design.md).

The complete world stays resident, with the existing instancing, geometry tiles and frustum culling. Asset detail, pixel ratio, shadows, particles and post-processing retain their quality settings. Ground driving still has one height per XY; boats and swimmers use the water layer below bridges. There is no automatic road repair, generated terrain excavation or traffic solver.
