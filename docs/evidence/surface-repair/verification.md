# Surface and assembly repair, 2026-10-15

The previous renderers sampled the analytic terrain independently for ground,
road, trim, markings and effects. Matching vertex heights did not match the
triangles between them. Curbs also stopped 1.25 units above the terrain.
The boost polygon overlapped a curb and its UV axes pointed across travel.
The windmill hub barely touched the tower and had no connecting shaft.

Road, paint, finish squares, curb tops and effect polygons now clip against
the same 20-unit terrain grid and its SW–NE triangle diagonal. Curb walls
split at grid edges and extend into the ground. Effects use lit materials
and receive shadows. Only boost strips emit substantial light. Their UV
orientation follows the road and checkpoint direction, independently of
polygon vertex order or centerline winding. The handmade pad footprints
sit inside the racing road. Simulation effect polygons remain identical
to the visible polygons; no physics or provider integration was replaced.
The windmill has a cylinder shaft joining tower, hub and rotating sails.

Executed checks:

- `npm test -- --reporter=dot`: 114/114 tests pass in 9 files. Includes
  ray probes on both sides of every curb joint, independent ground-mesh
  ray checks inside road/effect triangles, concave polygon area, reordered
  effect polygons, legacy vertical BOOST direction, rotor connections at
  five phases, complete circuit, terrain driving and collision regressions.
- The new triangle-interior regression fails against the saved previous
  environment renderer. Its former vertex checks had passed.
- `npm run build`: typecheck and production build pass. The existing Vite
  warning about a bundle exceeding 500 kB remains (643.13 kB, 168.34 kB gzip).
- Browser world inspection: ICE, BOOST, windmill, opening crest and closing
  hairpin from four directions, using a lower inspection camera. See the
  20 captures and `inspection.jpg`; final game-height pad captures are
  `boost-after.png` and `ice-after.png`.
- Actual gameplay: crest jump and landing, then BOOST activation. Recorded
  speed 444.9, one jump and one landing, 60 fps at 703 x 748. See
  `driving.json` and `game-boost.png`.
- Isolated off-road castle drive: stopped at x1229.7, y1191.6, speed 0,
  approximately 65.1 units from the castle center. Expected cylinder plus
  car radius is 65. See `collision.json` and `game-castle.png`.
- Fresh final browser load: no warning/error console entries; 59.8 fps at
  1280 x 720, 129721 submitted triangles including rendering passes.

`surface-fixes.jpg` combines real browser captures. Inspection pages use
production builders and lights; gameplay captures also include the game's
postprocessing. Self-review used a saved source snapshot; there was no
independent reviewer.

Limits: handmade/mock world only. No paper capture, live model calls,
deployment or low-end hardware benchmark. The browser inspections cover
these named locations, not every object instance in the world.
