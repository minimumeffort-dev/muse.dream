# A returning foot should not teleport

2026-10-19. Mock city r72. Reviewed by the implementing agent.

The previous pass held a grounded shoe in place, but released it directly onto
the body-relative swing curve. A sharp turn could move the returning ankle by
7.60 world units in one rendered step, about 76 cm. Checking only consecutive
flat soles missed that handoff. A different turn phase could leave an old
contact beyond the rigid leg's reach and pull the pelvis towards the floor.

The shared visual contact helper now bounds horizontal return speed and facing.
A foot stays lifted until it can make its next contact. A contact that approaches
the leg's reach limit releases into a recovery step. The CPU rig and instanced
crowds pass the same two lift values into their leg solver, including the shadow
shader. Pause keeps an unfinished return unchanged. Ordinary planted contacts,
scale, stride, controls, collision, navigation and simulation state retain their
existing rules.

## Reproduce

Run `node docs/evidence/walking-swing/check.mjs`. It compares the immutable
`ff88bb1` source against this checkout on straight travel, curves, sharp
reversals and a stop/restart at 30, 60 and 144 rendered steps per second,
using the 14-unit NPC walk and the existing 55/95-unit player speeds.
These are flat-plane numerical rig checks, not browser FPS measurements.

At the NPC walking speed, the new maximum horizontal ankle step is 1.87 world units at 30 samples per
second, 18.7 cm. Maximum horizontal movement between consecutive flat-sole
samples is 1.64e-13 world units. The pelvis stays above 18.54 local units in
these cases, compared with a resting height of 25. Tests separately cover
pausing a pending touchdown, early contact release, instanced targets/facing,
reset, reduced motion, sitting, working, eating, jumps, swimming and sports.
[Exact cases](metrics.json), [comparison output](metrics-check.txt),
[original failing regression](regression-before.txt) and [focused tests](focused-tests.txt).

The full city retains 1,769 objects, 181 ambient members and the r72 save
fingerprint `b1a3a8d992797f3b4d1286b6dd387d11938e4a263b613716a1f4f3b5bcb4f335`.
No Dream vocabulary, authored source or save migration changes. The extra two
lift floats use 968 bytes across the live world's material batches. Geometry
index counts and draw counts are unchanged. This is buffer accounting, not total
browser memory or VRAM, and no weaker-laptop benchmark was performed.

## Native review and media

The browser review uses the actual character and crowd shaders, plus the city
walking controls, reversal, release, jump, zoom and pause. The character close-up
shows CPU and instanced movement side by side through a reversal and stop. The
city clips use the ordinary fixed-step engine. The run/jump capture starts in the
open park, avoiding the former building occlusion. Normal starts are unchanged. GIF, HD video and matching stills
are regenerated from 1,080 actual PNG frames; no interpolation is used.

README, the humanoid behavior guide, rendering notes, AGENTS and media provenance
are updated together. Static construction views and the city map remain accurate
because no geometry or placement changes. Older activity clips retain their
pinned actions; the three updated sets show this animation correction.

Feet still use the body's support plane rather than sampling hills or steps
independently. This is procedural rigid articulation, without motion capture or
skinned clothing. Self-review is not independent review.

## Release checks

- Full suite: **1,469 tests passed in 123 files**, 326.83 seconds, with two
  workers and the unchanged 60-second per-test timeout.
- Focused character, contact, ambient and sports checks: **58 tests passed**.
  After the development-only capture framing adjustment, **72 startup, media,
  animation, crowd and sports checks** pass, followed by another production build.
- Typecheck, production build and the **44-page** docs build pass. The existing
  large-bundle warning remains. The humanoid Dream example compiles with 26
  parts and twelve joints; it is an asset check, not complete-world acceptance.
- All three GIF/HD pairs decode. The 1,080 PNG frames have the expected 2400 ×
  1350 dimensions and are newer than the final rendering source. Posters are
  regenerated from those same sequences.

[Full tests](tests.txt), [focused checks](focused-tests.txt), [final focused checks](final-focused-tests.txt), [build](build.txt),
[docs build](docs-build.txt), [example check](example-check.txt),
[media audit](media-check.txt), [source/frame/output manifest](media.json) and
[tested source hashes](tested-source.json). The existing malformed-cylinder
negative test emits its expected geometry warning; the native character and
city reviews report no warnings or errors.
