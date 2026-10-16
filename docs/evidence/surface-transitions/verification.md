# Surface transitions verification

2026-10-16. Local mock world, handmade revision r12. No provider, upload,
camera, deployment or dependency changes.

## Result

- Timber crossings now own the complete wood driving deck. Asphalt,
  painted dashes and racing curbs are clipped at its exact footprint.
  Stone crossings retain their existing paved corridor. Road and deck
  share one top height, with no gap or competing coplanar face.
- Both curb sections taper into the deck over 24 units. The bridge ramp
  shoulders use quintic easing for continuous height, slope and curvature;
  simulation and renderer use the same height function.
- Ice has an irregular fading frost edge. Boost uses translucent animated
  chevrons with no opaque rectangle or border rails. Entrances and exits
  fade into the underlying road or wood. Both treatments sit 0.15 units
  above the driving surface and receive scene lighting and shadows.
- Outline samples support concave and rotated effect polygons. Interior
  and midpoint samples also retain visible interiors in patches smaller
  than one terrain cell. Existing DSL bridge styles and effect polygons
  drive the composition; no new model-authored rendering patches are needed.
  Gameplay trigger polygons, grip, cooldowns and speed limits stay intact.

## Automated evidence

`npm test`: **281 / 281 tests**, 17 files passed. Includes full-circuit
checkpoint driving, off-road contacts, slope gravity and crest jumps,
ice exit cleanup, boost limits, bridge clearance/rails, water behavior,
interactive vehicles and destruction. Surface regressions cover 527 deck
samples, both bank joins, all four curb approach ends, stone road and
footbridge coverage, concave effects, reordered vertices and small patches.
See [test output](tests.txt).

`npm run build`: typecheck and Vite production build passed. JS is
761.49 kB, 205.55 kB gzip. The existing chunk-over-500-kB warning remains;
this pass does not change bundle splitting. See [build output](build.txt).

## Browser evidence

Used the running local Vite server through the Codex in-app browser.
The geometry review uses the actual engine builders and materials.
Compared top and low views of ice, boost, both timber banks and the crest.

- [Timber before](bridge-before.png) / [after](bridge-after.png),
  [final low view](bridge-side-after.png).
- [Boost before](boost-before.png) / [after](boost-after.png).
- [Ice before](ice-before.png) / [after](ice-after.png),
  [final low view](ice-side-after.png).
- [Real game on timber](game-on-timber.png) and
  [back on land](game-bridge-exit.png).

Drove the main game using its public keyboard controls: opening hill,
boost, timber deck and far bank. Final observed deck state was
(1978.8, 1504.7), grounded, then (2366.2, 1625.1), grounded beyond the span.
The run recorded two takeoffs and two landings. The main game and geometry
review console error/warning lists were empty. Short HUD samples around
the crossing reported 60 fps, about 51k–59k triangles and 105–117 draws;
these are local observations, not a hardware benchmark.
[Recorded DOM diagnostics](browser-drive.json) preserve those observations.
The game was returned to its start and the temporary review tab was closed.

## Review and limits

Self-reviewed the actual source/test diff against the turn baseline in
`.npm-cache/surface-transitions-baseline`; no independent review was run.
The review fixed exposed curb ends and the small-polygon feathering case.
Final source hashes are in [source.sha256](source.sha256).

Feathering interpolates sampled outline distances; fine subcell sketch
boundaries would benefit from a distance texture. The world still has one
driving height per XY and uses continuous physics with a 20-unit rendered
terrain grid. No live Muse input or mobile GPU benchmark was performed.
