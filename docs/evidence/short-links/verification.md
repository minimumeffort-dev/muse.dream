# Short supported work links, simulation 54

The accepted Dream world stays r113. Simulation 54 changes future work-route
choices over that same data. It adds no geometry, contacts, public crowd nodes,
actors, resources or model vocabulary. Model/provider calls remain mocked.

## Cause and fix

The work graph considered nearby public pavement pairs only when they belonged
to different public connected components. At two clear corners, a long loop
already connected the points, so the short supported link was skipped. The
weighted A* distance calculation itself agreed with independent Dijkstra.

`src/sim/work-navigation.ts` now considers the same bounded nearby candidates
inside connected areas too. Original inter-component candidates retain priority, so adding nearby choices cannot crowd out those existing links. It retains the 128-unit query, nearest 32 candidates,
four successful connections, deterministic distance/index order, dry full-body
pavement support and static/current contact checks during search and movement.
The wider-access corner mechanism and indoor walking logic remain unchanged.
No unpainted-road, water or solid-object shortcut is permitted.

## Actual accepted world

[Before](before.json), [candidate](after-candidate.json) and [final source](after.json)
record the complete-world acceptance and the measured paths. The first candidate code was transformed only in an isolated SSR experiment. It exposed a missing priority for existing inter-component links; the final source preserves that priority. Final-source checks use the real production module. Their elapsed times are not performance benchmarks.

| Probe | Simulation 53 | Simulation 54 |
| --- | ---: | ---: |
| Market / River corner | 1,106.38 | 235.57 |
| Market / Civic corner | 1,051.88 | 229.86 |
| Supply home to north-west station bench | 9,546.48 | 7,479.14 |
| All fourteen station targets | 9,277.51–9,688.50 | 7,216.19–7,621.16 |

Distances use world units; ten units are a metre. Current-state and static
station queries agree in these probes. Every returned segment at both corners is
supported and contact-clear in both directions. A parked car added after warming
the Civic route causes a different route that clears its actual cylinder.

| Service | Nodes, unchanged | Old directed links | New directed links |
| --- | ---: | ---: | ---: |
| Market fixtures | 5,733 | 23,456 | 25,212 |
| School/station fixtures | 3,863 | 12,324 | 14,064 |
| Home furniture | 2,156 | 5,652 | 7,392 |
| Tree service | 5,564 | 21,214 | 22,972 |

The existing 8,192-node, 32,768-link, 4,096-local-sample and 128-waypoint bounds
remain. Combined indoor/public preparation is checked too. The final world still
has 1,813 objects, 221 sites, 61 surfaces, 62 crossing declarations and 3,458
physical contacts. Worker-prepared graphs produce the same routes after transfer
and priming. This is not a claim that every possible pavement route is optimal.

## Physical browser journey

The native `workerwalk` exporter performs a real hand strike against the station
bench, walks the player clear and advances the complete fixed-tick world until
the dispatched caretaker reaches the Civic corner. Only the review player's
initial position is seeded. The worker is never teleported and earns nothing
for travelling. The observer follows the existing actor without adding a rig.

All 600 consecutive 2400x1350 PNGs were rendered at 30 frames per simulation
second, with no missing-frame interpolation. The twenty-second clip follows the
worker from distance 668.5 to 945 units, still outward-bound at speed 14 and with
zero credits. The final pre-frame assertion is at world time 79.9667 seconds.
[Native state](native-workerwalk.json) records the real path, distance and claim.
Console warning/error output was empty. Frames 240 and the end were inspected.

![The caretaker at the supported corner](../../media/workerwalk.jpg)

[HD video](../../media/workerwalk.mp4) · [GIF](../../media/workerwalk.gif) ·
[Frame and file audit](media.json)

Video/still are 1600x900; GIF is 1280x720. Poster frame 240 shows the turn. The
full-quality GIF is about 34 MB; guides show its still and link to motion rather
than loading it automatically. These are offline behavioral captures, not live
frame-rate or memory measurements.

## Save compatibility

[Registration](registration.json) pins format 19 / simulation 54 to
`6f51da4a8fd320851d05e664f6f72d5ed9f7be57050e26ad31339a2c57f597d2`.
The exact simulation-53 fingerprint is
`5d8cf576772c3ebebead408d764fa6d6e90e060d314a0ed8ba62a9d30b57f15f`.
Only the simulation-version number differs in the canonical accepted-world
payload. The bootstrap carries the registered previous fingerprint through the
worker/client/World/save-slot boundary. It validates the old state first and
retains every field, original slot and earlier migration.

