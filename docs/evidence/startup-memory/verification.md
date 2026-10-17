# Loading and voxel memory

Baseline: `10886b4c2bd7ae52c89453cb09c694f93ca50320`. Handmade mock, no model calls. This pass changes construction and buffer representation, not the world layout, rendering quality or gameplay rules.

## Reproduction and scope

Before editing, native navigation to the development game exceeded the browser's 20-second navigation wait while the main thread synchronously compiled and constructed the world. The world became playable afterward. The previous moving-populations record also identifies synchronous initial construction as a remaining limit.

The memory harness is `scripts/profile-world-memory.mjs`. It compiles the complete accepted Dream scene and constructs environment, water/bridges, routes, flocks, static scenery and ambient populations. These groups dominate the resident geometry. It counts unique typed-array backing buffers, including every instance matrix and index, even when different meshes share the same geometry. No GPU or DOM is created by this harness.

Each report comes from a fresh Node process with explicit GC at the final snapshot. The unchanged baseline source was extracted with `git archive`; only the measurement script and read-only geometry counter were added to that ignored checkout. Node is recorded in each report. Run the same harness against both revisions. For `shapes`, only the entry's `voxel_world` statement is omitted; explicitly authored fill/cut volumes remain. Both modes retain 1,695 placements and the same complete-world acceptance checks.

The reports exclude player/live actors/effects, texture and render-target allocation, driver memory, retained compilation data and temporary meshing allocations from the geometry total. Process RSS/heap/external snapshots include Vite, Three.js and compiler caches. They are Node observations, not browser heap or VRAM measurements. They are not frame-rate benchmarks.

## Isolated measurements

| Run | Geometry bytes | Unique geometry triangles | Compile ms | Environment ms |
| --- | ---: | ---: | ---: | ---: |
| [Shaped baseline](shapes-before.json) | 205,076,468 | 3,965,829 | 8142.1 | 12085.6 |
| [Voxel baseline](voxel-before.json) | 561,078,624 | 7,709,918 | 8191.1 | 41231.3 |
| [Indexed voxels](voxel-after.json) | 419,691,216 | 7,709,918 | 3995.3 | 19727.7 |

Voxel geometry falls from 535.1 to 400.2 MiB: 134.8 MiB / 25.2% less. Its triangle count and geometry count are unchanged. The shaped world is 195.6 MiB, about half the optimized voxel total. The terrain-column representation adds many faces at steps and along infrastructure, and water retains independent wave anchors. Greedy merging does not make those surfaces free.

The before/after voxel runs used the same harness, fresh processes and no CPU profiler. Environment construction fell from 41.2 to 19.7 seconds; compilation fell from 8.2 to 4.0 seconds. These single local Node runs have normal timing variance and are not browser startup or frame-rate claims. The earlier exploratory CPU profile identified column meshing, coordinate lookups, interpolation allocations and repeated primitive bounds as major costs; its instrumented timings are not used in this table.

## Browser startup

The final development route `?profile&test-driving=town` exposed its loading UI immediately, then reached the first rendered world in **29.03 seconds** in this local run. The 50 ms heartbeat ran 469 times, with a **1.494 second maximum scheduling gap**, including the synchronous walking/navigation setup and renderer work. This is a substantial responsiveness limit that remains; a loader is not proof that every task is short. The loader remains present until successful rendering. The previous implementation blocked the initial native navigation beyond its 20-second wait before any usable UI observation.

[Startup phases and complete-scene geometry buffers](startup-browser.json) retain the raw result. The complete render scene retained **441,903,300 bytes** of geometry buffers in the dev browser. That total includes groups omitted from the like-for-like memory table above, so it is not substituted into that comparison. Its 50 ms heartbeat is a scheduling diagnostic, not an input-latency benchmark. Network/cache state and dev-module loading can affect total time.

## Changes

