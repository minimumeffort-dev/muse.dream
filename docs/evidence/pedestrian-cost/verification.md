# Keep the same paths, do less work

The docs run for `5091c75` failed when the complete school-bench repair replay
took 80.236 seconds on the GitHub runner, exceeding its existing 60-second test
timeout. A separate worker-report timeout was also fatal. Neither timeout nor the
fatal-error policy has been raised or suppressed.

The local CPU profile identified repeated assembly-bound copies and pavement
boundary work inside ambient movement. This change caches each accepted object's
exact rest radius, rejects pavement polygons outside the step envelope, and
accepts an interior capsule only when it fits strictly inside one convex piece.
All other steps retain the original boundary/union checks, including concave
paving, narrow joins and tiny gaps. Water and physical contact checks still run.
Spacing candidates stop when their nonnegative penalties already exceed the
current best score. The same immutable vehicle hazards are reused within one
call's catch-up ticks, without advancing their time differently.

The long test still traverses the complete journey, waits for a parked car,
saves every phase, consumes one repair kit, pays once and returns home to buy
food. Its existing conservation checks now yield to the worker reporter every
80 quarter-second replay steps. It retains the same 60-second deadline and all
assertions.

## Reproduce

From the repository root:

```sh
node docs/evidence/pedestrian-cost/benchmark.mjs baseline-1
node docs/evidence/pedestrian-cost/benchmark.mjs optimized-1
node docs/evidence/pedestrian-cost/compare-pavement.mjs
```

The baseline plugin loads the three affected runtime files directly from pinned
commit `5091c75c307b1d09c81161e9dcd68fb5520c8743`. It runs the same scenario and
asserts the complete final state hash, not only the repaired counter. The
[80,000-query comparison](pavement.json) checks the whole city's pavement plus
rotated, concave and thin-gap fixtures against the original predicates.

The Dream world, simulation version 27, fingerprint, node order, source geometry,
body sizes and all saved fields remain unchanged. No new command or example is
needed. README and rendering guidance are updated; existing pedestrian media
remain accurate because the geometry and replayed motion are identical.

These are local pure-simulation diagnostics on an Apple M3 Ultra / 96 GiB,
Node 26.8.1 on macOS arm64. They do not establish browser FPS, memory savings,
low-powered laptop performance or a general crowd-physics guarantee. The review
is a self-review.

The recorded matched replay took 34.953 seconds before and 26.550 seconds after,
with 2,506 quarter-second steps (626.5 simulated seconds). Its ambient subsystem
fell from 33.019 to 24.741 seconds. The complete saved-state SHA-256 is
`f5d73be4d5bb01af6b26bf44b3dae14eb41df5f3044fff411e21a6c7660a2710`
in both. Raw reports: [before](school-baseline-1.json),
[after](school-optimized-1.json). The after run preceded the baseline run; neither
had another test or export running. Other local application activity was not
isolated. A [second after run](school-optimized-2.json) retains the same state
hash but overlaps the start of the full suite and browser startup near its end;
it is excluded from the timing comparison. These are individual diagnostic
samples, not a statistical or hardware-independent performance guarantee.

The isolated native review booted the full world, drove the original car and
saved while paused. Read-only [diagnostics](native.json) retain all 1,760 objects,
179 ambient members, source `0575d6…` and the unchanged simulation-27 fingerprint.
The console had no warnings or errors. [Native capture](native.jpg). Production
progress was not imported or reset. The production build and 43-page docs build
pass; the existing bundle-size advisory remains.

The exact final tree passes 1,374 tests across 110 files with two workers and the
unchanged 60-second timeout. The complete school repair test took 38.639 seconds
in that mixed full-suite run, which included native review and build activity;
that number is retained separately from the isolated diagnostic pair above.
The production build and 43-page documentation build pass.
