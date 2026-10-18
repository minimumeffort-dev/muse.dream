# Wind-safe city trees, r74

All 345 measured trees now share one `topple` rule, including 342 wind-animated
placements. The existing caretaker can replant 106 of them, including all 93
furnished street trees, using finite saplings and pay. The other 239 trees remain
damaged without declared recovery coverage. This remains a mock world, with no
model calls or general vegetation simulation.

## Accepted source and preserved construction

- Baseline: `0e49ef1861e851bb9834a1a85e8db56ea7a33f8e`, r73.
- Dream source: `f7653b908f783ca1dcae62681b00f71ad400c54ed422e810d1340b5354b8832c`.
- Accepted world: `9a92fe4e540748a1420268ce0221458d161d5a9ee6180f7dd21c4b59bc95b3f7`.
- Save format 17, simulation 32. The registered tree projection restores the exact
  prior accepted world before checking older saves.

`tests/city-trees.test.ts` compares all eleven tree templates before and after
compilation, including complete prepared geometry buffers and material recipes.
Intact shapes, scale, placement, contact data and the public ambient graph remain
unchanged. The shared rule changes impact behavior and fragment ownership.
`tests/wind-topple.test.ts` checks complete cloned vertex/index data, independent
wind seeds, matching color/depth motion, materials, source-chunk disposal,
cache release, cancellation, stale replies and terminal errors.

Falling whole topplers reuse resident scenery buffers as owned copies. A missing
prototype uses the existing serialized world worker. No per-tree rig, per-cell
body or extra producer is added. Active destruction remains capped at 24
assemblies and 128 pieces; the cache retains at most 24 templates and 128 fragment
meshes. Reduced motion applies damage without flying pieces.

## Connected coverage

The tree service names all 32 service streets and uses `verge=112`, with seven
additional grounds. Its 106 targets use 5,380 navigation nodes and 20,422 directed
links. Existing 8,192-node, 32,768-link, 128-waypoint and actor limits remain.
The authoring ceiling for verge distance is now 128 units, or 12.8 metres.

An airport sidewalk corner exposed a missing turn in the sparse public graph.
For services above the previous 32-unit verge bound, the work graph may add
supported corner points between disconnected nearby public components. Both
segments must pass the full dry-pavement and body-clearance checks. No road,
paint or pavement is added. Earlier narrow-service graphs retain their paths.
The regression proves the old straight-edge graph cannot reach that target,
then validates the new outward and return paths.

## Complete engine journey

Run `node scripts/replay-maintenance-network.mjs --city-trees`.
[Raw transitions and final state](fixed-step-replay.json) record 128,461 actual
120 Hz steps. Driving input hits `garden_rowan_north`, reverses and leaves the car.
The worker travels from the market; no actor position, inventory or pay is
injected. Save checks and economy conservation run throughout.

| Event | Simulation seconds |
| --- | ---: |
| Impact | 1.2583 |
| Dispatch | 13.2583 |
| Work begins | 542.0083 |
| Planted; one sapling consumed and six coins paid once | 551.7583 |
| Mature | 731.7583 |
| Worker home and idle | 1070.5083 |

[Working](engine-working.json), [planted](engine-planted.json),
[half-grown](engine-half-grown.json) and [home](engine-home.json) checkpoints
retain the real journey. It takes about 17.8 simulation minutes to complete the
outward walk, work and return. Regional crews and maintenance vehicles remain
future work. Recorded step timings were collected alongside other CPU work;
they are diagnostics, not controlled performance comparisons or browser FPS.

## Save compatibility

Run `node docs/evidence/city-trees/check-migration.mjs`.
It archives the actual baseline commit and loads separate source-matched module
graphs. The [report](migration.json) and [result](migration-check.txt) show exact
prior accepted construction, 32 identical historical fingerprints and 36 entire
saved states plus visual clocks preserved. This includes registered old save
formats, hosted meals and the native r73 repair snapshots. No balance, stock,
reservation, relationship, ambient cycle or NPC routine is reset.

## Native review and recordings