- The initial HTML contains the loading state. A small boot module loads the renderer and a bounded Dream-validation worker; compilation, schema and playability errors remain fatal. The worker is terminated on success and failure.
- Real phase names replace the blank startup. Failure exposes Reload; game controls stay hidden until the first successful render. Reduced motion stops the indeterminate bar animation.
- Street, terrain and triangle-tile construction can yield to browser tasks. Synchronous test and inspection callers consume the exact same generator without waits. This is startup staging, not district streaming or quality adaptation.
- Each column face retains four complete vertices plus six indices. Triangle positions/winding, UVs, paint lifts, outward normals and rigid water anchors are preserved. Numeric coordinate keys retain fractional terrain origins; per-triangle gradients avoid per-cell derivative allocations.
- Polygon union/subtraction skips holes and previously emitted pieces outside the original outline bounds. Surface clipping yields between ground strips, preserving all existing paint/junction cutouts.
- Exact asset rest bounds share a 128-entry / 1 MiB key cache across identical schema-cloned geometry, including shape parameters, part transforms and joint frames. Returned bounds remain independent copies.

## Media review

`loader.png` is a native 1280 × 720 browser screenshot captured during actual construction. Its published copy is `docs/media/loading.png`, so the docs serve image bytes directly. Published-site checks reject GitHub blob-page URLs in embedded asset sources. The shell uses the existing bundled Minimum Effort fonts and palette. README, rendering and whole-world voxel guides were reviewed and updated. Existing gameplay videos/GIFs/stills still represent the same surfaces and motion and remain accurate. No offline animation is used as evidence of live performance.

## Limits

Some construction phases and shader/driver work are still synchronous. Yielding between tiles cannot preempt an individual operation. The world still needs substantial resident memory; low-powered laptops and sustained thermal behavior need device testing. A denser packed surface representation and moving the remaining geometry work to workers are possible further work, rather than claims of this change.

## Live rendering

The [driving profile](render-profile.json) used the dense town start, a 1920 × 1080 drawing buffer at DPR 1.5, full resident geometry, 60 warm-up frames and 300 real browser frames. No builds, tests or Node meshing ran during it. Mean CPU preparation/submission was 5.31 ms, GPU 1.30 ms over 299 returned queries, and presentation interval 16.667 ms. Draw and triangle reports match the pinned [moving-populations run](../moving-populations/profile-after.json) exactly: mean 230.53 draws / 344,323.71 submitted triangles and 307 uploaded geometries. CPU/GPU differences are ordinary single-run variance; no new steady-state speedup is claimed. Pixel ratio, shadow resolution, assets, particles and post-processing remain unchanged.

The browser console had no errors. The [native rendered world](ready.png) shows the game after construction and driving; its diagnostic car position advanced to `7668.5,4233.0` under the fixed input sequence. The world reports 1,695 placements, eight checkpoints and 256 flock birds. GPU queries measure execution time, not GPU memory.

The bundled production preview also showed the loader immediately, completed its worker/renderer startup and accepted native controls. W advanced the original car from `6330,4233` to `6458.5,4233`; Exit switched to on-foot ownership; Space lifted the character to elevation `18.8`. [Production controls](production-controls.json) records the observed state and empty error log. Its startup overlapped regression tests, so its elapsed time is not used as a speed benchmark.

## Executed checks

- Local full suite: **938 tests passed in 58 files**, 126.56 seconds. This covers racing, city/bridge contacts, aircraft, water, destruction, populations, Dream validation, documentation and constructed geometry.
- Final cache review added a non-finite bounds regression: rejected numeric geometry cannot poison an identical valid default through a serialized cache key. The final focused startup/proportion/woodland suites passed **37 tests in three files**, including nine startup tests. Profiling was collected before this invalid-input-only guard; accepted-world geometry and mechanics are unchanged.
- Production build/typecheck and the published documentation build passed. The existing large shared-chunk advisory remains. No dependency or quality settings changed.
- Published-media follow-up: **77 documentation checks passed in two files**, including the new embedded-asset URL guard; the 32-page docs build passed. README and gameplay captures remain accurate.
- `git diff --check` passed. Review was a self-review. Lower-powered hardware, total browser/driver memory and forced browser worker/WebGL failure recovery were not device-tested; phase/error behavior has focused unit coverage.

[Source fingerprints](source-sha256.json) identify the final sources used for this change. The linked GitHub workflow reruns the complete suite on the pushed revision before publishing the docs.
