# Spend less time rejecting distant walls

2026-10-19. R73 engine optimization against immutable release `7608dc7`.
Implementation self-review with engine and native browser evidence.

The spatial grid encloses the city's largest contacts. A short walking segment
can therefore receive distant walls from the same grid cells. Work-path sweeps
now reject a contact when its entire conservative envelope misses the swept
body's bounds. Rotated boxes use the sum of their half-extents, with a one-millionth
world-unit outward rounding margin. Remaining contacts keep the original exact
distance and vertical-headroom tests. Broken contacts still yield, and moved
vehicles and other live bodies remain part of each query.

This adds a few scalar bounds and comparisons, without a persistent cache.
Renderer settings, scene geometry, physical dimensions and actor budgets are
unchanged. The complete-world compiler still performs every acceptance check.

## What is identical

The [comparison script](check-acceptance.mjs) archives the complete released
engine and permits exactly one changed runtime file, `work-navigation.ts`.
Every measured pair compares the complete accepted scene, ordered contacts,
pedestrian graph and prepared work navigation. All 434 repair approaches retain
their exact chosen end and ordered waypoints, including the three orchard trees.
[Results](acceptance.json), [output](acceptance-check.txt).

The [save audit](check-migration.mjs) compares 32 historical fingerprint checks
and 36 saved checkpoints against that released engine. Entire restored states,
visual clocks and migration flags match exactly. It includes historical formats,
the four r72 social states and r73 work, return and completed engine checkpoints.
The current Dream source and accepted-world fingerprint are unchanged. Format 17
and simulation version 31 remain valid; this introduces no new saved field or
migration. [Results](migration.json), [output](migration-check.txt).

The small public-engine tests retain a clear corridor beside a diagonal box,
full-radius corner clearance, crossing/zero-length collisions and precise
18-unit headroom. Existing journey tests cover moving obstructions, refunds,
restoration clearance and saved return paths.

## Measurements

All local measurements use an Apple M3 Ultra with 96 GiB memory. The Node
comparison uses one warmup pair and five alternating measured pairs, creating
a fresh Vite module graph for each sample. Module loading is outside the timer;
the timer includes complete Dream compilation, schema and playability acceptance.
No profiler is active during these samples.

| Measurement | Released engine | Bounds check |
| --- | ---: | ---: |
| Node complete acceptance, median of five | 10.07 s | 7.80 s |
| Native Dream-checking phase, median of three | 11.59 s | 10.43 s |
| Native total loader, median of three | 17.51 s | 16.87 s |

The Node ranges are 9.93–10.16 seconds and 7.66–7.83 seconds. Separate
instrumented CPU profiles identify the repeated exact corner/distance work;
their overhead makes them diagnostic records rather than benchmark samples.
[Before profile](profile-before.json), [after profile](profile-after.json).
These summaries retain the forty highest self-sample frames, complete runtime
hashes and full-trace digest. The [profiling command](profile-acceptance.mjs)
regenerates the local raw trace from a checkout of the selected engine.

Native observations are sequential development reloads of the same paused fresh
review at 1280 × 720, with full settings and other desktop applications open.
No local tests or Node benchmarks run during these reloads. The total-loader
ranges overlap: 17.50–17.73 seconds before and 16.42–17.68 seconds after. First
draw medians were 136.1 and 176.6 ms; maximum heartbeat gaps were 259.8 and
266.5 ms. Those figures did not improve in this set. Chunk loading and first-frame
preparation still take time. Three observations do not establish general browser
performance. [Native samples and conditions](native.json),
[assertions](check-native.mjs), [output](native-check.txt).

These are acceptance/startup observations, without a browser FPS, production
network, total-memory, VRAM or weaker-laptop claim.

## Native play and documentation

The browser restores the [released airport work checkpoint](native-work-before.json)
with its entire state and clock exact. Continuing ordinary play restores the
lamp, pays four coins once and begins the same physical return journey.
[Returning checkpoint](native-home.json), [observed repaired lamp](native-play.jpg).
Both downloads pass the engine's state and economy validation. The review uses
isolated storage, preserving ordinary player progress.

README, rendering notes and AGENTS guidance describe the bounds check and its
limits. Dream vocabulary, model instructions and examples remain unchanged.
Existing screenshots, HD clips and GIFs remain accurate: the accepted geometry,
appearance and all ordered repair approaches compare exactly. No replacement
motion recording is needed for this invisible query optimization.
The world-system priorities also record the next concrete recovery constraint:
wind-animated trees need bounded pool support before broader replanting coverage.

## Release checks

- **1,479 tests passed in 125 files**, 394.63 seconds, with two workers and
  the unchanged 60-second timeout. [Full output](tests.txt).
- **173 focused checks pass**, including the new diagonal-box/headroom cases,
  journey mechanics and published documentation. [Output](focused.txt).
- Typecheck and production build pass; Vite retains its large-chunk advisory.
  [Build](build.txt). The published docs build **44 pages**.
  [Docs build](docs-build.txt).
- Five paired acceptance comparisons, all 434 route ends/waypoints, 36 historical
  and current checkpoints, 32 historical fingerprints and the native resumed
  repair pass their recorded assertions.

The [baseline release's full CI and Pages deployment](https://github.com/minimumeffort-dev/muse.dream/actions/runs/39167110964)
passed. These checks are implementation self-review, without independent review
or measurements on a weaker laptop.
