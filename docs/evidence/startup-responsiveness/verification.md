# Startup preparation without a detail downgrade

The previous delivery release was playable at full settings, but its native
loader diagnostic reported 12.4 seconds to the first view and a 1,949 ms maximum
50 ms-heartbeat gap on Apple M3 Ultra / 96 GiB. This iteration targets repeated
main-thread preparation and long construction batches, keeping the accepted
world, materials, movement and saved rules exact.

## Acceptance and implementation

- Reuse the worker's surveyed static contact cylinders and pedestrian graph.
  Preserve contact order, graph node indices, initial population and subsequent
  decisions. Reject mismatched source identity and malformed prepared data.
- Compute complete-world culling bounds in the worker, where terrain fits and
  assembly geometry are already cached. Transfer the same min/max/radius;
  retain the synchronous fallback for standalone fixtures and surveys.
- Yield between route surface/tiling steps, population prototype groups and
  interactive assemblies. Synchronous fixtures drain the same construction
  paths. Compare exact vertex/index/instance buffers and rendering properties.
- Hold the first render/simulation handoff until required chunks and async shader
  preparation succeed. One owner performs the preparation; failure stops the
  renderer, releases streaming/worker resources and presents Reload. Shader
  compilation may still block on other browsers/drivers.
- Preserve source/save identity, normal reloads, racing, crowd decisions,
  off-road contacts, vehicle ownership, destruction and stream eviction.

These are host-derived caches, not Dream commands or trusted save fields. The
small boot client imports their types only; runtime helpers stay in the game
module so the worker can start before the larger game code is loaded. Contact
and graph caps, object/actor/joint budgets, antialiasing, pixel ratio, shadows,
post-processing, materials and particles are unchanged. There is no new package,
provider integration or general scene migration.

## Diagnosis

The first graph-only attempt left most of the pause intact: static contacts still
repeated terrain-support surveys. Moving those cylinders revealed another full
survey inside streaming's global bounds. Both now reuse work already performed
by the worker. Route construction, population prototypes and interactive objects
also yield, rather than draining their entire build in one task.

The local Node SSR diagnostic separated roughly 1,228 ms of contact preparation
from 58 ms of pedestrian network setup. It was a locating tool, not browser
performance evidence. Native browser reports below are the measured result.

## Evidence scope

Native browser samples use the local development server, a 1280 x 720 viewport,
1920 x 1080 drawing buffer, DPR 1.5 and existing full render settings. Profiles
use 60 warm-up and 300 measured frames; scripts, tests and encoders are stopped
while measuring. These are local navigations with warm server/network/GPU caches,
not cold-network loads or lower-powered-laptop measurements. Startup time is from
loader initialization to the first complete draw, not from entering the URL.
Heartbeat gaps include browser scheduling; first-draw CPU time is reported
separately. GPU and CPU frame times overlap and should not be summed.

Static chunk geometry buffers are not total browser memory or VRAM. Simulation
data and bounded live meshes remain resident. Streaming eviction/resource
ownership checks remain required; moving construction to a worker does not make
the accepted world disappear from memory.

## Docs and media review

README, rendering guide, world-system priorities, media provenance and AGENTS
were reviewed/updated. Dream vocabulary, grammar, generated contract and examples
are unchanged. The loader's design and all gameplay geometry, shading, animation
and controls are unchanged, so existing paired GIF/video/posters remain accurate.
Native before/after stills here check the actual game image. No offline capture
is used to claim startup time or live FPS. Source review is self-review, not an
independent review.

## Native measurements

Baseline is commit `21d1180247b2a466674eb4eb9018a19759459e3f`. Two final
navigation/reload samples use this iteration with no test/build processes running.
All three use the same local origin, camera, draw buffer and full render settings.

| Loader metric | Before | After A | After B |
| --- | ---: | ---: | ---: |
| Time to complete first draw | 12,384.5 ms | 11,512.5 ms | 12,165.3 ms |
| Maximum 50 ms-heartbeat gap | 1,949.2 ms | 289.2 ms | 292.7 ms |
| Driving/walking preparation | 1,435.3 ms | 104.5 ms | 147.9 ms |
| First draw CPU/submission | Not separately recorded | 157.4 ms | 152.7 ms |

