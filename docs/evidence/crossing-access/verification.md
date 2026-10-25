# Four missing crossings, r113

This authored change connects four actual four-way street intersections. It does
not change walking physics, path costs or the work-network algorithm. Dream
remains mock-authored data; no provider calls are involved.

## Source and acceptance

`src/scene/world/open-world.dream` adds width-24 junction crossings at the medical
interchange, Copper Street / Copper Lane, Market Avenue / Weavers Lane, and High
Street / South Terrace. The geometric audit includes intersections between
street anchors: all 23 genuine four-way intersections now have crossings. Two-arm
bends do not need another zebra. Declarations increase from 58 to 62 of the
existing 64 limit. Objects (1,813), sites (221), surfaces (61), physical contacts
(3,458), resources, old service targets and population limits are unchanged.

[Registered fingerprints](registration.json) pin r113 to
`5d8cf576772c3ebebead408d764fa6d6e90e060d314a0ed8ba62a9d30b57f15f`.
The exact r112 projection is
`910bdcc30bce4f13de0c4f7ec52995d8e1c0383520b86e8346505c75a61df02f`.
Format 19 and simulation 53 stay unchanged because movement rules do not change.

## Route evidence

The medical north sidewalk pair `[11118,5126]` to `[11282,5126]` previously needed
a 15,540.89-unit legal detour. Its new direct 164-unit path is supported and
body-clear in both directions. The market-to-station north-west bench route
falls from 20,983.16 to 9,546.48 units. All fourteen station maintenance targets
retain valid outward and return paths: new lengths are 9,277.51–9,688.50 units,
previously 17,557.37–21,125.19. Ten units represent a metre. These are distance
measurements, not live performance claims or universal shortest-path guarantees.

[Candidate compiler and route audit](route-audit.json) records static, fresh and
captured-economy comparisons. Candidate IDs differ from the final authored IDs;
`tests/crossing-access-world.test.ts` checks the actual final source, all fourteen
routes and unchanged physical data. Independent Dijkstra agreed with existing
weighted A* on the old and candidate graph; the missing connection was topology.
All three river bridge sidewalk spans were already usable.

## Actual browser flow

The dev-only `?test-crossing&capture` starts on the near pavement with the normal
foot body. `crossingwalk` follows a body-clear path through ordinary controls and
120 Hz simulation, with a fixed observer and 30 rendered frames per simulation
second. The final assertion requires reaching the opposite pavement. Only the
initial review pose is seeded; there are no motion teleports or rewards.

[Native result](native-crossed.json) records `[11282.075327932094,5126]`, elevation
zero, on foot after 7.9667 seconds at the final pre-frame assertion. Saves were
disabled for capture. The exporter completed 240 consecutive 2400x1350 PNGs.
[Media audit](media.json) verifies the 1600x900 video/still, 1280x720 GIF, 240
video/GIF frames and 30 fps. The still is frame 45. Source frames 45 and 120 were
visually inspected. No missing-frame interpolation was used.

![The walk through the medical crossing](../../media/crossingwalk.jpg)

[HD video](../../media/crossingwalk.mp4) · [GIF](../../media/crossingwalk.gif)

The published map now draws the renderer's exact zebra polygons, with
`data-crossings="62"`; it does not invent separate crossing strokes.
[Native map review](native-map.png) checked the generated SVG. The older
[native-before.png](native-before.png) is only a general r112 station-corridor
view, not a matched-camera before/after comparison.

## Native save restore

The public Backups UI previewed and restored
`tests/fixtures/crossing-access-r112-save-v19.json` in the isolated `test-save`
namespace. It reported a compatible world update. Downloading immediately while
paused retained world time `23.633300000041693`. The comparison found exactly
137 changed derived pedestrian node/previous fields; every other state field
was identical, including resources, jobs, damage, vehicles, random state and
clocks. Only source and compatibility headers changed. Console warnings/errors
were empty in the walking and restore reviews.

[Exact native comparison](native-restore-comparison.json) ·
[Restore UI](native-restored.png)

Older states are first validated against their exact historical world. Bootstrap
provides source-matched prior contacts before its public graph. Existing saved
coordinate journeys finish unchanged; only new plans use the new crossings.
The regression retains an unfinished paid station repair and its next step,
checks older native backups and proves the original storage slot is preserved.

## Checks

Local environment: macOS arm64, Node v26.8.1, in-app browser, Vite at port 5173.
This is local evidence, not a claim that Node 22 CI or a deployment passed.

- [World checks](world-checks.log): 23 checks across crossing access (then five),
  pinned r112 maintenance, world audit and street world. The initial guessed
  intersection-count assertion failed; the source-derived count of 23 replaced
  it, and all five crossing tests passed in the focused rerun.
- [Save checks](save-checks.log): 27 completed passing checks across crossing
  migration, pinned r112 maintenance saves and station-district saves. The watcher
  was stopped on the user's pause before its upstairs file completed.
- [Continuation checks](resume-checks.log): 25 passing checks across the expanded
  six-case crossing file, upstairs social world, startup and media export. After
  correcting the parked-vehicle assertion to check the real `vehicles` records
  and covering the new bootstrap fields, the affected 20 checks passed again.
- [Production build](build.log): TypeScript and Vite passed. The first build
  identified the test's nonexistent `carPose` field; it was corrected before the
  successful final build. The existing large-bundle warning remains.
- [Map generation](map.log): current accepted scene, 32 streets and 221 entrances.
- Published documentation and links: see [docs checks](docs-checks.log).

README, urban-world, station-quarter, persistence, world-systems, media provenance
and per-slice invariants were reviewed/updated. New crossing video, GIF, still
and the compiled map replace the affected views. The r112 repair clip remains
historical for its longer journey; repair rules and quarter geometry are still
accurate. Dream vocabulary and complete examples are unchanged.

## Remaining work

Two fully clear corners still take long work-graph detours. The current sparse
augmentation omits short links inside an already connected component. That is a
separate engine/rules change, requiring a save-safe routing pass and its own
runtime checks. This release adds the missing authored crossings without claiming
that all city paths are optimal. No fresh full-suite run, merge or release is
claimed; that remains the merge/deployment gate.
