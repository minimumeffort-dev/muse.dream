# Streetlights and pooled destruction

Mock world r51. Source/module SHA-256:
`279449d2653321d47ff31c07f356b215c5a4791f138c15b18f0c3f3b51bdbb68`.
Compatibility SHA-256:
`14d169db7f71cf494d85aacec65a606328bc4a590f20b37685ffb7d17f7b9622`.
Save format 7, simulation rules 8.

## What changed

All 400 existing streetlights share a measured `lamp` category and one entry-file
topple rule. Both styles retain their original geometry, scale, location and
single narrow contact. A before/after projection preserves all 1,695 placements
exactly and hashes back to the accepted r50 compatibility contract. There is no
per-lamp physics body or light added. Damage switches the existing surface pool
off; repair restores the same model, contact and pool.

`world(...,damage_pool=true)` admits static whole-object break/topple props to
streamed instancing. The world retains 128 pooled template data records and
4,096 total placements within existing source/project budgets. Active destruction
is bounded to 24 object assemblies and 128 pieces. The renderer's cache retains
at most 24 templates and 128 fragment meshes; unused geometry expires after ten
simulation seconds or yields to incoming work. The oldest cosmetic pieces may
retire early under saturation. Persistent damage never depends on available
render slots. Bounce objects and partial building zones retain the resident
24-object/128-potential-fragment bounds. Every assembly still has at most eight
fragments. The live world has 12 resident reactive objects, 27 resident potential
fragments and ten pooled template records.

[The pool stress report](pool-stress.json) applies synthetic successive contacts
to all 400 accepted lamp placements. It retains 400 independent damage records,
with peaks of 24 pieces, 24 assemblies and 112,448 bytes of shared fragment
geometry buffers. After idle eviction the owned geometry count and bytes are zero.
This is an engine/renderer allocation check, not a driven route, total browser
memory or a GPU benchmark. Regression tests also fill the 128-fragment pool with
eight-part templates and cycle through 128 distinct template data records.

## Repair and persistence

The existing caretaker service has eight targets across three connected grounds;
one is the park lamp. The other 399 lamps still need service coverage. Wages,
finite kits, notices, routes, work, restoration clearance and home travel use the
same mechanics as furniture. No automatic replenishment or free repair is added.

Run `node scripts/replay-maintenance-network.mjs --lamps` to replay actual driving,
damage, dispatch, pedestrian travel, work and return. The
[fixed-step record](fixed-step-replay.json) advances 81,601 steps at 1/120 second.
The caretaker claims the lamp at 13.25 s, reaches work at 342.75 s, restores it at
350.5 s and returns home at 680 s. One kit is used and four credits are paid once;
the bench remains broken for a later job. Conservation is checked every commerce
tick, with repeated save validation and four saved journey checkpoints. The timing
samples ran alongside tests/encoding and are not an isolated performance comparison.

The registered format-6 r50 upgrade preserves the actual browser backup's whole
state, including completed repair, balances, kit stock, memories and other damage.
Older accepted migration chains remain tested. New saves permit up to 4,096 broken
IDs while retaining 24 active assemblies/128 pieces; unpooled and historical saves
keep their original bounds. Old slots remain intact and invalid state is rejected.

## Native persistence and measured rendering

The production backup UI imported the actual r50 backup and exported format 7
with every simulation-state field unchanged. A working checkpoint then finished
in native browser play: the lamp returned, the worker received four credits,
one kit was consumed and the saved return path remained. A separate mid-route
checkpoint retained the broken lamp, bench, reserved kit/wage and outgoing worker
path after R moved the player to spawn and after saving/reloading there.
[Native state checks](native-save-checks.json). These use checkpoint imports;
the complete uninterrupted journey is the fixed-engine replay above.

The [full-quality town sample](driving-profile.json) uses an Apple M3 Ultra with
96 GiB memory, 1.5 pixel ratio, 60 warm-up frames and 300 measured frames. The
current browser panel produced a 1345 × 1279 render buffer, so these results are
standalone and not a matched comparison with the previous 1920 × 1080 run.
Frame interval averaged 16.668 ms, p95 18.1 ms; renderer CPU averaged 3.100 ms,
p95 4.2 ms; GPU averaged 1.196 ms. No owned tests, encoders or replays were
running. Resident geometry buffers measured 250,562,802 bytes, including owned
hidden fragment-cache roots. This is not total JS heap/browser/GPU memory and
it does not establish performance on a less powerful laptop.

The development reload took 12.10 seconds, with a 317 ms maximum loader heartbeat
gap. This is a single reload sample, not a cold-start or startup-improvement claim.
Visual settings, object detail, post-processing and streaming distances remain
unchanged. Large startup work and lower-powered hardware still need measurement.

## Browser and media checks

Before implementation, native driving stopped against the intact park lamp. The
new native collision lets it fall fully. That check exposed a hinge using the
narrow contact radius instead of the root body envelope; the wider foot caught
almost upright. The fix preserves the narrow driving contact and restores the
root-body hinge envelope, with a focused regression and existing hill/tree checks.
Browser inspection also found a reserved GLSL varying name. It is corrected;
both recordings were discarded and exported again with working light pools.

The impact clip has 240 actual rendered frames and the repair clip has 360, both
at 30 per simulation second with selected 22:00 review lighting. The repair review
cooperatively replays the complete actual journey to the start of work, then uses
a following review camera for twelve seconds. It does not teleport the worker.
These are offline exports, not native frame-rate measurements or an uninterrupted
native eleven-minute journey. HD video, GIF and native still are refreshed together.
Existing asset, map, movement, lighting and furniture captures retain their
represented geometry and mechanics.

README, language/model/grammar/generated contract, shared rules, proportions,
behavior, voxel, object, lighting, commerce, persistence, rendering, systems and
media guides are reviewed and updated. The complete `streetlight-repairs.dream`
example passes full-world acceptance and connects two lamp repair grounds with
an authored crossing. Highlighting covers the new field's token boundaries and
HTML escaping. No provider calls, prompt work, new NPCs or reduced quality settings.

## Completed checks

All 1,076 tests in 72 files pass, including the complete racing loop, terrain,
boat/bridge/aircraft contacts, old save upgrades, damage saturation, cache release,
light-pool enable/restore and shared lamp rules. Production typecheck/build,
34-page docs build, the complete streetlight example and both project skill
validations pass. The production build retains its existing large-chunk warning.
The diff received a source self-review, not an independent review.