The main result is fewer long main-thread pauses, not a large decrease in total
loading time. The complete first view still takes about 11.5–12.2 seconds here.
The added worker survey increases the compile/preparation phase from about 4.0
to 4.7 seconds, while cooperative construction trades some elapsed time for page
responsiveness. Individual builds, light preparation, uploads and driver work
can still take hundreds of milliseconds. Do not describe this as stall-free.

| Matched driving sample | Before | After A | After B |
| --- | ---: | ---: | ---: |
| Mean CPU prepare + submission | 3.504 ms | 3.209 ms | 3.255 ms |
| CPU p95 | 4.600 ms | 4.400 ms | 4.200 ms |
| Mean GPU query | 1.314 ms | 1.328 ms | 1.305 ms |
| Mean animation-frame interval | 16.663 ms | 16.665 ms | 16.667 ms |
| Frame-interval p95 | 18.700 ms | 18.900 ms | 19.100 ms |
| Mean draws / submitted triangles | 253 / 647,115 | 253 / 647,115 | 253 / 647,115 |
| Uploaded geometries | 353 | 353 | 353 |

Each driving report has 300 measured frames and 299 GPU queries. All finish at
`7668.5,4233.0,1.5`. These small local samples show retained frame performance;
the lower CPU means do not establish a gameplay speed improvement. Prefetch,
JIT, garbage collection and system load remain factors. The browser reports
parallel shader compilation support; prewarming is a readiness gate, not a
claim of the same driver behavior elsewhere.

The before/after native 1280 x 720 screenshots have zero changed pixels in the
422,400-pixel comparison region, recorded in `image-comparison.json`. This proves
that region of this frozen view, not every possible world view. Route/paint/
rail/instancing buffer checks and complete-world contact/graph equivalence cover
the underlying construction paths. The source and compatibility fingerprints
remain the same as the delivery release; no new save slot is required.

After each matched drive, all three reports retain the same 30 chunk keys,
192,661,700 chunk-buffer bytes and 255,358,898 total counted render-buffer bytes.
Those include 1,815 constructed geometries; the profiler's 353 is the uploaded
geometry count. Neither count covers total heap, worker caches, programs,
textures or VRAM. Eviction/disposal and stale-packet regression checks passed;
this iteration does not claim a new native cross-city memory survey.

## Production and executed checks

The local production build restored the earlier format 4 save at the bakery,
including 18 credits and remembered vendor state. Collection removed two bread
from stock. Pause saved the active delivery; reload restored its cargo, position,
destination and balance. Cancellation restored stock from 6 to 8, retained 18
credits and saved successfully. Fullness decreased with actual unpaused play.
The raw visible-UI/save records and native pause screenshot are in this directory.
Browser warning/error logs were empty. This used the isolated local preview
origin; no public game save was opened or replaced.

Both fingerprints remain exact:

- Dream source/modules: `3325eeea049f101970216b9914a395541040d20b146daf0667c486af68569283`.
- Accepted world/simulation: `41d7da9d2228df8a28a08d7db9713602482f312be20a04b6e50be2c028909def`.

Executed checks:

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 1,016 tests in 65 files passed.
  This includes complete-world graph/contact equivalence, saved crowd indices,
  malformed bootstrap data, async preparation failure/ownership, exact cooperative
  route/population buffers, streaming disposal and existing driving/vehicle/save
  regressions. Full-suite duration was 138.28 seconds on this machine.
- `npm run build`: typecheck and production build passed. Existing large-bundle
  warnings remain; no warning threshold was raised.
- `npm run docs:build`: 34 pages built. DSL compiler/contract/highlighting and
  all runnable examples retain their existing checks in the passing suite.
- `git diff --check`: passed.

The normal game, saved economy and current render settings were exercised; there
was no new interior/crowd stress scenario or measurement on a lower-powered laptop.
The largest measured gaps remain about 0.3 seconds. Further worker preparation,
GPU-upload staging and real-device checks remain useful before expanding live
interactions. Automatic repair workers, usable parked fleets, interiors, schedules
and relationships remain separate unfinished parts of the active world goal.
