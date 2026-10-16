# Road/bridge continuity, 2026-10-15

## Reproduction and repair

The timber bridge's top was rendered at driving height +2, above the road
(+1.5) and lane markings (+1.8). The resulting wood surface hid the road
while the curbs remained visible. `before.png` reproduces this on the live
world geometry review page at `willow-crossing`.

The shared road ribbon now owns the asphalt corridor. Bridge tops subtract
that exact corridor and fill the shoulders at the same +1.5 surface height.
Both use the existing terrain/deck triangle grid. Paint and curbs retain
their original distances and phases. There are no competing top faces.
The off-road stone footbridge keeps its complete deck.

Semantic validation clips actual road-and-curb polygons at bridge end
planes. A crossing must fit between the sides, including six units of inset
for rails, and carry the road through both open ends. Narrow, offset,
sideways and end-corner-clipping proposals produce `bridge-road-disconnected`.
This is derived from existing road/bridge DSL data, with no new model fields
or executable output. Driving height and collision rules remain shared.

## Executed verification

- `npm test`: **179 tests passed, 14 files**, including 11 new continuity
  regressions. Checked full-width asphalt through both bank approaches;
  exactly one top face at 527 locations across the deck; visible lane-dash
  phase; no height step at either open end; complete off-road footbridge;
  both bridge endpoint orders; invalid width, offsets, side crossings and
  clipped end corners; polygon subtraction area in either winding.
- Existing full-circuit, bridge crossing/rails, jump/landing, water,
  object-placement and deterministic replay tests passed.
- `npm run build`: typecheck and production build passed. JS 697.29 kB,
  184.34 kB gzip. The existing 500 kB chunk warning remains.
- Browser: before/after captures on the same live review route and camera;
  asphalt and center dashes now remain visible from bank to bank. Final
  gameplay on `127.0.0.1:5173` recorded one jump and landing, 60.1 fps,
  132 draw calls, 70,233 triangles, 190 geometries and 51 particles.
  `browser-errors.json` contains zero page warnings/errors. The browser
  automation host emitted unrelated Statsig telemetry 403 errors; these
  were not application errors and did not prevent rendering or interaction.
- One local Node construction sample: landscape geometry changed from
  12,197 to 11,789 vertices, with six drawables before and after. Construction
  measured 84 ms before and 80 ms after. These are local diagnostics, not a
  hardware performance benchmark. No new per-frame compilation was added.
- Actual source diff self-reviewed against
  `.npm-cache/bridge-continuity-baseline`; no independent review was run.

`after.png` is the full browser capture. `comparison.png` crops out the
review toolbar and proportionally resizes the original screenshots side by
side; it does not alter their game pixels. Gameplay and data attributes are
saved separately.

Mock world only. Underpasses/stacked roads and volumetric bridge collision
remain unsupported. No real Muse calls, uploads, deployment or mobile-device
checks were performed. The local dev server remains on port 5173.
