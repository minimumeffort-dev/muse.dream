# Impact and destruction verification

2026-10-16. Handmade mock world r12 at `http://127.0.0.1:5173/`.
No provider calls, uploads, added dependencies, deployment or paid experiments.
Changed source fingerprints are in `source-sha256.txt`.

## Implemented and checked

Dream `impact bounce` compiles bounded restitution and lift into an intact
knockable body. `impact break` compiles a closing-speed threshold, scatter,
lift, spin and lifetime. `fragment` groups retain connected subassemblies.
Shared rest-pose frames define both debris rendering and terrain contacts.
State remains outside the immutable scene; a destroyed collider is removed
exactly once. The mock includes a ball, seven-piece table, eight-piece crate
and six-piece planter. There are 432 placed objects and 21 potential fragments
from the three breakable examples; see `compiler-metrics.json`.

- `npm test`: **276 passed across 17 files**, including 24 destruction tests.
  Full output: `tests.txt`. New checks cover complete documented examples,
  invalid DSL and budgets, gentle/hard/glancing/elevated contacts, single
  fracture, pure state updates, collider removal, transformed fragment bounds,
  hills, static joint frames, settling/expiry/reset, passenger continuation,
  deterministic fracture replay at 30/60/144 fps, bouncing off the floor and
  a solid wall, static-instancing exclusion, reduced motion and particle caps.
  Existing complete racing circuit, road, bridge, hill jump, water, ice/boost
  and passenger-ride regressions all pass.
- `npm run build`: TypeScript and production build passed. JS is 759.10 kB,
  204.68 kB gzip. The existing >500 kB chunk warning remains (`build.txt`).
- Self-reviewed the actual diff against the pre-request local snapshot.
  Kept one shared static collision broad phase, reused the existing particle
  pool and batching, excluded invisible destroyed roots from occlusion rays,
  and made the crate's loose fruit separate pieces. No independent review.

## Actual browser verification

Used the Codex in-app browser, public controls and read-only DOM diagnostics.
The local game and review console had no captured warnings/errors
(`browser-console.json`). Host-side Statsig failures were separate from the
local page logs.

**Live world:** used R, reverse throttle and steering to approach the new
objects. The ball moved from (930,1505) to approximately (924,1519), with
elevation 3.11 and upward velocity 26.91. The subsequent table hit reported
`broken: ["meadow_table"]` and seven live pieces. `world-table.png` shows
the actual rendered breakup beside the orchard. `world-states.json` preserves
the observed DOM diagnostics, including the ball, table and later live state.
`world-ball.png` was captured while paused, so its pause overlay obscures the
scene; the unblurred ball visual is in the fixed replay below.

Pause left destruction/ball diagnostics identical while F was pressed. R kept
the table broken and the ball's new position. Start over restored an intact
table, no debris and the original ball position. The world was left reset and
playable. Short desktop samples were 59.6–60.2 fps around the collisions; these
are smoke observations, not sustained or cross-device benchmarks.

**Fixed replay review:** `/tests/visual/destruction.html` uses the same parser,
simulation, object builder, debris renderer and particle pool. Its public
object, impact and time controls produced:

- `table-intact.png`, `table-breaking.png`, `table-scattered.png`: before,
  0.2 and 0.6 seconds after a hard impact.
- `crate-breaking.png`: eight independently moving panels/fruit pieces.
- `planter-breaking.png`: six side/rim/plant fragments.
- `ball-bouncing.png`: an intact ball launched into the air.
- `table-gentle.png`: table remains intact after contact below its threshold.
- `table-reduced.png`: destruction applied with no moving pieces or puffs.

`visual-states.json` records those public replay states. Replay screenshots
use a flat isolated fixture, separate from the actual live-world check.
No browser state was injected to trigger either check.

## Limits and skipped checks

The DSL separates authored components, with at most eight static fragment
groups per assembly. It does not cut arbitrary geometry or fracture animated
joints. Debris is cosmetic, contacts terrain and expires after its declared
lifetime; it does not block cars, collide with other debris/buildings or cause
chain destruction. Bouncing props use the existing cylinder contacts, not
general rigid-body or buoyancy physics. No cumulative damage, repair, player
destruction or destruction of route actors. Scenes cap impact objects at 24
and potential fragments at 128. Existing part/source/expansion limits remain.

Real sketch interpretation, provider evaluation, mobile controls/performance,
long-duration profiling and an independent review were not performed. All
examples remain handmade mocks.
