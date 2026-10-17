# Less repeated work, same accepted world

The r56 market release starts a complete 1,699-placement world and retains its
historical save projections. A fresh local development load took 17.918 seconds
from loader initialization to the first complete draw. This pass targets repeated
terrain and polygon queries without changing the world, rendering settings or
simulation semantics.

## Changes and acceptance

Hills outside their compact support contribute zero; skip that arithmetic.
Water and pavement queries reject points outside conservative bounds before
performing the existing exact outline test. Bridge coordinate queries reuse the
length and unit direction of each immutable accepted bridge. Weak caches belong
to those data objects, not their IDs; a newly accepted revision owns new entries.
No full-world grid, lower-detail mesh, new worker or package is introduced.

A separate validation correction uses actual upright rectangle contacts during
road-clearance rasterization. The runtime already uses those rectangles. The
regression first reproduced four unreachable checkpoints for a clear road beside
a thin wall: its broad-phase circle incorrectly occupied the road. Shared
`contactOverlaps` now decides the final clearance. The current accepted city
remains identical, and no simulation/save version changes.

`scripts/profile-world-acceptance.mjs` loads an isolated Git source archive and
the working checkout in separate Vite SSR instances. It asserts exact equality
of the complete accepted scene, streaming bounds, eleven current/historical save
fingerprints, contacts, current and historical pedestrian graphs, repair network,
all placement foundations/transforms, road mask bytes and 2,761 terrain samples.
Samples include deterministic world points, water vertices and bridge approaches.
It fails on a difference rather than refreshing expected hashes.

Baseline: `f83a0b02fde379052a757729dcd37a62b96351d6`.
The raw [comparison](acceptance-comparison.json) records Node version, working
source-diff identity and exact-data hashes. The Dream source stays
`269c818e0f333fe8fb11fe881219eb363ab59e54da8817787ba24191002c5464`;
the accepted save fingerprint stays
`36a6b350b49fa07044768fde832c838f9a4be007484d285a93c18a8beb77f136`.

## Construction diagnostic

These are one before/after Node 26.8.1 SSR construction each on the local Apple
M3 Ultra / 96 GiB. They locate work; they do not measure browser startup, frame
rate, heap, VRAM or lower-powered laptops. Module loading is outside each timed
phase. The baseline runs first, so JIT, cache and scheduling effects can matter.

| Phase | Before | After |
| --- | ---: | ---: |
| Compile and complete-world acceptance | 6,721 ms | 5,095 ms |
| Streaming bounds | 986 ms | 560 ms |
| Eleven save fingerprints | 979 ms | 955 ms |
| Historical interior graph/contacts | 1,345 ms | 668 ms |
| Historical verge graph | 1,333 ms | 641 ms |

## Native browser measurements

One baseline and two final reloads use the same local development origin,
`?profile&test-driving=orchard`, Apple M3 Ultra / 96 GiB, 1280 × 720 CSS viewport
and 1920 × 1080 drawing buffer at DPR 1.5. Tests, builds and encoders are stopped.
Each reload constructs the world afresh, with warm server/network/driver caches.
Timing starts at loader initialization, not URL entry. This is a small local
sample, not a cold-network study or a guarantee for another computer.

| Loader metric | Before | After A | After B |
| --- | ---: | ---: | ---: |
| First complete draw | 17,918 ms | 15,723 ms | 15,634 ms |
| Dream/world preparation | 9,853 ms | 7,042 ms | 7,034 ms |
| First-neighborhood construction | 4,884 ms | 4,914 ms | 4,824 ms |
| Maximum 50 ms-heartbeat gap | 287 ms | 267 ms | 271 ms |
| First draw CPU/submission | 157 ms | 213 ms | 212 ms |