The native in-app browser uses `?test-tree-repair=work&test-save&test-paused`.
Its `muse-dream.review-trees-r74` slot is separate from ordinary player progress.
The development pre-roll uses the full engine journey and is skipped after a
valid saved review restores. Backups are opened, previewed and restored through
the visible pause-menu controls. The [native assertions](native-check.json) and
[check script](check-native.mjs) verify the entire r73 state and clock, the
restored work reservation, one completed planting/wage, unchanged reserved stock,
an exact planted-state reload and growth retained through R. Planting materials
are conserved through the repair ledger; the `consumed` counter tracks food.
[Native replacement view](native-replacement.jpg).

The saved review skips its offline journey preparation. The two individual
loads were 48.88 seconds with pre-roll and 19.10 seconds after restoring a save,
during concurrent test/capture work on an M3 Ultra / 96 GiB. They are not a
controlled comparison, production startup or an optimization claim. The reload
still took 247 ms for its separately recorded first draw, with a maximum loader
heartbeat gap of 282.7 ms. Startup responsiveness remains a limitation.

A [paused native view](native-resources.json) after restoring and returning to
spawn recorded 22 resident chunks, twelve required chunks and 189,584,954 bytes
of unique scene/instance buffers. It had zero debris templates, pieces or cached
fragments. This is one view's typed-array accounting, excluding the complete
browser heap, textures and driver memory. It is not a before/after comparison,
unloading tour, frame-rate measurement or weaker-laptop result. Automated tests
separately dispose the source chunk and verify falling copies survive, then
release every owned buffer when the fragment cache expires.

`treefall` shows the real impact from four views. The refreshed `planting` and
`growth` sets show this street tree, rather than the previous orchard showcase.
The native exporter renders 240, 360 and 900 actual 2400 × 1350 PNG frames,
respectively, at 30 frames per simulation second. The shared encoder makes
1280 × 720 GIFs and 1600 × 900 H.264 video. Posters use frames 150, 325 and 450.
There is no interpolation or live performance claim. The 14:00 lighting preset
makes the tree readable; simulation clocks, travel, resources and growth stay
real. Growth footage covers its first thirty seconds, not the full three minutes.

The [source illustration](source-illustration.json) is refreshed from the native
page at its ordinary 1280 × 720 size. It displays the exact complete runnable
source and full tree. Its grid row now contains the canvas instead of allowing
intrinsic render-buffer height to push it offscreen. It uses the shared Minimum
Effort fonts, paper and charcoal colors. [Native guide view](guide-native.jpg).

README, rules, growth, commerce, object/behavior guides, language reference,
model instructions, generated contract, rendering and persistence notes were
reviewed and refreshed. The city map and static construction sheets remain
accurate because intact geometry and layout are unchanged. Current walking,
wardrobe and social captures retain their released behavior. Historical lamp and
orchard footage keeps its pinned transactions; this set demonstrates the new
shared tree policy and street coverage.

## Verification scope

Focused regressions cover full-world acceptance and district coverage, material
and geometry preservation, shader phase, worker ownership and cache disposal,
wide-corner routing, finite planting and migration. The complete test suite,
production and documentation builds are recorded with this slice. Review is a
self-review, not an independent audit. No real provider, live camera, weak-laptop
or total browser-memory/VRAM measurement is claimed.


## Release checks

- Final full suite: **1,492 tests passed in 127 files**, 436.58 seconds, two
  workers and the unchanged 60-second test timeout. [Complete output](tests.txt).
- The [initial run](initial-tests.txt) found stale category/fragment counts,
  a wardrobe-only comparison that included the later tree policy, a quickstart
  source mismatch and two links checked before the new poster existed. These
  were corrected before the complete successful rerun.
- [Production build](build.txt), including typecheck, passes. The existing
  large-bundle warning remains. [Documentation build](docs-build.txt) passes
  with 44 pages; source examples, highlighting and local links pass their tests.
- The new street-tree world and existing orchard world pass full-world CLI
  acceptance. The standalone toppling-tree example passes its asset check.
  Both governing skills validate without diagnostics.
- [Native backup assertions](native-check.txt), [exact release migration](migration-check.txt)
  and [media checks](media-check.txt) pass. All six GIF/video outputs decode with
  the exact 8-, 12- and 30-second durations. HD retains all 240/360/900 frames.
- Self-review covered shared validation, worker serialization/cancellation,
  fragment buffer/material ownership, supported corner turns and historical
  projection preservation. No independent review or weaker-hardware acceptance
  is claimed. The remaining recovery, startup and terrain-footing limits stay
  explicit in the product guides.
