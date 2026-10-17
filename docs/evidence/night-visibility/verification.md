# Night navigation visibility

Nighttime sky and ground fill now keep dark vehicles, people, paths and building walls visible outside streetlight pools. The hemisphere changes from 0.48 to 1.1 intensity at full night, with lighter blue upper/lower colours. Existing fill changes from 0.16 to 0.34 and moon direct light from 0.32 to 0.48. Daytime colours and intensities remain exact: hemisphere 1.25, sun 2.4 and fill 0.3.

The direct light still fades during the horizon handoff. Sky and fill remain available, so navigation never relies only on streetlight pools. This is stylized navigation lighting, not calibrated physical night vision. The implementation retains three lights, one 2048-pixel shadow map, all existing geometry, particle counts, post-processing and pixel-ratio settings. There is no per-lamp point light or new shadow pass.

## Native checks and media

The earlier [night still](before.jpg) and [current cycle still](after.jpg) both show cycle frame 240, near 02:03. Earlier frames were 1600 × 900; the refreshed exporter produced 2400 × 1350, so these are visual comparisons rather than a pixel-equality or performance measurement. A separate [native town view at 22:00](town-night.png) shows visibility beyond the nearest lamp.

The full cycle was exported through the dev-only capture UI as 360 actual rendered frames, 30 per simulation second, then encoded using `scripts/encode-media.mjs`. No frames were interpolated. GIF, HD video and the cycle/day/dusk/night/dawn stills were refreshed together. Other gameplay captures remain accurate because daytime lighting and geometry are unchanged. The browser reported no console errors during the cycle export. A separate normal gameplay run used F to leave the car and real keyboard movement/jumps: [walking view](walking.png), [walking diagnostics](walking.json) and [airborne state](jump.json) retain on-foot ownership and a night factor of 1. The jump sample was airborne at elevation 17.2; these are functional observations, not performance measurements.

## Verification scope

The daylight regression covers night, both horizon handoffs, exact daytime values and the existing light count. Existing checks cover pause/reduced-motion clock behavior, fixed world shadows, lamp-pool limits, material emission and complete-world authoring. Typecheck/production build, published docs build and the runnable `docs/examples/day-night.dream` are checked separately. Source fingerprints are recorded in `sources.json`. The completed local suite passes 955 tests in 59 files, with two workers and the CI timeout. The focused docs/daylight check passes 69 tests; the production build, 32-page docs build and runnable daylight example pass.

The earlier streaming slice is deployed at `311a257`; its GitHub Pages workflow passed. Static districts load and unload while physics, NPC clocks and destruction state remain resident. The new night lighting adds no geometry or actor slots. This pass does not claim a full life simulation, interior navigation, social relationships, weather or functioning businesses. Those remain explicit work in `docs/world-systems.md`. Lower-powered hardware and sustained thermal/memory-pressure testing remain outstanding.
