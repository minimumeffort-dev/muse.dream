# Water and bridge slice verification

Verified locally on 2026-10-15. Revision r7 is handmade/mock-only. No model
calls, photo uploads, deployment or new dependencies.

## Implementation

- Landscape DSL v1 supplies bounded water polygons, basin depth, bank width,
  level, color, current, drag, wave propagation/damping/strength and bridge
  endpoints, width, arch, timber/stone style and rails.
- Schema rejects unknown/executable fields, non-finite values, excessive
  budgets, duplicate IDs, degenerate/crossing polygons and invalid spans.
  Semantic checks cover world bounds, overlapping waters/decks, contained
  water levels, sampled deck clearance and road connectivity with rail contacts.
- Simulation separates carved ground from the deck's driving surface.
  Slopes, crest flight, landing, checkpoint height and object placement use
  the driving height. Water applies velocity drag toward current and clears
  on exit. Dense rail cylinders reuse existing conservative collision.
- Bridge polygons and road overlays split on deck boundaries and the shared
  terrain triangle grid. Deck sampling extends its own surface to the grid
  corners, preventing sunken/jagged edges. End shoulders match the banks.
- A damped, current-advected surface-wave grid propagates car disturbances.
  Settled fields sleep; pause freezes them; reset/reduced motion clear them.
  Smooth byte textures avoid float-filter extensions and cut upload size.
  Droplets reuse the existing bounded particle pool. Each bridge uses one
  instanced draw for rails and supports; its deck is a separate static mesh.
- FixedStepper now tolerates floating-point accumulation at 144 Hz without
  losing a simulation step at an exact elapsed-time boundary.

## Executed checks

- `npm test`: **130/130 tests passed, 11/11 files**. Twelve new tests cover
  malformed DSL, semantic rejection, basin/deck height, short-span arch,
  bridge crossing/exit, rail impact and airborne clearance, deck edges and
  batching, water drag/current/exit, 30/60/144 Hz replay, wave spread/decay,
  current advection, droplets and reduced-motion/reset/upload behavior.
- Existing checks still cover a complete eight-checkpoint circuit, original
  racer, hills/jumps, ICE/BOOST, road/curb/effect alignment, off-road collisions,
  composed assets and world layout.
- `npm run build`: typecheck and production build passed. Current JS bundle:
  **668.03 kB / 176.17 kB gzip**. Vite's existing 500 kB chunk warning remains.
- Self-reviewed source changes against the saved r6 source. Corrected deck
  boundary sampling, short-span arch easing and wave texture interpolation.
  This was a self-review, not an independent review.

## Actual browser evidence

Used the running app at `http://127.0.0.1:5173/`, through its keyboard and
pause controls. The car crossed the timber bridge, encountered and recovered
from solid farm-object collisions, entered the pond and showed the Water
state, drag, droplets and a smooth wake beside the stone bridge. Observed
about **59–60 fps** in this desktop session. Final pond sample:
`(2929.8, 2499.3)`, 116 render calls, 47,683 triangles, 45 live particles.
This is an observation, not a cross-device benchmark.

The camera quaternion stayed `(-0.51308, 0.15225, 0.09304, 0.83959)` through
this drive, including hills, bridge and water. No unsolicited view rotation
was observed. Fresh browser console: **zero warnings/errors** on the game
and geometry review after the final reload.

- [Actual water driving](pond-driving.png)
- [Timber bridge gameplay](driving-crossing.png)
- [Eight bridge inspection views](inspection-grid.jpg): both styles from
  front/right/back/left, using the low inspection camera.
- [Smooth water disturbance](smooth-ripple.png)
- [Final browser diagnostics](browser-state.json)
- [Source and test fingerprints](source-sha256.txt)

The review page remains at `/tests/visual/roads.html`; water/bridge locations,
Pitch, View, animation pause and Ripple are developer-only review controls.
They do not add controls to the game UX.

Limits: bounded surface waves/current, not volumetric fluid, flooding,
erosion or buoyant props. One driving surface per XY, so there is no
navigable underpass. Contact/containment validation is sampled. No mobile
hardware benchmark, camera input or real Muse interpretation was tested.
