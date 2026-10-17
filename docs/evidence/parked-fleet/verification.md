# The destination parking becomes usable

## Acceptance

Make every existing generated bicycle, scooter and car/van an available ride,
without moving or simplifying its construction. Keep original racing, public
transport passengers, collision clearance, parked poses, saved economy and world
streaming. Do not create a live rig for every parked object. Mock-only.

The live r47 world retains 1,695 objects and the same 81 parking placements:
45 bicycles, 22 scooters, four sedans, five hatchbacks and five vans. Their
source uses `furnish(...,role=controllable)`. Explicit placements can use
`parked=true`. An imported passenger model can gain a driver control profile
on a validated local copy through `asset.control`; the original exported NPC
model retains its passenger capability. Labels never select ownership.

Dormant parking supports ground profiles; boats and planes keep their existing resident control/support path. It has a 256-record cap, separate from the 24 resident route actors or controllable vehicles.
One occupied fleet rig must fit the existing 24 live-assembly cap, including
the standing character and original player car. Untouched seeds stay instanced
in streamed chunks. Occupied/moved seeds collapse in both color and shadow
passes. Moved local poses batch by model and rigid part; their wheel phase is
baked only on parking/ownership/residency changes. Prototype geometry and local
instance buffers are released when their destination leaves residency.

The simulation retains immutable seed cylinders and spatially indexed moved
poses. Occupied/moved seeds no longer obstruct their old positions. Walkers wait
for moved vehicles on their pavement; roaming animals query the updated contacts.
The accepted Scene is not mutated by ownership or parking.

## Bugs caught during verification

The first implementation treated the parked fleet as resident actors. Dormancy
and budget assertions caught that before integration. A subsequent full-world
boarding check found two station bicycles were overshadowed by the regional
train's broad boarding cylinder. Boarding now measures declared compound contact
footprints where present. All 81 rides can be boarded from their real dry exit
points. Airport passenger boarding remains available from a clear platform
approach; a closer bicycle can now legitimately be the nearest available ride.

Existing tests that classified generated parking as decorative or counted every
parked template as a live actor were updated to the new explicit contract.
Their coverage, placement, geometry and original limits remain checked. The
first complete run also found missing documentation media and two changed
error-string expectations; these were fixed before the passing final run.

## Persistence

Save format 5 / simulation version 4 permits 281 saved unoccupied poses. Old
formats retain the 24-record bound. The host registers the exact r46 projection,
including its former prop roles and locally adapted seats, before offering an
upgrade. Restore validates old ownership against that old world. Unknown or
forged old vehicle ownership fails. Earlier r44/market migration paths remain.
Original slots are retained; corrupt newer slots block fallback and writes.

- Dream source/module SHA-256:
  `9b4a8530a3138ee9a87d04d00d24bfba0d57a28b1a8058b3fa7c4278a2f67720`.
- Current accepted world/simulation:
  `12bf26fd5c21822fa347406211a5e7abe71c00c0d08199b4f58c7fc755470e75`.
- Exact projected r46 world/simulation:
  `41d7da9d2228df8a28a08d7db9713602482f312be20a04b6e50be2c028909def`.

## Running browser checks

Native Codex in-app browser, Apple M3 Ultra / 96 GiB, 1280 x 720 viewport,
normal full-quality settings. Review saves use an isolated namespace. The public
player's save was not opened or replaced.

- Boarded a market parking bicycle, used normal steering/throttle, dismounted,
  saved and reloaded. The same parked pose, signed wheel distance and foot
  position returned, with one local instanced prototype. Reboarding and a second
  reload retained that bike as the one active rig, with no parked duplicate.
  `before-reload.json`, `after-reload.json`, active reload records and still.
- Rode and jumped a generated electric scooter. The exit action disabled while
  airborne. Landing/dismount restored the standing character and left the scooter
  instanced at its new pose. Native records/still are included.
- Drove/boosted the locally adapted hatchback and drove/parked the delivery van.
  Both activated one rig, then returned to instanced local poses. Native records
  and parked stills are included. No warning/error logs appeared in the van run.
- Opened the actual earlier format 4 delivery backup through Backups, reviewed
  the compatible-world preview and restored it. It retained 18 credits, two
  sealed loaves, its destination, shelf stock and vendor memory. The fixture,
  native UI record and pause still are retained.
- Imported a diagnostic save arranging all 81 moved parking vehicles in an open
  area. This is a render stress fixture, not a naturally played trip or authored
  city layout. It produced five local prototypes and 292 rigid-part instances,
  with no active fleet rig. The view loaded 20 chunks after unloading 26; the
  diagnostic counted 168,863,888 resident render-buffer bytes. This is not total
  heap, worker cache, texture or VRAM usage, nor a performance comparison.
