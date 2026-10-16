# Contextual street populations

Recorded 2026-10-16 against the r27 mock world. The accepted source fingerprint and complete counts are in [coverage.json](coverage.json).

## Coverage

The linked world has 78 assemblies, 1,296 authored parts, 1,327 placements, 30 streets, 211 entrance sites, 23 ground surfaces, 12 routes and 24 route/controllable actors. Sixteen furnishing rules emit 807 static objects. The world retains the existing actor, joint, terrain, route, infrastructure and destruction limits.

| Population | Accepted count |
| --- | --- |
| Avenue and neighborhood lights | 375 across five district networks |
| Additional street trees | 89 |
| Mixed verge planting groups | 280 |
| Destination planters | 20 |
| Parked bicycles / scooters | 27 / 16 |
| Decorative birds | 256 across 16 habitats |
| Road cars | 8, using three silhouettes |
| Buses | 3 on two neighborhood loops |

Destination parking creates 13 paved aprons joined to the sidewalk. Generated props are filtered against the full visual footprints of accepted objects, entrances, crossing areas, streets, bridges, water and ground infrastructure. Controllable vehicles reserve extra room to move. The starting car now sits in the road lane beside the tram rails; a contact check covers 240 seconds of scheduled traffic.

## Browser and media

The new eight-asset street kit was inspected from [front](assets-front.jpg), [right](assets-right.jpg), [back](assets-back.jpg) and [left](assets-left.jpg). Native browser exports refresh the full asset atlas, town center, suburbs, football ground, basketball court, golf park, lake, bridge cycle tracks, connected waterway and market square. The native review reported no console errors while rendering the instanced bird color and shadow shaders.

The driving, switching, locomotion and swimming clips were recaptured from the accepted r27 world at 30 rendered frames per second: 210, 240, 180 and 180 frames respectively. GIFs, HD videos and matching stills were regenerated together. Frames are actual renders, without interpolation. Static images use 2,400 × 1,350 replay exports or native review canvas pixels; atlas images use native full-page captures.

The actual main game at `/?test-npc=vendor` entered the vendor’s `hello` / `idle` state beside the on-foot player. Its native screenshot replaces the earlier NPC attention image.

Unchanged asset closeups, the isolated destruction replay, physical proportion lineup, code-to-tree image and NPC people gallery remain accurate and are retained. Historical evidence reports retain their original captures and revision labels.

## Scope and limits

All model input remains mocked and data-only. Flocks are decorative populations without individual collision or behavior programs. Furnished bicycles and scooters are parked props; separate explicit rides are controllable. Buses, the tram and regional railcar expose passenger seats and keep their scheduled NPC clocks while boarded. This pass adds no traffic avoidance, signal control or underground metro/subway layer. Underground service still needs connected entrances, platforms, tunnels and navigation with vertical clearance.

The full world remains resident. Geometry detail, pixel ratio, antialiasing, shadows, particles and post-processing keep their existing quality settings. Measurements on this development machine cannot establish low-powered laptop performance.

## Executed checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 619 tests across 36 files passed. This is the unchanged GitHub Actions configuration. The initial unrestricted local run hit five-second timeouts in 18 CPU-heavy tests, including unchanged legacy geometry suites; no assertions, reporting guards or existing timeout settings were weakened.
- `npm run build`: typecheck and production bundle passed. Vite retains its existing large-chunk advisory.
- `npm run docs:build`: 24 highlighted documentation pages built. The suite checks every downloadable Dream example, local link and published asset path, compiler vocabulary coverage, token boundaries and HTML escaping.
- `node scripts/dream.mjs check docs/examples/populated-neighborhood.dream`: accepted, including 26 generated placements and a decorative flock.
- `node scripts/render-city-map.mjs`: regenerated from the fully accepted linked world, with 30 streets and 211 entrance sites.
- Full contact samples along all eight road-car routes and bus loops stayed on their accepted carriageways without static solid intersections.

The population tests cover deterministic expansion after linking, blocked/invalid references, bounded output, passive flock restrictions, fixed instance buffers and shader bounds, phased transit clocks, district coverage, parking aprons, spawn clearance, passenger boarding and scooter driving/jumping. Existing racing, destruction, water/bridge, walking, vehicle and geometry regressions pass in the same complete run.

## Current rendering measurements

Codex in-app browser on the development Mac, normal 1.5 pixel ratio, 1,920 × 1,080 drawing buffer. Each drive uses 60 warm-up frames and 300 measured frames. No tests, builds or media encoding ran during measurement. The full world stayed resident at the existing visual settings.

| View | CPU mean / p95 | GPU mean / p95 | Presentation mean | Draws mean |
| --- | --- | --- | --- | --- |
| [Dense center](profile-town.json) | 4.15 / 4.70 ms | 1.22 / 1.45 ms | 16.66 ms | 207.85 |
| [Wooded outskirts](profile-outskirts.json) | 4.13 / 4.30 ms | 1.06 / 1.32 ms | 16.83 ms | 96.88 |

[Center context](profile-town.jpg) · [Outskirts context](profile-outskirts.jpg). CPU and GPU work overlap and should not be added. Earlier r26 reports used a different drawing buffer and camera aspect, so these are current full-quality measurements rather than a matched improvement claim. Startup compilation, sustained thermals, total GPU memory and less powerful laptop hardware were not benchmarked.
