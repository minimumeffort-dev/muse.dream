# Less repeated work in crowd movement

The prior docs workflow timed out in the complete school-repair replay at its
unchanged 60-second test deadline. The later walking release passed the same replay
(run `39150294401`) without altering its simulation or test deadline. The failure
is timing-sensitive; the deadline stays at 60 seconds and this pass reduces cost.
Profiling the same scenario locally put most
CPU time in ambient movement, rather than saving, conservation checks or the
repairer's path assertions. The repair still needs every crowd/animal tick.

This change reuses one enclosing contact query while checking the sampled points
of a movement segment. It retains exact point overlaps, height, water, pavement
and world-bound checks. A cheap conservative envelope rejects vehicle forecasts
that cannot reach the walker within the existing two-second horizon; close or
grazing approaches still use the original closest-approach calculation. The
walker's velocity and body radius are reused within that check.

The shared spatial grid now indexes numeric rows and columns. It retains
row/column query order, insertion order inside each cell, independent result
arrays, inclusive cell boundaries and the start-of-tick buckets used for moving
crowd records. There is no new spatial approximation or retained query cache.
No population, actor, controller or render-detail limit changes.

## Matched replay

The diagnostic uses the complete historical r67 physical fixture retained for CI.
It replays the same 2,506 quarter-second steps, 626.5 simulation
seconds, including travel, a parked-car obstruction, per-phase saves, one finite
kit and wage, return and food purchase. It hashes every complete tick state,
not only the repaired counter. Both pairs retain sequence SHA-256
`7e5563ffef6b062b532e09fc40f9e39fc88554119b6257ed0e8ea03b04755e9f`
and final SHA-256
`f5d73be4d5bb01af6b26bf44b3dae14eb41df5f3044fff411e21a6c7660a2710`.

| Local diagnostic | Before | After |
| --- | ---: | ---: |
| First run | 24.991 s | 17.000 s |
| Second run | 25.564 s | 16.797 s |

The mean elapsed time fell by 33.1% in these two pairs. These are pure-simulation
samples on Apple M3 Ultra / 96 GiB, macOS arm64, Node 26.8.1. Each run uses a new
process and the same complete source-matched fixture. The live r71 city is
checked separately below. Runs were sequential in baseline/current
order twice, without tests, exports or browser startup in parallel. Other desktop
applications were not isolated. This does not establish browser FPS or timing on
a weaker laptop. The preliminary CPU-profile run is excluded from this table.

Run from the repository root:

```sh
node docs/evidence/movement-queries/replay.mjs .npm-cache/before.json baseline
node docs/evidence/movement-queries/replay.mjs .npm-cache/after.json
node --expose-gc scripts/profile-world-acceptance.mjs 631fdf3 .npm-cache/query-acceptance.json
```

The baseline mode loads the three affected runtime files from pinned commit
`631fdf3c46e3911c02eeba36d00103c9c6068045`. Input hashes and subsystem timings
are in [before one](baseline-1.json), [after one](optimized-1.json),
[before two](baseline-2.json) and [after two](optimized-2.json).

The [complete-world comparison](acceptance.json) retains exact accepted source,
current and historical fingerprints, graph node order, repair topology, static
contacts, masks, placements, culling bounds and sampled terrain. Its GC heap
checkpoints are diagnostic data; the comparison retains two worlds in one
process and is not evidence of browser or GPU memory savings.

## Product and documentation

The scene remains r71 / save format 16 / simulation 29. Source geometry, authored
Dream, collision/vehicle rules, clocks and saved fields do not change. No language
command or new example is needed. README, rendering guidance and the current
priority record describe the work. Existing matched screenshots/GIF/HD recordings
remain accurate because the rendered geometry and simulated trajectories are
unchanged. No offline recording is treated as a live performance measurement.

The live r71 comparison also checks 113,888 point/segment queries against the
pinned implementation. Fixtures cover ordinary state, moved parking, growth and
an occupied dormant vehicle, with probes near pavement, contacts and cell edges.
The graph and contacts are exact. [Comparison](queries.json); run
`node docs/evidence/movement-queries/compare.mjs .npm-cache/query-comparison.json`.

A native full-quality city drive uses 60 warm-up and 300 measured frames at
1920 × 1080, DPR 1.5. The before/after runs retain 275.093 mean draws,
555,682.997 mean triangles and 231,885,742 counted unique render-buffer bytes.
Mean frame interval stays around 16.67 ms. CPU preparation/submission measures
3.948 / 3.676 ms in this individual pair; GPU time is 1.434 / 1.440 ms. This is a
retention check on the local machine, not evidence of a general FPS improvement.
Both browser consoles have no warnings or errors. The measured drives ran before
the regression suite. Their frozen screenshots differ in ordinary randomized
driving dust; no deterministic-particle claim is made.

[Browser before](browser-before.json), [after](browser-after.json),
[baseline source verification](browser-baseline-source.json),
[current browser source](browser-current-source.json) and
[driving screenshot comparison](pixels.json).

The subsequent frozen stills match on all 742,896 checked world/HUD pixels outside
the profiler panels. The original JPEG screenshots are retained unchanged;
the static runs overlap the test suite and their timings are excluded.
[Frozen before](still-before.jpg), [after](still-after.jpg) and
[pixel results](still-pixels.json). Reproduce the image checks with
`node docs/evidence/movement-queries/check-images.mjs /path/to/ffmpeg`.

This is a self-review. Low-powered hardware and sustained thermal loads
remain unmeasured.


## Release checks

- Full suite: **1,422 passed in 120 files**, 279.87 seconds, two workers and
  the unchanged 60-second per-test deadline.
- Production build and typecheck pass; the existing large-bundle advisory remains.
- Documentation build: **44 pages**.
- Source-matched replay, complete-world acceptance comparison, 113,888 query
  comparisons and native retained-detail checks pass.

Existing scene, save, sports, vehicle, restoration and worker-bootstrap regressions
remain enabled. No timeout, reporting policy, test assertion or population was
removed to reach these results.

[Full tests](tests.txt), [build](build.txt), [documentation](docs-build.txt),
[tested source](tested-source.json), [image checks](image-checks.txt) and
[unchanged Dream world example](example-check.txt).

The published replay command also passes on the final source. Its [check output](replay-check.txt)
is separate from the matched timing pairs. The unfinished terrace review preset
remains local and is excluded from this change; these scenarios do not use it.
