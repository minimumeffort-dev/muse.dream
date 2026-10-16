# Day and night, r28

Recorded 2026-10-16. [Accepted source counts and fingerprint](coverage.json) retain 1,327 placements, 78 assemblies, 24 route/controllable actors, 12 routes and 256 decorative birds. Geometry, actor ownership, simulation tuning and existing budgets are unchanged. The world adds a ten-minute daylight clock, explicit window emission and 375 static light pools.

## Checked behavior

The focused suites pass 80 tests, covering the new clock and lighting alongside Dream parsing/formatting, stabilized shadows, batching and local media export. The complete standalone [lantern world](../../examples/day-night.dream) passes the Dream CLI. Production typecheck and build pass, with the existing Vite bundle-size advisory.

The new checks cover bounded/duplicate declarations, legacy static-day defaults, invalid lamp ownership, root-only metadata, the 512-pool cap, phase periodicity, sun/moon handoff, night visibility parameters, retained per-vertex emission through rigid batching, terrain-fitted pool vertices and full moving-light shadow coverage. One shared night uniform drives the world; there is no point light or shadow map per lamp.

## Browser and media

The actual geometry review exposes day, dawn, dusk and night. The same city view was exported at 10:00, 17:30, 22:00 and 06:30, with no shader errors in the browser. Windows glow and the streetlights project soft pools onto the accepted terrain/deck height surface.

The new day/night replay contains 360 actual rendered frames at 30 fps. It accelerates only the lighting clock across a complete ten-minute cycle; street activity keeps its ordinary replay timing. It does not interpolate frames or measure live browser performance. The GIF, HD video and matching still are generated together. Existing driving, switching, locomotion and swimming recordings and matching stills are refreshed under the current renderer.

The street and full asset atlases were refreshed for the lamps’ daytime material. The daytime district overviews, source-derived map, unchanged asset closeups, proportion lineup and isolated destruction recording remain accurate for unchanged geometry and mechanics. The new four-state city exports and time-lapse document the changing illumination explicitly. Historical evidence reports retain their revision labels and measurements.

## Limits

The cycle is stylized rather than astronomical. Night pools are unshadowed ground effects, without wall lighting, object occlusion or source-height optical falloff. Windows emit without simulated interiors or occupancy. Static lamps cannot carry NPC/controllable ownership, knockable bodies or destruction; such combinations reject at scene acceptance. Existing NPC routines and transit schedules continue overnight. There is no weather or opening-hours simulation. All model input remains mocked.

The full world remains resident. Pixel ratio, antialiasing, post-processing, particle counts, geometry detail and the 2,048 × 2,048 shadow map keep their settings. Lower-powered laptop hardware remains untested.

## Final checks and runtime observations

`npm test -- --maxWorkers=2 --testTimeout=60000` passed 629 tests across 37 files. The subsequent surface-projection correction passed all 13 affected daylight, shadow and batching checks; the production build passed again. The correction uses the same ground/deck triangle clipping as roads, with a render-layer offset above pavement and markings. The affected night captures were regenerated.

In the actual game at the development override `?test-hour=22`, the clock stayed byte-for-byte unchanged while paused. Vehicle recovery preserved its phase (22.816292 before, 22.825552 after ordinary elapsed play). Start over returned to the inspection start hour (22.010656 just after restart). With the override absent, the authored start is 10:00. Native W input moved the car from (6330,4233) to (6505.3,4233) at night. See [nighttime game](night-driving.jpg).

## Rendering measurements

Codex in-app browser on the development Mac, normal 1.5 pixel ratio, 1,920 × 1,080 drawing buffer. The same dense-city drive uses 60 warm-up and 300 measured frames. No builds, tests or encoders ran during measurement. Pixel ratio, geometry, effects, particles and shadow-map settings retain their quality; the whole world stays resident.

| Start | CPU mean / p95 | GPU mean / p95 | Presentation mean | Draws mean |
| --- | --- | --- | --- | --- |
| [Day, 10:00](profile-day.json) | 3.76 / 4.40 ms | 1.30 / 1.44 ms | 16.67 ms | 209.76 |
| [Night, 22:00](profile-night.json) | 3.77 / 4.40 ms | 1.32 / 1.43 ms | 16.67 ms | 211.86 |

[Day context](profile-day.jpg) · [Night context](profile-night.jpg). CPU and GPU work overlap and should not be added. These are current single local measurements with normal timing variance, not a speedup claim or a guarantee on another device. Startup, sustained thermals and total GPU memory were not benchmarked. The native runtime reported no shader or console errors during the night checks.
