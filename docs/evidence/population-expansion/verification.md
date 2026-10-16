# A fuller city, r42

The accepted mock grows from 1,370 to 1,695 placements, with 103 reusable
assembly definitions. The 14000 × 11000 world, circuit, eight checkpoints,
connected streets, transport schedules and provider boundary remain intact.
The [compiled counts](population-counts.json) record actual emitted populations.

| Population | Before | After |
| --- | ---: | ---: |
| People | 8 | 123 |
| Trees | 272 | 336 |
| Parked cars | 0 | 14 |
| Parked bicycles | 34 | 45 |
| Parked scooters | 16 | 22 |
| New resting ground wildlife | 0 | 60 |
| New garden/understory clusters | 0 | 64 |

The new people include 111 sidewalk props and four greeting NPCs. Ground wildlife
includes 11 deer, 15 hares, six foxes, six dogs, six cats and 16 sparrows. The
existing moving deer and route gull remain, alongside 256 instanced flock birds.
Four road cars, five buses, tram and rail services retain their existing routes.
Parking uses three detailed car silhouettes with solid bodies on connected aprons.

Dream 2 gains explicit `pose=rest`, `furnish(on=sidewalk)` and seeded varied
headings. Rest poses preserve parts, transforms, material, measure and body,
removing animation clocks and bone ownership only from passive instances. They
cannot suppress damage, knockables, emitters or proximity interactions. Live
source templates remain available for NPCs. Sidewalk placement requires decor,
zero setback, full-radius fit and at least eight units of inner walking clearance.
Crossings, entrances and riding surfaces stay reserved. No budget was raised:
972 generated props, 23 live rigs including player and standing character,
24 route/controllable actors, 25 NPCs, 12 routes and 400 light pools.

Nature/flora/fauna now opt into explicit habitat placements through `include`.
`asset` still imports object data without leaking district placements. New
positions were filtered against the accepted road, walking/access, water,
route and full visual reservations. Source coordinates and IDs are stable.
Existing bicycle parking reserves space before the new cars and residents.
Two street planting groups and seven planters yield to the expanded parking;
64 new garden clusters give a net increase in planting.

## Verification

Tests cover deterministic formatting, complete rest-pose rendered bounds,
immutable live templates, explicit passive ownership, forbidden interaction
freezing, sidewalk fit, an open walking corridor, varied headings and shared
instance geometry. Live coverage checks all three resident districts, connected
parking, six ground species, dry clear habitat footprints and original actor
limits. Older nature tests now compile world modules, retaining their branch,
material, articulation and clearance assertions. The material-parameter
regression still compares the original four people exactly against its saved
fixture, separately from the four newly added variants.

Native browser review inspected the five new animal/plant models and four new
resident variants from front, right, back and left. Civic, recreation, transport,
woodland and river views were captured from the actual engine. The new models
remain deliberately stylized voxel constructions. Resting populations do not
walk, flee or provide new gameplay interactions; the four new NPCs face nearby
players through bounded programs. Parked cars are not extra autonomous traffic.
No provider calls, new controller profiles or reduced-detail assets.

## Rendering observation

Matched local `?profile&test-driving=town` drive runs use 60 warm-up frames and
300 samples at 1920 × 1080, pixel ratio 1.5. Both keep the full resident world
and existing quality. [Before](profile-before.json), [after](profile-after.json),
[native before view](before.jpg), [native after view](after.jpg).

| Measurement | Before | After |
| --- | ---: | ---: |
| Mean CPU frame preparation/submission | 5.48 ms | 4.49 ms |
| Mean GPU | 1.236 ms | 1.236 ms |
| 95th-percentile GPU | 1.429 ms | 1.508 ms |
| Mean frame interval | 16.666 ms | 16.667 ms |
| 95th-percentile frame interval | 16.90 ms | 17.50 ms |
| Mean submitted draws | 212.71 | 229.76 |
| Mean triangles | 319,210 | 339,493 |
| Resident GPU geometries | 289 | 308 |

This is a local observation, not a controlled speedup claim or a result for
weaker laptops. The added passive rigs share static geometry through instancing;
quality, animation/controller caps and world residency are unchanged. The final
8-unit sidewalk-margin refinement leaves these compiled population counts and
positions unchanged.

## Media

The complete atlas, resident variants and new animal/plant sheet are refreshed.
City, school, station, recreation, airport, medical, connected waterway/cycle,
voxel terrain and four lighting views show the new populations. Additional
[woodland](../../media/population-woodland.jpg),
[meadow](../../media/population-ecology.jpg),
[understory](../../media/population-fern-understory.jpg),
[riverbank](../../media/population-riverbank-plants.jpg) and
[hospital](../../media/population-hospital.jpg) views retain context.
The scene-derived map and clean HUD are updated too.

Nine main-game clips use consecutive new simulation/render frames at 30 fps:
driving/boost 210 each, football 240, basketball 210, switching 240,
locomotion/swimming 180 each, day/night 360 and flight 300. Their GIF, HD video
and corresponding native still are refreshed together. Offline exports do not
measure live performance. Existing focused galleries of unchanged vehicles,
architecture, original flora/fauna, proportions, character mechanics and material
finishes remain accurate. Isolated bench and voxel-wall destruction clips keep
unchanged geometry and behavior. Historical evidence files are preserved.

## Completed checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 920 tests across 56 files passed.
- `npm run build`: passed (existing large-chunk advisory remains).
- `npm run docs:build`: passed; model packet, generated field contract, language reference and runnable example are in sync.
- `node scripts/dream.mjs context --features population`: includes rest poses and sidewalk/heading fields through the existing dependency closure.
- Media encoding completed for all nine newly captured clips; consecutive source-frame counts match the capture contract.
- `git diff --check`: passed.
- `node scripts/dream.mjs check docs/examples/resting-population.dream`: passed as a complete playable world, 18 resting placements.

Source fingerprints for the population implementation and authored world:

```text
f8d29cca11122213744fb3d2b9aaef875f9935bc2219dd848be2b855ef48eee9  src/scene/population.ts
833d04a37a7617428d5af5f4fe65e8caa1811a7d2c80b9961f50bf4bee6a9909  src/scene/dream.ts
5555e2e4794c97e3eaf3601967679b44b3acf3d15c37d564e87df734c204f302  src/scene/world-fixture.ts
18fc2479cfeb52333280a35844d3f8c0bbd85720825e83e59300fa0f2ee861bb  src/scene/world/life.dream
7d176066c96a68445a38c3f6742c9c8e0efa410cbfb244a5c5ac18cf7d5b5f6d  src/scene/world/street_life.dream
915954cea37a3684a1dbebdfa332115193e4b3a9a196c023d63584eeb6873bcd  src/scene/world/fauna.dream
90b6f7e8e90a2108abe65d11a628b58964c2abd4ce2e716a21cba75fa32716b2  src/scene/world/flora.dream
38a59abdf5d82ade77acbbf64e26fb14d5309872309cfc0e94bc3ee92f75ec8b  src/scene/world/nature.dream
5a11d1910941750ac0b4a113390120ba6936fc7b09fbbf6f29563476d77deebf  src/scene/world/city_people.dream
```
