# Component and road geometry repair — 2026-10-15

Mock-only scene revision r4. No provider calls or deployment.

## Defects corrected

- Rigid curb boxes left open wedges at bends and could intersect on the tightest
  hairpin. Curbs now form continuous terrain-draped bands with shared end edges,
  including the loop seam. Subpixel stations are merged before Float32 storage.
  Road and curb cross-sections are shared; dashes and brick colors use distance
  boundaries. Bend validation checks forward progress of both actual road edges.
- The cottage's pyramid dimensions/orientation and low roof base let walls pass
  through the roof. Pyramid bases are now axis-aligned and dimension-normalized;
  the cottage roof sits above the walls and overhangs them on every side.
- The windmill roof intersected the tower cap, exposing a thin pale ring.
  Its base now meets the cap and overhangs it.
- Large rigid assemblies were positioned using only center ground height.
  Bounded foundation data now surveys the footprint, raises the complete assembly
  and fills the downhill gap. Footprints include stairs and fallen masonry.
  Cylinder contacts use the same base elevation; fixture placement also keeps
  complete foundation footprints clear of the road.
- GPU-animated foliage, windmill blades and cloth cast undeformed shadows.
  Color and shadow materials now share their animation code and clock.

## Executed evidence

- `npm test`: 110/110 pass. Coverage includes every curb joint and both closure
  seams, terrain alignment, upward face winding, six primitive dimensions,
  roof/wall contact, building support, foundation validation, raised collision
  and landing contacts, and the existing complete eight-checkpoint replay.
- `npm run build`: passes typecheck and production compilation. The existing
  warning about a JavaScript chunk over 500 kB remains.
- Inspected 13 assemblies from four directions, with source and instanced
  versions side by side: 52 views.
- Inspected eight world sites from four directions: 32 views covering tight
  bends, crests, a mountain road and four building types.
- Compared rendered source/instanced windmills at animation times 0, 1.5, 3 and
  4.5 seconds, including shadows, at 1280 x 748. No pixels exceeded a 24/255
  per-channel difference threshold. See `shadow-comparison.json`.
- Drove the actual main game to checkpoint 2, with a crest jump and landing,
  unchanged camera orientation, about 60 fps locally, and no console warnings
  or errors after the final load. See `driving.json`.
- Retained reproducible manual review pages under `tests/visual/`; these run
  through the Vite dev server and are not additional game controls.

`roof-comparison.jpg` uses the same camera framing for the saved pre-repair
source and current source. Full captures are retained alongside it. World views
and the main-game image use the normal browser viewport; the temporary fixed
component-comparison viewport was reset after capture.

## Limits

Foundation surveys use an eight-unit heightfield grid and a filled rectangular
plinth. Collision remains the existing vertical-cylinder approximation, not
mesh-shaped or stacked-world physics. Low-end/mobile hardware was not tested.
