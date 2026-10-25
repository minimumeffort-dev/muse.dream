# A goods-free office and a physical clerk routine, r116

Lantern Exchange's existing upstairs table now offers six shared records checks.
Each takes six simulation seconds and pays four coins from a finite treasury.
The existing hospital visitor becomes the clerk, with Copper Court as home, an
exclusive home bench, energy, daily attendance and real stair journeys. No NPC,
CPU rig, vehicle, mesh, pavement or goods budget was added.

## Source and compatibility

Current source is
`9abae055f5da38bdee2a2a8ac2771012ed5a5e9be2ed54b9ebcc4333d39d2856`.
The r116 / simulation-57 fingerprint is
`f29382de98ecf72a17233b07c50ea046adbe3625a670fdd8c384ec9fae86dc31`.
Its exact r115 / simulation-56 projection remains
`180aa45b5573fec413014be184ca16a4f06eb90bcb1840ea012cf905f13d9aa8`.
Static objects and pavement compare identically after stripping the new economy
data and restoring the resident's old source home. Two explicit furnish slot
omissions prevent newly unblocked planting or parking at that old home.
[Accepted-world comparison](world-comparison.json).

The native backup preview accepted the actual r115 browser file. The isolated
review slot was downloaded before replacement. Restoring and immediately
downloading while paused preserved every old state field and exact world time,
adding the office account, finite 60-coin business capital and zero work
counters. The old resident's physical pose remains at `[4040,6610]`, with an
unpaid supported journey to the new home. No wage, progress or offline catch-up
was seeded. Original save slots remain independently available.

[Native preview](native-backup-preview.png) ·
[Exact state comparison](native-restore.json) ·
[Downloaded upgraded backup](native-restored.json)

Historical contact/navigation priming remains valid: the moved resident is a
decor NPC, and every prior static prop, pavement polygon and public graph is
retained. The upgrade checks the exact prior world before reading its state.

## Runtime checks

The native player recording walks through the doorway, climbs the existing
stairs and completes one real task at the shared station. The terminal assertion
requires the upper floor, one completion and an exact balance increase from 20
to 24 coins. Browser warning/error output is empty.
[Native task result](native-capture.json).

The separate native clerk review pre-rolls ordinary walking, rest and commerce
ticks, then brings the observer upstairs. The clerk completed all six tasks,
earned 24 coins and left 36 in the office treasury. The player had not earned
those wages. Work and Bag are visible without empty Shop or Stock pages.
[Clerk state](native-clerk.json) · [Current work panel](native-clerk.png).

![A completed task at the upstairs records table](../../media/officework.jpg)

The exporter rendered 600 consecutive 2400x1350 PNGs at 30 frames per simulation
second. Video and still are 1600x900; GIF is 1280x720. Still frame 500 shows the
completed task. All 600 video/GIF frames were decoded and counted. No missing
frames were interpolated. This is offline behavior evidence, not a live frame
rate or memory benchmark. [Media dimensions and hashes](media.json) ·
[HD video](../../media/officework.mp4) · [GIF](../../media/officework.gif).

## Automated checks and review

The initial 41 service, commerce and activity-context checks pass. The next 110
compiler, agent-contract, navigation, furnishing and current-world checks pass,
including a complete zero-goods office without meals, repair or ambient crowds.
The live-world case completes all six clerk tasks, a real seated rest, return
home and reload at each routine stage without a teleport or changing Scene.

Self-review found a remaining stationary employee distance check using the
operator's home. It now uses declared premises. All seven service-office cases
pass after that correction, including a stationary lobby employee whose operator
lives elsewhere. The shared bounded endpoint search checks up to 32 nearby
combined nodes and 32 public anchors without dropping body/support checks.

The complete run exercised 2,165 cases across 223 files in 1,101.12 seconds on
Node v26.8.1, with 2,157 passing and eight failures. The original
[full log](full-suite.log) is retained. Three failures were exact distances from
the earlier endpoint search. The new current planner finds supported shorter
paths; those assertions now pin its measured lengths, retain all old saved
coordinate-path assertions, and check every segment of the missing-crossing
detour. One failure was the documentation harness omitting the office example
from its explicit host-module allowlist. Four others used cached pre-edit
compiler/schema/contract code while tests were updated during the run.

A cold rerun of all eight affected files passes all 304 cases after the
corrections, including every complete documentation example. The separate
published-site, compact-agent and omission checks pass all 80 cases; the site
check covers the remaining 52 tests and builds all 63 pages. Together the gate
covers all 2,217 current tests. The complete run was not repeated after focused
corrections. [Final affected checks](gate-corrections.log) ·
[Published-site and boundary checks](final-checks.log). The production
[build](build.log) passes, with the existing large-chunk warning.
The final prose/link pass also checks all 241 documentation/example cases:
[final documentation checks](final-docs.log).

The current accepted r116 station-bench approach measures 7,408.64025857741 world
units, with 45 waypoints and every segment supported. The same route was
7,479.139198148574 before the endpoint correction. This is a route-distance
measurement, not a shortest-path or frame-rate claim. [Measured path](routing.json).
Ordinary source IDs retain their 32-character limit; generated omission slots
allow 64 characters and still require an exact candidate from their own rule.

The actual diff was self-reviewed, not independently reviewed. Complete runnable
examples, compact model instructions, generated contract, language reference,
README, population rules and persistence guides were updated together.
[Native documentation view](native-docs.png) confirms the existing Minimum
Effort identity, readable page layout and current media; browser logs are empty.

Older bakery raw capture frames were retired only after verifying the final
video, GIF and still against their committed Git blobs. This removed 894,758,912
allocated bytes. All 600 latest office source frames remain, along with every
final media file and the source code. [Retirement record](capture-retirement.json).
After those checks, the generated 63-page `dist-docs` output was removed too;
its 1,444,150,554 apparent bytes can be rebuilt from the retained sources and
media. [Generated-output retirement](generated-docs-retirement.json).

The public game was also rechecked for the reported minimap failure: actual
header and image clicks open it, zoom reached 196%, a map click set a 73-metre
waypoint, HUD guidance appeared, and the independent clear action removed it.
No waypoint was left behind. Browser warning/error output was empty.
[Deployed map](production-map.png). This recheck concerns the existing released
map; the office work remains on this branch.

## Limits

Records checking is timed work, without visitor demand or paperwork records.
The six-task quota lasts for this world and does not replenish daily. The clerk's
food drain is zero until a physical food journey is connected; effort still
uses the existing shared need rules. Upper storeys beyond the mezzanine and
lifts are not implemented. The mock/provider boundary is unchanged.

Older office and service recordings remain historical for source/task lists;
their geometry and control behavior remain accurate. The new triplet is the
current reference for the office and Work/Bag panel. This is a branch update,
not a production deployment.