- Restored the actual moved-bike backup across the city. Chunk unload count
  reached 60; fleet prototypes fell from five to one and part instances from
  292 to four. The same bicycle pose returned. Manual zoom was exercised during
  the stress view, so total memory across those two views is not comparable.
  `fleet-stress.*` and `after-eviction.json` retain the observations.

The production build on an isolated local origin also restored the moved-bike
backup, boarded it, saved and reloaded with the same active owner. The native
production UI/state records are included; warning/error logs were empty.

## Matched native performance sample

No test/build/encoding process was running for this sample. The original
`?profile` drive used 60 warm-up and 300 measured frames, with 299 GPU queries,
1280 x 720 viewport and pixel ratio 1.5. It ended at the same
`7668.5,4233.0,1.5` as the previous startup release.

| Metric | Previous release sample A | Usable parking |
| --- | ---: | ---: |
| Mean CPU prepare + submission | 3.209 ms | 3.247 ms |
| CPU p95 | 4.400 ms | 4.400 ms |
| Mean GPU query | 1.328 ms | 1.305 ms |
| Mean frame interval | 16.665 ms | 16.667 ms |
| Frame interval p95 | 18.900 ms | 18.200 ms |
| Mean draws / triangles | 253 / 647,115 | 253 / 647,115 |
| Uploaded geometries | 353 | 353 |
| Counted render-buffer bytes | 255,358,898 | 255,358,898 |

The same 30 chunks and 1,815 constructed geometries were resident. Initial load
was 12,132.9 ms with a 298.5 ms maximum 50 ms-heartbeat gap. Those values are
similar to the previous release's 11.5–12.2 seconds and 289–293 ms. This is one
local sample showing retained original-route performance and geometry, not a
speed improvement or a measurement of a low-powered laptop. The full-fleet
fixture above checks residency/resource behavior; it is not the measured route.
`after-drive.json` retains the current raw report, loader phases and state.
The previous report is in `../startup-responsiveness/after-drive-a.json`.

## Media and docs

`parking.mp4`, optional `parking.gif` and `parking.jpg` use the same 360 actual
rendered frames, 30 per simulation second; poster frame 100. Native source PNGs
were exported by `?capture`, with no interpolated frames. The sequence boards,
rides across the avenue, parks, reboards and rides again. Video is 1600 x 900;
GIF is 1280 x 720, 256 colors, no dithering, Gifsicle loss 80. Offline capture is
not a live FPS measurement.

README, population/control/NPC/reference guides, persistence, rendering,
world-system priorities, grammar, model instructions, generated command contract
and AGENTS were reviewed/updated together. The new complete `.dream` example
is compiler-checked and identical to its inline guide example. Highlighting
covers field boundaries and HTML escaping. Existing asset/movement/sports/
lighting/destruction recordings retain their represented construction and
controls. Market/conversation UI is unchanged; a fixed-step replay confirms the
existing delivery clip still boards the original car at frame 145 and exits at
300 (`delivery-media-replay.json`). Those paired captures remain accurate.

## Executed local checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 1,027 tests / 66 files
  passed, 142.80 seconds. Includes every generated ride, exact parked rig matrices,
  seed visibility/worker transfer, collision relocation, eviction/disposal,
  more than 24 saved poses, old-schema rejection and the complete save chain.
  Existing circuit, bridge, aircraft, walking, destruction and population tests
  passed.
- `npm run build`: typecheck and production build passed. Existing large-bundle
  warnings remain; thresholds and quality settings were not reduced.
- `npm run docs:build`: 34 pages built.
- `node scripts/dream.mjs check docs/examples/parked-vehicles.dream`: passed.
- Both project skills validate successfully. `git diff --check`: passed.

Local checks precede the commit. Linked production and Pages publication are
checked after the push; this note does not pre-claim that release state.

Vehicles remain arcade controls with cylinder contacts. Parking adds no keys,
prices, fuel, damage or autonomous drivers. Trucks/pickups, general destruction,
repair workers, interiors and relationships remain separate work in the active
goal. No lower-powered laptop, long-session heap test or real provider was used.

## Published review correction

The first release passed CI (1,027 tests / 66 files; 349.79 seconds on its runner)
and published 34 pages. Its live browser review caught an older transport
paragraph still calling generated scooters scenery. The follow-up corrects that
paragraph, the urban guide and duplicated AGENTS save-version guidance. It also
clarifies resident-actor wording in the NPC/reference/model guides. No runtime,
Dream vocabulary, media or saved rules change. The same captures remain accurate.
Focused docs/highlighting/example/context checks and the docs build verify this
text correction; the linked workflow reruns the complete suite after pushing it.

A broader authoring/asset-guide search also corrected the remaining references
to baked parked cranks, distinguished decorative props from available parking,
and included scooters in the older interactions overview. This is documentation
only; the inspected asset construction and paired captures remain unchanged.
