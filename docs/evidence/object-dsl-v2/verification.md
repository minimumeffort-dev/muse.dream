# Object DSL v2 verification

Verified locally on 2026-10-15. Revision r8 remains a handmade/mock world;
no model provider, upload, deployment or new dependency was used.

## Implemented contract

- V1 and legacy recipes remain readable. V2 adds normalized capsules/tori,
  deterministic bounded shape deformation and optional joint coordinate frames.
- Parts attach to named joints independently of their dimensions. Hierarchies
  reject missing parents, cycles, duplicate identities, excessive depth/reach
  and executable/unrecognized fields. Joints have no inherited part scaling.
- Static poses still instance. Live animated hierarchies are capped at 24
  per scene, including the player. Their terrain foundations stay in the
  shared static scenery path; live rendering uses the same surveyed base.
- Five compositions demonstrate a person, bread, fruit bowl, rock and picnic.
  The baker, picnic and granite are placed in the world. Complete JSON examples
  are checked against both the schema and their handmade source definitions.
- Corrected instanced grain coordinates to include the instance transform.
  Geometry/material detail remains independent of the object's physical body.

## Executed checks

- `npm test`: **156/156 tests, 12/12 files passed**. Twenty-six new cases
  cover v1/v2 data round trips, invalid parents/cycles/depth/IDs, reach and
  animation budgets, rejected code/URLs/unbounded inputs, normalized shape
  dimensions, seed determinism/seams, rigid limb connections and lengths,
  order-independent joints, repeated-time/reduced-motion poses, static batching,
  animated foundations on slopes and a car landing on the actual picnic top.
- Existing circuit, original racer, road/curb/effect, collision, hill/jump,
  ICE/BOOST, bridge/water and asset-layout regressions pass.
- One exhaustive terrain test timed out under concurrent browser/test load.
  Its loop now records the maximum vertex error and asserts that value once,
  retaining every vertex and the same 0.0005 tolerance. Final default
  `npm test` passes; no timeout or coverage threshold was relaxed.
- `npm run build`: typecheck plus production build passed. JS bundle:
  **692.86 kB / 182.76 kB gzip**. The existing 500 kB chunk warning remains.
- `muse skills validate .agents/skills/paper-game --json`: valid, compatible,
  zero diagnostics after updating the domain guidance for v2.
- Self-reviewed the saved pre-change source diff. Corrected grain scale and
  support for foundations on live jointed assemblies. No independent review.

## Browser evidence

The real component renderer compared source and runtime forms for all five
compositions from **four angles each**. The baker was also checked at four
fixed animation phases. Static objects use the instanced pane; the baker
uses the live jointed pane. Fresh component console: zero warnings/errors.

The running game rendered and drove beside the baker and picnic. Final
sample: 60.0 fps, 211 render calls, 109,847 triangles, 65 live particles,
416 scene objects. Fresh game console: zero warnings/errors. This is a
local desktop observation, not a mobile or 24-character crowd benchmark.

- [Four example compositions](creations-preview.jpg)
- [Twenty source-side inspection views](inspection-grid.jpg)
- [Baker phase 0](baker-phase-0.png), [1.5](baker-phase-1.5.png),
  [3](baker-phase-3.png), [4.5](baker-phase-4.5.png)
- [Full source/runtime bread comparison](bread-front.png)
- [Picnic and baker in the world](picnic-world.png)
- [Actual game drive](gameplay.png) and [diagnostics](browser-state.json)
- [Source fingerprints](source-sha256.txt)

The full captures retain the review UI; the contact sheets crop the rendered
source pane and add captions. No asset image was generated outside the engine.

Limits: stylized primitive composition and rigid joint motion, not arbitrary
mesh sculpting, skinned animation, NPC AI/navigation or eating mechanics.
The baker is decorative; food uses supported knockable bodies when placed
independently. Decorative food on the picnic does not create extra colliders.
The live-character cap bounds work but does not guarantee mobile performance.
Real Muse interpretation remains unimplemented and no provider was tested.
