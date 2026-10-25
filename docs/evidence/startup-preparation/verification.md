# Reuse unchanged static fits before drawing the world

Baseline: `3cb97f7eb92327caeaad83e15e44e9d260fd9c79`. The previous goal turn
shipped seated meal recovery and made progress. This slice removes measured
repeated preparation work so the larger living-world quest can keep growing.
The full quest remains active.

## What changed

The existing foundation-only worker reuse did not include ordinary static props.
Historical pedestrian graph preparation therefore fitted unchanged trees, lamps
and other solids again. `shareStaticPlacements` now reuses the original fit only
for the same immutable prop on the same terrain and at its authored source pose.
An existing target entry is never overwritten.

Walking height also depends on interior floors. The helper compares actual fitted
floor heights, room geometry and world transforms. A conservative support sphere
excludes props that could touch a changed floor region, including overhanging
parts whose pivot/collider lie outside it. Floor-bound props, actors, knockables
and distinct objects keep their own calculation. The radius is one optional
scalar on the existing private entry, not another per-frame cache or authored
field. The original placement algorithm and foundation-only policy remain intact.

No world source, geometry, rules, save schema, validation, budgets, rendering or
streaming policy changes. The exact r109 / simulation 52 fingerprint stays
`cf4a6bffe75b42fdab3872242948b8350f269c16e3ad19fc1a9d1ecd356f78e0`,
with source `ac10cef0b007f5f5c38ce0728096e2ef98eeeef5803925f2f92d4328c414f43a`.

## Node diagnostic and exact packet comparison

The initial CPU-profiled diagnostic located repeated `objectPlacement` work under
historical contact/navigation preparation. Its recorded worker times were
15,970.93 ms before and 14,217.74 after (`node-initial-*.json`). This was a
diagnostic pair, not a browser or general performance claim.

The final reproducible benchmark runs the same current world in fresh Node SSR
processes. `before` binds the worker cache hook to the unchanged previous
foundation-only helper; `after` uses the new guarded static helper. Both retain
all ordinary compiler and packet checks. Instrumentation measures original
worker calls, then copies the packet through V8 and primes a separate host module
context. Module loading and packet serialization are outside the timed worker
interval. This is not an actual Web Worker transfer or renderer measurement.

| Complete worker preparation | Time |
| --- | ---: |
| Foundation-only hook | 15,548.32 ms |
| Guarded static hook | 13,563.23 ms |

This single controlled pair used Node 26.8.1 on macOS arm64 / Apple M3 Ultra.
The receiving-side `primeRepairNavigation` remains about half a second; it was
not weakened or claimed faster. The complete decoded packets, ordered measured
preparation results and all **65 populated historical fingerprints** compare
exactly. V8 raw encoding lengths/hashes remain diagnostics, not canonical data
or a browser heap/VRAM measurement. `packet-check.log` records the comparison.

Run from the repository root:

```sh
node docs/evidence/startup-preparation/benchmark.mjs before > /tmp/preparation-before.json
node docs/evidence/startup-preparation/benchmark.mjs after > /tmp/preparation-after.json
node docs/evidence/startup-preparation/verify.mjs /tmp/preparation-before.json /tmp/preparation-after.json
```

Full comparison packets are recreated under ignored `.npm-cache/startup-preparation/`.
The benchmark records runtime source hashes and explicit hook selection.

## Quiet native browser starts

Two starts per version used the same local Vite origin and
`?profile&test-driving=town` in the Codex in-app browser, with warm dependency,
network and driver caches. No tests, builds or Node benchmarks ran concurrently.
Other host activity was not isolated. Each uses a 1280×720 CSS viewport,
1920×1080 drawing buffer, DPR 1.5 and unchanged full-quality settings. Time starts
at loader initialization and ends at the first complete draw, with first-draw
CPU/submission recorded separately. These are not cold-network or weaker-laptop
results, and two samples per version do not establish population-level confidence.

| Native metric | Before A | Before B | After A | After B |
| --- | ---: | ---: | ---: | ---: |
| Worker preparation | 13,228.4 ms | 13,211.0 ms | 11,523.5 ms | 11,547.9 ms |
| Complete first draw | 18,067.8 ms | 17,854.6 ms | 16,211.6 ms | 16,501.4 ms |
| Maximum 50 ms-heartbeat gap | 775.8 ms | 770.7 ms | 787.1 ms | 883.5 ms |
| First-draw CPU/submission | 142.2 ms | 139.8 ms | 136.1 ms | 140.1 ms |

The median complete-draw difference is **1,604.7 ms**. Startup still takes
roughly sixteen seconds locally and still has substantial main-thread gaps.
Receiving-side validation and interactive assembly preparation remain work.
This does not establish an FPS improvement.

The native before-B and after-A images are pixel-identical at 1280×720.
Tracked geometry remains 95,949,526 bytes, 1,396 geometries, 8,090 unique buffers
and 883,197 unique triangles. Loaded chunk keys, count and tracked bytes match.
Those are constructed geometry buffers, not total browser memory or VRAM.
`comparison.json` and `image-check.json` assert the retained data.

The after-only native drive completed 60 warm-up plus 300 measured frames with
zero loading holds, using the real controller and streamed scene. Its report is
`native-drive.json`; it is a functional/runtime sample, not a paired FPS claim.

## Checks, documentation and limits

The first unit fixtures failed the existing building proportion gate; using the
assembly’s measured scale fixed the fixtures without relaxing validation. Six
new edge cases pass, alongside exact four-projection placement/contact/graph
checks, foundation reuse, startup packet/error handling, pavement, floors and
ambient walking checks. Final executed counts are recorded below.

README, rendering guide, world-system priorities, media provenance, AGENTS and
feature invariants were reviewed and updated. Dream vocabulary, model command
contract and examples remain unchanged. Existing HD/GIF/still media remains
accurate because the rendered view, controls and animation are unchanged; no
offline motion is used as timing evidence. Native stills record this slice. The built rendering guide was inspected in the
native browser; `native-docs.png` records its final section.

No provider call, new activity, deployment or independent review is claimed.
The larger living-world quest, remaining startup gaps, broader frame pacing and
usable multi-floor life systems remain unfinished.

Executed checks: **48 behavior/preparation checks across eight affected files**,
plus **227 documentation/site/AGENTS checks**. The production build passes,
including TypeScript, with the existing large-chunk warning. The full suite was
not repeated for this behavior-preserving bootstrap memoization: the complete
worker packet comparison covers its output, and compiler/physics/save transition
semantics are unchanged. CI retains the complete suite. Self-review checked
static ownership, changed-floor support bounds, local cache invalidation and
callers; it is not independent review.
