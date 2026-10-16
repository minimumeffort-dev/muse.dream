# Interactive Dream world verification

2026-10-16. Handmade mock world r11 at `http://127.0.0.1:5173/`.
Source fingerprints: `source-sha256.txt`. No dependencies added, provider calls,
image uploads, deployment or paid-model experiments.

## Scope

Ten additional Dream assemblies: locomotive, carriage, plane, launch, bicycle,
skateboard, station, boathouse, covered stone passage and seated traveler.
The same parsed source declares five routes, nine placements, wall/roof contacts,
rideable seats, proximity doors, steam and a continuous rounded watercourse.
The accepted world has 427 objects. `compiler-metrics.json` records the compiled
assemblies, route kinds/point counts and actor mesh counts.

## Executed checks

- `npm test`: **252 passed, 16 files**, including 30 new interaction tests.
  Full output is `tests.txt`. Covers DSL rejection/budgets, route spacing and
  waits, shuttle reversal, landing/takeoff, deterministic passenger replay at
  30/60/144 render fps, safe boarding/return, moving contacts, openings, roof
  underside/landing contacts, doors, wheel axes, geometry batching, steam caps,
  watercourse continuity, boat wakes and bridge-deck rejection without rails.
  Existing complete ordered circuit, ice/boost, hill jump, road, bridge and
  terrain-placement regressions also passed.
- `npm run build`: typecheck and production build passed. `build.txt` preserves
  the existing large-chunk warning. JS is 747.52 kB, 200.89 kB gzip.
- Vite SSR module measurement: six moving actor assemblies reduce from
  **103 to 50 meshes** after batching. The geometry test compares precise
  animated bounds before/after batching at multiple rolling distances and a
  rotated root; wheels retain independent pivots.
- Self-reviewed the actual source/test diff against the pre-request local
  snapshot. Corrected roof/deck proportions, a boat path intersecting a bridge,
  sampling that could omit a route endpoint, unsupported player traits and
  water-route bridge-deck validation. This was self-review, not independent review.

## Actual browser evidence

Codex in-app browser, natural 1280 × 720 viewport, WebGL, local Vite server.
Only public controls and read-only DOM diagnostics were used for the game.

- `front.png`, `back-open.png`: all ten new assemblies, front/rest and
  back/phase-3/nearby-door poses. The inspection gallery uses the same compiler
  and object builder as the game.
- `railway.png`, `passage.png`, `station.png`, `boat.png`: the actual world
  placements, shared railway centerline, covered opening, open station door,
  and launch west of the footbridge. These are geometry-review views, not
  gameplay boarding tests for every vehicle.
- `river-source.png`, `river-outlet.png`: continuous banks widening into rounded
  pools. The river compiles to one polygon, with no internal water tile seams.
- `riding.png`, `browser-metrics.json`: F boarded the bicycle from spawn;
  it moved from (1065,1425) to approximately (1080,1519), speed 35, while race
  progress stayed at lap 1/checkpoint 1. F restored the parked car at (1045,1360).
  Paused actor diagnostics stayed identical while F was pressed.
- `driving.png`, `driving-metrics.json`: held W after reload. The car drove the
  crest, jumped and landed, entered the boost with 61 active particles, and
  continued off the curve into terrain. The camera quaternion stayed identical
  through all three observations. This checks the preserved driving flow;
  a complete lap was exercised by the simulation test, not manually in browser.
- Observed desktop diagnostics settled at 60 fps during the ride and driving
  samples. Startup readings were 41–54 fps. These are short smoke observations,
  not a cross-device benchmark or a performance guarantee.
- `browser-console.json`: no captured warning/error entries in the local game
  or geometry-review tabs. The automation host separately logged unrelated
  Statsig network failures; the local page logs were read independently.

## Limits and skipped checks

Vehicles currently offer **passenger rides on authored kinematic routes**;
WASD does not steer them. F returns to the parked car if clear; no walking or
disembarking elsewhere. Routes avoid static geometry but do not negotiate
traffic or simulate actor-to-actor/prop dynamics. The stone passage is a
freestanding covered tunnel; no hill excavation, layered terrain or underground
caves. Boats cannot travel beneath the existing heightfield bridges.

Water remains a bounded surface-wave/current simulation, with rounded source
and outlet basins. It is not an infinite ocean, river network or volume fluid.
Model output remains bounded declarative data. Real sketch interpretation,
camera/rescan workflows, mobile controls/performance, live-provider evaluation
and independent review were not tested in this slice.
