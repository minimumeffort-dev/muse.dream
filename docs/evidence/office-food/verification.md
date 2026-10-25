# Earned meals and finite station supply, r117 / simulation 58

The clerk combines existing service work, attendance, rest and meal plans. The
existing station shop sells bread; its takings fund a real bakery resupply by the
existing porter. The world adds no geometry, actor, rig, account, good or money.
Four initial loaves are explicit new finite material. Six shared office tasks
remain a lifetime quota.

Current accepted fingerprint:
`643b70b96ca5415687a91955ca4f43a20b9ac2590303d04fd5aacd0d637aa9e6`.
Exact r116 / simulation-57 projection:
`f29382de98ecf72a17233b07c50ea046adbe3625a670fdd8c384ec9fae86dc31`.
Current worker source:
`c4022ccb06d62b3675f428dd76f920573bcf82cf48f290aa1a36d7d58eb2b7dd`.

## Native browser checks

The current shop opens with the normal M/Shop controls. The recorded purchase
moves the player from 20 to 15 coins, leaves three station loaves and adds one
to the bag. Eating consumes that owned unit and raises fullness from 48 to about
93 percent. [Native terminal assertion](native-capture.json).

The separate clerk review seeds only the observer inside Copper Court, then
advances real 120 Hz fixed ticks through rest, work, wages, travel, buying and
seating. At simulation time 947.25 the clerk had completed four tasks, earned
16 coins, spent five, and owned one loaf while seated in the shared home bench.
After the eight-second meal the loaf was consumed, fullness recovered and the
meal returned physically. Credits stayed at 11. No new wage or free meal was
seeded. [Ready state](native-clerk-ready.json) ·
[After eating](native-clerk-after.json) · [Home view](native-clerk-home.png) ·
[Actual fed backup](native-fed.json).

The isolated review slot was backed up before importing the actual r116 file.
The native preview accepted it. Restoring and immediately downloading while
paused preserved every old state field and the exact world clock. Only four
station loaves and zero station_bread counters were added. The original unpaid
relocation, needs, pending work, ownership, old food and all earlier progress
remain intact. [Preview](native-backup-preview.png) ·
[Exact comparison](native-restore.json) · [Upgraded backup](native-restored.json).
Browser warning/error output was empty for these completed checks.

A separate native run advanced the actual game at 120 Hz through the first
funded station handoff. At 1743 seconds the clerk had completed all six checks,
eaten the purchased loaf and retained 19 coins. The porter had completed one
station delivery; station stock was five and its treasury zero after wholesale
and wage settlement. [Complete native ledger](native-delivery.json).

## Replays and checks

The first whole-city test exposed the meal save schema dropping named-floor
elevations. Current meal saves now preserve supported XYZ positions, paths and
homes; arrival and seat validation use full height. Historical schemas stay
strict. An upstairs purchased meal reloads correctly, and a forged floor fails.
The registered simulation-58 upgrade preserves older ground-meal data.

The first long city tests exceeded their 60-second per-case limit. The complete
journeys are now recorded as bounded independent checkpoints using
`scripts/record-office-food.mjs`. Each case decodes fresh state, replays at most
800 quarter-second ticks with every NPC and ambient member active, validates
transactions and movement at each tick, and compares the complete resulting
packet. These Node traces are not native recordings or performance benchmarks.
No city system or timeout was removed. The trace data is reproducible from the
pinned current world and the actual r116 input backup.

The fresh trace ends at 1743 simulation seconds after six real checks, one bought
home meal and a completed station delivery. The clerk has 19 coins; the office
has 36. Station stock is five, with no cash left after the two-coin wholesale
payment and three-coin wage. The older trace walks the unpaid relocation and
reaches its first paid food purchase at 1898.375 seconds, with two completions,
three coins and an owned loaf. It never receives free food to make the trip fit.

The focused compiler, agent-context, current-world and historical office checks
pass all 127 cases, including nineteen bounded city replay intervals. The
production build, including TypeScript, passes. Vite retains its existing
large-chunk advisory. [Focused output](focused-checks.log) · [Build output](build.log).
The complete run passes **2,250 tests across 226 files** in 1183.19 seconds,
using Node 26.8.1, two workers and the unchanged 60-second per-test timeout.
This includes all 191 documentation checks and 52 published-site checks; the
latter builds and validates all 64 documentation pages.
[Complete output](full-suite.log). These are local results, not a remote CI
or lower-powered laptop performance claim.

## Deployed minimap check

The reported minimap failure was rechecked on the public game at
`https://musedream.vercel.app/`. Both the minimap image and header opened the
full map. Zoom reached 140%; Enter set a 72-metre waypoint, HUD guidance
appeared and the independent removal action cleared it. The zoom was reset
to 100% and no test waypoint remains. Browser warnings/errors were empty.
[Native deployed map](production-map.png). The failure was not reproduced, so
this slice makes no new minimap fix or deployment claim.

## Media and scope

The new triplet shows the actual player shop/food flow. All 240 source frames
are rendered at 30 frames per simulation second, without interpolation. It does
not show the full 1743-second clerk/supply routine or establish live frame rates.
[Frame counts, dimensions and hashes](media.json) cover the complete triplet.
Earlier office and business recordings retain geometry/control scope; their
source, needs and shelf contents are historical.

The actual diff is self-reviewed, not independently reviewed. README, model
instructions, generated contract, reference, office/rest/commute guides and
persistence notes are reviewed with the complete example. No provider is
connected and no production deployment is claimed. Diets, cooking tools, daily
service demand and broader resident scheduling remain unfinished.

Older office raw frames were retired after verifying their final media against
committed Git blobs. This removed 1,797,054,464 allocated bytes across unique
inodes. All 240 latest station-food frames remain, alongside every final video,
GIF and still. [Retirement record](capture-retirement.json).

After the published-site checks, the ignored 64-page `dist-docs` output was
removed. It can be rebuilt from retained sources and final media.
[Generated-output retirement](generated-docs-retirement.json).
