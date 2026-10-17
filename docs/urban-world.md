# A world with places to go

[Dream docs](README.md) / River city

The world has been rebuilt from scratch. It covers 1.4 × 1.1 kilometres, with an older center, garden streets, a southern neighborhood and a station district across the river. The previous racing layout is no longer a constraint.

![The actual streets, building footprints, entrances and public transport](media/city-plan.svg)

This map comes from the accepted Dream source. Roads are drawn as shared surfaces, so pavement borders cannot close an intersection. The game uses the same geometry for the road mesh, driving mask and connection checks. Run `node scripts/render-city-map.mjs` to regenerate it.

## Homes, services and work

There are 187 homes and shops across four areas, with different frontages and setbacks. The center mixes terraces, corner shops and apartments. Garden streets have more space around the houses; the eastbank has larger apartment buildings. Buildings face a street and have a visible entrance path.

![Homes and shops facing the main avenue](media/town-center.jpg)

The market hall has a square, produce stalls, a vendor and a commuter who walks there from home. Two neighborhood schools and a technical college sit among the housing and workplaces. River hospital has an entrance apron and a health worker outside. Eastbank medical center serves the station and workshop district, with its own entrance and bus stop. Offices, a library and harbor workshops give the city other destinations.

![A paved route around the primary school reaches its rear yard](media/school.jpg)

These are mock places and visible routines. There are no working interiors, hospital services or simulated job market.

## Buses, tram and regional train

Five buses run four services: the garden/market loop, the southern school/hospital loop, an eastbank medical/station loop and an airport/hospital shuttle. The tram runs along the main avenue to the central station. A regional electric train stops at two connected platforms. Street routes use the actual carriageways; tram rails share the road surface. They do not draw extra paving over streets.

![The station platform and entrance join the same streets as the football ground](media/central-station.jpg)

F boards a bus, tram or regional railcar as a passenger. The service retains its route clock; driving inputs do not take over. Underground metro and subway tunnels are not implemented yet.

Stops have named anchors, waits and platform sites in Dream. Platform paths join the pedestrian network, and served destinations must be reachable from them. The regional train is a single rigid railcar, so a shuttle turnaround cannot stack separate carriages. These vehicles follow authored schedules; they do not implement traffic signals or avoidance.

![A connected canal bridge carrying the street and cycle tracks](media/city-cycle-lanes.jpg)

Bicycle tracks follow the avenues and continue across the three bridges. Painted symbols and road center lines leave clear gaps at zebra crossings. Junction declarations create the crossings on the street arms, with stop lines before them. Duplicate stripes merge and neighboring stop lines leave the zebra clear. Street and cycle-track bends use a shared mitered ribbon, so interior anchors no longer protrude as square tiles. Walkers, drivers and cyclists share one world; you still choose your own route when controlling a vehicle.

At the outer circuit, city paving and cycle tracks stop at the carriageway. Sidewalk connections across it become painted crossings with open curbs, keeping walking routes connected. Bicycle symbols keep their complete shape or leave a gap when there is too little room. Both maps follow the same footprints, including bridge connections. [See the road-overlap checks](evidence/road-overlaps/verification.md).

## A regional airport

The western airfield now has a terminal, maintenance hangar, control tower and a lit public approach. Its bus serves River hospital; the entrance paths join the same pedestrian network as the neighborhoods. Bicycle parking and a rideable scooter sit on the public side. The hangar has a separate service road and crew entrance.

![Regional airport and its connected public and service approaches](media/airport.jpg)

The apron meets the side of the continuous runway. Public entrance paths stay outside it. Cloudhopper remains directly controllable, with its existing terrain contact and free flight. The buildings have no working interiors or flight-control operations.

![Eastbank medical center and its street-connected bus stop](media/east-medical-center.jpg)

The minimap marks schools and college with **S**, medical destinations with **+**, the airport with **A** and railway stations with **R**. These symbols come from Dream's declared site kinds. Hover the map for the key.

## River, lake and parks

The river enters at the north edge, passes under three bridges and widens into a lake that continues beyond the southern boundary. The watercourse has open ends at the world edges, rather than round pools pretending to be a river. Its banks, flow, ripples, boat clearance and swimming support remain engine-owned.

![The continuous river and lake](media/connected-waterway.jpg)

The eastbank has a 100 × 64-metre football pitch. A basketball court, sports pavilion and golf fairway occupy the southern park area. Football and basketball now support [on-foot practice](dream/sports.md): dribble, aim, charge shots and score, with a closer camera. Paved access strips join both sports grounds to their adjacent sidewalks. Paths also wrap around the two neighborhood schools to reach their rear yards, with full walking-body clearance. These ground finishes do not add NPC route planning. The other people retain their ambient routines. Full matches and golf controls are still to come.

![The football ground between eastbank streets](media/sports-park.jpg)

Woodland and meadow surround the city. Oaks, birches, firs, rowan, apple trees and willows mix with understory plants. Deer have a clear habitat, and gulls fly over the river. Destructible trees and benches remain, alongside breakable market props and shop porches.

## Everyday street life

The city has 400 streetlights along six networks, 89 additional street trees, 275 mixed street planting groups and 16 destination planters, plus 64 additional garden and understory clusters and 64 woodland trees. Forty-five parked bicycles and twenty-two scooters sit beside schools, services and transit stops on paved aprons joined to the sidewalk. Fourteen parked cars use connected civic and eastbank aprons. Separate explicit scooters near the market, airport and eastbank medical center remain controllable.

The city has 123 people across its center, neighborhoods and eastbank: 111 sidewalk residents, four new greeting NPCs and eight existing activity/commuter NPCs. Sidewalk groups preserve a walking corridor and avoid entrance paths and crossings. The 111 sidewalk residents now follow the connected pedestrian network and use crossings. Sixty deer, hares, foxes, dogs, cats and sparrows roam clear, dry habitats and flee nearby players; the existing live deer, route gull and 256 flock birds keep their routines. Ambient populations share full geometry and GPU joint poses without allocating per-member scene rigs. [Population authoring](dream/populations.md).

Four road cars use three different silhouettes: rally car, hatchback and delivery van. Transit and available rides use the remaining existing actor slots. Sixteen habitats distribute 256 decorative birds across city blocks, river, lake, woodland and meadow. These populations come from [Dream rules](dream/populations.md), filtered against the accepted streets, entrances, water and existing objects.

## Day and night

The mock starts at 10:00 and completes a day in ten minutes of play. Sun and moon lighting share one shadow map. Windows and the 400 streetlights fade on after dusk, with soft light pools fitted to the pavement. [Dream owns the clock and light declarations](dream/day-night.md).

![The market square at night](media/city-night.jpg)

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

![Woodland with habitat-specific ground wildlife and understory](media/population-woodland.jpg)

[Inspect the garden and habitat additions](media/population-assets.jpg).
