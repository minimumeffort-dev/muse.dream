# Walking stride correction

2026-10-19. Mock city r70. Reviewed by the implementing agent.

The player and CPU pedestrians previously advanced their gait from a time-based
frequency using world speed as though it were local model speed. A measured
person is roughly a third of the authored rig size. The body travelled much
farther than a stance foot swept backwards. Pelvis yaw also rotated both feet,
and unreachable targets were shortened by the leg solver.

Stride phase now advances from world distance divided by resolved scale and the
stance sweep. Walking uses a full stride at slow speeds rather than shrinking
both its amplitude and cadence. The soles remain flat through stance; upper-body
sway stays above the pelvis. Before solving the legs, the pelvis is lowered just
enough for both ankle targets to remain reachable. Segment lengths stay rigid.
Shoe support comes from cached ankle-local part bounds, including rotation and
size. No mesh traversal or geometry measurement runs in the animation loop.

The instanced pedestrian and sports shaders use these sole and reach rules for
both color and shadow geometry. Existing distance-driven crowd and sports phases
stay intact. Physics, movement speeds, accepted Dream source, save fingerprints,
match state and the historical save chain are unchanged. No new DSL vocabulary,
actor slots, crowd controllers, geometry or draw calls are introduced.

## Verification

The isolated release snapshot contains the staged animation patch over commit
`8fdd7aa`, excluding the separate unfinished character/outfit and HUD work.

- The new world-space stance regression fails with the released animator at all
  four tested scales. The old pose has no consecutive flat stance frames.
- With the correction, five speeds (4, 14, 35, 55 and 95 units/s) at four scales
  (.2, .306, 1 and 2) retain consecutive flat stance frames, each moving by less
  than .002 world units per 1/120-second sample after settling.
- The focused suite also checks rigid lengths, actual shoe support bounds,
  start/stop settling, 30/60/144-fps poses, jumps, sitting, working, eating,
  crawl/tread transitions, pause, reduced motion and reset.
- Native keyboard F and W leave the car and walk in the city; the public DOM
  diagnostics report foot ownership and nonzero walking speed.
- The close-up moves CPU and instanced walkers at 14 units/s over a world-aligned
  grid. The same view includes a 55-unit/s runner and a swimmer. Color and shadow
  shaders compile in the browser without reported warnings or errors.

The [world and stance metrics](metrics.json) pin the unchanged r70 save fingerprint
`dc6d2c4b9ab4648a7ff99d47a20e60792c1d940e299e90bbe6fa047fb4e4b66f`,
1,769 objects and 181 ambient members. Across the 20 steady-travel cases, maximum
measured stance-frame drift was 0.0000101 world units. Reproduce from this release
after checking out commit `f19e215`, with
`node docs/evidence/walking-strides/check-world.mjs`. The later r71 wardrobe
changes the accepted character source; it has its own verification record. Test/build totals and
media hashes are recorded after the release checks below.

## Media and limits

The character close-up, city locomotion, pedestrian, swimming, football and basketball
recordings are refreshed as paired GIF/HD video exports with matching stills.
Every source frame is rendered at 30 frames per simulation second through the
local `?capture` exporter. These are offline exports, not laptop frame-rate tests.
README and the humanoid behavior guide describe the correction. Static model,
city-layout and construction images remain accurate because this change does
not alter their source geometry or placement. Other historical activity clips
retain their recorded actions and appearance; they are not evidence for the
corrected walking cadence.

This remains rigid arcade animation on a shared support plane. Acceleration,
stopping, turns and uneven ground do not have independent persistent world-space
foot anchors or per-foot terrain probes. No motion capture, skinned clothing,
low-end laptop benchmark or independent review was performed.

## Release checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: **1,385 passed, 112 files**,
  282.93 seconds. The first run caught the missing report in the isolated copy;
  the complete rerun includes the repaired documentation link.
- `npm run build`: typecheck and production build pass; the existing large-chunk
  warning remains.
- `npm run docs:build`: **43 pages**.
- `node scripts/dream.mjs check docs/examples/humanoid.dream`: one bounded rig,
  26 parts and 12 joints; this standalone object is not a complete-world check.
- All six GIFs and six HD videos decode successfully. [Media manifest](media.json)
  pins their hashes, source dimensions, frame counts and matching still choices.
  Total: **2,220 actual source frames**, 74 simulation seconds.
- [Runtime and review-source hashes](tested-source.json) match the isolated release
  snapshot byte for byte. The larger unfinished outfit/DSL and pause-HUD changes
  were excluded from this patch.

Full output: [tests](tests.txt), [build](build.txt), [docs](docs-build.txt),
[object example](example-check.txt), [media decoding](media-check.txt).
