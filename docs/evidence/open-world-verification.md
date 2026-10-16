# Open-world pass verification — 2026-10-15

This is handmade mock content. No model calls, uploads or deployment.

- World: 6000 x 4800, nine times the prior 2000 x 1600 area; 860 objects,
  12 distinct DSL assemblies, 12 hills and an eight-checkpoint winding circuit.
- Camera: fixed pitch/radius, no speed lookahead, direct horizontal centering;
  only explicit Q/E changes yaw. Rotation pressed while paused is ignored, and pausing finishes an active turn.
  Spawn is level. Actual browser driving over the opening crest and hills kept
  the orientation quaternion constant until an explicit E press.
- Simulation: complete circuit replay passes all eight ordered gates. Legacy
  collision, ICE/BOOST, jumping, height-aware obstacles and replay checks pass.
- Browser: manual driving reached checkpoint 2, jumped and landed, stopped at
  an off-road tree, and faded that blocking instance while other trees stayed
  opaque. Pause/reset and explicit camera rotation were exercised.
- Rendering: local terrain/road/marking/detail tiles, per-assembly GPU instances,
  combined compatible parts, shader-driven rigid animation, local collision and
  occlusion queries, lazy debug geometry, 10 Hz map and half-resolution bloom.
- Particle pool: 256 transient particles plus 32 world-anchored motes. Dust,
  ice shards, boost/collision sparks and radial landing bursts remain bounded;
  reduced motion clears them. Flight does not emit tire dust.

## Controlled rendering comparison

Both source snapshots were served locally in the same browser at an explicitly
fixed 1280 x 720 viewport, at the spawn, with identical renderer instrumentation.
Counters include the scene, shadow and post-processing passes. They describe
this view and machine, not a whole-world or mobile performance guarantee.

| Metric | Previous world | Expanded world |
| --- | ---: | ---: |
| World area | 3,200,000 | 28,800,000 |
| Draw calls per frame | 224 | 219 |
| Triangles per frame | 120,045 | 98,126 |

The expanded scene draws about 18% fewer triangles at the start. Both versions
reach the display's roughly 60 fps limit after warming up; manual driving through
the first hill section also reported about 60 fps. The viewport override was
removed after comparison. No claim is made about low-end GPUs or mobile devices.

## Known limits

The large road mask uses four-unit raster cells, with footprint queries in world
units. Sheet travel bounds remain exact. Original fixture masks retain one-unit
cells. Heightfields and vertical cylinders remain the physics representation;
there are no stacked roads or mesh-shaped colliders. The production bundle still
emits Vite's existing 500 kB chunk warning. Camera/photo-to-world integration and
real Muse responses are unimplemented.
