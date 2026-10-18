# Room to pass

The released r69 city lets ambient people select the same waypoint independently.
A 120-second replay of all 119 walkers reproduced four overlapping footprint pairs
in one 20 Hz tick and 160 pair/tick samples closer than one world unit. These are
fixture observations, not a claim about every live session.

Ambient walking now uses a local spatial grid and a bounded set of passing,
slowing, stopping and backing steps. Each candidate checks the whole relative
step against neighbouring ambient walkers and the accepted pavement. Stable IDs
decide who may back away. Their complete rest radii are unchanged. The existing
vehicle/player waits still run after steering. Animals retain their previous
movement rules. No scene contacts, physics bodies, CPU rigs or population slots
are added.

Old overlapping poses can increase their separation through ordinary movement.
They are not teleported or reset. On a narrow path, people can yield or back away;
this is not a deadlock-free crowd planner. Decor NPC people are not crowd
obstacles, and this does not add pushing or general crowd physics.

## Replay and cost

The same two-minute fixture was run three times per version, alternating order,
with warm navigation. Every 20 Hz tick checks every walker pair. Pavement checks
are sampled once per second. All 119 walkers travel more than 20 units in every
run, with no unsafe pavement samples. Candidate runs have no envelope overlap
larger than the 0.0001-unit comparison tolerance and no near-coincident samples.
Both versions produce their own identical end-state hash across all three runs.

The [raw measurement](measurement.json) records source identity, Node version and
all timings. Timing covers `stepAmbient` only, excluding NPC advancement and the
verification scans. Median total work over 2,400 ticks changes from 2,621.57 to
4,507.51 ms: about 1.09 to 1.88 ms per crowd update. Spacing adds roughly 0.79 ms
per 50 ms update on this macOS arm64 / Node 26.8.1 machine. This is an added
simulation capability, not a CPU or memory optimization. It does not measure
browser startup, FPS, total browser memory or VRAM.

```sh
node docs/evidence/pedestrian-spacing/benchmark.mjs
```

The harness writes only ignored `.npm-cache/crowd-review/` files and loads the
released helper from commit `31e1951471eb7194eab1af018650ab797771b8b4` for comparison.

A native browser pair uses the existing public development profiler at the
Garden park start: 60 warm-up and 300 measured frames, 1/60 input clock, same
1280 × 720 drawing buffer, DPR 1 and full visual settings. CPU preparation plus
submission averages 2.96 ms before and 3.25 ms after. Submitted triangles,
draw calls and uploaded geometry counts match. Presentation means remain about
16.67 ms; this does not establish a laptop FPS guarantee. The reports are
[before](browser-before.json) and [after](browser-after.json). Other application
and game tabs were open. A later [isolated reference](browser-before-isolated.json)
resized to 757 × 619; it is excluded from comparison rather than treated as a
performance improvement. Lower-powered hardware and sustained thermal testing
remain unperformed.

## Persistence and checks

Format 16 / simulation 27 checks the exact released r69 fingerprint. It changes
no world geometry or saved fields and does not rebase population, commerce,
navigation or clocks. Tests retain every field in the actual r69 native seated
backup, the original save slot, and all 28 historical fixtures through the
registered earlier migration chain. Fresh saves round-trip and take the same next
fixed step.

Focused regressions exercise head-on passing, narrow-path yielding, already
overlapping saves, whole-step and render-interpolation spacing, pavement fit,
maximum step length, state-clone replay and historical saves. Existing checks
cover traffic waits, worker bootstrap, every control mode, R, Start over and the
full city population.

README, population/reference/model guidance, generated contract semantics,
persistence and rendering guides are updated. The Dream field vocabulary is
unchanged; the runnable moving-population example remains valid. The pedestrian
GIF, HD video and matching still are refreshed together at 30 actually rendered
frames per simulation second. Older world recordings retain their recorded
walking paths; unchanged assets, layout and other mechanics remain accurate.
The review is a self-review, not independent review.

The native isolated review slot restores the saved Garden park bench claim,
two personal coins and ownership of Station supplies with its three-coin company
balance. The worker supplies the registered simulation-27 fingerprint; subsequent
native autosaves retain it. [Screenshot](native.jpg), [read-only diagnostics](native.json)
and [downloaded mock backup](native-backup.json) retain that check. No production
progress was imported or reset. The 720-frame exporter completed without console
warnings or errors after its endpoint limit was updated from 600 to 720 for this
clip. The same-origin, PNG and size restrictions remain tested.

The refreshed pedestrian still is frame 570, with the passing visitors on the
left park path. Source frames are 2400 × 1350; HD video is 1600 × 900 and the GIF
1280 × 720. The GIF is 20.74 MB. All 720 source frames are actual renders, with no
interpolation. These exports are not performance measurements.

Final automated checks passed: 1,373 tests across 110 files, production build and
129 focused follow-up checks including the extended capture boundary. The existing
bundle-size advisory remains. Lower-powered hardware and independent review
were not checked.