Two fixtures were recorded before the engine edit: a generated genuine finite
station repair at its outward departure, and the earlier actual native browser
backup. [Generation record](old-fixture.log) distinguishes them. The generated
trip retains its original 44-waypoint, 9,546-unit path, escrow and next movement.
Future dispatch chooses the 7,479-unit path. Existing valid journeys are not
retargeted just because a shorter route became available.

The public Backups UI in isolated `?test-save` previewed and restored the native
simulation-53 file. Downloading it immediately while paused retained time
23.633300000041693 and every state field exactly. Only compatibilityHash changed;
sourceHash stayed the same because Dream source is unchanged. No population
rebase, inventory initialization, catch-up, refund or replayed reward occurred.
[Exact comparison](native-restore-comparison.json) · [Restore UI](native-restored.png).
Browser warning/error output was empty. Ordinary save slots were not reset.

## Checks and documentation

[Focused checks](focused-checks.log) cover work navigation, both new routing/save
files, the earlier crossing save/world files, station/district saves and startup.
The initial run had two expected old route-length assertions; their new measured
lengths were updated without removing the crossing or saved-state assertions.
The affected 24 cases passed, and the expanded five-case physical route file
passed. Historical fingerprints explicitly retain simulation 53; the new file
asserts current simulation 54. [Production build](build.log) passed, with the
existing large-bundle warning.

The broad run exercised all 2,142 cases in 216 files in 916.11 seconds. It
reported 2,105 passes and 37 failures; [original report](full-suite-initial.log)
retains those failures. It is not presented as a passing final full suite.
Thirty-four failures came from the older migration guards still naming simulation
53. Those guards now name 54 while retaining their exact previous-world checks.
The other three were old school/tree graph-link counts and the attendance
review's assumed demand timing.

[Initial corrections](corrections-initial.log) restored all 29 commerce-save
checks, all seven school-repair checks and all four new save checks. The attendance
review still needed correction. Rechecking the historical files exercised 78
cases; 76 passed and two exposed additional stale graph/derived-path assertions
([report](legacy-recheck.log)). Their final corrected checks and the new link
priority regression all pass: [18 cases](joins-final.log). Exact saved-state,
ledger, support, reachability and budget assertions remain.

The nearby-link candidates retain priority for original component joins. A
small primed graph explicitly tests that closer same-component neighbors cannot
use up the four-link allowance first. This keeps the old connections rather than
merely testing the two shorter showcase paths.

The new meal/work journeys arrive earlier. The review's finite purchases also
need to leave demand after bread reserved for refunds. Its player now buys more
of the available bread within the existing money/capacity rules. Closing is
computed from every actual duty departure, so a later day's work cannot be
mistaken for the previous day's late batch. No NPC clock, resource, wage or
completion is seeded. The original test still requires a meal, upstairs rest,
healthy energy, a batch finishing beyond its actual closing boundary and exactly
one wage/completion after save and replay. [All 20 attendance/rain checks
pass](attendance-final.log). An attempted longer review wait was discarded; the
original 600-second bound remains.

[Final coverage](final-coverage.log) passes 61 cases across both new world/save files, crossing and station saves/worlds, upstairs social behavior, startup and media export. The final production build passes with the existing large-bundle warning.

The final-source full regression gate will run again before merge/release. This
branch uses focused rechecks of every failing path and its neighboring world,
worker, save and media tests. Local environment is macOS arm64, Node v26.8.1 and
the in-app browser; this is distinct from Node 22 CI.

[Final recording check](final-recording-check.json) replays the final source from
the same real strike to the end of the recorded corner journey. Every worker
field agrees with the native recording within 1e-7 for numeric comparisons;
world times, distance and unpaid state match. Preserving the original component
joins does not change this recorded path. The new motion/still remain accurate.

README, urban-world, station-quarter, commerce, persistence, world-systems,
behavior and attendance guidance, media provenance and agent invariants were reviewed/updated. [The docs build](docs-build.log) publishes 61 pages and [all 52 site checks pass](docs-check.log).
Dream command vocabulary and runnable examples are unchanged. The behavior guide
also corrects its stale map wording: ground vehicles already use street routes;
walking, boats and aircraft retain direct bearing guidance.

Current crossing and station-quarter recordings retain accurate geometry and
controls. Earlier maintenance route recordings remain historical for their old
chosen paths. The new worker-walk HD video, GIF and still replace the affected
journey view together.
