# Resident companion meals, r105

Residents can buy two portions, meet an authored companion at a free pair of
seats, eat together and return to their interrupted routines. Dream owns the
candidate accounts, grounds, food, seats and timing. The engine retains finite
transactions, physical journeys, exclusive claims, pause and saved progress.

## Scope and identity

- Base commit: `e14f551aa57f6acb920d799ebc6d058ed874f1ff`.
- Current world: r105, save format 19, simulation 48.
- Accepted runtime source: `fbd736c00c7acab65ce63d98c26b4569747e9dde55c613f958f0a6b1a17ee8cb`.
- Current fingerprint: `8989717956ee55328cf06ae424fff171d91aff76d9ff41638384496506cfa2e1`.
- Registered r104 fingerprint: `a4107f0d54f50cc0c4c0045ef84ed31e6e64b89416963622c0727a141cd208bb`.
- Local environment: macOS 26.7.1, Apple Silicon, Node v26.8.1. This is mock
  gameplay; no provider calls or model-generation measurement.

[Source hashes](source-manifest.json) pin the inspected implementation. Standard
bench seat centers move from 78 to 84 cm. Meshes, bodies, materials, object counts,
starting resources and existing actor/rig/navigation limits are unchanged.

## Executed checks

The shared save and compiler changes required one full suite. It ran with
`npm test -- --maxWorkers=2 --testTimeout=60000` and a JSON reporter:
1,950 cases across 191 files in 729.25 seconds. Initially 1,915 passed and 35
failed. Thirty-four failures were historical migration gates still pinned to
simulation 47; the other was the furniture example retaining the old seat anchors.
The version gates were audited and advanced to 48 with all fingerprint checks
retained, and the example now matches the live bench.

The exact 35 failed cases then passed in 186.24 seconds across 17 files. The
name-filtered run skipped 74 unrelated cases already exercised by the full run.
The complete suite was not repeated. [Case accounting](test-accounting.json)
matches all 1,950 original cases to their latest passing result, including
repeated parameterized names by occurrence.

| Check | Result | Record |
| --- | --- | --- |
| Original complete run | 1,915 passed, 35 failed | [Report](full-tests.json) |
| Exact failed full-run cases after fixes | 35 passed | [Report](migration-fix-tests.json) |
| Current-world meals, agent packets, docs/site, media bounds and rule-file size | 236 passed, 50.18 s | [Report](final-tests.json) |
| Changed examples, meals, seats, docs/site and media | 237 passed, one stale invalid-input test | [Report](doc-fix-tests.json) |
| Corrected seating diagnostic plus companion behavior | 24 passed | [Report](seat-final-tests.json) |
| Final documentation, published links and rule-file size | 214 passed | [Report](docs-final-tests.json) |
| Production build, including TypeScript | Passed | [Log](build.log) |
| Published documentation build | 55 pages | [Log](docs-build.log) |

The standalone docs build initially overlapped the docs-site test, which also
recreates its output directory. After the tests finished, a sequential build
passed. No source repair or weakened check was needed.

The seating diagnostic now asserts that each replacement needle exists before
checking rejection, so a changed example cannot silently bypass its malformed
approach cases. The neighboring shared-meal and staff-shift files passed during
the full run; current-world tests also cover real paid food, deterministic
save/replay and complete physical returns. Focused cases cover insufficient
funds/stock, occupied furniture, existing work, destruction refunds, blocked-trip
timeouts, forged ownership/history and exact interrupted walking-route resumption.

`node scripts/dream.mjs check` accepted the companion-meals and shared-seating
examples as complete worlds, and accepted furniture-construction as an asset
library. Agent-packet checks cover the updated command contract and model text.

The registered r104 migration checks pending invitations, outbound approaches,
seated eating deadlines and original browser-slot retention. Seated poses follow
the moved anchors; unfinished approaches retarget without moving their current
position. Food, history, money and simulation time are preserved. The earlier
historical save chain passed in the targeted migration run.

## Native browser checks

The review route was `?test-companions=eat&test-paused&test-save`, with the isolated
`muse-dream.review-companions-r105` namespace. The helper seeds only the player's
observation pose, then runs ordinary fixed ticks until the meeting. It does not
grant stock, money, completed work or relationship credit.

- The baker earned wages from two baking and four lunch-packing batches before
  the meeting, bought food and met the commuter while the caretaker was busy.
- At 351.50 simulation seconds both residents were seated, with two reserved
  portions and an eating deadline of 359.50. The host had walked 24.60 world units;
  the guest had walked 619.73. [Pending state](native-pending.json).
- Reload while paused restored byte-equal economy JSON, including both journeys,
  seat claims and the deadline. [Restored state](native-reloaded.json).
- R retained the meeting and its completed history while resetting player control.
  [State after R](native-after-r.json).
- By 449.00 seconds both return trips had finished. Bread consumption increased
  by exactly two, pair history recorded one meal at 359.50, and the player's
  balance remained 20. No player conversation familiarity or recipe credit was
  awarded. [Finished state](native-finished.json).
- The published guide rendered Manrope body text, Archivo headings, the Dream
  `peers` field highlight and the current GIF. [DOM observations](native-docs.json)
  and [guide screenshot](docs-current.png).

## Current media

[Video](../../media/companions.mp4), [GIF](../../media/companions.gif) and
[still](../../media/companions.jpg) share 480 consecutive 2400 x 1350 source
frames at 30 rendered frames per simulation second. The sixteen-second recording
shows the meal finishing and the beginning of the return walks. The guest's full
return is verified separately above; it does not fit within this clip.

Video/still exports are 1600 x 900; GIF is 1280 x 720. The still uses frame 90.
Both motion files decoded without errors. [Frame hashes](frames.json),
[export hashes](media.json), [video metadata](video-metadata.log) and
[GIF metadata](gif-metadata.log) retain the exact artifacts. The
[capture observation](native-capture.json) was read after normal simulation had
resumed, so its time is not the clip's final frame time. No interpolated frames
or live-performance claim.

README, language/model/reference guides, persistence, seating and world-system
docs were reviewed and updated. Older seating/shared/hosted recordings are
historical for their former anchors. Unrelated workstation, driving, weather and
architecture captures remain accurate because their geometry and rendering did
not change. The new guide and README use the current companion capture.

## Limits and remaining work

There is one global social activity at a time. Hosts are stationary complete
humanoids; guests can also use accepted walking routes. Meetings use existing
ground-floor paired furniture and bounded paths. Dating, general affection,
authored dialogue about these meals, group gatherings, handheld food and a
dedicated sit/stand transition animation remain unfinished. The implementation received a self-review; no independent review was run.
No laptop performance improvement was measured. The broader living-world objective remains open.
