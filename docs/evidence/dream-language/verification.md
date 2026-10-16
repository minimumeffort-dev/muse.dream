# Dream 1 verification — 2026-10-16

Implemented a bounded textual object language which compiles into the existing
strict Object DSL v2. Seven handmade mock examples are used in world revision r10.
No provider, photo, camera, credentials, deployment or generated executable code.

## Executed checks

- `npm test`: **222/222 passed**, 15 files, including 43 new Dream behavior checks.
- `npm run build`: passed typecheck and production build. JavaScript 714.97 kB,
  190.61 kB gzip. The existing >500 kB chunk warning remains; no limit was raised.
- `npm run typecheck`: also passed separately during implementation.
- Parser checks cover scoped constants, arithmetic, parameters, repeats, transform
  composition, exact beam endpoints including the antiparallel case, radian
  conversion, joint scale independence, deterministic IDs, serialization, invalid
  syntax, names and metadata, recursion, numeric bounds, source/token/work/depth
  budgets and atomic rejection. The starter documentation example compiles.
- Every new example exists exactly once in the playable mock world. The existing
  suite checks full-lap completion, checkpoint order, ice/boost, off-road contacts,
  jumps/landings, terrain support, bridge continuity and instanced geometry.
- Self-reviewed the changed source and baseline diff. This was self-review, not
  an independent review. No engine schema limits or renderer branches changed.

## Browser evidence

Local Vite origin `http://127.0.0.1:5173/`, real WebGL in the in-app browser.
Gallery `/tests/visual/dream.html` inspected from front, back, and right with a
second animation phase. Screenshots: `front.png`, `back.png`, `right-motion.png`.
The first inspection caught flag-wind deformation on a jacket; the source now
uses a rigid toon material. Rock overlap and continuous basket rims were also
corrected before the saved final views.

The actual game loaded the 6000×4800 world with **421 objects and 8 checkpoints**.
Holding W for 3.2 seconds drove from (1045,1360) to (1731.3,1360), crossed a crest,
registered one jump and one landing, and reached the boost area. Camera quaternion
remained `-0.51308,0.15225,0.09304,0.83959`. The final snapshot reported 60.0 fps,
136 render calls, 71,433 triangles and 57 active particles. `gameplay.png` captures
that state. These are local diagnostic snapshots, not a mobile benchmark.

`browser-errors.json` is empty. The browser automation host emitted unrelated
Statsig/Cloudflare telemetry failures; the localhost app's captured warnings and
errors were empty and its rendering/input checks completed.

## Source compactness

`compiler-metrics.json` records the actual fixture: **6,198 source characters**
(including comments, shared components and palette), **27,466 compact JSON
characters**, **77.4% reduction**. `expanded.json` is the compiled data used for
inspection. A warm Node compile median over 30 runs after one warm-up was ~1.02 ms
on this machine; this is not model latency, tokenizer savings or AI success rate.

## Remaining limits

This is textual **object** authoring; terrain, roads, water, bridges, placement and
race rules still use scene/landscape data. Components accept numeric parameters;
materials are shared file definitions. Shapes remain bounded v2 primitives, not
arbitrary meshes, continuous woven surfaces, detailed faces, skinning or soft-body
physics. Compact source does not reduce expanded geometry work. No Muse
generation/repair evaluation, live-camera flow or mobile-device benchmark ran.
