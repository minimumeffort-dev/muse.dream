# Dream 2 destruction expansion

Verified locally on 2026-10-16, using mocks only. Source and actual diff were
self-reviewed against `.npm-cache/damage-v2-baseline`; this is not independent
review. No dependencies, provider calls, deployments or product controls added.

## Result

Dream 2 adds a rigid `topple` constructor, optional splinter/crumble release
patterns on `break`, and independently detachable `zone` blocks. Existing Dream
1 and Dream 2 impact defaults preserve their meanings. The generated command
contract and model instructions include the new vocabulary and bounds.

The r14 world adds six trees, two slatted benches and two building sections in
`src/scene/world/destructible.dream`. There are 448 placements, 21 reactive
objects and 97 potential fragments, inside the unchanged limits of 24 reactive
objects and 128 fragments. The original circuit, eight checkpoints, bridges,
terrain, vehicles and existing destruction examples remain.

Tree geometry falls as one rigid assembly about a fixed hinge at the physical
body's far edge in the impact direction. Terrain support stops the fall without
burying the lower geometry; tests cover scale, heading and hills. Splinters
inherit forward motion; masonry inherits much less momentum, lift and rebound.
Sections have separate colliders and persistent damage state. Only a damaged
section disappears; the core, other sections and foundation remain. A shared
renderer helper keeps those batches separate.

The review corrected two boundary cases, with regressions: the core's default
cylinder uses its own body radius rather than the overall bound including the
zone, and foundation-backed ground contacts continue below the surveyed base
so cars cannot pass under the retained structure on a slope.

## Executed checks

- `npm test`: **394/394 passed**, 20 files. Includes the complete lap/checkpoint
  replay, off-road collisions, bridge continuity, ice/boost, terrain jumps,
  legacy authoring compatibility and 27 new destruction tests. The new tests
  cover thresholds, malformed source/data, distinct release motion, rigid
  falls, exact replay at 30/60/144 rendering fps, release alignment, gentle/high
  contacts, two independently damaged sections, remaining core collisions,
  expiry, R/reset behavior, reduced motion and actual-world impact sites.
- `npm run build`: TypeScript and Vite passed. JavaScript 861.42 kB, gzip
  233.90 kB. The existing over-500-kB chunk warning remains. No mobile GPU or
  sustained frame-rate benchmark was performed.
- Full-project CLI `check` passed through the same bounded compiler and merged
  scene playability acceptance. `cli.json` and `world.json` record the outputs.
- Actual isolated browser review: a tree mid-fall/resting; seven released bench
  pieces; eight crumbling storefront pieces with the house still visible; a
  gentle contact with no damage; reduced motion; and six released porch pieces.
  Screenshots retain their QA controls to distinguish these from main gameplay.
- Main game: a clean Start over followed by normal keyboard driving from
  (1045,1360) broke `park_bench`, produced seven pieces and retained race state.
  `game-bench.png` and the before/after DOM diagnostics record this run. Camera
  quaternion remained unchanged. The subsequent fresh load reported 448
  objects/eight checkpoints. Main and QA checks added no warning/error logs.
  Earlier resolved hot-reload validation errors are recorded separately in the
  browser evidence, rather than reported as current failures.
- Temporary QA tab was closed; the main game remains open.

Limits: only objects with an explicit impact or zone rule are destructible.
Pieces are cosmetic and contact terrain; they do not block cars or collide with
buildings/each other. A toppled tree is likewise a cosmetic fallen assembly.
Static authored components separate; arbitrary meshes are not cut into shards.
Real Muse generation/token cost, live paper capture and mobile performance were
not tested.
