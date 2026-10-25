# Supported upstairs social meals

Baseline: `4a83db9b59acc4b26871a33f72cda8b932c4531d`. The previous quest turn
shipped static-fit reuse and made progress. This slice connects existing
resident meals to the home's upper settee; the larger living-world quest
remains unfinished.

## Runtime contract

The same Dream social plan now names upper furniture and its existing building,
floors and landing. Furniture selection follows the authored preference order.
Both people retain supported heights through outward and return stair journeys,
exclusive paired seats, finite food and ordinary body-sized navigation. Arrival,
saved targets, home points and every saved segment are checked in 3D. No new
actor, rig, geometry, stock or starting money is added. Existing graph/path and
social activity limits remain unchanged.

Current source is r110, save format 19 / simulation 53. Its accepted fingerprint
is `4b10448683d5eea828b3d229eaa7ab0bef09f19e6876eafc5f2611c6de09bf4a`.
The exact prior projection is r109 fingerprint
`cf4a6bffe75b42fdab3872242948b8350f269c16e3ad19fc1a9d1ecd356f78e0`.
It removes only the new upper social preference and floor grounds. Old state is
validated first and retained field-for-field, including an unfinished meeting's
original downstairs seats. The original storage slot survives. No retargeting,
resource initialization, catch-up or replayed reward occurs.

## Checks

The small runnable world covers actual supported ascent/return, paired claims,
food conservation, cancellation/refund, blocked upper seats, authored furniture
order, reload/R and rejection of forged layers. Full-city checks compare every
object, accounts, lots, contacts and public pedestrian graph with r109; replay
the real baker/commuter meal; preserve an old pending downstairs meal; and restore
the actual native r109 backup exported during this slice. Historical seated-rest
checks now explicitly use the r109 projection instead of the current world's
version assertion.

`focused-world.log` records the first 35 passing full-city/shared-meal/bootstrap
checks. `focused-watch.log` retains the fixture corrections: residents may buy
food for a later break, retry another free pair after cancellation and eat their
refunded own portion. The final edge run also covers the fixed exporter allowlist.
The full run passed **2,044 tests across all 203 files** in 900.99 seconds.
Afterward, review reused the existing validated current contact/navigation handoff
for the new metadata-only prior scene, avoiding another contact reconstruction.
The two affected migration files then passed all **eight checks** in 52.42 seconds;
no rules, fingerprints, serialized state or render inputs changed in that handoff.
The final production build passes, including TypeScript, with the existing
large-chunk warning. The full suite was not repeated for that cache-only refinement.
The published docs build contains 60 pages; final reference prose has separate
focused documentation checks: all 229 pass across docs, the built site and AGENTS limits.

## Browser and recording

The old native IAB review was loaded at the local Vite origin, paused and exported
through its ordinary Backups action. `tests/fixtures/upstairs-social-r109-save-v19.json`
is that actual backup. Reloading the same isolated review after the upgrade kept
its existing paid food/history and continued its clock. `native-migration.json`
records the exposed DOM observations; the normal gameplay slot was not used.

The new native view also shows the residents upstairs. The initial media attempt
reached the scene but failed with HTTP 400 because the new clip was not registered
in the dev middleware. The fixed allowlist is covered at frames 599/600, with all
existing origin, PNG, size and path bounds retained. The complete retry exported
600 consecutive 2400×1350 PNGs at 30 rendered frames per simulation second.
Frames 0, 150, 290, 450 and 599 were visually inspected. The sequence shows ascent
and the seated phase; the later native observation records meal completion and
the physical return in progress. Tests check the entire return and resumed owner.
`native-after-meal.json` records one completed pair meal, zero held portions and
homeward journeys. No provider or normal gameplay save is involved.

The video/still use 1600×900 and the GIF 1280×720, encoded by
`scripts/encode-media.mjs` and a still from source frame 450. Existing cached
FFmpeg/gifsicle tools were used. No missing-frame interpolation occurs. The
capture is an offline walkthrough with a following observer camera, not an FPS,
startup, responsiveness or weaker-laptop benchmark. Native observations and
exported frames are distinct evidence.

README, companion/floor/language guides, generated command contract, model
instructions, persistence, world-system priorities and per-slice invariants were
updated. Older companion footage remains labelled historical for the downstairs
venue. The new guide, GIF, HD video and corresponding still ship together.

## Remaining limits

The current city uses this venue for resident-to-resident meals. Player
invitations retain their normal nearby/visible/familiar-person requirements;
there is no remote call to an upstairs meal. Group gatherings, household
ownership, sleep, lifts and a general relationship model remain unfinished.
The final guide was inspected in the native browser (`native-docs.png`).
Self-review is not independent review. No deployment or performance gain is
claimed. Providers and prompting remain mocked/deferred.
