# Shared home rest, r97

The existing market resident can now buy lunch, walk home, recover on a usable
settee and resume the original routine before choosing paid work. F seating lets
the player recover through the same bounded energy rule, including benches
outside the NPC's preference list. Work and repairs require their ordinary
effort in energy and spend it once on completion. Cancellation spends no effort.
Food, money, inventory, wages and energy remain separate.

## Authoring and ownership

Optional `rest` plans and `account.rest` are validated Dream data. Existing
accounts without a plan retain their old rules. The [complete example](../../examples/resting.dream)
accepts through `compileDreamScene`; unknown references, invalid rates,
thresholds, ownership, duplicate seats and unsupported grounds fail.

NPCs keep one out/sit/home journey, original routine pose, body-sized path and
shared seat claim. Their program clock pauses through the trip. Hungry food
choices take priority. A broken or unavailable seat grants no recovery and
releases its claim; existing finite repair work can restore that furniture.
The player can stand or leave at any time. Energy never alters vehicle controls.

The live world adds two plan declarations and references on the existing player
and commuter accounts. There are no new props, people, accounts, jobs, stock,
starting coins, rigs or geometry. Identical ordered ground/body profiles reuse
the existing work graph, including its exact node/link order and coverage. The
current and r96 navigation packets are checked for equality.

## Save boundary

Format 19 / simulation 41 pins
`67ec3c6c263434eeb67f2dc17a986d719675505899452a283dedc53b071b8be9`.
Removing only rest plans and account references reproduces exact r96 at
simulation 40:
`9b818d954cf53fe239b685e7cc54600aa417f0541de32e3b9c99db1bef443cad`.

The registered upgrade validates the old world first, preserves an active paid
batch and its original deadline, and initializes only new energy values: 65 for
the player and 35 for the resident. It creates no trip or wage, advances no
clock, guesses no offline tiredness and preserves old source slots. The entire
earlier migration chain remains in place.

Rest saves reject missing/unowned energy, fabricated plans, original poses,
unsupported paths, future clocks, invalid sitting positions and duplicate claims.
Outward, sitting and return phases replay through ordinary fixed steps. R,
pause, streaming and normal save/reload retain the need and its ownership.

## Native browser review

`?test-rest&test-paused&test-save` uses the isolated
`muse-dream.review-rest-r97` slot. Only the player's initial review position is
seeded. Resident food purchases, energy, travel and recovery use ordinary world
steps. The player then walks through the door using ordinary input.

Native F sits on the free right cushion while the resident uses the left. The
player's observed energy rises from about 58 to 100; the resident recovers to its
target and starts returning. Player coins remain 20 and resident coins 22 after
its real lunch purchase. [Before](native-before.json) and [seated/return](native-seated.json)
record the actual states. Save now and a real page reload preserve the economy
exactly. [Reload](native-reloaded.json) records `restored=true`; [R recovery](native-recovered.json)
records car control and retained energy, with no captured console warnings/errors.

The first review positions obstructed the resident's ordinary lunch path. They
were moved aside; no path, contact or seat validation was weakened. The review
then walks the player to the other cushion after the resident sits. The first
export accidentally inherited the default vehicle-switching inputs; the rest
clip now supplies neutral input. Draft frames are not published.

## Checks, media and limits

The new focused checks cover shared recovery, universal player seating, no free
resources, energy effort/cancellation, immutable prior state, claim contention,
broken furniture, all saved phases, exact replay and prior-work migration.
Syntax highlighting checks field boundaries and HTML escaping. Production and
published documentation builds are checked separately from native gameplay.
Final results and frame evidence accompany this change.

The full run executed 1,807 checks across 172 files in 595.09 seconds:
1,806 passed and one graph-equality assertion caught the earlier duplicate rest
packet still held by that worker. The final five-file rerun passed all 58 checks
in 21.89 seconds, including exact equality of the corrected shared graph. The
full suite was not repeated. Latest executed results per file give 1,807 passing
checks; [the ledger](checks.json) retains the original failure and report hashes.
The final production build passed with the existing large-chunk advisory.
[Source manifest](source-manifest.json) pins the changed runtime, tests, capture
scripts, example and model contract.

The new rest recording, GIF and still share consecutive rendered frames at 30
frames per simulation second. Review preparation advances normal simulation
before the first exported frame. These are motion evidence, not live frame-rate,
startup or low-powered laptop measurements. Earlier home/seating recordings
retain their historical policies and Seated badge; they do not demonstrate the
new energy need. Unchanged asset and locomotion recordings remain accurate.

[Frame and media audit](media.json) checks all 360 fresh, consecutive
2400 × 1350 frames. The HD video decodes at 1600 × 900, 30 fps and 12 seconds;
the GIF is 1280 × 720. The corresponding still uses frame 60. Video, GIF and
still were refreshed together. [Capture observation](capture.json) was read
after export completed and ordinary simulation resumed; it is not an exact
last-frame state. No recorded frames were interpolated.

This is self-review, not independent review. Beds, sleeping, daily sleep
schedules, emotional needs and upper floors remain missing. Automatic rest is
currently available to complete non-vendor humanoids with meal/commuting work;
other automatic policy combinations remain excluded. This is a game need, not
a validated biological or clinical model. The larger living-world goal remains
incomplete.
