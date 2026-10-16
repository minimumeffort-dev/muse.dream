# Terrain placement verification, 2026-10-15

Mock world revision r9 (`handmade-open-world-v9`). No model/provider calls.

## Reproduction and fix

The original placement used center height except for declared foundations.
Across the 416 fixture objects, the worst checked mesh-vertex penetration
was 8.019 units (slab `sketch-245`); log `sketch-3828` penetrated 7.845 units.
Moving props separately bypassed the shared placement function.

Placement now fits shared primitive geometry to both simulation height and
rendered terrain/deck triangles. It includes scaled/rotated parts, seeded
deformations, joint rest frames and bottom-face interiors. Renderer and
collision contacts share the resulting base. Geometry compilation is
deterministic and uses no materials, scene nodes, DOM or WebGL.

The optional validated DSL field `grounding: "surface"` gives rocks, logs
and food a rigid slope orientation. The default remains upright for trees
and buildings. Foundations reject surface alignment. Cylinder radii/heights
remain independently authored and vertical. Equivalent support profiles
are shared within an accepted scene; unchanged positions are cached.

## Executed checks

- `npm test`: **168 passed**, 13 files, including 12 placement regressions.
  Tests cover all 416 current assemblies at their actual world positions,
  original built-in kinds, scales 0.5/1/2, rotated and jointed shapes,
  off-center crests beneath broad bases, underside ray contacts, live prop
  positions, hit/overflight height, raised landings and actual instanced
  vertex placement. Existing circuit, hill driving, roads, ICE/BOOST,
  bridge, water and replay checks also passed.
- `npm run build`: passed typecheck and production build. JS 695.62 kB,
  183.75 kB gzip. The existing 500 kB chunk warning remains.
- Browser: inspected the previously buried log from all four directions,
  the slab, castle foundation and timber bridge. Development and production
  pages both initialized with 416 objects / 8 checkpoints. The Vite dev
  server stalled loading modules after repeated edits; restarting it
  restored the existing `127.0.0.1:5173` route, which was then reverified.
- Final development drive: 2 jumps / 2 landings, camera rotation and
  off-road steering. Reported 60 fps, 96 draw calls, 52,583 triangles,
  182 geometries and 34 particles at the saved sample. No fresh browser
  warnings/errors. Values are a local desktop sample, not a device benchmark.
- Local Node measurement: 165 ms for all 416 initially uncached placements;
  approximately 0.42 ms per moved rover placement and 0.32 ms per moved
  mushroom placement, averaged over 120 positions each.
- Source diff self-reviewed against `.npm-cache/placement-baseline`.
  This was not an independent review.

## Visual evidence and limits

`log-before.png` is the original browser capture. `log-*-verified.png` are
the final four views; `slab-after.png`, `castle-after.png`, `bridge-after.png`
and `gameplay.png` cover neighboring behavior. `browser-metrics.json` records
the final driving sample. Comparison/contact sheets crop actual screenshots
around the same world region and preserve aspect ratios; browser viewport
sizes differed between captures.

Ground fitting uses rest geometry and bounded face samples; it is not
terrain deformation, foot IK, or arbitrary mesh collision. Legacy recipes
retain physical-footprint support. No live sketches, providers, mobile
hardware or crowds were tested. Development server remains available on
port 5173; the temporary production preview was stopped after verification.