The complete load is about 2.2–2.3 seconds shorter in these samples, around
12–13%. The targeted worker preparation shrinks while first-neighborhood work
remains roughly 4.8–4.9 seconds. First draw time does not improve. There are still
noticeable loading delays and individual quarter-second main-thread gaps.
Raw reports: [before](before-startup.json), [A](after-startup-a.json),
[B](after-startup-b.json).

Each frozen-view report uses sixty warm-up and three hundred measured frames.
Simulation is frozen, so this is a rendering-retention check, not moving-crowd
or active-work performance. GPU/CPU timings overlap and must not be summed.

| Frozen full-quality view | Before | After A | After B |
| --- | ---: | ---: | ---: |
| CPU prepare + submission mean | 1.799 ms | 1.991 ms | 2.018 ms |
| CPU p95 | 2.200 ms | 2.300 ms | 2.300 ms |
| GPU query mean | 1.328 ms | 1.330 ms | 1.341 ms |
| Animation-frame interval mean | 16.667 ms | 16.670 ms | 16.667 ms |
| Frame-interval p95 | 18.500 ms | 18.600 ms | 18.600 ms |
| Draws / submitted triangles | 212 / 654,706 | 212 / 654,706 | 212 / 654,706 |
| Uploaded geometries | 140 | 140 | 140 |

Reports: [before](before-render.json), [A](after-render-a.json),
[B](after-render-b.json). Each has 299 GPU queries. This does not establish a
gameplay frame-time improvement; the CPU means are slightly higher in these
samples. Browser/JIT/driver and scheduling variance remain factors.

The native [image and buffer comparison](image-buffer-comparison.json) finds zero
changed game pixels outside the timing panel in both final 1280 × 720 screenshots.
The matching view retains the same sixteen chunk keys, 129,779,738 streamed
buffer bytes and 186,502,920 total counted geometry-buffer bytes. That last count
includes 1,236 constructed geometries; 140 is the uploaded count above. This is
one frozen view, not every possible image or total browser heap/VRAM. It shows
neither a detail reduction nor a memory saving. [Before](before-render.png),
[after A](after-render-a.png), [after B](after-render-b.png).

## Docs and media review

README, rendering notes, world-system priorities, interior contact guidance and
media provenance are reviewed with this pass. Dream vocabulary, generated model
contract, highlighting and runnable examples are unchanged. The current city map
and paired recordings retain the same geometry, animation, controls and accepted
source; they do not represent loading-time or frame-rate measurements.

Source review is self-review. Cold-network and lower-powered-device behavior
remain unmeasured. The accepted simulation and worker caches remain resident;
this pass does not claim lower total memory or make startup instantaneous.

## Native production continuity

The optimized production build restored the existing isolated test-origin save
without a migration. The [export comparison](native-save-check.json) checks
position, ownership, parked vehicles, damage, repairs and all economic ledgers.
All remain exact. Its three unpaused seconds advance simulation/population/NPC
clocks and fullness normally. The player retains twenty credits, the completed
indoor repair and eleven market kits. [Restored pause state](production-restored.png).
Ordinary keyboard driving, F to leave the car, walking and Space were exercised
afterward. [On-foot view](production-controls.png). Public-origin progress was
not replaced or imported.

That native view also identifies a remaining crossing-paint overlap. It belongs
to the unchanged city geometry and needs a separate road-marking correction;
exact equality here does not imply every existing asset or street detail is right.

## Executed checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 1,141 tests in 81 files passed,
  166.38 seconds locally. This includes historical save migrations, exact worker
  graph/contact transfer, bridge headroom, slopes/jumps, city driving, repairs,
  moving populations and streamed resource disposal.
- New landscape-query checks compare independent original arithmetic at polygon
  edges, concave water corners, hill overlap/clamping, bridge rotations, pavement
  margins and thin gaps. The road-rectangle regression passes with the shared
  contact predicate.
- `npm run build`: typecheck and production build passed. Existing large-chunk
  warnings remain visible; no warning or timeout threshold was changed.
- `npm run docs:build`: 36 documentation pages built with valid local links.
