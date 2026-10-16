# Asset construction, r33

Handmade mock; no provider calls. Baseline: `00633bc936aa44f2b693f856b58f011b545485ab` (voxel city; see pinned fixture for full SHA).

## What changed

Eleven residential/commercial assembly types, the city bus, tram, regional railcar and Willow launch were rebuilt. The accepted scene still has 1,364 placements and 83 assembly definitions. Fifteen changed templates cover 197 placements. 201 placements across 17 assembly types now contain at least one voxel volume.

The asset pass adds floor-based framed glazing, panel doors, hollow gabled roof profiles, attic infill, supported porch parts, slender balcony guards, roof drainage and visible chimneys. Apartment rear window stacks repeat over every floor. Transport has cab profiles, actual wheel openings or supported bogies, window bays, passenger doors and attached fittings. The launch has a pointed hull, deck, cabin, outboard and fitted seat.

Object DSL v2 accepts visual dimensions from .1 rather than .5 local units. V1 retains .5; beams retain .5 endpoint length. Finite/max bounds, 32 parts, voxel work/grid/mesh caps, contacts, actors and debris budgets remain unchanged. Model guide, reference, EBNF note and generated contract describe the same bounds.

## Geometry evidence

[geometry.json](geometry.json) compares the current accepted scene with the same scene compiled against baseline asset modules. Counts include instanced copies and static scenery only, not terrain/landscape or moving actors.

| Static scenery | Baseline | Current |
| --- | ---: | ---: |
| Submitted triangles | 2,730,260 | 2,890,504 |
| Batches | 1,246 | 1,240 |

Triangle change: +5.87%. No world streaming or detail reduction. This is a geometry count, not a live frame-rate or low-powered laptop benchmark.

## Checks

The baseline body fixture pins the source commit and checks all fifteen assets' body, compound contacts, measurement, effective scale and floor level. Tests raycast through window apertures, check residential glazing heights and office floor spacing, chimney clearance, bogie support, separated rotating hub faces, transit passenger headroom, launch passenger/deck/roof fit and matching raw/compacted animated bounds. The three complete example files compile to the exact live assemblies. V1 rejects newly permitted thin dimensions; v2 accepts them while rejecting zero, sub-minimum, nonfinite and oversized values.

The full suite includes the complete racing circuit, off-road impact/destruction, bakery porch zones, boat bridge clearance, vehicle boarding, movement, aircraft terrain contact, deterministic replay and source/scene budgets. See the recorded test result below.

Native browser F boarded the launch from shore; W drove it to `8955,4729` with control `canal_launch`, grounded on water, seated avatar and finite movement. No browser state injection. Native four-angle galleries inspect the changed construction. The gameplay captures use the actual main renderer at 30 rendered frames per simulation second.

## Media audit

- Added `constructed-assets.jpg`, drawn from the actual six-asset gallery; [before](before.jpg) and [matching front after](after-front.jpg) retain comparable native views. Other angle images are alongside this record.
- Refreshed the full 83-assembly atlas, activities, housing/civic/transit and voxel detail galleries. Updated HUD/vendor context, town/suburb, sports, waterway, bridge, street and four time-of-day images where changed buildings/transport occur.
- Refreshed driving, switching, locomotion, swimming, day/night and flight GIF/HD pairs, with their corresponding stills. Transit passenger seats were lowered inside their roofs; these recordings do not board public transport, so their visible geometry remains identical. No interpolated frames; exports are not performance measurements.
- Retained isolated bench/wall destruction recordings because those fixture assets and their mechanics are unchanged. Car/bicycle/scooter and aircraft detail galleries, airport/medical closeups, people, birch/woodland, flora/fauna, code-to-tree, proportion grid and lab dashboard retain unchanged definitions and measured sizes. The source-generated road map remains correct: network, placement coordinates and footprints are unchanged. Earlier evidence keeps its original revision and counts.

## Limits

This is fifteen rebuilt types, not a replacement of every asset. Civic buildings, characters and organic assets retain their existing models. Geometry stays stylized; windows are surface assemblies, not enterable building interiors. Collisions remain engine-owned cylinders/heightfield. The seated rider doesn't articulate hands or pedals. No buoyancy/structural engineering simulation, prompting feature, provider integration or low-end hardware FPS claim is added.

## Executed result

- `npm test -- --maxWorkers=2 --testTimeout=60000`: **761 passed in 45 files**, 142.22 seconds locally.
- The final construction suite has **11 tests**, including clearance checks for all six chimneys, multi-floor aperture rays, transit passenger headroom and separated hub end faces. Documentation checks cover source examples, downloads and published navigation.
- `npm run build`: passed (existing >500 kB chunk advisory remains).
- `npm run docs:build`: **29 pages**; native published-format preview inspected.
- All three new complete examples passed `dream check` and exact live-assembly comparison.
- `git diff --check`: passed. Review was a self-review, not an independent audit.
- Six main-game exports: **1,470 actual PNG frames**, checked as consecutive input by the encoder, with GIF/HD pairs and corresponding stills replaced together.
- The launch also remained grounded on water and moved from `9000,4516.9` to `9000,4890.7` under native W input in the bridge review. Bridge/hull clearance is additionally verified by pure simulation tests.

Git push uses the existing authorized production and documentation integration; final deployment status is reported in the task response.

Source SHA-256:

- `src/scene/world/architecture.dream`: `cc97c283380a0bad05c19ea4a156f9c3ca2a6841338b24151c875d21797239d3`
- `src/scene/world/transit_assets.dream`: `fb5d119a8ae850fa553a6816e72677540ef2f20d9a7ed70f109ba173fc406ce8`
- `src/scene/interactive-world.dream`: `f438b87ed06cb4a95c01c1c00b17e177eaab50e4f388e5760f8061236d8ca323`
- `src/scene/object-dsl.ts`: `2a092a3fd992524cf2e726c8ef87b1d42fecf1a08340a71bc18de3ed2cae5510`
