# Wildlife construction

2026-10-19. Mock world r79. Self-reviewed construction, motion and native browser
output. The continuing whole-library review now covers 39 of 109 loaded exports;
70 remain pending, plus separately tracked engine and optional families.

![The nine reconstructed animals](../../media/fauna.jpg)

## Construction and scope

All nine exported animal definitions are rebuilt: pigeon, gull, deer, hare, fox,
kite, dog, cat and sparrow. They cover 60 ambient members, two route actors and
256 flock birds. The kite is exported but unplaced. Parts/joints respectively:
11/0, 10/2, 32/9, 23/5, 32/8, 12/2, 30/8, 32/8 and 14/0. No per-object or live
population budget increases.

The [r78 baseline](baseline-front.png) comes from `1c44ce8` before source edits.
Matching [front](after-front.png), [right](after-right.png),
[back](after-back.png) and [left](after-left.png) exports inspect actual voxel
geometry at 2400 × 2700. Rounded faceted masses define species silhouettes;
small knee caps connect limb segments and tapered profiles form bird wings and
tails. Eyes remain visible from both front quarters. Deer and hare ears are
shorter. These are independent Dream constructions informed by the inspected
[Kenney Cube Pets preview](https://kenney.nl/assets/cube-pets), without importing
its geometry.

All old collision bodies, measure frames, resolved scales, floor heights,
horizontal visual radii, habitat rules and placements remain fixed. Explicit
clearance retains previous furnishing reservations. The shorter
ear heights lie outside their measured X axes and do not change scale. Neighboring objects, contact
geometry and the pedestrian graph remain identical. Forty-two joints across
the nine exports still obey the per-object twelve-joint cap.

The [complete animal example](../../examples/wildlife-construction.dream)
compiles to exactly the nine live definitions before world voxel policy.

## Movement and Dream

`stride(axis=z,deg=24,length=20,phase_deg=0)` is a bounded, joint-only rigid
sinusoidal rotation driven by local travel. Uniform group scale and resolved
object scale affect the cycle length. Timed head motion can coexist with it.
CPU rigs and instanced color/depth transforms use the same policy. Shared
stride periods wrap before float32 upload, preserving long-session phase without
altering saved distance. The hare's existing hop follows its shared period.
Reduced motion rests it; humanoid and sports packing stays unchanged.

The new joint capability is covered by strict schema/compiler bounds, canonical
formatting, invalid part motion, CPU distance/scale/time independence, resting
and roll-only updates, paired GPU uniforms and long-distance instance/hop checks.
The [complete five-part example](../../examples/joint-stride.dream) uses two
stride joints and a timed head glance. Generated vocabulary, model instructions,
feature packets and the highlighted reference are updated together.

These remain rigid arcade strides without animal foot-contact IK. Small toe
slip and lift can remain. Flock wing flex is still the existing bounded shader.
No pet care, harvesting, wildlife damage, animal intelligence or ecological
simulation is added.

## Persistence and native behavior

The exact r78 projection restores nine templates, all 62 placement/ambient rigs
and sixteen flock specifications. Its fingerprint equals the released furniture
world. The worker provides matching prior contacts before navigation. Every older
projection removes this revision first. Format 17 / simulation 32 are unchanged.

The historical matrix replays 49 backups without changing any saved state or
visual time. It includes jobs, money, sealed cargo, growing/repaired trees,
occupied benches, active debris, meals, vehicle ownership and sports. The old
public and review-prefix slots remain distinct. One hundred matched fixed steps
retain identical movement and animal reaction decisions across old/new worlds.

The native review restored the actual preceding fleet-review slot.
The [migrated packet](native-migrated.json) exactly retains the previous released
state and visual clock. Reverse input moved the occupied parcel truck about
21.8 metres. The [driven](native-driven.json) and [reloaded](native-reloaded.json)
packets match exactly, retaining 20 coins and two sealed bread units.
[Asserted comparison](native-check.json) · [Native pause screen](native-save.png).
No public player slot was used. Native gameplay/gallery reviews reported no
warnings or errors.

## Captures and verification

The new fauna turntable uses 240 actual rendered PNG frames. Habitat movement
uses 360, driving 210 and park context 360. Each is 30 rendered frames per
simulation second; GIF/HD/poster sets use the same source. Source/frame hashes
and unique-frame counts are in [the manifest](manifest.json). Identical rendered
frames are retained; exports are not live performance measurements.

Current ecology, neighborhood population, street and complete asset sheets are
refreshed. Other family closeups show unchanged focus geometry. Older economic
and sports clips retain their historical background wildlife. The compiled map
keeps the same coordinates and envelopes. README, construction/library,
object/population, rendering/persistence and language/model documentation are
updated, with Minimum Effort typography and spacing retained.

The [full-detail geometry fixture](geometry.json) builds all 60 ambient animals,
two route actors and 256 flock birds through ordinary builders. Submitted
triangles change from 839,182 to 205,000; unique geometry/instance typed-array
buffers from 15,703,656 to 3,474,272 bytes. Family meshes increase from 57 to 64.
These are complete-family counts, not per-frame draws, browser memory, VRAM or
a measured FPS gain.

## Completed checks

- Full suite: 1,587 tests in 142 files passed, 504.45 seconds, two workers and
  the existing 60-second timeout. This includes the historical save chain,
  construction, shader, world movement, transport, sports and documentation.
- Production build and typecheck passed; Vite retains its existing large-chunk
  advisory. No new build dependency was added.
- Both complete examples passed the compiler: five parts / three joints for the
  stride demonstration, 196 parts / 42 joints across nine animal definitions.
- The generated contract matches compiler output; the objects/voxels feature
  packet contains the joint-only constructor and model instructions. Inline
  source and its rendered DOM text match the executable example exactly.
- The docs build generated all 44 pages. Native [layout](docs.png) and
  [highlighted example](highlighted-stride.png) keep Manrope body / Archivo
  headings and the warm-white Minimum Effort theme. Copy announced success;
  the browser adapter returned an empty clipboard, so native clipboard contents
  were not independently verified.
- Both project skills validated and diff whitespace checks passed.

The earlier suite ran while captures/docs were still being created: 1,585 tests
passed and two documentation checks correctly rejected the not-yet-written new
GIF. The complete run above passed after the native capture/encoding finished.
A focused hop assertion initially omitted the existing object ground lift; the
corrected check retains that lift and tests only the added hop displacement.

No low-power laptop benchmark is claimed.


## Live rendering sample

The native in-app browser ran the built-in profiler after tests and encoders
finished, on Apple M3 Ultra / 96 GiB / macOS 26.7.1. Each scenario has 60 warm-up
frames and 300 measured frames at 1280 × 720, pixel ratio 1, with the current
rendering settings and streamed world.

| Scenario | Mean CPU | CPU p95 | Mean RAF interval | Mean GPU |
| --- | ---: | ---: | ---: | ---: |
| Still | 3.181 ms | 3.700 ms | 16.667 ms | 1.523 ms |
| Driving | 3.808 ms | 5.000 ms | 16.664 ms | 1.329 ms |

The loader took 16.39 seconds in this run; its separately recorded first render
call took 130.4 ms. The final snapshot counts 138,120,618 bytes of unique resident
geometry/instance buffers, not total browser memory or VRAM. Thirty chunks are
resident, nine required, with no pending request. This short drive records no
unloads and does not prove extended-travel resource release. No warnings/errors
were reported. [Raw diagnostics](profile.json) · [Native profiler](profile.png).
These are one current-world sample on a powerful desktop, without a paired old
world or weaker laptop comparison. Focused final docs/model/stride checks also
passed all 177 tests after the documentation updates.
