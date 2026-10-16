# Physical proportions, mock world r15

Implemented Dream 2 `measure(kind,axis,meters)` and applied it to all 53
assemblies exported by the complete project, including all 448 placements
and the player. Ten canonical units represent one metre. Measurement uses
the transformed primitive geometry in joint rest pose, then resolves one
uniform scale for rendering, grounding, collision, seats and debris.
Per-kind plausibility bands, placement variation and player-car comparisons
are validated. `custom` is an explicit option for unusual/fantasy sizes;
unmeasured legacy data keeps its existing scale bounds.

The car retains its 3.55 m length and prior driving cylinder. The plane has
a 10.8 m wingspan, the bicycle is 1.8 m long and the skateboard 0.82 m.
People, food, furniture and natural scenery now share those units. Two
benches have corrected seat/back proportions and the plane has a slimmer
fuselage and lower tail. The train cylinder now better matches its width;
the covered passage remains clear at its new physical size. Sixteen trees
moved at most about two metres to preserve road margins and object spacing.
Passengers retain their own world size when parented to a small rideable.

Executed checks:

- `npm test`: 409/409, 21 files. Includes new measurement/import/roundtrip,
  schema diagnostics, cyclic hierarchy, player body, size hierarchy and
  cross-object rule tests. Existing deterministic racing, terrain jumps,
  bridge continuity, off-road collision, destruction and spacing checks pass.
- `npm run build`: TypeScript and Vite pass. JS 866.68 kB / 235.46 kB gzip.
  The existing large-chunk warning remains.
- Full-world Dream CLI check with the closed module registry: accepted,
  53 assemblies, 543 parts, 14 joints, 448 placements, 5 routes, 2 waters.
- Fresh localhost browser game: all 448 objects load; F boards the bicycle,
  F returns to the parked car, and W drives it. No warning/error logs in
  the fresh game tab. Browser DOM diagnostics are saved in `browser.json`.
- Shared-scale WebGL lineup rendered at `/tests/visual/proportions.html`;
  inspected visually, including the corrected bench and plane geometry.
- `git diff --check` passes. Actual source/config/fixture diff self-reviewed.

Images: `before.jpg` and `after.jpg` show the main spawn; `passenger.jpg`
shows bicycle boarding; `lineup.jpg` shows eight assemblies on the same
metre grid. `assemblies.json` records native dimensions and resolved factors;
`spacing.json` records the sixteen clearance corrections. `source.sha256`
binds source and behavioral test files to this verification.

Limits: size classes are game plausibility rules, not real-model/species
measurements. Classification remains authored mock data; no provider calls
or recognition accuracy were measured. Animation can extend beyond the rest
pose. Collisions retain the existing cylinder/heightfield approximation.
No independent review, mobile benchmark, push or redeployment in this pass.
