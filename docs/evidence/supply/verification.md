# Market maintenance and replacement supplies

World r49, mock-only. Dream source/module SHA-256:
`027d990ec7540da35d8ba27cad4ac924c2d17a96186660e0b5990dd4d9355f06`.
Compatibility SHA-256:
`0fa752fb32d4b251900d87d82b50c554a91a278b8a980bf3bb0bada5add9ba75`.
Save format 6, simulation rules 6.

## What changed

One category-list repair service covers the existing market table, produce crate
and terracotta planter. The same caretaker and player job use one finite kit and
four credits per completed restoration. Existing damage, collision, path and
restoration checks still apply. No new actor, geometry, physics body or render
resource is allocated for this extension.

The station has 32 replacement kits. A two-kit delivery reserves a six-credit
supplier invoice and four-credit courier wage from the bakery, along with both
shelf capacities and the supplier's incoming treasury headroom. Handoff pays both
parties once. Cancellation refunds cargo and all reserved money. Existing
unpriced flour/bread contracts retain their former rules.

## Executed checks

The pure world test restores all three damaged market objects, returns the
caretaker home, then replenishes two kits through the actual shared transactions.
It checks conservation at every step. Focused tests cover malformed category
lists, integer invoice bounds, incoming treasury reservations, cancellation,
repeated completion, finite funds, full shelves and capacity.

Both authentic r48 backups are checked: one has a repair one second into work;
the other has a completed repair. The registered projection preserves accounts,
stock, completed counters, memories, population and fleet ownership while adding
only new depot stock and the new delivery counter. Older registered migrations
remain covered. Forged ledgers and unregistered fingerprints are rejected;
a corrupt newer local slot still blocks fallback.

In the native local browser, actual driving broke the table and crate. The
caretaker restored both, returned home, earned eight credits and consumed two
kits. [Captured state](native-two-repairs.json) and
[the running world](native-two-repairs.png) record that result. The backup UI
also previewed and restored an actual r48 in-progress repair with its one-second
progress intact. [Restore preview/result](native-r48-migration.png).

Native checking also exposed a pre-existing return-path save bug: the direct
route copied the whole home placement into a waypoint, violating the strict
coordinate-only save schema. The shared path builder now copies only x/y for
both direct and grid routes. A regression saves every step of a complete worker
journey; the original fails and the corrected path passes. A fixed-step migration replay
also validates saves repeatedly across the migrated repair and return.

The frame exporter records actual 30-fps simulation frames. The 840-frame repair
replay now restores the nearest crate first, at frame 674, and returns home at
719; the table remains damaged until the next dispatch. This is expected category
selection, not a missing repair. [Replay and paired CPU samples](fixed-step-replay.json).

The local production build also completed pickup and handoff through the actual
work menu and buttons. [Pickup](production-pickup.png),
[handoff](production-handoff.png), [exported balances](production-complete.json)
and [reload](production-reload.png) show two kits delivered, the supplier paid six
credits, and the player paid four. [Reload status](production-reload.json).
For this transaction check, validated backup fixtures changed only the player's
travel pose between station and market. This was not a native full-city driving
run. The ordinary vehicle, bridge and full-circuit regression tests passed.
Native checking of table/crate collisions and worker journeys used actual controls;
the planter's complete repair journey is covered by the pure full-world test.

The final full suite passed 1,050 tests across 68 files. Typecheck and production
build, generated-contract checks, complete Dream examples, highlighting/escaping
checks, both local skills and the published documentation build passed. The
initial documentation-link failure was resolved by adding this evidence page;
the return-path regression failed before the coordinate-only fix and passed after.

## Rendering and media

[The comparable driving sample](driving-profile.json) used 60 warm-up frames and
300 measured frames at 1920 × 1080, pixel ratio 1.5, with the ordinary full-quality
render settings. On the M3 Ultra it averaged 16.667 ms between frames, p95 18.6 ms;
CPU mean 3.244 ms, GPU mean 1.328 ms (299 GPU samples). This is one short local
sample, not a slower-laptop result or a measured optimization.

Mean draw calls (252.997), mean triangles (647,115), uploaded geometries (353)
and geometry-buffer bytes (255,358,898) match the r48 sample exactly. Thirty
resident chunks own 192,661,700 of those bytes. Geometry buffers are not total
browser RAM or VRAM. The startup timings and heartbeat gaps are retained in the
same record; that startup overlapped local media encoding and is not a clean
before/after performance comparison.

Repair, commerce, conversation and delivery videos, GIFs and stills were refreshed
together. [The decoder checks](media-check.json) confirm 840/360/240/360 consecutive
source frames and decoded video/GIF frames, 1280 × 720 GIFs and native 2400 × 1350
stills. GIF durations are 28/12/8/12 seconds; no missing-frame interpolation.
Existing asset sheets, map, road and lighting captures remain accurate because
this release changes no geometry, materials, placement, scale or lighting.

## Limits

Repairs remain local to the declared convex market square. The depot is finite;
there is no kit production, automatic courier, city maintenance dispatch or
sapling growth. Category lists do not add destruction to intact scenery. The
existing reactive-object, fragment, NPC and live-rig budgets stay unchanged.

Pure CPU samples are fixed-step simulation timings, not browser FPS. They were
recorded on an Apple M3 Ultra with 96 GiB memory. Slower laptops remain untested.
